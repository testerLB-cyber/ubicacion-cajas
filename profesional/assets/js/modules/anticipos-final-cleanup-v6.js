/* Tráfico App · Anticipos · limpieza final v8 */
(function(){
  'use strict';
  if(window.__ANT_FINAL_CLEANUP_V8__) return;
  window.__ANT_FINAL_CLEANUP_V8__=true;

  function cleanup(){
    document.querySelectorAll('[data-aa="links"]').forEach(el=>el.remove());
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^Enlaces$/i.test(t)||/\bQR\b|c[oó]digo\s*qr|comprobar\s*por\s*qr/i.test(t)) el.remove();
    });
    const list=document.getElementById('ccAntCatTiposAnticipo');
    const card=list?.closest('.cc-config-card');
    if(card){
      const title=card.querySelector('.cc-toolbar strong');
      if(title&&title.textContent!=='Tipos de unidad (desde Configuración · CARRO)') title.textContent='Tipos de unidad (desde Configuración · CARRO)';
      const add=card.querySelector('button[onclick*="TIPO_UNIDAD_ANTICIPO"]');
      if(add) add.remove();
      let note=card.querySelector('[data-ant-unit-source-note]');
      if(!note){
        note=document.createElement('div');note.dataset.antUnitSourceNote='1';note.className='cc-note';note.style.marginTop='6px';
        note.textContent='Este listado se alimenta automáticamente de Configuración > Tipos de unidad y solo muestra tipos clasificados como CARRO.';
        card.querySelector('.cc-toolbar')?.insertAdjacentElement('afterend',note);
      }
    }
  }

  const oldCatalogForm=window.ccAntCatalogoForm;
  if(typeof oldCatalogForm==='function'){
    window.ccAntCatalogoForm=function(t){
      if(t==='TIPO_UNIDAD_ANTICIPO'){
        alert('Los tipos de unidad para Anticipos se administran en Configuración > Tipos de unidad. Solo se usan los clasificados como CARRO.');
        return;
      }
      return oldCatalogForm.apply(this,arguments);
    };
  }

  function esc(v){return String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
  function money(v){return Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});}

  window.ccAntConfigDestino=async function(){
    if(typeof ccPerm==='function'&&!ccPerm('anticipos.catalogos')) return;
    const sb=window.gmSupabase;if(!sb){alert('Supabase no está disponible.');return;}
    try{
      const [rd,rt,rc]=await Promise.all([
        sb.from('cc_ant_destinos').select('id,nombre,estatus').eq('estatus','ACTIVO').order('nombre'),
        sb.from('cc_tipos_unidad').select('id,nombre,categoria,estatus').eq('estatus','ACTIVO').eq('categoria','CARRO').order('nombre'),
        sb.from('cc_ant_conceptos').select('id,nombre,categoria,estatus').eq('estatus','ACTIVO').order('nombre')
      ]);
      if(rd.error)throw rd.error;if(rt.error)throw rt.error;if(rc.error)throw rc.error;
      const destinos=rd.data||[],tipos=rt.data||[],conceptos=rc.data||[];
      if(!destinos.length)throw new Error('No hay destinos activos.');
      if(!tipos.length)throw new Error('No hay tipos de unidad CARRO activos.');
      if(!conceptos.length)throw new Error('No hay conceptos activos.');

      document.getElementById('ccAntDestinoMultiModal')?.remove();
      const ov=document.createElement('div');ov.id='ccAntDestinoMultiModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:100500;display:flex;align-items:center;justify-content:center;padding:18px';
      ov.innerHTML='<div style="background:#fff;width:min(900px,97vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><div><strong>Configuración por destino</strong><div style="font-size:10px;color:#cbd5e1">Agrega varios conceptos y guárdalos juntos. Se precargarán al crear el anticipo.</div></div><button type="button" data-close style="background:none;border:0;color:#fff;font-size:22px">×</button></div><div style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Destino *</label><select id="antCfgDestino">'+destinos.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Tipo de unidad *</label><select id="antCfgTipo">'+tipos.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div></div><div class="cc-note" style="margin:8px 0 12px">Puedes agregar varios conceptos al mismo destino. Los marcados como <b>Precargar</b> aparecerán automáticamente al seleccionar este destino y tipo de unidad en un anticipo.</div><div id="antCfgRows"></div><button type="button" class="cc-btn cc-btn-light" id="antCfgAdd" style="margin-top:10px">+ Agregar concepto</button><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-close>Cancelar</button><button type="button" class="cc-btn cc-btn-primary" id="antCfgSave">Guardar configuración</button></div></div></div>';
      document.body.appendChild(ov);
      const rowsBox=ov.querySelector('#antCfgRows'),destSel=ov.querySelector('#antCfgDestino'),tipoSel=ov.querySelector('#antCfgTipo');
      const close=()=>ov.remove();ov.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);

      function rowHtml(x){
        x=x||{};
        return '<div class="ant-cfg-row" style="display:grid;grid-template-columns:minmax(220px,1fr) 150px 120px 44px;gap:8px;align-items:end;padding:10px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px"><div class="cc-field"><label>Concepto</label><select data-concepto>'+conceptos.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===x.concepto_id?'selected':'')+'>'+esc(c.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Monto</label><input data-monto type="number" min="0" step="0.01" value="'+esc(x.monto==null?'0':x.monto)+'"></div><label style="display:flex;gap:6px;align-items:center;padding-bottom:9px"><input data-default type="checkbox" '+(x.es_default!==false?'checked':'')+'> Precargar</label><button type="button" class="cc-btn cc-btn-danger" data-del title="Quitar">×</button></div>';
      }
      function bindDeletes(){rowsBox.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>b.closest('.ant-cfg-row')?.remove());}
      async function loadRows(){
        rowsBox.innerHTML='<div class="cc-note">Cargando configuración...</div>';
        const r=await sb.from('cc_ant_destino_conceptos').select('id,concepto_id,monto,es_default,estatus').eq('destino_id',destSel.value).eq('tipo_unidad_id',tipoSel.value).eq('estatus','ACTIVO').order('created_at');
        if(r.error)throw r.error;
        const arr=r.data||[];rowsBox.innerHTML=arr.length?arr.map(rowHtml).join(''):rowHtml({es_default:true,monto:0});bindDeletes();
      }
      destSel.onchange=()=>loadRows().catch(e=>alert(e.message||e));tipoSel.onchange=()=>loadRows().catch(e=>alert(e.message||e));
      ov.querySelector('#antCfgAdd').onclick=()=>{rowsBox.insertAdjacentHTML('beforeend',rowHtml({es_default:true,monto:0}));bindDeletes();};
      ov.querySelector('#antCfgSave').onclick=async function(){
        const btn=this;btn.disabled=true;btn.textContent='Guardando...';
        try{
          const items=[...rowsBox.querySelectorAll('.ant-cfg-row')].map(r=>({conceptoId:r.querySelector('[data-concepto]').value,monto:Number(r.querySelector('[data-monto]').value||0),esDefault:r.querySelector('[data-default]').checked}));
          const ids=items.map(x=>x.conceptoId);if(new Set(ids).size!==ids.length)throw new Error('No puedes repetir el mismo concepto en el mismo destino.');
          const res=await sb.rpc('cc_ant_save_destination_config',{p_destino_id:destSel.value,p_tipo_unidad_id:tipoSel.value,p_items:items});
          if(res.error)throw res.error;if(!res.data?.ok)throw new Error('No se pudo guardar la configuración.');
          alert('Configuración guardada. '+Number(res.data.conceptosGuardados||0)+' concepto(s) quedarán disponibles para la precarga del anticipo.');
          close();if(typeof window.ccAntLoad==='function')await window.ccAntLoad(true);
        }catch(e){alert('No se pudo guardar.\n\n'+(e.message||e));btn.disabled=false;btn.textContent='Guardar configuración';}
      };
      await loadRows();
    }catch(e){alert('No se pudo abrir Configuración por destino.\n\n'+(e.message||e));}
  };

  const mo=new MutationObserver(cleanup);mo.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(cleanup,1200);setTimeout(cleanup,100);
})();
