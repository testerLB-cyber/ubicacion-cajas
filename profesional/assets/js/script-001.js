let currentData = [];
    let rawTripsData = [];
    let pendingListData = [];
    let transitoListData = [];
    let globalDriversMap = {};

    window.addEventListener('DOMContentLoaded', () => {
      const hoy = new Date();
      const year = hoy.getFullYear();
      const month = String(hoy.getMonth() + 1).padStart(2, '0');
      const day = String(hoy.getDate()).padStart(2, '0');
      const hoyStr = `${year}-${month}-${day}`;

      document.getElementById('fechaDesde').value = hoyStr;
      document.getElementById('fechaHasta').value = hoyStr;
    });

    document.getElementById('excelInput').addEventListener('change', handleFile, false);
    document.getElementById('searchInput').addEventListener('input', filterTable);

    function handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;

      showStatus(`Procesando <strong>${file.name}</strong>...`);

      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawData || rawData.length === 0) {
            showStatus(`El archivo está vacío o no se pudo leer correctamente.`, 'error');
            return;
          }

          processData(rawData);
          showStatus(`Reporte procesado exitosamente (${rawData.length} registros analizados).`, 'success');
        } catch (err) {
          console.error(err);
          showStatus(`Error al procesar el archivo Excel. Asegúrate de subir un formato válido.`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }

    function showStatus(msg, type = 'info') {
      const statusBox = document.getElementById('statusMessage');
      const statusText = document.getElementById('statusText');
      statusBox.classList.remove('hidden', 'bg-blue-50', 'bg-emerald-50', 'bg-red-50', 'text-blue-900', 'text-emerald-900', 'text-red-900', 'border-blue-500', 'border-emerald-500', 'border-red-500');
      
      if (type === 'success') {
        statusBox.classList.add('bg-emerald-50', 'text-emerald-900', 'border-emerald-500');
      } else if (type === 'error') {
        statusBox.classList.add('bg-red-50', 'text-red-900', 'border-red-500');
      } else {
        statusBox.classList.add('bg-blue-50', 'text-blue-900', 'border-blue-500');
      }
      statusText.innerHTML = msg;
    }

    function findColumnValue(row, possibleNames) {
      const keys = Object.keys(row);
      for (let name of possibleNames) {
        const foundKey = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          return row[foundKey];
        }
      }
      return '';
    }

    function formatearSoloFecha(valorFecha) {
      if (!valorFecha) return 'N/A';

      if (valorFecha instanceof Date) {
        if (isNaN(valorFecha.getTime())) return 'N/A';
        const yyyy = valorFecha.getFullYear();
        const mm = String(valorFecha.getMonth() + 1).padStart(2, '0');
        const dd = String(valorFecha.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }

      const strVal = String(valorFecha).trim();
      if (!strVal || strVal === 'N/A' || strVal === 'NULL') return 'N/A';

      if (!isNaN(strVal) && Number(strVal) > 30000) {
        const d = new Date((Number(strVal) - (25567 + 2)) * 86400 * 1000);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      }

      let soloFechaStr = strVal.split('T')[0].split(' ')[0];
      return soloFechaStr || strVal;
    }

    function tieneSalidaRegistrada(valorFecha) {
      if (valorFecha === null || valorFecha === undefined) return false;
      const strVal = String(valorFecha).trim().toUpperCase();
      if (strVal === '' || strVal === 'N/A' || strVal === 'PENDIENTE' || strVal === 'NULL' || strVal === 'UNDEFINED' || strVal === 'SIN SALIDA') {
        return false;
      }
      return true;
    }

    function tieneLlegadaRegistrada(valorFecha) {
      if (valorFecha === null || valorFecha === undefined) return false;
      const strVal = String(valorFecha).trim().toUpperCase();
      if (strVal === '' || strVal === 'N/A' || strVal === 'PENDIENTE' || strVal === 'NULL' || strVal === 'UNDEFINED' || strVal === 'SIN LLEGADA') {
        return false;
      }
      return true;
    }

    function parsearFechaObjeto(valorFecha) {
      if (!valorFecha) return null;
      if (valorFecha instanceof Date) {
        return isNaN(valorFecha.getTime()) ? null : valorFecha;
      }

      const strVal = String(valorFecha).trim();
      if (!strVal || strVal === 'N/A' || strVal === 'NULL') return null;

      if (!isNaN(strVal) && Number(strVal) > 30000) {
        const d = new Date((Number(strVal) - (25567 + 2)) * 86400 * 1000);
        return isNaN(d.getTime()) ? null : d;
      }

      const match = strVal.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
      if (match) {
        let p1 = parseInt(match[1], 10);
        let p2 = parseInt(match[2], 10);
        let p3 = parseInt(match[3], 10);
        
        let d = p1 > 1000 ? new Date(p1, p2 - 1, p3) : new Date(p3, p2 - 1, p1);
        return isNaN(d.getTime()) ? null : d;
      }

      const parsed = Date.parse(strVal);
      if (!isNaN(parsed)) {
        return new Date(parsed);
      }

      return null;
    }

    function estaEnRangoDeFechas(valorFecha) {
      // El filtro del Dashboard se basa EXCLUSIVAMENTE en la Fecha de Salida.
      // Cuando "Solo salidas del día de la fecha final" está activo,
      // se ignora el rango Desde-Hasta y se toma únicamente Fecha Hasta.
      if (!tieneSalidaRegistrada(valorFecha)) return false;

      const fechaReg = parsearFechaObjeto(valorFecha);
      if (!fechaReg) return false;

      const desdeEl = document.getElementById('fechaDesde');
      const hastaEl = document.getElementById('fechaHasta');
      const soloFinalEl = document.getElementById('soloSalidasFechaFinal');

      const desdeVal = desdeEl ? desdeEl.value : '';
      const hastaVal = hastaEl ? hastaEl.value : '';
      const soloFinal = !!(soloFinalEl && soloFinalEl.checked);

      if (soloFinal) {
        if (!hastaVal) return true;
        const dRegTime = new Date(fechaReg.getFullYear(), fechaReg.getMonth(), fechaReg.getDate()).getTime();
        const dFinalTime = new Date(hastaVal + 'T00:00:00').getTime();
        return dRegTime === dFinalTime;
      }

      if (!desdeVal || !hastaVal) return true;

      const dRegTime = new Date(fechaReg.getFullYear(), fechaReg.getMonth(), fechaReg.getDate()).getTime();
      const dDesdeTime = new Date(desdeVal + 'T00:00:00').getTime();
      const dHastaTime = new Date(hastaVal + 'T00:00:00').getTime();

      return dRegTime >= dDesdeTime && dRegTime <= dHastaTime;
    }

    function getTextoFiltroFechas() {
      const desdeVal = document.getElementById('fechaDesde')?.value || '';
      const hastaVal = document.getElementById('fechaHasta')?.value || '';
      const soloFinal = !!document.getElementById('soloSalidasFechaFinal')?.checked;

      if (soloFinal) {
        return hastaVal ? `Solo salidas del ${hastaVal}` : 'Solo salidas de la fecha final';
      }
      return (desdeVal && hastaVal) ? `Salidas del ${desdeVal} al ${hastaVal}` : 'Rango de salidas';
    }

    function setTodayDateFilter() {
      const hoy = new Date();
      const year = hoy.getFullYear();
      const month = String(hoy.getMonth() + 1).padStart(2, '0');
      const day = String(hoy.getDate()).padStart(2, '0');
      const hoyStr = `${year}-${month}-${day}`;

      document.getElementById('fechaDesde').value = hoyStr;
      document.getElementById('fechaHasta').value = hoyStr;
      onDateFilterChange();
    }

    function onDateFilterChange() {
      const soloFinal = document.getElementById('soloSalidasFechaFinal');
      const hint = document.getElementById('gmDateFilterMode');
      if (hint) {
        hint.textContent = soloFinal?.checked
          ? 'Modo activo: solo salidas del día de la fecha final.'
          : 'Modo activo: salidas dentro del rango Desde–Hasta.';
      }

      if (rawTripsData.length > 0) {
        recalcularKPIsYResumen();
        renderTransitoTable(
          transitoListData.filter(item => estaEnRangoDeFechas(item.fechaSalidaRaw))
        );
      }
    }

    function processData(data) {
      rawTripsData = [];
      pendingListData = [];
      transitoListData = [];
      const driverSet = new Set();

      data.forEach(row => {
        const clienteRaw = String(findColumnValue(row, ['Cliente', 'Nombre Cliente', 'Razon Social', 'NombreCliente', 'CLIENTE', 'CLIENTE/PROVEEDOR'])).trim();
        const tipoViajeRaw = String(findColumnValue(row, ['TipoViaje', 'Tipo Viaje', 'Tipo_Viaje', 'TIPO DE VIAJE', 'TipoServicio', 'Tipo Servicio', 'Tipo'])).trim();
        const clasificacionRaw = String(findColumnValue(row, ['Clasificacion', 'Clasificación', 'CLASIFICACION', 'Status', 'Estado', 'Estatus'])).trim();
        const rutaRaw = String(findColumnValue(row, ['Ruta', 'RUTA', 'NombreRuta', 'Origen/Destino', 'Origen-Destino'])).trim();
        const ordenOrViaje = String(findColumnValue(row, ['Viaje', 'NoViaje', 'Orden', 'OrdenServicio', 'Folio', 'ID', 'No. Viaje'])).trim();
        const noViajeClienteRaw = String(findColumnValue(row, ['Noviajecliente', 'NoViajeCliente', 'No Viaje Cliente', 'No. Viaje Cliente', 'HojaServicio', 'Hoja Servicio'])).trim();
        const fechaSalidaVal = findColumnValue(row, ['FechaSalida', 'Fecha Salida', 'Salida', 'FECHA SALIDA', 'F. Salida', 'HoraSalida', 'Hora Salida', 'Fecha', 'FECHA']);
        const fechaLlegadaVal = findColumnValue(row, ['FechaLlegada', 'Fecha Llegada', 'Llegada', 'FECHA LLEGADA', 'F. Llegada', 'HoraLlegada', 'Hora Llegada']);
        const operadorRaw = String(findColumnValue(row, ['Operador', 'Nombre Operador', 'Chofer', 'CONDUCTOR', 'OPERADOR', 'NombreOperador'])).trim();
        const unidadRaw = String(findColumnValue(row, ['Unidad', 'Tractor', 'Camion', 'Camión', 'Eco', 'Economico', 'Económico', 'UNIDAD', 'NoUnidad'])).trim();
        const remolqueRaw = String(findColumnValue(row, ['Remolque', 'Caja', 'Remolque1', 'NoRemolque', 'Equipo', 'Contenedor'])).trim();

        if (!clienteRaw && !ordenOrViaje && !tipoViajeRaw) return;

        const operadorNorm = operadorRaw ? operadorRaw.toUpperCase().replace(/\s+/g, ' ') : 'SIN ASIGNAR';
        const fechaLimpia = formatearSoloFecha(fechaSalidaVal);

        const tipoViaje = tipoViajeRaw.toUpperCase();
        const clasificacion = clasificacionRaw.toUpperCase();
        const ruta = rutaRaw.toUpperCase();
        const combo = `${tipoViaje} ${clasificacion} ${ruta}`;

        const isCruce = combo.includes('CRUCE') || combo.includes('CROSS') || combo.includes('BRIDGE') || 
                        combo.includes('TRANSBORDO') || combo.includes('TRANSF') || combo.includes('TRANSFER');

        const isVacio = clasificacion.includes('VACIO') || clasificacion.includes('VACÍA') || clasificacion.includes('VACIA') || 
                        tipoViaje.includes('VACIO') || tipoViaje.includes('VACÍA') || tipoViaje.includes('VACIA') ||
                        combo.includes('EMPTY');

        const isQuimico = clasificacion.includes('QUIMICO') || clasificacion.includes('QUÍMICO') || tipoViaje.includes('QUIMICO') || tipoViaje.includes('QUÍMICO') || combo.includes('QUIM') || combo.includes('QUÍM');

        const isExpo = combo.includes('EXPO') || combo.includes('EXPORT');
        const isImpo = combo.includes('IMPO') || combo.includes('IMPORT');
        const isForaneo = combo.includes('FORAN') || combo.includes('FORANEO') || combo.includes('FORÁNEO');

        rawTripsData.push({
          fecha: fechaLimpia,
          fechaSalidaRaw: fechaSalidaVal,
          viaje: ordenOrViaje || 'N/A',
          hojaServicio: noViajeClienteRaw || 'N/A',
          cliente: clienteRaw ? clienteRaw.toUpperCase().replace(/\s+/g, ' ') : 'SIN CLIENTE ASIGNADO',
          camion: unidadRaw ? unidadRaw.toUpperCase() : 'N/A',
          remolque: remolqueRaw ? remolqueRaw.toUpperCase() : 'N/A',
          hasRemolque: !!remolqueRaw && !['N/A','NA','N/D','S/R','SIN REMOLQUE','SIN CAJA','SIN EQUIPO','NULL','UNDEFINED','-'].includes(remolqueRaw.toUpperCase().replace(/\s+/g,' ').trim()),
          tipo: tipoViajeRaw || 'N/A',
          clasificacion: clasificacionRaw || 'N/A',
          operador: operadorNorm,
          isExpo: isExpo,
          isImpo: isImpo,
          isForaneo: isForaneo,
          isVacio: isVacio,
          isQuimico: isQuimico,
          isCruce: isCruce
        });

        if (operadorNorm !== 'SIN ASIGNAR') {
          driverSet.add(operadorNorm);
        }

        const tieneSalida = tieneSalidaRegistrada(fechaSalidaVal);
        const tieneLlegada = tieneLlegadaRegistrada(fechaLlegadaVal);

        if (!tieneSalida) {
          pendingListData.push({
            folio: ordenOrViaje || 'N/A',
            cliente: clienteRaw ? clienteRaw.toUpperCase().replace(/\s+/g, ' ') : 'SIN CLIENTE ASIGNADO',
            tipo: tipoViajeRaw || clasificacionRaw || 'Sin especificación',
            operador: operadorNorm,
            unidad: unidadRaw ? unidadRaw.toUpperCase() : 'N/A',
            estatus: 'SIN SALIDA'
          });
          return;
        }

        if (tieneSalida && !tieneLlegada) {
          transitoListData.push({
            fechaSalida: fechaLimpia,
            fechaSalidaRaw: fechaSalidaVal,
            folio: ordenOrViaje || 'N/A',
            cliente: clienteRaw ? clienteRaw.toUpperCase().replace(/\s+/g, ' ') : 'SIN CLIENTE ASIGNADO',
            operador: operadorNorm,
            unidad: unidadRaw ? `${unidadRaw.toUpperCase()} / ${remolqueRaw ? remolqueRaw.toUpperCase() : 'S/R'}` : 'N/A',
            tipo: `${tipoViajeRaw} ${clasificacionRaw ? '(' + clasificacionRaw + ')' : ''}`,
            estatus: 'EN TRÁNSITO'
          });
        }
      });

      recalcularKPIsYResumen();
      renderPendingTable(pendingListData);
      renderTransitoTable(transitoListData.filter(item => estaEnRangoDeFechas(item.fechaSalidaRaw)));
      populateDriverSelect(Array.from(driverSet).sort());
    }

    function recalcularKPIsYResumen() {
      const clientsMap = {};
      globalDriversMap = {};

      let totalCount = 0, totalExpo = 0, totalImpo = 0, totalVacioExpo = 0, totalVacioImpo = 0, totalForaneo = 0;

      rawTripsData.forEach(t => {
        if (!estaEnRangoDeFechas(t.fechaSalidaRaw)) {
          return;
        }

        const esValidoParaResumen = t.isExpo || t.isImpo || t.isForaneo;
        if (!esValidoParaResumen) {
          return;
        }

        const clienteKey = t.cliente;

        if (!clientsMap[clienteKey]) {
          clientsMap[clienteKey] = { 
            cliente: clienteKey, 
            total: 0, 
            cruces: 0,
            expo: 0, 
            impo: 0, 
            vacioExpo: 0,
            vacioImpo: 0, 
            foraneo: 0,
            vaciosTotal: 0
          };
        }

        clientsMap[clienteKey].total += 1;
        totalCount++;

        if (t.isCruce) {
          clientsMap[clienteKey].cruces += 1;
        }

        if (t.isForaneo) {
          clientsMap[clienteKey].foraneo += 1;
          totalForaneo++;
        }

        // Expo/Impo se contabilizan también cuando el viaje es VACÍO.
        // Los vacíos se muestran además en sus columnas de desglose.
        if (t.isExpo) {
          clientsMap[clienteKey].expo += 1;
          totalExpo++;
        }
        if (t.isImpo) {
          clientsMap[clienteKey].impo += 1;
          totalImpo++;
        }

        if (t.isVacio) {
          clientsMap[clienteKey].vaciosTotal += 1;
          if (t.isImpo || t.tipo.toUpperCase().includes('VACIO IMPO') || t.clasificacion.toUpperCase().includes('VACIO IMPO')) {
            clientsMap[clienteKey].vacioImpo += 1;
            totalVacioImpo++;
          } else {
            clientsMap[clienteKey].vacioExpo += 1;
            totalVacioExpo++;
          }
        }

        const operadorNorm = t.operador;
        if (!globalDriversMap[operadorNorm]) {
          globalDriversMap[operadorNorm] = { 
            nombre: operadorNorm, 
            expo: 0, 
            impo: 0, 
            foraneo: 0, 
            vacios: 0,
            vacioExpo: 0,
            vacioImpo: 0,
            vacioForaneo: 0,
            quimicoExpo: 0,
            quimicoImpo: 0,
            totalQuimico: 0,
            total: 0,
            totalValidosOperador: 0,
            unidadesSet: new Set()
          };
        }

        if (t.camion && t.camion !== 'N/A') {
          globalDriversMap[operadorNorm].unidadesSet.add(t.camion);
        }

        // Exportación / Importación / Foráneo se cuentan SIEMPRE,
        // aunque el viaje sea VACÍO o QUÍMICO. Los vacíos se desglosan aparte.
        if (t.isExpo) globalDriversMap[operadorNorm].expo++;
        if (t.isImpo) globalDriversMap[operadorNorm].impo++;
        if (t.isForaneo) globalDriversMap[operadorNorm].foraneo++;

        if (t.isVacio && (t.isExpo || t.isImpo || t.isForaneo)) {
          globalDriversMap[operadorNorm].vacios++;
          if (t.isExpo) globalDriversMap[operadorNorm].vacioExpo++;
          if (t.isImpo) globalDriversMap[operadorNorm].vacioImpo++;
          if (t.isForaneo) globalDriversMap[operadorNorm].vacioForaneo++;
        }

        if (t.isQuimico && (t.isExpo || t.isImpo)) {
          if (t.isExpo) globalDriversMap[operadorNorm].quimicoExpo++;
          if (t.isImpo) globalDriversMap[operadorNorm].quimicoImpo++;
          globalDriversMap[operadorNorm].totalQuimico++;
        }

        // TOTAL = Exportación + Importación + Foráneo.
        // Aquí SÍ entran los vacíos y los químicos porque siguen siendo
        // servicios de Exportación/Importación.
        globalDriversMap[operadorNorm].totalValidosOperador =
          globalDriversMap[operadorNorm].expo +
          globalDriversMap[operadorNorm].impo +
          globalDriversMap[operadorNorm].foraneo;

        globalDriversMap[operadorNorm].total++;
      });

      currentData = Object.values(clientsMap).sort((a, b) => b.total - a.total);


      // ============================================================
      // KPI TRACTO VS CARRO
      // Regla: con remolque/caja = CARRO; sin remolque = TRACTO.
      // Se calcula por Exportación, Importación y Foráneo.
      // ============================================================
      const tc = {
        expo: { total: 0, tracto: 0, carro: 0, tractoOps: new Set(), carroOps: new Set() },
        impo: { total: 0, tracto: 0, carro: 0, tractoOps: new Set(), carroOps: new Set() },
        foraneo: { total: 0, tracto: 0, carro: 0, tractoOps: new Set(), carroOps: new Set() }
      };

      rawTripsData.forEach(t => {
        if (!estaEnRangoDeFechas(t.fechaSalidaRaw)) return;
        let grupo = null;
        if (t.isExpo) grupo = tc.expo;
        else if (t.isImpo) grupo = tc.impo;
        else if (t.isForaneo) grupo = tc.foraneo;
        if (!grupo) return;

        grupo.total++;
        const operadorKpi = String(t.operador || '').trim().toUpperCase();
        if (t.hasRemolque) {
          grupo.carro++;
          if (operadorKpi && !['N/A','NA','N/D','SIN OPERADOR','SIN ASIGNAR','-'].includes(operadorKpi)) grupo.carroOps.add(operadorKpi);
        } else {
          grupo.tracto++;
          if (operadorKpi && !['N/A','NA','N/D','SIN OPERADOR','SIN ASIGNAR','-'].includes(operadorKpi)) grupo.tractoOps.add(operadorKpi);
        }
      });

      const setTC = (key, grupo) => {
        const pctTracto = grupo.total ? (grupo.tracto / grupo.total * 100) : 0;
        const pctCarro = grupo.total ? (grupo.carro / grupo.total * 100) : 0;
        const totalEl = document.getElementById(`kpiTC${key}Total`);
        const tractoEl = document.getElementById(`kpiTC${key}Tracto`);
        const carroEl = document.getElementById(`kpiTC${key}Carro`);
        const tractoBar = document.getElementById(`kpiTC${key}TractoBar`);
        const carroBar = document.getElementById(`kpiTC${key}CarroBar`);
        if (totalEl) totalEl.innerText = grupo.total.toLocaleString();
        if (tractoEl) tractoEl.innerText = `${grupo.tracto.toLocaleString()} · ${pctTracto.toFixed(1)}%`;
        if (carroEl) carroEl.innerText = `${grupo.carro.toLocaleString()} · ${pctCarro.toFixed(1)}%`;
        if (tractoBar) tractoBar.style.width = `${pctTracto}%`;
        if (carroBar) carroBar.style.width = `${pctCarro}%`;
        const tractoOpsEl = document.getElementById(`kpiTC${key}TractoOps`);
        const carroOpsEl = document.getElementById(`kpiTC${key}CarroOps`);
        if (tractoOpsEl) tractoOpsEl.innerText = grupo.tractoOps.size.toLocaleString();
        if (carroOpsEl) carroOpsEl.innerText = grupo.carroOps.size.toLocaleString();
      };

      setTC('Expo', tc.expo);
      setTC('Impo', tc.impo);
      setTC('Foraneo', tc.foraneo);

      document.getElementById('kpiTotal').innerText = totalCount.toLocaleString();
      document.getElementById('kpiExpo').innerText = totalExpo.toLocaleString();
      document.getElementById('kpiImpo').innerText = totalImpo.toLocaleString();
      document.getElementById('kpiVacioExpo').innerText = totalVacioExpo.toLocaleString();
      document.getElementById('kpiVacioImpo').innerText = totalVacioImpo.toLocaleString();
      document.getElementById('kpiForaneo').innerText = totalForaneo.toLocaleString();
      document.getElementById('kpiPendientes').innerText = pendingListData.length.toLocaleString();
      document.getElementById('kpiTransito').innerText = transitoListData.length.toLocaleString();

      const driversArray = Object.values(globalDriversMap);
      renderTable(currentData);
      renderAllOperatorsTable(driversArray);
      renderRadiografiaGerencial(currentData, driversArray, totalCount, totalExpo, totalImpo, totalForaneo, totalVacioExpo + totalVacioImpo);
    }

    /* FUNCIONES PARA LA NUEVA PÁGINA / RADIOGRAFÍA GERENCIAL */
    function toggleVistaGerencial() {
      const vistaOp = document.getElementById('vistaOperativa');
      const vistaGen = document.getElementById('vistaGerencial');
      const btn = document.getElementById('btnVistaGerencial');

      if (vistaGen.classList.contains('hidden')) {
        vistaGen.classList.remove('hidden');
        vistaOp.classList.add('hidden');
        btn.innerHTML = `<i class="fa-solid fa-gauge text-white text-base"></i><span>Dashboard Operativo</span>`;
        btn.className = "bg-slate-800 hover:bg-slate-700 text-white font-medium px-3.5 py-2 rounded-lg transition flex items-center gap-2 text-xs border border-slate-700 shadow-sm";
      } else {
        vistaGen.classList.add('hidden');
        vistaOp.classList.remove('hidden');
        btn.innerHTML = `<i class="fa-solid fa-chart-pie text-white text-base"></i><span>Vista Gerencial</span>`;
        btn.className = "bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-2 rounded-lg transition flex items-center gap-2 text-xs shadow-sm";
      }
    }

    function renderRadiografiaGerencial(clientsList, driversList, totalCount, totalExpo, totalImpo, totalForaneo, totalVacios) {
      const pendientes = pendingListData.length;
      const transito = transitoListData.length;
      const riesgo = pendientes + transito;
      const completados = Math.max(totalCount - riesgo, 0);
      const riesgoPct = totalCount ? Math.round((riesgo / totalCount) * 100) : 0;
      const completadosPct = totalCount ? Math.round((completados / totalCount) * 100) : 0;
      const productivos = Math.max(totalCount - totalVacios, 0);
      const productivosPct = totalCount ? Math.round((productivos / totalCount) * 100) : 0;

      const allUnidades = new Set();
      const activeDrivers = new Set();
      rawTripsData.forEach(t => {
        if (!estaEnRangoDeFechas(t.fechaSalidaRaw)) return;
        if (t.camion && t.camion !== 'N/A') allUnidades.add(t.camion);
        if (t.operador && t.operador !== 'SIN ASIGNAR') activeDrivers.add(t.operador);
      });

      const flota = allUnidades.size;
      const operadores = activeDrivers.size;
      const viajesUnidad = flota ? (totalCount / flota).toFixed(1) : '0.0';
      const topCliente = clientsList[0];
      const top3 = clientsList.slice(0,3).reduce((a,b)=>a+b.total,0);
      const topClientePct = totalCount ? ((topCliente?.total || 0)/totalCount*100) : 0;
      const top3Pct = totalCount ? (top3/totalCount*100) : 0;

      // Movimientos: todo registro que NO sea Exportación, Importación ni Foráneo.
      // Se analizan aparte para no contaminar la concentración comercial principal.
      const movimientos = rawTripsData.filter(t => estaEnRangoDeFechas(t.fechaSalidaRaw) && !t.isExpo && !t.isImpo && !t.isForaneo);
      const movClientesMap = {};
      const movTiposMap = {};
      movimientos.forEach(t => {
        const c = t.cliente || 'SIN CLIENTE ASIGNADO';
        movClientesMap[c] = (movClientesMap[c] || 0) + 1;
        const tipo = (t.tipo || t.clasificacion || 'SIN TIPO').toString().trim().toUpperCase() || 'SIN TIPO';
        movTiposMap[tipo] = (movTiposMap[tipo] || 0) + 1;
      });
      const movClientes = Object.entries(movClientesMap).sort((a,b)=>b[1]-a[1]);
      const movTipos = Object.entries(movTiposMap).sort((a,b)=>b[1]-a[1]);

      // KPI de productividad: servicios promedio por operador activo.
      const serviciosPorOperador = operadores ? (totalCount / operadores) : 0;

      const setText=(id,val)=>{const e=document.getElementById(id);if(e)e.innerText=val;};
      setText('kpiGerencialTotal', totalCount.toLocaleString());
      setText('kpiGerencialRiesgoCount', riesgo.toLocaleString());
      setText('kpiGerencialRiesgoPct', riesgoPct+'%');
      setText('kpiGerencialCompletados', completados.toLocaleString());
      setText('kpiGerencialCompletadosPct', completadosPct+'%');
      setText('kpiGerencialServiciosOperador', serviciosPorOperador.toFixed(1));
      setText('kpiGerencialFlota', flota.toLocaleString());
      setText('kpiGerencialOperadores', operadores.toLocaleString());
      setText('kpiGerencialViajesUnidad', viajesUnidad);
      setText('kpiGerencialProductividad', productivosPct+'%');
      setText('kpiGerencialTopCliente', topCliente ? topCliente.cliente : '—');
      setText('kpiGerencialTopClientePct', topClientePct.toFixed(1)+'% del volumen');
      setText('kpiGerencialClientes', clientsList.length.toLocaleString());
      setText('kpiGerencialTop3Pct', top3Pct.toFixed(1)+'%');
      setText('kpiGerencialMovimientos', movimientos.length.toLocaleString());
      setText('kpiGerencialMovimientosPct', totalCount ? (movimientos.length/totalCount*100).toFixed(1)+'%' : '0%');
      setText('kpiGerencialClientesMov', movClientes.length.toLocaleString());
      setText('kpiGerencialTopMovCliente', movClientes[0] ? movClientes[0][0] : '—');
      setText('kpiGerencialTopMovTipo', movTipos[0] ? movTipos[0][0] : '—');

      const mix=[['mixExpo',totalExpo],['mixImpo',totalImpo],['mixForaneo',totalForaneo],['mixVacios',totalVacios],['mixTransito',transito],['mixPendientes',pendientes]];
      mix.forEach(([id,val])=>setText(id,val.toLocaleString()));
      setText('mixExpoPct',(totalCount?totalExpo/totalCount*100:0).toFixed(1)+'%');
      setText('mixImpoPct',(totalCount?totalImpo/totalCount*100:0).toFixed(1)+'%');
      setText('mixForaneoPct',(totalCount?totalForaneo/totalCount*100:0).toFixed(1)+'%');
      setText('mixVaciosPct',(totalCount?totalVacios/totalCount*100:0).toFixed(1)+'%');
      setText('mixTransitoPct',(totalCount?transito/totalCount*100:0).toFixed(1)+'%');
      setText('mixPendientesPct',(totalCount?pendientes/totalCount*100:0).toFixed(1)+'%');

      const alertas=[];
      if(pendientes) alertas.push(['red','Pendientes sin salida',`${pendientes} servicios requieren asignación o liberación.`]);
      if(transito) alertas.push([transito>=Math.max(5,totalCount*.15)?'red':'amber','Servicios en tránsito',`${transito} viajes aún no tienen llegada registrada.`]);
      if(totalVacios && totalVacios/Math.max(totalCount,1)>=.2) alertas.push(['amber','Nivel de vacíos elevado',`${totalVacios} servicios (${Math.round(totalVacios/totalCount*100)}%) son vacíos.`]);
      if(topClientePct>=40) alertas.push(['amber','Alta concentración comercial',`${topCliente.cliente} representa ${topClientePct.toFixed(1)}% del volumen.`]);
      if(!alertas.length) alertas.push(['green','Sin alertas críticas','La operación no presenta señales relevantes con los datos disponibles.']);
      document.getElementById('gerencialAlertas').innerHTML=alertas.map(a=>`<div class="alert-item"><span class="alert-dot dot-${a[0]}"></span><div><strong>${a[1]}</strong><span>${a[2]}</span></div></div>`).join('');

      const prioridades=[];
      if(pendientes) prioridades.push(['Atender pendientes','Priorizar servicios sin salida registrada.']);
      if(transito) prioridades.push(['Dar seguimiento al tránsito',`Validar ${transito} servicios que siguen abiertos.`]);
      if(topCliente) prioridades.push(['Monitorear cliente principal',`${topCliente.cliente} concentra ${topClientePct.toFixed(1)}% del volumen core (Expo + Impo + Foráneo).`]);
      if(movimientos.length) prioridades.push(['Revisar movimientos no core',`${movimientos.length} movimientos quedan fuera de Exportación, Importación y Foráneo; conviene validar su naturaleza y recurrencia.`]);
      if(!pendientes && !transito && !movimientos.length) prioridades.push(['Mantener operación','No hay backlog operativo ni movimientos fuera del core registrados en el periodo.']);
      document.getElementById('gerencialPrioridades').innerHTML=prioridades.map(a=>`<div class="priority-item"><span class="alert-dot"></span><div><strong>${a[0]}</strong><span>${a[1]}</span></div></div>`).join('');

      // Matriz estratégica existente, ahora como nivel de análisis secundario.
      const matrizBody=document.getElementById('gerencialMatrizBody');
      matrizBody.innerHTML='';
      if(!clientsList.length){matrizBody.innerHTML='<tr><td colspan="8" class="py-10 text-center text-slate-400">Sin datos registrados en el rango de fechas.</td></tr>';return;}
      clientsList.forEach(item=>{
        const pctParticipacion=totalCount?((item.total/totalCount)*100).toFixed(1):0;
        const tr=document.createElement('tr');
        tr.className='hover:bg-blue-50/50 transition cursor-pointer border-b border-slate-100';
        tr.onclick=()=>mostrarDetalleClienteGerencial(item.cliente);
        tr.innerHTML=`<td class="py-3 px-4 font-bold text-slate-900 flex items-center gap-2"><i class="fa-solid fa-building text-blue-500 text-xs"></i>${item.cliente}</td><td class="py-3 px-4 text-center font-black text-blue-700 bg-blue-50/20">${item.total}</td><td class="py-3 px-4 text-center font-semibold text-emerald-600">${item.expo}</td><td class="py-3 px-4 text-center font-semibold text-indigo-600">${item.impo}</td><td class="py-3 px-4 text-center font-semibold text-purple-600">${item.foraneo}</td><td class="py-3 px-4 text-center font-semibold text-rose-600">${item.vacioExpo+item.vacioImpo}</td><td class="py-3 px-4 text-center"><b>${pctParticipacion}%</b></td><td class="py-3 px-4 text-center"><button class="bg-blue-600 text-white font-semibold px-3 py-1 rounded text-xs"><i class="fa-solid fa-eye mr-1"></i>Detalle</button></td>`;
        matrizBody.appendChild(tr);
      });

      const opBody=document.getElementById('gerencialOperadoresBody');
      if(opBody){
        opBody.innerHTML='';
        [...driversList].sort((a,b)=>b.totalValidosOperador-a.totalValidosOperador).forEach(d=>{
          const tr=document.createElement('tr'); tr.className='hover:bg-indigo-50/40 transition cursor-pointer border-b border-slate-100'; tr.onclick=()=>mostrarDetalleOperadorGerencial(d.nombre);
          tr.innerHTML=`<td class="py-3 px-4 font-bold text-slate-900">${d.nombre}</td><td class="py-3 px-4 text-center text-xs">${Array.from(d.unidadesSet).join(', ')||'N/A'}</td><td class="py-3 px-4 text-center text-emerald-600">${d.expo}</td><td class="py-3 px-4 text-center text-indigo-600">${d.impo}</td><td class="py-3 px-4 text-center text-purple-600">${d.foraneo}</td><td class="py-3 px-4 text-center text-rose-600">${d.vacios}</td><td class="py-3 px-4 text-center font-black">${d.totalValidosOperador}</td><td class="py-3 px-4 text-center"><button class="bg-indigo-600 text-white px-3 py-1 rounded text-xs">Auditar</button></td>`; opBody.appendChild(tr);
        });
      }
    }

    function abrirDetalleKpiGerencial(tipo) {
      const targets = {
        total: 'gerencialMatrizBody',
        riesgo: 'gerencialAlertas',
        completados: 'gerencialMatrizBody',
        productividad: 'gerencialOperadoresBody'
      };
      const target = document.getElementById(targets[tipo] || 'gerencialMatrizBody');      if (!target) return;

      if (tipo === 'riesgo') {
        const alertas = document.getElementById('gerencialAlertas');
        alertas?.scrollIntoView({behavior:'smooth', block:'center'});
        document.getElementById('transitoSection')?.scrollIntoView({behavior:'smooth', block:'start'});
        setTimeout(() => document.getElementById('pendientesSection')?.scrollIntoView({behavior:'smooth', block:'start'}), 350);
        return;
      }

      target.scrollIntoView({behavior:'smooth', block:'center'});
      const container = target.closest('.bg-white') || target.closest('section') || target.parentElement;
      if (container) {
        container.classList.add('ring-2','ring-blue-400','ring-offset-2');
        setTimeout(()=>container.classList.remove('ring-2','ring-blue-400','ring-offset-2'),1400);
      }
    }

    function mostrarDetalleClienteGerencial(nombreCliente) {
      const panel = document.getElementById('panelDetalleGerencial');
      panel.classList.remove('hidden');
      document.getElementById('detFechaTituloCliente`'); // safe
      document.getElementById('detalleTituloCliente').innerHTML = `<i class="fa-solid fa-building text-blue-600 mr-2"></i> Cliente: ${nombreCliente}`;

      const viajesCliente = rawTripsData.filter(t => estaEnRangoDeFechas(t.fechaSalidaRaw) && t.cliente === nombreCliente);

      let expo = 0, impo = 0, foraneo = 0;
      viajesCliente.forEach(t => {
        if (t.isExpo && !t.isVacio) expo++;
        if (t.isImpo && !t.isVacio) impo++;
        if (t.isForaneo) foraneo++;
      });

      document.getElementById('detValTotal').innerText = viajesCliente.length.toLocaleString();
      document.getElementById('detValExpo').innerText = expo.toLocaleString();
      document.getElementById('detValImpo').innerText = impo.toLocaleString();
      document.getElementById('detValForaneo').innerText = foraneo.toLocaleString();

      const tbody = document.getElementById('detTableBody');
      tbody.innerHTML = '';

      if (viajesCliente.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">Sin movimientos detallados para este cliente.</td></tr>`;
        return;
      }

      viajesCliente.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 border-b border-slate-100";
        tr.innerHTML = `
          <td class="py-2 px-3 font-semibold text-emerald-800">${t.fecha}</td>
          <td class="py-2 px-3 font-bold text-blue-700">${t.viaje}</td>
          <td class="py-2 px-3 font-medium text-slate-800">${t.cliente}</td>
          <td class="py-2 px-3 text-slate-700">${t.operador}</td>
          <td class="py-2 px-3 font-mono text-xs text-slate-700">${t.camion}</td>
          <td class="py-2 px-3 font-mono text-xs text-slate-700">${t.remolque}</td>
          <td class="py-2 px-3 text-slate-600">${t.tipo} (${t.clasificacion})</td>
        `;
        tbody.appendChild(tr);
      });

      panel.scrollIntoView({ behavior: 'smooth' });
    }

    function mostrarDetalleOperadorGerencial(nombreOperador) {
      const panel = document.getElementById('panelDetalleGerencial');
      panel.classList.remove('hidden');
      document.getElementById('detalleTituloCliente').innerHTML = `<i class="fa-solid fa-user-tie text-indigo-600 mr-2"></i> Operador Auditado: ${nombreOperador}`;

      const viajesOp = rawTripsData.filter(t => estaEnRangoDeFechas(t.fechaSalidaRaw) && t.operador === nombreOperador);

      let expo = 0, impo = 0, foraneo = 0;
      viajesOp.forEach(t => {
        if (t.isExpo && !t.isVacio) expo++;
        if (t.isImpo && !t.isVacio) impo++;
        if (t.isForaneo) foraneo++;
      });

      document.getElementById('detValTotal').innerText = viajesOp.length.toLocaleString();
      document.getElementById('detValExpo').innerText = expo.toLocaleString();
      document.getElementById('detValImpo').innerText = impo.toLocaleString();
      document.getElementById('detValForaneo').innerText = foraneo.toLocaleString();

      const tbody = document.getElementById('detTableBody');
      tbody.innerHTML = '';

      if (viajesOp.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">Sin movimientos registrados para este operador.</td></tr>`;
        return;
      }

      viajesOp.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 border-b border-slate-100";
        tr.innerHTML = `
          <td class="py-2 px-3 font-semibold text-emerald-800">${t.fecha}</td>
          <td class="py-2 px-3 font-bold text-blue-700">${t.viaje}</td>
          <td class="py-2 px-3 font-medium text-slate-800">${t.cliente}</td>
          <td class="py-2 px-3 text-slate-700 font-bold">${t.operador}</td>
          <td class="py-2 px-3 font-mono text-xs text-slate-700">${t.camion}</td>
          <td class="py-2 px-3 font-mono text-xs text-slate-700">${t.remolque}</td>
          <td class="py-2 px-3 text-slate-600">${t.tipo} (${t.clasificacion})</td>
        `;
        tbody.appendChild(tr);
      });

      panel.scrollIntoView({ behavior: 'smooth' });
    }

    function cerrarPanelDetalle() {
      document.getElementById('panelDetalleGerencial').classList.add('hidden');
    }

    function populateDriverSelect(drivers) {
      const select = document.getElementById('driverSelect');
      select.innerHTML = '<option value="">-- Selecciona un Operador --</option>';

      drivers.forEach(driver => {
        const option = document.createElement('option');
        option.value = driver;
        option.textContent = driver;
        select.appendChild(option);
      });

      filterDriverTrips();
    }

    function filterDriverTrips() {
      const selectedDriver = document.getElementById('driverSelect').value;
      const tbody = document.getElementById('driverTripsTableBody');
      const badge = document.getElementById('driverTripBadge');

      tbody.innerHTML = '';

      if (!selectedDriver) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400">Selecciona un operador en el desplegable superior para ver sus viajes.</td></tr>`;
        badge.innerText = '0 Viajes';
        return;
      }

      const driverTrips = rawTripsData.filter(t => t.operador === selectedDriver && estaEnRangoDeFechas(t.fechaSalidaRaw));
      badge.innerText = `${driverTrips.length} Viajes`;

      if (driverTrips.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400">No se encontraron viajes para este operador.</td></tr>`;
        return;
      }

      driverTrips.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
        tr.innerHTML = `
          <td class="py-2.5 px-4 font-semibold text-emerald-800 bg-emerald-50/30">${t.fecha}</td>
          <td class="py-2.5 px-4 font-bold text-blue-700 bg-blue-50/30">${t.viaje}</td>
          <td class="py-2.5 px-4 font-bold text-indigo-800 bg-indigo-50/30">${t.hojaServicio}</td>
          <td class="py-2.5 px-4 font-semibold text-slate-800">${t.cliente}</td>
          <td class="py-2.5 px-4 font-mono text-xs text-slate-700">${t.camion}</td>
          <td class="py-2.5 px-4 font-mono text-xs text-slate-700">${t.remolque}</td>
          <td class="py-2.5 px-4 text-slate-700">${t.tipo}</td>
          <td class="py-2.5 px-4 text-slate-700">${t.clasificacion}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function renderTable(data) {
      const tbody = document.getElementById('tableBody');
      const tfoot = document.getElementById('tableFoot');
      tbody.innerHTML = '';

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Sin datos de servicios de Exportación, Importación o Foráneos en el rango de fechas seleccionado.</td></tr>`;
        tfoot.classList.add('hidden');
        return;
      }

      let sumTotal = 0, sumExpo = 0, sumImpo = 0, sumVacioExpo = 0, sumVacioImpo = 0, sumForaneo = 0;

      data.forEach(item => {
        sumTotal += item.total;
        sumExpo += item.expo;
        sumImpo += item.impo;
        sumVacioExpo += item.vacioExpo;
        sumVacioImpo += item.vacioImpo;
        sumForaneo += item.foraneo;

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition border-b border-slate-100";
        tr.innerHTML = `
          <td class="py-3 px-4 font-semibold text-slate-900">${item.cliente}</td>
          <td class="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/30">${item.total}</td>
          <td class="py-3 px-4 text-center font-medium ${item.expo > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-300'}">${item.expo}</td>
          <td class="py-3 px-4 text-center font-medium ${item.impo > 0 ? 'text-indigo-600 font-semibold' : 'text-slate-300'}">${item.impo}</td>
          <td class="py-3 px-4 text-center font-medium ${item.vacioExpo > 0 ? 'text-rose-600 font-bold bg-rose-50/30' : 'text-slate-300'}">${item.vacioExpo}</td>
          <td class="py-3 px-4 text-center font-medium ${item.vacioImpo > 0 ? 'text-pink-600 font-bold bg-pink-50/30' : 'text-slate-300'}">${item.vacioImpo}</td>
          <td class="py-3 px-4 text-center font-medium ${item.foraneo > 0 ? 'text-purple-600 font-semibold' : 'text-slate-300'}">${item.foraneo}</td>
        `;
        tbody.appendChild(tr);
      });

      tfoot.innerHTML = `
        <tr class="text-slate-900 border-t-2 border-slate-300">
          <td class="py-3 px-4 text-left font-extrabold">TOTAL GENERAL (${data.length} clientes)</td>
          <td class="py-3 px-4 text-center text-blue-700 font-black bg-blue-50/40">${sumTotal}</td>
          <td class="py-3 px-4 text-center text-emerald-700 font-bold">${sumExpo}</td>
          <td class="py-3 px-4 text-center text-indigo-700 font-bold">${sumImpo}</td>
          <td class="py-3 px-4 text-center text-rose-700 font-bold">${sumVacioExpo}</td>
          <td class="py-3 px-4 text-center text-pink-700 font-bold">${sumVacioImpo}</td>
          <td class="py-3 px-4 text-center text-purple-700 font-bold">${sumForaneo}</td>
        </tr>
      `;
      tfoot.classList.remove('hidden');
    }

    function renderPendingTable(pendingList) {
      const pBody = document.getElementById('pendingTableBody');
      const badge = document.getElementById('pendingBadge');
      
      badge.innerText = `${pendingList.length} Registros`;
      pBody.innerHTML = '';

      if (pendingList.length === 0) {
        pBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">Sin viajes pendientes.</td></tr>`;
        return;
      }

      pendingList.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-amber-50/30 transition border-b border-amber-50";
        tr.innerHTML = `
          <td class="py-2.5 px-4 font-bold text-slate-800">${item.folio}</td>
          <td class="py-2.5 px-4 font-semibold text-slate-700">${item.cliente}</td>
          <td class="py-2.5 px-4 text-slate-600">${item.tipo}</td>
          <td class="py-2.5 px-4 font-medium text-slate-800">${item.operador}</td>
          <td class="py-2.5 px-4 text-slate-700 font-mono text-xs">${item.unidad}</td>
          <td class="py-2.5 px-4"><span class="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-[11px]">${item.estatus}</span></td>
        `;
        pBody.appendChild(tr);
      });
    }

    function renderTransitoTable(transitoList) {
      const tBody = document.getElementById('transitoTableBody');
      const badge = document.getElementById('transitoBadge');
      
      badge.innerText = `${transitoList.length} Registros`;
      tBody.innerHTML = '';

      if (transitoList.length === 0) {
        tBody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">Sin viajes en tránsito registrados.</td></tr>`;
        return;
      }

      transitoList.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-cyan-50/30 transition border-b border-cyan-50";
        tr.innerHTML = `
          <td class="py-2.5 px-4 font-semibold text-slate-700 bg-cyan-50/20">${item.fechaSalida}</td>
          <td class="py-2.5 px-4 font-bold text-cyan-900">${item.folio}</td>
          <td class="py-2.5 px-4 font-semibold text-slate-800">${item.cliente}</td>
          <td class="py-2.5 px-4 font-medium text-slate-800">${item.operador}</td>
          <td class="py-2.5 px-4 text-slate-700 font-mono text-xs">${item.unidad}</td>
          <td class="py-2.5 px-4 text-slate-600">${item.tipo}</td>
          <td class="py-2.5 px-4 text-center"><span class="bg-cyan-100 text-cyan-900 font-bold px-2 py-0.5 rounded text-[11px] shadow-sm">${item.estatus}</span></td>
        `;
        tBody.appendChild(tr);
      });
    }

    function renderAllOperatorsTable(driversList) {
      allOperatorsCache = [...driversList]
        .filter(d => (Number(d.expo) + Number(d.impo) + Number(d.foraneo)) > 0)
        .sort((a,b) => b.totalValidosOperador - a.totalValidosOperador || a.nombre.localeCompare(b.nombre));
      filtrarListadoOperadores();
    }

    function exportListadoOperadoresPDF() {
      const table = document.querySelector('#allDriversBody')?.closest('table');
      const tbody = document.getElementById('allDriversBody');
      if (!table || !tbody) {
        showStatus('No se encontró el Listado Completo de Operadores.', 'error');
        return;
      }
      const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(tr => tr.offsetParent !== null && !tr.innerText.includes('No se encontraron operadores'));
      if (!visibleRows.length) {
        showStatus('No hay información visible para generar el PDF.', 'error');
        return;
      }
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({orientation:'landscape', unit:'mm', format:'letter'});
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.replace(/\s+/g,' ').trim());
        const body = visibleRows.map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.replace(/\s+/g,' ').trim()));
        doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(30,41,59);
        doc.text('Listado Completo de Operadores', 10, 12);
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(100,116,139);
        doc.text('Reporte generado exactamente con la información visible en la tabla.', 10, 18);
        doc.autoTable({
          startY: 23,
          head: [headers],
          body: body,
          theme: 'striped',
          styles: {fontSize:7, cellPadding:2, valign:'middle', overflow:'linebreak'},
          headStyles: {fillColor:[30,64,175], textColor:255, fontStyle:'bold', halign:'center', fontSize:7},
          margin:{left:8,right:8,top:23,bottom:10},
          didDrawPage: function(){
            const h=doc.internal.pageSize.getHeight();
            doc.setFontSize(7); doc.setTextColor(100,116,139);
            doc.text('Listado Completo de Operadores',8,h-6);
            doc.text(`Página ${doc.internal.getNumberOfPages()}`,250,h-6);
          }
        });
        const stamp=new Date().toISOString().slice(0,10);
        doc.save(`Listado_Completo_Operadores_${stamp}.pdf`);
        showStatus('PDF generado con exactamente la información mostrada en la tabla.', 'success');
      } catch(err) {
        console.error('Error al generar PDF del listado:',err);
        showStatus('No fue posible generar el PDF del Listado Completo de Operadores.', 'error');
      }
    }

    function filtrarListadoOperadores() {
      const body = document.getElementById('allDriversBody');
      const badge = document.getElementById('allDriversBadge');
      const input = document.getElementById('allDriversSearch');
      if (!body || !badge) return;
      const q = (input?.value || '').trim().toUpperCase();
      const list = allOperatorsCache.filter(d => !q || String(d.nombre).toUpperCase().includes(q));
      badge.innerText = `${list.length} operador${list.length === 1 ? '' : 'es'}`;
      body.innerHTML = '';
      if (!list.length) {
        body.innerHTML = '<tr><td colspan="10" class="py-8 text-center text-slate-400">No se encontraron operadores con ese nombre.</td></tr>';
        return;
      }
      list.forEach((d, idx) => {
        const safeName = JSON.stringify(String(d.nombre));
        body.insertAdjacentHTML('beforeend', `
          <tr class="hover:bg-blue-50/40 transition border-b border-slate-100">
            <td class="py-2.5 px-3 font-bold text-slate-500">${idx + 1}</td>
            <td class="py-2.5 px-3 font-semibold text-slate-800">${escapeHtmlVigencia(String(d.nombre))}</td>
            <td class="py-2.5 px-3 text-center text-emerald-600 font-medium">${d.expo}</td>
            <td class="py-2.5 px-3 text-center text-indigo-600 font-medium">${d.impo}</td>
            <td class="py-2.5 px-3 text-center text-purple-600 font-medium">${d.foraneo}</td>
            <td class="py-2.5 px-3 text-center text-rose-600 font-medium">${d.vacioExpo}</td>
            <td class="py-2.5 px-3 text-center text-pink-600 font-medium">${d.vacioImpo}</td>
            <td class="py-2.5 px-3 text-center text-teal-700 font-medium">${d.totalQuimico}</td>
            <td class="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-50">${d.totalValidosOperador}</td>
            <td class="py-2.5 px-3 text-center"><button onclick='mostrarDetalleOperadorTop5(${safeName})' class="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-md text-[10px] font-bold transition"><i class="fa-solid fa-eye mr-1"></i>Ver viajes</button></td>
          </tr>`);
      });
    }

    let operadorDetalleActual = null;

    function abrirListaOperadoresKPI(key, tipoUnidad) {
      const labels = {Expo:'Exportación', Imopo:'Importación', Impo:'Importación', Foraneo:'Foráneo'};
      const categoria = labels[key] || key;
      const viajes = rawTripsData.filter(t => {
        if (!estaEnRangoDeFechas(t.fechaSalidaRaw)) return false;
        const esCat = key==='Expo' ? t.isExpo : key==='Impo' ? t.isImpo : t.isForaneo;
        if (!esCat) return false;
        const esCarro = !!t.hasRemolque;
        return tipoUnidad === 'Carro' ? esCarro : !esCarro;
      });
      const mapa = {};
      viajes.forEach(t => {
        const op = String(t.operador || '').trim();
        const norm = op.toUpperCase();
        if (!norm || ['N/A','NA','N/D','SIN OPERADOR','SIN ASIGNAR','-'].includes(norm)) return;
        if (!mapa[norm]) mapa[norm] = {nombre:op, viajes:0, unidades:new Set(), remolques:new Set(), clientes:new Set(), ultima:''};
        const d=mapa[norm]; d.viajes++; if(t.camion) d.unidades.add(String(t.camion)); if(t.remolque && t.remolque!=='N/A') d.remolques.add(String(t.remolque)); if(t.cliente) d.clientes.add(String(t.cliente));
        const fecha=String(t.fecha||''); if(!d.ultima || fecha>d.ultima) d.ultima=fecha;
      });
      const lista=Object.values(mapa).sort((a,b)=>b.viajes-a.viajes || a.nombre.localeCompare(b.nombre));
      document.getElementById('kpiOpModalTitulo').innerText=`Operadores ${tipoUnidad}`;
      document.getElementById('kpiOpModalSubtitulo').innerText=`${categoria} · ${lista.length} operadores únicos · Rango: ${document.getElementById('fechaDesde')?.value||'—'} al ${document.getElementById('fechaHasta')?.value||'—'}`;
      const tbody=document.getElementById('kpiOperadoresModalBody'); tbody.innerHTML='';
      if(!lista.length){ tbody.innerHTML='<tr><td colspan="6" class="text-center text-slate-400 py-8">No hay operadores para este indicador.</td></tr>'; }
      else lista.forEach(d=>{ const safe=escapeHtmlVigencia(d.nombre); tbody.insertAdjacentHTML('beforeend',`<tr class="clickable" onclick="mostrarDetalleOperadorTop5(${JSON.stringify(d.nombre)})"><td class="gm-kpi-op-name">${safe}</td><td><span class="gm-kpi-op-pill">${d.viajes.toLocaleString()}</span></td><td>${d.unidades.size.toLocaleString()}</td><td>${d.remolques.size.toLocaleString()}</td><td>${d.clientes.size.toLocaleString()}</td><td>${escapeHtmlVigencia(d.ultima||'—')}</td></tr>`); });
      document.getElementById('kpiOperadoresModal').classList.add('open'); document.body.classList.add('overflow-hidden');
    }
    function cerrarListaOperadoresKPI(){ document.getElementById('kpiOperadoresModal').classList.remove('open'); document.body.classList.remove('overflow-hidden'); }

    function mostrarDetalleOperadorTop5(nombreOperador) {
      const viajesOp = rawTripsData.filter(t => estaEnRangoDeFechas(t.fechaSalidaRaw) && t.operador === nombreOperador && (t.isExpo || t.isImpo || t.isForaneo));
      operadorDetalleActual = { nombre: nombreOperador, viajes: viajesOp };
      let expo = 0, impo = 0, foraneo = 0;
      viajesOp.forEach(t => {
        if (t.isExpo) expo++;
        if (t.isImpo) impo++;
        if (t.isForaneo) foraneo++;
      });

      document.getElementById('opModalNombre').innerText = nombreOperador;
      document.getElementById('opModalTotal').innerText = (expo + impo + foraneo).toLocaleString();
      document.getElementById('opModalExpo').innerText = expo.toLocaleString();
      document.getElementById('opModalImpo').innerText = impo.toLocaleString();
      document.getElementById('opModalForaneo').innerText = foraneo.toLocaleString();
      document.getElementById('opModalRango').innerText = `Rango: ${document.getElementById('fechaDesde')?.value || '—'} al ${document.getElementById('fechaHasta')?.value || '—'}`;

      const tbody = document.getElementById('opModalTableBody');
      tbody.innerHTML = '';
      if (!viajesOp.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="py-10 text-center text-slate-400">Sin viajes válidos para este operador en el rango seleccionado.</td></tr>';
      } else {
        viajesOp.forEach(t => {
          const tipoServicio = t.isExpo ? (t.isQuimico ? 'EXPORTACIÓN - QUÍMICO' : (t.isVacio ? 'EXPORTACIÓN - VACÍO' : 'EXPORTACIÓN')) : (t.isImpo ? (t.isQuimico ? 'IMPORTACIÓN - QUÍMICO' : (t.isVacio ? 'IMPORTACIÓN - VACÍO' : 'IMPORTACIÓN')) : 'FORÁNEO');
          tbody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
              <td class="py-2 px-3 font-semibold text-slate-700">${escapeHtmlVigencia(String(t.fecha || ''))}</td>
              <td class="py-2 px-3 font-bold text-blue-700">${escapeHtmlVigencia(String(t.viaje || ''))}</td>
              <td class="py-2 px-3 font-medium text-slate-800">${escapeHtmlVigencia(String(t.cliente || ''))}</td>
              <td class="py-2 px-3 font-mono text-xs text-slate-700">${escapeHtmlVigencia(String(t.camion || ''))}</td>
              <td class="py-2 px-3 font-mono text-xs text-slate-700">${escapeHtmlVigencia(String(t.remolque || ''))}</td>
              <td class="py-2 px-3 font-semibold ${tipoServicio==='EXPORTACIÓN'?'text-emerald-700':tipoServicio==='IMPORTACIÓN'?'text-indigo-700':'text-purple-700'}">${tipoServicio}</td>
              <td class="py-2 px-3 text-slate-600">${escapeHtmlVigencia(String(t.clasificacion || ''))}</td>
              <td class="py-2 px-3 text-slate-600">${escapeHtmlVigencia(String(t.estatus || ''))}</td>
              <td class="py-2 px-3 text-slate-600">${escapeHtmlVigencia(String(t.hojaServicio || ''))}</td>
            </tr>`);
        });
      }
      document.getElementById('operadorDetalleModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }

    function cerrarDetalleOperadorTop5() {
      document.getElementById('operadorDetalleModal').classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }

    function exportarDetalleOperadorPDF() {
      if (!operadorDetalleActual) return;
      const viajes = operadorDetalleActual.viajes || [];
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({orientation:'landscape', unit:'mm', format:'letter'});
        const nombre = operadorDetalleActual.nombre;
        const fecha = new Date().toLocaleDateString('es-MX');
        const desde = document.getElementById('fechaDesde')?.value || '';
        const hasta = document.getElementById('fechaHasta')?.value || '';
        const expo = viajes.filter(t=>t.isExpo).length;
        const impo = viajes.filter(t=>t.isImpo).length;
        const foraneo = viajes.filter(t=>t.isForaneo).length;

        doc.setFillColor(15,23,42); doc.rect(0,0,280,22,'F');
        doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(15);
        doc.text('DETALLE DE VIAJES POR OPERADOR',14,10);
        doc.setFontSize(9); doc.setFont('helvetica','normal');
        doc.text(`Operador: ${nombre}`,14,16);
        doc.text(`Rango: ${desde} al ${hasta} | Emisión: ${fecha}`,190,16,{align:'right'});

        doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(10);
        doc.text(`TOTAL: ${expo+impo+foraneo} | EXPORTACIÓN: ${expo} | IMPORTACIÓN: ${impo} | FORÁNEO: ${foraneo}`,14,29);

        const rows = viajes.map(t=>[
          t.fecha||'', t.viaje||'', t.cliente||'', t.camion||'', t.remolque||'',
          t.isExpo?(t.isQuimico?'EXPORTACIÓN - QUÍMICO':(t.isVacio?'EXPORTACIÓN - VACÍO':'EXPORTACIÓN')):(t.isImpo?(t.isQuimico?'IMPORTACIÓN - QUÍMICO':(t.isVacio?'IMPORTACIÓN - VACÍO':'IMPORTACIÓN')):'FORÁNEO'), t.clasificacion||'', t.estatus||'', t.hojaServicio||''
        ]);
        doc.autoTable({startY:34,head:[['Fecha','Viaje/Folio','Cliente','Camión','Remolque','Tipo','Clasificación','Estatus','Hoja Servicio']],body:rows,theme:'striped',styles:{fontSize:7,cellPadding:1.8,overflow:'linebreak'},headStyles:{fillColor:[37,99,235],textColor:255,fontStyle:'bold',halign:'center'}});
        doc.save(`Detalle_Viajes_${String(nombre).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`);
      } catch(err) {
        console.error(err);
        showStatus('No fue posible generar el PDF del operador.', 'error');
      }
    }

    function filterTable() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      renderTable(currentData.filter(item => item.cliente.toLowerCase().includes(query)));
    }

    function generarTextoWhatsAppOperador() {
      const selectedDriver = document.getElementById('driverSelect').value;
      if (!selectedDriver) {
        return null;
      }

      const driverTrips = rawTripsData.filter(t => t.operador === selectedDriver);
      if (!driverTrips || driverTrips.length === 0) {
        return null;
      }

      const fechaHoy = new Date().toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });

      let mensaje = `🚛 *HISTORIAL DE SERVICIOS POR OPERADOR*
`;
      mensaje += `═════════════════════════
`;
      mensaje += `👤 *OPERADOR:* ${selectedDriver}
`;
      mensaje += `📊 *TOTAL DE VIAJES:* ${driverTrips.length}
`;
      mensaje += `📅 *EMISIÓN:* ${fechaHoy}
`;
      mensaje += `═════════════════════════

`;

      driverTrips.forEach((t, i) => {
        mensaje += `🔹 *REGISTRO #${i + 1}*
`;
        mensaje += `├ 📅 *Fecha:* ${t.fecha}
`;
        mensaje += `├ 📋 *Viaje / Folio:* \`${t.viaje}\`
`;
        mensaje += `├ 📑 *Hoja Svc:* ${t.hojaServicio}
`;
        mensaje += `├ 🏢 *Cliente:* ${t.cliente}
`;
        mensaje += `├ 🚛 *Tractor / Rem:* ${t.camion} | ${t.remolque}
`;
        mensaje += `└ 🏷️ *Servicio:* ${t.tipo} _(${t.clasificacion})_
`;
        mensaje += `─────────────────────────
`;
      });

      mensaje += `
📌 _Reporte generado automáticamente desde el Dashboard Logístico._`;
      return mensaje;
    }

    function copiarTextoOperadorWhatsApp() {
      const mensaje = generarTextoWhatsAppOperador();
      if (!mensaje) {
        showStatus('Por favor selecciona un operador con viajes registrados para poder copiar su información.', 'error');
        return;
      }

      navigator.clipboard.writeText(mensaje).then(() => {
        showStatus('¡Información copiada al portapapeles con formato para WhatsApp!', 'success');
      }).catch(err => {
        console.error('Error al copiar: ', err);
        showStatus('No se pudo copiar la información al portapapeles.', 'error');
      });
    }

    function shareOperadorWhatsApp() {
      const selectedDriver = document.getElementById('driverSelect').value;
      if (!selectedDriver) {
        showStatus('Por favor selecciona un operador para poder compartir su información.', 'error');
        return;
      }

      const mensaje = generarTextoWhatsAppOperador();
      if (!mensaje) {
        showStatus(`No hay viajes registrados para el operador ${selectedDriver}.`, 'error');
        return;
      }

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(whatsappUrl, '_blank');
      
      showStatus('Mensaje profesional generado y listo para enviar en WhatsApp.', 'success');
    }

    function exportOperadorPDF() {
      const selectedDriver = document.getElementById('driverSelect').value;
      if (!selectedDriver) {
        showStatus('Por favor selecciona un operador para poder exportar su consulta a PDF.', 'error');
        return;
      }

      const driverTrips = rawTripsData.filter(t => t.operador === selectedDriver);

      if (!driverTrips || driverTrips.length === 0) {
        showStatus(`No hay viajes registrados para el operador ${selectedDriver}.`, 'error');
        return;
      }

      showStatus(`Generando reporte en PDF para el operador <strong>${selectedDriver}</strong>...`, 'info');

      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 297, 20, 'F');

        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text("HISTORIAL DE VIAJES POR OPERADOR", 14, 13);

        doc.setFontSize(8.5);
        doc.setTextColor(224, 231, 255);
        doc.setFont('helvetica', 'normal');
        doc.text(`Emisión: ${dateStr}`, 240, 13);

        let startY = 28;
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`Operador: ${selectedDriver}`, 14, startY);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Total de Viajes Registrados: ${driverTrips.length}`, 14, startY + 5);

        const columns = [
          { header: "Fecha Salida", dataKey: "fecha" },
          { header: "Viaje / Folio", dataKey: "viaje" },
          { header: "Hoja de Servicio", dataKey: "hojaServicio" },
          { header: "Cliente", dataKey: "cliente" },
          { header: "Camión", dataKey: "camion" },
          { header: "Remolque", dataKey: "remolque" },
          { header: "Tipo", dataKey: "tipo" },
          { header: "Clasificación", dataKey: "clasificacion" }
        ];

        const body = driverTrips.map(t => ({
          fecha: t.fecha,
          viaje: t.viaje,
          hojaServicio: t.hojaServicio,
          cliente: t.cliente,
          camion: t.camion,
          remolque: t.remolque,
          tipo: t.tipo,
          clasificacion: t.clasificacion
        }));

        doc.autoTable({
          startY: startY + 9,
          columns: columns,
          body: body,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            fecha: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
            viaje: { halign: 'center', fontStyle: 'bold', textColor: [29, 78, 216] },
            hojaServicio: { halign: 'center', fontStyle: 'bold', textColor: [79, 70, 229] },
            camion: { fontStyle: 'mono' },
            remolque: { fontStyle: 'mono' }
          }
        });

        const safeFileName = selectedDriver.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Historial_Viajes_Operador_${safeFileName}.pdf`);
        
        showStatus(`<strong>Reporte de Operador (PDF)</strong> generado exitosamente para ${selectedDriver}.`, 'success');

      } catch (err) {
        console.error("Error al generar PDF del operador:", err);
        showStatus('Error interno al generar el PDF del operador.', 'error');
      }
    }

    function exportReporteGerencialPDF() {
      if ((!currentData || currentData.length === 0) &&
          (!transitoListData || transitoListData.length === 0) &&
          (!pendingListData || pendingListData.length === 0) &&
          (!allOperatorsCache || allOperatorsCache.length === 0)) {
        showStatus('No existen datos cargados para generar el Reporte Operación.', 'error');
        return;
      }

      showStatus('Generando <strong>Reporte de Operaciones Ejecutivo</strong>...', 'info');

      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const W = 297, H = 210;
        const M = 12;
        const desdeVal = document.getElementById('fechaDesde').value || '--';
        const hastaVal = document.getElementById('fechaHasta').value || '--';
        const dateStr = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' });

        // Paleta ejecutiva
        const C = {
          navy:[15,23,42], slate:[71,85,105], muted:[100,116,139], line:[226,232,240],
          white:[255,255,255], blue:[37,99,235], green:[5,150,105], indigo:[79,70,229],
          purple:[126,34,206], amber:[217,119,6], red:[225,29,72], cyan:[8,145,178],
          teal:[13,148,136], soft:[248,250,252]
        };
        const setFill = c => doc.setFillColor(...c);
        const setText = c => doc.setTextColor(...c);
        const setLine = c => doc.setDrawColor(...c);

        function header(title, subtitle='') {
          setFill(C.navy); doc.rect(0,0,W,24,'F');
          setFill(C.blue); doc.rect(0,0,5,24,'F');
          doc.setFont('helvetica','bold'); doc.setFontSize(15); setText(C.white);
          doc.text(title, 12, 10.5);
          doc.setFont('helvetica','normal'); doc.setFontSize(7.5); setText([203,213,225]);
          doc.text(`Periodo: ${desdeVal} al ${hastaVal}  |  Emisión: ${dateStr}`, 12, 18);
          if (subtitle) { doc.setFontSize(7); setText([148,163,184]); doc.text(subtitle, W-12, 10.5, {align:'right'}); }
        }

        function footer(pageNo) {
          setLine(C.line); doc.line(M, H-9, W-M, H-9);
          doc.setFont('helvetica','normal'); doc.setFontSize(6.5); setText(C.muted);
          doc.text('Tráfico App  •  Reporte de Operaciones', M, H-4.5);
          doc.text(`Página ${pageNo}`, W-M, H-4.5, {align:'right'});
        }

        function sectionTitle(y, num, title, color=C.blue) {
          setFill(color); doc.roundedRect(M, y-5, 7, 7, 1.5, 1.5, 'F');
          doc.setFont('helvetica','bold'); doc.setFontSize(7.5); setText(C.white); doc.text(String(num), M+3.5, y, {align:'center'});
          doc.setFont('helvetica','bold'); doc.setFontSize(11); setText(C.navy); doc.text(title, M+11, y);
        }

        function card(x,y,w,h,label,value,color,sub='') {
          setFill(C.white); doc.roundedRect(x,y,w,h,2.5,2.5,'F');
          setLine(C.line); doc.roundedRect(x,y,w,h,2.5,2.5,'S');
          setFill(color); doc.roundedRect(x,y,2.2,h,1.1,1.1,'F');
          doc.setFont('helvetica','bold'); doc.setSize && doc.setSize(1);
          doc.setFontSize(6.2); setText(C.muted); doc.text(label.toUpperCase(), x+6, y+6);
          doc.setFontSize(16); setText(color); doc.text(String(value), x+6, y+15.5);
          if (sub) { doc.setFont('helvetica','normal'); doc.setFontSize(5.7); setText(C.muted); doc.text(sub, x+6, y+h-4); }
        }

        // ---------------- PÁGINA 1: RESUMEN EJECUTIVO ----------------
        header('REPORTE DE OPERACIONES', 'RESUMEN EJECUTIVO');
        sectionTitle(34, 1, 'Panorama general del periodo');

        let total=0, expo=0, impo=0, vacioExpo=0, vacioImpo=0, foraneo=0;
        (currentData || []).forEach(i => {
          total += Number(i.total)||0;
          expo += Number(i.expo)||0;
          impo += Number(i.impo)||0;
          vacioExpo += Number(i.vacioExpo)||0;
          vacioImpo += Number(i.vacioImpo)||0;
          foraneo += Number(i.foraneo)||0;
        });

        const pendientes = (pendingListData||[]).length;
        const transito = (transitoListData||[]).length;
        const operadores = (allOperatorsCache||[]).length || Object.keys(globalDriversMap||{}).length;
        const activos = expo+impo+foraneo;
        const vacios = vacioExpo+vacioImpo;

        // ---------- BLOQUE 1: KPIs ----------
        // Se reorganiza la página 1 en una cuadrícula limpia de 4 x 2.
        // Cada tarjeta usa ancho fijo y evita que textos largos se monten entre sí.
        const cards = [
          ['SALIDAS', total, C.blue, 'Servicios del periodo'],
          ['EXPORTACIÓN', expo, C.green, `${total ? Math.round(expo/total*100) : 0}% del total`],
          ['IMPORTACIÓN', impo, C.indigo, `${total ? Math.round(impo/total*100) : 0}% del total`],
          ['FORÁNEO', foraneo, C.purple, `${total ? Math.round(foraneo/total*100) : 0}% del total`],
          ['VACÍO EXPO', vacioExpo, C.red, 'Requiere seguimiento'],
          ['VACÍO IMPO', vacioImpo, C.red, 'Requiere seguimiento'],
          ['EN TRÁNSITO', transito, C.cyan, 'Servicios abiertos'],
          ['PENDIENTES', pendientes, C.amber, 'Sin salida registrada']
        ];

        const cardW = 64;
        const cardH = 23;
        const cardGap = 4;
        const cardX0 = M;
        const cardY0 = 41;

        cards.forEach((k,i)=>{
          const col=i%4, row=Math.floor(i/4);
          const x=cardX0+col*(cardW+cardGap);
          const y=cardY0+row*(cardH+cardGap);
          card(x,y,cardW,cardH,k[0],k[1],k[2],k[3]);
        });

        // ---------- BLOQUE 2: TRACTO VS CARRO ----------
        const tcPdf = {
          expo:{total:0,tracto:0,carro:0},
          impo:{total:0,tracto:0,carro:0},
          foraneo:{total:0,tracto:0,carro:0}
        };

        (rawTripsData||[]).forEach(t=>{
          if(!estaEnRangoDeFechas(t.fechaSalidaRaw)) return;
          const g=t.isExpo ? tcPdf.expo : (t.isImpo ? tcPdf.impo : (t.isForaneo ? tcPdf.foraneo : null));
          if(!g) return;

          g.total++;
          const tieneRemolque = typeof t.hasRemolque === 'boolean'
            ? t.hasRemolque
            : !!(t.remolque && ![
                'N/A','NA','N/D','S/R','SIN REMOLQUE','SIN CAJA',
                'SIN EQUIPO','NULL','UNDEFINED','-'
              ].includes(String(t.remolque).toUpperCase().replace(/\s+/g,' ').trim()));

          tieneRemolque ? g.carro++ : g.tracto++;
        });

        const tcPct=(n,t)=>t ? (n/t*100) : 0;

        sectionTitle(96, 2, 'Distribución Tracto vs Carro', C.blue);

        // Contenedor principal compacto.
        setFill(C.soft);
        doc.roundedRect(M,105,W-2*M,34,3,3,'F');

        const tcCards=[
          ['EXPORTACIÓN',tcPdf.expo,C.green],
          ['IMPORTACIÓN',tcPdf.impo,C.indigo],
          ['FORÁNEO',tcPdf.foraneo,C.purple]
        ];

        const tcBoxW = (W-2*M-16)/3;

        tcCards.forEach((item,i)=>{
          const [label,g,color]=item;
          const x=M+4+i*(tcBoxW+4);
          const y=109;

          setFill(C.white);
          doc.roundedRect(x,y,tcBoxW,26,2.5,2.5,'F');
          setLine(C.line);
          doc.roundedRect(x,y,tcBoxW,26,2.5,2.5,'S');

          doc.setFont('helvetica','bold');
          doc.setFontSize(7);
          setText(C.navy);
          doc.text(label,x+5,y+6);

          doc.setFont('helvetica','normal');
          doc.setFontSize(5.5);
          setText(C.muted);
          doc.text(`Total: ${g.total} servicios`,x+5,y+10.5);

          doc.setFont('helvetica','bold');
          doc.setFontSize(6);
          setText(C.blue);
          doc.text(`TRACTO ${g.tracto}  |  ${tcPct(g.tracto,g.total).toFixed(1)}%`,x+5,y+15.5);

          setText(C.amber);
          doc.text(`CARRO  ${g.carro}  |  ${tcPct(g.carro,g.total).toFixed(1)}%`,x+5,y+20.5);

          // Barra proporcional real.
          const barX=x+5, barY=y+22.2, barW=tcBoxW-10, barH=2.2;
          setFill([226,232,240]);
          doc.roundedRect(barX,barY,barW,barH,1,1,'F');

          if(g.total>0){
            const tractoW=barW*(g.tracto/g.total);
            setFill(C.blue);
            if(tractoW>0) doc.roundedRect(barX,barY,Math.max(0.8,tractoW),barH,1,1,'F');

            const carroW=barW*(g.carro/g.total);
            if(carroW>0){
              setFill(C.amber);
              doc.rect(barX+tractoW,barY,Math.max(0.8,carroW),barH,'F');
            }
          }
        });

        doc.setFont('helvetica','normal');
        doc.setFontSize(4.8);
        setText(C.muted);
        doc.text('Criterio: Carro = viaje con remolque/caja registrado  •  Tracto = viaje sin remolque/caja',M,143);

        // ---------- BLOQUE 3: LECTURA RÁPIDA ----------
        sectionTitle(151, 3, 'Indicadores de lectura rápida', C.teal);

        // Panel izquierdo: principales clientes.
        const maxClient = Math.max(...((currentData||[]).map(x=>Number(x.total)||0)), 1);
        const topClients = [...(currentData||[])]
          .sort((a,b)=>(Number(b.total)||0)-(Number(a.total)||0))
          .slice(0,5);

        const chartX=M, chartY=160, chartW=174, chartH=38;

        setFill(C.soft);
        doc.roundedRect(chartX,chartY,chartW,chartH,3,3,'F');

        doc.setFont('helvetica','bold');
        doc.setFontSize(8);
        setText(C.navy);
        doc.text('Clientes con mayor volumen', chartX+6, chartY+8);

        topClients.forEach((c,i)=>{
          const y=chartY+12.5+i*5.1;
          const val=Number(c.total)||0;
          const bw=(val/maxClient)*103;

          doc.setFont('helvetica','normal');
          doc.setFontSize(5.4);
          setText(C.slate);

          const name=String(c.cliente||'Sin cliente');
          doc.text(name.length>25 ? name.slice(0,25)+'…' : name, chartX+6, y+3.4);

          setFill([226,232,240]);
          doc.roundedRect(chartX+47,y,103,3.4,0.8,0.8,'F');

          setFill(C.blue);
          doc.roundedRect(chartX+47,y,Math.max(0.8,bw),3.4,0.8,0.8,'F');

          doc.setFont('helvetica','bold');
          doc.setFontSize(5.4);
          setText(C.navy);
          doc.text(String(val), chartX+157, y+3.4, {align:'right'});
        });

        // Panel derecho: estado operativo.
        const x2=194, y2=160, w2=91, h2=38;

        setFill(C.soft);
        doc.roundedRect(x2,y2,w2,h2,3,3,'F');

        doc.setFont('helvetica','bold');
        doc.setFontSize(8);
        setText(C.navy);
        doc.text('Estado operativo',x2+6,y2+8);

        const opRows=[
          ['Servicios registrados',total,C.blue],
          ['Servicios clasificados',activos,C.green],
          ['Movimientos vacío',vacios,C.red],
          ['Operadores identificados',operadores,C.indigo]
        ];

        opRows.forEach((r,i)=>{
          const yy=y2+9+i*7;

          setFill(C.white);
          doc.roundedRect(x2+6,yy,w2-12,5.5,1.2,1.2,'F');

          doc.setFont('helvetica','normal');
          doc.setFontSize(5.1);
          setText(C.slate);
          doc.text(r[0],x2+10,yy+3.7);

          doc.setFont('helvetica','bold');
          setText(r[2]);
          doc.text(String(r[1]),x2+w2-10,yy+3.7,{align:'right'});
        });

        footer(1);

        // ---------------- PÁGINA 2: CLIENTES ----------------
        doc.addPage(); header('REPORTE DE OPERACIONES', 'DETALLE POR CLIENTE');
        sectionTitle(34, 2, 'Servicios por cliente y tipo de operación');
        const columnsResumen=[
          {header:'Cliente',dataKey:'cliente'},{header:'Total',dataKey:'total'},{header:'Expo',dataKey:'expo'},
          {header:'Impo',dataKey:'impo'},{header:'Vacío Expo',dataKey:'vacioExpo'},{header:'Vacío Impo',dataKey:'vacioImpo'},{header:'Foráneo',dataKey:'foraneo'}
        ];
        const bodyResumen=(currentData||[]).map(i=>({cliente:i.cliente,total:i.total,expo:i.expo,impo:i.impo,vacioExpo:i.vacioExpo,vacioImpo:i.vacioImpo,foraneo:i.foraneo}));
        const foot=[{cliente:`TOTAL GENERAL • ${(currentData||[]).length} CLIENTES`,total,expo,impo,vacioExpo,vacioImpo,foraneo}];
        doc.autoTable({startY:41,margin:{left:M,right:M,bottom:14},columns:columnsResumen,
          body:bodyResumen.length?bodyResumen:[{cliente:'Sin registros en el rango',total:0,expo:0,impo:0,vacioExpo:0,vacioImpo:0,foraneo:0}],foot:bodyResumen.length?foot:[],
          theme:'plain',styles:{font:'helvetica',fontSize:7.2,cellPadding:2.2,textColor:C.slate,lineColor:C.line,lineWidth:.1},
          headStyles:{fillColor:C.navy,textColor:C.white,fontStyle:'bold',fontSize:7.2,halign:'center',cellPadding:2.5},
          bodyStyles:{fillColor:C.white},alternateRowStyles:{fillColor:[248,250,252]},
          footStyles:{fillColor:[241,245,249],textColor:C.navy,fontStyle:'bold',halign:'center'},
          columnStyles:{cliente:{halign:'left',fontStyle:'bold'},total:{halign:'center',fontStyle:'bold',textColor:C.blue},expo:{halign:'center',textColor:C.green},impo:{halign:'center',textColor:C.indigo},vacioExpo:{halign:'center',textColor:C.red},vacioImpo:{halign:'center',textColor:C.red},foraneo:{halign:'center',textColor:C.purple}}
        });
        footer(2);

        // ---------------- PÁGINA 3: CONTROL OPERATIVO ----------------
        doc.addPage(); header('REPORTE DE OPERACIONES', 'CONTROL OPERATIVO');
        sectionTitle(34, 3, 'En tránsito y pendientes', C.cyan);
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); setText(C.cyan); doc.text(`EN TRÁNSITO  •  ${transito}`, M, 42);
        const columnsTransito=[{header:'Salida',dataKey:'fechaSalida'},{header:'Viaje / Folio',dataKey:'folio'},{header:'Cliente',dataKey:'cliente'},{header:'Operador',dataKey:'operador'},{header:'Unidad / Remolque',dataKey:'unidad'},{header:'Tipo / Clasificación',dataKey:'tipo'},{header:'Estatus',dataKey:'estatus'}];
        doc.autoTable({startY:46,margin:{left:M,right:M,bottom:14},columns:columnsTransito,
          body:transitoListData.length?transitoListData:[{fechaSalida:'-',folio:'-',cliente:'Sin viajes en tránsito',operador:'-',unidad:'-',tipo:'-',estatus:'-'}],
          theme:'plain',styles:{fontSize:6.5,cellPadding:1.7,valign:'middle',textColor:C.slate,overflow:'ellipsize',lineColor:C.line,lineWidth:.1},
          headStyles:{fillColor:C.cyan,textColor:C.white,fontStyle:'bold',fontSize:6.5,halign:'center'},alternateRowStyles:{fillColor:[240,253,250]},
          columnStyles:{folio:{fontStyle:'bold',textColor:C.cyan},estatus:{fontStyle:'bold',halign:'center'},fechaSalida:{halign:'center'}}
        });
        let y=doc.lastAutoTable.finalY+9;
        sectionTitle(y, 3, 'Pendientes / sin salida registrada', C.amber);
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); setText(C.amber); doc.text(`PENDIENTES  •  ${pendientes}`, M+11, y+9);
        const columnsPend=[{header:'Viaje / Folio',dataKey:'folio'},{header:'Cliente',dataKey:'cliente'},{header:'Tipo / Clasificación',dataKey:'tipo'},{header:'Operador',dataKey:'operador'},{header:'Unidad / Tractor',dataKey:'unidad'},{header:'Estatus',dataKey:'estatus'}];
        doc.autoTable({startY:y+13,margin:{left:M,right:M,bottom:14},columns:columnsPend,
          body:pendingListData.length?pendingListData:[{folio:'-',cliente:'Sin viajes pendientes',tipo:'-',operador:'-',unidad:'-',estatus:'-'}],
          theme:'plain',styles:{fontSize:6.5,cellPadding:1.8,valign:'middle',textColor:C.slate,lineColor:C.line,lineWidth:.1},
          headStyles:{fillColor:C.amber,textColor:C.white,fontStyle:'bold',fontSize:6.5,halign:'center'},alternateRowStyles:{fillColor:[255,251,235]},
          columnStyles:{folio:{fontStyle:'bold',textColor:C.amber},estatus:{fontStyle:'bold',halign:'center'}}
        });
        footer(3);

        // ---------------- PÁGINA 4: OPERADORES ----------------
        doc.addPage(); header('REPORTE DE OPERACIONES', 'DESEMPEÑO DE OPERADORES');
        sectionTitle(34, 4, 'Top de operadores por volumen de servicios', C.indigo);
        const drivers=Object.values(globalDriversMap||{}).filter(d=>(Number(d.totalValidosOperador)||0)>0);
        const topMas=[...drivers].sort((a,b)=>(b.totalValidosOperador||0)-(a.totalValidosOperador||0)).slice(0,10);
        const topMenos=[...drivers].sort((a,b)=>(a.totalValidosOperador||0)-(b.totalValidosOperador||0)).slice(0,10);
        const colsTop=[{header:'#',dataKey:'p1'},{header:'Operador',dataKey:'n1'},{header:'Expo',dataKey:'e1'},{header:'Impo',dataKey:'i1'},{header:'Foráneo',dataKey:'f1'},{header:'Total',dataKey:'t1'},
                       {header:'#',dataKey:'p2'},{header:'Operador',dataKey:'n2'},{header:'Expo',dataKey:'e2'},{header:'Impo',dataKey:'i2'},{header:'Foráneo',dataKey:'f2'},{header:'Total',dataKey:'t2'}];
        const rows=[]; for(let i=0;i<Math.max(topMas.length,topMenos.length,1);i++) rows.push({
          p1:topMas[i]?i+1:'',n1:topMas[i]?.nombre||'',e1:topMas[i]?.expo||'',i1:topMas[i]?.impo||'',f1:topMas[i]?.foraneo||'',t1:topMas[i]?.totalValidosOperador||'',
          p2:topMenos[i]?i+1:'',n2:topMenos[i]?.nombre||'',e2:topMenos[i]?.expo||'',i2:topMenos[i]?.impo||'',f2:topMenos[i]?.foraneo||'',t2:topMenos[i]?.totalValidosOperador||''
        });
        doc.autoTable({startY:41,margin:{left:M,right:M,bottom:14},columns:colsTop,body:rows,theme:'plain',styles:{fontSize:6.3,cellPadding:1.8,textColor:C.slate,lineColor:C.line,lineWidth:.1},
          headStyles:{fillColor:C.indigo,textColor:C.white,fontStyle:'bold',fontSize:6.2,halign:'center'},alternateRowStyles:{fillColor:[248,250,252]},
          columnStyles:{n1:{fontStyle:'bold'},n2:{fontStyle:'bold'},t1:{fontStyle:'bold',textColor:C.blue},t2:{fontStyle:'bold',textColor:C.indigo},p1:{halign:'center'},p2:{halign:'center'}}
        });
        y=doc.lastAutoTable.finalY+10;
        sectionTitle(y, 4, 'Lectura del ranking', C.teal);
        doc.setFont('helvetica','normal'); doc.setFontSize(7); setText(C.slate);
        const leader=topMas[0]?.nombre||'Sin datos', leaderVal=topMas[0]?.totalValidosOperador||0;
        const low=topMenos[0]?.nombre||'Sin datos', lowVal=topMenos[0]?.totalValidosOperador||0;
        doc.text(`Mayor volumen: ${leader} (${leaderVal} servicios).`, M+11, y+9);
        doc.text(`Menor volumen dentro de operadores con actividad: ${low} (${lowVal} servicios).`, M+11, y+15);
        footer(4);
        // ---------------- PÁGINA 5: EXCEPCIONES ----------------
        doc.addPage(); header('REPORTE DE OPERACIONES', 'EXCEPCIONES Y SEGUIMIENTO');
        sectionTitle(34, 5, 'Servicios clasificados como VACÍO', C.red);
        const viajesVacios=rawTripsData.filter(t=>estaEnRangoDeFechas(t.fechaSalidaRaw)&&t.isVacio);
        const colsV=[{header:'Viaje / Folio',dataKey:'viaje'},{header:'Cliente',dataKey:'cliente'},{header:'Operador',dataKey:'operador'},{header:'Unidad',dataKey:'camion'},{header:'Remolque',dataKey:'remolque'},{header:'Clasificación',dataKey:'clasificacion'}];
        doc.autoTable({startY:41,margin:{left:M,right:M,bottom:14},columns:colsV,body:viajesVacios.map(t=>({viaje:t.viaje,cliente:t.cliente,operador:t.operador,camion:t.camion,remolque:t.remolque,clasificacion:t.clasificacion})),
          theme:'plain',styles:{fontSize:6.5,cellPadding:1.8,textColor:C.slate,lineColor:C.line,lineWidth:.1},headStyles:{fillColor:C.red,textColor:C.white,fontStyle:'bold',halign:'center'},alternateRowStyles:{fillColor:[255,241,242]},
          columnStyles:{viaje:{fontStyle:'bold',textColor:C.red}} ,
          didDrawPage:()=>{}
        });
        if(!viajesVacios.length) doc.text('Sin registros con clasificación VACÍO en el rango seleccionado.',M,49);
        y=(doc.lastAutoTable?.finalY||55)+9;
        if(y>175){ doc.addPage(); header('REPORTE DE OPERACIONES','EXCEPCIONES'); y=34; }
        sectionTitle(y, 5, 'Servicios clasificados como QUÍMICO', C.teal);
        const viajesQuimicos=rawTripsData.filter(t=>estaEnRangoDeFechas(t.fechaSalidaRaw)&&t.isQuimico);
        const colsQ=[{header:'Viaje / Folio',dataKey:'viaje'},{header:'Cliente',dataKey:'cliente'},{header:'Operador',dataKey:'operador'},{header:'Unidad',dataKey:'camion'},{header:'Remolque',dataKey:'remolque'},{header:'Clasificación',dataKey:'clasificacion'}];
        doc.autoTable({startY:y+7,margin:{left:M,right:M,bottom:14},columns:colsQ,body:viajesQuimicos.map(t=>({viaje:t.viaje,cliente:t.cliente,operador:t.operador,camion:t.camion,remolque:t.remolque,clasificacion:t.clasificacion})),
          theme:'plain',styles:{fontSize:6.5,cellPadding:1.8,textColor:C.slate,lineColor:C.line,lineWidth:.1},headStyles:{fillColor:C.teal,textColor:C.white,fontStyle:'bold',halign:'center'},alternateRowStyles:{fillColor:[240,253,250]},columnStyles:{viaje:{fontStyle:'bold',textColor:C.teal}}});
        if(!viajesQuimicos.length) doc.text('Sin registros con clasificación QUÍMICO en el rango seleccionado.',M,y+16);
        footer(5);

        doc.save(`Reporte_Operaciones_Ejecutivo_${desdeVal}_al_${hastaVal}.pdf`);
        showStatus('<strong>Reporte de Operaciones Ejecutivo (PDF)</strong> generado exitosamente.', 'success');
      } catch (err) {
        console.error('Error al generar Reporte de Operaciones:', err);
        showStatus('Error interno al generar el Reporte de Operaciones. Revisa la consola del navegador.', 'error');
      }
    }

    function exportReporteGerencialSemanalPDF() {
      if (!currentData || currentData.length === 0) {
        showStatus('No existen datos cargados para generar el Reporte Gerencial Semanal.', 'error');
        return;
      }

      showStatus('Generando <strong>Reporte Gerencial Semanal (PDF)</strong>...', 'info');

      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
        const desdeVal = document.getElementById('fechaDesde').value;
        const hastaVal = document.getElementById('fechaHasta').value;

        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, 297, 24, 'F');

        doc.setFontSize(15);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text("REPORTE GERENCIAL SEMANAL - OPERACIONES LOGÍSTICAS", 14, 15);

        doc.setFontSize(9);
        doc.setTextColor(236, 253, 245);
        doc.setFont('helvetica', 'normal');
        doc.text(`Rango: ${desdeVal} al ${hastaVal} | Emisión: ${dateStr}`, 180, 15);

        let finalY = 30;

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text("1. KPIs de Viajes y Resumen Detallado por Cliente (Salidas Realizadas)", 14, finalY);

        let semSumTotal = 0, semSumExpo = 0, semSumImpo = 0, semSumVacioExpo = 0, semSumVacioImpo = 0, semSumForaneo = 0;
        currentData.forEach(item => {
          semSumTotal += item.total || 0;
          semSumExpo += item.expo || 0;
          semSumImpo += item.impo || 0;
          semSumVacioExpo += item.vacioExpo || 0;
          semSumVacioImpo += item.vacioImpo || 0;
          semSumForaneo += item.foraneo || 0;
        });

        const columnsResumen = [
          { header: "Cliente", dataKey: "cliente" },
          { header: "Total Salidas Realizadas", dataKey: "total" },
          { header: "Expo", dataKey: "expo" },
          { header: "Impo", dataKey: "impo" },
          { header: "Vacío Expo", dataKey: "vacioExpo" },
          { header: "Vacío Impo", dataKey: "vacioImpo" },
          { header: "Foráneo", dataKey: "foraneo" }
        ];

        const bodyResumen = currentData.map(item => ({
          cliente: item.cliente,
          total: item.total,
          expo: item.expo,
          impo: item.impo,
          vacioExpo: item.vacioExpo,
          vacioImpo: item.vacioImpo,
          foraneo: item.foraneo
        }));

        const footResumen = [{
          cliente: `TOTAL GENERAL (${currentData.length} clientes)`,
          total: semSumTotal,
          expo: semSumExpo,
          impo: semSumImpo,
          vacioExpo: semSumVacioImpo,
          vacioImpo: semSumVacioImpo,
          foraneo: semSumForaneo
        }];

        doc.autoTable({
          startY: finalY + 4,
          columns: columnsResumen,
          body: bodyResumen,
          foot: footResumen,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center' },
          footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            cliente: { fontStyle: 'bold', halign: 'left' },
            total: { fontStyle: 'bold', halign: 'center', textColor: [16, 185, 129] }
          }
        });

        doc.addPage();
        finalY = 15;

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text("2. Cumplimiento de Operadores (Servicios de Exportación e Importación - Meta: 20 Servicios)", 14, finalY);

        const META_SERVICIO = 20;
        const operadoresCumplimientoList = [];

        Object.values(globalDriversMap).forEach(d => {
          const viajesExpoImpoOp = rawTripsData.filter(t => 
            t.operador === d.nombre && 
            estaEnRangoDeFechas(t.fechaSalidaRaw) && 
            (t.isExpo || t.isImpo) && 
            !t.isVacio
          );

          if (viajesExpoImpoOp.length > 0) {
            const unidadesStr = Array.from(d.unidadesSet).join(', ') || 'N/A';
            const totalExpoImpo = viajesExpoImpoOp.length;
            const porcentaje = Math.round((totalExpoImpo / META_SERVICIO) * 100);

            let colorCumplimiento = [220, 38, 38];
            let etiquetaEstado = 'Bajo (<50%)';
            if (porcentaje >= 100) {
              colorCumplimiento = [5, 150, 105];
              etiquetaEstado = 'Cumplido (>=100%)';
            } else if (porcentaje >= 75) {
              colorCumplimiento = [13, 148, 136];
              etiquetaEstado = 'Óptimo (75-99%)';
            } else if (porcentaje >= 50) {
              colorCumplimiento = [217, 119, 6];
              etiquetaEstado = 'Regular (50-74%)';
            }

            operadoresCumplimientoList.push({
              operador: d.nombre,
              unidad: unidadesStr,
              servicios: totalExpoImpo,
              meta: META_SERVICIO,
              porcentaje: `${porcentaje}%`,
              rawPorcentaje: porcentaje,
              estado: etiquetaEstado,
              color: colorCumplimiento
            });
          }
        });

        operadoresCumplimientoList.sort((a, b) => b.rawPorcentaje - a.rawPorcentaje);

        const columnsCumplimiento = [
          { header: "Operador", dataKey: "operador" },
          { header: "Unidad(es)", dataKey: "unidad" },
          { header: "Servicios Realizados (Expo/Impo)", dataKey: "servicios" },
          { header: "Meta", dataKey: "meta" },
          { header: "% Cumplimiento", dataKey: "porcentaje" },
          { header: "Calificación / Estatus", dataKey: "estado" }
        ];

        doc.autoTable({
          startY: finalY + 4,
          columns: columnsCumplimiento,
          body: operadoresCumplimientoList.length > 0 ? operadoresCumplimientoList : [{ operador: "Sin operadores con servicios de Expo/Impo en el rango", unidad: "-", servicios: 0, meta: META_SERVICIO, porcentaje: "0%", estado: "Sin datos" }],
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2.2, valign: 'middle' },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            operador: { fontStyle: 'bold', halign: 'left' },
            unidad: { fontStyle: 'italic', halign: 'center' },
            servicios: { fontStyle: 'bold', halign: 'center' },
            meta: { halign: 'center' },
            porcentaje: { fontStyle: 'bold', halign: 'center' },
            estado: { fontStyle: 'bold', halign: 'center' }
          },
          didParseCell: function(data) {
            if (data.section === 'body' && data.column.dataKey === 'porcentaje') {
              const rowIdx = data.row.index;
              if (operadoresCumplimientoList[rowIdx]) {
                const rgb = operadoresCumplimientoList[rowIdx].color;
                data.cell.styles.textColor = rgb;
              }
            }
          }
        });

        doc.addPage();
        finalY = 15;

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text("3. Listado de Servicios Foráneos (Agrupados por Operador, Cliente y Unidad)", 14, finalY);

        const viajesForaneosList = rawTripsData.filter(t => estaEnRangoDeFechas(t.fechaSalidaRaw) && t.isForaneo);

        const foraneosAgrupadosMap = {};
        viajesForaneosList.forEach(t => {
          const key = `${t.operador}___${t.cliente}___${t.camion}`;
          if (!foraneosAgrupadosMap[key]) {
            foraneosAgrupadosMap[key] = {
              operador: t.operador,
              cliente: t.cliente,
              unidad: t.camion,
              viajesCount: 0
            };
          }
          foraneosAgrupadosMap[key].viajesCount++;
        });

        const bodyForaneos = Object.values(foraneosAgrupadosMap).map(item => ({
          operador: item.operador,
          cliente: item.cliente,
          unidad: item.unidad,
          viajesCount: item.viajesCount
        }));

        bodyForaneos.sort((a, b) => b.viajesCount - a.viajesCount);

        const columnsForaneos = [
          { header: "Operador", dataKey: "operador" },
          { header: "Cliente", dataKey: "cliente" },
          { header: "Unidad / Tractor", dataKey: "unidad" },
          { header: "Número de Viajes Foráneos", dataKey: "viajesCount" }
        ];

        doc.autoTable({
          startY: finalY + 4,
          columns: columnsForaneos,
          body: bodyForaneos.length > 0 ? bodyForaneos : [{ operador: "-", cliente: "Sin servicios foráneos registrados en el rango", unidad: "-", viajesCount: 0 }],
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2.2, valign: 'middle' },
          headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            operador: { fontStyle: 'bold', halign: 'left' },
            cliente: { halign: 'left' },
            unidad: { halign: 'center', fontStyle: 'mono' },
            viajesCount: { fontStyle: 'bold', halign: 'center', textColor: [147, 51, 234] }
          }
        });

        doc.save(`Reporte_Gerencial_Semanal_${desdeVal}_al_${hastaVal}.pdf`);
        showStatus('<strong>Reporte Gerencial Semanal (PDF)</strong> generado exitosamente.', 'success');

      } catch (err) {
        console.error("Error al generar Reporte Gerencial Semanal:", err);
        showStatus('Error interno al generar el Reporte Gerencial Semanal.', 'error');
      }
    }
  
    /* ============================================================
       NUEVA FUNCIONALIDAD: CONTROL DE VIGENCIA 30 DÍAS
       Filtra registros sin Shipper y sin Fecha de Arribo y calcula
       días desde Fecha de Aceptación hasta la fecha actual.
       ============================================================ */
    let vigencia30Data = [];
    const VIGENCIA_MAX_DIAS = 30;

    window.addEventListener('DOMContentLoaded', () => {
      actualizarFechaVigencia30();
      const input = document.getElementById('vigenciaExcelInput');
      if (input) input.addEventListener('change', handleVigencia30File, false);
    });

    function actualizarFechaVigencia30() {
      const el = document.getElementById('vigencia30FechaActual');
      if (!el) return;
      el.innerText = `Hoy: ${formatearFechaMX(new Date())}`;
    }

    function formatearFechaMX(fecha) {
      if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return '--';
      return fecha.toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    }

    function normalizarTextoVigencia(valor) {
      if (valor === null || valor === undefined) return '';
      const s = String(valor).trim();
      if (!s || /^(null|undefined|nan|n\/a)$/i.test(s)) return '';
      return s;
    }

    function parseFechaVigencia(valor) {
      if (valor instanceof Date) {
        return isNaN(valor.getTime()) ? null : valor;
      }

      const s = normalizarTextoVigencia(valor);
      if (!s) return null;

      // Excel serial date
      if (!isNaN(s) && Number(s) > 30000) {
        const d = new Date((Number(s) - 25569) * 86400 * 1000);
        return isNaN(d.getTime()) ? null : d;
      }

      // MM/DD/YY HH:MM AM/PM, como viene en el reporte JFT
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?$/i);
      if (m) {
        let month = parseInt(m[1], 10);
        let day = parseInt(m[2], 10);
        let year = parseInt(m[3], 10);
        if (year < 100) year += 2000;
        let hour = m[4] ? parseInt(m[4], 10) : 0;
        const minute = m[5] ? parseInt(m[5], 10) : 0;
        const ampm = m[6] ? m[6].toUpperCase() : '';
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        const d = new Date(year, month - 1, day, hour, minute, 0, 0);
        return isNaN(d.getTime()) ? null : d;
      }

      // YYYY-MM-DD / DD-MM-YYYY / MM-DD-YYYY
      const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (ymd) {
        const d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
        return isNaN(d.getTime()) ? null : d;
      }

      const parsed = Date.parse(s);
      return isNaN(parsed) ? null : new Date(parsed);
    }

    function normalizarClaveVigencia(texto) {
      return String(texto || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function obtenerColumnaVigencia(row, nombres) {
      const keys = Object.keys(row || {});
      const normalizadas = keys.map(k => ({
        original: k,
        normalizada: normalizarClaveVigencia(k)
      }));

      for (const nombre of nombres) {
        const buscada = normalizarClaveVigencia(nombre);
        const exacta = normalizadas.find(k => k.normalizada === buscada);
        if (exacta) return row[exacta.original];
      }

      // Coincidencia parcial como respaldo para encabezados de reportes.
      for (const nombre of nombres) {
        const buscada = normalizarClaveVigencia(nombre);
        const parcial = normalizadas.find(k => k.normalizada.includes(buscada) || buscada.includes(k.normalizada));
        if (parcial) return row[parcial.original];
      }
      return '';
    }

    function esVacioVigencia(valor) {
      return normalizarTextoVigencia(valor) === '';
    }

    async function handleVigencia30File(e) {
      const file = e.target.files[0];
      if (!file) return;

      showStatus(`Procesando <strong>${file.name}</strong> para el control de vigencia de 30 días...`);

      try {
        const buffer = await file.arrayBuffer();
        let rows = [];

        // Primer intento: SheetJS, igual que el dashboard existente.
        try {
          const workbook = XLSX.read(new Uint8Array(buffer), {
            type: 'array',
            cellDates: true,
            raw: false
          });

          workbook.SheetNames.forEach(sheetName => {
            const ws = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
            if (data.length) rows.push(...data);
          });
        } catch (sheetErr) {
          console.warn('SheetJS no pudo leer el archivo; se intentará como tabla HTML.', sheetErr);
        }

        // Respaldo para reportes .xls que en realidad son HTML, como el reporte JFT.
        if (!rows.length) {
          const decoder = new TextDecoder('windows-1252');
          const htmlText = decoder.decode(buffer);
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          const table = doc.querySelector('table');

          if (table) {
            const trs = Array.from(table.querySelectorAll('tr'));
            if (trs.length > 1) {
              const headers = Array.from(trs[0].querySelectorAll('th,td')).map(x => x.textContent.trim());
              rows = trs.slice(1).map(tr => {
                const cells = Array.from(tr.querySelectorAll('th,td')).map(x => x.textContent.trim());
                const obj = {};
                headers.forEach((h, i) => {
                  if (h) obj[h] = cells[i] ?? '';
                });
                return obj;
              }).filter(r => Object.keys(r).length);
            }
          }
        }

        if (!rows.length) {
          throw new Error('No se encontraron registros en el archivo.');
        }

        procesarVigencia30(rows, file.name);
      } catch (err) {
        console.error('Error en control de vigencia:', err);
        showStatus('No fue posible leer el Excel para el control de vigencia. Verifica que sea un archivo válido.', 'error');
      } finally {
        e.target.value = '';
      }
    }

    function procesarVigencia30(rows, nombreArchivo) {
      const hoy = new Date();
      const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      vigencia30Data = [];

      rows.forEach(row => {
        const trip = normalizarTextoVigencia(obtenerColumnaVigencia(row, [
          'Trip Number', 'TripNumber', 'Viaje', 'No Viaje', 'Folio', 'Trip'
        ]));

        const type = normalizarTextoVigencia(obtenerColumnaVigencia(row, [
          'Type', 'Tipo', 'Tipo Viaje'
        ]));

        const status = normalizarTextoVigencia(obtenerColumnaVigencia(row, [
          'Status', 'Estatus', 'Estado'
        ]));

        const driver = normalizarTextoVigencia(obtenerColumnaVigencia(row, [
          'Driver', 'Operador', 'Conductor'
        ]));

        const conv = normalizarTextoVigencia(obtenerColumnaVigencia(row, [
          'Conv.', 'Conv', 'Conv'
        ]));

        const equip = normalizarTextoVigencia(obtenerColumnaVigencia(row, [
          'Equip.', 'Equip', 'Equipo', 'Remolque', 'Caja'
        ]));

        const shipper = normalizarTextoVigencia(obtenerColumnaVigencia(row, [
          'Shipper', 'SHIPPER'
        ]));

        const acceptedRaw = obtenerColumnaVigencia(row, [
          'Accepted', 'Aceptado', 'Aceptación', 'Fecha Aceptación', 'FechaAceptacion'
        ]);

        const arrivedRaw = obtenerColumnaVigencia(row, [
          'Arrived', 'Arribo', 'Llegada', 'Fecha Arribo', 'FechaLlegada'
        ]);

        // Ignorar filas sin viaje identificable.
        if (!trip && !acceptedRaw && !shipper && !arrivedRaw) return;

        // REGLA SOLICITADA:
        // solo mostrar registros SIN SHIPPER Y SIN FECHA DE ARRIBO.
        if (!esVacioVigencia(shipper) || !esVacioVigencia(arrivedRaw)) return;

        const acceptedDate = parseFechaVigencia(acceptedRaw);
        if (!acceptedDate) return;

        const acceptedInicio = new Date(
          acceptedDate.getFullYear(),
          acceptedDate.getMonth(),
          acceptedDate.getDate()
        );

        const diffMs = hoyInicio.getTime() - acceptedInicio.getTime();
        const dias = Math.floor(diffMs / 86400000);

        let estadoVigencia = 'VIGENTE';
        if (dias > VIGENCIA_MAX_DIAS) {
          estadoVigencia = 'VENCIDO';
        } else if (dias >= 25) {
          estadoVigencia = 'POR_VENCER';
        }

        vigencia30Data.push({
          trip: trip || 'N/A',
          type: type || 'N/A',
          status: status || 'N/A',
          driver: driver || 'N/A',
          conv: conv || 'N/A',
          equip: equip || 'N/A',
          shipper: shipper || 'SIN SHIPPER',
          accepted: acceptedDate,
          arrived: 'SIN ARRIBO',
          dias,
          estadoVigencia
        });
      });

      // Más antiguos primero para dar prioridad a los que están por vencer/vencidos.
      vigencia30Data.sort((a, b) => b.dias - a.dias);

      renderVigencia30(vigencia30Data);
      actualizarFechaVigencia30();

      showStatus(
        `<strong>Control de Vigencia 30 Días</strong> procesado: ${vigencia30Data.length} registros sin Shipper y sin Fecha de Arribo encontrados en <strong>${nombreArchivo}</strong>.`,
        'success'
      );

      const section = document.getElementById('vigencia30Section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      abrirVigencia30Modal();
    }

    function renderVigencia30(lista) {
      const body = document.getElementById('vigencia30TableBody');
      const badge = document.getElementById('vigencia30Badge');
      const total = document.getElementById('vigencia30Total');
      const vigentes = document.getElementById('vigencia30Vigentes');
      const porVencer = document.getElementById('vigencia30PorVencer');
      const vencidos = document.getElementById('vigencia30Vencidos');

      if (!body) return;

      const countVigentes = vigencia30Data.filter(x => x.estadoVigencia === 'VIGENTE').length;
      const countPorVencer = vigencia30Data.filter(x => x.estadoVigencia === 'POR_VENCER').length;
      const countVencidos = vigencia30Data.filter(x => x.estadoVigencia === 'VENCIDO').length;

      badge.innerText = `${vigencia30Data.length} Registros`;
      total.innerText = vigencia30Data.length.toLocaleString();
      vigentes.innerText = countVigentes.toLocaleString();
      porVencer.innerText = countPorVencer.toLocaleString();
      vencidos.innerText = countVencidos.toLocaleString();

      body.innerHTML = '';

      if (!lista.length) {
        body.innerHTML = `<tr><td colspan="11" class="py-8 text-center text-slate-400">No existen registros que cumplan: <strong>sin Shipper + sin Fecha de Arribo</strong>.</td></tr>`;
        return;
      }

      lista.forEach(item => {
        const tr = document.createElement('tr');
        let rowClass = 'hover:bg-slate-50 transition border-b border-slate-100';

        let badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        let estadoTexto = `DENTRO DE 30 DÍAS · ${VIGENCIA_MAX_DIAS - item.dias} días restantes`;

        if (item.estadoVigencia === 'POR_VENCER') {
          badgeClass = 'bg-amber-100 text-amber-800 border border-amber-200';
          estadoTexto = `PRÓXIMO A VENCER · ${Math.max(0, VIGENCIA_MAX_DIAS - item.dias)} días restantes`;
          rowClass = 'bg-amber-50/40 hover:bg-amber-50 transition border-b border-amber-100';
        }

        if (item.estadoVigencia === 'VENCIDO') {
          badgeClass = 'bg-red-100 text-red-800 border border-red-200';
          const exceso = item.dias - VIGENCIA_MAX_DIAS;
          estadoTexto = `VENCIDO · ${exceso} día${exceso === 1 ? '' : 's'} fuera de vigencia`;
          rowClass = 'bg-red-50/50 hover:bg-red-50 transition border-b border-red-100';
        }

        tr.className = rowClass;
        tr.innerHTML = `
          <td class="py-2.5 px-3 font-bold text-slate-900">${escapeHtmlVigencia(item.trip)}</td>
          <td class="py-2.5 px-3 text-slate-700">${escapeHtmlVigencia(item.type)}</td>
          <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${escapeHtmlVigencia(item.status)}</span></td>
          <td class="py-2.5 px-3 font-medium text-slate-800">${escapeHtmlVigencia(item.driver)}</td>
          <td class="py-2.5 px-3 font-mono text-xs text-slate-700">${escapeHtmlVigencia(item.conv)}</td>
          <td class="py-2.5 px-3 font-mono text-xs text-slate-700">${escapeHtmlVigencia(item.equip)}</td>
          <td class="py-2.5 px-3 font-semibold text-rose-700">SIN SHIPPER</td>
          <td class="py-2.5 px-3 font-semibold text-slate-700">${formatearFechaHoraVigencia(item.accepted)}</td>
          <td class="py-2.5 px-3 font-semibold text-red-600">SIN ARRIBO</td>
          <td class="py-2.5 px-3 text-center">
            <span class="inline-flex min-w-10 justify-center px-2 py-1 rounded-md font-black ${item.dias > VIGENCIA_MAX_DIAS ? 'bg-red-600 text-white' : item.dias >= 25 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}">
              ${item.dias}
            </span>
          </td>
          <td class="py-2.5 px-3 text-center">
            <span class="inline-flex whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold ${badgeClass}">
              ${estadoTexto}
            </span>
          </td>
        `;
        body.appendChild(tr);
      });
    }

    function formatearFechaHoraVigencia(fecha) {
      if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return '--';
      return fecha.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    function escapeHtmlVigencia(valor) {
      return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }


    function abrirVigencia30Modal() {
      const modal = document.getElementById('vigencia30Modal');
      if (!modal) return;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      document.getElementById('vigencia30ModalSub').innerText = `Fecha de corte: ${formatearFechaMX(new Date())} · Registros sin Shipper y sin Arribo`;
      renderVigencia30Modal();
    }

    function cerrarVigencia30Modal() {
      const modal = document.getElementById('vigencia30Modal');
      if (modal) modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    function renderVigencia30Modal() {
      const body = document.getElementById('vigencia30ModalBody');
      if (!body) return;
      const q = (document.getElementById('modalVigSearch')?.value || '').toLowerCase().trim();
      const filtro = document.getElementById('modalVigFilter')?.value || 'TODOS';
      const lista = vigencia30Data.filter(item => {
        const texto = [item.trip,item.type,item.status,item.driver,item.conv,item.equip].join(' ').toLowerCase();
        return (!q || texto.includes(q)) && (filtro === 'TODOS' || item.estadoVigencia === filtro);
      });
      document.getElementById('modalVigTotal').innerText = vigencia30Data.length;
      document.getElementById('modalVigOk').innerText = vigencia30Data.filter(x=>x.estadoVigencia==='VIGENTE').length;
      document.getElementById('modalVigWarn').innerText = vigencia30Data.filter(x=>x.estadoVigencia==='POR_VENCER').length;
      document.getElementById('modalVigBad').innerText = vigencia30Data.filter(x=>x.estadoVigencia==='VENCIDO').length;
      body.innerHTML = '';
      if (!lista.length) { body.innerHTML='<tr><td colspan="11" class="p-10 text-center text-slate-400">No hay registros para el filtro seleccionado.</td></tr>'; return; }
      lista.forEach(item => {
        let cls='bg-white hover:bg-slate-50'; let badge='bg-emerald-100 text-emerald-800 border-emerald-200'; let text=`DENTRO DE 30 · ${Math.max(0,30-item.dias)} restantes`;
        if(item.estadoVigencia==='POR_VENCER'){cls='bg-amber-50';badge='bg-amber-100 text-amber-800 border-amber-200';text=`PRÓXIMO A VENCER · ${Math.max(0,30-item.dias)} restantes`;}
        if(item.estadoVigencia==='VENCIDO'){cls='bg-red-50';badge='bg-red-100 text-red-800 border-red-200';text=`VENCIDO · ${item.dias-30} días fuera`;}
        body.insertAdjacentHTML('beforeend',`<tr class="${cls} border-b border-slate-100">
          <td class="p-3 font-black text-slate-900">${escapeHtmlVigencia(item.trip)}</td><td class="p-3">${escapeHtmlVigencia(item.type)}</td><td class="p-3">${escapeHtmlVigencia(item.status)}</td><td class="p-3 font-semibold">${escapeHtmlVigencia(item.driver)}</td><td class="p-3 font-mono">${escapeHtmlVigencia(item.conv)}</td><td class="p-3 font-mono">${escapeHtmlVigencia(item.equip)}</td><td class="p-3 font-bold text-rose-700">SIN SHIPPER</td><td class="p-3 font-semibold">${formatearFechaHoraVigencia(item.accepted)}</td><td class="p-3 font-bold text-red-600">SIN ARRIBO</td><td class="p-3 text-center"><span class="px-2 py-1 rounded-md font-black ${item.dias>30?'bg-red-600':item.dias>=25?'bg-amber-500':'bg-emerald-600'} text-white">${item.dias}</span></td><td class="p-3 text-center"><span class="inline-block px-2 py-1 rounded-md border text-[10px] font-bold ${badge}">${text}</span></td>
        </tr>`);
      });
    }

    function exportVigencia30PDF() {
      if (!vigencia30Data.length) { showStatus('No hay registros de vigencia para exportar.', 'error'); return; }
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'letter' });
        const fecha = formatearFechaMX(new Date());
        doc.setFillColor(127,29,29); doc.rect(0,0,280,22,'F');
        doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(15);
        doc.text('CONTROL DE VIGENCIA 30 DÍAS',14,10);
        doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.text(`Sin Shipper / Sin Fecha de Arribo · Corte: ${fecha}`,14,16);
        const rows = vigencia30Data.map(x=>[x.trip,x.type,x.status,x.driver,x.conv,x.equip,'SIN SHIPPER',formatearFechaHoraVigencia(x.accepted),'SIN ARRIBO',String(x.dias),x.estadoVigencia==='VENCIDO'?`VENCIDO (${x.dias-30} días)`:x.estadoVigencia==='POR_VENCER'?`POR VENCER (${30-x.dias} restantes)`:`VIGENTE (${30-x.dias} restantes)`]);
        doc.autoTable({startY:28,head:[['Viaje','Tipo','Estatus','Operador','Conv.','Equip.','Shipper','Aceptación','Arribo','Días','Vigencia']],body:rows,theme:'striped',styles:{fontSize:6.5,cellPadding:1.8,overflow:'linebreak'},headStyles:{fillColor:[190,24,93],textColor:255,fontStyle:'bold',halign:'center'},columnStyles:{0:{fontStyle:'bold'},9:{halign:'center',fontStyle:'bold'},10:{fontSize:6.2}}});
        const y=doc.lastAutoTable.finalY+7; doc.setFontSize(8); doc.setTextColor(71,85,105);
        doc.text(`Total: ${vigencia30Data.length} | Dentro de 30: ${vigencia30Data.filter(x=>x.estadoVigencia==='VIGENTE').length} | Próximos a vencer: ${vigencia30Data.filter(x=>x.estadoVigencia==='POR_VENCER').length} | Vencidos: ${vigencia30Data.filter(x=>x.estadoVigencia==='VENCIDO').length}`,14,y);
        doc.save(`Control_Vigencia_30_Dias_${fecha.replaceAll('/','-')}.pdf`);
        showStatus('<strong>PDF de Vigencia 30 Días</strong> generado exitosamente.', 'success');
      } catch(err) { console.error(err); showStatus('No fue posible generar el PDF de vigencia.', 'error'); }
    }

    function filtrarVigencia30() {
      const q = (document.getElementById('vigencia30Search')?.value || '').toLowerCase().trim();
      const filtro = document.getElementById('vigencia30Filtro')?.value || 'TODOS';

      const lista = vigencia30Data.filter(item => {
        const texto = [
          item.trip, item.type, item.status, item.driver, item.conv, item.equip
        ].join(' ').toLowerCase();

        const coincideTexto = !q || texto.includes(q);
        const coincideEstado = filtro === 'TODOS' || item.estadoVigencia === filtro;
        return coincideTexto && coincideEstado;
      });

      renderVigencia30(lista);
    }
