/* Tráfico App · Anticipos · listado operadores separado + Balance por operador */
(function(){
'use strict';
if(window.__CC_ANT_OPERADORES_SEPARADOS_V1__)return;
window.__CC_ANT_OPERADORES_SEPARADOS_V1__=true;

function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();}

function ajustarMenu(){
  const root=document.getElementById('ccPanelAnticipos')||document.body;
  root.querySelectorAll('button,a').forEach(b=>{
    const t=norm(b.textContent);
    if((t.includes('PENDIENTE')&&t.includes('OPERADOR'))||t==='PENDIENTES DE OPERADORES'){
      b.textContent='Balance por operador';
      b.removeAttribute('onclick');
      b.onclick=function(ev){ev.preventDefault();ev.stopPropagation();window.ccAntBalanceOperadores?.();};
      b.dataset.ccBalanceOperador='1';
    }
  });
}

function filtrarListado(){
  const body=document.getElementById('ccAntBody');
  if(!body)return;
  [...body.querySelectorAll('tr')].forEach(tr=>{
    const cells=tr.children;
    if(cells.length<3)return;
    const operador=norm(cells[2]?.textContent);
    // Los anticipos de beneficiarios no tienen operador y cuentan con su listado propio.
    if(!operador||operador==='—'||operador==='-'||operador==='BENEFICIARIO')tr.style.display='none';
    else tr.style.display='';
  });
}

function ajustarTabs(){
  const tabs=document.getElementById('ccAntPersonaTabs');
  if(!tabs)return;
  const op=tabs.querySelector('[data-kind="operadores"]');
  if(op)op.textContent='Anticipos operadores';
  const ben=tabs.querySelector('[data-kind="beneficiarios"]');
  if(ben)ben.textContent='Anticipos beneficiarios';
}

function apply(){ajustarMenu();ajustarTabs();filtrarListado();}
const ob=new MutationObserver(()=>requestAnimationFrame(apply));
function boot(){apply();ob.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();