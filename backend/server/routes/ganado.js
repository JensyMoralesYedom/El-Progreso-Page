const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

const ESTADOS_VALIDOS = ['Activo', 'Vendido', 'Muerto'];
const ORIGENES_VALIDOS = ['Nacido', 'Comprado'];
const TIPOS_MOVIMIENTO = ['Nacimiento', 'Compra', 'Venta', 'Muerte', 'Descarte'];

const SELECT_BASE = `
  SELECT g.*, r.nombre AS raza_nombre, r.origen AS raza_origen,
    p.nombre AS potrero_nombre,
    m.nombre AS madre_nombre, m.arete AS madre_arete,
    pa.nombre AS padre_nombre, pa.arete AS padre_arete
  FROM ganado g
  LEFT JOIN razas r ON g.raza_id = r.id
  LEFT JOIN potreros p ON g.potrero_id = p.id
  LEFT JOIN ganado m ON g.madre_id = m.id
  LEFT JOIN ganado pa ON g.padre_id = pa.id
`;

// GET /api/ganado - Listar todos los registros (todos los roles autenticados)
router.get('/', verificarToken, async (req, res) => {
  try {
    const { estado, sexo } = req.query;
    const condiciones = [];
    const params = [];

    if (estado && ESTADOS_VALIDOS.includes(estado)) {
      params.push(estado);
      condiciones.push(`g.estado = $${params.length}`);
    }

    if (sexo && ['Macho', 'Hembra'].includes(sexo)) {
      params.push(sexo);
      condiciones.push(`g.sexo = $${params.length}`);
    }

    const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(`
      ${SELECT_BASE}
      ${where}
      ORDER BY g.id ASC
    `, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar ganado:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// GET /api/ganado/razas/lista - Listar razas (todos los roles autenticados)
router.get('/razas/lista', verificarToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM razas ORDER BY nombre ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar razas:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// GET /api/ganado/movimientos - Listar movimientos (admin/trabajador)
router.get('/movimientos', verificarToken, requerirRol(['admin', 'trabajador']), async (req, res) => {
  try {
    const { animal_id } = req.query;
    let query = `
      SELECT mv.*, g.arete, g.nombre AS animal_nombre,
        u.nombre AS responsable_nombre
      FROM movimientos_ganado mv
      LEFT JOIN ganado g ON mv.animal_id = g.id
      LEFT JOIN usuarios u ON mv.responsable_id = u.id
    `;
    const params = [];

    if (animal_id) {
      params.push(animal_id);
      query += ` WHERE mv.animal_id = $${params.length}`;
    }

    query += ' ORDER BY mv.fecha DESC, mv.id DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar movimientos:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/ganado/movimientos - Registrar entrada/salida (admin/trabajador)
router.post('/movimientos', verificarToken, requerirRol(['admin', 'trabajador']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { animal_id, tipo, fecha, descripcion, monto } = req.body;

    if (!animal_id || !tipo) {
      return res.status(400).json({ success: false, error: 'El animal y el tipo de movimiento son obligatorios' });
    }

    if (!TIPOS_MOVIMIENTO.includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo de movimiento debe ser Nacimiento, Compra, Venta, Muerte o Descarte' });
    }

    if (fecha) {
      const f = new Date(fecha);
      if (isNaN(f.getTime())) {
        return res.status(400).json({ success: false, error: 'La fecha no es válida' });
      }
    }

    if (monto !== undefined && monto !== null && monto !== '') {
      const m = parseFloat(monto);
      if (isNaN(m) || m < 0) {
        return res.status(400).json({ success: false, error: 'El monto debe ser un número mayor o igual a cero' });
      }
    }

    await client.query('BEGIN');

    const animalCheck = await client.query('SELECT id, estado FROM ganado WHERE id = $1', [animal_id]);
    if (animalCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El animal no existe' });
    }

    const result = await client.query(
      `INSERT INTO movimientos_ganado (animal_id, tipo, fecha, descripcion, monto, responsable_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        animal_id,
        tipo,
        fecha || new Date().toISOString().split('T')[0],
        descripcion ? descripcion.trim() : null,
        monto !== undefined && monto !== null && monto !== '' ? parseFloat(monto) : null,
        req.user.id || null
      ]
    );

    let nuevoEstado = null;
    if (tipo === 'Venta') nuevoEstado = 'Vendido';
    if (tipo === 'Muerte') nuevoEstado = 'Muerto';
    if (tipo === 'Descarte') nuevoEstado = 'Vendido';
    if (tipo === 'Compra') nuevoEstado = 'Activo';

    if (nuevoEstado) {
      await client.query(
        `UPDATE ganado SET estado = $1, origen = CASE WHEN $2 = 'Compra' THEN 'Comprado' ELSE origen END
         WHERE id = $3`,
        [nuevoEstado, tipo, animal_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Movimiento registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar movimiento:', err);
    res.status(500).json({ success: false, error: 'Error al registrar el movimiento en la base de datos' });
  } finally {
    client.release();
  }
});

// GET /api/ganado/traslados - Listar traslados (admin/trabajador)
router.get('/traslados', verificarToken, requerirRol(['admin', 'trabajador']), async (req, res) => {
  try {
    const { animal_id } = req.query;
    let query = `
      SELECT t.*, g.arete, g.nombre AS animal_nombre,
        o.nombre AS potrero_origen_nombre,
        d.nombre AS potrero_destino_nombre,
        u.nombre AS responsable_nombre
      FROM traslados t
      LEFT JOIN ganado g ON t.animal_id = g.id
      LEFT JOIN potreros o ON t.potrero_origen_id = o.id
      LEFT JOIN potreros d ON t.potrero_destino_id = d.id
      LEFT JOIN usuarios u ON t.responsable_id = u.id
    `;
    const params = [];

    if (animal_id) {
      params.push(animal_id);
      query += ` WHERE t.animal_id = $${params.length}`;
    }

    query += ' ORDER BY t.fecha DESC, t.id DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar traslados:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/ganado/traslados - Registrar traslado entre potreros (admin/trabajador)
router.post('/traslados', verificarToken, requerirRol(['admin', 'trabajador']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { animal_id, potrero_destino_id, fecha, motivo } = req.body;

    if (!animal_id || !potrero_destino_id) {
      return res.status(400).json({ success: false, error: 'El animal y el potrero de destino son obligatorios' });
    }

    if (fecha) {
      const f = new Date(fecha);
      if (isNaN(f.getTime())) {
        return res.status(400).json({ success: false, error: 'La fecha no es válida' });
      }
    }

    await client.query('BEGIN');

    const animalCheck = await client.query('SELECT id, potrero_id FROM ganado WHERE id = $1', [animal_id]);
    if (animalCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El animal no existe' });
    }

    const destinoCheck = await client.query('SELECT id FROM potreros WHERE id = $1', [potrero_destino_id]);
    if (destinoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El potrero de destino no existe' });
    }

    const origenId = animalCheck.rows[0].potrero_id;

    const result = await client.query(
      `INSERT INTO traslados (animal_id, potrero_origen_id, potrero_destino_id, fecha, motivo, responsable_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        animal_id,
        origenId,
        potrero_destino_id,
        fecha || new Date().toISOString().split('T')[0],
        motivo ? motivo.trim() : null,
        req.user.id || null
      ]
    );

    await client.query('UPDATE ganado SET potrero_id = $1 WHERE id = $2', [potrero_destino_id, animal_id]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Traslado registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar traslado:', err);
    res.status(500).json({ success: false, error: 'Error al registrar el traslado en la base de datos' });
  } finally {
    client.release();
  }
});

// GET /api/ganado/:id - Obtener un registro por ID (todos los roles autenticados)
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      ${SELECT_BASE}
      WHERE g.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener ganado:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/ganado - Crear nuevo registro (solo admin)
router.post('/', verificarToken, requerirRol(['admin']), async (req, res) => {
  try {
    const {
      arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg, estado_sanitario,
      estado, origen, fecha_compra, precio_compra, potrero_id, madre_id, padre_id
    } = req.body;

    if (!arete || !nombre || !raza_id || !sexo || !estado_sanitario) {
      return res.status(400).json({ success: false, error: 'Los campos arete, nombre, raza, sexo y estado sanitario son obligatorios' });
    }

    if (arete.trim().length > 50) {
      return res.status(400).json({ success: false, error: 'El número de arete no puede exceder 50 caracteres' });
    }

    if (nombre.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El nombre no puede exceder 100 caracteres' });
    }

    if (!['Macho', 'Hembra'].includes(sexo)) {
      return res.status(400).json({ success: false, error: 'El sexo debe ser "Macho" o "Hembra"' });
    }

    if (!['Bueno', 'Regular', 'Crítico'].includes(estado_sanitario)) {
      return res.status(400).json({ success: false, error: 'El estado sanitario debe ser "Bueno", "Regular" o "Crítico"' });
    }

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser "Activo", "Vendido" o "Muerto"' });
    }

    if (origen && !ORIGENES_VALIDOS.includes(origen)) {
      return res.status(400).json({ success: false, error: 'El origen debe ser "Nacido" o "Comprado"' });
    }

    if (peso_kg !== undefined && peso_kg !== null && peso_kg !== '') {
      const peso = parseFloat(peso_kg);
      if (isNaN(peso) || peso <= 0) {
        return res.status(400).json({ success: false, error: 'El peso debe ser un número positivo' });
      }
    }

    if (precio_compra !== undefined && precio_compra !== null && precio_compra !== '') {
      const precio = parseFloat(precio_compra);
      if (isNaN(precio) || precio < 0) {
        return res.status(400).json({ success: false, error: 'El precio de compra debe ser un número mayor o igual a cero' });
      }
    }

    for (const [campo, valor] of [['fecha_nacimiento', fecha_nacimiento], ['fecha_compra', fecha_compra]]) {
      if (valor) {
        const f = new Date(valor);
        if (isNaN(f.getTime())) {
          return res.status(400).json({ success: false, error: `La fecha de ${campo === 'fecha_nacimiento' ? 'nacimiento' : 'compra'} no es válida` });
        }
      }
    }

    const razaCheck = await pool.query('SELECT id FROM razas WHERE id = $1', [raza_id]);
    if (razaCheck.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'La raza seleccionada no existe' });
    }

    const existingArete = await pool.query('SELECT id FROM ganado WHERE arete = $1', [arete.trim()]);
    if (existingArete.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El número de arete ya está registrado' });
    }

    if (potrero_id) {
      const p = await pool.query('SELECT id FROM potreros WHERE id = $1', [potrero_id]);
      if (p.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El potrero seleccionado no existe' });
      }
    }

    if (madre_id) {
      const m = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [madre_id]);
      if (m.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'La madre seleccionada no existe' });
      }
      if (m.rows[0].sexo !== 'Hembra') {
        return res.status(400).json({ success: false, error: 'La madre debe ser una hembra' });
      }
    }

    if (padre_id) {
      const pa = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [padre_id]);
      if (pa.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El padre seleccionado no existe' });
      }
      if (pa.rows[0].sexo !== 'Macho') {
        return res.status(400).json({ success: false, error: 'El padre debe ser un macho' });
      }
    }

    const result = await pool.query(
      `INSERT INTO ganado (
          arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg, estado_sanitario,
          estado, origen, fecha_compra, precio_compra, potrero_id, madre_id, padre_id
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        arete.trim(),
        nombre.trim(),
        raza_id,
        sexo,
        fecha_nacimiento || null,
        peso_kg || null,
        estado_sanitario,
        estado || 'Activo',
        origen || 'Nacido',
        fecha_compra || null,
        precio_compra || null,
        potrero_id || null,
        madre_id || null,
        padre_id || null
      ]
    );

    res.status(201).json({ success: true, message: 'Registro creado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear ganado:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/ganado/:id - Actualizar registro (solo admin)
router.put('/:id', verificarToken, requerirRol(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg, estado_sanitario,
      estado, origen, fecha_compra, precio_compra, potrero_id, madre_id, padre_id
    } = req.body;

    const existing = await pool.query('SELECT id FROM ganado WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    if (!arete || !nombre || !raza_id || !sexo || !estado_sanitario) {
      return res.status(400).json({ success: false, error: 'Los campos arete, nombre, raza, sexo y estado sanitario son obligatorios' });
    }

    if (arete.trim().length > 50) {
      return res.status(400).json({ success: false, error: 'El número de arete no puede exceder 50 caracteres' });
    }

    if (nombre.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El nombre no puede exceder 100 caracteres' });
    }

    if (!['Macho', 'Hembra'].includes(sexo)) {
      return res.status(400).json({ success: false, error: 'El sexo debe ser "Macho" o "Hembra"' });
    }

    if (!['Bueno', 'Regular', 'Crítico'].includes(estado_sanitario)) {
      return res.status(400).json({ success: false, error: 'El estado sanitario debe ser "Bueno", "Regular" o "Crítico"' });
    }

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser "Activo", "Vendido" o "Muerto"' });
    }

    if (origen && !ORIGENES_VALIDOS.includes(origen)) {
      return res.status(400).json({ success: false, error: 'El origen debe ser "Nacido" o "Comprado"' });
    }

    if (peso_kg !== undefined && peso_kg !== null && peso_kg !== '') {
      const peso = parseFloat(peso_kg);
      if (isNaN(peso) || peso <= 0) {
        return res.status(400).json({ success: false, error: 'El peso debe ser un número positivo' });
      }
    }

    if (precio_compra !== undefined && precio_compra !== null && precio_compra !== '') {
      const precio = parseFloat(precio_compra);
      if (isNaN(precio) || precio < 0) {
        return res.status(400).json({ success: false, error: 'El precio de compra debe ser un número mayor o igual a cero' });
      }
    }

    for (const [campo, valor] of [['fecha_nacimiento', fecha_nacimiento], ['fecha_compra', fecha_compra]]) {
      if (valor) {
        const f = new Date(valor);
        if (isNaN(f.getTime())) {
          return res.status(400).json({ success: false, error: `La fecha de ${campo === 'fecha_nacimiento' ? 'nacimiento' : 'compra'} no es válida` });
        }
      }
    }

    const razaCheck = await pool.query('SELECT id FROM razas WHERE id = $1', [raza_id]);
    if (razaCheck.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'La raza seleccionada no existe' });
    }

    const areteCheck = await pool.query('SELECT id FROM ganado WHERE arete = $1 AND id != $2', [arete.trim(), id]);
    if (areteCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El número de arete ya está en uso por otro registro' });
    }

    if (potrero_id) {
      const p = await pool.query('SELECT id FROM potreros WHERE id = $1', [potrero_id]);
      if (p.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El potrero seleccionado no existe' });
      }
    }

    if (madre_id) {
      const m = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [madre_id]);
      if (m.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'La madre seleccionada no existe' });
      }
      if (m.rows[0].sexo !== 'Hembra') {
        return res.status(400).json({ success: false, error: 'La madre debe ser una hembra' });
      }
    }

    if (padre_id) {
      const pa = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [padre_id]);
      if (pa.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El padre seleccionado no existe' });
      }
      if (pa.rows[0].sexo !== 'Macho') {
        return res.status(400).json({ success: false, error: 'El padre debe ser un macho' });
      }
    }

    const result = await pool.query(
      `UPDATE ganado SET
         arete = $1, nombre = $2, raza_id = $3, sexo = $4, fecha_nacimiento = $5,
         peso_kg = $6, estado_sanitario = $7, estado = $8, origen = $9,
         fecha_compra = $10, precio_compra = $11, potrero_id = $12,
         madre_id = $13, padre_id = $14
       WHERE id = $15 RETURNING *`,
      [
        arete.trim(),
        nombre.trim(),
        raza_id,
        sexo,
        fecha_nacimiento || null,
        peso_kg || null,
        estado_sanitario,
        estado || 'Activo',
        origen || 'Nacido',
        fecha_compra || null,
        precio_compra || null,
        potrero_id || null,
        madre_id || null,
        padre_id || null,
        id
      ]
    );

    res.json({ success: true, message: 'Registro actualizado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar ganado:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/ganado/:id - Eliminar registro (solo admin)
router.delete('/:id', verificarToken, requerirRol(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM ganado WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    await pool.query('DELETE FROM ganado WHERE id = $1', [id]);
    res.json({ success: true, message: 'Registro eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar ganado:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

module.exports = router;
