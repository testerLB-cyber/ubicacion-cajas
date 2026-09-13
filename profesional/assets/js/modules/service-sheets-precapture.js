(function(){
  'use strict';
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let DATA=null,busy=false,lastLoad=0;
  async function loadData(force=false){
    if(!sb()) return null;
    const now=Date.now();
    if(DATA&&!force&&now-lastLoad<4000) return DATA;
    if(busy) return DATA;
    busy=true;
    try{
      const {data,error}=await sb().rpc('hs_list');
      if(error||!data?.ok) throw new Error(error?.message||data?.error||'No se pudo cargar precaptura');
      DATA=data;lastLoad=Date.now();return DATA;
    }catch(e){console.warn('HS PRECAPTURA',e);return DATA}
    finally{busy=false}
  }
  function makeOptions(xs,selected,label='Seleccionar…'){
    return '<option value="">'+label+'</option>'+(xs||[]).map(x=>'<option value="'+esc(x.nombre)+'" data-id="'+esc(x.id)+'" '+(String(x.nombre)===String(selected)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('');
  }
  async function openPhoto(path){
    try{
      const {data,error}=await sb().storage.from('app-hojas-servicio').createSignedUrl(path,900);
      if(error) throw error;
      window.open(data.signedUrl,'_blank','noopener');
    }catch(e){alert(e.message||String(e));}
  }
  function patchRow(row,d){
    if(row.dataset.precapturePatched==='1') return;
    const folioId=row.dataset.row,folio=(d.foliosAsignadosOperador||[]).find(x=>String(x.id)===String(folioId));
    if(!folio) return;
    const pre=folio.precaptura||null;
    const tipoInput=row.querySelector('[data-tipo]'),clasInput=row.querySelector('[data-clas]'),cliente=row.querySelector('[data-cliente]'),obs=row.querySelector('[data-obs]');
    if(!tipoInput||!clasInput||!cliente) return;
    const tipoSel=document.createElement('select');tipoSel.dataset.tipo='';tipoSel.innerHTML=makeOptions(d.tiposViaje||[],pre?.tipoViaje||'','Seleccionar tipo de viaje…');tipoInput.replaceWith(tipoSel);
    const clasSel=document.createElement('select');clasSel.dataset.clas='';clasInput.replaceWith(clasSel);
    const fillClas=()=>{
      const op=tipoSel.selectedOptions[0],tipoId=op?.dataset.id||'';
      const xs=(d.clasificaciones||[]).filter(x=>String(x.tipoViajeId||'')===String(tipoId));
      const keep=(pre&&String(pre.tipoViaje||'')===String(tipoSel.value))?pre.clasificacion:'';
      clasSel.innerHTML=makeOptions(xs,keep,'Seleccionar clasificación…');
    };
    tipoSel.onchange=()=>{fillClas();};fillClas();
    if(pre){
      cliente.value=pre.clienteId||'';
      if(obs&&!String(obs.value||'').trim()&&pre.dondeUtilizado) obs.value='Dónde se utilizó: '+pre.dondeUtilizado;
      const toolbar=row.querySelector('.cc-toolbar');
      const pill=toolbar?.querySelector('.hs104-pill');
      if(pill){pill.textContent='PRECARGADA APP';pill.classList.remove('hs104-danger');pill.classList.add('hs104-ok');}
      const note=document.createElement('div');note.className='hs104-note';note.style.marginTop='10px';
      note.innerHTML='<strong>Precarga móvil:</strong> '+esc(pre.cliente||'—')+' · '+esc(pre.tipoViaje||'—')+' · '+esc(pre.clasificacion||'—')+(pre.dondeUtilizado?' · '+esc(pre.dondeUtilizado):'')+(pre.fotoPath?' <button type="button" class="cc-btn cc-btn-light" data-mobile-photo style="margin-left:6px"><i class="fa-solid fa-camera"></i> Ver foto</button>':'');
      row.querySelector('.hs104-actions')?.insertAdjacentElement('beforebegin',note);
      note.querySelector('[data-mobile-photo]')?.addEventListener('click',()=>openPhoto(pre.fotoPath));
    }
    row.dataset.precapturePatched='1';
  }
  async function patch(){
    const root=document.getElementById('hs104CompList');if(!root)return;
    const rows=[...root.querySelectorAll('[data-row]')];if(!rows.length)return;
    const d=await loadData();if(!d)return;
    rows.forEach(r=>patchRow(r,d));
  }
  const obs=new MutationObserver(()=>setTimeout(patch,60));
  document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{childList:true,subtree:true});setInterval(()=>{DATA=null;patch();},5000);setTimeout(patch,1200);});
})();
