const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

const OPERADORES = ['admin', 'trabajador'];
const TURNOS = ['Mañana', 'Tarde'];

// GET /api/produccion - Listar producción con filtros y totales (admin/trabajador)
// Parámetros: ?fecha=YYYY-MM-DD, ?animal_id=, ?desde=, ?hasta=
router.get('/', verificarToken, requerirRol(OPERADORES), async (req, res) => {
  try {
    const { fecha, animal_id, desde, hasta } = req.query;
    const condiciones = [];
    const params = [];

    if (fecha) {
      params.push(fecha);
      condiciones.push(`p.fecha = $${params.length}`);
    }

    if (animal_id) {
      params.push(animal_id);
      condiciones.push(`p.animal_id = $${params.length}`);
    }

    if (desde) {
      params.push(desde);
      condiciones.push(`p.fecha >= $${params.length}`);
    }

    if (hasta) {
      params.push(hasta);
      condiciones.push(`p.fecha <= $${params.length}`);
    }

    const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT p.*, g.arete, g.nombre AS animal_nombre
      FROM produccion_leche p
      LEFT JOIN ganado g ON p.animal_id = g.id
      ${where}
      ORDER BY p.fecha DESC, p.id DESC
    `, params);

    const totales = await pool.query(`
      SELECT
        COALESCE(SUM(p.litros), 0)::numeric AS total_litros,
        COALESCE(SUM(p.litros) FILTER (WHERE p.turno = 'Mañana'), 0)::numeric AS litros_manana,
        COALESCE(SUM(p.litros) FILTER (WHERE p.turno = 'Tarde'), 0)::numeric AS litros_tarde,
        COUNT(DISTINCT p.fecha)::int AS dias_registrados,
        COUNT(DISTINCT p.animal_id)::int AS animales_registrados
      FROM produccion_leche p
      ${where}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      totales: totales.rows[0]
    });
  } catch (err) {
    console.error('Error al listar producción:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/produccion - Registrar producción diaria (admin/trabajador)
router.post('/', verificarToken, requerirRol(OPERADORES), async (req, res) => {
  try {
    const { animal_id, fecha, turno, litros, observaciones } = req.body;

    if (!animal_id || !turno || litros === undefined || litros === null || litros === '') {
      return res.status(400).json({ success: false, error: 'El animal, el turno y los litros son obligatorios' });
    }

    if (!TURNOS.includes(turno)) {
      return res.status(400).json({ success: false, error: 'El turno debe ser "Mañana" o "Tarde"' });
    }

    const l = parseFloat(litros);
    if (isNaN(l) || l < 0) {
      return res.status(400).json({ success: false, error: 'Los litros deben ser un número mayor o igual a cero' });
    }

    if (fecha && isNaN(new Date(fecha).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    const animal = await pool.query('SELECT id FROM ganado WHERE id = $1', [animal_id]);
    if (animal.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'El animal no existe' });
    }

    const fechaFinal = fecha || new Date().toISOString().split('T')[0];

    const duplicado = await pool.query(
      'SELECT id FROM produccion_leche WHERE animal_id = $1 AND fecha = $2 AND turno = $3',
      [animal_id, fechaFinal, turno]
    );
    if (duplicado.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un registro de producción para ese animal, fecha y turno' });
    }

    const result = await pool.query(
      `INSERT INTO produccion_leche (animal_id, fecha, turno, litros, observaciones)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        animal_id,
        fechaFinal,
        turno,
        l,
        observaciones ? observaciones.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Producción registrada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al registrar producción:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

module.exports = router;
