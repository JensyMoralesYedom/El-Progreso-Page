/* ========================================
   REPORTES.JS - Visualización y exportación de reportes
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  let currentUser = null;
  let allData = [];
  const token = Auth.getToken();

  if (!token) {
    window.location.href = 'login.html?redirect=reportes.html';
    return;
  }

  currentUser = await Auth.verificarAutenticacion();
  if (!currentUser) return;

  document.getElementById('userName').textContent = currentUser.nombre;
  const roleBadge = document.getElementById('userRole');
  roleBadge.textContent = currentUser.rol === 'admin' ? 'Admin' : 'Invitado';
  roleBadge.className = 'role-badge ' + currentUser.rol;

  await Promise.all([cargarRazas(), cargarReporte()]);

  document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroSexo').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroRaza').addEventListener('change', aplicarFiltros);
  document.getElementById('btnClearFilters').addEventListener('click', limpiarFiltros);
  document.getElementById('btnExportPDF').addEventListener('click', exportarPDF);
  document.getElementById('btnExportExcel').addEventListener('click', exportarExcel);

  async function cargarRazas() {
    try {
      const response = await fetch('/api/ganado/razas/lista', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        const select = document.getElementById('filtroRaza');
        result.data.forEach(function (raza) {
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
        allData = result.data;
        renderReporte(allData);
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

  function aplicarFiltros() {
    const estado = document.getElementById('filtroEstado').value;
    const sexo = document.getElementById('filtroSexo').value;
    const razaId = document.getElementById('filtroRaza').value;

    let filtered = allData.filter(function (item) {
      if (estado && item.estado_sanitario !== estado) return false;
      if (sexo && item.sexo !== sexo) return false;
      if (razaId && String(item.raza_id) !== razaId) return false;
      return true;
    });

    renderReporte(filtered);
  }

  function limpiarFiltros() {
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroSexo').value = '';
    document.getElementById('filtroRaza').value = '';
    renderReporte(allData);
  }

  function getFilteredData() {
    const estado = document.getElementById('filtroEstado').value;
    const sexo = document.getElementById('filtroSexo').value;
    const razaId = document.getElementById('filtroRaza').value;

    if (!estado && !sexo && !razaId) return allData;

    return allData.filter(function (item) {
      if (estado && item.estado_sanitario !== estado) return false;
      if (sexo && item.sexo !== sexo) return false;
      if (razaId && String(item.raza_id) !== razaId) return false;
      return true;
    });
  }

  function renderReporte(data) {
    const tbody = document.getElementById('tableBody');
    const totalSpan = document.getElementById('totalRegistros');

    totalSpan.textContent = 'Total: ' + data.length + ' registro' + (data.length !== 1 ? 's' : '');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data"><i class="fas fa-inbox"></i><p>No hay registros que coincidan con los filtros</p></td></tr>';
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

  function getFilterDescription() {
    const parts = [];
    const estado = document.getElementById('filtroEstado').value;
    const sexo = document.getElementById('filtroSexo').value;
    const razaId = document.getElementById('filtroRaza').value;

    if (estado) parts.push('Estado: ' + estado);
    if (sexo) parts.push('Sexo: ' + sexo);
    if (razaId) {
      const select = document.getElementById('filtroRaza');
      const text = select.options[select.selectedIndex].text;
      parts.push('Raza: ' + text);
    }

    return parts.length > 0 ? 'Filtros: ' + parts.join(' | ') : 'Sin filtros aplicados';
  }

  function getFormattedDate() {
    const now = new Date();
    return now.toLocaleDateString('es-DO') + ' ' + now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
  }

  function exportarPDF() {
    const data = getFilteredData();
    if (data.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setTextColor(15, 61, 43);
    doc.text('Finca Ganadera El Progreso', 14, 15);
    doc.setFontSize(12);
    doc.text('Reporte de Ganado', 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Fecha: ' + getFormattedDate(), 14, 28);
    doc.text(getFilterDescription(), 14, 33);
    doc.text('Total: ' + data.length + ' registro' + (data.length !== 1 ? 's' : ''), 14, 38);

    const tableData = data.map(function (item) {
      return [
        item.id,
        item.arete,
        item.nombre,
        item.raza_nombre || '-',
        item.sexo,
        item.fecha_nacimiento ? new Date(item.fecha_nacimiento).toLocaleDateString('es-DO') : '-',
        item.peso_kg ? parseFloat(item.peso_kg).toFixed(2) : '-',
        item.estado_sanitario,
        item.ubicacion || '-',
        item.fecha_registro ? new Date(item.fecha_registro).toLocaleDateString('es-DO') : '-'
      ];
    });

    doc.autoTable({
      startY: 43,
      head: [['ID', 'Arete', 'Nombre', 'Raza', 'Sexo', 'Fecha Nac.', 'Peso (kg)', 'Estado', 'Ubicación', 'Fecha Registro']],
      body: tableData,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [28, 42, 30]
      },
      headStyles: {
        fillColor: [15, 61, 43],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [250, 250, 245]
      },
      columnStyles: {
        0: { cellWidth: 12 },
        7: { cellWidth: 20 }
      }
    });

    doc.save('Reporte_Ganado_' + new Date().toISOString().slice(0, 10) + '.pdf');
  }

  function exportarExcel() {
    const data = getFilteredData();
    if (data.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const wsData = [
      ['Finca Ganadera El Progreso'],
      ['Reporte de Ganado'],
      ['Fecha: ' + getFormattedDate()],
      [getFilterDescription()],
      ['Total: ' + data.length + ' registro' + (data.length !== 1 ? 's' : '')],
      [],
      ['ID', 'Arete', 'Nombre', 'Raza', 'Sexo', 'Fecha Nacimiento', 'Peso (kg)', 'Estado Sanitario', 'Ubicación', 'Fecha Registro']
    ];

    data.forEach(function (item) {
      wsData.push([
        item.id,
        item.arete,
        item.nombre,
        item.raza_nombre || '-',
        item.sexo,
        item.fecha_nacimiento ? new Date(item.fecha_nacimiento).toLocaleDateString('es-DO') : '-',
        item.peso_kg ? parseFloat(item.peso_kg).toFixed(2) : '-',
        item.estado_sanitario,
        item.ubicacion || '-',
        item.fecha_registro ? new Date(item.fecha_registro).toLocaleDateString('es-DO') + ' ' + new Date(item.fecha_registro).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '-'
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 6 },  { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 8 },  { wch: 14 }, { wch: 10 }, { wch: 16 },
      { wch: 16 }, { wch: 18 }
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Ganado');
    XLSX.writeFile(wb, 'Reporte_Ganado_' + new Date().toISOString().slice(0, 10) + '.xlsx');
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
