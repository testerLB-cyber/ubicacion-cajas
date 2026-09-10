from pathlib import Path

p = Path('app-correcta.html')
s = p.read_text(encoding='utf-8')

pairs = [
    (
        "function days(){const a=[],d=new Date();d.setHours(12,0,0,0);for(let i=-3;i<12;i++){const x=new Date(d);x.setDate(d.getDate()+i);a.push(iso(x));}return a;}function rentFor(rid,date){const k=rid+'_'+date;const r=rentas.find(x=>x.id===rid);if(!r||r.estatus==='FINALIZADA'||r.estatus==='CANCELADA')return false;if(Object.prototype.hasOwnProperty.call(matriz,k))return !!matriz[k];return date>=r.fechaInicio&&(r.indeterminada==='SI'||!r.fechaFin||date<=r.fechaFin);}window.ccToggleDay=function(rid,date){",
        "function days(){const a=[],d=new Date();d.setHours(12,0,0,0);for(let i=-3;i<12;i++){const x=new Date(d);x.setDate(d.getDate()+i);a.push(iso(x));}return a;}function rentFor(rid,date){const k=rid+'_'+date;const r=rentas.find(x=>x.id===rid);if(!r||r.estatus==='FINALIZADA'||r.estatus==='CANCELADA')return false;if(Object.prototype.hasOwnProperty.call(matriz,k))return !!matriz[k];/* La fecha fin es vencimiento programado, no salida automática. */return date>=r.fechaInicio;}window.ccToggleDay=function(rid,date){"
    ),
    (
        "const activa=r.estatus!=='FINALIZADA'&&rentFor(r.id,hoy);\n    return activa;",
        "const activa=r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA';\n    return activa;"
    ),
    (
        "const aa=(a.estatus!=='FINALIZADA'&&rentFor(a.id,hoy))?1:0,bb=(b.estatus!=='FINALIZADA'&&rentFor(b.id,hoy))?1:0;",
        "const aa=(a.estatus!=='FINALIZADA'&&a.estatus!=='CANCELADA')?1:0,bb=(b.estatus!=='FINALIZADA'&&b.estatus!=='CANCELADA')?1:0;"
    ),
    (
        "const activa=r.estatus!=='FINALIZADA'&&rentFor(r.id,hoy);\n    const fechaFin=activa?((r.indeterminada==='SI'||!r.fechaFin)?'Indeterminada':r.fechaFin):(r.fechaFin||'—');",
        "const activa=r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA';\n    const vencida=!!(activa&&r.indeterminada!=='SI'&&r.fechaFin&&r.fechaFin<hoy);\n    const fechaFin=activa?((r.indeterminada==='SI'||!r.fechaFin)?'Indeterminada':r.fechaFin):(r.fechaFin||'—');"
    ),
    (
        '<td><span class="cc-badge ${activa?\'cc-ok\':\'\'}">${activa?\'ACTIVA\':\'FINALIZADA\'}</span></td>',
        '<td><span class="cc-badge ${activa&&!vencida?\'cc-ok\':\'\'}" ${vencida?\'style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa"\':\'\'}>${activa?(vencida?\'VENCIDA · EN RENTA\':\'ACTIVA\'):\'FINALIZADA\'}</span></td>'
    ),
    (
        "return tipoOk&&r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA'&&rentFor(r.id,hoy)&&(!responsableId||r.responsableId===responsableId)&&(!clienteId||r.clienteId===clienteId);",
        "return tipoOk&&r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA'&&(!responsableId||r.responsableId===responsableId)&&(!clienteId||r.clienteId===clienteId);"
    )
]

for i, (old, new) in enumerate(pairs, 1):
    if old not in s:
        raise SystemExit(f'anchor {i} not found')
    s = s.replace(old, new, 1)

start = s.find("window.ccSacarDeRenta=async function(id){")
end = s.find("\n\nwindow.ccUploadMantenimientoEvidencia", start)
if start < 0 or end < 0:
    raise SystemExit('ccSacarDeRenta block not found')

replacement = '''window.ccSacarDeRenta=function(id){
  const r=rentas.find(x=>x.id===id);if(!r)return;
  const unidad=cajas.find(x=>x.id===r.cajaId);
  const cliente=clientes.find(x=>x.id===r.clienteId);
  const etiqueta=unidad?.numero||unidad?.descripcion||'la unidad';
  const hoy=iso(new Date());
  modal('Sacar de renta · '+etiqueta,`<div style="padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:14px;color:#9a3412;font-size:12px"><strong>Salida manual de renta</strong><br>La unidad seguirá apareciendo EN RENTA, aunque esté vencida, hasta confirmar esta salida.</div><div class="cc-grid"><div class="cc-field"><label>Fecha real de salida</label><input name="fechaSalida" type="date" required min="${esc(r.fechaInicio||'')}" value="${esc(hoy)}"></div><div class="cc-field"><label>Unidad</label><input value="${esc(etiqueta)}" disabled></div><div class="cc-field"><label>Cliente</label><input value="${esc(cliente?.nombre||'—')}" disabled></div><div class="cc-field"><label>Fecha de inicio</label><input value="${esc(r.fechaInicio||'—')}" disabled></div></div>`,async f=>{
    const fechaSalida=String(f.get('fechaSalida')||'').trim();
    if(!fechaSalida)throw new Error('Selecciona la fecha real de salida.');
    if(r.fechaInicio&&fechaSalida<r.fechaInicio)throw new Error('La fecha de salida no puede ser anterior a la fecha de inicio.');
    const antes=JSON.parse(JSON.stringify(r));
    showStatus?.('Finalizando renta en Supabase...','info');
    const {data,error}=await gmSupabase.rpc('cc_finalize_renta',{p_renta_id:id,p_fecha:fechaSalida});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||'No se pudo finalizar la renta');
    ccRevision=Number(data.revision||ccRevision+1);
    r.fechaFin=fechaSalida;r.indeterminada='NO';r.estatus='FINALIZADA';r.finalizadaEn=new Date().toISOString();
    r.observaciones=(r.observaciones?String(r.observaciones)+' | ':'')+`Renta finalizada manualmente. Fecha real de salida: ${fechaSalida}.`;
    Object.keys(matriz).forEach(k=>{if(k.startsWith(r.id+'_')&&k.slice(r.id.length+1)>=fechaSalida)delete matriz[k];});
    await ccAudit({operacionId:ccAuditId('RENTA'),accion:'SACAR_DE_RENTA',modulo:'RENTA',submodulo:'SALIDA',idRegistro:r.id,idUnidad:unidad?.id||'',numeroUnidad:unidad?.numero||'',idCliente:r.clienteId||'',idRenta:r.id,estatusAnterior:'ACTIVA',estatusNuevo:'FINALIZADA',datosAnteriores:antes,datosNuevos:r,fechaNueva:fechaSalida,detalle:'Renta finalizada manualmente con fecha real de salida '+fechaSalida});
    showStatus?.(`${etiqueta} salió de renta con fecha ${fechaSalida} y ahora está disponible.`,'success');
    return {skipCloudSave:true};
  });
};'''

s = s[:start] + replacement + s[end:]
p.write_text(s, encoding='utf-8')
