/* ========================================
   REPORTES.JS - Visualización de reportes
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  let currentUser = null;
  const token = Auth.getToken();

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = await Auth.verificarAutenticacion();
  if (!currentUser) return;

  document.getElementById('userName').textContent = currentUser.nombre;
  const roleBadge = document.getElementById('userRole');
  roleBadge.textContent = currentUser.rol === 'admin' ? 'Admin' : 'Invitado';
  roleBadge.className = 'role-badge ' + currentUser.rol;

  await cargarReporte();

  async function cargarReporte() {
    try {
      const response = await fetch('/api/ganado', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (response.status === 401) {
        Auth.logout();
        return;
      }

      const result = await response.json();

      if (result.success) {
        renderReporte(result.data);
      } else {
        document.getElementById('tableBody').innerHTML =
          '<tr><td colspan="10" class="no-data"><i class="fas fa-exclamation-circle"></i><p>Error al cargar el reporte</p></td></tr>';
      }
    } catch (err) {
      console.error('Error al cargar reporte:', err);
      document.getElementById('tableBody').innerHTML =
        '<tr><td colspan="10" class="no-data"><i class="fas fa-exclamation-circle"></i><p>Error de conexión</p></td></tr>';
    }
  }

  function renderReporte(data) {
    const tbody = document.getElementById('tableBody');
    const totalSpan = document.getElementById('totalRegistros');

    totalSpan.textContent = 'Total: ' + data.length + ' registro' + (data.length !== 1 ? 's' : '');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data"><i class="fas fa-inbox"></i><p>No hay registros de ganado</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(function (item) {
      const tr = document.createElement('tr');

      let badgeClass = 'badge-bueno';
      if (item.estado_sanitario === 'Regular') badgeClass = 'badge-regular';
      if (item.estado_sanitario === 'Crítico') badgeClass = 'badge-critico';

      const fechaNacimiento = item.fecha_nacimiento
        ? new Date(item.fecha_nacimiento).toLocaleDateString('es-DO')
        : '-';

      const fechaRegistro = item.fecha_registro
        ? new Date(item.fecha_registro).toLocaleDateString('es-DO') + ' ' + new Date(item.fecha_registro).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
        : '-';

      tr.innerHTML =
        '<td>' + item.id + '</td>' +
        '<td><strong>' + escapeHtml(item.arete) + '</strong></td>' +
        '<td>' + escapeHtml(item.nombre) + '</td>' +
        '<td>' + escapeHtml(item.raza_nombre || '-') + '</td>' +
        '<td>' + item.sexo + '</td>' +
        '<td>' + fechaNacimiento + '</td>' +
        '<td>' + (item.peso_kg ? parseFloat(item.peso_kg).toFixed(2) : '-') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + item.estado_sanitario + '</span></td>' +
        '<td>' + escapeHtml(item.ubicacion || '-') + '</td>' +
        '<td>' + fechaRegistro + '</td>';

      tbody.appendChild(tr);
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  document.getElementById('btnLogout').addEventListener('click', function () {
    Auth.logout();
  });
});
