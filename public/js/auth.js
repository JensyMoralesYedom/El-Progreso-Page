/* ========================================
   AUTH.JS - Lógica de autenticación
   ======================================== */

const Auth = {
  getToken() {
    return localStorage.getItem('token');
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  setSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async verificarAutenticacion() {
    const token = this.getToken();
    if (!token) {
      window.location.href = 'login.html';
      return null;
    }

    try {
      const response = await fetch('/api/auth/perfil', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!response.ok) {
        this.clearSession();
        window.location.href = 'login.html';
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (err) {
      this.clearSession();
      window.location.href = 'login.html';
      return null;
    }
  },

  async login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await response.json();
  },

  async registro(nombre, email, password) {
    const response = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password })
    });
    return await response.json();
  },

  async loginInvitado() {
    const response = await fetch('/api/auth/invitado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  },

  logout() {
    this.clearSession();
    window.location.href = 'index.html';
  }
};
