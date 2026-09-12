/* Tráfico App Profesional · Control de Hojas · búsqueda en hojas activas v10.3 */
(function(){
  if(window.__hsControlV103Search)return;window.__hsControlV103Search=true;
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  let observer=null;

  function applyFilter(){
    const input=document.getElementById('hsV103SearchActive');
    const body=document.getElementById('hsOpBody');
    if(!input||!body)return;
    const q=norm(input.value);
    [...body.querySelectorAll('tr')].forEach(tr=>{
      if(!tr.querySelector('td'))return;
      const txt=norm(tr.textContent);
      tr.style.display=!q||txt.includes(q)?'':'none';
    });
  }

  function ensure(){
    const view=document.getElementById('hsViewOperadores');
    if(!view)return false;
    const toolbar=view.querySelector('.cc-toolbar');
    if(!toolbar)return false;
    let wrap=document.getElementById('hsV103SearchWrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='hsV103SearchWrap';
      wrap.style='display:flex;align-items:center;gap:7px;min-width:min(360px,100%);';
      wrap.innerHTML='<label for="hsV103SearchActive" style="font-size:10px;font-weight:900;color:#475569;white-space:nowrap">Buscar</label><input id="hsV103SearchActive" class="cc-input" type="search" autocomplete="off" placeholder="Escribe nombre del operador..." style="min-width:230px">';
      const typeBox=document.getElementById('hsV102TipoEntregas')?.parentElement;
      if(typeBox?.parentElement===toolbar) typeBox.after(wrap); else toolbar.insertBefore(wrap,toolbar.querySelector('[data-op]')||null);
      wrap.querySelector('input').addEventListener('input',applyFilter);
      document.getElementById('hsV102TipoEntregas')?.addEventListener('change',()=>{
        const t=document.getElementById('hsV102TipoEntregas')?.value||'OPERADOR';
        const inp=document.getElementById('hsV103SearchActive');
        if(inp){inp.value='';inp.placeholder=t==='BENEFICIARIO'?'Escribe nombre del beneficiario...':'Escribe nombre del operador...';}
        setTimeout(applyFilter,40);
      });
    }
    const body=document.getElementById('hsOpBody');
    if(body&&!observer){
      observer=new MutationObserver(()=>applyFilter());
      observer.observe(body,{childList:true,subtree:true});
    }
    applyFilter();
    return true;
  }

  function install(){
    let n=0;const t=setInterval(()=>{n++;if(ensure()||n>60)clearInterval(t)},250);
    document.addEventListener('click',e=>{if(e.target.closest?.('#ccTabHojasServicio,#ccPanelHojasServicio [data-hsv="Operadores"]'))setTimeout(ensure,250)},true);
    document.addEventListener('hs:comprobacion-actualizada',()=>setTimeout(ensure,250));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
