const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

const MODIFICADORES = ['admin', 'veterinario'];
const TIPOS_TRATAMIENTO = ['Enfermedad', 'Lesión', 'Desparasitación', 'Otro'];
const ESTADOS_TRATAMIENTO = ['Activo', 'Finalizado', 'Cancelado'];

async function existeAnimal(animalId) {
  const r = await pool.query('SELECT id, estado_sanitario FROM ganado WHERE id = $1', [animalId]);
  return r.rows[0] || null;
}

function validarFecha(valor) {
  if (!valor) return true;
  return !isNaN(new Date(valor).getTime());
}

// ========================================
// VACUNACIONES
// ========================================

// GET /api/salud/vacunaciones - Listar vacunaciones (todos los roles autenticados)
router.get('/vacunaciones', verificarToken, async (req, res) => {
  try {
    const { animal_id } = req.query;
    let query = `
      SELECT v.*, g.arete, g.nombre AS animal_nombre
      FROM vacunaciones v
      LEFT JOIN ganado g ON v.animal_id = g.id
    `;
    const params = [];
    if (animal_id) {
      params.push(animal_id);
      query += ` WHERE v.animal_id = $${params.length}`;
    }
    query += ' ORDER BY v.fecha_aplicacion DESC, v.id DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar vacunaciones:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/salud/vacunaciones - Crear vacunación (admin/veterinario)
router.post('/vacunaciones', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { animal_id, vacuna, dosis, fecha_aplicacion, fecha_proxima, veterinario, observaciones } = req.body;

    if (!animal_id || !vacuna) {
      return res.status(400).json({ success: false, error: 'El animal y la vacuna son obligatorios' });
    }

    if (vacuna.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El nombre de la vacuna no puede exceder 100 caracteres' });
    }

    if (!validarFecha(fecha_aplicacion) || !validarFecha(fecha_proxima)) {
      return res.status(400).json({ success: false, error: 'Las fechas no son válidas' });
    }

    if (!(await existeAnimal(animal_id))) {
      return res.status(400).json({ success: false, error: 'El animal no existe' });
    }

    const result = await pool.query(
      `INSERT INTO vacunaciones (animal_id, vacuna, dosis, fecha_aplicacion, fecha_proxima, veterinario, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        animal_id,
        vacuna.trim(),
        dosis ? dosis.trim() : null,
        fecha_aplicacion || new Date().toISOString().split('T')[0],
        fecha_proxima || null,
        veterinario ? veterinario.trim() : null,
        observaciones ? observaciones.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Vacunación registrada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear vacunación:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/salud/vacunaciones/:id - Actualizar vacunación (admin/veterinario)
router.put('/vacunaciones/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { id } = req.params;
    const { animal_id, vacuna, dosis, fecha_aplicacion, fecha_proxima, veterinario, observaciones } = req.body;

    const existing = await pool.query('SELECT id FROM vacunaciones WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vacunación no encontrada' });
    }

    if (!animal_id || !vacuna) {
      return res.status(400).json({ success: false, error: 'El animal y la vacuna son obligatorios' });
    }

    if (vacuna.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El nombre de la vacuna no puede exceder 100 caracteres' });
    }

    if (!validarFecha(fecha_aplicacion) || !validarFecha(fecha_proxima)) {
      return res.status(400).json({ success: false, error: 'Las fechas no son válidas' });
    }

    if (!(await existeAnimal(animal_id))) {
      return res.status(400).json({ success: false, error: 'El animal no existe' });
    }

    const result = await pool.query(
      `UPDATE vacunaciones SET animal_id = $1, vacuna = $2, dosis = $3, fecha_aplicacion = $4,
         fecha_proxima = $5, veterinario = $6, observaciones = $7
       WHERE id = $8 RETURNING *`,
      [
        animal_id,
        vacuna.trim(),
        dosis ? dosis.trim() : null,
        fecha_aplicacion,
        fecha_proxima || null,
        veterinario ? veterinario.trim() : null,
        observaciones ? observaciones.trim() : null,
        id
      ]
    );

    res.json({ success: true, message: 'Vacunación actualizada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar vacunación:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/salud/vacunaciones/:id - Eliminar vacunación (admin/veterinario)
router.delete('/vacunaciones/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM vacunaciones WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vacunación no encontrada' });
    }

    await pool.query('DELETE FROM vacunaciones WHERE id = $1', [id]);
    res.json({ success: true, message: 'Vacunación eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar vacunación:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

// ========================================
// TRATAMIENTOS (incluye desparasitaciones)
// ========================================

// GET /api/salud/tratamientos - Listar tratamientos (todos los roles autenticados)
router.get('/tratamientos', verificarToken, async (req, res) => {
  try {
    const { animal_id } = req.query;
    let query = `
      SELECT t.*, g.arete, g.nombre AS animal_nombre
      FROM tratamientos t
      LEFT JOIN ganado g ON t.animal_id = g.id
    `;
    const params = [];
    if (animal_id) {
      params.push(animal_id);
      query += ` WHERE t.animal_id = $${params.length}`;
    }
    query += ' ORDER BY t.fecha_inicio DESC, t.id DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar tratamientos:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

async function sincronizarEstadoSanitario(client, animalId, excluirTratamientoId) {
  const check = await client.query(
    `SELECT COUNT(*)::int AS activos
     FROM tratamientos
     WHERE animal_id = $1 AND estado = 'Activo' AND ($2::int IS NULL OR id != $2::int)`,
    [animalId, excluirTratamientoId || null]
  );
  const animal = await client.query('SELECT estado_sanitario FROM ganado WHERE id = $1', [animalId]);
  if (!animal.rows[0]) return;

  const actual = animal.rows[0].estado_sanitario;
  const nuevo = check.rows[0].activos > 0 ? 'Regular' : 'Bueno';
  if (actual !== 'Crítico' && actual !== nuevo) {
    await client.query('UPDATE ganado SET estado_sanitario = $1 WHERE id = $2', [nuevo, animalId]);
  }
}

// POST /api/salud/tratamientos - Crear tratamiento (admin/veterinario)
router.post('/tratamientos', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      animal_id, tipo, diagnostico, medicamento, dosis,
      fecha_inicio, fecha_fin, estado, costo, veterinario, observaciones
    } = req.body;

    if (!animal_id) {
      return res.status(400).json({ success: false, error: 'El animal es obligatorio' });
    }

    if (tipo && !TIPOS_TRATAMIENTO.includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo de tratamiento debe ser Enfermedad, Lesión, Desparasitación u Otro' });
    }

    if (estado && !ESTADOS_TRATAMIENTO.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser Activo, Finalizado o Cancelado' });
    }

    if (!validarFecha(fecha_inicio) || !validarFecha(fecha_fin)) {
      return res.status(400).json({ success: false, error: 'Las fechas no son válidas' });
    }

    if (costo !== undefined && costo !== null && costo !== '') {
      const c = parseFloat(costo);
      if (isNaN(c) || c < 0) {
        return res.status(400).json({ success: false, error: 'El costo debe ser un número mayor o igual a cero' });
      }
    }

    await client.query('BEGIN');

    if (!(await existeAnimal(animal_id))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El animal no existe' });
    }

    const estadoFinal = estado || 'Activo';

    const result = await client.query(
      `INSERT INTO tratamientos (
          animal_id, tipo, diagnostico, medicamento, dosis,
          fecha_inicio, fecha_fin, estado, costo, veterinario, observaciones
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        animal_id,
        tipo || 'Enfermedad',
        diagnostico ? diagnostico.trim() : null,
        medicamento ? medicamento.trim() : null,
        dosis ? dosis.trim() : null,
        fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_fin || null,
        estadoFinal,
        costo || 0,
        veterinario ? veterinario.trim() : null,
        observaciones ? observaciones.trim() : null
      ]
    );

    if (estadoFinal === 'Activo') {
      await sincronizarEstadoSanitario(client, animal_id, null);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Tratamiento registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear tratamiento:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  } finally {
    client.release();
  }
});

// PUT /api/salud/tratamientos/:id - Actualizar tratamiento (admin/veterinario)
router.put('/tratamientos/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      animal_id, tipo, diagnostico, medicamento, dosis,
      fecha_inicio, fecha_fin, estado, costo, veterinario, observaciones
    } = req.body;

    const existing = await client.query('SELECT * FROM tratamientos WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tratamiento no encontrado' });
    }

    if (!animal_id) {
      return res.status(400).json({ success: false, error: 'El animal es obligatorio' });
    }

    if (tipo && !TIPOS_TRATAMIENTO.includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo de tratamiento debe ser Enfermedad, Lesión, Desparasitación u Otro' });
    }

    if (estado && !ESTADOS_TRATAMIENTO.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser Activo, Finalizado o Cancelado' });
    }

    if (!validarFecha(fecha_inicio) || !validarFecha(fecha_fin)) {
      return res.status(400).json({ success: false, error: 'Las fechas no son válidas' });
    }

    if (costo !== undefined && costo !== null && costo !== '') {
      const c = parseFloat(costo);
      if (isNaN(c) || c < 0) {
        return res.status(400).json({ success: false, error: 'El costo debe ser un número mayor o igual a cero' });
      }
    }

    await client.query('BEGIN');

    if (!(await existeAnimal(animal_id))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El animal no existe' });
    }

    const estadoFinal = estado || existing.rows[0].estado;

    const result = await client.query(
      `UPDATE tratamientos SET
         animal_id = $1, tipo = $2, diagnostico = $3, medicamento = $4, dosis = $5,
         fecha_inicio = $6, fecha_fin = $7, estado = $8, costo = $9,
         veterinario = $10, observaciones = $11
       WHERE id = $12 RETURNING *`,
      [
        animal_id,
        tipo || existing.rows[0].tipo,
        diagnostico !== undefined ? (diagnostico ? diagnostico.trim() : null) : existing.rows[0].diagnostico,
        medicamento !== undefined ? (medicamento ? medicamento.trim() : null) : existing.rows[0].medicamento,
        dosis !== undefined ? (dosis ? dosis.trim() : null) : existing.rows[0].dosis,
        fecha_inicio || existing.rows[0].fecha_inicio,
        fecha_fin !== undefined ? fecha_fin : existing.rows[0].fecha_fin,
        estadoFinal,
        costo !== undefined && costo !== null && costo !== '' ? parseFloat(costo) : existing.rows[0].costo,
        veterinario !== undefined ? (veterinario ? veterinario.trim() : null) : existing.rows[0].veterinario,
        observaciones !== undefined ? (observaciones ? observaciones.trim() : null) : existing.rows[0].observaciones,
        id
      ]
    );

    await sincronizarEstadoSanitario(client, animal_id, id);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Tratamiento actualizado exitosamente', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar tratamiento:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  } finally {
    client.release();
  }
});

// DELETE /api/salud/tratamientos/:id - Eliminar tratamiento (admin/veterinario)
router.delete('/tratamientos/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const existing = await client.query('SELECT * FROM tratamientos WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tratamiento no encontrado' });
    }

    const animalId = existing.rows[0].animal_id;

    await client.query('BEGIN');
    await client.query('DELETE FROM tratamientos WHERE id = $1', [id]);
    await sincronizarEstadoSanitario(client, animalId, id);
    await client.query('COMMIT');

    res.json({ success: true, message: 'Tratamiento eliminado exitosamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar tratamiento:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  } finally {
    client.release();
  }
});

// ========================================
// VISITAS DEL VETERINARIO
// ========================================

// GET /api/salud/visitas - Listar visitas (todos los roles autenticados)
router.get('/visitas', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, u.nombre AS responsable_nombre
      FROM visitas_veterinario v
      LEFT JOIN usuarios u ON v.responsable_id = u.id
      ORDER BY v.fecha DESC, v.id DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar visitas:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/salud/visitas - Crear visita (admin/veterinario)
router.post('/visitas', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { fecha, motivo, diagnostico, costo, veterinario } = req.body;

    if (!validarFecha(fecha)) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    if (costo !== undefined && costo !== null && costo !== '') {
      const c = parseFloat(costo);
      if (isNaN(c) || c < 0) {
        return res.status(400).json({ success: false, error: 'El costo debe ser un número mayor o igual a cero' });
      }
    }

    const result = await pool.query(
      `INSERT INTO visitas_veterinario (fecha, motivo, diagnostico, costo, veterinario, responsable_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        fecha || new Date().toISOString().split('T')[0],
        motivo ? motivo.trim() : null,
        diagnostico ? diagnostico.trim() : null,
        costo || 0,
        veterinario ? veterinario.trim() : null,
        req.user.id || null
      ]
    );

    res.status(201).json({ success: true, message: 'Visita registrada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear visita:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/salud/visitas/:id - Actualizar visita (admin/veterinario)
router.put('/visitas/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, motivo, diagnostico, costo, veterinario } = req.body;

    const existing = await pool.query('SELECT * FROM visitas_veterinario WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visita no encontrada' });
    }

    if (!validarFecha(fecha)) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    if (costo !== undefined && costo !== null && costo !== '') {
      const c = parseFloat(costo);
      if (isNaN(c) || c < 0) {
        return res.status(400).json({ success: false, error: 'El costo debe ser un número mayor o igual a cero' });
      }
    }

    const result = await pool.query(
      `UPDATE visitas_veterinario SET fecha = $1, motivo = $2, diagnostico = $3,
         costo = $4, veterinario = $5, responsable_id = $6
       WHERE id = $7 RETURNING *`,
      [
        fecha || existing.rows[0].fecha,
        motivo !== undefined ? (motivo ? motivo.trim() : null) : existing.rows[0].motivo,
        diagnostico !== undefined ? (diagnostico ? diagnostico.trim() : null) : existing.rows[0].diagnostico,
        costo !== undefined && costo !== null && costo !== '' ? parseFloat(costo) : existing.rows[0].costo,
        veterinario !== undefined ? (veterinario ? veterinario.trim() : null) : existing.rows[0].veterinario,
        req.user.id || existing.rows[0].responsable_id,
        id
      ]
    );

    res.json({ success: true, message: 'Visita actualizada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar visita:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/salud/visitas/:id - Eliminar visita (admin/veterinario)
router.delete('/visitas/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM visitas_veterinario WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visita no encontrada' });
    }

    await pool.query('DELETE FROM visitas_veterinario WHERE id = $1', [id]);
    res.json({ success: true, message: 'Visita eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar visita:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

// ========================================
// HISTORIAL SANITARIO
// ========================================

// GET /api/salud/historial/:animalId - Historial completo de un animal (todos los roles autenticados)
router.get('/historial/:animalId', verificarToken, async (req, res) => {
  try {
    const { animalId } = req.params;

    const animal = await pool.query(`
      SELECT g.*, r.nombre AS raza_nombre, p.nombre AS potrero_nombre
      FROM ganado g
      LEFT JOIN razas r ON g.raza_id = r.id
      LEFT JOIN potreros p ON g.potrero_id = p.id
      WHERE g.id = $1
    `, [animalId]);

    if (animal.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Animal no encontrado' });
    }

    const [vacunas, tratamientos, visitas] = await Promise.all([
      pool.query(`
        SELECT v.*, u.nombre AS responsable_nombre
        FROM vacunaciones v
        LEFT JOIN usuarios u ON v.animal_id = u.id
        WHERE v.animal_id = $1
        ORDER BY v.fecha_aplicacion DESC
      `, [animalId]),
      pool.query(`
        SELECT t.*, u.nombre AS responsable_nombre
        FROM tratamientos t
        LEFT JOIN usuarios u ON t.animal_id = u.id
        WHERE t.animal_id = $1
        ORDER BY t.fecha_inicio DESC
      `, [animalId]),
      pool.query(`
        SELECT v.*, u.nombre AS responsable_nombre
        FROM visitas_veterinario v
        LEFT JOIN usuarios u ON v.responsable_id = u.id
        ORDER BY v.fecha DESC
      `)
    ]);

    res.json({
      success: true,
      data: {
        animal: animal.rows[0],
        vacunas: vacunas.rows,
        tratamientos: tratamientos.rows,
        visitas: visitas.rows
      }
    });
  } catch (err) {
    console.error('Error al obtener historial sanitario:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
