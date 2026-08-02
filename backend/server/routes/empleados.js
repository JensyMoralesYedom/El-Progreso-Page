const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

// Según matriz de roles: Empleados = CRUD (admin), lectura (veterinario/invitado).
// Tareas = CRUD (admin), CRUD sobre sus propias tareas (trabajador), lectura (veterinario/invitado).
const LECTURA_EMPLEADOS = ['admin', 'veterinario', 'invitado'];
const ADMIN = ['admin'];
const ESTADOS_EMPLEADO = ['Activo', 'Inactivo'];
const PRIORIDADES_TAREA = ['Baja', 'Media', 'Alta'];
const ESTADOS_TAREA = ['Pendiente', 'En progreso', 'Completada', 'Cancelada'];

// Devuelve el empleado vinculado a un usuario por email (para tareas propias del trabajador)
async function empleadoDeUsuario(userId) {
  const result = await pool.query(`
    SELECT e.*
    FROM empleados e
    JOIN usuarios u ON u.email = e.email
    WHERE u.id = $1
  `, [userId]);
  return result.rows[0] || null;
}

// ========================================
// TAREAS
// ========================================

// GET /api/empleados/tareas - Listar tareas (todos los roles; trabajador solo las suyas)
router.get('/tareas', verificarToken, async (req, res) => {
  try {
    let query = `
      SELECT t.*, e.nombre AS empleado_nombre
      FROM tareas t
      LEFT JOIN empleados e ON t.empleado_id = e.id
    `;
    const params = [];

    if (req.user.rol === 'trabajador') {
      const empleado = await empleadoDeUsuario(req.user.id);
      if (!empleado) {
        return res.json({ success: true, data: [] });
      }
      params.push(empleado.id);
      query += ` WHERE t.empleado_id = $${params.length}`;
    }

    query += ' ORDER BY t.fecha_asignacion DESC, t.id DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar tareas:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/empleados/tareas - Crear tarea (admin; trabajador solo para sí mismo)
router.post('/tareas', verificarToken, async (req, res) => {
  try {
    const { titulo, descripcion, empleado_id, fecha_asignacion, fecha_vencimiento, prioridad, estado } = req.body;

    if (!titulo) {
      return res.status(400).json({ success: false, error: 'El título es obligatorio' });
    }

    if (titulo.trim().length > 150) {
      return res.status(400).json({ success: false, error: 'El título no puede exceder 150 caracteres' });
    }

    if (prioridad && !PRIORIDADES_TAREA.includes(prioridad)) {
      return res.status(400).json({ success: false, error: 'La prioridad debe ser Baja, Media o Alta' });
    }

    if (estado && !ESTADOS_TAREA.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser Pendiente, En progreso, Completada o Cancelada' });
    }

    if (fecha_asignacion && isNaN(new Date(fecha_asignacion).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha de asignación no es válida' });
    }

    if (fecha_vencimiento && isNaN(new Date(fecha_vencimiento).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha de vencimiento no es válida' });
    }

    let empleadoDestino = empleado_id;
    if (req.user.rol === 'trabajador') {
      const empleado = await empleadoDeUsuario(req.user.id);
      if (!empleado) {
        return res.status(403).json({ success: false, error: 'No hay un empleado vinculado a su cuenta' });
      }
      empleadoDestino = empleado.id;
    } else if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'No tiene permisos para crear tareas' });
    }

    if (empleadoDestino) {
      const e = await pool.query('SELECT id FROM empleados WHERE id = $1', [empleadoDestino]);
      if (e.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El empleado asignado no existe' });
      }
    }

    const result = await pool.query(
      `INSERT INTO tareas (titulo, descripcion, empleado_id, fecha_asignacion, fecha_vencimiento, prioridad, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        titulo.trim(),
        descripcion ? descripcion.trim() : null,
        empleadoDestino || null,
        fecha_asignacion || new Date().toISOString().split('T')[0],
        fecha_vencimiento || null,
        prioridad || 'Media',
        estado || 'Pendiente'
      ]
    );

    res.status(201).json({ success: true, message: 'Tarea creada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear tarea:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/empleados/tareas/:id - Actualizar tarea (admin; trabajador solo estado de sus tareas)
router.put('/tareas/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, empleado_id, fecha_asignacion, fecha_vencimiento, prioridad, estado } = req.body;

    const existing = await pool.query('SELECT * FROM tareas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
    }

    const tarea = existing.rows[0];

    if (req.user.rol === 'trabajador') {
      const empleado = await empleadoDeUsuario(req.user.id);
      if (!empleado || tarea.empleado_id !== empleado.id) {
        return res.status(403).json({ success: false, error: 'Solo puede actualizar sus propias tareas' });
      }
      if (!estado) {
        return res.status(400).json({ success: false, error: 'Un trabajador solo puede actualizar el estado de la tarea' });
      }
      if (!ESTADOS_TAREA.includes(estado)) {
        return res.status(400).json({ success: false, error: 'El estado debe ser Pendiente, En progreso, Completada o Cancelada' });
      }

      const fechaCompletada = estado === 'Completada'
        ? (tarea.fecha_completada || new Date().toISOString().split('T')[0])
        : null;

      const result = await pool.query(
        `UPDATE tareas SET estado = $1, fecha_completada = $2 WHERE id = $3 RETURNING *`,
        [estado, fechaCompletada, id]
      );

      return res.json({ success: true, message: 'Tarea actualizada exitosamente', data: result.rows[0] });
    }

    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'No tiene permisos para actualizar tareas' });
    }

    if (!titulo) {
      return res.status(400).json({ success: false, error: 'El título es obligatorio' });
    }

    if (prioridad && !PRIORIDADES_TAREA.includes(prioridad)) {
      return res.status(400).json({ success: false, error: 'La prioridad debe ser Baja, Media o Alta' });
    }

    if (estado && !ESTADOS_TAREA.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser Pendiente, En progreso, Completada o Cancelada' });
    }

    if (empleado_id) {
      const e = await pool.query('SELECT id FROM empleados WHERE id = $1', [empleado_id]);
      if (e.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El empleado asignado no existe' });
      }
    }

    const estadoFinal = estado || tarea.estado;
    const fechaCompletada = estadoFinal === 'Completada'
      ? (tarea.fecha_completada || new Date().toISOString().split('T')[0])
      : null;

    const result = await pool.query(
      `UPDATE tareas SET titulo = $1, descripcion = $2, empleado_id = $3, fecha_asignacion = $4,
         fecha_vencimiento = $5, prioridad = $6, estado = $7, fecha_completada = $8
       WHERE id = $9 RETURNING *`,
      [
        titulo.trim(),
        descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : tarea.descripcion,
        empleado_id !== undefined ? empleado_id : tarea.empleado_id,
        fecha_asignacion || tarea.fecha_asignacion,
        fecha_vencimiento !== undefined ? fecha_vencimiento : tarea.fecha_vencimiento,
        prioridad || tarea.prioridad,
        estadoFinal,
        fechaCompletada,
        id
      ]
    );

    res.json({ success: true, message: 'Tarea actualizada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar tarea:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/empleados/tareas/:id - Eliminar tarea (admin)
router.delete('/tareas/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM tareas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
    }

    await pool.query('DELETE FROM tareas WHERE id = $1', [id]);
    res.json({ success: true, message: 'Tarea eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar tarea:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

// ========================================
// EMPLEADOS
// ========================================

// GET /api/empleados - Listar empleados (admin/veterinario/invitado)
router.get('/', verificarToken, requerirRol(LECTURA_EMPLEADOS), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM empleados ORDER BY nombre ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar empleados:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// GET /api/empleados/:id - Obtener empleado (admin/veterinario/invitado)
router.get('/:id', verificarToken, requerirRol(LECTURA_EMPLEADOS), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM empleados WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener empleado:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/empleados - Crear empleado (admin)
router.post('/', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { nombre, cargo, telefono, email, fecha_ingreso, salario_base, estado } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
    }

    if (nombre.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El nombre no puede exceder 100 caracteres' });
    }

    if (estado && !ESTADOS_EMPLEADO.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser "Activo" o "Inactivo"' });
    }

    if (salario_base !== undefined && salario_base !== null && salario_base !== '') {
      const s = parseFloat(salario_base);
      if (isNaN(s) || s < 0) {
        return res.status(400).json({ success: false, error: 'El salario base debe ser un número mayor o igual a cero' });
      }
    }

    if (fecha_ingreso && isNaN(new Date(fecha_ingreso).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha de ingreso no es válida' });
    }

    if (email) {
      const existing = await pool.query('SELECT id FROM empleados WHERE email = $1', [email.trim().toLowerCase()]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Ya existe un empleado con ese email' });
      }
    }

    const result = await pool.query(
      `INSERT INTO empleados (nombre, cargo, telefono, email, fecha_ingreso, salario_base, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        nombre.trim(),
        cargo ? cargo.trim() : null,
        telefono ? telefono.trim() : null,
        email ? email.trim().toLowerCase() : null,
        fecha_ingreso || null,
        salario_base || 0,
        estado || 'Activo'
      ]
    );

    res.status(201).json({ success: true, message: 'Empleado creado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear empleado:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/empleados/:id - Actualizar empleado (admin)
router.put('/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cargo, telefono, email, fecha_ingreso, salario_base, estado } = req.body;

    const existing = await pool.query('SELECT * FROM empleados WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
    }

    if (estado && !ESTADOS_EMPLEADO.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser "Activo" o "Inactivo"' });
    }

    if (salario_base !== undefined && salario_base !== null && salario_base !== '') {
      const s = parseFloat(salario_base);
      if (isNaN(s) || s < 0) {
        return res.status(400).json({ success: false, error: 'El salario base debe ser un número mayor o igual a cero' });
      }
    }

    if (fecha_ingreso && isNaN(new Date(fecha_ingreso).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha de ingreso no es válida' });
    }

    if (email) {
      const existingEmail = await pool.query('SELECT id FROM empleados WHERE email = $1 AND id != $2', [email.trim().toLowerCase(), id]);
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Ya existe otro empleado con ese email' });
      }
    }

    const result = await pool.query(
      `UPDATE empleados SET nombre = $1, cargo = $2, telefono = $3, email = $4,
         fecha_ingreso = $5, salario_base = $6, estado = $7
       WHERE id = $8 RETURNING *`,
      [
        nombre.trim(),
        cargo !== undefined ? (cargo ? cargo.trim() : null) : existing.rows[0].cargo,
        telefono !== undefined ? (telefono ? telefono.trim() : null) : existing.rows[0].telefono,
        email ? email.trim().toLowerCase() : null,
        fecha_ingreso !== undefined ? fecha_ingreso : existing.rows[0].fecha_ingreso,
        salario_base !== undefined && salario_base !== null && salario_base !== '' ? parseFloat(salario_base) : existing.rows[0].salario_base,
        estado || existing.rows[0].estado,
        id
      ]
    );

    res.json({ success: true, message: 'Empleado actualizado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar empleado:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/empleados/:id - Eliminar empleado (admin)
router.delete('/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM empleados WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    await pool.query('DELETE FROM empleados WHERE id = $1', [id]);
    res.json({ success: true, message: 'Empleado eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar empleado:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

module.exports = router;
