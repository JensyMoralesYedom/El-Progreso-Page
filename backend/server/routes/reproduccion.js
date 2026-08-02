const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

const MODIFICADORES = ['admin', 'veterinario'];
const TIPOS_MONTA = ['Natural', 'Inseminación'];
const ESTADOS_GESTACION = ['En curso', 'Finalizada', 'Abortada'];
const RESULTADOS_PARTO = ['Normal', 'Difícil', 'Aborto'];

// ========================================
// MONTAS
// ========================================

// GET /api/reproduccion/montas - Listar montas (todos los roles autenticados)
router.get('/montas', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
        g1.arete AS macho_arete, g1.nombre AS macho_nombre,
        g2.arete AS hembra_arete, g2.nombre AS hembra_nombre
      FROM montas m
      LEFT JOIN ganado g1 ON m.macho_id = g1.id
      LEFT JOIN ganado g2 ON m.hembra_id = g2.id
      ORDER BY m.fecha DESC, m.id DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar montas:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/reproduccion/montas - Crear monta (admin/veterinario)
router.post('/montas', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { macho_id, hembra_id, fecha, tipo, resultado, observaciones } = req.body;

    if (!hembra_id) {
      return res.status(400).json({ success: false, error: 'La hembra es obligatoria' });
    }

    if (tipo && !TIPOS_MONTA.includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo debe ser Natural o Inseminación' });
    }

    if (fecha && isNaN(new Date(fecha).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    const hembra = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [hembra_id]);
    if (hembra.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'La hembra no existe' });
    }
    if (hembra.rows[0].sexo !== 'Hembra') {
      return res.status(400).json({ success: false, error: 'La hembra debe ser de sexo Hembra' });
    }

    if (macho_id) {
      const macho = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [macho_id]);
      if (macho.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El macho no existe' });
      }
      if (macho.rows[0].sexo !== 'Macho') {
        return res.status(400).json({ success: false, error: 'El macho debe ser de sexo Macho' });
      }
    }

    const result = await pool.query(
      `INSERT INTO montas (macho_id, hembra_id, fecha, tipo, resultado, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        macho_id || null,
        hembra_id,
        fecha || new Date().toISOString().split('T')[0],
        tipo || 'Natural',
        resultado ? resultado.trim() : null,
        observaciones ? observaciones.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Monta registrada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear monta:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/reproduccion/montas/:id - Actualizar monta (admin/veterinario)
router.put('/montas/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { id } = req.params;
    const { macho_id, hembra_id, fecha, tipo, resultado, observaciones } = req.body;

    const existing = await pool.query('SELECT * FROM montas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Monta no encontrada' });
    }

    if (!hembra_id) {
      return res.status(400).json({ success: false, error: 'La hembra es obligatoria' });
    }

    if (tipo && !TIPOS_MONTA.includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo debe ser Natural o Inseminación' });
    }

    if (fecha && isNaN(new Date(fecha).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    const hembra = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [hembra_id]);
    if (hembra.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'La hembra no existe' });
    }
    if (hembra.rows[0].sexo !== 'Hembra') {
      return res.status(400).json({ success: false, error: 'La hembra debe ser de sexo Hembra' });
    }

    if (macho_id) {
      const macho = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [macho_id]);
      if (macho.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'El macho no existe' });
      }
      if (macho.rows[0].sexo !== 'Macho') {
        return res.status(400).json({ success: false, error: 'El macho debe ser de sexo Macho' });
      }
    }

    const result = await pool.query(
      `UPDATE montas SET macho_id = $1, hembra_id = $2, fecha = $3, tipo = $4,
         resultado = $5, observaciones = $6
       WHERE id = $7 RETURNING *`,
      [
        macho_id !== undefined ? macho_id : existing.rows[0].macho_id,
        hembra_id,
        fecha || existing.rows[0].fecha,
        tipo || existing.rows[0].tipo,
        resultado !== undefined ? (resultado ? resultado.trim() : null) : existing.rows[0].resultado,
        observaciones !== undefined ? (observaciones ? observaciones.trim() : null) : existing.rows[0].observaciones,
        id
      ]
    );

    res.json({ success: true, message: 'Monta actualizada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar monta:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/reproduccion/montas/:id - Eliminar monta (admin/veterinario)
router.delete('/montas/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM montas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Monta no encontrada' });
    }

    await pool.query('DELETE FROM montas WHERE id = $1', [id]);
    res.json({ success: true, message: 'Monta eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar monta:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

// ========================================
// GESTACIONES
// ========================================

// GET /api/reproduccion/gestaciones - Listar gestaciones (todos los roles autenticados)
// Usar ?estado=En%20curso para ver próximos partos (RF-3.4)
router.get('/gestaciones', verificarToken, async (req, res) => {
  try {
    const { estado, hembra_id } = req.query;
    const condiciones = [];
    const params = [];

    if (estado && ESTADOS_GESTACION.includes(estado)) {
      params.push(estado);
      condiciones.push(`gest.estado = $${params.length}`);
    }

    if (hembra_id) {
      params.push(hembra_id);
      condiciones.push(`gest.hembra_id = $${params.length}`);
    }

    const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT gest.*,
        g2.arete AS hembra_arete, g2.nombre AS hembra_nombre,
        g3.arete AS cria_arete, g3.nombre AS cria_nombre,
        m.macho_id, m.fecha AS monta_fecha
      FROM gestaciones gest
      JOIN ganado g2 ON gest.hembra_id = g2.id
      LEFT JOIN ganado g3 ON gest.cria_id = g3.id
      LEFT JOIN montas m ON gest.monta_id = m.id
      ${where}
      ORDER BY gest.fecha_inicio DESC, gest.id DESC
    `, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar gestaciones:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/reproduccion/gestaciones - Crear gestación (admin/veterinario)
router.post('/gestaciones', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { hembra_id, monta_id, fecha_inicio, fecha_parto_estimada, estado, resultado, observaciones } = req.body;

    if (!hembra_id || !fecha_inicio) {
      return res.status(400).json({ success: false, error: 'La hembra y la fecha de inicio son obligatorias' });
    }

    if (estado && !ESTADOS_GESTACION.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser "En curso", "Finalizada" o "Abortada"' });
    }

    if (resultado && !RESULTADOS_PARTO.includes(resultado)) {
      return res.status(400).json({ success: false, error: 'El resultado debe ser Normal, Difícil o Aborto' });
    }

    if (isNaN(new Date(fecha_inicio).getTime()) || (fecha_parto_estimada && isNaN(new Date(fecha_parto_estimada).getTime()))) {
      return res.status(400).json({ success: false, error: 'Las fechas no son válidas' });
    }

    const hembra = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [hembra_id]);
    if (hembra.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'La hembra no existe' });
    }
    if (hembra.rows[0].sexo !== 'Hembra') {
      return res.status(400).json({ success: false, error: 'La hembra debe ser de sexo Hembra' });
    }

    if (monta_id) {
      const monta = await pool.query('SELECT id FROM montas WHERE id = $1', [monta_id]);
      if (monta.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'La monta no existe' });
      }
    }

    const enCurso = await pool.query(
      "SELECT id FROM gestaciones WHERE hembra_id = $1 AND estado = 'En curso'",
      [hembra_id]
    );
    if (enCurso.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'La hembra ya tiene una gestación en curso' });
    }

    const result = await pool.query(
      `INSERT INTO gestaciones (hembra_id, monta_id, fecha_inicio, fecha_parto_estimada, estado, resultado, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        hembra_id,
        monta_id || null,
        fecha_inicio,
        fecha_parto_estimada || null,
        estado || 'En curso',
        resultado || null,
        observaciones ? observaciones.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Gestación registrada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear gestación:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/reproduccion/gestaciones/:id - Actualizar gestación (admin/veterinario)
router.put('/gestaciones/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { id } = req.params;
    const { hembra_id, monta_id, fecha_inicio, fecha_parto_estimada, fecha_parto_real, estado, resultado, cria_id, observaciones } = req.body;

    const existing = await pool.query('SELECT * FROM gestaciones WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Gestación no encontrada' });
    }

    if (!hembra_id || !fecha_inicio) {
      return res.status(400).json({ success: false, error: 'La hembra y la fecha de inicio son obligatorias' });
    }

    if (estado && !ESTADOS_GESTACION.includes(estado)) {
      return res.status(400).json({ success: false, error: 'El estado debe ser "En curso", "Finalizada" o "Abortada"' });
    }

    if (resultado && !RESULTADOS_PARTO.includes(resultado)) {
      return res.status(400).json({ success: false, error: 'El resultado debe ser Normal, Difícil o Aborto' });
    }

    const fechas = [fecha_inicio, fecha_parto_estimada, fecha_parto_real];
    for (const f of fechas) {
      if (f && isNaN(new Date(f).getTime())) {
        return res.status(400).json({ success: false, error: 'Las fechas no son válidas' });
      }
    }

    const hembra = await pool.query('SELECT id, sexo FROM ganado WHERE id = $1', [hembra_id]);
    if (hembra.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'La hembra no existe' });
    }
    if (hembra.rows[0].sexo !== 'Hembra') {
      return res.status(400).json({ success: false, error: 'La hembra debe ser de sexo Hembra' });
    }

    if (monta_id) {
      const monta = await pool.query('SELECT id FROM montas WHERE id = $1', [monta_id]);
      if (monta.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'La monta no existe' });
      }
    }

    if (cria_id) {
      const cria = await pool.query('SELECT id FROM ganado WHERE id = $1', [cria_id]);
      if (cria.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'La cría no existe' });
      }
    }

    const enCurso = await pool.query(
      "SELECT id FROM gestaciones WHERE hembra_id = $1 AND estado = 'En curso' AND id != $2",
      [hembra_id, id]
    );
    if (enCurso.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'La hembra ya tiene otra gestación en curso' });
    }

    const result = await pool.query(
      `UPDATE gestaciones SET
         hembra_id = $1, monta_id = $2, fecha_inicio = $3, fecha_parto_estimada = $4,
         fecha_parto_real = $5, estado = $6, resultado = $7, cria_id = $8, observaciones = $9
       WHERE id = $10 RETURNING *`,
      [
        hembra_id,
        monta_id !== undefined ? monta_id : existing.rows[0].monta_id,
        fecha_inicio,
        fecha_parto_estimada !== undefined ? fecha_parto_estimada : existing.rows[0].fecha_parto_estimada,
        fecha_parto_real !== undefined ? fecha_parto_real : existing.rows[0].fecha_parto_real,
        estado || existing.rows[0].estado,
        resultado !== undefined ? resultado : existing.rows[0].resultado,
        cria_id !== undefined ? cria_id : existing.rows[0].cria_id,
        observaciones !== undefined ? (observaciones ? observaciones.trim() : null) : existing.rows[0].observaciones,
        id
      ]
    );

    res.json({ success: true, message: 'Gestación actualizada exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar gestación:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/reproduccion/gestaciones/:id - Eliminar gestación (admin/veterinario)
router.delete('/gestaciones/:id', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM gestaciones WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Gestación no encontrada' });
    }

    await pool.query('DELETE FROM gestaciones WHERE id = $1', [id]);
    res.json({ success: true, message: 'Gestación eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar gestación:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

// ========================================
// PARTOS (alta automática de cría)
// ========================================

// POST /api/reproduccion/partos - Registrar parto (admin/veterinario)
router.post('/partos', verificarToken, requerirRol(MODIFICADORES), async (req, res) => {
  const client = await pool.connect();
  try {
    const { gestacion_id, fecha_parto, resultado, arete_cria, nombre_cria, sexo_cria, peso_kg_cria } = req.body;

    if (!gestacion_id) {
      return res.status(400).json({ success: false, error: 'La gestación es obligatoria' });
    }

    if (resultado && !RESULTADOS_PARTO.includes(resultado)) {
      return res.status(400).json({ success: false, error: 'El resultado debe ser Normal, Difícil o Aborto' });
    }

    if (fecha_parto && isNaN(new Date(fecha_parto).getTime())) {
      return res.status(400).json({ success: false, error: 'La fecha del parto no es válida' });
    }

    const pesoFinal = peso_kg_cria !== undefined && peso_kg_cria !== null && peso_kg_cria !== ''
      ? parseFloat(peso_kg_cria)
      : null;
    if (pesoFinal !== null && (isNaN(pesoFinal) || pesoFinal <= 0)) {
      return res.status(400).json({ success: false, error: 'El peso de la cría debe ser un número positivo' });
    }

    const resultadoFinal = resultado || 'Normal';
    const fechaPartoFinal = fecha_parto || new Date().toISOString().split('T')[0];

    await client.query('BEGIN');

    const gestacion = await client.query('SELECT * FROM gestaciones WHERE id = $1', [gestacion_id]);
    if (gestacion.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Gestación no encontrada' });
    }

    if (gestacion.rows[0].estado !== 'En curso') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'La gestación ya fue finalizada o abortada' });
    }

    const gest = gestacion.rows[0];

    if (resultadoFinal === 'Aborto') {
      const gestActualizada = await client.query(
        `UPDATE gestaciones SET estado = 'Abortada', fecha_parto_real = $1, resultado = 'Aborto'
         WHERE id = $2 RETURNING *`,
        [fechaPartoFinal, gestacion_id]
      );
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Aborto registrado', data: { gestacion: gestActualizada.rows[0] } });
    }

    if (!arete_cria || !nombre_cria || !sexo_cria) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Para un parto exitoso se requieren arete, nombre y sexo de la cría' });
    }

    if (!['Macho', 'Hembra'].includes(sexo_cria)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El sexo de la cría debe ser "Macho" o "Hembra"' });
    }

    if (arete_cria.trim().length > 50 || nombre_cria.trim().length > 100) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El arete o el nombre de la cría exceden la longitud máxima' });
    }

    const areteCheck = await client.query('SELECT id FROM ganado WHERE arete = $1', [arete_cria.trim()]);
    if (areteCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El arete de la cría ya está registrado' });
    }

    const hembra = await client.query('SELECT id, raza_id FROM ganado WHERE id = $1', [gest.hembra_id]);
    if (hembra.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'La madre no existe' });
    }

    let padreId = null;
    if (gest.monta_id) {
      const monta = await client.query('SELECT macho_id FROM montas WHERE id = $1', [gest.monta_id]);
      if (monta.rows.length > 0) {
        padreId = monta.rows[0].macho_id;
      }
    }

    const cria = await client.query(
      `INSERT INTO ganado (arete, nombre, raza_id, sexo, fecha_nacimiento, peso_kg,
         estado_sanitario, estado, origen, madre_id, padre_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'Bueno', 'Activo', 'Nacido', $7, $8)
       RETURNING *`,
      [
        arete_cria.trim(),
        nombre_cria.trim(),
        hembra.rows[0].raza_id,
        sexo_cria,
        fechaPartoFinal,
        pesoFinal,
        gest.hembra_id,
        padreId
      ]
    );

    await client.query(
      `INSERT INTO movimientos_ganado (animal_id, tipo, fecha, descripcion, responsable_id)
       VALUES ($1, 'Nacimiento', $2, $3, $4)`,
      [cria.rows[0].id, fechaPartoFinal, `Nacimiento registrado por parto`, req.user.id || null]
    );

    const gestFinal = await client.query(
      `UPDATE gestaciones SET estado = 'Finalizada', fecha_parto_real = $1, resultado = $2, cria_id = $3
       WHERE id = $4 RETURNING *`,
      [fechaPartoFinal, resultadoFinal, cria.rows[0].id, gestacion_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Parto registrado y cría dada de alta exitosamente',
      data: { cria: cria.rows[0], gestacion: gestFinal.rows[0] }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar parto:', err);
    res.status(500).json({ success: false, error: 'Error al registrar el parto en la base de datos' });
  } finally {
    client.release();
  }
});

module.exports = router;
