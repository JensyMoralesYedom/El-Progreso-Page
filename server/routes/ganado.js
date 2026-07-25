const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

// GET /api/ganado - Listar todos los registros (admin + invitado)
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, r.nombre AS raza_nombre, r.origen AS raza_origen
      FROM ganado g
      LEFT JOIN razas r ON g.raza_id = r.id
      ORDER BY g.id ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar ganado:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// GET /api/ganado/:id - Obtener un registro por ID (admin + invitado)
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT g.*, r.nombre AS raza_nombre, r.origen AS raza_origen
      FROM ganado g
      LEFT JOIN razas r ON g.raza_id = r.id
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
    const { arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg, estado_sanitario, ubicacion } = req.body;

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

    if (peso_kg !== undefined && peso_kg !== null && peso_kg !== '') {
      const peso = parseFloat(peso_kg);
      if (isNaN(peso) || peso <= 0) {
        return res.status(400).json({ success: false, error: 'El peso debe ser un número positivo' });
      }
    }

    if (fecha_nacimiento) {
      const fecha = new Date(fecha_nacimiento);
      if (isNaN(fecha.getTime())) {
        return res.status(400).json({ success: false, error: 'La fecha de nacimiento no es válida' });
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

    const result = await pool.query(
      `INSERT INTO ganado (arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg, estado_sanitario, ubicacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        arete.trim(),
        nombre.trim(),
        raza_id,
        sexo,
        fecha_nacimiento || null,
        peso_kg || null,
        estado_sanitario,
        ubicacion ? ubicacion.trim() : null
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
    const { arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg, estado_sanitario, ubicacion } = req.body;

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

    if (peso_kg !== undefined && peso_kg !== null && peso_kg !== '') {
      const peso = parseFloat(peso_kg);
      if (isNaN(peso) || peso <= 0) {
        return res.status(400).json({ success: false, error: 'El peso debe ser un número positivo' });
      }
    }

    if (fecha_nacimiento) {
      const fecha = new Date(fecha_nacimiento);
      if (isNaN(fecha.getTime())) {
        return res.status(400).json({ success: false, error: 'La fecha de nacimiento no es válida' });
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

    const result = await pool.query(
      `UPDATE ganado SET arete = $1, nombre = $2, raza_id = $3, sexo = $4,
       fecha_nacimiento = $5, peso_kg = $6, estado_sanitario = $7, ubicacion = $8
       WHERE id = $9 RETURNING *`,
      [
        arete.trim(),
        nombre.trim(),
        raza_id,
        sexo,
        fecha_nacimiento || null,
        peso_kg || null,
        estado_sanitario,
        ubicacion ? ubicacion.trim() : null,
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

// GET /api/razas - Listar razas (admin + invitado)
router.get('/razas/lista', verificarToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM razas ORDER BY nombre ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar razas:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
