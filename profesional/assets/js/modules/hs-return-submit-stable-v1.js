/* Tráfico App · Retornar hojas · envío independiente y estable.
   Intercepta la confirmación del modal de retorno para no depender del estado
   interno de __assignSet ni de las propiedades nativas del formulario. */
(()=>{
 'use strict';
 if(window.__HS_RETURN_STABLE_V1__)return;
 window.__HS_RETURN_STABLE_V1__=true;
 const pick=(form,name)=>form.querySelector('[name="'+name+'"]')?.value||'';
 const normalize=input=>{
  let digits=String(input??'').trim().replace(/^(M|CFDI|SPF|N)-\d{4}-/i,'').replace(/\D/g,'');
  if(digits.length===6&&digits.startsWith('0'))digits=digits.slice(1);
  if(!/^\d{5}$/.test(digits))throw Error('Folio inválido: '+input+'. Captura cinco dígitos.');
  return Number(digits);
 };
 function build(form){
  const modo=String(pick(form,'modo')).toUpperCase();
  const item={modo,serieId:pick(form,'serieId'),anioId:pick(form,'anioId'),responsableId:pick(form,'responsableId')};
  if(modo==='RANGO'){
   item.desde=normalize(pick(form,'desde'));item.hasta=normalize(pick(form,'hasta'));
   if(item.hasta<item.desde)throw Error('Hasta no puede ser menor que Desde.');
  }else if(modo==='INDIVIDUAL'){
   item.individual=normalize(pick(form,'individual'));
  }else if(modo==='VARIOS'){
   const chips=[...form.querySelectorAll('[data-assign-chips] [data-assign-chip]')].map(el=>el.getAttribute('data-assign-chip'));
   let saved=[];try{const v=JSON.parse(pick(form,'foliosSeleccionados')||'[]');if(Array.isArray(v))saved=v}catch(_){}
   const pending=String(pick(form,'varios')).split(/[\s,;]+/).filter(Boolean);
   const picked=[...chips,...saved,...(form.__assignSet||[]),...pending].filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='');
   item.folios=[...new Set(picked.map(normalize))];
   if(!item.folios.length)throw Error('No hay folios en la selección. Captura las hojas antes de retornar.');
  }else throw Error('Selecciona una forma de retorno.');
  if(!item.serieId||!item.anioId||!item.responsableId)throw Error('Selecciona serie, año y responsable.');
  return item;
 }
 document.addEventListener('submit',async e=>{
  const form=e.target;
  if(!(form instanceof HTMLFormElement))return;
  const overlay=form.closest('.hs104-modal');
  if(!overlay||!overlay.querySelector('strong')?.textContent?.includes('Retornar hojas del responsable'))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if(form.dataset.hsReturning==='1')return;
  const button=form.querySelector('[type="submit"]');
  try{
   const item=build(form);
   form.dataset.hsReturning='1';if(button)button.disabled=true;
   const supabase=window.gmSupabase;if(!supabase)throw Error('No hay conexión con Supabase.');
   const check=await supabase.rpc('hs_validate_responsible_return_selection',{p_item:item});
   if(check.error)throw check.error;
   if(!check.data?.available){
    const details=(check.data?.conflicts||[]).map(x=>x.consecutivo+' ['+x.estatus+'] '+(x.motivo||'')).join(', ');
    throw Error('Las hojas no se pueden retornar: '+details);
   }
   const total=Number(check.data?.total||0);
   if(!confirm('¿Retornar '+total+' hoja(s) de '+(check.data?.responsable||'este responsable')+' a NUEVO, sin responsable?'))return;
   const result=await supabase.rpc('hs_return_responsible_selection',{p_item:item});
   if(result.error)throw result.error;
   if(!result.data?.ok)throw Error('No se pudo completar el retorno.');
   alert('Hojas retornadas: '+result.data.retornadas+'\nEstatus: NUEVO');
   overlay.remove();
   location.reload();
  }catch(error){
   alert(error?.message||String(error));
  }finally{
   delete form.dataset.hsReturning;
   if(button)button.disabled=false;
  }
 },true);
})();