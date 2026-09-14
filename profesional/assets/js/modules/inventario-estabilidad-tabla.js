/* Tráfico App · Inventario · estabilidad de tabla v1 */
(function(){
'use strict';
if(window.__CC_INVENTARIO_TABLE_STABLE_V1__)return;
window.__CC_INVENTARIO_TABLE_STABLE_V1__=true;

function sameKeys(a,b){
  const ar=[...a.querySelectorAll('tr')],br=[...b.querySelectorAll('tr')];
  if(!ar.length||ar.length!==br.length)return false;
  for(let i=0;i<ar.length;i++){
    const ak=String(ar[i].children?.[2]?.textContent||'').trim();
    const bk=String(br[i].children?.[2]?.textContent||'').trim();
    if(ak!==bk)return false;
  }
  return true;
}
function reconcileRows(real,ghost){
  if(!sameKeys(real,ghost)){real.innerHTML=ghost.innerHTML;return;}
  const rr=[...real.querySelectorAll('tr')],gr=[...ghost.querySelectorAll('tr')];
  for(let i=0;i<rr.length;i++){
    const rc=[...rr[i].children],gc=[...gr[i].children];
    if(rc.length!==gc.length){rr[i].innerHTML=gr[i].innerHTML;continue;}
    for(let j=0;j<rc.length;j++){
      if(rc[j].innerHTML!==gc[j].innerHTML){
        const cls=gc[j].className;
        const style=gc[j].getAttribute('style');
        rc[j].innerHTML=gc[j].innerHTML;
        rc[j].className=cls;
        if(style!==null)rc[j].setAttribute('style',style);else rc[j].removeAttribute('style');
        [...gc[j].attributes].forEach(a=>{if(a.name.startsWith('data-'))rc[j].setAttribute(a.name,a.value);});
      }
    }
  }
}
function install(){
  if(!window.CC_AUTH_READY||typeof window.ccRenderInventario!=='function'||!window.__CC_TIPO_UNIDAD_ESTABLE_V11__)return false;
  const current=window.ccRenderInventario;
  if(current.__ccStableTableV1)return true;
  let lastAt=0,rendering=false;
  const stable=function(){
    if(rendering)return;
    const realBody=document.getElementById('ccInventarioBody');
    const realKpis=document.getElementById('ccInventarioKpis');
    const now=Date.now();
    const rapid=!!(realBody&&realBody.children.length&&now-lastAt<3000);
    lastAt=now;
    if(!rapid)return current.apply(this,arguments);

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
    if(realBody)reconcileRows(realBody,ghostBody);
    if(realKpis&&ghostKpis.innerHTML&&realKpis.innerHTML!==ghostKpis.innerHTML)realKpis.innerHTML=ghostKpis.innerHTML;
    const table=realBody?.closest('table');
    if(table){table.style.tableLayout=table.style.tableLayout||'auto';table.style.contain='layout paint';}
  };
  stable.__ccStableTableV1=true;
  stable.__ccWrapped=current;
  window.ccRenderInventario=stable;
  return true;
}

function boot(){
  let n=0;
  const timer=setInterval(()=>{n++;if(install()||n>80)clearInterval(timer);},125);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
