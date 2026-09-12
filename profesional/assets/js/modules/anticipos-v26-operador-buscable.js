/* Tráfico App Profesional · Anticipos v26 · Operador buscable validado */
(function(){
  if(window.__ccAntOperadorBuscableV26)return;window.__ccAntOperadorBuscableV26=true;
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  function enhance(){
    const form=document.getElementById('ccAntOpFormV10');if(!form||form.dataset.opSearchV26==='1')return false;
    const sel=form.querySelector('select[name="operadorId"]');if(!sel)return false;
    form.dataset.opSearchV26='1';
    const field=sel.closest('.cc-field');if(!field)return false;
    const options=[...sel.options].filter(o=>o.value).map(o=>({id:o.value,label:(o.textContent||'').trim()}));
    sel.style.display='none';sel.removeAttribute('required');
    const wrap=document.createElement('div');wrap.style='position:relative';
    const input=document.createElement('input');input.type='text';input.autocomplete='off';input.placeholder='Escribe nombre o número de empleado…';input.setAttribute('aria-label','Buscar operador');
    const list=document.createElement('div');list.style='display:none;position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:20;max-height:220px;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:9px;box-shadow:0 12px 30px rgba(15,23,42,.18)';
    const msg=document.createElement('div');msg.style='font-size:10px;margin-top:4px;color:#64748b';msg.textContent='Busca por nombre o número y selecciona una coincidencia del catálogo.';
    wrap.append(input,list);sel.after(wrap,msg);
    let validId='';
    function setValid(o){validId=o?.id||'';sel.value=validId;input.value=o?.label||'';list.style.display='none';input.style.borderColor='';msg.style.color='#166534';msg.textContent=o?'Operador válido seleccionado.':'Busca por nombre o número y selecciona una coincidencia del catálogo.';}
    function render(){
      const q=norm(input.value);validId='';sel.value='';msg.style.color='#64748b';msg.textContent='Selecciona una coincidencia válida del catálogo.';
      const xs=options.filter(o=>!q||norm(o.label).includes(q)).slice(0,20);
      list.innerHTML=xs.length?xs.map(o=>'<button type="button" data-id="'+String(o.id).replace(/"/g,'&quot;')+'" style="display:block;width:100%;border:0;background:#fff;text-align:left;padding:9px 10px;font-size:11px;cursor:pointer;border-bottom:1px solid #f1f5f9">'+String(o.label).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</button>').join(''):'<div style="padding:10px;font-size:11px;color:#991b1b">Sin coincidencias.</div>';
      list.style.display='block';
      list.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>setValid(options.find(o=>o.id===b.dataset.id)));
    }
    input.addEventListener('input',render);input.addEventListener('focus',render);
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))list.style.display='none'});
    form.addEventListener('submit',e=>{
      if(!validId||sel.value!==validId){e.preventDefault();e.stopImmediatePropagation();input.style.borderColor='#dc2626';msg.style.color='#b91c1c';msg.textContent='Selecciona un operador válido de la lista antes de guardar.';input.focus();render();alert('Selecciona un operador válido del catálogo.');}
    },true);
  }
  const obs=new MutationObserver(()=>enhance());
  function boot(){enhance();obs.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',()=>setTimeout(enhance,80),true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
