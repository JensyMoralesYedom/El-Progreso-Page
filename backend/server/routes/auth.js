const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { verificarToken } = require('../middleware/auth');

const ROLES_VALIDOS = ['admin', 'trabajador', 'veterinario', 'invitado'];

// POST /api/auth/registro - Registrar nuevo usuario
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios' });
    }

    if (nombre.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'El nombre no puede exceder 100 caracteres' });
    }

    if (email.trim().length > 150) {
      return res.status(400).json({ success: false, error: 'El email no puede exceder 150 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'El formato del email no es válido' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const rolFinal = rol ? rol.trim().toLowerCase() : 'admin';
    if (!ROLES_VALIDOS.includes(rolFinal)) {
      return res.status(400).json({ success: false, error: 'El rol no es válido' });
    }

    const existingUser = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.trim().toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)',
      [nombre.trim(), email.trim().toLowerCase(), hashedPassword, rolFinal]
    );

    res.status(201).json({ success: true, message: 'Usuario registrado exitosamente', rol: rolFinal });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña son obligatorios' });
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.trim().toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /api/auth/invitado - Token temporal de invitado
router.post('/invitado', (req, res) => {
  try {
    const token = jwt.sign(
      { id: 0, nombre: 'Invitado', email: '', rol: 'invitado' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: { id: 0, nombre: 'Invitado', email: '', rol: 'invitado' }
    });
  } catch (err) {
    console.error('Error generando token de invitado:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/auth/perfil - Verificar token y retornar datos del usuario
router.get('/perfil', verificarToken, (req, res) => {
  res.json({
    success: true,
    user: { id: req.user.id, nombre: req.user.nombre, email: req.user.email, rol: req.user.rol }
  });
});

module.exports = router;
