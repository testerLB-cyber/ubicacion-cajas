/* Utilería sin caja v1 - independiente del flujo de comprobaciones */
(function(){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let rows=[];
  async function sb(){ return window.supabaseClient||window.ccSupabase||window.supabase; }
  async function signed(path){ if(!path)return ''; const c=await sb(); try{const r=await c.storage.from('app-hojas-servicio').createSignedUrl(path,3600);return r?.data?.signedUrl||''}catch(e){return ''} }
  async function load(){
    const c=await sb(); if(!c?.rpc){ alert('Supabase no disponible'); return; }
    const body=$('#uscBody'); if(body) body.innerHTML='<tr><td colspan="7" style="padding:24px;text-align:center">Cargando pendientes…</td></tr>';
    const {data,error}=await c.rpc('hs_utileria_sin_caja_list');
    if(error){ console.error(error); if(body)body.innerHTML='<tr><td colspan="7" style="padding:24px;text-align:center;color:#b91c1c">No fue posible cargar la utilería.</td></tr>'; return; }
    rows=data||[]; $('#uscCount').textContent=rows.length+' pendientes';
    const enriched=await Promise.all(rows.map(async r=>({...r,_img:await signed(r.foto_path)})));
    body.innerHTML=enriched.map(r=>`<tr data-id="${esc(r.comprobacion_id)}"><td><b>${esc(r.folio)}</b></td><td>${esc(r.cliente_nombre)}</td><td>${esc(r.operador_nombre)}</td><td><b>${esc(r.unidad_numero)}</b></td><td class="usc-evi">${r._img?`<img src="${esc(r._img)}" alt="Evidencia ${esc(r.folio)}" onclick="window.uscZoom(this.src)">`:'<span>Sin foto</span>'}</td><td><input class="usc-rem" placeholder="Ej. LB51" autocomplete="off"></td><td><button class="usc-save" onclick="window.uscSave('${esc(r.comprobacion_id)}',this)"><i class="fa-solid fa-floppy-disk"></i> Guardar</button></td></tr>`).join('')||'<tr><td colspan="7" style="padding:28px;text-align:center">No hay tractocamiones pendientes de remolque.</td></tr>';
  }
  window.uscSave=async(id,btn)=>{const tr=btn.closest('tr'),input=tr.querySelector('.usc-rem'),v=input.value.trim().toUpperCase(); if(!v){input.focus();return} btn.disabled=true;btn.textContent='Guardando…'; const c=await sb(); const {error}=await c.rpc('hs_utileria_sin_caja_set_remolque',{p_comprobacion_id:id,p_remolque_numero:v}); if(error){console.error(error);alert(error.message||'No se pudo guardar');btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar';return} tr.remove(); rows=rows.filter(x=>String(x.comprobacion_id)!==String(id)); $('#uscCount').textContent=rows.length+' pendientes';};
  window.uscZoom=src=>{let m=$('#uscZoom');if(!m){m=document.createElement('div');m.id='uscZoom';m.innerHTML='<button aria-label="Cerrar">×</button><img>';m.onclick=e=>{if(e.target===m||e.target.tagName==='BUTTON')m.classList.remove('open')};document.body.appendChild(m)}m.querySelector('img').src=src;m.classList.add('open')};
  function mount(){
    if($('#uscPanel'))return;
    const host=$('#controlCajasSection')||document.querySelector('main'); if(!host)return;
    const sec=document.createElement('section');sec.id='uscPanel';sec.className='usc-panel';sec.innerHTML=`<div class="usc-head"><div><h2><i class="fa-solid fa-trailer"></i> Utilería sin caja</h2><p>Comprobaciones de TRACTO-CAMIÓN ya realizadas que quedaron sin remolque. Esta utilería solo completa el remolque pendiente.</p></div><div><span id="uscCount">—</span><button onclick="window.uscLoad()"><i class="fa-solid fa-rotate"></i> Actualizar</button></div></div><div class="usc-table"><table><thead><tr><th>Hoja</th><th>Cliente</th><th>Operador</th><th>Unidad</th><th>Evidencia</th><th>Remolque</th><th></th></tr></thead><tbody id="uscBody"></tbody></table></div>`;host.appendChild(sec);window.uscLoad=load;load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();