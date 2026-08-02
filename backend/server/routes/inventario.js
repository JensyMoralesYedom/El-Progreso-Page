const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

const OPERADORES = ['admin', 'trabajador'];
const ADMIN = ['admin'];
const TIPOS_MOVIMIENTO = ['Entrada', 'Salida'];

function validarFecha(valor) {
  if (!valor) return true;
  return !isNaN(new Date(valor).getTime());
}

// ========================================
// PRODUCTOS (catálogo)
// ========================================

// GET /api/inventario/productos - Listar productos (todos los roles autenticados)
router.get('/productos', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        (p.stock_actual < p.stock_minimo) AS stock_bajo
      FROM productos p
      ORDER BY p.nombre ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar productos:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// GET /api/inventario/productos/:id - Obtener producto (todos los roles autenticados)
router.get('/productos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener producto:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/inventario/productos - Crear producto (admin)
router.post('/productos', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { nombre, categoria, unidad_medida, stock_actual, stock_minimo, precio_unitario } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
    }

    if (nombre.trim().length > 150) {
      return res.status(400).json({ success: false, error: 'El nombre no puede exceder 150 caracteres' });
    }

    const numericos = [
      ['stock_actual', stock_actual],
      ['stock_minimo', stock_minimo],
      ['precio_unitario', precio_unitario]
    ];
    for (const [campo, valor] of numericos) {
      if (valor !== undefined && valor !== null && valor !== '') {
        const n = parseFloat(valor);
        if (isNaN(n) || n < 0) {
          return res.status(400).json({ success: false, error: `El ${campo.replace('_', ' ')} debe ser un número mayor o igual a cero` });
        }
      }
    }

    const existing = await pool.query('SELECT id FROM productos WHERE nombre = $1', [nombre.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un producto con ese nombre' });
    }

    const result = await pool.query(
      `INSERT INTO productos (nombre, categoria, unidad_medida, stock_actual, stock_minimo, precio_unitario)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        nombre.trim(),
        categoria ? categoria.trim() : null,
        unidad_medida || 'unidad',
        stock_actual || 0,
        stock_minimo || 0,
        precio_unitario || 0
      ]
    );

    res.status(201).json({ success: true, message: 'Producto creado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({ success: false, error: 'Error al insertar en la base de datos' });
  }
});

// PUT /api/inventario/productos/:id - Actualizar producto (admin)
router.put('/productos/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, unidad_medida, stock_actual, stock_minimo, precio_unitario } = req.body;

    const existing = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
    }

    const numericos = [
      ['stock_actual', stock_actual],
      ['stock_minimo', stock_minimo],
      ['precio_unitario', precio_unitario]
    ];
    for (const [campo, valor] of numericos) {
      if (valor !== undefined && valor !== null && valor !== '') {
        const n = parseFloat(valor);
        if (isNaN(n) || n < 0) {
          return res.status(400).json({ success: false, error: `El ${campo.replace('_', ' ')} debe ser un número mayor o igual a cero` });
        }
      }
    }

    const nameCheck = await pool.query('SELECT id FROM productos WHERE nombre = $1 AND id != $2', [nombre.trim(), id]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe otro producto con ese nombre' });
    }

    const result = await pool.query(
      `UPDATE productos SET nombre = $1, categoria = $2, unidad_medida = $3,
         stock_actual = $4, stock_minimo = $5, precio_unitario = $6
       WHERE id = $7 RETURNING *`,
      [
        nombre.trim(),
        categoria !== undefined ? (categoria ? categoria.trim() : null) : existing.rows[0].categoria,
        unidad_medida || existing.rows[0].unidad_medida,
        stock_actual !== undefined && stock_actual !== null && stock_actual !== '' ? parseFloat(stock_actual) : existing.rows[0].stock_actual,
        stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '' ? parseFloat(stock_minimo) : existing.rows[0].stock_minimo,
        precio_unitario !== undefined && precio_unitario !== null && precio_unitario !== '' ? parseFloat(precio_unitario) : existing.rows[0].precio_unitario,
        id
      ]
    );

    res.json({ success: true, message: 'Producto actualizado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar en la base de datos' });
  }
});

// DELETE /api/inventario/productos/:id - Eliminar producto (admin)
router.delete('/productos/:id', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM productos WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    await pool.query('DELETE FROM productos WHERE id = $1', [id]);
    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
  }
});

// ========================================
// MOVIMIENTOS DE INVENTARIO
// ========================================

// GET /api/inventario/movimientos - Listar movimientos (admin/trabajador)
router.get('/movimientos', verificarToken, requerirRol(OPERADORES), async (req, res) => {
  try {
    const { producto_id, tipo, desde, hasta } = req.query;
    const condiciones = [];
    const params = [];

    if (producto_id) {
      params.push(producto_id);
      condiciones.push(`mi.producto_id = $${params.length}`);
    }

    if (tipo && TIPOS_MOVIMIENTO.includes(tipo)) {
      params.push(tipo);
      condiciones.push(`mi.tipo = $${params.length}`);
    }

    if (desde) {
      params.push(desde);
      condiciones.push(`mi.fecha >= $${params.length}`);
    }

    if (hasta) {
      params.push(hasta);
      condiciones.push(`mi.fecha <= $${params.length}`);
    }

    const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT mi.*, p.nombre AS producto_nombre, u.nombre AS responsable_nombre
      FROM movimientos_inventario mi
      LEFT JOIN productos p ON mi.producto_id = p.id
      LEFT JOIN usuarios u ON mi.responsable_id = u.id
      ${where}
      ORDER BY mi.fecha DESC, mi.id DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar movimientos de inventario:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

// POST /api/inventario/movimientos - Registrar entrada/salida (admin/trabajador)
router.post('/movimientos', verificarToken, requerirRol(OPERADORES), async (req, res) => {
  const client = await pool.connect();
  try {
    const { producto_id, tipo, cantidad, fecha, costo_unitario, proveedor, motivo } = req.body;

    if (!producto_id || !tipo || cantidad === undefined || cantidad === null || cantidad === '') {
      return res.status(400).json({ success: false, error: 'El producto, el tipo y la cantidad son obligatorios' });
    }

    if (!TIPOS_MOVIMIENTO.includes(tipo)) {
      return res.status(400).json({ success: false, error: 'El tipo debe ser "Entrada" o "Salida"' });
    }

    const cant = parseFloat(cantidad);
    if (isNaN(cant) || cant <= 0) {
      return res.status(400).json({ success: false, error: 'La cantidad debe ser un número mayor que cero' });
    }

    if (costo_unitario !== undefined && costo_unitario !== null && costo_unitario !== '') {
      const c = parseFloat(costo_unitario);
      if (isNaN(c) || c < 0) {
        return res.status(400).json({ success: false, error: 'El costo unitario debe ser un número mayor o igual a cero' });
      }
    }

    if (!validarFecha(fecha)) {
      return res.status(400).json({ success: false, error: 'La fecha no es válida' });
    }

    await client.query('BEGIN');

    const producto = await client.query('SELECT * FROM productos WHERE id = $1', [producto_id]);
    if (producto.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'El producto no existe' });
    }

    const stockActual = parseFloat(producto.rows[0].stock_actual);
    let stockNuevo;

    if (tipo === 'Entrada') {
      stockNuevo = stockActual + cant;
    } else {
      if (cant > stockActual) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `Stock insuficiente: solo hay ${stockActual} en inventario` });
      }
      stockNuevo = stockActual - cant;
    }

    const result = await client.query(
      `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, fecha, costo_unitario, proveedor, motivo, responsable_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        producto_id,
        tipo,
        cant,
        fecha || new Date().toISOString().split('T')[0],
        costo_unitario || 0,
        proveedor ? proveedor.trim() : null,
        motivo ? motivo.trim() : null,
        req.user.id || null
      ]
    );

    await client.query(
      'UPDATE productos SET stock_actual = $1 WHERE id = $2',
      [stockNuevo, producto_id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Movimiento de inventario registrado exitosamente',
      data: result.rows[0],
      stock_actual: stockNuevo
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar movimiento de inventario:', err);
    res.status(500).json({ success: false, error: 'Error al registrar el movimiento en la base de datos' });
  } finally {
    client.release();
  }
});

// ========================================
// ALERTAS DE STOCK
// ========================================

// GET /api/inventario/alertas - Productos bajo el stock mínimo (admin)
router.get('/alertas', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, categoria, unidad_medida, stock_actual, stock_minimo,
        (stock_minimo - stock_actual)::numeric AS faltante
      FROM productos
      WHERE stock_actual < stock_minimo
      ORDER BY (stock_minimo - stock_actual) DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener alertas de stock:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
