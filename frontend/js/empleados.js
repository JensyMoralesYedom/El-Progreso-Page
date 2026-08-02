/* ========================================
   EMPLEADOS.JS - Empleados y tareas
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('empleados');
  if (!user) return;

  const isAdmin = user.rol === 'admin';
  const isTrabajador = user.rol === 'trabajador';
  const puedeLeerEmpleados = ['admin', 'veterinario', 'invitado'].includes(user.rol);

  let empleadosData = [];
  let tareasData = [];
  let deleteId = null;
  let deleteType = '';

  if (!isAdmin && !isTrabajador) {
    document.getElementById('readonlyBanner').style.display = 'flex';
  }

  if (!isAdmin && isTrabajador) {
    document.querySelector('.tab[data-tab="empleados"]').style.display = 'none';
    document.getElementById('btnNewTarea').style.display = 'flex';
    document.getElementById('colAccionesTarea').style.display = '';
  }

  if (isAdmin) {
    document.getElementById('btnNewEmpleado').style.display = 'flex';
    document.getElementById('colAcciones').style.display = '';
    document.getElementById('btnNewTarea').style.display = 'flex';
    document.getElementById('colAccionesTarea').style.display = '';
  }

  await Promise.all([cargarEmpleados(), cargarTareas()]);

  // ============ TABS ============
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (tab.style.display === 'none') return;
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ============ CARGA DE DATOS ============
  async function cargarEmpleados() {
    if (!puedeLeerEmpleados) return;
    try {
      const response = await fetch('/api/empleados', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 403) return;
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        empleadosData = result.data;
        renderEmpleados();
        poblarSelectEmpleados();
      }
    } catch (err) {
      console.error('Error al cargar empleados:', err);
      Shell.showNotification('Error al cargar los empleados', 'error');
    }
  }

  async function cargarTareas() {
    try {
      const response = await fetch('/api/empleados/tareas', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        tareasData = result.data;
        renderTareas();
      }
    } catch (err) {
      console.error('Error al cargar tareas:', err);
      Shell.showNotification('Error al cargar las tareas', 'error');
    }
  }

  function poblarSelectEmpleados() {
    const select = document.getElementById('tarEmpleado');
    select.innerHTML = '<option value="">Sin asignar</option>';
    empleadosData.filter(function (e) { return e.estado === 'Activo'; }).forEach(function (e) {
      const option = document.createElement('option');
      option.value = e.id;
      option.textContent = e.nombre;
      select.appendChild(option);
    });
  }

  // ============ TABLA EMPLEADOS ============
  function renderEmpleados() {
    const tbody = document.getElementById('empleadoBody');

    if (!puedeLeerEmpleados) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-data"><i class="fas fa-lock"></i><p>Sin acceso a este módulo</p></td></tr>';
      return;
    }

    if (empleadosData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-data"><i class="fas fa-inbox"></i><p>No hay empleados registrados</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    empleadosData.forEach(function (e) {
      const badge = e.estado === 'Activo'
        ? '<span class="badge badge-bueno">Activo</span>'
        : '<span class="badge badge-critico">Inactivo</span>';

      let acciones = '';
      if (isAdmin) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + e.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + e.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + e.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(e.nombre) + '</strong></td>' +
        '<td>' + Shell.escapeHtml(e.cargo || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(e.telefono || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(e.email || '-') + '</td>' +
        '<td>' + formatearFecha(e.fecha_ingreso) + '</td>' +
        '<td>' + moneda(e.salario_base) + '</td>' +
        '<td>' + badge + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (isAdmin) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarEmpleado(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'empleado';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ TABLA TAREAS ============
  function renderTareas() {
    const tbody = document.getElementById('tareaBody');

    if (tareasData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fas fa-inbox"></i><p>Sin tareas asignadas</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    tareasData.forEach(function (t) {
      const prioClass = t.prioridad === 'Alta' ? 'badge-critico' : (t.prioridad === 'Baja' ? 'badge-bueno' : 'badge-wheat');
      const estClass = t.estado === 'Completada' ? 'badge-bueno'
        : (t.estado === 'En progreso' ? 'badge-wheat'
        : (t.estado === 'Cancelada' ? 'badge-critico' : 'badge-regular'));

      let acciones = '';
      if (isAdmin || isTrabajador) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + t.id + '" title="Editar"><i class="fas fa-edit"></i></button>';
        if (isAdmin) {
          acciones += '<button class="btn-action btn-delete" data-id="' + t.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>';
        }
        acciones += '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + t.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(t.titulo) + '</strong></td>' +
        '<td>' + Shell.escapeHtml(t.empleado_nombre || 'Sin asignar') + '</td>' +
        '<td>' + formatearFecha(t.fecha_vencimiento) + '</td>' +
        '<td><span class="badge ' + prioClass + '">' + t.prioridad + '</span></td>' +
        '<td><span class="badge ' + estClass + '">' + t.estado + '</span></td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (isAdmin || isTrabajador) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarTarea(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'tarea';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ MODAL EMPLEADO ============
  document.getElementById('btnNewEmpleado').addEventListener('click', function () {
    document.getElementById('empleadoId').value = '';
    document.getElementById('empleadoTitle').textContent = 'Nuevo Empleado';
    document.getElementById('empleadoForm').reset();
    document.getElementById('empEstado').value = 'Activo';
    document.getElementById('empleadoModal').classList.add('active');
  });

  document.getElementById('empleadoClose').addEventListener('click', function () {
    document.getElementById('empleadoModal').classList.remove('active');
  });

  document.getElementById('empleadoCancel').addEventListener('click', function () {
    document.getElementById('empleadoModal').classList.remove('active');
  });

  document.getElementById('empleadoModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarEmpleado(id) {
    const e = empleadosData.find(function (x) { return x.id === id; });
    if (!e) return;

    document.getElementById('empleadoId').value = e.id;
    document.getElementById('empleadoTitle').textContent = 'Editar Empleado';
    document.getElementById('empleadoForm').reset();
    document.getElementById('empNombre').value = e.nombre;
    document.getElementById('empCargo').value = e.cargo || '';
    document.getElementById('empTelefono').value = e.telefono || '';
    document.getElementById('empEmail').value = e.email || '';
    document.getElementById('empFechaIngreso').value = e.fecha_ingreso ? e.fecha_ingreso.split('T')[0] : '';
    document.getElementById('empSalario').value = e.salario_base;
    document.getElementById('empEstado').value = e.estado;
    document.getElementById('empleadoModal').classList.add('active');
  }

  document.getElementById('empleadoSave').addEventListener('click', async function () {
    const id = document.getElementById('empleadoId').value;
    const isEdit = id !== '';

    const nombre = document.getElementById('empNombre').value.trim();
    const cargo = document.getElementById('empCargo').value.trim();
    const telefono = document.getElementById('empTelefono').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    const fecha_ingreso = document.getElementById('empFechaIngreso').value;
    const salario_base = document.getElementById('empSalario').value;
    const estado = document.getElementById('empEstado').value;

    if (!nombre) {
      Shell.showNotification('El nombre es obligatorio', 'error');
      return;
    }

    const body = {
      nombre: nombre,
      cargo: cargo || null,
      telefono: telefono || null,
      email: email || null,
      fecha_ingreso: fecha_ingreso || null,
      salario_base: salario_base !== '' ? parseFloat(salario_base) : 0,
      estado: estado
    };

    const btn = document.getElementById('empleadoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/empleados';
      let method = 'POST';
      if (isEdit) {
        url = '/api/empleados/' + id;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification(isEdit ? 'Empleado actualizado' : 'Empleado creado', 'success');
        document.getElementById('empleadoModal').classList.remove('active');
        await Promise.all([cargarEmpleados(), cargarTareas()]);
      } else {
        Shell.showNotification(result.error || 'Error al guardar el empleado', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ MODAL TAREA ============
  document.getElementById('btnNewTarea').addEventListener('click', function () {
    document.getElementById('tareaId').value = '';
    document.getElementById('tareaTitle').textContent = 'Nueva Tarea';
    document.getElementById('tareaForm').reset();
    document.getElementById('tarAsignacion').value = new Date().toISOString().split('T')[0];
    document.getElementById('tarPrioridad').value = 'Media';
    document.getElementById('tarEstado').value = 'Pendiente';

    if (isTrabajador) {
      document.getElementById('tarEmpleado').parentElement.style.display = 'none';
    } else {
      document.getElementById('tarEmpleado').parentElement.style.display = '';
    }

    document.getElementById('tareaModal').classList.add('active');
  });

  document.getElementById('tareaClose').addEventListener('click', function () {
    document.getElementById('tareaModal').classList.remove('active');
  });

  document.getElementById('tareaCancel').addEventListener('click', function () {
    document.getElementById('tareaModal').classList.remove('active');
  });

  document.getElementById('tareaModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarTarea(id) {
    const t = tareasData.find(function (x) { return x.id === id; });
    if (!t) return;

    document.getElementById('tareaId').value = t.id;
    document.getElementById('tareaTitle').textContent = isTrabajador ? 'Actualizar Estado' : 'Editar Tarea';
    document.getElementById('tareaForm').reset();
    document.getElementById('tarTitulo').value = t.titulo;
    document.getElementById('tarDescripcion').value = t.descripcion || '';
    document.getElementById('tarEmpleado').value = t.empleado_id || '';
    document.getElementById('tarPrioridad').value = t.prioridad;
    document.getElementById('tarAsignacion').value = t.fecha_asignacion ? t.fecha_asignacion.split('T')[0] : '';
    document.getElementById('tarVencimiento').value = t.fecha_vencimiento ? t.fecha_vencimiento.split('T')[0] : '';
    document.getElementById('tarEstado').value = t.estado;

    if (isTrabajador) {
      document.getElementById('tarTitulo').disabled = true;
      document.getElementById('tarDescripcion').disabled = true;
      document.getElementById('tarEmpleado').parentElement.style.display = 'none';
      document.getElementById('tarPrioridad').disabled = true;
      document.getElementById('tarAsignacion').disabled = true;
      document.getElementById('tarVencimiento').disabled = true;
    } else {
      document.getElementById('tarTitulo').disabled = false;
      document.getElementById('tarDescripcion').disabled = false;
      document.getElementById('tarEmpleado').parentElement.style.display = '';
      document.getElementById('tarPrioridad').disabled = false;
      document.getElementById('tarAsignacion').disabled = false;
      document.getElementById('tarVencimiento').disabled = false;
    }

    document.getElementById('tareaModal').classList.add('active');
  }

  document.getElementById('tareaSave').addEventListener('click', async function () {
    const id = document.getElementById('tareaId').value;
    const isEdit = id !== '';

    const titulo = document.getElementById('tarTitulo').value.trim();
    const descripcion = document.getElementById('tarDescripcion').value.trim();
    const empleado_id = document.getElementById('tarEmpleado').value;
    const prioridad = document.getElementById('tarPrioridad').value;
    const fecha_asignacion = document.getElementById('tarAsignacion').value;
    const fecha_vencimiento = document.getElementById('tarVencimiento').value;
    const estado = document.getElementById('tarEstado').value;

    if (!titulo && !isEdit) {
      Shell.showNotification('El título es obligatorio', 'error');
      return;
    }

    const body = {};
    if (isTrabajador) {
      body.estado = estado;
    } else {
      body.titulo = titulo;
      body.descripcion = descripcion || null;
      body.empleado_id = empleado_id ? parseInt(empleado_id) : null;
      body.prioridad = prioridad;
      body.fecha_asignacion = fecha_asignacion || null;
      body.fecha_vencimiento = fecha_vencimiento || null;
      body.estado = estado;
    }

    const btn = document.getElementById('tareaSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/empleados/tareas';
      let method = 'POST';
      if (isEdit) {
        url = '/api/empleados/tareas/' + id;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification(isEdit ? 'Tarea actualizada' : 'Tarea creada', 'success');
        document.getElementById('tareaModal').classList.remove('active');
        await cargarTareas();
      } else {
        Shell.showNotification(result.error || 'Error al guardar la tarea', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ ELIMINAR ============
  function confirmarEliminar(id) {
    deleteId = id;
    const base = deleteType === 'empleado' ? 'este empleado' : 'esta tarea';
    document.getElementById('confirmSubtext').textContent = 'Se eliminará ' + base + ' de forma permanente';
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

    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled = true;
    btn.textContent = 'Eliminando...';

    try {
      const url = deleteType === 'empleado'
        ? '/api/empleados/' + deleteId
        : '/api/empleados/tareas/' + deleteId;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Registro eliminado', 'success');
        document.getElementById('confirmModal').classList.remove('active');
        if (deleteType === 'empleado') {
          await Promise.all([cargarEmpleados(), cargarTareas()]);
        } else {
          await cargarTareas();
        }
      } else {
        Shell.showNotification(result.error || 'Error al eliminar el registro', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Eliminar';
      deleteId = null;
    }
  });

  // ============ HELPERS ============
  function formatearFecha(f) {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-DO');
  }

  function moneda(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 });
  }
});
