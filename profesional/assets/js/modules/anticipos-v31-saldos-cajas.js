/* Tráfico App Profesional · Anticipos v31 · Saldos de cajas */
(function(){
  'use strict';
  if(window.__ccAntSaldosCajasV31)return;
  window.__ccAntSaldosCajasV31=true;

  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  let DATA=null,loading=false;

  function calcSaldo(c,movs){
    let saldo=Number(c.saldo_inicial??c.saldoInicial??0);
    (movs||[]).filter(m=>String(m.cuenta_id||m.cuentaId||'')===String(c.id)&&String(m.estatus||'ACTIVO').toUpperCase()==='ACTIVO').forEach(m=>{
      const n=Number(m.monto||0),tipo=String(m.tipo||'').toUpperCase();
      if(['DEPOSITO','DEVOLUCION','AJUSTE_ENTRADA'].includes(tipo))saldo+=n;
      else if(['ANTICIPO','AJUSTE_SALIDA'].includes(tipo))saldo-=n;
    });
    return saldo;
  }

  async function load(){
    if(loading)return DATA;
    if(!sb()||typeof sb().rpc!=='function')return null;
    loading=true;
    try{
      const r=await sb().rpc('cc_ant_list');
      if(r.error)throw r.error;
      if(!r.data?.ok)throw new Error(r.data?.error||'No se pudieron cargar saldos de cajas');
      DATA=r.data;return DATA;
    }catch(e){console.warn('Anticipos v31 saldos',e);return DATA}
    finally{loading=false}
  }

  function balances(){
    const d=DATA||{},movs=d.movimientos||[];
    return (d.cuentas||[]).filter(c=>String(c.estatus||'ACTIVO').toUpperCase()==='ACTIVO').map(c=>({...c,saldoActual:calcSaldo(c,movs)})).sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
  }

  function style(){
    if(document.getElementById('ccAntV31Style'))return;
    const s=document.createElement('style');s.id='ccAntV31Style';s.textContent=`
      .cc-ant-v31-wrap{margin:10px 0 12px;padding:12px;border:1px solid #dbe3ee;border-radius:13px;background:#f8fafc}
      .cc-ant-v31-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:9px}
      .cc-ant-v31-head strong{font-size:12px;color:#0f172a}
      .cc-ant-v31-head span{font-size:10px;color:#64748b}
      .cc-ant-v31-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:8px}
      .cc-ant-v31-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px}
      .cc-ant-v31-card small{display:block;font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
      .cc-ant-v31-card strong{display:block;font-size:17px;color:#0f172a;margin-top:2px}
      .cc-ant-v31-total{border-color:#93c5fd;background:#eff6ff}
      .cc-ant-v31-total strong{font-size:22px;color:#1d4ed8}
      .cc-ant-v31-neg strong{color:#b91c1c}
    `;document.head.appendChild(s);
  }

  function cardsHtml(items,totalLabel='SALDO TOTAL DE TODAS LAS CAJAS'){
    const total=items.reduce((s,c)=>s+Number(c.saldoActual||0),0);
    return '<div class="cc-ant-v31-grid"><div class="cc-ant-v31-card cc-ant-v31-total '+(total<0?'cc-ant-v31-neg':'')+'"><small>'+esc(totalLabel)+'</small><strong>'+money(total)+'</strong></div>'+items.map(c=>'<div class="cc-ant-v31-card '+(Number(c.saldoActual)<0?'cc-ant-v31-neg':'')+'"><small>'+esc(c.nombre||'Caja')+'</small><strong>'+money(c.saldoActual)+'</strong></div>').join('')+'</div>';
  }

  function renderMain(){
    const k=document.getElementById('ccAntKpis');if(!k)return;
    const items=balances();let host=document.getElementById('ccAntSaldosMainV31');
    if(!host){host=document.createElement('div');host.id='ccAntSaldosMainV31';host.className='cc-ant-v31-wrap';k.insertAdjacentElement('afterend',host)}
    host.innerHTML='<div class="cc-ant-v31-head"><div><strong>Saldos de cajas</strong><div><span>Saldo disponible consolidado e individual de todas las cajas activas.</span></div></div></div>'+cardsHtml(items);
  }

  function renderCajas(){
    const view=document.getElementById('ccAntViewCajas');if(!view)return;
    const items=balances();let host=document.getElementById('ccAntSaldosCajasV31');
    if(!host){host=document.createElement('div');host.id='ccAntSaldosCajasV31';host.className='cc-ant-v31-wrap';const k=document.getElementById('ccAntCajaKpis');if(k)k.insertAdjacentElement('beforebegin',host);else view.prepend(host)}
    const selected=document.getElementById('ccAntCajaCuenta')?.value||'';
    const selectedItem=selected?items.find(c=>String(c.id)===String(selected)):null;
    const extra=selectedItem?'<div style="margin-top:8px;font-size:10px;color:#475569"><strong>Saldo de caja seleccionada:</strong> '+esc(selectedItem.nombre)+' · '+money(selectedItem.saldoActual)+'</div>':'';
    host.innerHTML='<div class="cc-ant-v31-head"><div><strong>Saldo total de cajas</strong><div><span>El total siempre incluye todas las cajas activas; el detalle individual se muestra a continuación.</span></div></div></div>'+cardsHtml(items)+extra;
  }

  async function refresh(){await load();renderMain();renderCajas()}

  function wrap(){
    if(typeof window.ccAntLoad==='function'&&!window.ccAntLoad.__v31saldos){const old=window.ccAntLoad;const w=async function(){const r=await old.apply(this,arguments);setTimeout(refresh,0);return r};w.__v31saldos=true;window.ccAntLoad=w}
    if(typeof window.ccAntRenderCaja==='function'&&!window.ccAntRenderCaja.__v31saldos){const old=window.ccAntRenderCaja;const w=function(){const r=old.apply(this,arguments);setTimeout(renderCajas,0);return r};w.__v31saldos=true;window.ccAntRenderCaja=w}
  }

  async function boot(){
    style();
    if(!window.gmSupabase||!window.CC_AUTH_READY||typeof window.ccAntLoad!=='function')return setTimeout(boot,400);
    wrap();await refresh();
    document.addEventListener('change',e=>{if(e.target?.id==='ccAntCajaCuenta')setTimeout(renderCajas,0)},true);
    document.addEventListener('click',e=>{if(e.target.closest?.('#ccPanelAnticipos [data-antv="cajas"],#ccTabAnticipos,[data-antv="anticipos"]'))setTimeout(refresh,120)},true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1500));else setTimeout(boot,1500);
})();
