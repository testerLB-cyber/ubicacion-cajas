/* Dashboard de servicios comprobados — fuente: Control de Hojas.
   Las asignaciones se comparan contra la configuración ACTUAL de Flota de Tráfico;
   no se presentan como históricas porque no existe historial de vigencias disponible aquí. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v) => String(v ?? '').trim().toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const name = (v) => String(v ?? '').trim() || 'Sin dato';
  let records = [];
  let initialized = false;

  function saturdayStart(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
    return d;
  }
  function iso(d) { return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
  function defaults() {
    const now = new Date(), start = saturdayStart(now), end = new Date(start);
    end.setDate(start.getDate()+6);
    $('serviciosDesde').value = iso(start); $('serviciosHasta').value = iso(end);
  }
  function group(rows, field) {
    const map = new Map();
    rows.forEach(r => { const k = name(r[field]); map.set(k, (map.get(k)||0)+1); });
    return [...map.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'es'));
  }
  function countTable(title, rows, field) {
    const data = group(rows,field);
    return '<section class="rounded-xl border border-slate-200 bg-white overflow-hidden"><div class="px-4 py-3 border-b border-slate-100 font-bold text-slate-800">'+title+'</div><div class="max-h-72 overflow-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-slate-500"><tr><th class="text-left p-2.5">Nombre</th><th class="text-right p-2.5">Servicios</th></tr></thead><tbody>'+ (data.length ? data.map(([n,c])=>'<tr class="border-t border-slate-100"><td class="p-2.5">'+esc(n)+'</td><td class="p-2.5 text-right font-bold tabular-nums">'+c+'</td></tr>').join('') : '<tr><td colspan="2" class="p-4 text-center text-slate-400">Sin servicios en el rango</td></tr>') +'</tbody></table></div></section>';
  }
  function render(rows) {
    const total = rows.length;
    $('serviciosTotal').textContent = total.toLocaleString('es-MX');
    $('serviciosClientes').innerHTML = countTable('Servicios por cliente',rows,'cliente_nombre');
    $('serviciosOperadores').innerHTML = countTable('Servicios por operador',rows,'operador_nombre');
    $('serviciosEjecutivos').innerHTML = countTable('Servicios por ejecutivo',rows,'ejecutivo');
    $('serviciosUnidades').innerHTML = countTable('Servicios por unidad',rows,'unidad_numero');
    const tbody = $('serviciosDetalle');
    tbody.innerHTML = rows.length ? rows.map(r=>'<tr class="border-t border-slate-100 hover:bg-slate-50"><td class="p-2.5 whitespace-nowrap">'+esc(r.fecha_servicio)+'</td><td class="p-2.5">'+esc(r.folio)+'</td><td class="p-2.5">'+esc(r.cliente_nombre)+'</td><td class="p-2.5">'+esc(r.ejecutivo)+'</td><td class="p-2.5">'+esc(r.operador_nombre)+'</td><td class="p-2.5">'+esc(r.unidad_numero)+'</td><td class="p-2.5">'+esc(r.alerta || '—')+'</td></tr>').join('') : '<tr><td colspan="7" class="p-8 text-center text-slate-400">No hay servicios comprobados en este periodo.</td></tr>';
  }
  async function load() {
    const host = window.gmSupabase;
    if (!host) { $('serviciosEstado').textContent = 'No se encontró la conexión de datos de Tráfico.'; return; }
    const desde = $('serviciosDesde').value, hasta = $('serviciosHasta').value;
    if (!desde || !hasta || desde > hasta) { $('serviciosEstado').textContent = 'Revisa el rango de fechas.'; return; }
    $('serviciosEstado').textContent = 'Consultando Control de Hojas…';
    $('serviciosActualizar').disabled = true;
    try {
      const [compRes, usersRes, fleetRes] = await Promise.all([
        host.from('hs_comprobaciones').select('id,folio_id,fecha,fecha_uso,cliente_id,cliente_nombre,operador_id,operador_nombre,responsable_id,responsable_nombre,unidad_id,unidad_numero,creado_por,tipo,servicio,fecha_comprobacion').gte('fecha',desde).lte('fecha',hasta).limit(10000),
        host.from('cc_app_users').select('user_id,nombre,username,email,es_trafico,activo').eq('activo',true).limit(2000),
        host.from('cc_trafico_flota').select('user_id,unidad_id,operador_id').limit(5000)
      ]);
      if (compRes.error) throw compRes.error;
      const comps = compRes.data || [];
      if (!comps.length) { records=[]; render(records); $('serviciosEstado').textContent='Consulta completa. No hay comprobaciones dentro del rango.'; return; }
      const folioIds = [...new Set(comps.map(x=>x.folio_id).filter(Boolean))];
      const folioMap = new Map();
      for (let i=0;i<folioIds.length;i+=400) {
        const part = await host.from('hs_folios').select('id,folio,estatus,serie_id,creado_por_nombre,creado_por,cliente_nombre,operador_id,operador_nombre').in('id',folioIds.slice(i,i+400));
        if (part.error) throw part.error;
        (part.data||[]).forEach(f=>folioMap.set(f.id,f));
      }
      const users = usersRes.error ? [] : (usersRes.data||[]);
      const fleets = fleetRes.error ? [] : (fleetRes.data||[]);
      const userMap = new Map(users.map(u=>[String(u.user_id),u]));
      const fleetByUser = new Map();
      fleets.forEach(f=>{ if(!fleetByUser.has(String(f.user_id))) fleetByUser.set(String(f.user_id),[]); fleetByUser.get(String(f.user_id)).push(f); });
      const unique = new Map();
      comps.forEach(c=>{
        const f = folioMap.get(c.folio_id);
        if (!f || !['UTILIZADO','NO_FACTURABLE'].includes(String(f.estatus||'').toUpperCase())) return;
        if (/DEVOLUCION|CANCEL/i.test(String(c.tipo||''))) return;
        const date = c.fecha_uso || c.fecha;
        if (!date || date < desde || date > hasta) return;
        const executorId = c.responsable_id || c.creado_por || f.creado_por;
        const u = userMap.get(String(executorId));
        const ejecutivo = name(c.responsable_nombre || u?.nombre || u?.username || f.creado_por_nombre);
        const opId = c.operador_id || f.operador_id || '';
        const unitId = c.unidad_id || '';
        const assigned = fleetByUser.get(String(executorId)) || [];
        const opAssigned = !opId || assigned.some(a=>String(a.operador_id||'')===String(opId));
        const unitAssigned = !unitId || assigned.some(a=>String(a.unidad_id||'')===String(unitId));
        const alerts = [];
        if (assigned.length && opId && !opAssigned) alerts.push('Operador fuera de flota actual');
        if (assigned.length && unitId && !unitAssigned) alerts.push('Unidad fuera de flota actual');
        const row = {
          id:c.id, fecha_servicio:date, folio:f.folio || c.folio_id,
          cliente_nombre:name(c.cliente_nombre || f.cliente_nombre),
          operador_nombre:name(c.operador_nombre || f.operador_nombre),
          unidad_numero:name(c.unidad_numero), ejecutivo,
          alerta:alerts.join(' · '), tipo:c.tipo || ''
        };
        unique.set(String(c.folio_id),row);
      });
      records = [...unique.values()].sort((a,b)=>String(b.fecha_servicio).localeCompare(String(a.fecha_servicio)));
      render(records);
      const assignKnown = fleets.length > 0;
      $('serviciosEstado').textContent = 'Actualizado: '+new Date().toLocaleString('es-MX')+' · Fuente: hojas comprobadas y no facturables · Asignaciones: '+(assignKnown?'configuración actual (no histórica)':'sin configuración de flota disponible')+'.';
    } catch(err) {
      console.error('[Dashboard servicios comprobados]',err);
      $('serviciosEstado').textContent = 'No se pudo consultar el dashboard: '+(err?.message || 'error de conexión');
    } finally { $('serviciosActualizar').disabled = false; }
  }
  function mount() {
    if (initialized || !$('vistaOperativa') || !$('vistaOperativa').parentElement) return;
    initialized = true;
    const panel = document.createElement('section');
    panel.id='dashboardServiciosComprobados';
    panel.className='space-y-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 md:p-5';
    panel.innerHTML = '<div class="flex flex-wrap items-center justify-between gap-3"><div><div class="text-[11px] uppercase tracking-wider font-bold text-blue-700">Control de Hojas · servicios reales</div><h2 class="text-lg font-black text-slate-900">Servicios comprobados por cliente, operador, ejecutivo y unidad</h2><p class="text-xs text-slate-500 mt-1">Incluye UTILIZADO y NO FACTURABLE. Excluye pendientes, cancelados y devoluciones.</p></div><div class="flex flex-wrap items-center gap-2"><label class="text-xs text-slate-600">Desde <input id="serviciosDesde" type="date" class="border border-slate-300 rounded-lg px-2 py-1.5 bg-white"></label><label class="text-xs text-slate-600">Hasta <input id="serviciosHasta" type="date" class="border border-slate-300 rounded-lg px-2 py-1.5 bg-white"></label><button id="serviciosActualizar" class="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Actualizar</button></div></div><div class="flex flex-wrap items-center gap-3 rounded-xl bg-white border border-blue-100 p-3"><div><div class="text-[10px] uppercase font-bold text-slate-500">Servicios del periodo</div><div id="serviciosTotal" class="text-2xl font-black text-slate-900">—</div></div><p id="serviciosEstado" class="text-xs text-slate-500 flex-1">Preparando consulta…</p></div><div class="grid grid-cols-1 xl:grid-cols-2 gap-3"><div id="serviciosClientes"></div><div id="serviciosOperadores"></div><div id="serviciosEjecutivos"></div><div id="serviciosUnidades"></div></div><section class="bg-white rounded-xl border border-slate-200 overflow-hidden"><div class="px-4 py-3 font-bold text-slate-800 border-b border-slate-100">Detalle de servicios y posibles salidas de flota</div><div class="overflow-auto max-h-[28rem]"><table class="w-full text-xs min-w-[950px]"><thead class="sticky top-0 bg-slate-50 text-slate-500"><tr><th class="text-left p-2.5">Fecha</th><th class="text-left p-2.5">Serie / folio</th><th class="text-left p-2.5">Cliente</th><th class="text-left p-2.5">Ejecutivo</th><th class="text-left p-2.5">Operador</th><th class="text-left p-2.5">Unidad</th><th class="text-left p-2.5">Observación</th></tr></thead><tbody id="serviciosDetalle"><tr><td colspan="7" class="p-6 text-center text-slate-400">Cargando…</td></tr></tbody></table></div></section>';
    $('vistaOperativa').prepend(panel);
    defaults();
    $('serviciosActualizar').addEventListener('click',load);
    $('serviciosDesde').addEventListener('change',load);
    $('serviciosHasta').addEventListener('change',load);
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  setTimeout(mount,1500);
})();