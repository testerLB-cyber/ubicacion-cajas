/* Centro unificado de reportes de mantenimiento */
(function(){
 let reports=[];
 const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const fmt=v=>v?new Date(v).toLocaleString('es-MX'):'—';
 async function loadReports(){
   if(!window.gmSupabase)return;
   const {data,error}=await gmSupabase.rpc('cc_professional_maintenance_reports');
   if(error){console.warn('Reportes mantenimiento',error);return}
   reports=Array.isArray(data)?data:[]; renderReports();
 }
 function ensureUI(){
   const view=document.getElementById('ccMaintenanceView'); if(!view||document.getElementById('ccMaintenanceReportsCenter'))return;
   const box=document.createElement('div');box.id='ccMaintenanceReportsCenter';
   box.innerHTML='<div style="margin-bottom:16px;padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#fff"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong style="font-size:18px">Reportes de mantenimiento</strong><div class="cc-note">Anomalías reportadas desde Profesional y por operadores móviles.</div></div><button class="cc-btn cc-btn-primary" onclick="ccNuevoReporteMantenimiento()">+ Nuevo reporte</button></div><div id="ccMantReportKpis" style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0"></div><div style="overflow:auto"><table class="cc-table-list" style="min-width:1050px;width:100%"><thead><tr><th>Unidad</th><th>Reportado</th><th>Origen / Quién</th><th>Problema</th><th>Estatus</th><th>Evidencia</th><th>Solución</th><th>Acción</th></tr></thead><tbody id="ccMantReportsBody"></tbody></table></div></div>';
   view.prepend(box);
 }
 function renderReports(){
   ensureUI(); const b=document.getElementById('ccMantReportsBody'),k=document.getElementById('ccMantReportKpis');if(!b)return;
   const pending=reports.filter(r=>r.estatus!=='SOLUCIONADO').length, solved=reports.filter(r=>r.estatus==='SOLUCIONADO').length;
   k.innerHTML='<span class="cc-badge cc-status-mant">'+pending+' REPORTADOS</span><span class="cc-badge cc-ok">'+solved+' SOLUCIONADOS</span>';
   b.innerHTML=reports.length?reports.map(r=>{const d=r.data||{},op=d.origen==='APP_OPERADOR_V2'?'OPERADOR':'WEB',who=d.operador_nombre||d.reportado_por_nombre||d.reportado_por||'Usuario web',done=r.estatus==='SOLUCIONADO';
    return '<tr><td><strong>'+E(r.numero||'—')+'</strong></td><td>'+E(fmt(r.fecha))+'</td><td><span class="cc-badge">'+op+'</span><div style="font-size:11px;margin-top:4px">'+E(who)+'</div></td><td>'+E(r.motivo||'—')+'</td><td><span class="cc-badge '+(done?'cc-ok':'cc-status-mant')+'">'+(done?'SOLUCIONADO':'REPORTADO')+'</span></td><td>'+(r.evidenciaUrl?'<a class="cc-btn cc-btn-light" target="_blank" rel="noopener" href="'+E(r.evidenciaUrl)+'">Ver foto</a>':'—')+'</td><td>'+(done?'<b>'+E(r.reparacion||'Solucionado')+'</b><div style="font-size:10px">'+E(fmt(r.fechaSolucion))+'</div>':'Pendiente')+'</td><td>'+(done?'—':'<button class="cc-btn cc-btn-primary" onclick="ccSolucionarReporteMantenimiento(\''+E(r.id)+'\')">Marcar solucionado</button>')+'</td></tr>'
   }).join(''):'<tr><td colspan="8" style="padding:24px;text-align:center;color:#64748b">Sin reportes.</td></tr>';
 }
 window.ccNuevoReporteMantenimiento=function(){
   const opts=(window.cajas||[]).map(x=>'<option value="'+E(x.id)+'">'+E(x.numero||x.descripcion||'UNIDAD')+'</option>').join('');
   modal('Nuevo reporte de mantenimiento','<label>Unidad</label><select name="unidad" required style="width:100%;padding:10px;margin:5px 0 12px"><option value="">Selecciona unidad</option>'+opts+'</select><label>Anomalía / problema</label><textarea name="descripcion" required rows="4" style="width:100%;padding:10px;margin:5px 0 12px"></textarea><label>Evidencia (opcional)</label><input name="foto" type="file" accept="image/*" style="width:100%;padding:10px 0">',async fd=>{
     const id=String(fd.get('unidad')||''),desc=String(fd.get('descripcion')||'').trim(),file=fd.get('foto');let url='';
     if(file&&file.size){url=await ccUploadMantenimientoEvidencia(file,id)}
     const {data,error}=await gmSupabase.rpc('cc_professional_create_maintenance_report',{p_unidad_id:id,p_descripcion:desc,p_evidencia_url:url||null});if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se guardó');
     await loadReports();showStatus?.('REPORTE DE MANTENIMIENTO REGISTRADO','success');return {skipCloudSave:true};
   });
 };
 window.ccSolucionarReporteMantenimiento=function(id){
   const r=reports.find(x=>x.id===id);if(!r)return;
   modal('Solucionar reporte · '+(r.numero||''),'<div style="padding:10px;background:#f8fafc;border-radius:10px;margin-bottom:12px"><b>Problema:</b> '+E(r.motivo||'')+'</div><label>Trabajo realizado / solución</label><textarea name="solucion" required rows="4" style="width:100%;padding:10px;margin:5px 0 12px"></textarea><label>Evidencia de solución (opcional)</label><input name="foto" type="file" accept="image/*" style="width:100%;padding:10px 0">',async fd=>{
     const sol=String(fd.get('solucion')||'').trim(),file=fd.get('foto');let url='';
     if(file&&file.size){url=await ccUploadMantenimientoEvidencia(file,r.cajaId||r.id)}
     const {data,error}=await gmSupabase.rpc('cc_professional_resolve_maintenance_report',{p_id:id,p_solucion:sol,p_evidencia_url:url||null});if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo solucionar');
     await loadReports();showStatus?.('REPORTE MARCADO COMO SOLUCIONADO','success');return {skipCloudSave:true};
   });
 };
 const old=window.ccRenderMantenimiento;
 window.ccRenderMantenimiento=function(){const x=old?.apply(this,arguments);ensureUI();loadReports();return x};
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{ensureUI();loadReports()},1000)});
})();