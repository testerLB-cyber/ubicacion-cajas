from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists(): raise SystemExit('No existe anticipos-profesional-flow.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Filtro Operador/Beneficiario + flujo equivalente v1 */'
if marker in s:
    print('filtro y flujo equivalente ya aplicado'); raise SystemExit(0)
js=r'''

/* Tráfico App Profesional · Filtro Operador/Beneficiario + flujo equivalente v1 */
(function(){
 if(window.__ccAntTipoFlujoV1)return; window.__ccAntTipoFlujoV1=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
 let modo='OPERADOR', base={anticipos:[],detalles:[]}, extra={cajaChica:[]};
 function isBen(a){return !!a && (a.esCajaChica===true || !!a.responsableId || /^BEN-/i.test(String(a.folio||'')) || (extra.cajaChica||[]).some(x=>x.id===a.id));}
 function nombre(a){if(!a)return '—'; if(!isBen(a))return a.operador||'—'; const x=(extra.cajaChica||[]).find(z=>z.id===a.id); return x?.beneficiario||x?.responsable||a.beneficiario||a.responsable||a.operador||'Beneficiario';}
 async function loadData(){const [r1,r2]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);if(r1.error)throw r1.error;if(r2.error)throw r2.error;base=r1.data||base;extra=r2.data||extra;}
 function ensureSwitch(){
   const panel=document.getElementById('ccAnticiposPanel')||document.getElementById('ccPanelAnticipos')||document;
   const body=document.getElementById('ccAntBody'); if(!body)return;
   let host=document.getElementById('ccAntTipoPersonaSwitch');
   if(!host){
     host=document.createElement('div');host.id='ccAntTipoPersonaSwitch';host.style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;padding:9px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px';
     host.innerHTML='<strong style="font-size:10px;color:#475569;margin-right:4px">Mostrar:</strong><label style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;cursor:pointer"><input type="radio" name="ccAntTipoPersona" value="OPERADOR" checked> Operadores</label><label style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;cursor:pointer"><input type="radio" name="ccAntTipoPersona" value="BENEFICIARIO"> Beneficiarios</label>';
     const table=body.closest('table'); const wrap=table?.parentElement||body.parentElement; wrap?.parentElement?.insertBefore(host,wrap);
     host.onchange=e=>{if(e.target.name==='ccAntTipoPersona'){modo=e.target.value;applyAll();}};
   }
 }
 function ensurePendingSwitch(){
   const body=document.getElementById('ccAntPendBody'); if(!body)return;
   let host=document.getElementById('ccAntPendTipoPersonaSwitch');
   if(!host){
     host=document.createElement('div');host.id='ccAntPendTipoPersonaSwitch';host.style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;padding:9px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px';
     host.innerHTML='<strong style="font-size:10px;color:#475569;margin-right:4px">Pendientes de:</strong><label style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;cursor:pointer"><input type="radio" name="ccAntPendTipoPersona" value="OPERADOR" '+(modo==='OPERADOR'?'checked':'')+'> Operadores</label><label style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;cursor:pointer"><input type="radio" name="ccAntPendTipoPersona" value="BENEFICIARIO" '+(modo==='BENEFICIARIO'?'checked':'')+'> Beneficiarios</label>';
     const table=body.closest('table');const wrap=table?.parentElement||body.parentElement;wrap?.parentElement?.insertBefore(host,wrap);
     host.onchange=e=>{if(e.target.name==='ccAntPendTipoPersona'){modo=e.target.value;document.querySelectorAll('input[name="ccAntTipoPersona"]').forEach(r=>r.checked=r.value===modo);applyAll();}};
   }
 }
 function applyMain(){
   ensureSwitch(); const data=Array.isArray(window.ccAntFiltered)?window.ccAntFiltered:[]; const trs=[...document.querySelectorAll('#ccAntBody tr')];
   trs.forEach((tr,i)=>{const a=data[i]; if(!a)return; const ben=isBen(a); tr.style.display=(modo==='BENEFICIARIO'?ben:!ben)?'':'none'; if(ben){const td=tr.querySelectorAll('td');if(td[2])td[2].innerHTML='<strong>'+esc(nombre(a))+'</strong><div style="font-size:9px;color:#7c3aed;font-weight:800">BENEFICIARIO</div>';}}
 }
 function applyPending(){
   ensurePendingSwitch(); const trs=[...document.querySelectorAll('#ccAntPendBody tr')];
   trs.forEach(tr=>{const folio=(tr.querySelector('td strong')?.textContent||'').trim();if(!folio)return;const a=(base.anticipos||[]).find(x=>String(x.folio||'')===folio);if(!a)return;const ben=isBen(a);tr.style.display=(modo==='BENEFICIARIO'?ben:!ben)?'':'none';const td=tr.querySelectorAll('td');if(ben&&td[1])td[1].innerHTML='<strong>'+esc(nombre(a))+'</strong><div style="font-size:9px;color:#7c3aed;font-weight:800">BENEFICIARIO</div>';});
 }
 function applyAll(){applyMain();applyPending();document.querySelectorAll('input[name="ccAntPendTipoPersona"]').forEach(r=>r.checked=r.value===modo);document.querySelectorAll('input[name="ccAntTipoPersona"]').forEach(r=>r.checked=r.value===modo);}
 function installRenderWrap(){
   if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__tipoPersona){const old=window.ccAntRender;const w=function(){const r=old.apply(this,arguments);setTimeout(applyAll,0);return r};w.__tipoPersona=true;window.ccAntRender=w;}
   if(typeof window.ccAntRenderPendientes==='function'&&!window.ccAntRenderPendientes.__tipoPersona){const old=window.ccAntRenderPendientes;const w=function(){const r=old.apply(this,arguments);setTimeout(applyPending,0);return r};w.__tipoPersona=true;window.ccAntRenderPendientes=w;}
 }
 function installLinksWrap(){
   if(typeof window.ccAntShowLinks==='function'&&!window.ccAntShowLinks.__benefLabels){const old=window.ccAntShowLinks;const w=function(a,links,firmaOnly){const r=old.apply(this,arguments);if(isBen(a)){const ov=document.getElementById('ccAntLinksModal');if(ov){ov.querySelectorAll('label,.cc-note').forEach(el=>{el.innerHTML=el.innerHTML.replace(/operador/gi,'beneficiario')});}}return r};w.__benefLabels=true;window.ccAntShowLinks=w;}
 }
 async function pdfBenef(a){
   if(!window.jspdf?.jsPDF)return window.ccAntPDF?.(a);
   const ds=(base.detalles||[]).filter(x=>x.anticipoId===a.id&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
   const d=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'letter'});d.setFont('helvetica','bold');d.setFontSize(16);d.text('ANTICIPO A BENEFICIARIO',14,16);d.setFontSize(9);d.setFont('helvetica','normal');d.text('Folio: '+String(a.folio||''),14,23);d.text('Fecha: '+new Date(a.fecha).toLocaleDateString('es-MX'),14,29);d.text('Beneficiario: '+nombre(a),14,35,{maxWidth:180});d.text('Método: '+String(a.metodoDeposito||'—'),14,41);d.autoTable({startY:48,head:[['Concepto','Monto']],body:ds.map(x=>[String(x.concepto||''),money(x.monto)]),styles:{fontSize:9},headStyles:{fillColor:[76,29,149]}});let y=(d.lastAutoTable?.finalY||60)+10;d.setFont('helvetica','bold');d.text('Total autorizado: '+money(a.montoAutorizado??a.monto),14,y);d.text('Total entregado: '+money(a.montoEntregado??a.monto),14,y+7);y+=28;d.line(14,y,82,y);d.line(120,y,190,y);d.setFontSize(8);d.setFont('helvetica','normal');d.text('Beneficiario · Enterado',26,y+5);d.text('Autoriza',143,y+5);d.setFontSize(7);d.text('El beneficiario reconoce haber recibido el monto indicado y se compromete a presentar la comprobación correspondiente.',14,250,{maxWidth:180});d.save('Anticipo_'+(a.folio||'beneficiario')+'.pdf');
 }
 function installPdfWrap(){
   if(typeof window.ccAntPDFById==='function'&&!window.ccAntPDFById.__benefPdf){const old=window.ccAntPDFById;const w=async function(id){const a=(base.anticipos||[]).find(x=>x.id===id);if(a&&isBen(a))return pdfBenef(a);return old.apply(this,arguments)};w.__benefPdf=true;window.ccAntPDFById=w;}
 }
 async function boot(){if(!window.gmSupabase||!window.CC_AUTH_READY)return setTimeout(boot,400);try{await loadData()}catch(e){console.warn('Filtro operador/beneficiario',e)}installRenderWrap();installLinksWrap();installPdfWrap();applyAll();const oldLoad=window.ccAntLoad;if(typeof oldLoad==='function'&&!oldLoad.__tipoPersona){const w=async function(){const r=await oldLoad.apply(this,arguments);try{await loadData()}catch(e){}setTimeout(applyAll,0);return r};w.__tipoPersona=true;window.ccAntLoad=w;}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,2200));else setTimeout(boot,2200);
})();
'''
s += js
P.write_text(s,encoding='utf-8')
print('Filtro Operador/Beneficiario y flujo equivalente aplicados')
