/* Tráfico App Profesional · Clientes y divisiones v2 · catálogo único + validación global */
(function(){
  if(window.__ccClientesDivV2)return; window.__ccClientesDivV2=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  let D={clientes:[],divisiones:[]};
  const active=x=>String(x?.estatus||'ACTIVO').toUpperCase()==='ACTIVO';
  const canEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));
  async function rpc(n,a){if(!sb()||typeof sb().rpc!=='function')throw new Error('Supabase no disponible');const r=await sb().rpc(n,a||{});if(r.error)throw r.error;return r.data}
  async function load(){D=await rpc('cc_client_catalogs');normalizeConfig();refreshClientFields();return D}
  function panel(){return document.getElementById('ccPanelConfiguracion')}
  function nav(){const p=panel();return p?.querySelector('.cc-config-nav')||p?.querySelector('.cc-config-sidebar')||p?.querySelector('.cc-config-menu')||p?.querySelector('.cc-config-nav-btn')?.parentElement}
  function normalizeConfig(){
    const p=panel(),n=nav(); if(!p||!n)return;
    const buttons=[...n.querySelectorAll('button,a')].filter(x=>(x.textContent||'').trim().toLowerCase()==='clientes');
    let master=n.querySelector('[data-clientes-nav]')||buttons[buttons.length-1];
    buttons.forEach(b=>{if(b!==master)b.style.display='none'});
    if(master){master.style.display='';master.textContent='Clientes';master.dataset.clientesNav='1';master.onclick=()=>{window.ccConfigSection?.('clientes',master);setTimeout(()=>window.ccClientesDivReload?.(),10)}}
    [...p.querySelectorAll('.cc-config-section')].forEach(sec=>{
      if(sec.id==='ccConfigClientes')return;
      const title=(sec.querySelector('strong,h2,h3,h4')?.textContent||'').trim().toLowerCase();
      if(title==='clientes'||title.startsWith('clientes '))sec.style.display='none';
    });
  }
  function clientFromField(el){
    const raw=String(el.value||'').trim();
    let c=(D.clientes||[]).find(x=>x.id===raw);
    if(c)return c;
    const txt=el.tagName==='SELECT'?(el.options[el.selectedIndex]?.text||raw):raw;
    return (D.clientes||[]).find(x=>String(x.nombre||'').trim().toUpperCase()===String(txt).trim().toUpperCase());
  }
  function isClientField(el){
    if(!el||!el.matches?.('select,input'))return false;
    if(el.closest('#ccConfigClientes'))return false;
    if(el.classList.contains('cc-client-division-select'))return false;
    const s=((el.name||'')+' '+(el.id||'')+' '+(el.placeholder||'')+' '+(el.getAttribute('aria-label')||'')).toLowerCase();
    const lab=el.closest('.cc-field')?.querySelector('label')?.textContent?.toLowerCase()||'';
    return /cliente/.test(s)||/^cliente\b/.test(lab);
  }
  function ensureDivisionField(el){
    let wrap=el.closest('.cc-field')?.nextElementSibling;
    if(!wrap?.classList?.contains('cc-client-division-field')){
      wrap=document.createElement('div');wrap.className='cc-field cc-client-division-field';wrap.style.display='none';
      wrap.innerHTML='<label>División / sucursal</label><select class="cc-client-division-select" name="clienteDivisionId"><option value="">Seleccionar división…</option></select><input type="hidden" name="divisionId"><input type="hidden" name="clienteDivision">';
      (el.closest('.cc-field')||el).insertAdjacentElement('afterend',wrap);
    }
    return wrap;
  }
  function populateClientField(el){
    if(el.tagName==='SELECT'){
      const old=String(el.value||'');
      const oldClient=(D.clientes||[]).find(c=>c.id===old);
      const placeholder=el.options[0]?.value===''?el.options[0].outerHTML:'<option value="">Seleccionar cliente…</option>';
      el.innerHTML=placeholder+(D.clientes||[]).filter(active).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre)+'</option>').join('');
      if(oldClient&&active(oldClient))el.value=old; else el.value='';
    }else{
      let dl=document.getElementById('ccClientesDatalist'); if(!dl){dl=document.createElement('datalist');dl.id='ccClientesDatalist';document.body.appendChild(dl)}
      dl.innerHTML=(D.clientes||[]).filter(active).map(c=>'<option value="'+esc(c.nombre)+'"></option>').join('');
      el.setAttribute('list','ccClientesDatalist');
      const c=clientFromField(el); if(c&&!active(c))el.value='';
    }
  }
  function wireField(el){
    populateClientField(el);
    const wrap=ensureDivisionField(el),sel=wrap.querySelector('select');
    const sync=()=>{
      const c=clientFromField(el);
      if(c&&!active(c)){el.value='';wrap.style.display='none';sel.required=false;sel.value='';return}
      const ds=c?(D.divisiones||[]).filter(d=>d.clienteId===c.id&&active(d)):[];
      if(c?.tieneDivisiones){wrap.style.display='';sel.innerHTML='<option value="">Seleccionar división…</option>'+ds.map(d=>'<option value="'+esc(d.id)+'">'+esc(d.nombre)+'</option>').join('');sel.required=true}
      else{wrap.style.display='none';sel.required=false;sel.value=''}
      const d=(D.divisiones||[]).find(x=>x.id===sel.value&&active(x));
      wrap.querySelector('[name=divisionId]').value=d?.id||'';
      wrap.querySelector('[name=clienteDivision]').value=d?.nombre||'';
    };
    if(el.dataset.ccClientV2!=='1'){
      el.dataset.ccClientV2='1';el.addEventListener('change',sync);el.addEventListener('input',()=>{if(el.tagName==='INPUT')sync()});
      sel.addEventListener('change',()=>{const d=(D.divisiones||[]).find(x=>x.id===sel.value&&active(x));wrap.querySelector('[name=divisionId]').value=d?.id||'';wrap.querySelector('[name=clienteDivision]').value=d?.nombre||''});
    }
    sync();
  }
  function refreshClientFields(){document.querySelectorAll('form select,form input').forEach(el=>{if(isClientField(el))wireField(el)})}
  function validateForm(form){
    for(const el of form.querySelectorAll('select,input')){
      if(!isClientField(el))continue;
      const raw=String(el.value||'').trim(); if(!raw)continue;
      const c=clientFromField(el);
      if(!c||!active(c)){el.setCustomValidity('Selecciona un cliente activo del catálogo.');el.reportValidity();setTimeout(()=>el.setCustomValidity(''),50);return false}
      const wrap=el.closest('.cc-field')?.nextElementSibling;
      if(c.tieneDivisiones&&wrap?.classList.contains('cc-client-division-field')){
        const div=wrap.querySelector('select')?.value; const d=(D.divisiones||[]).find(x=>x.id===div);
        if(!d||!active(d)||d.clienteId!==c.id){wrap.querySelector('select')?.setCustomValidity('Selecciona una división/sucursal activa.');wrap.querySelector('select')?.reportValidity();setTimeout(()=>wrap.querySelector('select')?.setCustomValidity(''),50);return false}
      }
    }
    return true;
  }
  document.addEventListener('submit',ev=>{if(!validateForm(ev.target)){ev.preventDefault();ev.stopImmediatePropagation()}},true);
  window.ccClientesDivReload=async()=>{try{await load()}catch(e){console.warn('[Clientes v2]',e)}};
  async function boot(){if(!window.CC_AUTH_READY||!sb())return setTimeout(boot,400);try{await load()}catch(e){console.warn('[Clientes v2]',e)}const root=document.getElementById('controlCajasSection')||document.body;new MutationObserver(()=>{normalizeConfig();refreshClientFields()}).observe(root,{childList:true,subtree:true});setInterval(()=>{normalizeConfig();refreshClientFields()},2500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1800));else setTimeout(boot,1800);
})();