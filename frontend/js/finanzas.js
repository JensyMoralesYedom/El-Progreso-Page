/* ========================================
   FINANZAS.JS - Movimientos financieros, pagos y saldo
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('finanzas');
  if (!user) return;

  if (!['admin', 'invitado'].includes(user.rol)) {
    document.getElementById('noAccessBanner').style.display = 'flex';
    return;
  }

  const puedeEditar = user.rol === 'admin';

  let movimientosData = [];
  let pagosData = [];
  let empleadosData = [];
  let deleteId = null;
  let deleteType = '';

  document.getElementById('finanzasContent').style.display = 'block';

  if (!puedeEditar) {
    document.getElementById('readonlyBanner').style.display = 'flex';
  } else {
    document.getElementById('btnNewMovimiento').style.display = 'flex';
    document.getElementById('colAcciones').style.display = '';
    document.getElementById('btnNewPago').style.display = 'flex';
    document.getElementById('colAccionesPago').style.display = '';
  }

  await Promise.all([cargarMovimientos(), cargarPagos(), cargarEmpleados(), cargarSaldo()]);

  // ============ TABS ============
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ============ CARGA DE DATOS ============
  async function cargarMovimientos() {
    try {
      const response = await fetch('/api/finanzas/movimientos', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        movimientosData = result.data;
        renderMovimientos();
      }
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    }
  }

  async function cargarPagos() {
    try {
      const response = await fetch('/api/finanzas/pagos', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        pagosData = result.data;
        renderPagos();
      }
    } catch (err) {
      console.error('Error al cargar pagos:', err);
    }
  }

  async function cargarEmpleados() {
    if (!puedeEditar) return;
    try {
      const response = await fetch('/api/empleados', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        empleadosData = result.data;
        const select = document.getElementById('pagoEmpleado');
        select.innerHTML = '<option value="">Seleccione un empleado</option>';
        empleadosData.forEach(function (e) {
          const option = document.createElement('option');
          option.value = e.id;
          option.textContent = e.nombre + (e.cargo ? ' - ' + e.cargo : '');
          select.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error al cargar empleados:', err);
    }
  }

  async function cargarSaldo() {
    try {
      const response = await fetch('/api/finanzas/saldo', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        renderSaldo(result.data);
      }
    } catch (err) {
      console.error('Error al cargar saldo:', err);
    }
  }

  // ============ TABLA MOVIMIENTOS ============
  function renderMovimientos() {
    const tbody = document.getElementById('finBody');

    if (movimientosData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-data"><i class="fas fa-inbox"></i><p>Sin movimientos financieros</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    movimientosData.forEach(function (m) {
      const badge = m.tipo === 'Ingreso'
        ? '<span class="badge badge-bueno">Ingreso</span>'
        : '<span class="badge badge-critico">Egreso</span>';

      let acciones = '';
      if (puedeEditar) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + m.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + m.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + m.id + '</td>' +
        '<td>' + formatearFecha(m.fecha) + '</td>' +
        '<td>' + badge + '</td>' +
        '<td><strong>' + Shell.escapeHtml(m.categoria) + '</strong></td>' +
        '<td>' + Shell.escapeHtml(m.descripcion || '-') + '</td>' +
        '<td>' + moneda(m.monto) + '</td>' +
        '<td>' + Shell.escapeHtml(m.metodo_pago || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(m.responsable_nombre || '-') + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (puedeEditar) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarMovimiento(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'movimiento';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ TABLA PAGOS ============
  function renderPagos() {
    const tbody = document.getElementById('pagoBody');

    if (pagosData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-data"><i class="fas fa-inbox"></i><p>Sin pagos registrados</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    pagosData.forEach(function (p) {
      let acciones = '';
      if (puedeEditar) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + p.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + p.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + p.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(p.empleado_nombre || '-') + '</strong></td>' +
        '<td>' + Shell.escapeHtml(p.periodo) + '</td>' +
        '<td>' + moneda(p.salario_bruto) + '</td>' +
        '<td>' + moneda(p.deducciones) + '</td>' +
        '<td><strong>' + moneda(p.salario_neto) + '</strong></td>' +
        '<td>' + formatearFecha(p.fecha_pago) + '</td>' +
        '<td>' + Shell.escapeHtml(p.metodo_pago || '-') + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (puedeEditar) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarPago(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'pago';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ SALDO ============
  function renderSaldo(data) {
    document.getElementById('saldoIngresos').textContent = moneda(data.ingresos);
    document.getElementById('saldoEgresos').textContent = moneda(data.egresos);
    document.getElementById('saldoTotal').textContent = moneda(data.saldo);

    const tbody = document.getElementById('saldoBody');
    if (!data.por_categoria || data.por_categoria.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="no-data"><i class="fas fa-inbox"></i><p>Sin movimientos por categoría</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.por_categoria.forEach(function (c) {
      const badge = c.tipo === 'Ingreso'
        ? '<span class="badge badge-bueno">' + c.tipo + '</span>'
        : '<span class="badge badge-critico">' + c.tipo + '</span>';
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + Shell.escapeHtml(c.categoria) + '</strong></td>' +
        '<td>' + badge + '</td>' +
        '<td>' + moneda(c.total) + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ============ MODAL MOVIMIENTO ============
  document.getElementById('btnNewMovimiento').addEventListener('click', function () {
    document.getElementById('movimientoId').value = '';
    document.getElementById('movimientoTitle').textContent = 'Nuevo Movimiento';
    document.getElementById('movimientoForm').reset();
    document.getElementById('finFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('movimientoModal').classList.add('active');
  });

  document.getElementById('movimientoClose').addEventListener('click', function () {
    document.getElementById('movimientoModal').classList.remove('active');
  });

  document.getElementById('movimientoCancel').addEventListener('click', function () {
    document.getElementById('movimientoModal').classList.remove('active');
  });

  document.getElementById('movimientoModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarMovimiento(id) {
    const m = movimientosData.find(function (x) { return x.id === id; });
    if (!m) return;

    document.getElementById('movimientoId').value = m.id;
    document.getElementById('movimientoTitle').textContent = 'Editar Movimiento';
    document.getElementById('movimientoForm').reset();
    document.getElementById('finTipo').value = m.tipo;
    document.getElementById('finFecha').value = m.fecha ? m.fecha.split('T')[0] : '';
    document.getElementById('finCategoria').value = m.categoria;
    document.getElementById('finMonto').value = m.monto;
    document.getElementById('finDescripcion').value = m.descripcion || '';
    document.getElementById('finMetodo').value = m.metodo_pago || '';
    document.getElementById('movimientoModal').classList.add('active');
  }

  document.getElementById('movimientoSave').addEventListener('click', async function () {
    const id = document.getElementById('movimientoId').value;
    const isEdit = id !== '';

    const fecha = document.getElementById('finFecha').value;
    const tipo = document.getElementById('finTipo').value;
    const categoria = document.getElementById('finCategoria').value.trim();
    const descripcion = document.getElementById('finDescripcion').value.trim();
    const monto = document.getElementById('finMonto').value;
    const metodo_pago = document.getElementById('finMetodo').value;

    if (!tipo || !categoria || monto === '') {
      Shell.showNotification('El tipo, la categoría y el monto son obligatorios', 'error');
      return;
    }

    const body = {
      fecha: fecha || null,
      tipo: tipo,
      categoria: categoria,
      descripcion: descripcion || null,
      monto: parseFloat(monto),
      metodo_pago: metodo_pago || null
    };

    const btn = document.getElementById('movimientoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/finanzas/movimientos';
      let method = 'POST';
      if (isEdit) {
        url = '/api/finanzas/movimientos/' + id;
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
        Shell.showNotification(isEdit ? 'Movimiento actualizado' : 'Movimiento registrado', 'success');
        document.getElementById('movimientoModal').classList.remove('active');
        await Promise.all([cargarMovimientos(), cargarSaldo()]);
      } else {
        Shell.showNotification(result.error || 'Error al guardar el movimiento', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ MODAL PAGO ============
  document.getElementById('btnNewPago').addEventListener('click', function () {
    document.getElementById('pagoId').value = '';
    document.getElementById('pagoTitle').textContent = 'Nuevo Pago';
    document.getElementById('pagoForm').reset();
    document.getElementById('pagoFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('pagoModal').classList.add('active');
  });

  document.getElementById('pagoClose').addEventListener('click', function () {
    document.getElementById('pagoModal').classList.remove('active');
  });

  document.getElementById('pagoCancel').addEventListener('click', function () {
    document.getElementById('pagoModal').classList.remove('active');
  });

  document.getElementById('pagoModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarPago(id) {
    const p = pagosData.find(function (x) { return x.id === id; });
    if (!p) return;

    document.getElementById('pagoId').value = p.id;
    document.getElementById('pagoTitle').textContent = 'Editar Pago';
    document.getElementById('pagoForm').reset();
    document.getElementById('pagoEmpleado').value = p.empleado_id;
    document.getElementById('pagoPeriodo').value = p.periodo;
    document.getElementById('pagoFecha').value = p.fecha_pago ? p.fecha_pago.split('T')[0] : '';
    document.getElementById('pagoBruto').value = p.salario_bruto;
    document.getElementById('pagoDeducciones').value = p.deducciones;
    document.getElementById('pagoNeto').value = p.salario_neto;
    document.getElementById('pagoMetodo').value = p.metodo_pago || '';
    document.getElementById('pagoObs').value = p.observaciones || '';
    document.getElementById('pagoModal').classList.add('active');
  }

  document.getElementById('pagoSave').addEventListener('click', async function () {
    const id = document.getElementById('pagoId').value;
    const isEdit = id !== '';

    const empleado_id = document.getElementById('pagoEmpleado').value;
    const periodo = document.getElementById('pagoPeriodo').value.trim();
    const fecha_pago = document.getElementById('pagoFecha').value;
    const salario_bruto = document.getElementById('pagoBruto').value;
    const deducciones = document.getElementById('pagoDeducciones').value;
    const salario_neto = document.getElementById('pagoNeto').value;
    const metodo_pago = document.getElementById('pagoMetodo').value;
    const observaciones = document.getElementById('pagoObs').value.trim();

    if (!empleado_id || !periodo || salario_bruto === '' || salario_neto === '') {
      Shell.showNotification('El empleado, el periodo, el bruto y el neto son obligatorios', 'error');
      return;
    }

    const body = {
      empleado_id: parseInt(empleado_id),
      periodo: periodo,
      salario_bruto: parseFloat(salario_bruto),
      deducciones: deducciones !== '' ? parseFloat(deducciones) : 0,
      salario_neto: parseFloat(salario_neto),
      fecha_pago: fecha_pago || null,
      metodo_pago: metodo_pago || null,
      observaciones: observaciones || null
    };

    const btn = document.getElementById('pagoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/finanzas/pagos';
      let method = 'POST';
      if (isEdit) {
        url = '/api/finanzas/pagos/' + id;
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
        Shell.showNotification(isEdit ? 'Pago actualizado' : 'Pago registrado', 'success');
        document.getElementById('pagoModal').classList.remove('active');
        await cargarPagos();
      } else {
        Shell.showNotification(result.error || 'Error al guardar el pago', 'error');
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
    const base = deleteType === 'pago' ? 'este pago' : 'este movimiento';
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
      const url = deleteType === 'pago'
        ? '/api/finanzas/pagos/' + deleteId
        : '/api/finanzas/movimientos/' + deleteId;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Registro eliminado', 'success');
        document.getElementById('confirmModal').classList.remove('active');
        if (deleteType === 'pago') {
          await cargarPagos();
        } else {
          await Promise.all([cargarMovimientos(), cargarSaldo()]);
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
