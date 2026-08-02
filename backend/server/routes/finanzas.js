const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

// Según matriz de roles: Finanzas = CRUD (admin), lectura (invitado), sin acceso (trabajador/veterinario)
const LECTURA = ['admin', 'invitado'];
const ADMIN = ['admin'];

function validarMonto(valor) {
  if (valor === undefined || valor === null || valor === '') return true;
  const n = parseFloat(valor);
  return !isNaN(n) && n >= 0;
}

function validarFecha(valor) {
  if (!valor) return true;
  return !isNaN(new Date(valor).getTime());
}

// ========================================
// MOVIMIENTOS FINANCIEROS
// ========================================

// GET /api/finanzas/movimientos - Listar movimientos (admin/invitado)
router.get('/movimientos', verificarToken, requerirRol(LECTURA), async (req, res) => {
  try {
    const { tipo, categoria, desde, hasta } = req.query;
    const condiciones = [];
    const params = [];

    if (tipo && ['Ingreso', 'Egreso'].includes(tipo)) {
      params.push(tipo);
      condiciones.push(`mf.tipo = $${params.length}`);
    }

    if (categoria) {
      params.push(categoria);
      condiciones.push(`mf.categoria ILIKE $${params.length}`);
    }

    if (desde) {
      params.push(desde);
      condiciones.push(`mf.fecha >= $${params.length}`);
    }

    if (hasta) {
      params.push(hasta);
      condiciones.push(`mf.fecha <= $${params.length}`);
    }

    const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT mf.*, u.nombre AS responsable_nombre
      FROM movimientos_financieros mf
      LEFT JOIN usuarios u ON mf.responsable_id = u.id
      ${where}
      ORDER BY mf.fecha DESC, mf.id DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar movimientos financieros:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/finanzas/movimientos - Crear movimiento (admin)
router.post('/movimientos', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { fecha, tipo, categoria, descripcion, monto, metodo_pago } = req.body;

    if (!tipo || !categoria || monto === undefined || monto === null || monto === '') {
      return res.status(400).json({ success: false, error: 'El tipo, la categoría y el monto son obligatorios' });
    }

    if (!['Ingreso', 'Egreso'].includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo debe ser "Ingreso" o "Egreso"' });
    }

    if (categoria.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'La categoría no puede exceder 100 caracteres' });
    }

    if (!validarFecha(fecha)) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    if (!validarMonto(monto)) {
      return res.status(400).json({ success: false, error: 'El monto debe ser un número mayor o igual a cero' });
    }

    const result = await pool.query(
      `INSERT INTO movimientos_financieros (fecha, tipo, categoria, descripcion, monto, metodo_pago, responsable_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        fecha || new Date().toISOString().split('T')[0],
        tipo,
        categoria.trim(),
        descripcion ? descripcion.trim() : null,
        parseFloat(monto),
        metodo_pago ? metodo_pago.trim() : null,
        req.user.id || null
      ]
    );

    res.status(201).json({ success: true, message: 'Movimiento financiero registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear movimiento financiero:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/finanzas/movimientos/:id - Actualizar movimiento (admin)
router.put('/movimientos/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, tipo, categoria, descripcion, monto, metodo_pago } = req.body;

    const existing = await pool.query('SELECT * FROM movimientos_financieros WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Movimiento no encontrado' });
    }

    if (!tipo || !categoria || monto === undefined || monto === null || monto === '') {
      return res.status(400).json({ success: false, error: 'El tipo, la categoría y el monto son obligatorios' });
    }

    if (!['Ingreso', 'Egreso'].includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo debe ser "Ingreso" o "Egreso"' });
    }

    if (!validarFecha(fecha)) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    if (!validarMonto(monto)) {
      return res.status(400).json({ success: false, error: 'El monto debe ser un número mayor o igual a cero' });
    }

    const result = await pool.query(
      `UPDATE movimientos_financieros SET fecha = $1, tipo = $2, categoria = $3,
         descripcion = $4, monto = $5, metodo_pago = $6, responsable_id = $7
       WHERE id = $8 RETURNING *`,
      [
        fecha || existing.rows[0].fecha,
        tipo,
        categoria.trim(),
        descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : existing.rows[0].descripcion,
        parseFloat(monto),
        metodo_pago !== undefined ? (metodo_pago ? metodo_pago.trim() : null) : existing.rows[0].metodo_pago,
        req.user.id || existing.rows[0].responsable_id,
        id
      ]
    );

    res.json({ success: true, message: 'Movimiento actualizado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar movimiento financiero:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/finanzas/movimientos/:id - Eliminar movimiento (admin)
router.delete('/movimientos/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM movimientos_financieros WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Movimiento no encontrado' });
    }

    await pool.query('DELETE FROM movimientos_financieros WHERE id = $1', [id]);
    res.json({ success: true, message: 'Movimiento eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar movimiento financiero:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

// ========================================
// PAGOS A EMPLEADOS
// ========================================

// GET /api/finanzas/pagos - Listar pagos (admin/invitado)
router.get('/pagos', verificarToken, requerirRol(LECTURA), async (req, res) => {
  try {
    const { empleado_id, desde, hasta } = req.query;
    const condiciones = [];
    const params = [];

    if (empleado_id) {
      params.push(empleado_id);
      condiciones.push(`pe.empleado_id = $${params.length}`);
    }

    if (desde) {
      params.push(desde);
      condiciones.push(`pe.fecha_pago >= $${params.length}`);
    }

    if (hasta) {
      params.push(hasta);
      condiciones.push(`pe.fecha_pago <= $${params.length}`);
    }

    const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT pe.*, e.nombre AS empleado_nombre
      FROM pagos_empleados pe
      LEFT JOIN empleados e ON pe.empleado_id = e.id
      ${where}
      ORDER BY pe.fecha_pago DESC, pe.id DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar pagos:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/finanzas/pagos - Crear pago (admin)
router.post('/pagos', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { empleado_id, periodo, salario_bruto, deducciones, salario_neto, fecha_pago, metodo_pago, observaciones } = req.body;

    if (!empleado_id || !periodo || salario_bruto === undefined || salario_bruto === null || salario_neto === undefined || salario_neto === null) {
      return res.status(400).json({ success: false, error: 'El empleado, el periodo, el salario bruto y el salario neto son obligatorios' });
    }

    if (periodo.trim().length > 20) {
      return res.status(400).json({ success: false, error: 'El periodo no puede exceder 20 caracteres' });
    }

    const bruto = parseFloat(salario_bruto);
    const neto = parseFloat(salario_neto);
    if (isNaN(bruto) || bruto < 0 || isNaN(neto) || neto < 0) {
      return res.status(400).json({ success: false, error: 'Los salarios deben ser números mayores o iguales a cero' });
    }

    if (deducciones !== undefined && deducciones !== null && deducciones !== '') {
      const d = parseFloat(deducciones);
      if (isNaN(d) || d < 0) {
        return res.status(400).json({ success: false, error: 'Las deducciones deben ser un número mayor o igual a cero' });
      }
    }

    if (!validarFecha(fecha_pago)) {
      return res.status(400).json({ success: false, error: 'La fecha de pago no es válida' });
    }

    const empleado = await pool.query('SELECT id FROM empleados WHERE id = $1', [empleado_id]);
    if (empleado.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'El empleado no existe' });
    }

    const result = await pool.query(
      `INSERT INTO pagos_empleados (empleado_id, periodo, salario_bruto, deducciones, salario_neto, fecha_pago, metodo_pago, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        empleado_id,
        periodo.trim(),
        bruto,
        deducciones || 0,
        neto,
        fecha_pago || new Date().toISOString().split('T')[0],
        metodo_pago ? metodo_pago.trim() : null,
        observaciones ? observaciones.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Pago registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear pago:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/finanzas/pagos/:id - Actualizar pago (admin)
router.put('/pagos/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { empleado_id, periodo, salario_bruto, deducciones, salario_neto, fecha_pago, metodo_pago, observaciones } = req.body;

    const existing = await pool.query('SELECT * FROM pagos_empleados WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pago no encontrado' });
    }

    if (!empleado_id || !periodo || salario_bruto === undefined || salario_bruto === null || salario_neto === undefined || salario_neto === null) {
      return res.status(400).json({ success: false, error: 'El empleado, el periodo, el salario bruto y el salario neto son obligatorios' });
    }

    const bruto = parseFloat(salario_bruto);
    const neto = parseFloat(salario_neto);
    if (isNaN(bruto) || bruto < 0 || isNaN(neto) || neto < 0) {
      return res.status(400).json({ success: false, error: 'Los salarios deben ser números mayores o iguales a cero' });
    }

    if (!validarFecha(fecha_pago)) {
      return res.status(400).json({ success: false, error: 'La fecha de pago no es válida' });
    }

    const empleado = await pool.query('SELECT id FROM empleados WHERE id = $1', [empleado_id]);
    if (empleado.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'El empleado no existe' });
    }

    const result = await pool.query(
      `UPDATE pagos_empleados SET empleado_id = $1, periodo = $2, salario_bruto = $3,
         deducciones = $4, salario_neto = $5, fecha_pago = $6, metodo_pago = $7, observaciones = $8
       WHERE id = $9 RETURNING *`,
      [
        empleado_id,
        periodo.trim(),
        bruto,
        deducciones !== undefined && deducciones !== null && deducciones !== '' ? parseFloat(deducciones) : 0,
        neto,
        fecha_pago || existing.rows[0].fecha_pago,
        metodo_pago !== undefined ? (metodo_pago ? metodo_pago.trim() : null) : existing.rows[0].metodo_pago,
        observaciones !== undefined ? (observaciones ? observaciones.trim() : null) : existing.rows[0].observaciones,
        id
      ]
    );

    res.json({ success: true, message: 'Pago actualizado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar pago:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/finanzas/pagos/:id - Eliminar pago (admin)
router.delete('/pagos/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM pagos_empleados WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pago no encontrado' });
    }

    await pool.query('DELETE FROM pagos_empleados WHERE id = $1', [id]);
    res.json({ success: true, message: 'Pago eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar pago:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

// ========================================
// SALDO POR PERIODO
// ========================================

// GET /api/finanzas/saldo - Saldo por periodo y por categoría (admin/invitado)
router.get('/saldo', verificarToken, requerirRol(LECTURA), async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    const condiciones = [];
    const params = [];

    if (desde) {
      params.push(desde);
      condiciones.push(`mf.fecha >= $${params.length}`);
    }

    if (hasta) {
      params.push(hasta);
      condiciones.push(`mf.fecha <= $${params.length}`);
    }

    const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

    const totales = await pool.query(`
      SELECT
        COALESCE(SUM(mf.monto) FILTER (WHERE mf.tipo = 'Ingreso'), 0)::numeric AS ingresos,
        COALESCE(SUM(mf.monto) FILTER (WHERE mf.tipo = 'Egreso'), 0)::numeric AS egresos
      FROM movimientos_financieros mf
      ${where}
    `, params);

    const porCategoria = await pool.query(`
      SELECT mf.categoria, mf.tipo, SUM(mf.monto)::numeric AS total
      FROM movimientos_financieros mf
      ${where}
      GROUP BY mf.categoria, mf.tipo
      ORDER BY total DESC
    `, params);

    const ingresos = parseFloat(totales.rows[0].ingresos);
    const egresos = parseFloat(totales.rows[0].egresos);

    res.json({
      success: true,
      data: {
        desde: desde || null,
        hasta: hasta || null,
        ingresos,
        egresos,
        saldo: parseFloat((ingresos - egresos).toFixed(2)),
        por_categoria: porCategoria.rows
      }
    });
  } catch (err) {
    console.error('Error al obtener saldo:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
