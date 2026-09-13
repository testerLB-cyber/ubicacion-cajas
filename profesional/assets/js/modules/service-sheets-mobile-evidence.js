(function(){
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let busy=false,lastKey='';
  async function signed(path){const {data,error}=await sb().storage.from('app-hojas-servicio').createSignedUrl(path,900);if(error)throw error;return data.signedUrl;}
  async function openPhoto(path){try{window.open(await signed(path),'_blank','noopener');}catch(e){alert(e.message||String(e));}}
  async function render(){
    const panel=document.getElementById('ccPanelHojasServicio');
    if(!panel||!window.CC_AUTH_READY||busy||!sb())return;
    busy=true;
    try{
      const {data,error}=await sb().rpc('hs_mobile_evidence_list');
      if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudieron cargar evidencias');
      const rows=data.evidencias||[];
      const key=JSON.stringify(rows.map(x=>[x.folioId,x.createdAt]));
      if(key===lastKey&&document.getElementById('hsMobileEvidenceBox'))return;
      lastKey=key;
      document.getElementById('hsMobileEvidenceBox')?.remove();
      const box=document.createElement('div');box.id='hsMobileEvidenceBox';box.className='hs104-card';box.style.margin='12px 0';
      box.innerHTML='<div class="cc-toolbar"><div><strong>Evidencias recibidas desde app móvil</strong><div class="hs104-note">La evidencia no comprueba la hoja; continúa pendiente hasta la comprobación administrativa.</div></div><span class="hs104-pill hs104-danger">'+rows.length+' evidencia(s)</span></div>'+
        '<div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>OPERADOR</th><th>CLIENTE</th><th>TIPO VIAJE</th><th>CLASIFICACIÓN</th><th>ESTATUS</th><th>EVIDENCIA</th></tr></thead><tbody>'+
        (rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.operador||'—')+'</td><td>'+esc(x.cliente||'—')+'</td><td>'+esc(x.tipoViaje||'—')+'</td><td>'+esc(x.clasificacion||'—')+'</td><td><span class="hs104-pill hs104-danger">PENDIENTE DE COMPROBAR</span></td><td><button class="cc-btn cc-btn-light" data-photo="'+esc(x.fotoPath)+'"><i class="fa-solid fa-camera"></i> Ver foto</button></td></tr>').join(''):'<tr><td colspan="7" style="padding:18px;text-align:center;color:#64748b">Sin evidencias móviles.</td></tr>')+
        '</tbody></table></div>';
      const view=document.getElementById('hs104View'); if(view) view.insertAdjacentElement('beforebegin',box); else panel.appendChild(box);
      box.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>openPhoto(b.dataset.photo));
    }catch(e){console.warn('EVIDENCIAS MOVILES HS',e);}finally{busy=false;}
  }
  const obs=new MutationObserver(()=>setTimeout(render,80));
  document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{childList:true,subtree:true});setInterval(render,5000);setTimeout(render,1800);});
  window.hsRefreshMobileEvidence=render;
})();