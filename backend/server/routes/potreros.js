const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

const ESTADOS_POTRERO = ['Disponible', 'En uso', 'Descanso'];

// GET /api/potreros - Listar potreros (todos los roles autenticados)
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM ganado g WHERE g.potrero_id = p.id AND g.estado = 'Activo') AS animales_actuales
      FROM potreros p
      ORDER BY p.nombre ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar potreros:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// GET /api/potreros/:id - Obtener un potrero por ID (todos los roles autenticados)
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM ganado g WHERE g.potrero_id = p.id AND g.estado = 'Activo') AS animales_actuales
      FROM potreros p
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Potrero no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener potrero:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/potreros - Crear potrero (solo admin)
router.post('/', verificarToken, requerirRol(['admin']), async (req, res) => {
  try {
    const { nombre, descripcion, hectareas, capacidad_cabezas, estado } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre del potrero es obligatorio' });
    }

    if (nombre.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El nombre no puede exceder 100 caracteres' });
    }

    if (hectareas !== undefined && hectareas !== null && hectareas !== '') {
      const h = parseFloat(hectareas);
      if (isNaN(h) || h <= 0) {
        return res.status(400).json({ success: false, error: 'Las hectáreas deben ser un número positivo' });
      }
    }

    if (capacidad_cabezas !== undefined && capacidad_cabezas !== null && capacidad_cabezas !== '') {
      const c = parseInt(capacidad_cabezas, 10);
      if (isNaN(c) || c <= 0) {
        return res.status(400).json({ success: false, error: 'La capacidad debe ser un número entero positivo' });
      }
    }

    if (estado && !ESTADOS_POTRERO.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser "Disponible", "En uso" o "Descanso"' });
    }

    const existing = await pool.query('SELECT id FROM potreros WHERE nombre = $1', [nombre.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un potrero con ese nombre' });
    }

    const result = await pool.query(
      `INSERT INTO potreros (nombre, descripcion, hectareas, capacidad_cabezas, estado)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        nombre.trim(),
        descripcion ? descripcion.trim() : null,
        hectareas || null,
        capacidad_cabezas || null,
        estado || 'Disponible'
      ]
    );

    res.status(201).json({ success: true, message: 'Potrero creado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear potrero:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/potreros/:id - Actualizar potrero (solo admin)
router.put('/:id', verificarToken, requerirRol(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, hectareas, capacidad_cabezas, estado } = req.body;

    const existing = await pool.query('SELECT id FROM potreros WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Potrero no encontrado' });
    }

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre del potrero es obligatorio' });
    }

    if (nombre.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El nombre no puede exceder 100 caracteres' });
    }

    if (hectareas !== undefined && hectareas !== null && hectareas !== '') {
      const h = parseFloat(hectareas);
      if (isNaN(h) || h <= 0) {
        return res.status(400).json({ success: false, error: 'Las hectáreas deben ser un número positivo' });
      }
    }

    if (capacidad_cabezas !== undefined && capacidad_cabezas !== null && capacidad_cabezas !== '') {
      const c = parseInt(capacidad_cabezas, 10);
      if (isNaN(c) || c <= 0) {
        return res.status(400).json({ success: false, error: 'La capacidad debe ser un número entero positivo' });
      }
    }

    if (estado && !ESTADOS_POTRERO.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser "Disponible", "En uso" o "Descanso"' });
    }

    const nameCheck = await pool.query('SELECT id FROM potreros WHERE nombre = $1 AND id != $2', [nombre.trim(), id]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un potrero con ese nombre' });
    }

    const result = await pool.query(
      `UPDATE potreros SET nombre = $1, descripcion = $2, hectareas = $3,
         capacidad_cabezas = $4, estado = $5
       WHERE id = $6 RETURNING *`,
      [
        nombre.trim(),
        descripcion ? descripcion.trim() : null,
        hectareas || null,
        capacidad_cabezas || null,
        estado || 'Disponible',
        id
      ]
    );

    res.json({ success: true, message: 'Potrero actualizado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar potrero:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/potreros/:id - Eliminar potrero (solo admin)
router.delete('/:id', verificarToken, requerirRol(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM potreros WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Potrero no encontrado' });
    }

    await pool.query('DELETE FROM potreros WHERE id = $1', [id]);
    res.json({ success: true, message: 'Potrero eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar potrero:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

module.exports = router;
