/* ========================================
   SHELL.JS - Layout compartido (sidebar + header + utilidades)
   ======================================== */

const Shell = {
  MODULOS: [
    { key: 'dashboard', label: 'Dashboard', icon: 'chart-pie', href: 'dashboard.html' },
    { key: 'gestion', label: 'Ganado', icon: 'cow', href: 'gestion.html' },
    { key: 'salud', label: 'Salud', icon: 'stethoscope', href: 'salud.html' },
    { key: 'reproduccion', label: 'Reproducción', icon: 'baby', href: 'reproduccion.html' },
    { key: 'produccion', label: 'Producción', icon: 'tint', href: 'produccion.html' },
    { key: 'alimentacion', label: 'Alimentación', icon: 'seedling', href: 'alimentacion.html' },
    { key: 'finanzas', label: 'Finanzas', icon: 'coins', href: 'finanzas.html' },
    { key: 'empleados', label: 'Empleados', icon: 'users', href: 'empleados.html' },
    { key: 'inventario', label: 'Inventario', icon: 'boxes', href: 'inventario.html' },
    { key: 'reportes', label: 'Reportes', icon: 'file-alt', href: 'reportes.html' }
  ],

  user: null,
  page: '',

  async init(page) {
    const token = Auth.getToken();
    const current = window.location.pathname.split('/').pop() || page;
    if (!token) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(current);
      return null;
    }

    const user = await Auth.verificarAutenticacion();
    if (!user) return null;

    this.user = user;
    this.page = page || current;
    this.render();
    return user;
  },

  tieneRol(...roles) {
    return !!this.user && roles.includes(this.user.rol);
  },

  render() {
    this.renderSidebar();
    this.renderHeader();

    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        document.body.classList.toggle('sidebar-open');
      });
    }

    const logout = document.getElementById('btnLogout');
    if (logout) {
      logout.addEventListener('click', function () {
        Auth.logout();
      });
    }
  },

  renderSidebar() {
    const container = document.getElementById('sidebarContainer');
    if (!container) return;

    const nav = this.MODULOS.map(function (modulo) {
      const active = modulo.key === Shell.page ? ' class="active"' : '';
      return '<a href="' + modulo.href + '"' + active + '><i class="fas fa-' + modulo.icon + '"></i> ' + modulo.label + '</a>';
    }).join('');

    container.innerHTML =
      '<aside class="sidebar">' +
        '<div class="sidebar-brand">' +
          '<img src="img/Logo.png" alt="Logo El Progreso">' +
          '<span>El Progreso</span>' +
        '</div>' +
        '<nav class="sidebar-nav">' + nav + '</nav>' +
        '<div class="sidebar-footer">' +
          '<button class="btn-logout" id="btnLogout"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>' +
        '</div>' +
      '</aside>';
  },

  renderHeader() {
    const container = document.getElementById('shellHeader');
    if (!container) return;

    const modulo = this.MODULOS.find(function (m) { return m.key === Shell.page; });
    const titulo = modulo ? modulo.label : 'Sistema';

    container.innerHTML =
      '<button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button>' +
      '<h1>' + titulo + '</h1>' +
      '<div class="header-right">' +
        '<span class="user-info"><i class="fas fa-user"></i> <strong>' + this.user.nombre + '</strong></span>' +
        '<span class="role-badge ' + this.user.rol + '">' + Auth.rolLabel(this.user.rol) + '</span>' +
      '</div>';
  },

  showNotification(message, type) {
    type = type || 'info';
    const notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:16px 24px;border-radius:12px;color:#fff;font-family:"DM Sans",sans-serif;font-size:0.95rem;z-index:3000;display:flex;align-items:center;gap:12px;max-width:400px;box-shadow:0 8px 30px rgba(0,0,0,0.2);animation:slideInRight 0.4s ease;backdrop-filter:blur(10px);';
    const colors = { success: '#2D6A4F', error: '#C62828', info: '#1565C0' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    notification.style.background = colors[type] || colors.info;
    notification.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span>';
    document.body.appendChild(notification);

    if (!document.getElementById('notifKeyframes')) {
      const style = document.createElement('style');
      style.id = 'notifKeyframes';
      style.textContent = '@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOutRight{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
      document.head.appendChild(style);
    }

    setTimeout(function () {
      notification.style.animation = 'slideOutRight 0.4s ease forwards';
      setTimeout(function () { notification.remove(); }, 400);
    }, 4000);
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
};
