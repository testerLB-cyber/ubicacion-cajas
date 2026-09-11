/* Tráfico App Profesional · Selector independiente Operador/Beneficiario v8 */
(function(){
  if(window.__ccAntSelectorStandaloneV8)return;
  window.__ccAntSelectorStandaloneV8=true;

  const baseOperatorFallback = typeof window.ccAntNuevoAnticipo==='function' ? window.ccAntNuevoAnticipo : null;
  function close(){ document.getElementById('ccAntSelectorStandaloneV8')?.remove(); document.getElementById('ccAntSelectorStandaloneV7')?.remove(); }

  function esperarFuncion(nombre, timeout=5000){
    return new Promise(resolve=>{
      const ini=Date.now();
      const tick=()=>{
        if(typeof window[nombre]==='function') return resolve(window[nombre]);
        if(Date.now()-ini>=timeout) return resolve(null);
        setTimeout(tick,100);
      };
      tick();
    });
  }

  async function abrirOperador(){
    close();
    const fn=await esperarFuncion('ccAntOpenOperatorForm',3000);
    if(fn) return fn();
    if(typeof baseOperatorFallback==='function') return baseOperatorFallback();
    alert('No se pudo abrir el formulario de Operador.');
  }

  async function abrirBeneficiario(){
    close();
    const fn=await esperarFuncion('ccAntOpenBeneficiaryForm',5000);
    if(fn) return fn();
    /* Compatibilidad con el flujo profesional anterior: abre su selector interno y elige Beneficiario. */
    const chooser=typeof window.ccAntChooseTypeFinal==='function' ? window.ccAntChooseTypeFinal : null;
    if(chooser){
      chooser();
      setTimeout(()=>{
        const botones=[...document.querySelectorAll('[data-ben],[data-type="BEN"]')];
        const b=botones[botones.length-1];
        if(b) b.click(); else alert('No se pudo abrir el formulario de Beneficiario.');
      },80);
      return;
    }
    alert('No se pudo inicializar el formulario de Beneficiario. Verifica que el módulo de Anticipos haya terminado de cargar.');
  }

  function openSelector(){
    close();
    const ov=document.createElement('div');
    ov.id='ccAntSelectorStandaloneV8';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.84);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML=`<div style="background:#fff;width:min(640px,96vw);border-radius:18px;overflow:hidden;box-shadow:0 30px 90px rgba(15,23,42,.5)">
      <div style="background:#0f172a;color:#fff;padding:18px 20px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:19px;font-weight:900">Nuevo anticipo</div><div style="font-size:12px;color:#cbd5e1;margin-top:4px">¿Para quién es el anticipo?</div></div>
        <button type="button" data-close style="border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer">×</button>
      </div>
      <div style="padding:20px">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">
          <button type="button" data-op style="padding:24px 18px;border:2px solid #93c5fd;border-radius:14px;background:#eff6ff;text-align:left;cursor:pointer">
            <div style="font-size:18px;font-weight:900;color:#1e3a8a">Operador</div>
            <div style="font-size:11px;color:#475569;margin-top:7px">Unidad, destino, tipo de anticipo y conceptos operativos.</div>
          </button>
          <button type="button" data-ben style="padding:24px 18px;border:2px solid #c4b5fd;border-radius:14px;background:#f5f3ff;text-align:left;cursor:pointer">
            <div style="font-size:18px;font-weight:900;color:#5b21b6">Beneficiario</div>
            <div style="font-size:11px;color:#475569;margin-top:7px">Anticipo por conceptos. Sin unidad ni destino.</div>
          </button>
        </div>
        <div style="text-align:right;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button></div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('[data-close]').onclick=close;
    ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('[data-op]').onclick=abrirOperador;
    ov.querySelector('[data-ben]').onclick=abrirBeneficiario;
  }

  window.ccAntSelectorStandaloneV8=openSelector;
  window.ccAntSelectorStandaloneV7=openSelector;

  function bind(){
    const btn=document.getElementById('ccAntNuevoBtn');
    if(!btn)return false;
    btn.removeAttribute('onclick');
    btn.onclick=function(ev){ev?.preventDefault?.();ev?.stopPropagation?.();openSelector();return false;};
    btn.dataset.selectorAnticipo='standalone-v8';
    return true;
  }
  function install(){
    bind();
    [300,800,1500,3000,6000].forEach(ms=>setTimeout(bind,ms));
    const root=document.getElementById('ccPanelAnticipos')||document.body;
    new MutationObserver(bind).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
