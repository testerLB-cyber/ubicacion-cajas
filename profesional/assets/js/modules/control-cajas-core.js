/* GM CONTROL DE CAJAS · SUPABASE NORMALIZADO v2.0 · SIN GOOGLE SHEETS */(function(){
const SUPABASE_URL=window.GM_SUPABASE_URL;
const SUPABASE_ANON_KEY=window.GM_SUPABASE_ANON_KEY;
function ccCreateSupabaseClient(){
  if(window.gmSupabase) return window.gmSupabase;
  if(!window.supabase || typeof window.supabase.createClient!=='function'){
    console.error('SUPABASE SDK NO DISPONIBLE');
    return null;
  }
  if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
    console.error('SUPABASE URL/KEY NO DISPONIBLES');
    return null;
  }
  try{
    window.gmSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return window.gmSupabase;
  }catch(err){
    console.error('ERROR CREANDO CLIENTE SUPABASE:',err);
    return null;
  }
}
const gmSupabase=ccCreateSupabaseClient();
window.CC_AUTH_REQUIRED=true;
let cajas=[], responsables=[], rentas=[], matriz={}, clientes=[], configuracion={correosMantenimiento:[],correoEnvio:{proveedor:'RESEND',nombreRemitente:'',correoRemitente:'',replyTo:''},mantenimientoHistorial:[],tarifasRenta:{},geocercas:[],tiposUnidad:[{id:'tipo_caja',nombre:'CAJA',categoria:'CAJA',estatus:'ACTIVO'},{id:'tipo_carro',nombre:'CARRO',categoria:'CARRO',estatus:'ACTIVO'}]};
let ccCloudReady=false,ccRevision=0,ccSaveInFlight=false,ccSaveQueued=false;
const ccDefaultConfig=()=>({correosMantenimiento:[],correoEnvio:{proveedor:'RESEND',nombreRemitente:'',correoRemitente:'',replyTo:''},mantenimientoHistorial:[],tarifasRenta:{},geocercas:[],tiposUnidad:[{id:'tipo_caja',nombre:'CAJA',categoria:'CAJA',estatus:'ACTIVO'},{id:'tipo_carro',nombre:'CARRO',categoria:'CARRO',estatus:'ACTIVO'}]});
function ccNormalizeState(st){
 st=st||{}; cajas=Array.isArray(st.cajas)?st.cajas:[]; responsables=Array.isArray(st.responsables)?st.responsables:[]; rentas=Array.isArray(st.rentas)?st.rentas:[]; matriz=st.matriz&&typeof st.matriz==='object'?st.matriz:{}; clientes=Array.isArray(st.clientes)?st.clientes:[]; configuracion=Object.assign(ccDefaultConfig(),st.configuracion||{});
 configuracion.correosMantenimiento=configuracion.correosMantenimiento||[]; configuracion.correoEnvio=Object.assign({proveedor:'RESEND',nombreRemitente:'',correoRemitente:'',replyTo:''},configuracion.correoEnvio||{}); configuracion.mantenimientoHistorial=configuracion.mantenimientoHistorial||[]; configuracion.tarifasRenta=configuracion.tarifasRenta||{}; configuracion.geocercas=Array.isArray(configuracion.geocercas)?configuracion.geocercas:[]; configuracion.tiposUnidad=configuracion.tiposUnidad||ccDefaultConfig().tiposUnidad;
 if(!configuracion.tiposUnidad.some(t=>String(t.nombre).toUpperCase()==='CAJA'))configuracion.tiposUnidad.unshift({id:'tipo_caja',nombre:'CAJA',categoria:'CAJA',estatus:'ACTIVO'});
 if(!configuracion.tiposUnidad.some(t=>String(t.nombre).toUpperCase()==='CARRO'))configuracion.tiposUnidad.push({id:'tipo_carro',nombre:'CARRO',categoria:'CARRO',estatus:'ACTIVO'});
 Object.keys(configuracion.tarifasRenta).forEach(k=>{const v=configuracion.tarifasRenta[k];if(typeof v==='number')configuracion.tarifasRenta[k]={diario:v,semanal:v*7,mensual:v*30};else configuracion.tarifasRenta[k]=Object.assign({diario:0,semanal:0,mensual:0},v||{});});
 cajas=cajas.map(x=>({...x,tipoUnidadId:x.tipoUnidadId||'tipo_caja',tipoUnidadNombre:x.tipoUnidadNombre||'CAJA'}));
}
function ccState(){return {cajas,responsables,rentas,matriz,clientes,configuracion};}
function ccSupabaseReady(){return !!gmSupabase;}
async function ccTestConnection(){
 if(!ccSupabaseReady()){const msg='Supabase no está configurado. Revisa GM_SUPABASE_URL y GM_SUPABASE_ANON_KEY.';showStatus?.(msg,'error');return {ok:false,error:msg};}
 try{
   showStatus?.('Conectando con Supabase...','info');
   const {data,error}=await gmSupabase.rpc('cc_load_all');
   if(error)throw error;
   ccRevision=Number(data?.revision||0);ccCloudReady=true;
   showStatus?.('CONEXIÓN CORRECTA · Supabase PostgreSQL · revisión '+ccRevision,'success');
   return {ok:true,revision:ccRevision,state:data?.state||{}};
 }catch(e){ccCloudReady=false;console.error('PRUEBA SUPABASE:',e);showStatus?.('ERROR DE CONEXIÓN con Supabase: '+(e.message||e),'error');return {ok:false,error:e.message||String(e)};}
}
async function ccCloudSave(action='GUARDAR'){
 if(!ccSupabaseReady()){
   showStatus?.('Supabase no está configurado. El módulo no puede guardar.','error');
   return {ok:false,error:'SUPABASE_NO_CONFIGURADO'};
 }
 if(ccSaveInFlight){
   ccSaveQueued=true;
   return {ok:false,queued:true};
 }

 ccSaveInFlight=true;
 const payload=ccState();
 showStatus?.('Guardando en Supabase...','info');

 try{
   for(let intento=0;intento<2;intento++){
     const {data,error}=await gmSupabase.rpc('cc_save_all',{
       p_state:payload,
       p_operation:action,
       p_client_time:new Date().toISOString(),
       p_expected_revision:ccRevision
     });
     if(error)throw error;

     if(data?.ok===false){
       if(data.error==='CONFLICTO_DE_VERSION' && intento===0){
         // El servidor ya devuelve la revisión vigente. Se actualiza y reintenta
         // sin descargar toda la base ni perder la captura del usuario.
         ccRevision=Number(data.revision||ccRevision);
         continue;
       }
       throw new Error(data.error||'No se pudo guardar');
     }

     ccRevision=Number(data?.revision??(ccRevision+1));
     if(data?.state) ccNormalizeState(data.state);
     ccCloudReady=true;
     showStatus?.('GUARDADO · Supabase · revisión '+ccRevision,'success');
     return {ok:true,revision:ccRevision,state:data?.state||null};
   }
   throw new Error('No se pudo sincronizar la revisión de Supabase.');
 }catch(e){
   console.error('ERROR GUARDANDO SUPABASE:',e);
   ccCloudReady=false;
   showStatus?.('ERROR: no se guardó en Supabase · '+(e.message||e),'error');
   return {ok:false,error:e.message||String(e)};
 }finally{
   ccSaveInFlight=false;
   if(ccSaveQueued){
     ccSaveQueued=false;
     setTimeout(()=>ccCloudSave('ACTUALIZACION_PENDIENTE'),40);
   }
 }
}
async function ccAudit(evento={}){
 if(!ccSupabaseReady())return {ok:false,error:'Supabase no configurado'};
 const event={...evento,usuario:evento.usuario||'WEB_APP_USER',fechaHora:new Date().toISOString(),origen:evento.origen||'CONTROL_CAJAS_HTML',url:location.href,userAgent:navigator.userAgent};
 try{const {data,error}=await gmSupabase.rpc('cc_log_event',{p_event:event});if(error)throw error;return data||{ok:true};}
 catch(e){console.error('ERROR AUDITORIA SUPABASE:',e);return {ok:false,error:e.message||String(e)};}
}

function ccAuditId(prefix='OP'){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);}

const save=()=>ccCloudSave('ACTUALIZACION');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7); const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); const fmtDate=d=>new Date(d+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'});
window.ccTab=function(tab,btn){document.querySelectorAll('#controlCajasSection .cc-tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('#controlCajasSection .cc-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const panel=document.getElementById('ccPanel'+tab.charAt(0).toUpperCase()+tab.slice(1));panel?.classList.add('active');requestAnimationFrame(()=>{if(tab==='anticipos'&&typeof ccAntLoad==='function')ccAntLoad();else if(tab==='dashboard')ccRenderDashboard();else if(tab==='inventario')ccRenderInventario();else if(tab==='renta')ccRenderRenta();else if(tab==='historial')ccRenderHistorial();else if(tab==='proforma'&&typeof ccRenderProforma==='function')ccRenderProforma();else if(tab==='mantenimiento')ccRenderMantenimiento();else if(tab==='mapa')ccCargarMapaUnidades();else if(tab==='configuracion')ccRenderConfiguracion();});};
function modal(title,body,onSave){document.getElementById('ccFormModal')?.remove();const d=document.createElement('div');d.id='ccFormModal';d.dataset.auditTitle=title;d.style='position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px';d.innerHTML=`<div style="background:#fff;width:min(760px,96vw);max-height:92vh;overflow:auto;border-radius:16px"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>${esc(title)}</strong><button type="button" onclick="this.closest('#ccFormModal').remove()" style="color:#fff;font-size:18px">×</button></div><form id="ccForm" style="padding:18px">${body}<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:15px"><button type="button" class="cc-btn cc-btn-light" onclick="this.closest('#ccFormModal').remove()">Cancelar</button><button class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>`;document.body.appendChild(d);d.querySelector('#ccForm').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Guardando...';}const operationId=ccAuditId('OP');const before=JSON.parse(JSON.stringify(ccState()));try{const saveResult=await onSave(new FormData(e.target));const after=JSON.parse(JSON.stringify(ccState()));if(!saveResult?.skipCloudSave){const result=await ccCloudSave('FORMULARIO');if(!result?.ok)throw new Error(result?.error||'Supabase rechazó el guardado');await ccAudit({operacionId:operationId,accion:'GUARDAR_FORMULARIO',modulo:'CONTROL_CAJA',submodulo:title,idRegistro:'',datosAnteriores:before,datosNuevos:after,detalle:'Formulario guardado y verificado en Supabase: '+title});}d.remove();ccRenderAll();}catch(err){console.error('GUARDADO DE FORMULARIO:',err);if(btn){btn.disabled=false;btn.textContent='Guardar';}showStatus?.('NO SE GUARDÓ · '+(err.message||err),'error');alert('No se guardó en Supabase.\n\n'+(err.message||err));}};}

window.ccEditarUnidadDirecto=function(id){
  const x=cajas.find(u=>u.id===id);
  if(!x){alert('No se encontró la unidad.');return;}

  const tipos=(configuracion.tiposUnidad||[]).filter(t=>t.estatus!=='INACTIVO');
  const usos=(configuracion.tiposUsoCaja||[]).filter(u=>u.estatus!=='INACTIVO');
  const tipoActual=x.tipoUnidadId||'tipo_caja';
  const optsTipos=tipos.map(t=>`<option value="${esc(t.id)}" ${t.id===tipoActual?'selected':''}>${esc(t.nombre)}</option>`).join('');
  const optsUsos=usos.map(u=>`<option value="${esc(u.nombre)}" ${u.nombre===x.tipoUsoCaja?'selected':''}>${esc(u.nombre)}</option>`).join('');
  const optsClientes=clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${esc(c.id)}" ${c.id===x.clienteId?'selected':''}>${esc(c.nombre)}</option>`).join('');

  document.getElementById('ccEditUnitModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccEditUnitModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML=`<div style="background:#fff;width:min(780px,96vw);max-height:94vh;overflow:auto;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center">
      <strong>EDITAR UNIDAD · ${esc(x.numero||'')}</strong>
      <button type="button" id="ccEditUnitClose" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
    </div>
    <form id="ccEditUnitForm" style="padding:18px">
      <div class="cc-grid">
        <div class="cc-field"><label>Tipo de unidad</label><select name="tipoUnidadId" required>${optsTipos}</select></div>
        <div class="cc-field"><label>Identificador / Número</label><input name="numero" required value="${esc(x.numero||'')}"></div>
        <div class="cc-field"><label>Descripción</label><input name="descripcion" required value="${esc(x.descripcion||'')}"></div>
        <div class="cc-field"><label>Placas MX</label><input name="placasMx" value="${esc(x.placasMx||x.placas||'')}"></div>
        <div class="cc-field"><label>Placas USA</label><input name="placasUsa" value="${esc(x.placasUsa||'')}"></div>
        <div class="cc-field"><label>Marca</label><input name="marca" value="${esc(x.marca||'')}"></div>
        <div class="cc-field"><label>Modelo / Año</label><input name="modelo" value="${esc(x.modelo||'')}"></div>
        <div class="cc-field"><label>Tamaño</label><input name="tamano" value="${esc(x.tamano||'')}"></div>
        <div class="cc-field"><label>Tipo de uso de caja</label><select name="tipoUsoCaja"><option value="">Sin uso</option>${optsUsos}</select></div>
        <div class="cc-field"><label>Tipo / Configuración</label><input name="tipo" value="${esc(x.tipo||'')}"></div>
        <div class="cc-field"><label>Origen</label><select name="origen"><option value="MEXICANA" ${x.origen==='MEXICANA'||!x.origen?'selected':''}>MEXICANA</option><option value="USA" ${x.origen==='USA'?'selected':''}>USA</option></select></div>
        <div class="cc-field"><label>Cliente asignado</label><select name="clienteId"><option value="">Sin cliente</option>${optsClientes}</select></div>
        <div class="cc-field"><label>Capacidad</label><input name="capacidad" value="${esc(x.capacidad||'')}"></div>
        <div class="cc-field"><label>Estatus</label><select name="estatus"><option value="ACTIVO" ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option value="INACTIVO" ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option><option value="MANTENIMIENTO" ${x.estatus==='MANTENIMIENTO'?'selected':''}>MANTENIMIENTO</option></select></div>
        <div class="cc-field"><label>Largo (ft)</label><input name="largoFt" type="number" step="0.01" min="0" value="${esc(x.largoFt||'')}"></div>
        <div class="cc-field"><label>Ancho (ft)</label><input name="anchoFt" type="number" step="0.01" min="0" value="${esc(x.anchoFt||'')}"></div>
        <div class="cc-field"><label>Alto (ft)</label><input name="altoFt" type="number" step="0.01" min="0" value="${esc(x.altoFt||'')}"></div>
        <div class="cc-field full"><label>Observaciones</label><textarea name="observaciones">${esc(x.observaciones||'')}</textarea></div>
      </div>
      <div id="ccEditUnitStatus" class="cc-note" style="margin-top:10px">Los cambios se guardarán directamente en Supabase.</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="cc-btn cc-btn-light" id="ccEditUnitCancel">Cancelar</button>
        <button type="submit" class="cc-btn cc-btn-primary" id="ccEditUnitSave"><i class="fa-solid fa-floppy-disk mr-1"></i>Guardar cambios</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(ov);

  const close=()=>ov.remove();
  ov.querySelector('#ccEditUnitClose').onclick=close;
  ov.querySelector('#ccEditUnitCancel').onclick=close;

  ov.querySelector('#ccEditUnitForm').onsubmit=async e=>{
    e.preventDefault();
    e.stopPropagation();
    const fd=new FormData(e.currentTarget);
    const btn=ov.querySelector('#ccEditUnitSave');
    const status=ov.querySelector('#ccEditUnitStatus');
    btn.disabled=true;
    btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i>Guardando en Supabase...';
    status.textContent='Enviando cambios a PostgreSQL...';

    try{
      const tipo=configuracion.tiposUnidad.find(t=>t.id===fd.get('tipoUnidadId'));
      const numero=String(fd.get('numero')||'').trim();
      if(!numero)throw new Error('El número de unidad es obligatorio.');
      const dup=cajas.find(u=>u.id!==x.id&&String(u.numero||'').trim().toUpperCase()===numero.toUpperCase());
      if(dup)throw new Error('Ya existe otra unidad con el número '+numero+'.');

      const obj={
        ...x,
        id:x.id,
        tipoUnidadId:String(fd.get('tipoUnidadId')||''),
        tipoUnidadNombre:tipo?.nombre||x.tipoUnidadNombre||'CAJA',
        categoriaUnidad:tipo?.categoria||x.categoriaUnidad||'CAJA',
        numero,
        descripcion:String(fd.get('descripcion')||'').trim(),
        placasMx:String(fd.get('placasMx')||'').trim(),
        placasUsa:String(fd.get('placasUsa')||'').trim(),
        placas:String(fd.get('placasMx')||fd.get('placasUsa')||'').trim(),
        tipoUsoCaja:String(fd.get('tipoUsoCaja')||'').trim(),
        marca:String(fd.get('marca')||'').trim(),
        modelo:String(fd.get('modelo')||'').trim(),
        tamano:String(fd.get('tamano')||'').trim(),
        tipo:String(fd.get('tipo')||'').trim(),
        origen:String(fd.get('origen')||'').trim(),
        clienteId:String(fd.get('clienteId')||'').trim(),
        capacidad:String(fd.get('capacidad')||'').trim(),
        estatus:String(fd.get('estatus')||'ACTIVO').trim(),
        largoFt:Number(fd.get('largoFt')||0),
        anchoFt:Number(fd.get('anchoFt')||0),
        altoFt:Number(fd.get('altoFt')||0),
        largo:Number(fd.get('largoFt')||0)*0.3048,
        ancho:Number(fd.get('anchoFt')||0)*0.3048,
        alto:Number(fd.get('altoFt')||0)*0.3048,
        observaciones:String(fd.get('observaciones')||'').trim()
      };

      const {data,error}=await gmSupabase.rpc('cc_update_unit',{p_unidad:obj});
      if(error)throw new Error(error.message||String(error));
      if(!data?.ok)throw new Error(data?.detalle||data?.error||'Supabase rechazó la actualización.');

      status.textContent='Cambio aceptado. Verificando directamente en la base...';

      const {data:loaded,error:loadErr}=await gmSupabase.rpc('cc_load_all');
      if(loadErr)throw new Error(loadErr.message||String(loadErr));
      const dbUnits=Array.isArray(loaded?.state?.cajas)?loaded.state.cajas:[];
      const saved=dbUnits.find(u=>u.id===x.id);
      if(!saved)throw new Error('La unidad no apareció al verificar Supabase.');

      const fields=['numero','descripcion','placasMx','placasUsa','tipoUsoCaja','marca','modelo','tamano','tipo','origen','clienteId','capacidad','estatus','observaciones'];
      const diff=fields.filter(k=>String(saved[k]??'')!==String(obj[k]??''));
      if(diff.length)throw new Error('Supabase no confirmó: '+diff.join(', '));

      ccRevision=Number(loaded?.revision||ccRevision);
      ccNormalizeState(loaded?.state||{});
      ccRenderAll();

      await ccAudit({
        operacionId:ccAuditId('UNIT'),
        accion:'ACTUALIZAR_UNIDAD',
        modulo:'INVENTARIO',
        submodulo:'EDICION_DIRECTA',
        idRegistro:x.id,
        idUnidad:x.id,
        numeroUnidad:numero,
        datosAnteriores:x,
        datosNuevos:saved,
        detalle:'Edición directa confirmada en Supabase'
      });

      showStatus?.('UNIDAD ACTUALIZADA CORRECTAMENTE EN SUPABASE','success');
      alert('Unidad actualizada correctamente en Supabase.');
      close();
    }catch(err){
      console.error('EDITAR UNIDAD DIRECTO:',err);
      status.textContent='ERROR: '+(err.message||err);
      status.style.color='#b91c1c';
      btn.disabled=false;
      btn.innerHTML='<i class="fa-solid fa-floppy-disk mr-1"></i>Guardar cambios';
      alert('No se pudo actualizar la unidad.\n\n'+(err.message||err));
    }
  };
};

window.ccNuevaCaja=function(id){
  const x=cajas.find(a=>a.id===id)||{};
  const tipos=(configuracion.tiposUnidad||[]).filter(t=>t.estatus!=='INACTIVO');
  const tipoActual=x.tipoUnidadId||tipos.find(t=>String(t.nombre).toUpperCase()==='CAJA')?.id||'tipo_caja';
  const optsTipos=tipos.map(t=>`<option value="${t.id}" ${tipoActual===t.id?'selected':''}>${esc(t.nombre)}</option>`).join('');
  const opts=clientes.filter(a=>a.estatus!=='INACTIVO').map(a=>`<option value="${a.id}" ${x.clienteId===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('');
  const usos=(configuracion.tiposUsoCaja||[]).filter(u=>u.estatus!=='INACTIVO');
  const optsUsos=usos.map(u=>`<option value="${u.nombre}" ${x.tipoUsoCaja===u.nombre?'selected':''}>${esc(u.nombre)}</option>`).join('');
  const html=`<div class="cc-grid"><div class="cc-field"><label>Tipo de unidad</label><select name="tipoUnidadId" id="ccTipoUnidadModal" required onchange="ccActualizarCamposUnidadModal()">${optsTipos}</select></div><div class="cc-field"><label>Identificador / Número</label><input name="numero" required value="${esc(x.numero)}"></div><div class="cc-field"><label>Descripción</label><input name="descripcion" required value="${esc(x.descripcion)}"></div><div class="cc-field"><label>Placas MX</label><input name="placasMx" value="${esc(x.placasMx||x.placas||'')}" placeholder="Placas México"></div><div class="cc-field"><label>Placas USA</label><input name="placasUsa" value="${esc(x.placasUsa||'')}" placeholder="Placas Estados Unidos"></div><div class="cc-field"><label>Marca</label><input name="marca" value="${esc(x.marca)}"></div><div class="cc-field"><label>Modelo / Año</label><input name="modelo" value="${esc(x.modelo)}"></div><div class="cc-field" data-unit-field="caja"><label>Tamaño</label><input name="tamano" placeholder="53 FT, 48 FT..." value="${esc(x.tamano)}"></div><div class="cc-field" data-unit-field="caja"><label>Tipo de uso *</label><select name="tipoUsoCaja"><option value="">Selecciona uso</option>${optsUsos}</select></div><div class="cc-grid" data-unit-field="dimensiones" style="grid-column:1/-1;grid-template-columns:repeat(3,1fr);gap:10px"><div class="cc-field"><label>Largo</label><input name="largoFt" type="number" step="0.01" min="0" value="${esc(x.largoFt||(x.largo?Number(x.largo)/0.3048:''))}"></div><div class="cc-field"><label>Ancho</label><input name="anchoFt" type="number" step="0.01" min="0" value="${esc(x.anchoFt||(x.ancho?Number(x.ancho)/0.3048:''))}"></div><div class="cc-field"><label>Alto</label><input name="altoFt" type="number" step="0.01" min="0" value="${esc(x.altoFt||(x.alto?Number(x.alto)/0.3048:''))}"></div></div><div class="cc-field"><label>Tipo / Configuración</label><input name="tipo" value="${esc(x.tipo)}"></div><div class="cc-field"><label>Origen</label><select name="origen"><option value="MEXICANA" ${x.origen==='MEXICANA'||!x.origen?'selected':''}>MEXICANA</option><option value="USA" ${x.origen==='USA'?'selected':''}>USA</option></select></div><div class="cc-field"><label>Cliente asignado</label><select name="clienteId"><option value="">Sin cliente</option>${opts}</select></div><div class="cc-field"><label>Capacidad</label><input name="capacidad" value="${esc(x.capacidad)}"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option><option ${x.estatus==='MANTENIMIENTO'?'selected':''}>MANTENIMIENTO</option></select></div><div class="cc-field full"><label>Observaciones</label><textarea name="observaciones">${esc(x.observaciones)}</textarea></div></div><div class="cc-note" style="margin-top:10px"><i class="fa-solid fa-shield-halved mr-1"></i>El <b>Identificador / Número</b> es único y no puede repetirse en otra unidad.</div>`;

  if(!id){
    modal('Nueva unidad',html,f=>{
      const tipo=configuracion.tiposUnidad.find(t=>t.id===f.get('tipoUnidadId'));
      const esCajaNueva=String(tipo?.categoria||tipo?.nombre||'').toUpperCase().includes('CAJA');
      if(esCajaNueva&&!String(f.get('tipoUsoCaja')||'').trim())throw new Error('Selecciona el tipo de uso de la caja.');
      const numeroNuevo=String(f.get('numero')||'').trim();
      const duplicada=cajas.find(u=>String(u.numero||'').trim().toUpperCase()===numeroNuevo.toUpperCase());
      if(duplicada)throw new Error('Ya existe una unidad registrada con el código / número '+numeroNuevo+'.');
      cajas.push({id:uid(),tipoUnidadId:f.get('tipoUnidadId'),tipoUnidadNombre:tipo?.nombre||'CAJA',categoriaUnidad:tipo?.categoria||'CAJA',numero:numeroNuevo,descripcion:f.get('descripcion'),placasMx:String(f.get('placasMx')||'').trim(),placasUsa:String(f.get('placasUsa')||'').trim(),placas:String(f.get('placasMx')||f.get('placasUsa')||'').trim(),tipoUsoCaja:String(f.get('tipoUsoCaja')||'').trim(),marca:f.get('marca'),modelo:f.get('modelo'),tamano:f.get('tamano'),largoFt:Number(f.get('largoFt')||0),anchoFt:Number(f.get('anchoFt')||0),altoFt:Number(f.get('altoFt')||0),largo:Number(f.get('largoFt')||0)*0.3048,ancho:Number(f.get('anchoFt')||0)*0.3048,alto:Number(f.get('altoFt')||0)*0.3048,tipo:f.get('tipo'),origen:f.get('origen'),clienteId:f.get('clienteId'),capacidad:f.get('capacidad'),estatus:f.get('estatus'),observaciones:f.get('observaciones')});
    });
    setTimeout(ccActualizarCamposUnidadModal,0);
    return;
  }

  modal('Editar unidad',html,async f=>{
    const tipo=configuracion.tiposUnidad.find(t=>t.id===f.get('tipoUnidadId'));
    const esCajaNueva=String(tipo?.categoria||tipo?.nombre||'').toUpperCase().includes('CAJA');
    if(esCajaNueva&&!String(f.get('tipoUsoCaja')||'').trim())throw new Error('Selecciona el tipo de uso de la caja.');
    const numeroNuevo=String(f.get('numero')||'').trim();
    const duplicada=cajas.find(u=>u.id!==x.id&&String(u.numero||'').trim().toUpperCase()===numeroNuevo.toUpperCase());
    if(duplicada)throw new Error('Ya existe una unidad registrada con el código / número '+numeroNuevo+'.');
    const obj={...x,id:x.id,tipoUnidadId:f.get('tipoUnidadId'),tipoUnidadNombre:tipo?.nombre||'CAJA',categoriaUnidad:tipo?.categoria||'CAJA',numero:numeroNuevo,descripcion:f.get('descripcion'),placasMx:String(f.get('placasMx')||'').trim(),placasUsa:String(f.get('placasUsa')||'').trim(),placas:String(f.get('placasMx')||f.get('placasUsa')||'').trim(),tipoUsoCaja:String(f.get('tipoUsoCaja')||'').trim(),marca:f.get('marca'),modelo:f.get('modelo'),tamano:f.get('tamano'),largoFt:Number(f.get('largoFt')||0),anchoFt:Number(f.get('anchoFt')||0),altoFt:Number(f.get('altoFt')||0),largo:Number(f.get('largoFt')||0)*0.3048,ancho:Number(f.get('anchoFt')||0)*0.3048,alto:Number(f.get('altoFt')||0)*0.3048,tipo:f.get('tipo'),origen:f.get('origen'),clienteId:f.get('clienteId'),capacidad:f.get('capacidad'),estatus:f.get('estatus'),observaciones:f.get('observaciones')};
    const {data,error}=await gmSupabase.rpc('cc_update_unit',{p_unidad:obj});
    if(error)throw error;
    if(data?.ok===false)throw new Error((data?.detalle||data?.error||'Supabase rechazó la actualización'));
    if(!data?.unidad)throw new Error('Supabase no devolvió la unidad actualizada.');

    // Sincroniza inmediatamente el registro local con la respuesta real de PostgreSQL.
    cajas=cajas.map(u=>u.id===x.id?data.unidad:u);
    ccRevision=Number(data?.revision||ccRevision);
    ccRenderInventario();

    // Verificación real: volver a leer toda la base y comparar los campos editados.
    const reload=await ccReloadFromDatabase();
    if(!reload?.ok)throw new Error(reload?.error||'No se pudo verificar la actualización en Supabase.');
    const verificada=cajas.find(u=>u.id===x.id);
    if(!verificada)throw new Error('La unidad actualizada no apareció al volver a leer Supabase.');

    const esperado={
      numero:String(obj.numero||'').trim(),
      descripcion:String(obj.descripcion||''),
      placasMx:String(obj.placasMx||''),
      placasUsa:String(obj.placasUsa||''),
      tipoUsoCaja:String(obj.tipoUsoCaja||''),
      marca:String(obj.marca||''),
      modelo:String(obj.modelo||''),
      tamano:String(obj.tamano||''),
      tipo:String(obj.tipo||''),
      origen:String(obj.origen||''),
      clienteId:String(obj.clienteId||''),
      capacidad:String(obj.capacidad||''),
      estatus:String(obj.estatus||''),
      observaciones:String(obj.observaciones||'')
    };
    const actual={
      numero:String(verificada.numero||'').trim(),
      descripcion:String(verificada.descripcion||''),
      placasMx:String(verificada.placasMx||''),
      placasUsa:String(verificada.placasUsa||''),
      tipoUsoCaja:String(verificada.tipoUsoCaja||''),
      marca:String(verificada.marca||''),
      modelo:String(verificada.modelo||''),
      tamano:String(verificada.tamano||''),
      tipo:String(verificada.tipo||''),
      origen:String(verificada.origen||''),
      clienteId:String(verificada.clienteId||''),
      capacidad:String(verificada.capacidad||''),
      estatus:String(verificada.estatus||''),
      observaciones:String(verificada.observaciones||'')
    };
    const diferencias=Object.keys(esperado).filter(k=>esperado[k]!==actual[k]);
    if(diferencias.length)throw new Error('Supabase no confirmó estos cambios: '+diferencias.join(', '));

    await ccAudit({operacionId:ccAuditId('UNIT'),accion:'ACTUALIZAR_UNIDAD',modulo:'INVENTARIO',submodulo:'UNIDAD',idRegistro:x.id,idUnidad:x.id,numeroUnidad:numeroNuevo,datosAnteriores:x,datosNuevos:verificada,detalle:'Unidad actualizada y verificada campo por campo en Supabase'});
    showStatus?.('UNIDAD ACTUALIZADA Y VERIFICADA EN SUPABASE','success');
    return {skipCloudSave:true};
  });
  setTimeout(ccActualizarCamposUnidadModal,0);
};
window.ccActualizarCamposUnidadModal=function(){const s=document.getElementById('ccTipoUnidadModal');if(!s)return;const t=configuracion.tiposUnidad.find(x=>x.id===s.value);const esCaja=String(t?.categoria||t?.nombre||'CAJA').toUpperCase().includes('CAJA');document.querySelectorAll('#ccForm [data-unit-field="caja"]').forEach(el=>el.style.display=esCaja?'block':'none');document.querySelectorAll('#ccForm [data-unit-field="dimensiones"]').forEach(el=>el.style.display=esCaja?'none':'grid');};
window.ccNuevoCliente=function(id){const x=clientes.find(a=>a.id===id)||{};modal(id?'Editar cliente':'Nuevo cliente',`<div class="cc-grid"><div class="cc-field"><label>Nombre / Razón social</label><input name="nombre" required value="${esc(x.nombre)}"></div><div class="cc-field"><label>Contacto</label><input name="contacto" value="${esc(x.contacto)}"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="${esc(x.telefono)}"></div><div class="cc-field"><label>Correo</label><input name="correo" type="email" value="${esc(x.correo)}"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option></select></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones">${esc(x.observaciones)}</textarea></div></div>`,f=>{const o={...x,id:x.id||uid(),nombre:f.get('nombre'),contacto:f.get('contacto'),telefono:f.get('telefono'),correo:f.get('correo'),estatus:f.get('estatus'),observaciones:f.get('observaciones')};if(id)clientes=clientes.map(a=>a.id===id?o:a);else clientes.push(o);});};
window.ccNuevoResponsable=function(id){const x=responsables.find(a=>a.id===id)||{};modal(id?'Editar responsable':'Nuevo responsable',`<div class="cc-grid"><div class="cc-field"><label>Nombre completo</label><input name="nombre" required value="${esc(x.nombre)}"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="${esc(x.telefono)}"></div><div class="cc-field"><label>Correo</label><input name="correo" type="email" value="${esc(x.correo)}"></div><div class="cc-field"><label>Área / Puesto</label><input name="puesto" value="${esc(x.puesto)}"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option></select></div></div>`,f=>{const o={...x,id:x.id||uid(),nombre:f.get('nombre'),telefono:f.get('telefono'),correo:f.get('correo'),puesto:f.get('puesto'),estatus:f.get('estatus')};if(id)responsables=responsables.map(a=>a.id===id?o:a);else responsables.push(o);});};
window.ccRentaTipoFiltroActual='CAJA';
window.ccFiltrarRentaTipo=function(tipo){window.ccRentaTipoFiltroActual=['CAJA','CARRO','TODOS'].includes(tipo)?tipo:'CAJA';const t=document.getElementById('ccRentaListadoTipoTitulo');if(t)t.textContent=window.ccRentaTipoFiltroActual==='CAJA'?'Listado de cajas en renta':window.ccRentaTipoFiltroActual==='CARRO'?'Listado de carros en renta':'Listado de unidades en renta';if(typeof ccRenderRenta==='function')ccRenderRenta();};
window.ccNuevaRenta=function(id){const x=rentas.find(a=>a.id===id)||{};const optsC=clientes.filter(a=>a.estatus!=='INACTIVO').map(a=>`<option value="${a.id}" ${x.clienteId===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('');const optsR=cajas.filter(a=>a.estatus!=='INACTIVO'&&a.estatus!=='MANTENIMIENTO'&&(window.ccRentaTipoFiltroActual==='TODOS'||String(a.categoriaUnidad||a.tipoUnidadNombre||'CAJA').toUpperCase()===(window.ccRentaTipoFiltroActual||'CAJA'))).map(a=>`<option value="${a.id}" ${x.cajaId===a.id?'selected':''}>${esc(a.numero)} — ${esc(a.descripcion)}</option>`).join('');const optsP=responsables.filter(a=>a.estatus!=='INACTIVO').map(a=>`<option value="${a.id}" ${x.responsableId===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('');modal(id?'Editar unidad de renta':'Nueva unidad de renta',`<div class="cc-grid"><div class="cc-field"><label>Unidad</label><select name="cajaId" required>${optsR||'<option value="">Primero registra una caja</option>'}</select></div><div class="cc-field"><label>Cliente</label><select name="clienteId" required onchange="ccActualizarTarifaRenta()">${optsC||'<option value="">Primero registra un cliente</option>'}</select></div><div class="cc-field"><label>Responsable</label><select name="responsableId" required>${optsP||'<option value="">Primero registra un responsable</option>'}</select></div><div class="cc-field"><label>Fecha de renta</label><input name="fechaInicio" type="date" required value="${esc(x.fechaInicio||iso(new Date()))}"></div><div class="cc-field"><label>Fecha fin</label><input name="fechaFin" type="date" value="${esc(x.fechaFin)}"></div><div class="cc-field"><label>Tipo de renta</label><select name="metodoCobro"><option value="DIARIO" ${x.metodoCobro==='DIARIO'||!x.metodoCobro?'selected':''}>Diario</option><option value="SEMANAL" ${x.metodoCobro==='SEMANAL'?'selected':''}>Semanal</option><option value="MENSUAL" ${x.metodoCobro==='MENSUAL'?'selected':''}>Mensual</option></select></div><div class="cc-field"><label>Renta indeterminada</label><select name="indeterminada"><option value="SI" ${x.indeterminada==='SI'?'selected':''}>SÍ</option><option value="NO" ${x.indeterminada!=='SI'?'selected':''}>NO</option></select></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones">${esc(x.observaciones)}</textarea></div></div>`,f=>{const o={...x,id:x.id||uid(),metodoCobro:f.get('metodoCobro')||'DIARIO',tarifaId:f.get('tarifaId')||'',totalTarifa:Number(f.get('totalTarifa')||0),cajaId:f.get('cajaId'),clienteId:f.get('clienteId'),responsableId:f.get('responsableId'),fechaInicio:f.get('fechaInicio'),fechaFin:f.get('fechaFin'),indeterminada:f.get('indeterminada'),observaciones:f.get('observaciones')};if(id)rentas=rentas.map(a=>a.id===id?o:a);else rentas.push(o);});};
window.ccSacarDeRenta=function(id){
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
};

window.ccUploadMantenimientoEvidencia=async function(file,unidadId){
  if(!file)return '';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('La evidencia debe ser JPG, PNG o WEBP.');
  if(file.size>5*1024*1024)throw new Error('La imagen no puede pesar más de 5 MB.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path=`${unidadId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
  const {error}=await gmSupabase.storage.from('cc-mantenimiento').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(error)throw error;
  const {data}=gmSupabase.storage.from('cc-mantenimiento').getPublicUrl(path);
  return data?.publicUrl||'';
};

window.ccPonerMantenimiento=async function(id){
  const x=cajas.find(a=>a.id===id);
  if(!x)return;
  if(x.estatus==='MANTENIMIENTO'){alert('Esta unidad ya está en mantenimiento.');return;}
  document.getElementById('ccMantEntradaModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccMantEntradaModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML=`<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#991b1b;color:#fff;display:flex;justify-content:space-between;align-items:center"><strong>FUERA DE SERVICIO · ${esc(x.numero||x.descripcion||'UNIDAD')}</strong><button type="button" id="ccMantEntradaCerrar" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button></div>
    <form id="ccMantEntradaForm" style="padding:18px">
      <div class="cc-field"><label>Motivo del mantenimiento *</label><textarea name="motivo" required placeholder="Describe la falla o motivo por el que sale de servicio"></textarea></div>
      <div class="cc-field" style="margin-top:12px"><label>Foto de evidencia (opcional)</label><input name="evidencia" type="file" accept="image/jpeg,image/png,image/webp"><div class="cc-note">JPG, PNG o WEBP · máximo 5 MB. La foto se guardará en Supabase y se incluirá en el PDF.</div></div>
      <div id="ccMantPreview" style="display:none;margin-top:10px"><img style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e2e8f0"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" id="ccMantEntradaCancelar">Cancelar</button><button class="cc-btn cc-btn-maintenance">Confirmar fuera de servicio</button></div>
    </form>
  </div>`;
  document.body.appendChild(ov);
  const cerrar=()=>ov.remove();
  ov.querySelector('#ccMantEntradaCerrar').onclick=cerrar;
  ov.querySelector('#ccMantEntradaCancelar').onclick=cerrar;
  const input=ov.querySelector('input[name="evidencia"]');
  input.onchange=()=>{const file=input.files?.[0];const box=ov.querySelector('#ccMantPreview');if(!file){box.style.display='none';return;}box.querySelector('img').src=URL.createObjectURL(file);box.style.display='block';};
  ov.querySelector('#ccMantEntradaForm').onsubmit=async e=>{
    e.preventDefault();
    const motivo=String(new FormData(e.target).get('motivo')||'').trim();
    if(!motivo)return;
    const file=input.files?.[0]||null;
    try{
      const btn=e.target.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
      showStatus?.('Enviando unidad a mantenimiento en Supabase...','info');
      let evidenciaUrl='';
      if(file){showStatus?.('Subiendo foto de evidencia...','info');evidenciaUrl=await ccUploadMantenimientoEvidencia(file,x.id);}
      const fecha=new Date().toISOString();
      const {data,error}=await gmSupabase.rpc('cc_start_maintenance',{p_unidad_id:x.id,p_motivo:motivo,p_fecha:fecha,p_evidencia_url:evidenciaUrl||null});
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo enviar a mantenimiento');
      ccRevision=Number(data?.revision||ccRevision);
      const record=data?.record||{};
      cerrar();
      await ccReloadFromDatabase();
      const unidadActual=cajas.find(a=>a.id===id)||x;
      await ccAudit({operacionId:ccAuditId('MANT'),accion:'ENTRADA_MANTENIMIENTO',modulo:'MANTENIMIENTO',submodulo:'ENTRADA',idRegistro:record.id||'',idUnidad:id,numeroUnidad:unidadActual.numero||'',idCliente:unidadActual.clienteId||'',idMantenimiento:record.id||'',estatusAnterior:x.estatus,estatusNuevo:'MANTENIMIENTO',datosNuevos:record,detalle:motivo});
      showStatus?.('UNIDAD EN MANTENIMIENTO · Guardado en Supabase','success');
      await ccGenerarPDFMantenimiento(record,unidadActual);
      await ccEnviarAvisoMantenimiento(unidadActual,record,'ENTRADA');
    }catch(err){console.error('ERROR ENVIANDO A MANTENIMIENTO:',err);showStatus?.('ERROR: no se envió a mantenimiento · '+(err.message||err),'error');alert('No se pudo poner la unidad fuera de servicio:\n'+(err.message||err));const btn=e.target.querySelector('button[type="submit"]');if(btn){btn.disabled=false;btn.textContent='Confirmar fuera de servicio';}}
  };
};

window.ccLiberarMantenimiento=async function(id){
  const x=cajas.find(a=>a.id===id);
  if(!x)return;
  if(x.estatus!=='MANTENIMIENTO'){alert('Esta unidad no está en mantenimiento.');return;}
  const recActual=(configuracion.mantenimientoHistorial||[]).find(r=>r.cajaId===x.id&&!r.fechaLiberacion)||
                  (configuracion.mantenimientoHistorial||[]).find(r=>r.id===x.mantenimientoRecordId);

  document.getElementById('ccMantLiberarModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccMantLiberarModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML=`<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#166534;color:#fff;display:flex;justify-content:space-between;align-items:center">
      <strong>LIBERAR UNIDAD · ${esc(x.numero||x.descripcion||'UNIDAD')}</strong>
      <button type="button" id="ccMantLibCerrar" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
    </div>
    <form id="ccMantLibForm" style="padding:18px">
      <div class="cc-field"><label>¿Qué se reparó? *</label><textarea name="reparacion" required placeholder="Describe el trabajo realizado, piezas cambiadas o reparación efectuada"></textarea></div>
      <div class="cc-field" style="margin-top:12px">
        <label>Foto de evidencia de liberación (opcional)</label>
        <input name="evidenciaLiberacion" type="file" accept="image/jpeg,image/png,image/webp">
        <div class="cc-note">JPG, PNG o WEBP · máximo 5 MB. En el correo y PDF de liberación se incluirán esta foto y la evidencia original de fuera de servicio cuando existan.</div>
      </div>
      ${recActual?.evidenciaUrl?`<div class="cc-note" style="margin-top:10px;color:#1e40af"><i class="fa-solid fa-camera mr-1"></i>Ya existe evidencia de entrada a mantenimiento y se conservará para el cierre.</div>`:''}
      <div id="ccMantLibPreview" style="display:none;margin-top:10px"><img style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e2e8f0"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="cc-btn cc-btn-light" id="ccMantLibCancelar">Cancelar</button>
        <button class="cc-btn cc-btn-primary" type="submit">Liberar unidad</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(ov);
  const cerrar=()=>ov.remove();
  ov.querySelector('#ccMantLibCerrar').onclick=cerrar;
  ov.querySelector('#ccMantLibCancelar').onclick=cerrar;

  const input=ov.querySelector('input[name="evidenciaLiberacion"]');
  input.onchange=()=>{
    const file=input.files?.[0];
    const box=ov.querySelector('#ccMantLibPreview');
    if(!file){box.style.display='none';return;}
    box.querySelector('img').src=URL.createObjectURL(file);
    box.style.display='block';
  };

  ov.querySelector('#ccMantLibForm').onsubmit=async e=>{
    e.preventDefault();
    const reparacion=String(new FormData(e.target).get('reparacion')||'').trim();
    if(!reparacion)return;
    const file=input.files?.[0]||null;
    const btn=e.target.querySelector('button[type="submit"]');

    try{
      if(btn){btn.disabled=true;btn.textContent='Liberando...';}
      showStatus?.('Liberando unidad de mantenimiento...','info');

      let evidenciaLiberacionUrl='';
      if(file){
        showStatus?.('Subiendo foto de liberación...','info');
        evidenciaLiberacionUrl=await ccUploadMantenimientoEvidencia(file,x.id);
      }

      const {data,error}=await gmSupabase.rpc('cc_release_maintenance',{
        p_unidad_id:x.id,
        p_reparacion:reparacion,
        p_fecha:new Date().toISOString(),
        p_evidencia_liberacion_url:evidenciaLiberacionUrl||null
      });
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo liberar mantenimiento');

      ccRevision=Number(data?.revision||ccRevision);
      const record=data?.record||{};
      cerrar();
      await ccReloadFromDatabase();

      const unidadActual=cajas.find(a=>a.id===id)||x;
      const recordActual=(configuracion.mantenimientoHistorial||[]).find(r=>r.id===record.id)||record;

      await ccAudit({
        operacionId:ccAuditId('MANT'),
        accion:'LIBERACION_MANTENIMIENTO',
        modulo:'MANTENIMIENTO',
        submodulo:'LIBERACION',
        idRegistro:recordActual.id||'',
        idUnidad:x.id,
        numeroUnidad:x.numero||'',
        idMantenimiento:recordActual.id||'',
        estatusAnterior:'MANTENIMIENTO',
        estatusNuevo:'ACTIVO',
        datosNuevos:recordActual,
        detalle:'Reparación realizada: '+reparacion+(evidenciaLiberacionUrl?' | Evidencia de liberación adjunta':'')
      });

      showStatus?.('UNIDAD LIBERADA · Generando PDF y enviando correo...','success');
      await ccGenerarPDFMantenimiento(recordActual,unidadActual);
      const mail=await ccEnviarAvisoMantenimiento(unidadActual,recordActual,'LIBERACION');
      if(mail?.ok)showStatus?.('UNIDAD LIBERADA · CORREO DE LIBERACIÓN ENVIADO','success');
      else showStatus?.('UNIDAD LIBERADA · No se pudo enviar el correo de liberación','error');
    }catch(err){
      console.error('ERROR LIBERANDO MANTENIMIENTO:',err);
      showStatus?.('ERROR: no se pudo liberar mantenimiento · '+(err.message||err),'error');
      alert('No se pudo liberar la unidad:\n'+(err.message||err));
      if(btn){btn.disabled=false;btn.textContent='Liberar unidad';}
    }
  };
};

window.ccRenderMantenimiento=function(){
  const body=document.getElementById('ccMaintenanceBody');
  const hist=document.getElementById('ccMaintenanceHistoryBody');
  const badge=document.getElementById('ccMaintenanceBadge');
  const activos=cajas.filter(x=>x.estatus==='MANTENIMIENTO');
  if(badge)badge.textContent=activos.length+' en mantenimiento';
  const sel=document.getElementById('ccMantUnidad');
  if(sel){const cur=sel.value;sel.innerHTML='<option value="">Todas las unidades</option>'+cajas.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.numero||x.descripcion||'UNIDAD')+'</option>').join('');sel.value=cur;}
  if(body){
    body.innerHTML=activos.length?activos.map((x,i)=>{
      const rec=(configuracion.mantenimientoHistorial||[]).find(r=>r.cajaId===x.id&&!r.fechaLiberacion)||(configuracion.mantenimientoHistorial||[]).find(r=>r.id===x.mantenimientoRecordId);
      const fecha=rec?.fechaSalida?new Date(rec.fechaSalida).toLocaleString('es-MX'):'—';const acciones=[];
      if(ccPerm('mantenimiento.editar_registros')||ccPerm('inventario.mantenimiento'))acciones.push('<button class="cc-btn cc-btn-primary" onclick="ccLiberarMantenimiento(\''+x.id+'\')">Liberar</button>');
      if(rec)acciones.push('<button class="cc-btn cc-btn-light" onclick="ccGenerarPDFMantenimientoById(\''+rec.id+'\')">PDF</button>');
      return '<tr><td>'+(i+1)+'</td><td><strong>'+esc(x.numero||'—')+'</strong></td><td>'+esc(x.descripcion||'—')+'</td><td><span class="cc-badge cc-status-mant">MANTENIMIENTO</span></td><td>'+esc(fecha)+'</td><td>'+esc(rec?.motivo||x.mantenimientoMotivo||'—')+'</td><td>—</td><td>'+((acciones.join(' '))||'—')+'</td></tr>';
    }).join(''):'<tr><td colspan="8" style="padding:28px;text-align:center;color:#94a3b8">No hay unidades en mantenimiento.</td></tr>';
  }
  if(hist){
    const desde=document.getElementById('ccMantDesde')?.value||'',hasta=document.getElementById('ccMantHasta')?.value||'',unidad=document.getElementById('ccMantUnidad')?.value||'';
    const registros=[...(configuracion.mantenimientoHistorial||[])].filter(r=>{const fecha=String(r.fechaSalida||'').slice(0,10);if(desde&&fecha<desde)return false;if(hasta&&fecha>hasta)return false;if(unidad&&r.cajaId!==unidad)return false;return true;});
    window.ccMaintenanceFiltered=registros;
    hist.innerHTML=registros.length?registros.map((r,i)=>{
      const fs=r.fechaSalida?new Date(r.fechaSalida).toLocaleString('es-MX'):'—',fl=r.fechaLiberacion?new Date(r.fechaLiberacion).toLocaleString('es-MX'):'—',ev=[];
      if(r.evidenciaUrl)ev.push('<a class="cc-btn cc-btn-light" target="_blank" rel="noopener" href="'+esc(r.evidenciaUrl)+'"><i class="fa-solid fa-image"></i> Entrada</a>');
      if(r.evidenciaLiberacionUrl)ev.push('<a class="cc-btn cc-btn-light" target="_blank" rel="noopener" href="'+esc(r.evidenciaLiberacionUrl)+'"><i class="fa-solid fa-image"></i> Liberación</a>');
      const actions=['<button class="cc-btn cc-btn-light" onclick="ccGenerarPDFMantenimientoById(\''+r.id+'\')">PDF</button>'];
      if(ccPerm('mantenimiento.editar_registros'))actions.unshift('<button class="cc-btn cc-btn-light" onclick="ccEditarMantenimientoRegistro(\''+r.id+'\')"><i class="fa-solid fa-pen"></i> Editar</button>');
      return '<tr><td>'+(i+1)+'</td><td><strong>'+esc(r.numero||'—')+'</strong></td><td>'+esc(fs)+'</td><td>'+esc(r.motivo||'—')+'<div style="font-size:9px;color:#64748b;margin-top:4px">Reparación: '+esc(r.reparacion||'Pendiente')+'</div></td><td>'+esc(fl)+'</td><td><span class="cc-badge '+(r.fechaLiberacion?'cc-ok':'cc-status-mant')+'">'+(r.fechaLiberacion?'LIBERADA':'MANTENIMIENTO')+'</span></td><td><div style="display:flex;gap:5px;flex-wrap:wrap">'+(ev.join(' ')||'—')+'</div></td><td><div style="display:flex;gap:5px;flex-wrap:wrap">'+actions.join(' ')+'</div></td></tr>';
    }).join(''):'<tr><td colspan="8" style="padding:28px;text-align:center;color:#94a3b8">Sin historial con los filtros seleccionados.</td></tr>';
  }
  const dotBtn=document.getElementById('ccBtnVistaDot');if(dotBtn)dotBtn.style.display=ccPerm('mantenimiento.ver_dot')?'':'none';
};


window.ccLimpiarFiltrosMantenimiento=function(){
  const d=document.getElementById('ccMantDesde'),h=document.getElementById('ccMantHasta'),u=document.getElementById('ccMantUnidad');
  if(d)d.value='';if(h)h.value='';if(u)u.value='';ccRenderMantenimiento();
};
window.ccMostrarMantenimientoHistorial=function(){
  const m=document.getElementById('ccMaintenanceView'),d=document.getElementById('ccDotSection');
  if(m)m.style.display='block';if(d)d.style.display='none';ccRenderMantenimiento();
};
window.ccEditarMantenimientoRegistro=function(id){
  if(!ccPerm('mantenimiento.editar_registros')){alert('Tu usuario no tiene permiso para editar mantenimiento.');return;}
  const r=(configuracion.mantenimientoHistorial||[]).find(x=>x.id===id);if(!r)return;
  const dt=function(v){if(!v)return '';const d=new Date(v),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());};
  document.getElementById('ccMantEditModal')?.remove();
  const ov=document.createElement('div');ov.id='ccMantEditModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML='<div style="background:#fff;width:min(650px,96vw);border-radius:16px;overflow:hidden"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>EDITAR MANTENIMIENTO · '+esc(r.numero||'UNIDAD')+'</strong><button type="button" id="ccMantEditClose" style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form id="ccMantEditForm" style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Fecha salida</label><input name="fechaSalida" type="datetime-local" value="'+esc(dt(r.fechaSalida))+'" required></div><div class="cc-field"><label>Fecha liberación</label><input name="fechaLiberacion" type="datetime-local" value="'+esc(dt(r.fechaLiberacion))+'"></div></div><div class="cc-field" style="margin-top:10px"><label>Motivo</label><textarea name="motivo" required>'+esc(r.motivo||'')+'</textarea></div><div class="cc-field" style="margin-top:10px"><label>Reparación</label><textarea name="reparacion">'+esc(r.reparacion||'')+'</textarea></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" id="ccMantEditCancel">Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
  document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('#ccMantEditClose').onclick=close;ov.querySelector('#ccMantEditCancel').onclick=close;
  ov.querySelector('#ccMantEditForm').onsubmit=async function(e){e.preventDefault();const fd=new FormData(e.currentTarget),btn=e.currentTarget.querySelector('button[type=submit]');btn.disabled=true;
    try{const fs=String(fd.get('fechaSalida')||''),fl=String(fd.get('fechaLiberacion')||'');const res=await gmSupabase.rpc('cc_update_maintenance_record',{p_id:id,p_fecha_salida:fs?new Date(fs).toISOString():null,p_motivo:String(fd.get('motivo')||''),p_fecha_liberacion:fl?new Date(fl).toISOString():null,p_reparacion:String(fd.get('reparacion')||'')});if(res.error)throw res.error;if(res.data?.ok===false)throw new Error(res.data.error||'No se pudo actualizar');close();await ccReloadFromDatabase();ccRenderMantenimiento();showStatus?.('MANTENIMIENTO ACTUALIZADO','success');}
    catch(err){alert('No se pudo editar el registro. '+(err.message||err));btn.disabled=false;}
  };
};
window.ccGenerarPDFHistorialMantenimiento=async function(){
  const rows=Array.isArray(window.ccMaintenanceFiltered)?window.ccMaintenanceFiltered:[...(configuracion.mantenimientoHistorial||[])];
  if(!rows.length){alert('No hay registros de mantenimiento con los filtros seleccionados.');return;}
  if(!window.jspdf?.jsPDF){alert('La librería PDF no está disponible.');return;}
  try{
    const jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'mm',format:'letter'});let y=18;
    doc.setFillColor(15,23,42);doc.rect(0,0,216,28,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('HISTORIAL DE MANTENIMIENTO',14,12);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text(rows.length+' registro(s) · generado '+new Date().toLocaleString('es-MX'),14,19);y=36;
    for(let i=0;i<rows.length;i++){
      const r=rows[i];if(y>220){doc.addPage();y=18;}
      doc.autoTable({startY:y,theme:'grid',head:[['CAMPO','DETALLE']],body:[['Unidad',r.numero||'—'],['Fecha salida',r.fechaSalida?new Date(r.fechaSalida).toLocaleString('es-MX'):'—'],['Motivo',r.motivo||'—'],['Reparación',r.reparacion||'Pendiente'],['Fecha liberación',r.fechaLiberacion?new Date(r.fechaLiberacion).toLocaleString('es-MX'):'—'],['Estatus',r.fechaLiberacion?'LIBERADA':'MANTENIMIENTO']],styles:{fontSize:8,cellPadding:2.2,overflow:'linebreak'},headStyles:{fillColor:[30,41,59],textColor:255},columnStyles:{0:{cellWidth:42,fontStyle:'bold'},1:{cellWidth:140}},margin:{left:16,right:16}});
      y=doc.lastAutoTable.finalY+5;const evidencias=[{url:r.evidenciaUrl,t:'Evidencia de entrada'},{url:r.evidenciaLiberacionUrl,t:'Evidencia de liberación'}].filter(x=>x.url);
      for(const ev of evidencias){try{const img=await ccImageUrlToDataUrl(ev.url),props=doc.getImageProperties(img),ratio=Math.min(165/props.width,75/props.height),w=props.width*ratio,h=props.height*ratio;if(y+h+12>265){doc.addPage();y=18;}doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(51,65,85);doc.text(ev.t,18,y);y+=4;doc.addImage(img,props.fileType||'JPEG',18,y,w,h);y+=h+7;}catch(e){doc.setFontSize(7);doc.setTextColor(185,28,28);doc.text('No fue posible cargar una evidencia.',18,y);y+=6;}}
      y+=4;
    }
    const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(7);doc.setTextColor(100,116,139);doc.text('Página '+p+' de '+pages,177,272);}
    const desde=document.getElementById('ccMantDesde')?.value||'inicio',hasta=document.getElementById('ccMantHasta')?.value||'actual';doc.save('Historial_Mantenimiento_'+desde+'_a_'+hasta+'.pdf');showStatus?.('PDF DE MANTENIMIENTO GENERADO · '+rows.length+' registros','success');
  }catch(err){console.error('PDF HISTORIAL MANT:',err);alert('No se pudo generar el PDF. '+(err.message||err));}
};


function del(arr,id){
 if(!confirm('Este registro se conservará en el historial y se marcará como INACTIVO/CANCELADO. ¿Continuar?'))return;
 const x=arr.find(a=>a.id===id); if(!x)return;
 const antes=JSON.parse(JSON.stringify(x));
 const op=ccAuditId('DEL');
 let accion='BAJA_LOGICA',sub='REGISTRO';
 if(arr===rentas){x.estatus='CANCELADA';x.canceladaEn=new Date().toISOString();x.observaciones=(x.observaciones?String(x.observaciones)+' | ':'')+'Renta cancelada sin borrar el registro.';accion='CANCELAR_RENTA';sub='RENTA';}
 else {x.estatus='INACTIVO';x.inactivadoEn=new Date().toISOString();if(arr===cajas)sub='INVENTARIO';else if(arr===clientes)sub='CLIENTES';else if(arr===responsables)sub='RESPONSABLES';}
 ccAudit({operacionId:op,accion:accion,modulo:'CONTROL_CAJA',submodulo:sub,idRegistro:x.id,idUnidad:arr===cajas?x.id:(x.cajaId||''),numeroUnidad:arr===cajas?x.numero:'',idCliente:arr===clientes?x.id:(x.clienteId||''),cliente:arr===clientes?x.nombre:'',idRenta:arr===rentas?x.id:'',estatusAnterior:antes.estatus,estatusNuevo:x.estatus,datosAnteriores:antes,datosNuevos:x,detalle:'Baja lógica / cancelación'});
 save();ccRenderAll();
}
window.ccDeleteCaja=id=>alert('Las unidades no se pueden eliminar. Puedes editarlas o enviarlas a mantenimiento.');window.ccDeleteCliente=id=>del(clientes,id);window.ccDeleteResponsable=id=>del(responsables,id);window.ccDeleteRenta=id=>del(rentas,id);
function days(){const a=[],d=new Date();d.setHours(12,0,0,0);for(let i=-3;i<12;i++){const x=new Date(d);x.setDate(d.getDate()+i);a.push(iso(x));}return a;}function rentFor(rid,date){const k=rid+'_'+date;const r=rentas.find(x=>x.id===rid);if(!r||r.estatus==='FINALIZADA'||r.estatus==='CANCELADA')return false;if(Object.prototype.hasOwnProperty.call(matriz,k))return !!matriz[k];/* La fecha fin es vencimiento programado, no salida automática. */return date>=r.fechaInicio;}window.ccToggleDay=function(rid,date){
  const k=rid+'_'+date;
  const actualmenteRentada=rentFor(rid,date);
  const r=rentas.find(x=>x.id===rid);
  const unidad=r?cajas.find(x=>x.id===r.cajaId):null;

  // Si el usuario está activando el día, se conserva el comportamiento normal.
  if(!actualmenteRentada){
    matriz[k]=true;
    ccAudit({operacionId:ccAuditId('DAY'),accion:'CAMBIO_DIA_RENTA',modulo:'RENTA',submodulo:'MATRIZ',idRegistro:rid,idRenta:rid,fechaNueva:date,estatusAnterior:'NO',estatusNuevo:'SI',detalle:'Día marcado como rentado'});
    save();
    ccRenderRenta();
    return;
  }

  // Al pasar de SI -> NO se debe definir el motivo de la salida.
  if(!unidad){
    matriz[k]=false;
    ccAudit({operacionId:ccAuditId('DAY'),accion:'CAMBIO_DIA_RENTA',modulo:'RENTA',submodulo:'MATRIZ',idRegistro:rid,idRenta:rid,fechaNueva:date,estatusAnterior:'SI',estatusNuevo:'NO',detalle:'Día desmarcado sin unidad relacionada'});
    save();
    ccRenderRenta();
    return;
  }

  const cliente=r?clientes.find(c=>c.id===r.clienteId):null;
  const clienteNombre=cliente?.nombre||'Sin cliente';
  const numero=unidad.numero||unidad.descripcion||'Sin número';

  document.getElementById('ccSalidaRentaModal')?.remove();

  const ov=document.createElement('div');
  ov.id='ccSalidaRentaModal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:10050;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML=`
    <div style="background:#fff;width:min(560px,96vw);border-radius:18px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.35)">
      <div style="padding:16px 20px;background:#0f172a;color:#fff">
        <div style="font-size:15px;font-weight:950">Cambiar SI → NO</div>
        <div style="font-size:10px;color:#cbd5e1;margin-top:4px">
          ${esc(numero)} · ${esc(clienteNombre)} · ${fmtDate(date)}
        </div>
      </div>

      <div style="padding:20px">
        <div style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:6px">
          ¿Qué quieres hacer con esta caja?
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:16px">
          Selecciona si la caja termina su renta o si sale temporalmente de servicio para mantenimiento.
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button type="button" id="ccSalirRentaBtn"
            style="border:1px solid #fecaca;background:#fff1f2;color:#b91c1c;border-radius:12px;padding:15px;cursor:pointer;text-align:left">
            <div style="font-weight:950;font-size:12px">⛔ Salir de renta</div>
            <div style="font-size:9px;margin-top:5px;color:#7f1d1d">
              Termina la renta de esta caja desde este día.
            </div>
          </button>

          <button type="button" id="ccMantenimientoBtn"
            style="border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:12px;padding:15px;cursor:pointer;text-align:left">
            <div style="font-weight:950;font-size:12px">🔧 Ir a mantenimiento</div>
            <div style="font-size:9px;margin-top:5px;color:#78350f">
              La caja sale de servicio, pero la renta se conserva.
            </div>
          </button>
        </div>

        <div id="ccSalidaDetalle" style="margin-top:14px"></div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button type="button" class="cc-btn cc-btn-light" id="ccCancelarSalida">Cancelar</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(ov);

  const cerrar=()=>ov.remove();
  document.getElementById('ccCancelarSalida').onclick=cerrar;

  document.getElementById('ccSalirRentaBtn').onclick=()=>{
    // Se conserva el registro histórico de renta, pero se corta la vigencia a partir de este día.
    matriz[k]=false;
    const rentaAntes=JSON.parse(JSON.stringify(r||{}));
    if(r){
      r.fechaFin=date;
      r.indeterminada='NO';
      r.observaciones=(r.observaciones?String(r.observaciones)+' | ':'')+
        `Renta finalizada el ${date}.`;
    }
    cerrar();
    ccAudit({operacionId:ccAuditId('RENTA'),accion:'SALIDA_RENTA',modulo:'RENTA',submodulo:'SALIDA',idRegistro:r?.id||rid,idUnidad:unidad?.id||'',numeroUnidad:unidad?.numero||'',idCliente:r?.clienteId||'',idRenta:r?.id||rid,estatusAnterior:'SI',estatusNuevo:'NO',datosAnteriores:rentaAntes,datosNuevos:r||{},fechaNueva:date,detalle:'Caja salió de renta desde el día seleccionado'});
    save();
    ccRenderAll();
  };

  document.getElementById('ccMantenimientoBtn').onclick=()=>{
    const detalle=document.getElementById('ccSalidaDetalle');
    detalle.innerHTML=`
      <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:12px">
        <label style="display:block;font-size:10px;font-weight:900;color:#92400e;margin-bottom:5px">
          Motivo del mantenimiento *
        </label>
        <textarea id="ccMotivoSalidaMant" rows="3" required
          placeholder="Ej. reparación de piso, llantas, pintura, revisión estructural..."
          style="width:100%;border:1px solid #fcd34d;border-radius:8px;padding:8px;font-size:11px;box-sizing:border-box"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:7px;margin-top:9px">
          <button type="button" class="cc-btn cc-btn-light" id="ccMantCancelar">Cancelar</button>
          <button type="button" class="cc-btn cc-btn-maintenance" id="ccMantConfirmar">
            Confirmar mantenimiento
          </button>
        </div>
      </div>`;

    document.getElementById('ccMantCancelar').onclick=()=>{
      detalle.innerHTML='';
    };

    document.getElementById('ccMantConfirmar').onclick=()=>{
      const motivo=String(document.getElementById('ccMotivoSalidaMant')?.value||'').trim();
      if(!motivo){
        alert('Es obligatorio indicar el motivo del mantenimiento.');
        return;
      }

      // NO para el día seleccionado: ya no está físicamente disponible,
      // pero NO se elimina la renta. El contrato/registro continúa existiendo.
      matriz[k]=false;

      const ahora=new Date().toISOString();
      const record={
        id:uid(),
        cajaId:unidad.id,
        numero:unidad.numero||'',
        descripcion:unidad.descripcion||'',
        tamano:unidad.tamano||'',
        tipo:unidad.tipo||'',
        origen:unidad.origen||'',
        placas:unidad.placas||'',
        clienteId:r?.clienteId||unidad.clienteId||'',
        rentaId:r?.id||'',
        fechaSalida:ahora,
        fechaSalidaProgramada:date,
        motivo:motivo,
        fechaLiberacion:'',
        estatus:'MANTENIMIENTO',
        conservaRenta:true
      };

      configuracion.mantenimientoHistorial.unshift(record);

      unidad.estatus='MANTENIMIENTO';
      unidad.mantenimientoDesde=ahora;
      unidad.mantenimientoMotivo=motivo;
      unidad.mantenimientoRecordId=record.id;
      unidad.mantenimientoConservaRenta=true;

      // La renta NO se elimina ni se cancela.
      // Se conserva el registro y su cliente/responsable/tarifa.
      if(r){
        r.mantenimientoActivo=true;
        r.mantenimientoRecordId=record.id;
        r.mantenimientoDesde=date;
        r.observaciones=(r.observaciones?String(r.observaciones)+' | ':'')+
          `Mantenimiento desde ${date}: ${motivo}. La renta se conserva.`;
      }

      ccAudit({operacionId:ccAuditId('MANTRENTA'),accion:'RENTA_A_MANTENIMIENTO',modulo:'MANTENIMIENTO',submodulo:'DESDE_MATRIZ',idRegistro:record.id,idUnidad:unidad.id,numeroUnidad:unidad.numero||'',idCliente:r?.clienteId||unidad.clienteId||'',idRenta:r?.id||'',idMantenimiento:record.id,estatusAnterior:'RENTADA',estatusNuevo:'MANTENIMIENTO',datosAnteriores:{renta:r?JSON.parse(JSON.stringify(r)):null,unidad:{estatus:'RENTADA'}},datosNuevos:{record:record,renta:r?JSON.parse(JSON.stringify(r)):null,unidad:unidad},fechaNueva:date,detalle:motivo+' | La renta se conserva'});

      cerrar();
      save();
      ccRenderAll();

      // Conserva las funciones existentes de aviso/PDF de mantenimiento.
      try{
        if(typeof ccGenerarPDFMantenimiento==='function') ccGenerarPDFMantenimiento(record,unidad);
        if(typeof ccEnviarAvisoMantenimiento==='function') ccEnviarAvisoMantenimiento(unidad,record);
      }catch(e){console.warn('Aviso/PDF mantenimiento:',e);}
    };
  };
};
window.ccMostrarMedidasUnidad=function(id){const u=cajas.find(x=>x.id===id);if(!u)return;const Lm=Number(u.largo||0),Am=Number(u.ancho||0),Hm=Number(u.alto||0),Lft=Number(u.largoFt||0)||Lm/0.3048,Aft=Number(u.anchoFt||0)||Am/0.3048,Hft=Number(u.altoFt||0)||Hm/0.3048,esCarro=String(u.categoriaUnidad||u.tipoUnidadNombre||'').toUpperCase()==='CARRO',tipo=esc(u.tipoUnidadNombre||u.categoriaUnidad||'UNIDAD'),num=esc(u.numero||u.descripcion||'Sin unidad');const ov=document.createElement('div');ov.id='ccMedidasOverlay';ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';ov.innerHTML=`<div style="background:#fff;border-radius:18px;width:min(760px,96vw);max-height:94vh;overflow:auto;padding:24px;position:relative;box-shadow:0 25px 80px rgba(0,0,0,.35)"><button onclick="document.getElementById('ccMedidasOverlay')?.remove()" style="position:absolute;right:14px;top:10px;border:0;background:none;font-size:26px;cursor:pointer">&times;</button><div style="font-size:18px;font-weight:900">${num}</div><div style="font-size:12px;color:#64748b;margin-top:3px">${tipo} · Dimensiones</div><div style="height:330px;display:flex;align-items:center;justify-content:center;overflow:visible"><div style="position:relative;width:430px;height:230px;max-width:78vw;perspective:900px"><div style="position:absolute;left:55px;top:45px;width:300px;height:145px;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);border:3px solid #334155;border-radius:5px;transform:rotateX(58deg) rotateZ(-12deg);box-shadow:35px 28px 0 -18px #94a3b8, 0 22px 30px rgba(15,23,42,.18)"></div><div style="position:absolute;left:55px;top:20px;width:300px;height:145px;border:3px solid #334155;border-radius:5px;background:rgba(248,250,252,.72);transform:skewY(-18deg);box-shadow:inset 0 0 0 999px rgba(226,232,240,.18)"></div><span style="position:absolute;left:50%;top:-2px;transform:translateX(-50%);font-weight:900;white-space:nowrap;background:#fff;padding:4px 8px;border-radius:6px">Largo: ${esCarro?(Lft?Lft.toFixed(2)+' ft':'—'):(Lm?Lm.toFixed(2)+' m':'—')}</span><span style="position:absolute;right:0;top:108px;font-weight:900;white-space:nowrap;background:#fff;padding:4px 8px;border-radius:6px">Ancho: ${esCarro?(Aft?Aft.toFixed(2)+' ft':'—'):(Am?Am.toFixed(2)+' m':'—')}</span><span style="position:absolute;left:12px;top:108px;font-weight:900;white-space:nowrap;background:#fff;padding:4px 8px;border-radius:6px">Alto: ${esCarro?(Hft?Hft.toFixed(2)+' ft':'—'):(Hm?Hm.toFixed(2)+' m':'—')}</span><span style="position:absolute;left:50%;top:102px;transform:translate(-50%,-50%);font-size:26px;font-weight:900;color:#475569;text-shadow:0 1px #fff">${tipo}</span></div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"><div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center"><small>Largo</small><strong style="display:block;font-size:18px">${esCarro?(Lft?Lft.toFixed(2)+' ft':'—'):(Lm?Lm.toFixed(2)+' m':'—')}</strong><small style="color:#64748b">${esCarro&&Lm?Lm.toFixed(2)+' m':''}</small></div><div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center"><small>Ancho</small><strong style="display:block;font-size:18px">${esCarro?(Aft?Aft.toFixed(2)+' ft':'—'):(Am?Am.toFixed(2)+' m':'—')}</strong><small style="color:#64748b">${esCarro&&Am?Am.toFixed(2)+' m':''}</small></div><div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center"><small>Alto</small><strong style="display:block;font-size:18px">${esCarro?(Hft?Hft.toFixed(2)+' ft':'—'):(Hm?Hm.toFixed(2)+' m':'—')}</strong><small style="color:#64748b">${esCarro&&Hm?Hm.toFixed(2)+' m':''}</small></div></div><div style="display:flex;justify-content:center;gap:8px;margin-top:16px"><button class="cc-btn cc-sim-btn" onclick="ccAbrirSimuladorPallet('${u.id}')"><i class="fa-solid fa-boxes-stacked mr-1"></i>Simular</button><button class="cc-btn cc-btn-light" onclick="document.getElementById('ccMedidasOverlay')?.remove()">Cerrar</button></div></div>`;document.body.appendChild(ov);};
window.ccAbrirSimuladorPallet=function(id){const u=cajas.find(x=>x.id===id);if(!u)return;const L=Number(u.largoFt||0)||Number(u.largo||0)/0.3048,A=Number(u.anchoFt||0)||Number(u.ancho||0)/0.3048,H=Number(u.altoFt||0)||Number(u.alto||0)/0.3048,num=esc(u.numero||u.descripcion||'Unidad');document.getElementById('ccMedidasOverlay')?.remove();const sim=document.createElement('div');sim.id='ccSimuladorOverlay';sim.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';sim.innerHTML=`<div style="background:#fff;border-radius:18px;width:min(980px,97vw);max-height:95vh;overflow:auto;padding:24px;position:relative;box-shadow:0 25px 80px rgba(0,0,0,.35)"><button onclick="document.getElementById('ccSimuladorOverlay')?.remove();ccMostrarMedidasUnidad('${u.id}')" style="position:absolute;right:14px;top:10px;border:0;background:none;font-size:26px;cursor:pointer">&times;</button><div style="font-size:18px;font-weight:900">Simulación 3D de pallets</div><div style="font-size:12px;color:#64748b;margin:3px 0 16px">${num} · Captura las dimensiones del pallet. Por defecto todo se captura en pulgadas (in).</div><div style="padding:11px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:11px"><b>Unidad:</b> ${L.toFixed(2)} ft × ${A.toFixed(2)} ft × ${H.toFixed(2)} ft &nbsp; | &nbsp; ${(L*0.3048).toFixed(2)} m × ${(A*0.3048).toFixed(2)} m × ${(H*0.3048).toFixed(2)} m</div><div style="margin-top:14px;font-weight:900;font-size:12px">Medidas del pallet <span style="font-size:10px;color:#64748b;font-weight:700">· pulgadas por defecto</span></div><div class="cc-sim-grid" style="margin-top:8px"><div class="cc-sim-field"><label>Largo</label><div style="display:flex;gap:5px"><input id="simPL" class="cc-sim-unit" type="number" min="0.01" step="0.01" value="48"><select id="simPLU" class="cc-sim-unit"><option value="in" selected>Pulgadas (in)</option><option value="ft">Pies (ft)</option><option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option></select></div></div><div class="cc-sim-field"><label>Ancho</label><div style="display:flex;gap:5px"><input id="simPA" class="cc-sim-unit" type="number" min="0.01" step="0.01" value="40"><select id="simPAU" class="cc-sim-unit"><option value="in" selected>Pulgadas (in)</option><option value="ft">Pies (ft)</option><option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option></select></div></div><div class="cc-sim-field"><label>Alto</label><div style="display:flex;gap:5px"><input id="simPH" class="cc-sim-unit" type="number" min="0.01" step="0.01" value="48"><select id="simPHU" class="cc-sim-unit"><option value="in" selected>Pulgadas (in)</option><option value="ft">Pies (ft)</option><option value="m">Metros (m)</option><option value="cm">Centímetros (cm)</option></select></div></div></div><label class="cc-sim-option" style="margin-top:10px"><input id="simDouble" type="checkbox" checked onchange="ccCalcularSimulacionPallet('${u.id}')"> Permitir doble stack (hasta 2 niveles)</label><div style="display:flex;justify-content:center;gap:8px;margin-top:14px"><button class="cc-btn cc-sim-btn" onclick="ccCalcularSimulacionPallet('${u.id}')"><i class="fa-solid fa-boxes-stacked mr-1"></i>Simular</button><button class="cc-btn cc-btn-light" onclick="document.getElementById('ccSimuladorOverlay')?.remove();ccMostrarMedidasUnidad('${u.id}')">Volver</button></div><div id="ccSimResultados"></div></div>`;document.body.appendChild(sim);ccCalcularSimulacionPallet(id);};
window.ccUnitToFt=function(v,u){v=Number(v)||0;return u==='in'?v/12:u==='m'?v/0.3048:u==='cm'?v/30.48:v;};
window.ccFmtUnit=function(ft,u){const v=u==='in'?ft*12:u==='m'?ft*0.3048:u==='cm'?ft*30.48:ft;return `${v.toFixed(2)} ${u==='in'?'in':u==='m'?'m':u==='cm'?'cm':'ft'}`;};
window.ccCalcularSimulacionPallet=function(id){const u=cajas.find(x=>x.id===id),el=document.getElementById('ccSimResultados');if(!u||!el)return;const L=Number(u.largoFt||0)||Number(u.largo||0)/0.3048,A=Number(u.anchoFt||0)||Number(u.ancho||0)/0.3048,H=Number(u.altoFt||0)||Number(u.alto||0)/0.3048,pl=ccUnitToFt(document.getElementById('simPL')?.value,document.getElementById('simPLU')?.value),pa=ccUnitToFt(document.getElementById('simPA')?.value,document.getElementById('simPAU')?.value),ph=ccUnitToFt(document.getElementById('simPH')?.value,document.getElementById('simPHU')?.value),dbl=!!document.getElementById('simDouble')?.checked;if(!(L>0&&A>0&&H>0&&pl>0&&pa>0&&ph>0)){el.innerHTML='<div class="cc-sim-explain">Captura medidas válidas para realizar la simulación.</div>';return;}const f1=Math.floor(L/pl)*Math.floor(A/pa),f2=Math.floor(L/pa)*Math.floor(A/pl),useRot=f2>f1,porPiso=Math.max(f1,f2),niveles=Math.min(dbl?2:1,Math.floor(H/ph)),geom=porPiso*niveles,volumenUnidad=L*A*H,volumenPallet=pl*pa*ph,volTeorico=Math.floor(volumenUnidad/volumenPallet),uso=geom?((geom*volumenPallet/volumenUnidad)*100):0;const nx=useRot?Math.floor(L/pa):Math.floor(L/pl),ny=useRot?Math.floor(A/pl):Math.floor(A/pa),sx=useRot?pa:pl,sy=useRot?pl:pa;const maxDraw=Math.min(geom,120),W=900,Hsvg=500,margin=80,usableW=740,usableH=320,scale=Math.min(usableW/L,usableH/A),baseW=Math.max(34,sx*scale*.72),baseD=Math.max(24,sy*scale*.72),boxH=Math.max(14,ph*scale*.16),isoX=(x,y)=>margin+(x*scale*.72)+(y*scale*.40),isoY=(x,y)=>115+(x*scale*.30)-(y*scale*.30);let svg=`<svg viewBox="0 0 ${W} ${Hsvg}" class="cc-3d-svg" role="img" aria-label="Acomodo 3D de pallets dentro de la unidad"><defs><linearGradient id="unitFloor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient><linearGradient id="pTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#f59e0b"/></linearGradient><linearGradient id="pSide" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97706"/><stop offset="1" stop-color="#92400e"/></linearGradient></defs>`;const FLx=margin,FLy=115,FLw=Math.max(500,L*scale*.72),FLd=Math.max(210,A*scale*.40);svg+=`<polygon points="${FLx},${FLy} ${FLx+FLw},${FLy+FLw*.40} ${FLx+FLw},${FLy+FLd+FLw*.40} ${FLx},${FLy+FLd}" fill="url(#unitFloor)" stroke="#475569" stroke-width="4"/><polyline points="${FLx},${FLy} ${FLx},${FLy+FLd} ${FLx+FLw},${FLy+FLd+FLw*.40}" fill="none" stroke="#64748b" stroke-width="3"/>`;for(let z=0;z<niveles;z++){for(let y=0;y<ny;y++){for(let x=0;x<nx;x++){const idx=z*porPiso+y*nx+x;if(idx>=maxDraw)continue;const px=isoX(x*sx,y*sy),py=isoY(x*sx,y*sy)-z*boxH*1.15;const pw=Math.max(30,baseW),pd=Math.max(22,baseD),bh=Math.max(16,boxH);const top=`${px},${py} ${px+pw},${py+pw*.40} ${px+pw},${py+pw*.40+pd} ${px},${py+pd}`;const right=`${px+pw},${py+pw*.40} ${px+pw},${py+pw*.40+pd} ${px+pw},${py+pw*.40+pd+bh} ${px+pw},${py+pw*.40+bh}`;const front=`${px},${py+pd} ${px+pw},${py+pw*.40+pd} ${px+pw},${py+pw*.40+pd+bh} ${px},${py+pd+bh}`;svg+=`<polygon points="${front}" fill="#b45309" stroke="#78350f" stroke-width="1.2"/><polygon points="${right}" fill="url(#pSide)" stroke="#78350f" stroke-width="1.2"/><polygon points="${top}" fill="url(#pTop)" stroke="#92400e" stroke-width="1.2"/><text x="${px+pw/2}" y="${py+pd/2+5}" text-anchor="middle" font-size="12" font-weight="900" fill="#78350f">${z+1}</text>`;}}}svg+=`<text x="${W/2}" y="455" text-anchor="middle" font-size="14" font-weight="800" fill="#475569">Vista superior/isométrica · ${nx} pallets de largo × ${ny} de ancho por piso · ${niveles} nivel(es)</text></svg>`;el.innerHTML=`<div class="cc-sim-results"><div class="cc-sim-kpi"><small>Por piso</small><strong>${porPiso}</strong></div><div class="cc-sim-kpi"><small>Niveles</small><strong>${niveles}</strong></div><div class="cc-sim-kpi"><small>Pallets físicos</small><strong>${geom}</strong></div><div class="cc-sim-kpi"><small>Volumen teórico</small><strong>${volTeorico}</strong></div></div><div class="cc-sim-explain"><b>Resultado:</b> ${geom} pallets. Acomodo ${useRot?'girado':'normal'} · ${nx} × ${ny} por piso · ${niveles} nivel(es). Medidas convertidas: ${ccFmtUnit(pl,document.getElementById('simPLU')?.value)} × ${ccFmtUnit(pa,document.getElementById('simPAU')?.value)} × ${ccFmtUnit(ph,document.getElementById('simPHU')?.value)}. Aprovechamiento aproximado: ${uso.toFixed(1)}%.</div><div class="cc-sim-3d-wrap"><div class="cc-sim-3d-title"><strong>Vista 2D — acomodo de pallets dentro de la unidad</strong><span class="cc-3d-legend"><span><i class="cc-3d-dot"></i>Pallet</span><span>${dbl?'Doble stack activado':'1 nivel'}</span></span></div><div class="cc-sim-view-card"><div class="cc-sim-view-head"><strong>Acomodo superior</strong><span>${nx} × ${ny} por piso · ${niveles} nivel(es)</span></div><div class="cc-top-layout"><div class="cc-top-unit" style="--cols:${Math.max(1,ny)}">${Array.from({length:Math.min(porPiso,80)},(_,i)=>`<div class="cc-top-pallet" title="Pallet ${i+1}">${i+1}</div>`).join('')}</div><div class="cc-top-caption">Vista 2D para comprobar claramente el acomodo a lo largo y el aprovechamiento del <b>ancho</b> de la unidad.</div></div></div>${geom>maxDraw?`<div class="cc-3d-limit">La vista 3D muestra ${maxDraw} pallets para mantenerla fluida. El cálculo total sigue siendo ${geom} pallets.</div>`:''}</div>`;};

window.ccDotData=[];
window.ccDotUpload=async function(file,unidadId){
  if(!file)return '';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('La evidencia DOT debe ser JPG, PNG o WEBP.');
  if(file.size>5*1024*1024)throw new Error('La foto DOT no puede superar 5 MB.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path=`dot/${unidadId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
  const {error}=await gmSupabase.storage.from('cc-dot').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(error)throw error;
  return gmSupabase.storage.from('cc-dot').getPublicUrl(path).data?.publicUrl||'';
};

window.ccAbrirDotRegistro=function(id){
  const unidad=cajas.find(x=>x.id===id);
  if(!unidad)return;
  document.getElementById('ccDotModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccDotModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  const hoy=iso(new Date());
  const clientesOpts=clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  ov.innerHTML=`<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between;align-items:center">
      <strong>REGISTRO DOT · ${esc(unidad.numero||unidad.descripcion||'UNIDAD')}</strong>
      <button type="button" id="ccDotCerrar" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
    </div>
    <form id="ccDotForm" style="padding:18px">
      <div class="cc-grid">
        <div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="${hoy}"></div>
        <div class="cc-field"><label>Cliente (opcional)</label><select name="clienteId"><option value="">Sin cliente</option>${clientesOpts}</select></div>
      </div>
      <div class="cc-field" style="margin-top:10px"><label>Breve descripción *</label><textarea name="descripcion" required placeholder="Describe brevemente el motivo o trabajo DOT"></textarea></div>
      <div class="cc-field" style="margin-top:10px"><label>Foto de evidencia (opcional)</label><input name="evidencia" type="file" accept="image/jpeg,image/png,image/webp"><div class="cc-note">JPG, PNG o WEBP · máximo 5 MB.</div></div>
      <div id="ccDotPreview" style="display:none;margin-top:10px"><img style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e2e8f0"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="cc-btn cc-btn-light" id="ccDotCancelar">Cancelar</button>
        <button type="submit" class="cc-btn cc-btn-dot">Guardar DOT</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(ov);
  const close=()=>ov.remove();
  ov.querySelector('#ccDotCerrar').onclick=close;
  ov.querySelector('#ccDotCancelar').onclick=close;
  const inp=ov.querySelector('input[name="evidencia"]');
  inp.onchange=()=>{
    const f=inp.files?.[0],box=ov.querySelector('#ccDotPreview');
    if(!f){box.style.display='none';return;}
    box.querySelector('img').src=URL.createObjectURL(f);box.style.display='block';
  };
  ov.querySelector('#ccDotForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const fecha=String(fd.get('fecha')||'');
    const clienteId=String(fd.get('clienteId')||'');
    const descripcion=String(fd.get('descripcion')||'').trim();
    const file=inp.files?.[0]||null;
    const btn=e.target.querySelector('button[type="submit"]');
    try{
      btn.disabled=true;btn.textContent='Guardando...';
      showStatus?.('Guardando registro DOT en Supabase...','info');
      let evidenciaUrl='';
      if(file)evidenciaUrl=await ccDotUpload(file,unidad.id);
      const {data,error}=await gmSupabase.rpc('cc_dot_create',{
        p_unidad_id:unidad.id,p_fecha:fecha,p_cliente_id:clienteId||null,p_descripcion:descripcion,p_evidencia_url:evidenciaUrl||null
      });
      if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo guardar DOT');
      const dotRegistro=data?.registro||{};
      await ccAudit({operacionId:ccAuditId('DOT'),accion:'REGISTRO_DOT',modulo:'DOT',submodulo:'ENTRADA',idRegistro:dotRegistro.id||'',idUnidad:unidad.id,numeroUnidad:unidad.numero||'',idCliente:clienteId,fechaNueva:fecha,detalle:descripcion,datosNuevos:dotRegistro});
      close();
      showStatus?.('REGISTRO DOT GUARDADO · Enviando correo...','success');

      let mailOk=false;
      try{
        if((configuracion.correosMantenimiento||[]).length && dotRegistro.id){
          const {data:mailData,error:mailError}=await gmSupabase.functions.invoke('cc-send-maintenance-email',{
            body:{recordId:dotRegistro.id,evento:'DOT'}
          });
          if(mailError)throw mailError;
          if(mailData?.ok===false)throw new Error(mailData.message||mailData.error||'No se pudo enviar el correo DOT');
          mailOk=true;
          await ccAudit({
            operacionId:ccAuditId('DOTMAIL'),
            accion:'AVISO_DOT_ENVIADO',
            modulo:'DOT',
            submodulo:'CORREO',
            idRegistro:dotRegistro.id,
            idUnidad:unidad.id,
            numeroUnidad:unidad.numero||'',
            idCliente:clienteId,
            fechaNueva:fecha,
            detalle:'Correo automático DOT enviado a destinatarios configurados'+(mailData?.attachments?` · ${mailData.attachments} adjunto(s)`:'' )
          });
        }
      }catch(mailErr){
        console.error('CORREO DOT:',mailErr);
        showStatus?.('DOT GUARDADO · Error al enviar correo: '+(mailErr.message||mailErr),'error');
      }

      if(mailOk)showStatus?.('REGISTRO DOT GUARDADO · CORREO ENVIADO','success');
      else if(!(configuracion.correosMantenimiento||[]).length)showStatus?.('REGISTRO DOT GUARDADO · Sin destinatarios configurados','success');
      await ccMostrarDotControl();
    }catch(err){
      console.error('DOT:',err);btn.disabled=false;btn.textContent='Guardar DOT';
      showStatus?.('ERROR DOT · '+(err.message||err),'error');alert('No se pudo guardar el registro DOT.\n\n'+(err.message||err));
    }
  };
};

window.ccMostrarDotControl=async function(){
  if(!ccPerm('mantenimiento.ver_dot')){alert('Tu usuario no tiene permiso para ver Control DOT.');return;}
  const sec=document.getElementById('ccDotSection');if(!sec)return;
  const mant=document.getElementById('ccMaintenanceView');if(mant)mant.style.display='none';
  sec.style.display='block';
  const desde=document.getElementById('ccDotDesde'),hasta=document.getElementById('ccDotHasta');
  if(desde&&!desde.value){const d=new Date();d.setDate(1);desde.value=iso(d);}
  if(hasta&&!hasta.value)hasta.value=iso(new Date());
  const selU=document.getElementById('ccDotUnidad'),selC=document.getElementById('ccDotCliente');
  if(selU){
    const cur=selU.value;
    selU.innerHTML='<option value="">Todas las unidades</option>'+cajas.map(x=>`<option value="${x.id}">${esc(x.numero||x.descripcion||'CARRO')}</option>`).join('');
    selU.value=cur;
  }
  if(selC){
    const cur=selC.value;
    selC.innerHTML='<option value="">Todos los clientes</option>'+clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
    selC.value=cur;
  }
  await ccCargarDot();  sec.scrollIntoView({behavior:'smooth',block:'start'});
};
window.ccOcultarDotControl=function(){ccMostrarMantenimientoHistorial();};
window.ccLimpiarDotFiltros=function(){
  const d=document.getElementById('ccDotDesde'),h=document.getElementById('ccDotHasta'),u=document.getElementById('ccDotUnidad'),c=document.getElementById('ccDotCliente');
  if(d)d.value='';if(h)h.value='';if(u)u.value='';if(c)c.value='';ccCargarDot();
};
window.ccCargarDot=async function(){
  const body=document.getElementById('ccDotBody');if(!body)return;
  body.innerHTML='<tr><td colspan="7" style="padding:24px;text-align:center;color:#64748b">Cargando registros DOT...</td></tr>';
  try{
    const desde=document.getElementById('ccDotDesde')?.value||null,hasta=document.getElementById('ccDotHasta')?.value||null;
    const unidad=document.getElementById('ccDotUnidad')?.value||null,cliente=document.getElementById('ccDotCliente')?.value||null;
    const {data,error}=await gmSupabase.rpc('cc_dot_list',{p_desde:desde,p_hasta:hasta,p_unidad_id:unidad,p_cliente_id:cliente});
    if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo consultar DOT');
    const rows=Array.isArray(data?.registros)?data.registros:[];
    ccMapaUnidadesRows=rows;
    ccMapaUnidadesMarkers.clear();
    window.ccDotData=rows;
    const carros=new Set(rows.map(r=>r.unidadId)).size,clientesDot=new Set(rows.filter(r=>r.clienteId).map(r=>r.clienteId)).size;
    const k=document.getElementById('ccDotKpis');if(k)k.innerHTML=`<div class="cc-dot-kpi"><small>Entradas DOT</small><strong>${rows.length}</strong></div><div class="cc-dot-kpi"><small>Unidades distintas</small><strong>${carros}</strong></div><div class="cc-dot-kpi"><small>Clientes relacionados</small><strong>${clientesDot}</strong></div>`;
    body.innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${fmtDate(r.fecha)}</strong></td><td><strong>${esc(r.unidad||'—')}</strong></td><td>${esc(r.descripcionUnidad||'—')}</td><td>${esc(r.cliente||'—')}</td><td>${esc(r.descripcion||'—')}</td><td>${r.evidenciaUrl?`<a class="cc-btn cc-btn-light" href="${esc(r.evidenciaUrl)}" target="_blank" rel="noopener"><i class="fa-solid fa-image mr-1"></i>Ver foto</a>`:'—'}</td><td>${ccPerm('mantenimiento.editar_dot')?'<button class="cc-btn cc-btn-light" onclick="ccEditarDot(\''+r.id+'\')"><i class="fa-solid fa-pen mr-1"></i>Editar</button>':'—'}</td></tr>`).join(''):'<tr><td colspan="8" style="padding:28px;text-align:center;color:#94a3b8">No hay registros DOT con los filtros seleccionados.</td></tr>';
  }catch(err){
    console.error('DOT LIST:',err);body.innerHTML=`<tr><td colspan="7" style="padding:28px;text-align:center;color:#b91c1c">Error al cargar DOT: ${esc(err.message||err)}</td></tr>`;
  }
};


window.ccEditarDot=function(id){
  if(!ccPerm('mantenimiento.editar_dot')){alert('Tu usuario no tiene permiso para editar registros DOT.');return;}
  const r=(window.ccDotData||[]).find(x=>x.id===id);
  if(!r){alert('No se encontró el registro DOT.');return;}

  document.getElementById('ccDotEditModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccDotEditModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  const clientesOpts=clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${c.id}" ${c.id===r.clienteId?'selected':''}>${esc(c.nombre)}</option>`).join('');

  ov.innerHTML=`<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between;align-items:center">
      <strong>EDITAR REGISTRO DOT · ${esc(r.unidad||'UNIDAD')}</strong>
      <button type="button" id="ccDotEditClose" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
    </div>
    <form id="ccDotEditForm" style="padding:18px">
      <div class="cc-grid">
        <div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="${esc(r.fecha||'')}"></div>
        <div class="cc-field"><label>Cliente (opcional)</label><select name="clienteId"><option value="">Sin cliente</option>${clientesOpts}</select></div>
      </div>
      <div class="cc-field" style="margin-top:10px"><label>Descripción DOT *</label><textarea name="descripcion" required>${esc(r.descripcion||'')}</textarea></div>
      <div class="cc-field" style="margin-top:10px"><label>Nueva foto de evidencia (opcional)</label><input name="evidencia" type="file" accept="image/jpeg,image/png,image/webp"><div class="cc-note">Si no seleccionas una nueva foto, se conserva la evidencia actual.</div></div>
      ${r.evidenciaUrl?`<div class="cc-note" style="margin-top:10px"><a href="${esc(r.evidenciaUrl)}" target="_blank" rel="noopener"><i class="fa-solid fa-image mr-1"></i>Ver evidencia actual</a></div>`:''}
      <div id="ccDotEditPreview" style="display:none;margin-top:10px"><img style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e2e8f0"></div>
      <div id="ccDotEditStatus" class="cc-note" style="margin-top:10px">Los cambios se guardarán directamente en Supabase.</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="cc-btn cc-btn-light" id="ccDotEditCancel">Cancelar</button>
        <button type="submit" class="cc-btn cc-btn-primary" id="ccDotEditSave"><i class="fa-solid fa-floppy-disk mr-1"></i>Guardar cambios</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(ov);

  const close=()=>ov.remove();
  ov.querySelector('#ccDotEditClose').onclick=close;
  ov.querySelector('#ccDotEditCancel').onclick=close;

  const input=ov.querySelector('input[name="evidencia"]');
  input.onchange=()=>{
    const file=input.files?.[0],box=ov.querySelector('#ccDotEditPreview');
    if(!file){box.style.display='none';return;}
    box.querySelector('img').src=URL.createObjectURL(file);
    box.style.display='block';
  };

  ov.querySelector('#ccDotEditForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const btn=ov.querySelector('#ccDotEditSave');
    const status=ov.querySelector('#ccDotEditStatus');
    btn.disabled=true;
    btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i>Guardando...';

    try{
      let evidenciaUrl='';
      const file=input.files?.[0]||null;
      if(file){
        status.textContent='Subiendo nueva evidencia...';
        evidenciaUrl=await ccDotUpload(file,r.unidadId);
      }

      status.textContent='Actualizando registro DOT en Supabase...';
      const {data,error}=await gmSupabase.rpc('cc_dot_update',{
        p_id:r.id,
        p_fecha:String(fd.get('fecha')||''),
        p_cliente_id:String(fd.get('clienteId')||'')||null,
        p_descripcion:String(fd.get('descripcion')||'').trim(),
        p_evidencia_url:evidenciaUrl||null
      });
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||'No se pudo actualizar DOT');

      ccRevision=Number(data.revision||ccRevision);
      await ccAudit({
        operacionId:ccAuditId('DOT'),
        accion:'EDITAR_DOT',
        modulo:'DOT',
        submodulo:'EDICION',
        idRegistro:r.id,
        idUnidad:r.unidadId||'',
        numeroUnidad:r.unidad||'',
        idCliente:String(fd.get('clienteId')||''),
        fechaNueva:String(fd.get('fecha')||''),
        datosAnteriores:r,
        datosNuevos:data.registro||{},
        detalle:'Registro DOT actualizado directamente en Supabase'
      });

      close();
      await ccCargarDot();
      showStatus?.('REGISTRO DOT ACTUALIZADO EN SUPABASE','success');
    }catch(err){
      console.error('EDITAR DOT:',err);
      status.textContent='ERROR: '+(err.message||err);
      status.style.color='#b91c1c';
      btn.disabled=false;
      btn.innerHTML='<i class="fa-solid fa-floppy-disk mr-1"></i>Guardar cambios';
      alert('No se pudo actualizar el registro DOT.\n\n'+(err.message||err));
    }
  };
};

window.ccExportarDotExcel=function(){
  const rows=window.ccDotData||[];if(!rows.length){alert('No hay registros DOT para exportar.');return;}
  if(!window.XLSX){alert('La librería Excel no está disponible.');return;}
  const data=rows.map((r,i)=>({'#':i+1,'Fecha':r.fecha,'Carro':r.unidad,'Descripción unidad':r.descripcionUnidad,'Cliente':r.cliente||'','Descripción DOT':r.descripcion,'Evidencia':r.evidenciaUrl||''}));
  const ws=XLSX.utils.json_to_sheet(data);ws['!cols']=[{wch:6},{wch:14},{wch:16},{wch:28},{wch:24},{wch:45},{wch:55}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Control DOT');XLSX.writeFile(wb,`Control_DOT_${iso(new Date())}.xlsx`);
};
window.ccGenerarDotPDF=async function(){
  const desde=document.getElementById('ccDotDesde')?.value||null;
  const hasta=document.getElementById('ccDotHasta')?.value||null;
  const unidad=document.getElementById('ccDotUnidad')?.value||null;
  const cliente=document.getElementById('ccDotCliente')?.value||null;

  if(desde&&hasta&&desde>hasta){
    alert('La fecha DESDE no puede ser mayor que la fecha HASTA.');
    return;
  }

  const imageToDataUrl=async(url)=>{
    if(!url)return '';
    const resp=await fetch(url,{cache:'no-store'});
    if(!resp.ok)throw new Error('No se pudo cargar una evidencia DOT.');
    const blob=await resp.blob();
    return await new Promise((resolve,reject)=>{
      const fr=new FileReader();
      fr.onload=()=>resolve(fr.result);
      fr.onerror=()=>reject(new Error('No se pudo convertir la evidencia.'));
      fr.readAsDataURL(blob);
    });
  };

  try{
    showStatus?.('Consultando registros DOT del rango seleccionado...','info');

    const {data,error}=await gmSupabase.rpc('cc_dot_list',{
      p_desde:desde,
      p_hasta:hasta,
      p_unidad_id:unidad,
      p_cliente_id:cliente
    });
    if(error)throw error;
    if(data?.ok===false)throw new Error(data.error||'No se pudo consultar DOT');

    const rows=Array.isArray(data?.registros)?data.registros:[];
    if(!rows.length){
      alert('No hay registros DOT dentro del rango y filtros seleccionados.');
      return;
    }

    if(!window.jspdf?.jsPDF){
      throw new Error('La librería PDF no está disponible.');
    }

    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});

    const unidadNombre=unidad?(cajas.find(x=>x.id===unidad)?.numero||'Unidad seleccionada'):'Todas las unidades';
    const clienteNombre=cliente?(clientes.find(x=>x.id===cliente)?.nombre||'Cliente seleccionado'):'Todos los clientes';
    const rangoDesde=desde||'Inicio';
    const rangoHasta=hasta||'Actual';

    // Portada / resumen
    doc.setFillColor(15,23,42);
    doc.rect(0,0,216,32,'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(16);
    doc.text('REPORTE DETALLADO DE CONTROL DOT',14,12);

    doc.setFont('helvetica','normal');
    doc.setFontSize(8.5);
    doc.text(`Rango: ${rangoDesde} al ${rangoHasta}`,14,19);
    doc.text(`Unidad: ${unidadNombre}`,14,24);
    doc.text(`Cliente: ${clienteNombre} · Registros: ${rows.length}`,14,28);

    let y=41;

    for(let i=0;i<rows.length;i++){
      const r=rows[i];

      // nueva página si no hay espacio suficiente
      if(y>230){
        doc.addPage();
        y=18;
      }

      doc.setDrawColor(203,213,225);
      doc.setFillColor(248,250,252);
      doc.roundedRect(12,y-5,192,8,2,2,'FD');

      doc.setFont('helvetica','bold');
      doc.setFontSize(10);
      doc.setTextColor(15,23,42);
      doc.text(`Registro DOT #${i+1} · ${r.fecha||'—'} · ${r.unidad||'—'}`,16,y);

      y+=9;

      const detalles=[
        ['Unidad',r.unidad||'—'],
        ['Descripción unidad',r.descripcionUnidad||'—'],
        ['Cliente',r.cliente||'Sin cliente'],
        ['Fecha DOT',r.fecha||'—'],
        ['Descripción / detalle DOT',r.descripcion||'—'],
        ['Evidencia',r.evidenciaUrl?'Sí':'No']
      ];

      doc.autoTable({
        startY:y,
        theme:'grid',
        head:[['CAMPO','DETALLE']],
        body:detalles,
        styles:{fontSize:8,cellPadding:2.4,overflow:'linebreak',valign:'top'},
        headStyles:{fillColor:[76,29,149],textColor:255,fontStyle:'bold'},
        columnStyles:{0:{cellWidth:45,fontStyle:'bold'},1:{cellWidth:137}},
        margin:{left:16,right:16},
        tableWidth:182
      });

      y=doc.lastAutoTable.finalY+5;

      if(r.evidenciaUrl){
        try{
          showStatus?.(`Cargando evidencia ${i+1} de ${rows.length}...`,'info');
          const img=await imageToDataUrl(r.evidenciaUrl);

          if(y>180){
            doc.addPage();
            y=18;
          }

          doc.setFont('helvetica','bold');
          doc.setFontSize(9);
          doc.setTextColor(51,65,85);
          doc.text('Evidencia fotográfica',16,y);
          y+=5;

          const props=doc.getImageProperties(img);
          const maxW=170;
          const maxH=105;
          const scale=Math.min(maxW/props.width,maxH/props.height);
          const w=props.width*scale;
          const h=props.height*scale;

          doc.setDrawColor(203,213,225);
          doc.rect(16,y,w,h);
          doc.addImage(img,props.fileType||'JPEG',16,y,w,h);
          y+=h+8;
        }catch(imgErr){
          console.warn('EVIDENCIA DOT PDF:',imgErr);
          doc.setFont('helvetica','italic');
          doc.setFontSize(8);
          doc.setTextColor(185,28,28);
          doc.text('No fue posible cargar la evidencia fotográfica de este registro.',16,y);
          y+=8;
        }
      }else{
        doc.setFont('helvetica','italic');
        doc.setFontSize(8);
        doc.setTextColor(100,116,139);
        doc.text('Sin evidencia fotográfica adjunta.',16,y);
        y+=8;
      }

      if(i<rows.length-1){
        doc.setDrawColor(226,232,240);
        doc.line(14,y,202,y);
        y+=7;
      }
    }

    // Footer page numbers
    const totalPages=doc.getNumberOfPages();
    for(let pageno=1;pageno<=totalPages;pageno++){
      doc.setPage(pageno);
      const ph=doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(100,116,139);
      doc.text(`Control DOT · ${rangoDesde} a ${rangoHasta}`,12,ph-6);
      doc.text(`Página ${pageno} de ${totalPages}`,174,ph-6);
    }

    const safeDesde=(desde||'inicio').replace(/[^0-9a-z_-]/gi,'_');
    const safeHasta=(hasta||'actual').replace(/[^0-9a-z_-]/gi,'_');
    doc.save(`Control_DOT_Detallado_${safeDesde}_a_${safeHasta}.pdf`);

    await ccAudit({
      operacionId:ccAuditId('EXP'),
      accion:'EXPORTAR_DOT_PDF_DETALLADO',
      modulo:'DOT',
      submodulo:'PDF',
      fechaNueva:hasta||desde||'',
      detalle:`Reporte DOT detallado con evidencias · rango ${rangoDesde} a ${rangoHasta} · ${rows.length} registros`
    });

    showStatus?.(`PDF DOT DETALLADO GENERADO · ${rows.length} registros`,'success');
  }catch(err){
    console.error('PDF DOT DETALLADO:',err);
    showStatus?.('ERROR AL GENERAR PDF DOT · '+(err.message||err),'error');
    alert('No fue posible generar el PDF DOT.\n\n'+(err.message||err));
  }
};


const CC_LOCATION_EDGE='https://nbogdhriavzqetnlrrau.supabase.co/functions/v1/cc-location';

window.ccEnsureScript=function(src,globalName){
  return new Promise((resolve,reject)=>{
    if(globalName&&window[globalName]){resolve();return;}
    const found=[...document.scripts].find(x=>x.src===src);
    if(found){found.addEventListener('load',()=>resolve(),{once:true});found.addEventListener('error',()=>reject(new Error('No se pudo cargar '+src)),{once:true});return;}
    const sc=document.createElement('script');sc.src=src;sc.async=true;sc.onload=()=>resolve();sc.onerror=()=>reject(new Error('No se pudo cargar '+src));document.head.appendChild(sc);
  });
};

window.ccEnsureLeaflet=async function(){
  if(window.L)return;
  if(!document.querySelector('link[data-cc-leaflet]')){
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    l.dataset.ccLeaflet='1';
    document.head.appendChild(l);
  }
  await ccEnsureScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','L');
};

window.ccEnsureQRCode=async function(){
  if(window.QRCode)return;
  await ccEnsureScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js','QRCode');
};

window.ccConfigurarUrlUbicacion=async function(){
  const actual=String(configuracion.ubicacionPublicaUrl||'').trim();
  const valor=prompt('Pega la URL pública de GitHub Pages donde estará la página de ubicación.\\nEjemplo: https://usuario.github.io/ubicacion-cajas/',actual);
  if(valor===null)return null;
  const limpio=String(valor||'').trim().replace(/\?+$/,'');
  if(limpio && !/^https:\/\/.+/i.test(limpio)){
    alert('La URL debe iniciar con https://');
    return null;
  }
  const {data,error}=await gmSupabase.rpc('cc_save_location_page_url',{p_url:limpio});
  if(error)throw error;
  if(data?.ok===false)throw new Error(data.error||'No se pudo guardar la URL');
  configuracion.ubicacionPublicaUrl=limpio;
  showStatus?.('URL pública de ubicación guardada en Supabase','success');
  return limpio;
};

window.ccMostrarQrUnidad=async function(id){
  const u=cajas.find(x=>x.id===id);
  if(!u)return;

  try{
    // URL canónica de GitHub Pages.
    const URL_CANONICA='https://testerLB-cyber.github.io/ubicacion-cajas/';
    let base=String(configuracion.ubicacionPublicaUrl||URL_CANONICA).trim();

    // Corrige automáticamente cualquier URL anterior/incompleta.
    if(!/^https:\/\/testerLB-cyber\.github\.io\/ubicacion-cajas\/?$/i.test(base)){
      base=URL_CANONICA;
      try{
        const {data,error}=await gmSupabase.rpc('cc_save_location_page_url',{p_url:base});
        if(error)console.warn('No se pudo actualizar URL pública:',error);
        else configuracion.ubicacionPublicaUrl=base;
      }catch(_){}
    }

    let unit=cajas.find(x=>x.id===id);
    if(!unit?.qrToken){
      showStatus?.('Generando token QR para la unidad...','info');
      const {data,error}=await gmSupabase.rpc('cc_ensure_unit_qr_token',{p_unidad_id:id});
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo generar el token QR.');
      await ccReloadFromDatabase();
      unit=cajas.find(x=>x.id===id);
      if(unit&&!unit.qrToken)unit.qrToken=String(data?.token||'');
    }

    if(!unit?.qrToken)throw new Error('No fue posible generar el token QR de esta unidad.');

    const token=String(unit.qrToken||'').trim();
    // Acepta UUID estándar de Supabase (con guiones) y tokens heredados de 32 hexadecimales.
    const uuidOk=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
    const legacyOk=/^[0-9a-f]{32}$/i.test(token);
    if(!(uuidOk||legacyOk)){
      throw new Error('El token QR de esta unidad no tiene un formato válido.');
    }

    // Construir la URL mediante URL() evita errores de slash, ? y espacios.
    const target='https://testerlb-cyber.github.io/ubicacion-cajas/?q='+encodeURIComponent(token);

    // Validación robusta de la URL final.
    const checkUrl=new URL(target);
    const hostOk=checkUrl.hostname.toLowerCase()==='testerlb-cyber.github.io';
    const pathOk=checkUrl.pathname.replace(/\/+$/,'')==='/ubicacion-cajas';
    const tokenOk=checkUrl.searchParams.get('q')===token;
    if(!(checkUrl.protocol==='https:'&&hostOk&&pathOk&&tokenOk)){
      throw new Error('La liga QR no se construyó correctamente.');
    }

    await ccEnsureQRCode();

    document.getElementById('ccQrUnitModal')?.remove();
    const ov=document.createElement('div');
    ov.id='ccQrUnitModal';
    ov.className='cc-location-modal';

    ov.innerHTML=`<div class="cc-location-card" style="width:min(660px,96vw)">
      <div class="cc-location-head">
        <strong>QR DE UBICACIÓN · ${esc(unit.numero||unit.descripcion||'UNIDAD')}</strong>
        <button class="cc-location-close" type="button">×</button>
      </div>
      <div class="cc-location-body">
        <div class="cc-qr-box">
          <div id="ccQrCanvas" style="padding:28px;background:#fff;border:16px solid #fff;border-radius:14px;max-width:500px;overflow:auto"></div>
          <div style="font-size:11px;font-weight:900;color:#0f172a">Liga exacta del QR:</div>
          <div class="cc-qr-url" id="ccQrTarget">${esc(target)}</div>
          <div class="cc-note"><b>iPhone:</b> abre Cámara, apunta al QR y toca la notificación amarilla de Safari que aparece en la pantalla. El iPhone no abre el enlace automáticamente sin tocar esa notificación.</div>
          <details style="width:100%;margin-top:8px">
            <summary style="cursor:pointer;font-size:10px;font-weight:900;color:#475569">QR de prueba para iPhone</summary>
            <div style="padding:12px;text-align:center">
              <div id="ccQrIphoneTest" style="display:inline-block;padding:22px;background:#fff;border:14px solid #fff"></div>
              <div style="font-size:9px;color:#64748b;margin-top:6px">Prueba: https://testerlb-cyber.github.io/ubicacion-cajas/</div>
            </div>
          </details>

          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
            <a class="cc-btn cc-btn-primary" href="${esc(target)}" target="_blank" rel="noopener">
              <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Probar enlace
            </a>
            <button class="cc-btn cc-btn-light" type="button" id="ccQrCopy">
              <i class="fa-solid fa-copy mr-1"></i>Copiar enlace
            </button>
            <button class="cc-btn cc-btn-light" type="button" id="ccQrPrint">
              <i class="fa-solid fa-print mr-1"></i>Imprimir QR
            </button>
          </div>
        </div>
      </div>
    </div>`;

    document.body.appendChild(ov);
    ov.querySelector('.cc-location-close').onclick=()=>ov.remove();

    const qrBox=ov.querySelector('#ccQrCanvas');
    qrBox.innerHTML='';
    new QRCode(qrBox,{
      text:target,
      width:420,
      height:420,
      colorDark:'#000000',
      colorLight:'#ffffff',
      correctLevel:QRCode.CorrectLevel.H
    });

    const iphoneTest=ov.querySelector('#ccQrIphoneTest');
    if(iphoneTest){
      new QRCode(iphoneTest,{
        text:'https://testerlb-cyber.github.io/ubicacion-cajas/',
        width:260,
        height:260,
        colorDark:'#000000',
        colorLight:'#ffffff',
        correctLevel:QRCode.CorrectLevel.H
      });
    }

    ov.querySelector('#ccQrCopy').onclick=async()=>{
      try{
        await navigator.clipboard.writeText(target);
        showStatus?.('Enlace QR copiado','success');
      }catch(_){
        prompt('Copia este enlace:',target);
      }
    };

    ov.querySelector('#ccQrPrint').onclick=()=>{
      const canvas=qrBox.querySelector('canvas');
      const img=qrBox.querySelector('img');
      const src=canvas?canvas.toDataURL('image/png'):img?.src;
      if(!src)return;
      const w=window.open('','_blank','width=650,height=760');
      w.document.write(`<html><head><title>QR ${esc(unit.numero||'')}</title></head><body style="font-family:Arial;text-align:center;padding:30px"><h2>${esc(unit.numero||'')}</h2><p>${esc(unit.descripcion||'')}</p><img src="${src}" style="width:360px;height:360px;image-rendering:pixelated"><p style="font-size:13px">Escanear para registrar ubicación</p><p style="font-size:10px;word-break:break-all">${esc(target)}</p>
</body></html>`);
      w.document.close();w.focus();setTimeout(()=>w.print(),300);
    };

    console.log('QR URL:',target);
  }catch(err){
    console.error('QR UBICACION:',err);
    alert('No se pudo generar el QR.\n\n'+(err.message||err));
  }
};

window.ccVerUbicacionesUnidad=async function(id){
 const u=cajas.find(x=>x.id===id);if(!u)return;
 try{
  showStatus?.('Consultando ubicación actual e historial...','info');
  await ccEnsureLeaflet();
  const {data,error}=await gmSupabase.rpc('cc_ultimas_ubicaciones',{p_unidad_id:id});
  if(error)throw error;
  const rows=(Array.isArray(data&&data.registros)?data.registros:[]).slice(0,5);
  document.getElementById('ccLocationHistoryModal')?.remove();
  const ov=document.createElement('div');ov.id='ccLocationHistoryModal';ov.className='cc-location-modal';
  const bodyRows=rows.map((r,i)=>{
   const lat=Number(r.latitud),lng=Number(r.longitud),g=ccGeocercaDePunto(lat,lng);
   const dir=String(r.direccion||r.address||r.displayName||'').trim()||ccLeerDireccionCache(lat,lng);
   const lugar=g?'<strong style="color:#166534"><i class="fa-solid fa-draw-polygon"></i> '+esc(g.nombre)+'</strong>':(dir?esc(dir):'<span data-cc-hist-dir="'+i+'" style="color:#64748b">Consultando dirección…</span>');
   return '<tr><td>'+(i+1)+'</td><td>'+esc(new Date(r.fechaHora).toLocaleString())+'</td><td style="min-width:240px;white-space:normal">'+lugar+'</td><td>'+(r.precisionMetros==null?'—':Math.round(Number(r.precisionMetros))+' m')+'</td><td>'+lat.toFixed(5)+', '+lng.toFixed(5)+'</td><td><a class="cc-btn cc-btn-light" target="_blank" rel="noopener" href="https://www.google.com/maps?q='+encodeURIComponent(lat+','+lng)+'">Ver mapa</a></td></tr>';
  }).join('');
  ov.innerHTML='<div class="cc-location-card" style="width:min(1050px,97vw);max-height:94vh;overflow:auto"><div class="cc-location-head"><strong>UBICACIÓN ACTUAL + ÚLTIMAS 5 · '+esc(u.numero||u.descripcion||'UNIDAD')+'</strong><button class="cc-location-close" type="button">×</button></div><div class="cc-location-body"><div class="cc-location-summary"><span class="cc-location-pill">'+rows.length+' ubicaciones disponibles</span>'+(rows[0]?'<span class="cc-location-pill"><b>Actual:</b> '+esc(new Date(rows[0].fechaHora).toLocaleString())+'</span>':'')+'</div><div id="ccUnitHistoryMap" style="height:360px;border:1px solid #dbe4ef;border-radius:12px;margin-bottom:12px"></div><div class="cc-inv-wrap"><table class="cc-location-history" style="min-width:900px"><thead><tr><th>#</th><th>Fecha / hora</th><th>Geocerca / Dirección</th><th>Precisión</th><th>Coordenadas</th><th>Mapa</th></tr></thead><tbody>'+(rows.length?bodyRows:'<tr><td colspan="6" style="padding:28px;text-align:center;color:#94a3b8">Esta unidad todavía no tiene ubicaciones registradas.</td></tr>')+'</tbody></table></div></div></div>';
  document.body.appendChild(ov);

  let map=null;
  if(rows.length){
   map=L.map('ccUnitHistoryMap',{preferCanvas:true,zoomControl:true});
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
   const pts=[];
   rows.forEach((r,i)=>{
    const lat=Number(r.latitud),lng=Number(r.longitud);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    pts.push([lat,lng]);
    const m=L.circleMarker([lat,lng],{radius:i===0?10:7,weight:i===0?4:2,fillOpacity:.8}).addTo(map);
    const g=ccGeocercaDePunto(lat,lng);
    m.bindPopup('<div style="font-family:Arial;font-size:12px"><b>'+(i===0?'UBICACIÓN ACTUAL':'UBICACIÓN #'+(i+1))+'</b><br>'+esc(new Date(r.fechaHora).toLocaleString())+'<br>'+(g?'<b>Geocerca:</b> '+esc(g.nombre):'Fuera de geocerca')+'</div>');
   });
   if(pts.length>1){L.polyline(pts,{weight:3,opacity:.55,dashArray:'6,6'}).addTo(map);map.fitBounds(pts,{padding:[30,30],maxZoom:16});}
   else if(pts.length===1)map.setView(pts[0],15);
   (configuracion.geocercas||[]).forEach((g,i)=>{if(g.activa===false)return;const lyr=ccGeocercaToLayer(g,i);if(lyr)lyr.addTo(map);});
   setTimeout(()=>map.invalidateSize(),120);
  }else{
   const me=document.getElementById('ccUnitHistoryMap');if(me)me.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8">Sin ubicaciones registradas</div>';
  }

  ov.querySelector('.cc-location-close').onclick=()=>{try{if(map)map.remove();}catch(_){}ov.remove();};

  rows.forEach(async(r,i)=>{
   const lat=Number(r.latitud),lng=Number(r.longitud);
   if(ccGeocercaDePunto(lat,lng))return;
   if(String(r.direccion||r.address||r.displayName||'').trim()||ccLeerDireccionCache(lat,lng))return;
   const dir=await ccReverseGeocode(lat,lng);
   const el=ov.querySelector('[data-cc-hist-dir="'+i+'"]');if(el)el.textContent=dir||'Dirección no disponible';
  });
  showStatus?.('Ubicación actual e historial cargados','success');
 }catch(err){
  console.error('ULTIMAS UBICACIONES:',err);
  alert('No se pudieron cargar las ubicaciones.\n\n'+(err.message||err));
 }
};


let ccMapaUnidadesRows=[];
let ccMapaUnidadesMarkers=new Map();
let ccMapaSearchTimer=null;
let ccGeocercasLayerGroup=null;
let ccGeocercasVisibles=true;
let ccLeafletDrawControl=null;
let ccDrawCreatedHandler=null;

window.ccEnsureGeoLibraries=async function(){
  await ccEnsureLeaflet();
  const loadCss=(href,id)=>new Promise((resolve,reject)=>{if(document.getElementById(id))return resolve();const e=document.createElement('link');e.id=id;e.rel='stylesheet';e.href=href;e.onload=resolve;e.onerror=reject;document.head.appendChild(e)});
  const loadJs=(src,id)=>new Promise((resolve,reject)=>{if(document.getElementById(id))return resolve();const e=document.createElement('script');e.id=id;e.src=src;e.onload=resolve;e.onerror=reject;document.head.appendChild(e)});
  if(!window.L?.Control?.Draw){await loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css','ccLeafletDrawCss');await loadJs('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js','ccLeafletDrawJs');}
  if(!window.toGeoJSON)await loadJs('https://cdn.jsdelivr.net/npm/@tmcw/togeojson@6.0.1/dist/togeojson.umd.js','ccToGeoJSON');
  if(!window.JSZip)await loadJs('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','ccJSZip');
};

function ccGeoPointInRing(lat,lng,ring){
  if(!Array.isArray(ring)||ring.length<3)return false;
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j]; const xi=Number(a[1]),yi=Number(a[0]),xj=Number(b[1]),yj=Number(b[0]);
    const intersect=((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/((yj-yi)||1e-15)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}
function ccGeoDistMeters(lat1,lng1,lat2,lng2){const R=6371000,toRad=x=>x*Math.PI/180;const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function ccGeocercaContiene(g,lat,lng){
  if(g.tipo==='circle')return ccGeoDistMeters(lat,lng,Number(g.centro?.[0]),Number(g.centro?.[1]))<=Number(g.radio||0);
  const rings=g.coordenadas||[]; if(!rings.length)return false;
  if(!ccGeoPointInRing(lat,lng,rings[0]))return false;
  for(let i=1;i<rings.length;i++)if(ccGeoPointInRing(lat,lng,rings[i]))return false;
  return true;
}
function ccGeocercaDePunto(lat,lng){return (configuracion.geocercas||[]).find(g=>g.activa!==false&&ccGeocercaContiene(g,lat,lng))||null;}
function ccGeoColor(i){const c=['#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#db2777','#4f46e5','#65a30d'];return c[i%c.length];}
function ccGeocercaToLayer(g,i=0){
  if(!window.L)return null;const color=g.color||ccGeoColor(i),opt={color,weight:2,fillColor:color,fillOpacity:.12};let layer=null;
  if(g.tipo==='circle')layer=L.circle([Number(g.centro?.[0]),Number(g.centro?.[1])],{...opt,radius:Number(g.radio||100)});
  else if(Array.isArray(g.coordenadas?.[0]))layer=L.polygon(g.coordenadas,opt);
  if(layer){layer.bindPopup(`<div style="font-family:Arial;font-size:12px"><b>${esc(g.nombre||'Geocerca')}</b><br><span style="color:#64748b">${esc(g.tipo||'polígono')}</span></div>`);layer.ccGeocercaId=g.id;}
  return layer;
}
function ccRenderGeocercasMapa(){
  const map=ccMapaUnidadesInstance;if(!map)return;
  if(ccGeocercasLayerGroup){try{map.removeLayer(ccGeocercasLayerGroup)}catch(_){}}
  ccGeocercasLayerGroup=L.layerGroup();
  (configuracion.geocercas||[]).forEach((g,i)=>{if(g.activa===false)return;const layer=ccGeocercaToLayer(g,i);if(layer)layer.addTo(ccGeocercasLayerGroup)});
  if(ccGeocercasVisibles)ccGeocercasLayerGroup.addTo(map);
  ccRenderGeocercasLista();
}
window.ccRenderGeocercasLista=function(){
  const el=document.getElementById('ccGeocercasLista'),count=document.getElementById('ccGeoCount');const arr=configuracion.geocercas||[];if(count)count.textContent=arr.length;if(!el)return;
  el.innerHTML=arr.length?arr.map((g,i)=>`<div class="cc-geo-item"><div class="cc-geo-item-top"><div style="display:flex;align-items:center;gap:7px;min-width:0"><span class="cc-geo-dot" style="background:${esc(g.color||ccGeoColor(i))}"></span><span class="cc-geo-name" title="${esc(g.nombre)}">${esc(g.nombre||'Geocerca')}</span></div><div class="cc-geo-mini-actions"><button title="Ver" onclick="ccEnfocarGeocerca('${g.id}')"><i class="fa-solid fa-crosshairs"></i></button><button title="Editar" onclick="ccEditarGeocerca('${g.id}')"><i class="fa-solid fa-pen"></i></button><button title="Eliminar" onclick="ccEliminarGeocerca('${g.id}')"><i class="fa-solid fa-trash"></i></button></div></div><div class="cc-geo-type">${esc(g.tipo||'polygon')} · ${g.activa===false?'oculta':'activa'}</div></div>`).join(''):'<div class="cc-geo-empty"><i class="fa-solid fa-draw-polygon" style="font-size:24px;margin-bottom:8px"></i><br>No hay geocercas.<br>Dibuja una o importa KML/KMZ/GeoJSON.</div>';
};
window.ccToggleGeocercas=function(){
  ccGeocercasVisibles=!ccGeocercasVisibles;const map=ccMapaUnidadesInstance;if(map&&ccGeocercasLayerGroup){if(ccGeocercasVisibles)ccGeocercasLayerGroup.addTo(map);else map.removeLayer(ccGeocercasLayerGroup)}
  const b=document.getElementById('ccBtnToggleGeocercas');if(b)b.innerHTML=`<i class="fa-solid fa-layer-group mr-1"></i>${ccGeocercasVisibles?'Ocultar':'Mostrar'} geocercas`;
};
window.ccActivarDibujoGeocerca=async function(){
  if(!ccMapaUnidadesInstance){await ccCargarMapaUnidades();if(!ccMapaUnidadesInstance)return;}await ccEnsureGeoLibraries();
  if(ccLeafletDrawControl){try{ccMapaUnidadesInstance.removeControl(ccLeafletDrawControl)}catch(_){}}
  const drawn=new L.FeatureGroup().addTo(ccMapaUnidadesInstance);
  ccLeafletDrawControl=new L.Control.Draw({position:'topleft',edit:{featureGroup:drawn,edit:false,remove:false},draw:{polyline:false,marker:false,circlemarker:false,polygon:{showArea:true},rectangle:true,circle:true}});
  ccMapaUnidadesInstance.addControl(ccLeafletDrawControl);
  if(ccDrawCreatedHandler)ccMapaUnidadesInstance.off(L.Draw.Event.CREATED,ccDrawCreatedHandler);
  ccDrawCreatedHandler=async e=>{const layer=e.layer;drawn.addLayer(layer);let geo={id:uid(),nombre:'NUEVA GEOCERCA',activa:true,color:ccGeoColor((configuracion.geocercas||[]).length),creadaEn:new Date().toISOString()};if(e.layerType==='circle'){const c=layer.getLatLng();geo.tipo='circle';geo.centro=[c.lat,c.lng];geo.radio=layer.getRadius();}else{geo.tipo='polygon';const ll=layer.getLatLngs();const ring=(Array.isArray(ll[0]?.[0])?ll[0][0]:ll[0]).map(p=>[p.lat,p.lng]);if(ring.length&&String(ring[0])!==String(ring[ring.length-1]))ring.push([...ring[0]]);geo.coordenadas=[ring];}
    const nombre=prompt('Nombre de la geocerca:','Geocerca '+((configuracion.geocercas||[]).length+1));if(nombre===null){drawn.removeLayer(layer);return;}geo.nombre=String(nombre||'Geocerca').trim()||'Geocerca';configuracion.geocercas||(configuracion.geocercas=[]);configuracion.geocercas.push(geo);const r=await ccCloudSave('CREAR_GEOCERCA');if(!r?.ok){configuracion.geocercas=configuracion.geocercas.filter(x=>x.id!==geo.id);alert('No se pudo guardar la geocerca en Supabase.');return;}ccRenderGeocercasMapa();showStatus?.('GEOCERCA GUARDADA · '+geo.nombre,'success');};
  ccMapaUnidadesInstance.on(L.Draw.Event.CREATED,ccDrawCreatedHandler);
  showStatus?.('Selecciona polígono, rectángulo o círculo en las herramientas del mapa','info');
};
window.ccEnfocarGeocerca=function(id){const g=(configuracion.geocercas||[]).find(x=>x.id===id);if(!g||!ccMapaUnidadesInstance)return;const l=ccGeocercaToLayer(g);if(!l)return;if(g.tipo==='circle')ccMapaUnidadesInstance.fitBounds(l.getBounds(),{padding:[30,30]});else ccMapaUnidadesInstance.fitBounds(l.getBounds(),{padding:[30,30]});};
window.ccEditarGeocerca=function(id){const g=(configuracion.geocercas||[]).find(x=>x.id===id);if(!g)return;modal('Editar geocerca',`<div class="cc-grid"><div class="cc-field"><label>Nombre</label><input name="nombre" required value="${esc(g.nombre||'')}"></div><div class="cc-field"><label>Estatus</label><select name="activa"><option value="1" ${g.activa!==false?'selected':''}>ACTIVA</option><option value="0" ${g.activa===false?'selected':''}>OCULTA</option></select></div><div class="cc-field"><label>Color</label><input name="color" type="color" value="${esc(g.color||'#2563eb')}"></div></div>`,f=>{g.nombre=String(f.get('nombre')||'Geocerca').trim();g.activa=f.get('activa')==='1';g.color=String(f.get('color')||'#2563eb');return {}});};
window.ccEliminarGeocerca=async function(id){const g=(configuracion.geocercas||[]).find(x=>x.id===id);if(!g||!confirm(`¿Eliminar la geocerca ${g.nombre}?`))return;const prev=[...(configuracion.geocercas||[])];configuracion.geocercas=prev.filter(x=>x.id!==id);const r=await ccCloudSave('ELIMINAR_GEOCERCA');if(!r?.ok){configuracion.geocercas=prev;alert('No se pudo eliminar en Supabase.');return;}ccRenderGeocercasMapa();};
window.ccAbrirAdministradorGeocercas=function(){const arr=configuracion.geocercas||[];modal('Administrar geocercas',`<div style="display:grid;gap:8px">${arr.length?arr.map((g,i)=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>${esc(g.nombre)}</b><div style="font-size:10px;color:#64748b">${esc(g.tipo)} · ${g.activa===false?'OCULTA':'ACTIVA'}</div></div><div style="display:flex;gap:6px"><button type="button" class="cc-btn cc-btn-light" onclick="document.getElementById('ccFormModal').remove();ccEnfocarGeocerca('${g.id}')">Ver</button><button type="button" class="cc-btn cc-btn-light" onclick="document.getElementById('ccFormModal').remove();ccEditarGeocerca('${g.id}')">Editar</button></div></div>`).join(''):'<div class="cc-geo-empty">No hay geocercas registradas.</div>'}</div>`,()=>({skipCloudSave:true}));};
function ccGeoJSONFeaturesToGeocercas(obj){
  const feats=obj?.type==='FeatureCollection'?obj.features:obj?.type==='Feature'?[obj]:[];const out=[];
  const addPoly=(coords,props={})=>{if(!Array.isArray(coords?.[0]))return;out.push({id:uid(),nombre:String(props.name||props.nombre||props.Name||'Geocerca importada').trim(),tipo:'polygon',coordenadas:coords.map(r=>r.map(p=>[Number(p[1]),Number(p[0])])),activa:true,color:ccGeoColor((configuracion.geocercas||[]).length+out.length),importadaEn:new Date().toISOString()});};
  feats.forEach(f=>{const g=f.geometry||{},p=f.properties||{};if(g.type==='Polygon')addPoly(g.coordinates,p);else if(g.type==='MultiPolygon')g.coordinates.forEach((poly,j)=>addPoly(poly,{...p,name:(p.name||p.nombre||'Geocerca')+(g.coordinates.length>1?' '+(j+1):'')}));});return out;
}
window.ccImportarGeocercasArchivo=async function(file){
  if(!file)return;try{showStatus?.('Leyendo geocercas...','info');await ccEnsureGeoLibraries();const ext=(file.name.split('.').pop()||'').toLowerCase();let obj;
    if(ext==='geojson'||ext==='json'){obj=JSON.parse(await file.text());}
    else if(ext==='kml'){const xml=new DOMParser().parseFromString(await file.text(),'text/xml');obj=window.toGeoJSON.kml(xml);}
    else if(ext==='kmz'){const zip=await JSZip.loadAsync(await file.arrayBuffer());let entry=zip.file(/\.kml$/i)[0];if(!entry)throw new Error('El KMZ no contiene un archivo KML');const xml=new DOMParser().parseFromString(await entry.async('text'),'text/xml');obj=window.toGeoJSON.kml(xml);}
    else throw new Error('Formato no compatible. Usa KML, KMZ, GeoJSON o JSON.');
    const nuevas=ccGeoJSONFeaturesToGeocercas(obj);if(!nuevas.length)throw new Error('No se encontraron polígonos válidos en el archivo.');
    if(!confirm(`Se encontraron ${nuevas.length} geocercas. ¿Importarlas a Supabase?`))return;const prev=[...(configuracion.geocercas||[])];configuracion.geocercas=[...prev,...nuevas];const r=await ccCloudSave('IMPORTAR_GEOCERCAS');if(!r?.ok){configuracion.geocercas=prev;throw new Error(r?.error||'Supabase rechazó la importación');}ccRenderGeocercasMapa();if(ccMapaUnidadesInstance&&nuevas.length){const layers=nuevas.map((g,i)=>ccGeocercaToLayer(g,i)).filter(Boolean);const group=L.featureGroup(layers);if(group.getBounds().isValid())ccMapaUnidadesInstance.fitBounds(group.getBounds(),{padding:[25,25]});}showStatus?.(`${nuevas.length} GEOCERCAS IMPORTADAS`,'success');
  }catch(e){console.error('IMPORTAR GEOCERCAS:',e);alert('No se pudieron importar las geocercas.\n\n'+(e.message||e));showStatus?.('ERROR IMPORTANDO GEOCERCAS','error');}
};
window.ccExportarGeocercas=function(){const arr=configuracion.geocercas||[];if(!arr.length){alert('No hay geocercas para exportar.');return;}const features=[];arr.forEach(g=>{if(g.tipo==='circle'){const steps=64,coords=[];const lat=Number(g.centro?.[0]),lng=Number(g.centro?.[1]),rad=Number(g.radio||0),R=6378137;for(let i=0;i<=steps;i++){const a=2*Math.PI*i/steps;const dLat=(rad*Math.cos(a)/R)*180/Math.PI;const dLng=(rad*Math.sin(a)/(R*Math.cos(lat*Math.PI/180)))*180/Math.PI;coords.push([lng+dLng,lat+dLat]);}features.push({type:'Feature',properties:{name:g.nombre,tipo:'circle',radio:g.radio},geometry:{type:'Polygon',coordinates:[coords]}});}else{features.push({type:'Feature',properties:{name:g.nombre,tipo:g.tipo},geometry:{type:'Polygon',coordinates:(g.coordenadas||[]).map(r=>r.map(p=>[p[1],p[0]]))}});}});const blob=new Blob([JSON.stringify({type:'FeatureCollection',features},null,2)],{type:'application/geo+json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='geocercas_control_cajas.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);};

window.ccBuscarUnidadMapaDebounced=function(){
  clearTimeout(ccMapaSearchTimer);
  ccMapaSearchTimer=setTimeout(()=>ccBuscarUnidadMapa(),120);
};

window.ccBuscarUnidadMapa=function(){
  const q=String(document.getElementById('ccMapaUnidadBuscar')?.value||'').trim().toLowerCase();
  if(!ccMapaUnidadesInstance)return;
  if(!q){
    const pts=ccMapaUnidadesRows.map(r=>[Number(r.latitud),Number(r.longitud)]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
    if(pts.length)ccMapaUnidadesInstance.fitBounds(pts,{padding:[35,35],maxZoom:15});
    return;
  }
  const match=ccMapaUnidadesRows.find(r=>String(r.unidad||'').toLowerCase().includes(q));
  if(!match){
    showStatus?.('UNIDAD NO ENCONTRADA EN EL MAPA','error');
    return;
  }
  const lat=Number(match.latitud),lng=Number(match.longitud);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  ccMapaUnidadesInstance.setView([lat,lng],16,{animate:true});
  const mk=ccMapaUnidadesMarkers.get(match.unidadId);
  if(mk)mk.openPopup();
};

window.ccLimpiarBusquedaMapa=function(){
  const input=document.getElementById('ccMapaUnidadBuscar');
  if(input)input.value='';
  ccBuscarUnidadMapa();
};

let ccMapaUnidadesInstance=null;
window.ccCargarMapaUnidades=async function(force=false){
  const el=document.getElementById('ccMapaUnidadesContainer');
  const resumen=document.getElementById('ccMapaUnidadesResumen');
  if(!el)return;

  try{
    if(!force && ccMapaUnidadesInstance){
      setTimeout(()=>ccMapaUnidadesInstance.invalidateSize(),80);
      return;
    }
    showStatus?.('Cargando mapa de unidades...','info');
    el.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:800">Cargando mapa...</div>';

    const [{data,error}]=await Promise.all([
      gmSupabase.rpc('cc_ultima_ubicacion_todas'),
      ccEnsureGeoLibraries()
    ]);
    if(error)throw error;
    if(data?.ok===false)throw new Error(data.error||'No se pudieron consultar ubicaciones');

    const rows=Array.isArray(data?.registros)?data.registros:[];
    if(ccMapaUnidadesInstance){
      try{ccMapaUnidadesInstance.remove();}catch(_){}
      ccMapaUnidadesInstance=null;
    }
    el.innerHTML='';

    const map=L.map(el,{preferCanvas:true,zoomControl:true}).setView([29.0729,-110.9559],6);
    ccMapaUnidadesInstance=map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; OpenStreetMap'
    }).addTo(map);

    ccMapaUnidadesRows=rows;
    ccMapaUnidadesMarkers.clear();
    ccRenderGeocercasMapa();

    const bounds=[];
    const now=Date.now();

    // Separa visualmente marcadores con coordenadas idénticas, sin cambiar el GPS guardado.
    const ccCoordCounts=new Map();
    for(const x of rows){
      const xLat=Number(x.latitud),xLng=Number(x.longitud);
      if(!Number.isFinite(xLat)||!Number.isFinite(xLng))continue;
      const key=xLat.toFixed(7)+','+xLng.toFixed(7);
      ccCoordCounts.set(key,(ccCoordCounts.get(key)||0)+1);
    }
    const ccCoordSeen=new Map();

    for(const r of rows){
      const lat=Number(r.latitud),lng=Number(r.longitud);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
      const fecha=new Date(r.fechaHora);
      const geocercaActual=ccGeocercaDePunto(lat,lng);
      const ageDays=Math.max(0,(now-fecha.getTime())/86400000);
      const color=ageDays<=1?'#16a34a':ageDays<=7?'#f59e0b':'#dc2626';

      const ageClass=ageDays<=1?'cc-trailer-age-green':ageDays<=7?'cc-trailer-age-yellow':'cc-trailer-age-red';
      const icon=L.divIcon({
        className:'cc-trailer-marker',
        html:`<div class="cc-trailer-wrap ${ageClass}"><div class="cc-trailer-label">${esc(r.unidad||'—')}</div><div class="cc-trailer-icon"></div></div>`,
        iconSize:[42,34],
        iconAnchor:[21,24],
        popupAnchor:[0,-26]
      });
      const coordKey=lat.toFixed(7)+','+lng.toFixed(7);
      const sameTotal=ccCoordCounts.get(coordKey)||1;
      const sameIndex=ccCoordSeen.get(coordKey)||0;
      ccCoordSeen.set(coordKey,sameIndex+1);
      let markerLat=lat,markerLng=lng;
      if(sameTotal>1){
        const angle=(Math.PI*2*sameIndex)/sameTotal;
        const offsetMeters=10+Math.min(sameTotal,8);
        markerLat=lat+(offsetMeters/111320)*Math.sin(angle);
        const lngScale=111320*Math.max(.2,Math.cos(lat*Math.PI/180));
        markerLng=lng+(offsetMeters/lngScale)*Math.cos(angle);
      }
      const marker=L.marker([markerLat,markerLng],{icon}).addTo(map);
      ccMapaUnidadesMarkers.set(r.unidadId,marker);

      marker.bindPopup(`<div style="font-family:Arial,sans-serif;font-size:12px;min-width:210px">
        <div style="font-weight:900;font-size:14px;margin-bottom:5px">${esc(r.unidad||'—')}</div>
        <div>${esc(r.descripcion||'')}</div>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:7px 0">
        <div><b>Última ubicación:</b><br>${esc(fecha.toLocaleString())}</div>
        <div style="margin-top:4px"><b>Precisión:</b> ${r.precisionMetros==null?'—':Math.round(Number(r.precisionMetros))+' m'}</div>
        <div style="margin-top:4px"><b>Ubicación:</b> ${geocercaActual?'<span style="color:#16a34a;font-weight:900">'+esc(geocercaActual.nombre)+'</span>':'Fuera de geocerca'}</div>
        <div style="margin-top:4px"><b>Coordenadas:</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        <div style="margin-top:8px"><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(lat+','+lng)}">Abrir en Google Maps</a></div>
      </div>`);
      bounds.push([lat,lng]);
    }

    if(bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:15});
    else map.setView([29.0729,-110.9559],6);

    if(resumen){
      resumen.innerHTML=`
        <span class="cc-location-pill">${rows.length} unidades con ubicación</span>
        <span class="cc-location-pill">${Math.max(0,cajas.length-rows.length)} sin ubicación</span>
        <span class="cc-location-pill"><i class="fa-solid fa-draw-polygon"></i> ${(configuracion.geocercas||[]).length} geocercas</span>
        <span class="cc-location-pill"><i class="fa-solid fa-location-dot"></i> ${rows.filter(r=>ccGeocercaDePunto(Number(r.latitud),Number(r.longitud))).length} dentro de geocerca</span>
        <span class="cc-location-pill"><span style="color:#16a34a">●</span> Últimas 24 h</span>
        <span class="cc-location-pill"><span style="color:#f59e0b">●</span> 2–7 días</span>
        <span class="cc-location-pill"><span style="color:#dc2626">●</span> Más de 7 días</span>`;
    }

    setTimeout(()=>map.invalidateSize(),120);
    showStatus?.('MAPA DE UNIDADES ACTUALIZADO','success');
  }catch(err){
    console.error('MAPA DE UNIDADES:',err);
    el.innerHTML=`<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#b91c1c;font-weight:800;padding:20px;text-align:center">No se pudo cargar el mapa.<br>${esc(err.message||err)}</div>`;
    showStatus?.('ERROR MAPA UNIDADES · '+(err.message||err),'error');
  }
};

window.ccAbrirMapaUbicaciones=async function(){
  try{
    showStatus?.('Cargando mapa de últimas ubicaciones...','info');
    const [{data,error}]=await Promise.all([
      gmSupabase.rpc('cc_ultima_ubicacion_todas'),
      ccEnsureLeaflet()
    ]);
    if(error)throw error;
    const rows=Array.isArray(data?.registros)?data.registros:[];
    document.getElementById('ccLocationMapModal')?.remove();
    const ov=document.createElement('div');
    ov.id='ccLocationMapModal';ov.className='cc-location-modal';
    ov.innerHTML=`<div class="cc-location-card">
      <div class="cc-location-head"><strong>MAPA · ÚLTIMA UBICACIÓN DE UNIDADES</strong><button class="cc-location-close" type="button">×</button></div>
      <div class="cc-location-body">
        <div class="cc-location-summary"><span class="cc-location-pill">${rows.length} unidades con ubicación</span><span class="cc-location-pill">${Math.max(0,cajas.length-rows.length)} sin ubicación</span></div>
        <div id="ccLocationMap" class="cc-location-map"></div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('.cc-location-close').onclick=()=>{try{map.remove();}catch(_){}ov.remove();};

    const map=L.map('ccLocationMap',{preferCanvas:true}).setView([29.0729,-110.9559],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);

    const bounds=[];
    const now=Date.now();
    for(const r of rows){
      const lat=Number(r.latitud),lng=Number(r.longitud);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
      const ageDays=Math.max(0,(now-new Date(r.fechaHora).getTime())/86400000);
      const color=ageDays<=1?'#16a34a':ageDays<=7?'#f59e0b':'#dc2626';
      const marker=L.circleMarker([lat,lng],{radius:8,color,weight:2,fillColor:color,fillOpacity:.72}).addTo(map);
      marker.bindPopup(`<div style="font-family:Arial;font-size:12px"><b>${esc(r.unidad||'—')}</b><br>${esc(r.descripcion||'')}<br><b>Última ubicación:</b> ${esc(new Date(r.fechaHora).toLocaleString())}<br><b>Precisión:</b> ${r.precisionMetros==null?'—':Math.round(Number(r.precisionMetros))+' m'}<br><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(lat+','+lng)}">Abrir en Google Maps</a></div>`);
      bounds.push([lat,lng]);
    }
    if(bounds.length)map.fitBounds(bounds,{padding:[30,30],maxZoom:15});
    else map.setView([29.0729,-110.9559],6);

    setTimeout(()=>map.invalidateSize(),80);
    showStatus?.('Mapa de ubicaciones cargado','success');
  }catch(err){
    console.error('MAPA UBICACIONES:',err);
    alert('No se pudo cargar el mapa.\\n\\n'+(err.message||err));
  }
};


let ccInventarioUbicaciones=new Map();
let ccInventarioUbicacionesCargadasEn=0;
let ccInventarioUbicacionesLoading=false;
const ccReverseGeoCache=new Map();
let ccReverseGeoLastRequest=0;
function ccDireccionCacheKey(lat,lng){return Number(lat).toFixed(5)+','+Number(lng).toFixed(5);}
function ccLeerDireccionCache(lat,lng){
 const k=ccDireccionCacheKey(lat,lng);
 if(ccReverseGeoCache.has(k))return ccReverseGeoCache.get(k);
 try{const v=localStorage.getItem('cc_geo_'+k);if(v){ccReverseGeoCache.set(k,v);return v;}}catch(_){}
 return '';
}
async function ccReverseGeocode(lat,lng){
 const cached=ccLeerDireccionCache(lat,lng);if(cached)return cached;
 const wait=Math.max(0,1050-(Date.now()-ccReverseGeoLastRequest));
 if(wait)await new Promise(r=>setTimeout(r,wait));
 ccReverseGeoLastRequest=Date.now();
 try{
  const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lng)+'&zoom=18&addressdetails=1&accept-language=es';
  const r=await fetch(url,{headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json(),dir=String(j&&j.display_name||'').trim();
  if(dir){const k=ccDireccionCacheKey(lat,lng);ccReverseGeoCache.set(k,dir);try{localStorage.setItem('cc_geo_'+k,dir);}catch(_){}}
  return dir;
 }catch(e){console.warn('GEOCODIFICACION INVERSA:',e);return '';}
}
function ccEtiquetaUbicacion(r){
 if(!r)return {texto:'Sin ubicación',geocerca:false};
 const lat=Number(r.latitud),lng=Number(r.longitud);
 if(!Number.isFinite(lat)||!Number.isFinite(lng))return {texto:'Sin ubicación',geocerca:false};
 const g=ccGeocercaDePunto(lat,lng);
 if(g)return {texto:g.nombre||'Geocerca',geocerca:true};
 const directa=String(r.direccion||r.address||r.displayName||'').trim();
 return {texto:directa||ccLeerDireccionCache(lat,lng)||'Consultando dirección…',geocerca:false};
}
async function ccActualizarDireccionCelda(r){
 if(!r)return;
 const lat=Number(r.latitud),lng=Number(r.longitud);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||ccGeocercaDePunto(lat,lng))return;
 const dir=String(r.direccion||r.address||r.displayName||'').trim()||await ccReverseGeocode(lat,lng);
 const el=document.querySelector('[data-cc-location-unit="'+String(r.unidadId||'').replace(/"/g,'')+'"]');
 if(el&&dir){const id=String(r.unidadId||'');el.innerHTML='<button type="button" onclick="ccVerUbicacionesUnidad(\''+esc(id)+'\')" style="all:unset;cursor:pointer;display:block;width:100%" title="Ver ubicación actual y últimas 5"><i class="fa-solid fa-location-dot" style="color:#2563eb;margin-right:5px"></i><span>'+esc(dir)+'</span><div style="font-size:9px;color:#94a3b8;margin-top:3px">'+esc(new Date(r.fechaHora).toLocaleString())+'</div><div style="font-size:9px;color:#2563eb;font-weight:800;margin-top:3px">Toca para ver historial</div></button>';}
}
async function ccCargarUbicacionesInventario(force=false){
 if(ccInventarioUbicacionesLoading)return;
 if(!force&&Date.now()-ccInventarioUbicacionesCargadasEn<30000&&ccInventarioUbicaciones.size)return;
 ccInventarioUbicacionesLoading=true;
 try{
  const {data,error}=await gmSupabase.rpc('cc_ultima_ubicacion_todas');
  if(error)throw error;
  const rows=Array.isArray(data&&data.registros)?data.registros:[];
  ccInventarioUbicaciones=new Map(rows.map(r=>[String(r.unidadId),r]));
  ccInventarioUbicacionesCargadasEn=Date.now();
  if(document.getElementById('ccPanelInventario')?.classList.contains('active'))ccRenderInventario();
 }catch(e){console.warn('UBICACIONES INVENTARIO:',e);}
 finally{ccInventarioUbicacionesLoading=false;}
}
window.ccCargarUbicacionesInventario=ccCargarUbicacionesInventario;

let ccInventarioSearchTimer=null;
window.ccInventarioSearchDebounced=function(){
  clearTimeout(ccInventarioSearchTimer);
  ccInventarioSearchTimer=setTimeout(()=>ccRenderInventario(),140);
};
window.ccRenderInventario=function(){ccCargarUbicacionesInventario(false);const tipoInv=window.ccInventarioTipoActual||'TODOS';const body=document.getElementById('ccInventarioBody'),kpis=document.getElementById('ccInventarioKpis');if(!body)return;const q=(document.getElementById('ccInventarioSearch')?.value||'').toLowerCase();const hoy=iso(new Date());const clienteMap=new Map(clientes.map(c=>[c.id,c.nombre]));const rentaActivaMap=new Map();for(const r of rentas){if(r.cajaId&&rentFor(r.id,hoy))rentaActivaMap.set(r.cajaId,r);}const data=cajas.filter(x=>ccTipoMatches(x,tipoInv)&&[x.tipoUnidadNombre,x.numero,x.descripcion,x.tamano,x.tipo,x.origen,x.placas,x.capacidad,x.observaciones,clientes.find(c=>c.id===x.clienteId)?.nombre||''].join(' ').toLowerCase().includes(q));const activos=cajas.filter(x=>ccTipoMatches(x,tipoInv)&&x.estatus!=='INACTIVO').length,rentadas=cajas.filter(x=>ccTipoMatches(x,tipoInv)&&rentas.some(r=>r.cajaId===x.id&&rentFor(r.id,hoy))).length,disponibles=Math.max(0,activos-rentadas),carros=cajas.filter(x=>String(x.categoriaUnidad||x.tipoUnidadNombre||'CAJA').toUpperCase()==='CARRO').length;kpis.innerHTML=`<div class="cc-inv-kpi"><small>Total unidades</small><strong>${cajas.filter(x=>ccTipoMatches(x,tipoInv)).length}</strong></div><div class="cc-inv-kpi"><small>Activas</small><strong>${activos}</strong></div><div class="cc-inv-kpi"><small>Cajas rentadas hoy</small><strong>${rentadas}</strong></div><div class="cc-inv-kpi"><small>Disponibles</small><strong>${disponibles}</strong></div><div class="cc-inv-kpi"><small>Carros</small><strong>${cajas.filter(x=>ccTipoMatches(x,'CARRO')).length}</strong></div>`;body.innerHTML=data.length?data.map((x,i)=>{const esCaja=String(x.categoriaUnidad||x.tipoUnidadNombre||'CAJA').toUpperCase()==='CAJA';const esCarro=[x.categoriaUnidad,x.tipoUnidadNombre,x.tipo].some(v=>String(v||'').trim().toUpperCase().includes('CARRO'));const renta=esCaja?(rentaActivaMap.get(x.id)||null):null;const cliente=clienteMap.get(x.clienteId)||clienteMap.get(renta?.clienteId)||'—';const est=x.estatus==='MANTENIMIENTO'?'MANTENIMIENTO':x.estatus==='INACTIVO'?'INACTIVO':renta?'RENTADA':'DISPONIBLE';const cls=est==='MANTENIMIENTO'?'cc-status-mant':est==='INACTIVO'?'cc-inv-inactivo':est==='RENTADA'?'cc-inv-renta':'cc-inv-disponible';const esStorage=esCaja&&String(x.tipoUsoCaja||'').trim().toUpperCase()==='STORAGE';return `<tr class="${esStorage?'cc-storage-row':''}"><td>${i+1}</td><td><span class="cc-unit-type-badge">${esc(x.tipoUnidadNombre||'CAJA')}</span></td><td><button type="button" class="cc-link" title="Ver dimensiones de la unidad" onclick="ccMostrarMedidasUnidad('${x.id}')"><strong>${esc(x.numero||'—')}</strong></button></td><td>${esc(x.descripcion||'—')}</td><td>${esc(x.tamano||'—')}</td><td>${esc(x.tipo||'—')}${esCaja&&x.tipoUsoCaja?`<div style="font-size:9px;color:#7c3aed;font-weight:800;margin-top:3px">Uso: ${esc(x.tipoUsoCaja)}</div>`:''}</td><td><button type="button" class="cc-link" onclick="ccMostrarMedidasUnidad('${x.id}')">${(x.largoFt||x.anchoFt||x.altoFt||x.largo||x.ancho||x.alto)?`${(Number(x.largoFt||0)||Number(x.largo||0)/0.3048).toFixed(2)} × ${(Number(x.anchoFt||0)||Number(x.ancho||0)/0.3048).toFixed(2)} × ${(Number(x.altoFt||0)||Number(x.alto||0)/0.3048).toFixed(2)} ft`:'Ver dimensiones'}</button></td><td>${esc(x.origen||'—')}</td><td><div><b>MX:</b> ${esc(x.placasMx||x.placas||'—')}</div><div style="font-size:9px;color:#64748b"><b>USA:</b> ${esc(x.placasUsa||'—')}</div></td><td><span class="cc-client-badge">${esc(cliente)}</span></td><td><span class="cc-inv-badge ${cls}">${est}</span></td><td>${esc(x.capacidad||'—')}</td><td data-cc-location-unit="${esc(x.id)}" style="min-width:220px;max-width:340px;white-space:normal;line-height:1.35">${(()=>{const r=ccInventarioUbicaciones.get(String(x.id));const e=ccEtiquetaUbicacion(r);if(r&&!e.geocerca&&!String(r.direccion||r.address||r.displayName||'').trim()&&!ccLeerDireccionCache(Number(r.latitud),Number(r.longitud)))setTimeout(()=>ccActualizarDireccionCelda(r),0);if(!r)return '<span style="color:#94a3b8">Sin ubicación</span>';const contenido=(e.geocerca?'<i class="fa-solid fa-draw-polygon" style="color:#16a34a;margin-right:5px"></i><strong style="color:#166534">'+esc(e.texto)+'</strong>':'<i class="fa-solid fa-location-dot" style="color:#2563eb;margin-right:5px"></i><span>'+esc(e.texto)+'</span>')+'<div style="font-size:9px;color:#94a3b8;margin-top:3px">'+esc(new Date(r.fechaHora).toLocaleString())+'</div><div style="font-size:9px;color:#2563eb;font-weight:800;margin-top:3px">Toca para ver historial</div>';return '<button type="button" onclick="ccVerUbicacionesUnidad(\''+esc(x.id)+'\')" style="all:unset;cursor:pointer;display:block;width:100%" title="Ver ubicación actual y últimas 5">'+contenido+'</button>'})()}</td><td>${esc(x.observaciones||'—')}</td><td><button class="cc-btn cc-btn-light" onclick="ccEditarUnidadDirecto('${x.id}')">Editar</button>${x.estatus==='MANTENIMIENTO'?`<button class="cc-btn cc-btn-primary" onclick="ccLiberarMantenimiento('${x.id}')">Liberar</button>`:`<button class="cc-btn cc-btn-maintenance" title="Poner unidad fuera de servicio" onclick="ccPonerMantenimiento('${x.id}')"><i class="fa-solid fa-triangle-exclamation mr-1"></i>FUERA DE SERVICIO</button>`}<button class="cc-btn cc-btn-dot" title="Registrar entrada de la unidad a revisión DOT" onclick="ccAbrirDotRegistro('${x.id}')"><i class="fa-solid fa-clipboard-check mr-1"></i>DOT</button><button class="cc-btn cc-btn-light" title="Generar QR de ubicación" onclick="ccMostrarQrUnidad('${x.id}')"><i class="fa-solid fa-qrcode mr-1"></i>QR</button></td></tr>`}).join(''):`<tr><td colspan="15" style="padding:35px;text-align:center;color:#94a3b8">No hay unidades registradas.</td></tr>`;};
window.ccRenderClientes=function(){const el=document.getElementById('ccClientesList');if(!el)return;el.innerHTML=clientes.length?clientes.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nombre)}</strong></td><td>${esc(x.contacto||'—')}</td><td>${esc(x.telefono||'—')}</td><td>${esc(x.correo||'—')}</td><td><span class="cc-badge ${x.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus)}</span></td><td><button class="cc-btn cc-btn-light" onclick="ccNuevoCliente('${x.id}')">Editar</button><button class="cc-btn cc-btn-danger" onclick="ccDeleteCliente('${x.id}')">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8">No hay clientes registrados.</td></tr>';};
window.ccRenderResponsables=function(){const el=document.getElementById('ccResponsablesList');if(!el)return;el.innerHTML=responsables.length?responsables.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nombre)}</strong></td><td>${esc(x.puesto||'—')}</td><td>${esc(x.telefono||'—')}</td><td>${esc(x.correo||'—')}</td><td><span class="cc-badge ${x.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus)}</span></td><td><button class="cc-btn cc-btn-light" onclick="ccNuevoResponsable('${x.id}')">Editar</button><button class="cc-btn cc-btn-danger" onclick="ccDeleteResponsable('${x.id}')">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8">No hay responsables registrados.</td></tr>';};
window.ccActualizarTarifaRenta=function(){const metodo=document.getElementById('ccMetodoCobro')?.value||'DIARIO',sel=document.getElementById('ccTarifaRenta'),total=document.getElementById('ccTotalTarifaRenta'),cliente=document.querySelector('#ccForm [name="clienteId"]')?.value;if(!sel||!total)return;const t=Object.assign({diario:0,semanal:0,mensual:0},(configuracion.tarifasRenta||{})[cliente]||{});const valor=Number(t[metodo.toLowerCase()]||0);const etiqueta=metodo==='MENSUAL'?'Tarifa mensual':metodo==='SEMANAL'?'Tarifa semanal':'Tarifa diaria';sel.innerHTML=`<option value="tarifa_${esc(cliente||'general')}" data-total="${valor}">${etiqueta} — $${valor.toFixed(2)}</option>`;total.value=valor.toFixed(2);};
window.ccRenderRenta=function(){
  const head=document.getElementById('ccMatrixHead'),body=document.getElementById('ccMatrixBody');
  if(!head||!body)return;
  const selResp=document.getElementById('ccRentaResponsableFilter'),selCli=document.getElementById('ccRentaClienteFilter');
  const curResp=selResp?.value||'',curCli=selCli?.value||'';
  if(selResp){selResp.innerHTML='<option value="">Todos los responsables</option>'+responsables.filter(x=>x.estatus!=='INACTIVO').map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');selResp.value=curResp;}
  if(selCli){selCli.innerHTML='<option value="">Todos los clientes</option>'+clientes.filter(x=>x.estatus!=='INACTIVO').map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');selCli.value=curCli;}
  const responsableId=selResp?.value||'',clienteId=selCli?.value||'',tipoUnidad=window.ccRentaTipoFiltroActual||'CAJA',hoy=iso(new Date());
  const cajaMap=new Map(cajas.map(x=>[x.id,x])),cliMap=new Map(clientes.map(x=>[x.id,x])),respMap=new Map(responsables.map(x=>[x.id,x]));
  let rows=rentas.filter(r=>{
    if(r.estatus==='CANCELADA')return false;
    const unidad=cajaMap.get(r.cajaId);
    const coincideTipo=tipoUnidad==='TODOS'||String(unidad?.categoriaUnidad||unidad?.tipoUnidadNombre||'CAJA').toUpperCase()===String(tipoUnidad).toUpperCase();
    if(!coincideTipo)return false;
    if(responsableId&&r.responsableId!==responsableId)return false;
    if(clienteId&&r.clienteId!==clienteId)return false;
    const activa=r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA';
    return activa;
  }).sort((a,b)=>{
    const aa=(a.estatus!=='FINALIZADA'&&a.estatus!=='CANCELADA')?1:0,bb=(b.estatus!=='FINALIZADA'&&b.estatus!=='CANCELADA')?1:0;
    if(aa!==bb)return bb-aa;
    return String(b.fechaInicio||'').localeCompare(String(a.fechaInicio||''));
  });

  head.innerHTML=`<tr>
    <th>#</th><th>UNIDAD</th><th>DESCRIPCIÓN</th><th>CLIENTE</th><th>RESPONSABLE</th><th>FECHA INICIO</th><th>FECHA FIN</th><th>MÉTODO</th><th>ESTATUS</th><th>ACCIÓN</th>
  </tr>`;

  body.innerHTML=rows.length?rows.map((r,i)=>{
    const unidad=cajaMap.get(r.cajaId),cli=cliMap.get(r.clienteId),resp=respMap.get(r.responsableId);
    const activa=r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA';
    const vencida=!!(activa&&r.indeterminada!=='SI'&&r.fechaFin&&r.fechaFin<hoy);
    const fechaFin=activa?((r.indeterminada==='SI'||!r.fechaFin)?'Indeterminada':r.fechaFin):(r.fechaFin||'—');
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${esc(unidad?.numero||'—')}</strong></td>
      <td>${esc(unidad?.descripcion||'—')}</td>
      <td>${esc(cli?.nombre||'—')}</td>
      <td>${esc(resp?.nombre||'—')}</td>
      <td>${esc(r.fechaInicio||'—')}</td>
      <td>${esc(fechaFin||'—')}</td>
      <td>${esc(r.metodoCobro||'—')}</td>
      <td><span class="cc-badge ${activa&&!vencida?'cc-ok':''}" ${vencida?'style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa"':''}>${activa?(vencida?'VENCIDA · EN RENTA':'ACTIVA'):'FINALIZADA'}</span></td>
      <td>${activa?`<div style="display:flex;gap:5px;flex-wrap:nowrap"><button class="cc-btn cc-btn-light cc-renta-edit-btn" onclick="ccNuevaRenta('${r.id}')"><i class="fa-solid fa-pen mr-1"></i>Editar</button><button class="cc-btn cc-btn-danger cc-renta-exit-btn" onclick="ccSacarDeRenta('${r.id}')"><i class="fa-solid fa-arrow-right-from-bracket mr-1"></i>Sacar de renta</button></div>`:'<span class="cc-note">Histórico</span>'}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="10" style="padding:24px;text-align:center;color:#94a3b8">No hay rentas activas con los filtros seleccionados.</td></tr>`;

  const unidadesTipo=cajas.filter(x=>tipoUnidad==='TODOS'||String(x.categoriaUnidad||x.tipoUnidadNombre||'CAJA').toUpperCase()===String(tipoUnidad).toUpperCase());
  const activasFiltradas=rentas.filter(r=>{
    const unidad=cajaMap.get(r.cajaId);
    const tipoOk=tipoUnidad==='TODOS'||String(unidad?.categoriaUnidad||unidad?.tipoUnidadNombre||'CAJA').toUpperCase()===String(tipoUnidad).toUpperCase();
    return tipoOk&&r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA'&&(!responsableId||r.responsableId===responsableId)&&(!clienteId||r.clienteId===clienteId);
  });
  const histVisible=!!document.getElementById('ccRentaMostrarHistorico')?.checked;
  document.getElementById('ccRentaSummary').innerHTML=`
    <div class="cc-card"><small>Rentas activas</small><strong style="display:block;font-size:20px">${activasFiltradas.length}</strong></div>
    <div class="cc-card"><small>Clientes activos</small><strong style="display:block;font-size:20px">${new Set(activasFiltradas.map(r=>r.clienteId).filter(Boolean)).size}</strong></div>
    <div class="cc-card"><small>Histórico</small><strong style="display:block;font-size:20px">${histVisible?'Visible':'Oculto'}</strong></div>
    <div class="cc-card"><small>Disponibles</small><strong style="display:block;font-size:20px;color:#b91c1c">${Math.max(0,unidadesTipo.filter(x=>x.estatus!=='MANTENIMIENTO'&&x.estatus!=='INACTIVO').length-activasFiltradas.length)}</strong></div>`;
};window.ccToggleRentaHistorico=function(){var panel=document.getElementById('ccRentaHistoricoPanel'),ck=document.getElementById('ccRentaMostrarHistorico');if(!panel||!ck)return;panel.style.display=ck.checked?'block':'none';if(ck.checked)ccRenderRentaHistorico();ccRenderRenta();};
window.ccRenderRentaHistorico=function(){
  const panel=document.getElementById('ccRentaHistoricoPanel'),body=document.getElementById('ccRentaHistBody');
  if(!panel||panel.style.display==='none'||!body)return;
  const cajaSel=document.getElementById('ccRentaHistCaja'),cliSel=document.getElementById('ccRentaHistCliente'),respSel=document.getElementById('ccRentaHistResponsable');
  const curCaja=cajaSel?.value||'',curCli=cliSel?.value||'',curResp=respSel?.value||'';
  if(cajaSel){cajaSel.innerHTML='<option value="">Todas</option>'+cajas.map(x=>`<option value="${x.id}">${esc(x.numero||'Sin número')}</option>`).join('');cajaSel.value=curCaja;}
  if(cliSel){cliSel.innerHTML='<option value="">Todos</option>'+clientes.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');cliSel.value=curCli;}
  if(respSel){respSel.innerHTML='<option value="">Todos</option>'+responsables.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');respSel.value=curResp;}
  const cajaId=cajaSel?.value||'',clienteId=cliSel?.value||'',responsableId=respSel?.value||'',desde=document.getElementById('ccRentaHistDesde')?.value||'',hasta=document.getElementById('ccRentaHistHasta')?.value||'';
  const cajaMap=new Map(cajas.map(x=>[x.id,x])),cliMap=new Map(clientes.map(x=>[x.id,x])),respMap=new Map(responsables.map(x=>[x.id,x]));
  const rows=rentas.filter(r=>{
    if(r.estatus==='CANCELADA')return false;
    const finalizada=r.estatus==='FINALIZADA'||(r.fechaFin&&r.indeterminada!=='SI');
    if(!finalizada)return false;
    if(cajaId&&r.cajaId!==cajaId)return false;
    if(clienteId&&r.clienteId!==clienteId)return false;
    if(responsableId&&r.responsableId!==responsableId)return false;
    const inicio=String(r.fechaInicio||''),fin=String(r.fechaFin||'');
    if(desde&&fin&&fin<desde)return false;
    if(hasta&&inicio&&inicio>hasta)return false;
    return true;
  }).map(r=>{
    const inicio=String(r.fechaInicio||''),fin=String(r.fechaFin||'');
    const a=desde&&desde>inicio?desde:inicio,b=hasta&&hasta<fin?hasta:fin;
    const dias=(a&&b&&a<=b)?Math.floor((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000)+1:0;
    return {r,unidad:cajaMap.get(r.cajaId),cliente:cliMap.get(r.clienteId),responsable:respMap.get(r.responsableId),dias};
  }).sort((a,b)=>String(b.r.fechaFin||b.r.fechaInicio||'').localeCompare(String(a.r.fechaFin||a.r.fechaInicio||'')));
  const k=document.getElementById('ccRentaHistKpis');
  if(k)k.innerHTML=`<div class="cc-card"><small>Registros históricos</small><strong style="display:block;font-size:20px">${rows.length}</strong></div><div class="cc-card"><small>Cajas</small><strong style="display:block;font-size:20px">${new Set(rows.map(x=>x.r.cajaId)).size}</strong></div><div class="cc-card"><small>Clientes</small><strong style="display:block;font-size:20px">${new Set(rows.map(x=>x.r.clienteId)).size}</strong></div><div class="cc-card"><small>Días en rango</small><strong style="display:block;font-size:20px">${rows.reduce((s,x)=>s+x.dias,0)}</strong></div>`;
  body.innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.unidad?.numero||'—')}</strong></td><td>${esc(x.cliente?.nombre||'—')}</td><td>${esc(x.responsable?.nombre||'—')}</td><td>${esc(x.r.fechaInicio||'—')}</td><td>${esc(x.r.fechaFin||'—')}</td><td>${x.dias}</td><td>${esc(x.r.metodoCobro||'DIARIO')}</td><td>${esc(x.r.observaciones||'—')}</td></tr>`).join(''):'<tr><td colspan="8" style="padding:24px;text-align:center;color:#94a3b8">Sin rentas históricas con los filtros seleccionados.</td></tr>';
  window.ccRentaHistoricoData=rows;
};
window.ccRentaHistoricoLimpiar=function(){['ccRentaHistCaja','ccRentaHistCliente','ccRentaHistResponsable','ccRentaHistDesde','ccRentaHistHasta'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});ccRenderRentaHistorico();};
function ccHistDays(desde,hasta){if(!desde||!hasta||desde>hasta)return 0;const a=new Date(desde+'T12:00:00'),b=new Date(hasta+'T12:00:00');return Math.floor((b-a)/86400000)+1;}
function ccHistOverlapDays(r,desde,hasta){
  const hoy=iso(new Date());
  let inicio=String(r.fechaInicio||'');
  let fin=(r.indeterminada==='SI'||!r.fechaFin)?hoy:String(r.fechaFin||'');
  if(!inicio)return 0;

  // Si no hay rango seleccionado, utiliza únicamente el periodo real de la renta.
  const desdeReal=desde&&desde!=='0000-01-01'?desde:inicio;
  const hastaReal=hasta&&hasta!=='9999-12-31'?hasta:hoy;

  let a=inicio>desdeReal?inicio:desdeReal;
  let b=fin<hastaReal?fin:hastaReal;
  if(a>b)return 0;

  const da=new Date(a+'T12:00:00');
  const db=new Date(b+'T12:00:00');
  return Math.max(0,Math.floor((db-da)/86400000)+1);
}
let ccHistRenderTimer=null;
window.ccRenderHistorialDebounced=function(){
  clearTimeout(ccHistRenderTimer);
  ccHistRenderTimer=setTimeout(()=>ccRenderHistorial(),80);
};
window.ccRenderHistorial=function(){
 const boxSel=document.getElementById('ccHistCaja'),cliSel=document.getElementById('ccHistCliente'),respSel=document.getElementById('ccHistResponsable'),body=document.getElementById('ccHistBody');
 if(!boxSel||!cliSel||!respSel||!body)return;
 const bc=boxSel.value||'',cl=cliSel.value||'',rp=respSel.value||'';
 const key=`${cajas.length}|${clientes.length}`;
 if(window.ccHistCatalogKey!==key){
   const oldB=bc,oldC=cl;
   boxSel.innerHTML='<option value="">Todas las cajas</option>'+cajas.map(x=>`<option value="${x.id}">${esc(x.numero||'Sin número')} — ${esc(x.descripcion||'')}</option>`).join('');
   cliSel.innerHTML='<option value="">Todos los clientes</option>'+clientes.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
   respSel.innerHTML='<option value="">Todos los responsables</option>'+responsables.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
   boxSel.value=oldB;cliSel.value=oldC;window.ccHistCatalogKey=key;
 }
 const cajaMap=new Map(cajas.map(x=>[x.id,x])),clienteMap=new Map(clientes.map(x=>[x.id,x])),respMap=new Map(responsables.map(x=>[x.id,x]));
 const rows=rentas.filter(r=>{
   if(r.estatus==='CANCELADA')return false;
   if(bc&&r.cajaId!==bc)return false;
   if(cl&&r.clienteId!==cl)return false;
   if(rp&&r.responsableId!==rp)return false;
   return true;
 }).map(r=>{
   const abierta=r.indeterminada==='SI'||!r.fechaFin;
   return {
     entrada:r.fechaInicio||'—',
     salida:abierta?'ABIERTA':(r.fechaFin||'—'),
     caja:cajaMap.get(r.cajaId)?.numero||'—',
     cliente:clienteMap.get(r.clienteId)?.nombre||'Sin cliente',
     responsable:respMap.get(r.responsableId)?.nombre||'Sin responsable',
     estatus:abierta?'ACTIVA':'FINALIZADA',
     observaciones:r.observaciones||''
   };
 }).sort((a,b)=>String(b.entrada).localeCompare(String(a.entrada)));

 const visibles=rows.slice(0,300);
 body.innerHTML=visibles.length?visibles.map(x=>`<tr>
   <td>${esc(x.entrada)}</td>
   <td>${esc(x.salida)}</td>
   <td><strong>${esc(x.caja)}</strong></td>
   <td>${esc(x.cliente)}</td>
   <td>${esc(x.responsable)}</td>
   <td><span class="cc-badge ${x.estatus==='ACTIVA'?'cc-ok':''}">${x.estatus}</span></td>
   <td>${esc(x.observaciones||'—')}</td>
 </tr>`).join(''):'<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8">No hay movimientos con los filtros seleccionados.</td></tr>';
 if(rows.length>300)body.insertAdjacentHTML('beforeend',`<tr><td colspan="7" style="padding:10px;text-align:center;color:#64748b">Mostrando 300 de ${rows.length} movimientos. Usa los filtros por caja o cliente para reducir el listado.</td></tr>`);

 const k=document.getElementById('ccHistKpis');
 if(k)k.innerHTML=`<div class="cc-hist-kpi"><small>Movimientos</small><strong>${rows.length}</strong></div><div class="cc-hist-kpi"><small>Cajas</small><strong>${new Set(rows.map(x=>x.caja)).size}</strong></div><div class="cc-hist-kpi"><small>Clientes</small><strong>${new Set(rows.map(x=>x.cliente)).size}</strong></div><div class="cc-hist-kpi"><small>Activas</small><strong>${rows.filter(x=>x.estatus==='ACTIVA').length}</strong></div>`;
 window.ccHistorialData={eventos:rows,rows,box:bc,cliente:cl,responsable:rp};
};
window.ccLimpiarHistorial=function(){['ccHistCaja','ccHistCliente','ccHistResponsable'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});ccRenderHistorial();};
window.ccExportarExcelHistorial=function(){const d=window.ccHistorialData;if(!d){ccRenderHistorial();return;}try{const rows=(d.rows||[]).map((x,i)=>({'#':i+1,'Entrada a renta':x.entrada,'Salida de renta':x.salida,'Caja':x.caja,'Cliente':x.cliente,'Responsable':x.responsable,'Estatus':x.estatus,'Observaciones':x.observaciones||''}));const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:5},{wch:16},{wch:16},{wch:14},{wch:26},{wch:24},{wch:14},{wch:45}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Historial Renta');XLSX.writeFile(wb,`Historial_Renta_${new Date().toISOString().slice(0,10)}.xlsx`);}catch(e){console.error(e);alert('No fue posible exportar el historial a Excel.');}};
window.ccGenerarPDFHistorial=function(){const d=window.ccHistorialData;if(!d){ccRenderHistorial();return;}try{const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'letter'});const box=d.box?(cajas.find(x=>x.id===d.box)?.numero||''):'Todas las cajas';const cliente=d.cliente?(clientes.find(x=>x.id===d.cliente)?.nombre||''):'Todos los clientes';doc.setFillColor(15,23,42);doc.rect(0,0,280,24,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('HISTORIAL DE MOVIMIENTOS DE RENTA',14,11);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text(`Caja: ${box} | Cliente: ${cliente}`,14,18);doc.setTextColor(15,23,42);doc.autoTable({startY:30,head:[['Entrada','Salida','Caja','Cliente','Responsable','Estatus','Observaciones']],body:(d.rows||[]).map(x=>[x.entrada,x.salida,x.caja,x.cliente,x.responsable,x.estatus,x.observaciones||'']),theme:'striped',styles:{fontSize:7,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:[30,64,175],textColor:255,fontStyle:'bold'},margin:{left:8,right:8,bottom:10}});doc.save(`Historial_Renta_${new Date().toISOString().slice(0,10)}.pdf`);}catch(e){console.error(e);alert('No fue posible generar el PDF del historial.');}};
window.ccUnitCategory=function(x){
    return String(x?.categoriaUnidad||x?.tipoUnidadNombre||'CAJA').toUpperCase();
};
window.ccTipoMatches=function(x,tipo){
    if(tipo==='TODOS') return true;
    return ccUnitCategory(x)===tipo || String(x?.tipoUnidadNombre||'').toUpperCase()===String(tipo).toUpperCase();
};
window.ccRenderTipoButtons=function(){
    const tipos=ccGetUnitTypes();
    const dash=document.getElementById('ccDashTipoExtra'), inv=document.getElementById('ccInvTipoExtra');
    if(dash) dash.innerHTML=tipos.filter(t=>!['CAJA','CARRO'].includes(String(t.categoria||t.nombre).toUpperCase())).map(t=>`<button type="button" class="cc-btn cc-btn-light ccDashTipoBtn" data-tipo="${esc(t.nombre)}" onclick="ccDashboardTipo('${esc(t.nombre)}')">${esc(t.nombre)}</button>`).join('');
    if(inv) inv.innerHTML=tipos.filter(t=>!['CAJA','CARRO'].includes(String(t.categoria||t.nombre).toUpperCase())).map(t=>`<button type="button" class="cc-btn cc-btn-light ccInvTipoBtn" data-tipo="${esc(t.nombre)}" onclick="ccFiltrarInventarioTipo('${esc(t.nombre)}')">${esc(t.nombre)}</button>`).join('');
};
window.ccDashboardTipo=function(tipo){
    window.ccDashboardTipoActual=tipo||'TODOS';
    document.querySelectorAll('.ccDashTipoBtn').forEach(b=>{const active=b.dataset.tipo===window.ccDashboardTipoActual;b.classList.toggle('cc-btn-primary',active);b.classList.toggle('cc-btn-light',!active);});
    if(typeof ccRenderDashboard==='function') ccRenderDashboard();
};
window.ccFiltrarInventarioTipo=function(tipo){
    window.ccInventarioTipoActual=tipo||'TODOS';
    document.querySelectorAll('.ccInvTipoBtn').forEach(b=>{const active=b.dataset.tipo===window.ccInventarioTipoActual;b.classList.toggle('cc-btn-primary',active);b.classList.toggle('cc-btn-light',!active);});
    if(typeof ccRenderInventario==='function') ccRenderInventario();
};
window.ccRenderDashboard=function(){const tipoDash=window.ccDashboardTipoActual||'TODOS';const unidadesDash=cajas.filter(x=>ccTipoMatches(x,tipoDash));const cajasDash=unidadesDash.filter(x=>ccUnitCategory(x)==='CAJA');const carrosDash=unidadesDash.filter(x=>ccUnitCategory(x)==='CARRO');const el=document.getElementById('ccDashboardContent');if(!el)return;const hoy=iso(new Date()),total=unidadesDash.length,act=unidadesDash.filter(x=>x.estatus!=='INACTIVO').length,mant=unidadesDash.filter(x=>x.estatus==='MANTENIMIENTO').length,rentadas=unidadesDash.filter(x=>x.estatus!=='MANTENIMIENTO'&&x.estatus!=='INACTIVO'&&rentas.some(r=>r.cajaId===x.id&&rentFor(r.id,hoy))).length,disponibles=Math.max(0,act-mant-rentadas),mex=unidadesDash.filter(x=>(x.origen||'MEXICANA')==='MEXICANA').length,usa=unidadesDash.filter(x=>x.origen==='USA').length,clientesAct=clientes.filter(c=>c.estatus!=='INACTIVO').length;const cliMap={};rentas.filter(r=>rentFor(r.id,hoy)).forEach(r=>{const n=clientes.find(c=>c.id===r.clienteId)?.nombre||'SIN CLIENTE';cliMap[n]=(cliMap[n]||0)+1;});const max=Math.max(1,...Object.values(cliMap));const util=act?((rentadas/act)*100):0;el.innerHTML=`<div class="cc-pro-hero"><div style="font-size:9px;font-weight:900;letter-spacing:.16em;color:#93c5fd">CENTRO DE CONTROL · UNIDADES</div><h3>Control total de tus unidades.</h3><p>Vista ejecutiva para saber en segundos cuántas cajas tienes, cuántas están rentadas, disponibles o fuera de servicio por mantenimiento, y qué clientes concentran las rentas.</p><div class="cc-pro-pills"><span class="cc-pro-pill">${total} unidades registradas</span><span class="cc-pro-pill">${clientesAct} clientes activos</span><span class="cc-pro-pill">${mant} en mantenimiento</span><span class="cc-pro-pill">Corte: ${fmtDate(hoy)}</span></div></div><div class="cc-pro-kpis"><div class="cc-pro-kpi total"><small>Total inventario</small><strong>${total}</strong><span>unidades registradas</span></div><div class="cc-pro-kpi rent"><small>Rentadas hoy</small><strong>${rentadas}</strong><span>${util.toFixed(0)}% del inventario activo</span></div><div class="cc-pro-kpi free"><small>Disponibles</small><strong>${disponibles}</strong><span>listas para asignar</span></div><div class="cc-pro-kpi maint"><small>Mantenimiento</small><strong>${mant}</strong><span>fuera de servicio</span></div><div class="cc-pro-kpi"><small>Mexicanas</small><strong>${mex}</strong><span>del inventario</span></div><div class="cc-pro-kpi"><small>USA</small><strong>${usa}</strong><span>del inventario</span></div></div><div class="cc-pro-grid"><div class="cc-pro-card"><h4>Rentas por cliente</h4><div class="sub">Cajas con renta activa al día de hoy</div>${Object.keys(cliMap).length?Object.entries(cliMap).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="cc-pro-bar"><span title="${esc(n)}">${esc(n)}</span><span class="cc-pro-track"><span class="cc-pro-fill" style="width:${(v/max)*100}%"></span></span><b>${v}</b></div>`).join(''):'<div class="cc-note">No hay rentas activas hoy.</div>'}</div><div class="cc-pro-card"><h4>Salud del inventario</h4><div class="sub">Distribución actual de las cajas activas</div><div class="cc-pro-mini-grid"><div class="cc-pro-mini"><small>Disponibles</small><strong>${disponibles}</strong></div><div class="cc-pro-mini"><small>Rentadas</small><strong>${rentadas}</strong></div><div class="cc-pro-mini"><small>Mantenimiento</small><strong>${mant}</strong></div></div><div class="cc-pro-bar"><span>Disponibilidad</span><span class="cc-pro-track"><span class="cc-pro-fill" style="width:${act?disponibles/act*100:0}%"></span></span><b>${act?Math.round(disponibles/act*100):0}%</b></div><div class="cc-pro-bar"><span>Utilización</span><span class="cc-pro-track"><span class="cc-pro-fill" style="width:${Math.min(100,util)}%"></span></span><b>${util.toFixed(0)}%</b></div><div class="cc-pro-actions"><button class="primary" onclick="ccTab('inventario',document.querySelector('#controlCajasSection .cc-tab:nth-child(2)'))">Ver inventario</button><button class="warn" onclick="ccTab('mantenimiento',document.querySelector('#controlCajasSection .cc-tab:nth-child(6)'))">Ver mantenimiento</button></div></div></div><div class="cc-pro-card" style="margin-top:14px"><h4>Alertas de control</h4><div class="sub">Indicadores que requieren atención</div>${mant?`<div class="cc-pro-alert"><div><strong>🔧 ${mant} caja(s) fuera de servicio</strong><span>Revisar mantenimiento y fecha de liberación.</span></div><button class="cc-btn cc-btn-light" onclick="ccTab('mantenimiento',document.querySelector('#controlCajasSection .cc-tab:nth-child(6)'))">Revisar</button></div>`:''}${!disponibles&&act?`<div class="cc-pro-alert"><div><strong>⚠️ Sin cajas disponibles</strong><span>Todas las cajas activas están rentadas o en mantenimiento.</span></div></div>`:''}${!mant&&!(!disponibles&&act)?`<div style="font-size:11px;color:#64748b;padding:12px;background:#f8fafc;border-radius:10px">✓ No hay alertas críticas de inventario en este momento.</div>`:''}</div>`;};
window.ccConfigSection=function(section,btn){
document.querySelectorAll('#ccPanelConfiguracion .cc-config-nav-btn').forEach(b=>b.classList.remove('active'));
document.querySelectorAll('#ccPanelConfiguracion .cc-config-section').forEach(x=>x.classList.remove('active'));
if(btn)btn.classList.add('active');
const el=document.getElementById('ccConfig'+section.charAt(0).toUpperCase()+section.slice(1));
if(el)el.classList.add('active');
if(section==='clientes')ccRenderClientes();
if(section==='responsables')ccRenderResponsables();
if(section==='remitente'||section==='destinatarios')ccRenderConfiguracion();
if(section==='tarifas')ccRenderTarifas();if(section==='tiposUnidad')ccRenderTiposUnidad();if(section==='tiposUsoCaja')ccRenderTiposUsoCaja();
};
window.ccRenderTiposUnidad=function(){const el=document.getElementById('ccTiposUnidadList');if(!el)return;const arr=configuracion.tiposUnidad||[];el.innerHTML=arr.length?arr.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nombre)}</strong></td><td>${esc(x.categoria||x.nombre)}</td><td><span class="cc-badge ${x.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus||'ACTIVO')}</span></td><td><button class="cc-btn cc-btn-light" onclick="ccNuevoTipoUnidad('${x.id}')">Editar</button><button class="cc-btn cc-btn-danger" onclick="ccDeleteTipoUnidad('${x.id}')">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="5" style="padding:30px;text-align:center;color:#94a3b8">No hay tipos configurados.</td></tr>';};
window.ccNuevoTipoUnidad=function(id){const x=(configuracion.tiposUnidad||[]).find(a=>a.id===id)||{};modal(id?'Editar tipo de unidad':'Nuevo tipo de unidad',`<div class="cc-grid"><div class="cc-field"><label>Nombre del tipo</label><input name="nombre" required placeholder="Ej. CARRO, CAJA REFRIGERADA..." value="${esc(x.nombre)}"></div><div class="cc-field"><label>Categoría</label><select name="categoria"><option ${x.categoria==='CAJA'||!x.categoria?'selected':''}>CAJA</option><option ${x.categoria==='CARRO'?'selected':''}>CARRO</option><option ${x.categoria==='OTRO'?'selected':''}>OTRO</option></select></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option></select></div></div>`,f=>{const nombre=String(f.get('nombre')||'').trim().toUpperCase();if(!nombre)return;if((configuracion.tiposUnidad||[]).some(a=>a.id!==id&&String(a.nombre).toUpperCase()===nombre)){alert('Ese tipo de unidad ya existe.');return;}const o={...x,id:x.id||uid(),nombre,categoria:f.get('categoria'),estatus:f.get('estatus')};if(id)configuracion.tiposUnidad=configuracion.tiposUnidad.map(a=>a.id===id?o:a);else configuracion.tiposUnidad.push(o);});};
window.ccDeleteTipoUnidad=function(id){const x=(configuracion.tiposUnidad||[]).find(a=>a.id===id);if(!x)return;if(['tipo_caja','tipo_carro'].includes(id)){alert('Los tipos CAJA y CARRO son base del sistema y no se pueden eliminar. Puedes desactivarlos.');return;}if(cajas.some(u=>u.tipoUnidadId===id)){alert('No se puede eliminar un tipo que ya está asignado a unidades. Puedes desactivarlo.');return;}if(!confirm(`¿Eliminar el tipo ${x.nombre}?`))return;configuracion.tiposUnidad=configuracion.tiposUnidad.filter(a=>a.id!==id);ccAudit({operacionId:ccAuditId('TIPO'),accion:'ELIMINAR_TIPO_UNIDAD',modulo:'CONFIGURACION',submodulo:'TIPOS_UNIDAD',idRegistro:id,datosAnteriores:x,detalle:'Tipo de unidad eliminado'});save();ccRenderTiposUnidad();};

window.ccRenderTiposUsoCaja=function(){
  const el=document.getElementById('ccTiposUsoCajaList');if(!el)return;
  const arr=configuracion.tiposUsoCaja||[];
  el.innerHTML=arr.length?arr.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nombre)}</strong></td><td><span class="cc-badge ${x.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus||'ACTIVO')}</span></td><td><button class="cc-btn cc-btn-light" onclick="ccNuevoTipoUsoCaja('${x.id}')">Editar</button></td></tr>`).join(''):'<tr><td colspan="4" style="padding:30px;text-align:center;color:#94a3b8">No hay tipos de uso configurados.</td></tr>';
};
window.ccNuevoTipoUsoCaja=function(id){
  const x=(configuracion.tiposUsoCaja||[]).find(a=>a.id===id)||{};
  modal(id?'Editar tipo de uso':'Nuevo tipo de uso',`<div class="cc-grid"><div class="cc-field"><label>Nombre</label><input name="nombre" required value="${esc(x.nombre)}" placeholder="Ej. Cruce"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option></select></div></div>`,f=>{
    const nombre=String(f.get('nombre')||'').trim();
    if(!nombre)return;
    if((configuracion.tiposUsoCaja||[]).some(a=>a.id!==id&&String(a.nombre).trim().toUpperCase()===nombre.toUpperCase()))throw new Error('Ese tipo de uso ya existe.');
    const o={...x,id:x.id||uid(),nombre,estatus:f.get('estatus')};
    if(id)configuracion.tiposUsoCaja=configuracion.tiposUsoCaja.map(a=>a.id===id?o:a);
    else (configuracion.tiposUsoCaja||(configuracion.tiposUsoCaja=[])).push(o);
  });
};
window.ccDescargarTemplateUnidades=function(){const h=['Tipo de unidad','Identificador / Número','Descripción','Largo (ft)','Ancho (ft)','Alto (ft)','Largo','Ancho','Alto','Placas MX','Placas USA','Tipo de uso de caja','Marca','Modelo / Año','Tamaño','Tipo / Configuración','Origen','Cliente','Capacidad','Estatus','Observaciones'];const e=['CAJA','CAJ-001','Ejemplo','','','','53','8.5','9','ABC1234','','Cruce','Utility','2026','53 FT','Caja seca','MEXICANA','','26 TON','ACTIVO',''];const ws=XLSX.utils.aoa_to_sheet([h,e]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Unidades');XLSX.writeFile(wb,'Template_Importacion_Unidades.xlsx');};
window.ccAbrirImportarUnidades=function(){
  modal('Importar unidades desde Excel / CSV',`
    <div class="cc-import-note">
      <b>Importación directa a Supabase.</b> Una fila por unidad. Columnas reconocidas:
      Tipo de unidad, Identificador / Número, Descripción, Largo, Ancho, Alto,
      Placas, Placas MX, Placas USA, Tipo de uso de caja, Marca, Modelo / Año,
      Tamaño, Tipo / Configuración, Origen, Cliente, Capacidad, Estatus y Observaciones.
      <br><b>Importante:</b> el Identificador / Número no puede estar repetido.
    </div>
    <div class="cc-field"><label>Archivo Excel / CSV</label><input id="ccImportFile" type="file" accept=".xlsx,.xls,.csv" required></div>
    <div id="ccImportPreview" style="margin-top:12px"></div>
  `,async f=>{
    const input=document.getElementById('ccImportFile');
    if(!input?.files?.[0])throw new Error('Selecciona un archivo Excel o CSV.');
    const r=await ccProcesarImportacionUnidades(input.files[0]);
    if(!r?.ok)throw new Error(r?.error||'No se pudo importar el archivo.');
  });
};

window.ccProcesarImportacionUnidades=async function(file){
  const readFile=()=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('No fue posible leer el archivo.'));
    reader.onload=()=>resolve(reader.result);
    reader.readAsArrayBuffer(file);
  });
  try{
    showStatus?.('Leyendo archivo de unidades...','info');
    const buffer=await readFile();
    const wb=XLSX.read(buffer,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    if(!rows.length)throw new Error('El archivo no contiene filas para importar.');

    const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const pick=(r,keys)=>{const found=Object.keys(r).find(k=>keys.includes(norm(k)));return found===undefined?'':r[found];};
    const tipoFind=v=>{
      const n=String(v||'CAJA').trim().toUpperCase();
      return configuracion.tiposUnidad.find(t=>String(t.nombre).trim().toUpperCase()===n)
        ||configuracion.tiposUnidad.find(t=>String(t.categoria||'').trim().toUpperCase()===n)
        ||configuracion.tiposUnidad.find(t=>String(t.nombre).trim().toUpperCase()==='CAJA');
    };
    const usoFind=v=>{
      const raw=String(v||'').trim();
      if(!raw)return '';
      const n=norm(raw);
      return (configuracion.tiposUsoCaja||[]).find(u=>norm(u.nombre)===n)?.nombre||raw;
    };

    const nuevos=rows.map((r,index)=>{
      const t=tipoFind(pick(r,['tipodeunidad','tipounidad','unidad','categoria']));
      const placasMx=String(pick(r,['placasmx','placamexico','placasmexico'])).trim();
      const placasUsa=String(pick(r,['placasusa','placausa','placaseua','placasestadosunidos'])).trim();
      const placasGeneral=String(pick(r,['placas','placa'])).trim();
      const obj={
        id:uid(),
        tipoUnidadId:t?.id||'tipo_caja',
        tipoUnidadNombre:t?.nombre||'CAJA',
        categoriaUnidad:t?.categoria||'CAJA',
        numero:String(pick(r,['identificadornumero','identificador','numero','economico','unidadnumero','unidad'])).trim(),
        descripcion:String(pick(r,['descripcion','nombre'])).trim(),
        placasMx:placasMx||placasGeneral,
        placasUsa,
        placas:placasMx||placasGeneral||placasUsa,
        tipoUsoCaja:usoFind(pick(r,['tipodeusodecaja','tipousocaja','usodecaja','uso'])),
        marca:String(pick(r,['marca'])).trim(),
        modelo:String(pick(r,['modeloano','modelo','ano','year'])).trim(),
        tamano:String(pick(r,['tamano','tamanio','ft'])).trim(),
        tipo:String(pick(r,['tipoconfiguracion','configuracion','tipocaja'])).trim(),
        origen:String(pick(r,['origen','paisorigen'])).trim()||'MEXICANA',
        clienteId:(()=>{const n=String(pick(r,['cliente','clienteasignado','razonsocial'])).trim().toLowerCase();return clientes.find(c=>String(c.nombre||'').trim().toLowerCase()===n)?.id||'';})(),
        capacidad:String(pick(r,['capacidad'])).trim(),
        largoFt:Number(String(pick(r,['largoft','largopies','largoenpies'])).replace(',','.'))||0,
        anchoFt:Number(String(pick(r,['anchoft','anchopies','anchoenpies'])).replace(',','.'))||0,
        altoFt:Number(String(pick(r,['altoft','altopies','altoenpies'])).replace(',','.'))||0,
        largo:Number(String(pick(r,['largo'])).replace(',','.'))||0,
        ancho:Number(String(pick(r,['ancho'])).replace(',','.'))||0,
        alto:Number(String(pick(r,['alto'])).replace(',','.'))||0,
        estatus:String(pick(r,['estatus','status'])).trim().toUpperCase()||'ACTIVO',
        observaciones:String(pick(r,['observaciones','comentarios','notas'])).trim(),
        _fila:index+2
      };
      if(String(obj.categoriaUnidad||obj.tipoUnidadNombre).toUpperCase()==='CARRO'){
        obj.largoFt=obj.largoFt||obj.largo/0.3048;obj.anchoFt=obj.anchoFt||obj.ancho/0.3048;obj.altoFt=obj.altoFt||obj.alto/0.3048;
        obj.largo=obj.largoFt*0.3048;obj.ancho=obj.anchoFt*0.3048;obj.alto=obj.altoFt*0.3048;
      }
      return obj;
    }).filter(x=>x.numero||x.descripcion);

    if(!nuevos.length)throw new Error('No se encontraron unidades válidas. Revisa los encabezados del archivo.');

    const sinNumero=nuevos.filter(x=>!x.numero);
    if(sinNumero.length)throw new Error(`Hay ${sinNumero.length} fila(s) sin Identificador / Número. Corrige el Excel antes de importar.`);

    const seen=new Map(),duplicadosArchivo=[];
    for(const x of nuevos){
      const k=x.numero.trim().toUpperCase();
      if(seen.has(k))duplicadosArchivo.push(`${x.numero} (filas ${seen.get(k)} y ${x._fila})`);
      else seen.set(k,x._fila);
    }
    if(duplicadosArchivo.length)throw new Error('Hay identificadores duplicados dentro del Excel: '+duplicadosArchivo.slice(0,10).join(', '));

    const existentes=new Set(cajas.map(c=>String(c.numero||'').trim().toUpperCase()).filter(Boolean));
    const repetidos=nuevos.filter(x=>existentes.has(x.numero.trim().toUpperCase()));
    if(repetidos.length)throw new Error('Estas unidades ya existen en la base y no se importaron: '+repetidos.slice(0,15).map(x=>x.numero).join(', '));

    nuevos.forEach(x=>delete x._fila);

    showStatus?.(`Importando ${nuevos.length} unidades directamente en Supabase...`,'info');
    const {data:importResult,error:importError}=await gmSupabase.rpc('cc_import_units',{p_unidades:nuevos});
    if(importError)throw importError;
    if(importResult?.ok===false){
      const dup=Array.isArray(importResult?.duplicados)?' · '+importResult.duplicados.join(', '):'';
      throw new Error((importResult?.detalle||importResult?.error||'Supabase rechazó la importación')+dup);
    }

    // Verificación adicional contra lo realmente persistido.
    const {data:verify,error:verifyError}=await gmSupabase.rpc('cc_load_all');
    if(verifyError)throw verifyError;
    const dbUnits=Array.isArray(verify?.state?.cajas)?verify.state.cajas:[];
    const dbIds=new Set(dbUnits.map(x=>String(x.numero||'').trim().toUpperCase()));
    const faltantes=nuevos.filter(x=>!dbIds.has(x.numero.trim().toUpperCase()));
    if(faltantes.length)throw new Error('Supabase no devolvió todas las unidades importadas: '+faltantes.map(x=>x.numero).join(', '));

    ccRevision=Number(verify?.revision||ccRevision);
    ccNormalizeState(verify?.state||{});
    ccRenderAll();

    await ccAudit({
      operacionId:ccAuditId('IMP'),
      accion:'IMPORTAR_UNIDADES',
      modulo:'INVENTARIO',
      submodulo:'IMPORTACION_EXCEL',
      detalle:`Importación confirmada en Supabase: ${nuevos.length} unidades`,
      datosNuevos:{cantidad:nuevos.length,unidades:nuevos.map(x=>({id:x.id,numero:x.numero,tipo:x.tipoUnidadNombre}))}
    });

    showStatus?.(`IMPORTACIÓN COMPLETA · ${nuevos.length} unidades guardadas y verificadas en Supabase`,'success');
    alert(`Importación completa.\n\n${nuevos.length} unidades fueron guardadas y verificadas en Supabase.`);
    return {ok:true,cantidad:nuevos.length};
  }catch(err){
    console.error('IMPORTACION UNIDADES:',err);
    showStatus?.('ERROR DE IMPORTACIÓN · '+(err.message||err),'error');
    alert('No se pudo completar la importación en Supabase.\n\n'+(err.message||err));
    return {ok:false,error:err.message||String(err)};
  }
};
document.addEventListener('click',function(e){
  const btn=e.target.closest('#controlCajasSection button');
  if(!btn)return;
  const txt=(btn.innerText||btn.textContent||'').trim().replace(/\s+/g,' ');
  if(!txt)return;
  if(/^(Editar|Eliminar|Liberar|FUERA DE SERVICIO|Guardar|Cancelar|Volver|Cerrar|Limpiar|Todos|Cajas|Carros|Todas|General|Revisar|Ver inventario|Ver mantenimiento)$/i.test(txt))return;
  if(btn.closest('.cc-sim-3d-wrap'))return;
  ccAudit({operacionId:ccAuditId('BTN'),accion:'CLICK_BOTON',modulo:'INTERFAZ',submodulo:'CONTROL_CAJAS',detalle:txt});
},true);

window.ccRefreshMailSettings=async function(){
  if(!ccSupabaseReady())return;
  try{
    const {data,error}=await gmSupabase.rpc('cc_get_mail_settings');
    if(error)throw error;
    configuracion.correoEnvio=Object.assign({proveedor:'RESEND',nombreRemitente:'',correoRemitente:'',replyTo:''},data||{});
    const cfg=configuracion.correoEnvio;
    const n=document.getElementById('ccMailSenderName'),e=document.getElementById('ccMailSenderEmail'),r=document.getElementById('ccMailReplyTo'),k=document.getElementById('ccMailKeyStatus'),b=document.getElementById('ccMailConfigBadge');
    if(n)n.value=cfg.nombreRemitente||'';if(e)e.value=cfg.correoRemitente||'';if(r)r.value=cfg.replyTo||'';
    if(k)k.textContent=cfg.apiKeyConfigurada?'Contraseña de aplicación configurada y protegida en Supabase Vault.':'Contraseña de aplicación no configurada.';
    const listo=!!(cfg.nombreRemitente&&cfg.correoRemitente&&cfg.apiKeyConfigurada);
    if(b){b.className='cc-badge '+(listo?'cc-ok':'cc-off');b.textContent=listo?'Listo para enviar':'Configuración incompleta';}
  }catch(err){console.error('CONFIG CORREO:',err);const b=document.getElementById('ccMailConfigBadge');if(b){b.className='cc-badge cc-off';b.textContent='Error de configuración';}}
};
window.ccRenderConfiguracion=function(){
  const el=document.getElementById('ccCorreosMantenimientoList');if(!el)return;
  const st=document.getElementById('ccCloudStatus');if(st)st.innerHTML='Base de datos: <b>Supabase / PostgreSQL</b> · '+(ccCloudReady?'conectada y protegida con auditoría de versiones.':'pendiente de conexión: configura GM_SUPABASE_URL en el HTML.');
  const arr=configuracion.correosMantenimiento||[];
  el.innerHTML=arr.length?arr.map((email,i)=>`<div class="cc-email-row"><div><i class="fa-solid fa-envelope text-slate-400 mr-2"></i><strong>${esc(email)}</strong></div><button class="cc-btn cc-btn-danger" onclick="ccEliminarCorreoMantenimiento(${i})"><i class="fa-solid fa-trash mr-1"></i>Eliminar</button></div>`).join(''):'<div style="padding:18px;text-align:center;color:#94a3b8">No hay destinatarios configurados.</div>';
  const cfg=configuracion.correoEnvio||{};const n=document.getElementById('ccMailSenderName'),e=document.getElementById('ccMailSenderEmail'),r=document.getElementById('ccMailReplyTo');if(n&&!n.value)n.value=cfg.nombreRemitente||'';if(e&&!e.value)e.value=cfg.correoRemitente||'';if(r&&!r.value)r.value=cfg.replyTo||'';
  ccRefreshMailSettings();ccRenderClientes();ccRenderResponsables();ccRenderTiposUnidad();ccRenderTiposUsoCaja();
};
window.ccGuardarConfiguracionCorreo=async function(){
  const nombre=String(document.getElementById('ccMailSenderName')?.value||'').trim();
  const correo=String(document.getElementById('ccMailSenderEmail')?.value||'').trim().toLowerCase();
  const reply=String(document.getElementById('ccMailReplyTo')?.value||'').trim().toLowerCase();
  const api=String(document.getElementById('ccMailApiKey')?.value||'').trim();
  if(!nombre||!correo){alert('Captura el nombre y el correo remitente.');return;}
  try{
    showStatus?.('Guardando configuración segura de correo...','info');
    const {data,error}=await gmSupabase.rpc('cc_save_mail_settings',{p_nombre_remitente:nombre,p_correo_remitente:correo,p_reply_to:reply||null,p_resend_api_key:api||null});
    if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo guardar la configuración');
    const key=document.getElementById('ccMailApiKey');if(key)key.value='';
    await ccRefreshMailSettings();
    await ccAudit({operacionId:ccAuditId('MAILCFG'),accion:'CONFIGURAR_CORREO_REMITENTE',modulo:'CONFIGURACION',submodulo:'CORREO',datosNuevos:{nombreRemitente:nombre,correoRemitente:correo,replyTo:reply,contrasenaAplicacionActualizada:!!api},detalle:'Configuración de Gmail remitente actualizada'});
    showStatus?.('CONFIGURACIÓN DE CORREO GUARDADA','success');
  }catch(err){console.error(err);showStatus?.('ERROR CONFIGURANDO CORREO · '+(err.message||err),'error');alert('No se pudo guardar la configuración de correo.\n\n'+(err.message||err));}
};
window.ccNuevoCorreoMantenimiento=function(){modal('Agregar destinatario de mantenimiento',`<div class="cc-field"><label>Correo electrónico</label><input name="correo" type="email" required placeholder="correo@empresa.com"></div>`,f=>{const email=String(f.get('correo')||'').trim().toLowerCase();if(!email)return;if(!configuracion.correosMantenimiento)configuracion.correosMantenimiento=[];if(configuracion.correosMantenimiento.includes(email)){alert('Ese correo ya está configurado.');return;}configuracion.correosMantenimiento.push(email);ccAudit({operacionId:ccAuditId('CFG'),accion:'AGREGAR_CORREO_MANTENIMIENTO',modulo:'CONFIGURACION',submodulo:'CORREOS',datosNuevos:{correo:email},detalle:'Destinatario agregado para avisos de mantenimiento'});save();ccRenderConfiguracion();});};
window.ccEliminarCorreoMantenimiento=function(i){const arr=configuracion.correosMantenimiento||[];if(!arr[i])return;if(!confirm(`¿Eliminar ${arr[i]} de las notificaciones de mantenimiento?`))return;const eliminado=arr[i];arr.splice(i,1);ccAudit({operacionId:ccAuditId('CFG'),accion:'ELIMINAR_CORREO_MANTENIMIENTO',modulo:'CONFIGURACION',submodulo:'CORREOS',datosAnteriores:{correo:eliminado},detalle:'Destinatario eliminado de avisos de mantenimiento'});save();ccRenderConfiguracion();};
window.ccEnviarCorreoPrueba=async function(){
  if(!(configuracion.correosMantenimiento||[]).length){alert('Primero agrega por lo menos un destinatario.');return;}
  try{
    showStatus?.('Enviando correo de prueba...','info');
    const {data,error}=await gmSupabase.functions.invoke('cc-send-maintenance-email',{body:{test:true}});
    if(error)throw error;if(data?.ok===false)throw new Error(data.message||data.error||'El proveedor rechazó el envío');
    showStatus?.('CORREO DE PRUEBA ENVIADO','success');alert('Correo de prueba enviado correctamente a los destinatarios configurados.');
  }catch(err){console.error('PRUEBA CORREO:',err);showStatus?.('ERROR DE CORREO · '+(err.message||err),'error');alert('No se pudo enviar el correo de prueba.\n\n'+(err.message||err));}
};
window.ccEnviarAvisoMantenimiento=async function(x,record,evento='ENTRADA'){
  if(!(configuracion.correosMantenimiento||[]).length){
    showStatus?.('Mantenimiento guardado, pero no hay destinatarios de correo configurados.','error');
    return {ok:false,error:'SIN_DESTINATARIOS'};
  }
  if(!record?.id)return {ok:false,error:'MANTENIMIENTO_SIN_ID'};
  const esLiberacion=String(evento).toUpperCase()==='LIBERACION';
  try{
    showStatus?.(esLiberacion?'Enviando correo de liberación...':'Enviando aviso de fuera de servicio por correo...','info');
    const {data,error}=await gmSupabase.functions.invoke('cc-send-maintenance-email',{
      body:{recordId:record.id,evento:esLiberacion?'LIBERACION':'ENTRADA'}
    });
    if(error)throw error;
    if(data?.ok===false)throw new Error(data.message||data.error||'No se pudo enviar el correo');

    await ccAudit({
      operacionId:ccAuditId('MAIL'),
      accion:esLiberacion?'AVISO_LIBERACION_ENVIADO':'AVISO_MANTENIMIENTO_ENVIADO',
      modulo:'MANTENIMIENTO',
      submodulo:'CORREO',
      idRegistro:record.id,
      idUnidad:x?.id||record.cajaId||'',
      numeroUnidad:x?.numero||record.numero||'',
      idMantenimiento:record.id,
      detalle:esLiberacion
        ?`Correo de liberación enviado · ${Number(data.attachments||0)} evidencia(s) adjunta(s)`
        :`Correo de fuera de servicio enviado · ${Number(data.attachments||0)} evidencia(s) adjunta(s)`
    });

    showStatus?.(
      data.alreadySent
        ?(esLiberacion?'EL CORREO DE LIBERACIÓN YA HABÍA SIDO ENVIADO':'EL AVISO DE MANTENIMIENTO YA HABÍA SIDO ENVIADO')
        :(esLiberacion?'CORREO DE LIBERACIÓN ENVIADO':'AVISO DE MANTENIMIENTO ENVIADO POR CORREO'),
      'success'
    );
    return data;
  }catch(err){
    console.error('EMAIL MANTENIMIENTO:',err);
    showStatus?.((esLiberacion?'LIBERACIÓN':'MANTENIMIENTO')+' GUARDADA · ERROR AL ENVIAR CORREO: '+(err.message||err),'error');
    return {ok:false,error:err.message||String(err)};
  }
};
window.ccImageUrlToDataUrl=async function(url){if(!url)return '';const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('No se pudo cargar la evidencia');const blob=await r.blob();return await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(blob);});};
window.ccGenerarPDFMantenimiento=async function(record,x){
  try{
    if(!window.jspdf||!window.jspdf.jsPDF){
      alert('No fue posible generar el PDF porque la librería PDF no está disponible.');
      return;
    }
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'letter'});
    const cliente=clientes.find(c=>c.id===record.clienteId)?.nombre||
                  clientes.find(c=>c.id===x?.clienteId)?.nombre||'Sin cliente';
    const f=v=>v?new Date(v).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}):'—';

    doc.setFont('helvetica','bold');doc.setFontSize(18);
    doc.text('CONTROL DE MANTENIMIENTO DE UNIDAD',18,20);
    doc.setFontSize(10);doc.setFont('helvetica','normal');
    doc.text(record.fechaLiberacion?'Reporte de mantenimiento cerrado':'Registro de salida de servicio y seguimiento',18,27);
    doc.setDrawColor(record.fechaLiberacion?22:220,record.fechaLiberacion?101:38,record.fechaLiberacion?52:38);
    doc.line(18,31,194,31);

    let y=42;
    const rows=[
      ['Unidad',record.numero||x?.numero||'—'],
      ['Descripción',record.descripcion||x?.descripcion||'—'],
      ['Tipo de unidad',x?.tipoUnidadNombre||x?.categoriaUnidad||'—'],
      ['Tipo / Configuración',record.tipo||x?.tipo||'—'],
      ['Tamaño',record.tamano||x?.tamano||'—'],
      ['Placas',record.placas||x?.placas||'—'],
      ['Marca',x?.marca||'—'],
      ['Modelo / Año',x?.modelo||'—'],
      ['Origen',record.origen||x?.origen||'—'],
      ['Capacidad',x?.capacidad||'—'],
      ['Cliente',cliente],
      ['Fecha y hora de salida',f(record.fechaSalida)],
      ['Motivo del mantenimiento',record.motivo||'—'],
      ['Qué se reparó',record.reparacion||'Pendiente de reparación'],
      ['Estatus actual',record.fechaLiberacion?'LIBERADA / DISPONIBLE':'EN MANTENIMIENTO'],
      ['Fecha y hora de liberación',f(record.fechaLiberacion)]
    ];

    rows.forEach(([a,b])=>{
      doc.setFont('helvetica','bold');doc.text(a+':',20,y);
      doc.setFont('helvetica','normal');
      const lines=doc.splitTextToSize(String(b),125);
      doc.text(lines,65,y);
      y+=Math.max(7,lines.length*5);
    });

    const evidencias=[
      {url:record.evidenciaUrl||record.evidencia_url||'',titulo:'Evidencia · Fuera de servicio'},
      {url:record.evidenciaLiberacionUrl||record.evidencia_liberacion_url||'',titulo:'Evidencia · Liberación'}
    ].filter(e=>e.url);

    for(const ev of evidencias){
      try{
        const img=await ccImageUrlToDataUrl(ev.url);
        if(y>185){doc.addPage();y=20;}
        doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(ev.titulo+':',20,y);y+=6;
        const props=doc.getImageProperties(img);
        const maxW=165,maxH=90,ratio=Math.min(maxW/props.width,maxH/props.height);
        const w=props.width*ratio,h=props.height*ratio;
        doc.addImage(img,props.fileType||'JPEG',20,y,w,h);
        y+=h+9;
      }catch(imgErr){
        console.warn('EVIDENCIA PDF:',imgErr);
        doc.setFontSize(8);doc.text('No fue posible cargar '+ev.titulo.toLowerCase()+'.',20,y);y+=7;
      }
    }

    if(y>250){doc.addPage();y=20;}
    doc.setFont('helvetica','italic');doc.setFontSize(9);
    doc.text('Documento generado automáticamente por el Sistema de Control de Cajas.',20,y);
    const safe=(record.numero||'UNIDAD').replace(/[^a-z0-9_-]/gi,'_');
    const sufijo=record.fechaLiberacion?'_LIBERACION':'_FUERA_SERVICIO';
    doc.save(`Mantenimiento_${safe}${sufijo}_${String(record.fechaLiberacion||record.fechaSalida||'').slice(0,10)||iso(new Date())}.pdf`);

    ccAudit({
      operacionId:ccAuditId('EXP'),
      accion:'GENERAR_PDF_MANTENIMIENTO',
      modulo:'MANTENIMIENTO',
      submodulo:'PDF',
      idRegistro:record.id,
      idUnidad:x?.id||record.cajaId||'',
      numeroUnidad:x?.numero||record.numero||'',
      detalle:`PDF de mantenimiento generado · ${evidencias.length} evidencia(s)`
    });
  }catch(e){
    console.error(e);
    alert('Ocurrió un error al generar el PDF de mantenimiento.');
  }
};
window.ccGenerarPDFMantenimientoById=function(id){const r=configuracion.mantenimientoHistorial.find(z=>z.id===id);if(!r)return;const x=cajas.find(z=>z.id===r.cajaId)||r;ccGenerarPDFMantenimiento(r,x);};

window.ccRenderTarifas=function(){
 const el=document.getElementById('ccTarifasList');if(!el)return;
 el.innerHTML=clientes.length?clientes.map((c,i)=>{const t=Object.assign({diario:0,semanal:0,mensual:0},configuracion.tarifasRenta[c.id]||{});return `<tr><td>${i+1}</td><td><strong>${esc(c.nombre)}</strong></td><td><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"><label style="font-size:9px;color:#64748b">Diario<input type="number" min="0" step="0.01" data-tarifa-d="${c.id}" value="${Number(t.diario).toFixed(2)}" style="width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:7px"></label><label style="font-size:9px;color:#64748b">Semanal<input type="number" min="0" step="0.01" data-tarifa-s="${c.id}" value="${Number(t.semanal).toFixed(2)}" style="width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:7px"></label><label style="font-size:9px;color:#64748b">Mensual<input type="number" min="0" step="0.01" data-tarifa-m="${c.id}" value="${Number(t.mensual).toFixed(2)}" style="width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:7px"></label></div></td><td><span class="cc-badge ${c.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(c.estatus||'ACTIVO')}</span></td><td><button type="button" class="cc-btn cc-btn-primary" onclick="ccGuardarTarifa('${c.id}')">Guardar</button></td></tr>`}).join(''):'<tr><td colspan="5" style="padding:30px;text-align:center;color:#94a3b8">Primero registra clientes.</td></tr>';
};
window.ccGuardarTarifa=function(clienteId){
 const n=id=>Math.max(0,Number(document.querySelector(`[data-tarifa-${id}="${clienteId}"]`)?.value)||0);
 const anterior=JSON.parse(JSON.stringify(configuracion.tarifasRenta[clienteId]||{}));const nueva={diario:n('d'),semanal:n('s'),mensual:n('m')};configuracion.tarifasRenta[clienteId]=nueva;const cli=clientes.find(c=>c.id===clienteId);ccAudit({operacionId:ccAuditId('TAR'),accion:'ACTUALIZAR_TARIFA',modulo:'CONFIGURACION',submodulo:'TARIFAS',idRegistro:clienteId,idCliente:clienteId,cliente:cli?.nombre||'',datosAnteriores:anterior,datosNuevos:nueva,detalle:'Tarifa diaria/semanal/mensual actualizada'});save();ccRenderTarifas();
};
window.ccRenderProforma=function(){
const hoy=iso(new Date());const d=document.getElementById('ccProformaDesde'),h=document.getElementById('ccProformaHasta'),sel=document.getElementById('ccProformaCliente');
if(!d||!h||!sel)return;if(!d.value)d.value=hoy;if(!h.value)h.value=hoy;
const current=sel.value;sel.innerHTML='<option value="">Todos los clientes</option>'+clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('');sel.value=current;
ccCalcularProforma(false);
};
function ccDaysBetween(desde,hasta){const out=[];if(!desde||!hasta||desde>hasta)return out;let d=new Date(desde+'T12:00:00'),end=new Date(hasta+'T12:00:00');while(d<=end){out.push(iso(d));d.setDate(d.getDate()+1);}return out;}
window.ccCalcularProforma=function(showAlert=true){
  ccAudit({operacionId:ccAuditId('PRO'),accion:'CALCULAR_PROFORMA',modulo:'PROFORMA',submodulo:'CALCULO',detalle:'Se calculó proforma',datosNuevos:{desde:document.getElementById('ccProformaDesde')?.value||'',hasta:document.getElementById('ccProformaHasta')?.value||'',cliente:document.getElementById('ccProformaCliente')?.value||''}});
 const desde=document.getElementById('ccProformaDesde')?.value,hasta=document.getElementById('ccProformaHasta')?.value,clienteFiltro=document.getElementById('ccProformaCliente')?.value||'';
 if(!desde||!hasta||desde>hasta){if(showAlert)alert('Selecciona un rango de fechas válido.');return;}
 const ds=ccDaysBetween(desde,hasta),detalle=[];
 rentas.filter(r=>!clienteFiltro||r.clienteId===clienteFiltro).forEach(r=>{
   const c=clientes.find(x=>x.id===r.clienteId),u=cajas.find(x=>x.id===r.cajaId);if(!c||!u||r.estatus==='CANCELADA')return;
   let dias=0;ds.forEach(d=>{if(rentFor(r.id,d))dias++;});if(!dias)return;
   const metodo=r.metodoCobro||'DIARIO',t=Object.assign({diario:0,semanal:0,mensual:0},configuracion.tarifasRenta[r.clienteId]||{});
   const tarifa=Number(t[metodo.toLowerCase()]||r.totalTarifa||0);
   const periodos=metodo==='MENSUAL'?Math.ceil(dias/30):metodo==='SEMANAL'?Math.ceil(dias/7):dias;
   const importe=tarifa*periodos;
   detalle.push({rentaId:r.id,cliente:c.nombre,clienteId:c.id,unidad:u.numero||u.descripcion||'Sin unidad',tipo:u.tipoUnidadNombre||u.categoriaUnidad||'CAJA',responsable:responsables.find(x=>x.id===r.responsableId)?.nombre||'—',fechaInicio:r.fechaInicio||'',fechaFin:r.fechaFin||'',dias,metodo,tarifa,periodos,importe,observaciones:r.observaciones||''});
 });
 const byClient={};detalle.forEach(d=>{if(!byClient[d.clienteId])byClient[d.clienteId]={cliente:d.cliente,unidades:new Set(),dias:0,importe:0,detalle:[]};byClient[d.clienteId].unidades.add(d.unidad);byClient[d.clienteId].dias+=d.dias;byClient[d.clienteId].importe+=d.importe;byClient[d.clienteId].detalle.push(d);});
 const rows=Object.values(byClient).sort((a,b)=>b.importe-a.importe);
 const total=detalle.reduce((s,x)=>s+x.importe,0),totalDias=detalle.reduce((s,x)=>s+x.dias,0),unidadesCount=new Set(detalle.map(x=>x.unidad)).size;
 const body=document.getElementById('ccProformaBody');
 if(body)body.innerHTML=detalle.length?detalle.map((d,i)=>`<tr><td>${i+1}</td><td><strong>${esc(d.cliente)}</strong></td><td><strong>${esc(d.unidad)}</strong></td><td>${esc(d.tipo)}</td><td>${d.dias}</td><td><span class="cc-method">${esc(d.metodo)}</span></td><td class="cc-money">$${d.tarifa.toLocaleString('es-MX',{minimumFractionDigits:2})}</td><td>${d.periodos}</td><td class="cc-money">$${d.importe.toLocaleString('es-MX',{minimumFractionDigits:2})}</td></tr>`).join(''):'<tr><td colspan="9" style="padding:30px;text-align:center;color:#94a3b8">No hay rentas para el periodo seleccionado.</td></tr>';
 const foot=document.getElementById('ccProformaFoot');if(foot)foot.innerHTML=detalle.length?`<tr><td colspan="4">TOTAL GENERAL</td><td>${totalDias}</td><td colspan="3"></td><td class="cc-money">$${total.toLocaleString('es-MX',{minimumFractionDigits:2})}</td></tr>`:'';
 document.getElementById('ccProformaKpis').innerHTML=`<div class="cc-proforma-kpi"><small>Clientes</small><strong>${rows.length}</strong></div><div class="cc-proforma-kpi"><small>Unidades rentadas</small><strong>${unidadesCount}</strong></div><div class="cc-proforma-kpi"><small>Días rentados</small><strong>${totalDias}</strong></div><div class="cc-proforma-kpi"><small>TOTAL A COBRAR</small><strong>$${total.toLocaleString('es-MX',{minimumFractionDigits:2})}</strong></div>`;
 const summary=document.getElementById('ccProformaSummary');if(summary)summary.innerHTML=`<div class="cc-pro-summary-card"><div class="label">Total de la proforma</div><div class="value">$${total.toLocaleString('es-MX',{minimumFractionDigits:2})}</div><div class="sub">Importe total estimado del periodo</div></div><div class="cc-pro-summary-card light"><div class="label">Desglose por cliente</div><div style="margin-top:8px">${rows.length?rows.map(x=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #eef2f7"><span>${esc(x.cliente)}</span><b>$${x.importe.toLocaleString('es-MX',{minimumFractionDigits:2})}</b></div>`).join(''):'Sin datos'}</div></div><div class="cc-pro-summary-card light"><div class="label">Periodo</div><div class="value" style="font-size:20px">${desde} → ${hasta}</div><div class="sub">${detalle.length} movimientos de renta considerados</div></div>`;
 window.ccProformaData={desde,hasta,rows,detalle,totalDias,total,unidadesCount};if(showAlert&&typeof showStatus==='function')showStatus('Proforma calculada correctamente.','success');
};
window.ccGenerarPDFProforma=function(){
 if(!window.ccProformaData)ccCalcularProforma(false);const data=window.ccProformaData;if(!data){alert('Primero calcula la proforma.');return;}
 try{const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'letter'});const emision=new Date().toLocaleDateString('es-MX');
 doc.setFillColor(15,23,42);doc.rect(0,0,280,24,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('PROFORMA DE RENTA DE UNIDADES',14,11);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text(`Periodo: ${data.desde} al ${data.hasta} | Emisión: ${emision}`,14,18);
 doc.setTextColor(15,23,42);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(`Clientes: ${data.rows.length} | Unidades: ${data.unidadesCount} | Días rentados: ${data.totalDias} | TOTAL A COBRAR: $${data.total.toLocaleString('es-MX',{minimumFractionDigits:2})}`,14,32);
 const rows=[];data.detalle.forEach((x,i)=>rows.push([i+1,x.cliente,x.unidad,x.tipo,x.responsable,x.dias,x.metodo,`$${x.tarifa.toLocaleString('es-MX',{minimumFractionDigits:2})}`,x.periodos,`$${x.importe.toLocaleString('es-MX',{minimumFractionDigits:2})}`]));
 doc.autoTable({startY:38,head:[['#','CLIENTE','UNIDAD RENTADA','TIPO','RESPONSABLE','DÍAS','COBRO','TARIFA','PERIODOS','IMPORTE']],body:rows,theme:'striped',styles:{fontSize:7,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:[30,64,175],textColor:255,fontStyle:'bold',halign:'center'},margin:{left:8,right:8,top:38,bottom:12},didDrawPage:function(){const hh=doc.internal.pageSize.getHeight();doc.setFontSize(7);doc.setTextColor(100,116,139);doc.text('Proforma de renta — Tráfico App',8,hh-6);doc.text(`Página ${doc.internal.getNumberOfPages()}`,250,hh-6);}});
 doc.save(`Proforma_Renta_Unidades_${data.desde}_${data.hasta}.pdf`);
 }catch(e){console.error(e);alert('No fue posible generar el PDF de la proforma.');}
};
async function ccReloadFromDatabase(){
 if(!ccSupabaseReady())return {ok:false,error:'SUPABASE_NO_CONFIGURADO'};
 try{
   const {data,error}=await gmSupabase.rpc('cc_load_all');
   if(error)throw error;
   ccRevision=Number(data?.revision||0);
   ccNormalizeState(data?.state||{});
   ccCloudReady=true;
   ccRenderAll();
   return {ok:true,revision:ccRevision};
 }catch(e){
   console.error('ERROR RECARGANDO SUPABASE:',e);
   ccCloudReady=false;
   showStatus?.('ERROR LEYENDO SUPABASE · '+(e.message||e),'error');
   return {ok:false,error:e.message||String(e)};
 }
}
window.ccReloadFromDatabase=ccReloadFromDatabase;


const ccSectionCache={};
function ccSectionCacheFresh(key,ms=5000){
  const t=ccSectionCache[key]||0;
  return (Date.now()-t)<ms;
}
function ccMarkSectionFresh(key){ccSectionCache[key]=Date.now();}
window.ccRefreshVisible=async function(){
  const btn=document.getElementById('ccRefreshVisibleBtn');
  const active=document.querySelector('#controlCajasSection .cc-panel.active');
  const sectionName=active?.id?.replace('ccPanel','')||'Dashboard';
  if(ccSectionCacheFresh('refresh_'+sectionName,1200)) return;

  try{
    if(btn){
      btn.disabled=true;
      btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i>Actualizando...';
    }
    showStatus?.('Actualizando '+sectionName+' desde Supabase...','info');

    const {data,error}=await gmSupabase.rpc('cc_load_all');
    if(error)throw error;
    if(data?.ok===false)throw new Error(data?.error||'No se pudo actualizar la información');

    ccRevision=Number(data?.revision||ccRevision);
    ccNormalizeState(data?.state||{});

    // Renderiza únicamente lo visible.
    if(active?.id==='ccPanelDashboard') ccRenderDashboard();
    else if(active?.id==='ccPanelInventario') ccRenderInventario();
    else if(active?.id==='ccPanelRenta') ccRenderRenta();
    else if(active?.id==='ccPanelHistorial') ccRenderHistorial();
    else if(active?.id==='ccPanelMantenimiento') ccRenderMantenimiento();
    else if(active?.id==='ccPanelConfiguracion') ccRenderConfiguracion();
    else if(active?.id==='ccPanelProforma' && typeof ccRenderProforma==='function') ccRenderProforma();
    else ccRenderAll();

    ccMarkSectionFresh('refresh_'+sectionName);showStatus?.('ACTUALIZADO · '+sectionName+' · revisión '+ccRevision,'success');
  }catch(err){
    console.error('REFRESH VISIBLE:',err);
    showStatus?.('ERROR AL ACTUALIZAR · '+(err.message||err),'error');
    alert('No se pudo actualizar la información.\n\n'+(err.message||err));
  }finally{
    if(btn){
      btn.disabled=false;
      btn.innerHTML='<i class="fa-solid fa-rotate mr-1"></i>Refresh';
    }
  }
};

function ccRenderAll(){
  try{ if(typeof ccRenderTipoButtons==='function') ccRenderTipoButtons(); }catch(_){}
  const active=document.querySelector('#controlCajasSection .cc-panel.active');
  const id=active?.id||'ccPanelDashboard';
  if(id==='ccPanelDashboard') return ccRenderDashboard();
  if(id==='ccPanelInventario') return ccRenderInventario();
  if(id==='ccPanelRenta') return ccRenderRenta();
  if(id==='ccPanelHistorial') return ccRenderHistorial();
  if(id==='ccPanelMantenimiento'){ccMostrarMantenimientoHistorial();return ccRenderMantenimiento();}
  if(id==='ccPanelMapa') return ccCargarMapaUnidades();
  if(id==='ccPanelConfiguracion'){ccRenderConfiguracion();return;}
  if(id==='ccPanelProforma' && typeof ccRenderProforma==='function') return ccRenderProforma();
  ccRenderDashboard();
}
window.ccRenderAll=ccRenderAll;
async function ccInitCloud(){
  if(window.CC_AUTH_REQUIRED&&!window.CC_AUTH_READY)return;
  ccNormalizeState({});
  if(!ccSupabaseReady()){ccRenderAll();showStatus?.('Falta configurar Supabase.','error');return;}
  try{
    const r=await ccTestConnection();
    if(!r.ok)throw new Error(r.error||'No se pudo leer Supabase');
    ccRevision=Number(r.revision||0);
    ccNormalizeState(r.state||{});
    ccRenderAll();
    showStatus?.('Supabase conectado · Base PostgreSQL lista · revisión '+ccRevision,'success');
  }catch(e){
    console.error(e);
    ccRenderAll();
    showStatus?.('No se pudo conectar a Supabase: '+(e.message||e),'error');
  }
}
window.ccInitCloud=ccInitCloud;
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ccInitCloud();},60));
})();
