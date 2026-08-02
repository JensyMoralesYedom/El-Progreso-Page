const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

const OPERADORES = ['admin', 'trabajador'];
const TIPOS_ALIMENTO = ['Forraje', 'Suplemento', 'Concentrado', 'Minerales', 'Otro'];

// GET /api/alimentacion - Listar raciones con filtros y totales (admin/trabajador)
// Parámetros: ?potrero_id=, ?animal_id=, ?desde=, ?hasta=
router.get('/', verificarToken, requerirRol(OPERADORES), async (req, res) => {
  try {
    const { potrero_id, animal_id, desde, hasta } = req.query;
    const condiciones = [];
    const params = [];

    if (potrero_id) {
      params.push(potrero_id);
      condiciones.push(`a.potrero_id = $${params.length}`);
    }

    if (animal_id) {
      params.push(animal_id);
      condiciones.push(`a.animal_id = $${params.length}`);
    }

    if (desde) {
      params.push(desde);
      condiciones.push(`a.fecha >= $${params.length}`);
    }

    if (hasta) {
      params.push(hasta);
      condiciones.push(`a.fecha <= $${params.length}`);
    }

    const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT a.*,
        p.nombre AS potrero_nombre,
        g.arete, g.nombre AS animal_nombre,
        u.nombre AS responsable_nombre
      FROM alimentacion a
      LEFT JOIN potreros p ON a.potrero_id = p.id
      LEFT JOIN ganado g ON a.animal_id = g.id
      LEFT JOIN usuarios u ON a.responsable_id = u.id
      ${where}
      ORDER BY a.fecha DESC, a.id DESC
    `, params);

    const totales = await pool.query(`
      SELECT
        COALESCE(SUM(a.cantidad_kg), 0)::numeric AS total_kg,
        COALESCE(SUM(a.costo), 0)::numeric AS total_costo,
        COUNT(*)::int AS total_raciones
      FROM alimentacion a
      ${where}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      totales: totales.rows[0]
    });
  } catch (err) {
    console.error('Error al listar alimentación:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/alimentacion - Registrar ración (admin/trabajador)
router.post('/', verificarToken, requerirRol(OPERADORES), async (req, res) => {
  try {
    const { fecha, tipo, alimento, cantidad_kg, costo, potrero_id, animal_id, observaciones } = req.body;

    if (!alimento || cantidad_kg === undefined || cantidad_kg === null || cantidad_kg === '') {
      return res.status(400).json({ success: false, error: 'El alimento y la cantidad son obligatorios' });
    }

    if (!potrero_id && !animal_id) {
      return res.status(400).json({ success: false, error: 'Debe indicar un potrero o un animal' });
    }

    if (alimento.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El alimento no puede exceder 100 caracteres' });
    }

    if (tipo && !TIPOS_ALIMENTO.includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo debe ser Forraje, Suplemento, Concentrado, Minerales u Otro' });
    }

    const cantidad = parseFloat(cantidad_kg);
    if (isNaN(cantidad) || cantidad < 0) {
      return res.status(400).json({ success: false, error: 'La cantidad debe ser un número mayor o igual a cero' });
    }

    if (costo !== undefined && costo !== null && costo !== '') {
      const c = parseFloat(costo);
      if (isNaN(c) || c < 0) {
        return res.status(400).json({ success: false, error: 'El costo debe ser un número mayor o igual a cero' });
      }
    }

    if (fecha && isNaN(new Date(fecha).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    if (potrero_id) {
      const p = await pool.query('SELECT id FROM potreros WHERE id = $1', [potrero_id]);
      if (p.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El potrero no existe' });
      }
    }

    if (animal_id) {
      const g = await pool.query('SELECT id FROM ganado WHERE id = $1', [animal_id]);
      if (g.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El animal no existe' });
      }
    }

    const result = await pool.query(
      `INSERT INTO alimentacion (fecha, tipo, alimento, cantidad_kg, costo, potrero_id, animal_id, responsable_id, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        fecha || new Date().toISOString().split('T')[0],
        tipo || 'Forraje',
        alimento.trim(),
        cantidad,
        costo || 0,
        potrero_id || null,
        animal_id || null,
        req.user.id || null,
        observaciones ? observaciones.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Ración registrada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al registrar alimentación:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

module.exports = router;
