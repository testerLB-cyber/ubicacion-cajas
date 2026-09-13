/* Tráfico App · completa catálogo de tipos en edición de precaptura móvil */
(function(){
  'use strict';
  if(window.__ANT_MOBILE_CATALOG_FIX__)return;window.__ANT_MOBILE_CATALOG_FIX__=true;
  const sb=()=>window.gmSupabase,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-edit]');if(!b||!b.closest('[data-ant-mobile-section]'))return;
    const preId=b.dataset.edit,section=b.closest('[data-ant-mobile-section]'),modal=document.getElementById('ccProfCompModal');
    const title=modal?.querySelector('strong')?.textContent||'',folio=title.split('·').pop()?.trim();
    setTimeout(async()=>{try{
      const edit=document.getElementById('ant-mobile-edit-modal'),sel=edit?.querySelector('select[name="tipoComprobanteId"]');if(!sel)return;
      const all=await sb().rpc('cc_ant_list');if(all.error)throw all.error;const ant=(all.data?.anticipos||[]).find(x=>String(x.folio||'').trim()===folio);if(!ant)return;
      const r=await sb().rpc('cc_ant_mobile_precaptures',{p_anticipo_id:ant.id});if(r.error)throw r.error;const p=(r.data?.rows||[]).find(x=>x.id===preId),types=r.data?.tiposComprobante||[];
      sel.innerHTML='<option value="">Seleccionar…</option>'+types.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(p?.tipoComprobanteId)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('');
    }catch(err){console.warn('ANT MOBILE CATALOG FIX',err)}},80);
  },true);
})();