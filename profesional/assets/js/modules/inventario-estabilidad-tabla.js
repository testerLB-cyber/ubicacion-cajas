/* Tráfico App · Inventario · estabilidad estructural v2 */
(function(){
'use strict';
if(window.__CC_INVENTARIO_TABLE_STABLE_V2__)return;
window.__CC_INVENTARIO_TABLE_STABLE_V2__=true;
window.__CC_INVENTARIO_TABLE_STABLE_V1__=true;

function rowKey(tr){return String(tr?.children?.[2]?.textContent||'').trim().toUpperCase();}
function sameKeys(a,b){
  const ar=[...a.querySelectorAll('tr')],br=[...b.querySelectorAll('tr')];
  if(!ar.length||ar.length!==br.length)return false;
  for(let i=0;i<ar.length;i++)if(rowKey(ar[i])!==rowKey(br[i]))return false;
  return true;
}
function syncAttributes(real,ghost){
  [...real.attributes].forEach(a=>{if(a.name!=='id'&&!ghost.hasAttribute(a.name))real.removeAttribute(a.name);});
  [...ghost.attributes].forEach(a=>{if(a.name!=='id'&&real.getAttribute(a.name)!==a.value)real.setAttribute(a.name,a.value);});
}
function reconcileRows(real,ghost){
  if(!sameKeys(real,ghost)){
    real.innerHTML=ghost.innerHTML;
    return false;
  }
  const rr=[...real.querySelectorAll('tr')],gr=[...ghost.querySelectorAll('tr')];
  for(let i=0;i<rr.length;i++){
    syncAttributes(rr[i],gr[i]);
    const rc=[...rr[i].children],gc=[...gr[i].children];
    if(rc.length!==gc.length){rr[i].innerHTML=gr[i].innerHTML;continue;}
    for(let j=0;j<rc.length;j++){
      if(rc[j].innerHTML!==gc[j].innerHTML)rc[j].innerHTML=gc[j].innerHTML;
      syncAttributes(rc[j],gc[j]);
    }
  }
  return true;
}
function ensureHeader(){
  const table=document.querySelector('#ccPanelInventario .cc-inv-table');
  const head=table?.querySelector('thead tr');
  if(!table||!head)return;
  const th=[...head.children];
  if(!th.some(x=>String(x.textContent||'').trim().toUpperCase()==='DIMENSIONES')){
    const tipo=th.find(x=>String(x.textContent||'').trim().toUpperCase()==='TIPO');
    if(tipo){const n=document.createElement('th');n.textContent='DIMENSIONES';tipo.insertAdjacentElement('afterend',n);}
  }
  const headers=[...head.children];
  const loc=headers.find(x=>String(x.textContent||'').trim().toUpperCase().includes('ÚLTIMA UBICACIÓN'));
  if(loc){loc.style.width='280px';loc.style.minWidth='280px';loc.style.maxWidth='280px';}
  table.style.contain='layout paint';
}
function stabilizeCells(body){
  if(!body)return;
  [...body.querySelectorAll('tr')].forEach(tr=>{
    const cells=[...tr.children];
    if(cells.length>=15){
      const loc=cells[12];
      if(loc){loc.style.width='280px';loc.style.minWidth='280px';loc.style.maxWidth='280px';}
    }
  });
}
function install(){
  if(!window.CC_AUTH_READY||typeof window.ccRenderInventario!=='function'||!window.__CC_TIPO_UNIDAD_ESTABLE_V11__)return false;
  const current=window.ccRenderInventario;
  if(current.__ccStableTableV2)return true;
  let rendering=false;
  const stable=function(){
    if(rendering)return;
    const realBody=document.getElementById('ccInventarioBody');
    const realKpis=document.getElementById('ccInventarioKpis');
    const wrap=realBody?.closest('.cc-inv-wrap');
    const scrollLeft=wrap?.scrollLeft||0,scrollTop=wrap?.scrollTop||0;

    if(!realBody||!realBody.children.length){
      const out=current.apply(this,arguments);
      ensureHeader();stabilizeCells(document.getElementById('ccInventarioBody'));
      return out;
    }

    const ghostBody=document.createElement('tbody');ghostBody.id='ccInventarioBody';
    const ghostKpis=document.createElement('div');ghostKpis.id='ccInventarioKpis';
    const nativeGet=document.getElementById;
    rendering=true;
    try{
      document.getElementById=function(id){
        if(id==='ccInventarioBody')return ghostBody;
        if(id==='ccInventarioKpis')return ghostKpis;
        return nativeGet.call(document,id);
      };
      current.apply(this,arguments);
    }finally{
      document.getElementById=nativeGet;
      rendering=false;
    }

    reconcileRows(realBody,ghostBody);
    if(realKpis&&ghostKpis.innerHTML&&realKpis.innerHTML!==ghostKpis.innerHTML)realKpis.innerHTML=ghostKpis.innerHTML;
    ensureHeader();stabilizeCells(realBody);
    if(wrap){wrap.scrollLeft=scrollLeft;wrap.scrollTop=scrollTop;}
  };
  stable.__ccStableTableV2=true;
  stable.__ccStableTableV1=true;
  stable.__ccWrapped=current;
  window.ccRenderInventario=stable;
  ensureHeader();stabilizeCells(document.getElementById('ccInventarioBody'));
  return true;
}

function boot(){
  let n=0;
  const timer=setInterval(()=>{n++;if(install()||n>100)clearInterval(timer);},100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
