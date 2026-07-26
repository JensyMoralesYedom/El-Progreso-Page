/* ========================================
   GESTION.JS - CRUD de Ganado
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  let currentUser = null;
  let ganadoData = [];
  let razasData = [];
  let deleteId = null;

  const token = Auth.getToken();
  if (!token) {
    window.location.href = 'login.html?redirect=gestion.html';
    return;
  }

  currentUser = await Auth.verificarAutenticacion();
  if (!currentUser) return;

  initUI();

  async function initUI() {
    document.getElementById('userName').textContent = currentUser.nombre;
    const roleBadge = document.getElementById('userRole');
    roleBadge.textContent = currentUser.rol === 'admin' ? 'Admin' : 'Invitado';
    roleBadge.className = 'role-badge ' + currentUser.rol;

    if (currentUser.rol === 'invitado') {
      document.getElementById('readonlyBanner').style.display = 'flex';
      document.getElementById('btnNew').style.display = 'none';
      document.getElementById('colAcciones').style.display = 'none';
    } else {
      document.getElementById('btnNew').style.display = 'flex';
      document.getElementById('colAcciones').style.display = '';
    }

    await Promise.all([cargarRazas(), cargarGanado()]);
  }

  async function cargarRazas() {
    try {
      const response = await fetch('/api/ganado/razas/lista', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (response.status === 401) {
        Auth.logout();
        return;
      }

      const result = await response.json();
      if (result.success) {
        razasData = result.data;
        const select = document.getElementById('raza');
        select.innerHTML = '<option value="">Seleccione una raza</option>';
        razasData.forEach(function (raza) {
          const option = document.createElement('option');
          option.value = raza.id;
          option.textContent = raza.nombre;
          select.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error al cargar razas:', err);
    }
  }

  async function cargarGanado() {
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
        ganadoData = result.data;
        renderTable(ganadoData);
      }
    } catch (err) {
      console.error('Error al cargar ganado:', err);
      showNotification('Error al cargar los registros', 'error');
    }
  }

  function renderTable(data) {
    const tbody = document.getElementById('tableBody');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-data"><i class="fas fa-inbox"></i><p>No hay registros de ganado</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(function (item) {
      const tr = document.createElement('tr');

      let badgeClass = 'badge-bueno';
      if (item.estado_sanitario === 'Regular') badgeClass = 'badge-regular';
      if (item.estado_sanitario === 'Crítico') badgeClass = 'badge-critico';

      let actionsHtml = '';
      if (currentUser.rol === 'admin') {
        actionsHtml = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + item.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + item.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      tr.innerHTML =
        '<td>' + item.id + '</td>' +
        '<td><strong>' + escapeHtml(item.arete) + '</strong></td>' +
        '<td>' + escapeHtml(item.nombre) + '</td>' +
        '<td>' + escapeHtml(item.raza_nombre || '-') + '</td>' +
        '<td>' + item.sexo + '</td>' +
        '<td>' + (item.peso_kg ? parseFloat(item.peso_kg).toFixed(2) : '-') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + item.estado_sanitario + '</span></td>' +
        '<td>' + escapeHtml(item.ubicacion || '-') + '</td>' +
        actionsHtml;

      tbody.appendChild(tr);
    });

    if (currentUser.rol === 'admin') {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarRegistro(parseInt(this.getAttribute('data-id')));
        });
      });

      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  document.getElementById('btnNew').addEventListener('click', function () {
    document.getElementById('registroId').value = '';
    document.getElementById('modalTitle').textContent = 'Nuevo Registro';
    document.getElementById('ganadoForm').reset();
    document.getElementById('formModal').classList.add('active');
  });

  document.getElementById('modalClose').addEventListener('click', function () {
    document.getElementById('formModal').classList.remove('active');
  });

  document.getElementById('btnCancel').addEventListener('click', function () {
    document.getElementById('formModal').classList.remove('active');
  });

  document.getElementById('formModal').addEventListener('click', function (e) {
    if (e.target === this) {
      this.classList.remove('active');
    }
  });

  function editarRegistro(id) {
    const item = ganadoData.find(function (g) { return g.id === id; });
    if (!item) return;

    document.getElementById('registroId').value = item.id;
    document.getElementById('modalTitle').textContent = 'Editar Registro';
    document.getElementById('arete').value = item.arete;
    document.getElementById('nombre').value = item.nombre;
    document.getElementById('raza').value = item.raza_id;
    document.getElementById('sexo').value = item.sexo;
    document.getElementById('fechaNacimiento').value = item.fecha_nacimiento ? item.fecha_nacimiento.split('T')[0] : '';
    document.getElementById('peso').value = item.peso_kg || '';
    document.getElementById('estadoSanitario').value = item.estado_sanitario;
    document.getElementById('ubicacion').value = item.ubicacion || '';
    document.getElementById('formModal').classList.add('active');
  }

  document.getElementById('btnSave').addEventListener('click', async function () {
    const id = document.getElementById('registroId').value;
    const isEdit = id !== '';

    const arete = document.getElementById('arete').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const raza_id = document.getElementById('raza').value;
    const sexo = document.getElementById('sexo').value;
    const fecha_nacimiento = document.getElementById('fechaNacimiento').value;
    const peso_kg = document.getElementById('peso').value;
    const estado_sanitario = document.getElementById('estadoSanitario').value;
    const ubicacion = document.getElementById('ubicacion').value.trim();

    if (!arete || !nombre || !raza_id || !sexo || !estado_sanitario) {
      showNotification('Los campos marcados con * son obligatorios', 'error');
      return;
    }

    if (arete.length > 50) {
      showNotification('El arete no puede exceder 50 caracteres', 'error');
      return;
    }

    if (nombre.length > 100) {
      showNotification('El nombre no puede exceder 100 caracteres', 'error');
      return;
    }

    if (peso_kg && (isNaN(parseFloat(peso_kg)) || parseFloat(peso_kg) <= 0)) {
      showNotification('El peso debe ser un número positivo', 'error');
      return;
    }

    const body = {
      arete: arete,
      nombre: nombre,
      raza_id: parseInt(raza_id),
      sexo: sexo,
      fecha_nacimiento: fecha_nacimiento || null,
      peso_kg: peso_kg ? parseFloat(peso_kg) : null,
      estado_sanitario: estado_sanitario,
      ubicacion: ubicacion || null
    };

    const btnSave = document.getElementById('btnSave');
    btnSave.disabled = true;
    btnSave.textContent = 'Guardando...';

    try {
      let url = '/api/ganado';
      let method = 'POST';

      if (isEdit) {
        url = '/api/ganado/' + id;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        showNotification(isEdit ? 'Registro actualizado exitosamente' : 'Registro creado exitosamente', 'success');
        document.getElementById('formModal').classList.remove('active');
        await cargarGanado();
      } else {
        showNotification(result.error || 'Error al guardar el registro', 'error');
      }
    } catch (err) {
      showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Guardar';
    }
  });

  function confirmarEliminar(id) {
    const item = ganadoData.find(function (g) { return g.id === id; });
    if (!item) return;

    deleteId = id;
    document.getElementById('confirmSubtext').textContent = 'Se eliminará el registro "' + item.nombre + '" (' + item.arete + ')';
    document.getElementById('confirmModal').classList.add('active');
  }

  document.getElementById('btnConfirmCancel').addEventListener('click', function () {
    document.getElementById('confirmModal').classList.remove('active');
    deleteId = null;
  });

  document.getElementById('confirmModal').addEventListener('click', function (e) {
    if (e.target === this) {
      this.classList.remove('active');
      deleteId = null;
    }
  });

  document.getElementById('btnConfirmDelete').addEventListener('click', async function () {
    if (deleteId === null) return;

    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    btnConfirmDelete.disabled = true;
    btnConfirmDelete.textContent = 'Eliminando...';

    try {
      const response = await fetch('/api/ganado/' + deleteId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });

      const result = await response.json();

      if (result.success) {
        showNotification('Registro eliminado exitosamente', 'success');
        document.getElementById('confirmModal').classList.remove('active');
        await cargarGanado();
      } else {
        showNotification(result.error || 'Error al eliminar el registro', 'error');
      }
    } catch (err) {
      showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = 'Eliminar';
      deleteId = null;
    }
  });

  document.getElementById('btnLogout').addEventListener('click', function () {
    Auth.logout();
  });
});
