from pathlib import Path
import re

I=Path('profesional/index.html')
S=Path('profesional/assets/js/modules/anticipos-selector-standalone.js')
if not I.exists(): raise SystemExit('No existe profesional/index.html')

js=r'''/* Tráfico App Profesional · Selector independiente Operador/Beneficiario v7 */
(function(){
  if(window.__ccAntSelectorStandaloneV7)return;
  window.__ccAntSelectorStandaloneV7=true;

  const baseOperatorFallback = typeof window.ccAntNuevoAnticipo==='function' ? window.ccAntNuevoAnticipo : null;

  function close(){ document.getElementById('ccAntSelectorStandaloneV7')?.remove(); }

  function openSelector(){
    close();
    const ov=document.createElement('div');
    ov.id='ccAntSelectorStandaloneV7';
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
    ov.querySelector('[data-op]').onclick=()=>{
      close();
      if(typeof window.ccAntOpenOperatorForm==='function') return window.ccAntOpenOperatorForm();
      if(typeof baseOperatorFallback==='function') return baseOperatorFallback();
      alert('No se pudo abrir el formulario de Operador.');
    };
    ov.querySelector('[data-ben]').onclick=()=>{
      close();
      if(typeof window.ccAntOpenBeneficiaryForm==='function') return window.ccAntOpenBeneficiaryForm();
      alert('No se pudo abrir el formulario de Beneficiario. Recarga la versión profesional.');
    };
  }

  window.ccAntSelectorStandaloneV7=openSelector;

  function bind(){
    const btn=document.getElementById('ccAntNuevoBtn');
    if(!btn)return false;
    btn.setAttribute('onclick','return ccAntSelectorStandaloneV7(event)');
    btn.onclick=function(ev){ev?.preventDefault?.();ev?.stopPropagation?.();return openSelector();};
    btn.dataset.selectorAnticipo='standalone-v7';
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
'''
S.write_text(js,encoding='utf-8')

h=I.read_text(encoding='utf-8')
# El botón queda cableado explícitamente al selector independiente desde el HTML generado.
h=re.sub(r'(<button[^>]*id="ccAntNuevoBtn"[^>]*)(?: onclick="[^"]*")?([^>]*>)',lambda m:m.group(1)+' onclick="return ccAntSelectorStandaloneV7(event)"'+m.group(2),h,count=1)
# Cargar el selector en archivo separado, después del flujo profesional.
tag='<script src="assets/js/modules/anticipos-selector-standalone.js?v=selector-v7"></script>'
if tag not in h:
    anchor='<script src="assets/js/modules/anticipos-profesional-flow.js?v=selector-v6"></script>'
    if anchor not in h:
        anchor='<script src="assets/js/modules/anticipos-profesional-flow.js"></script>'
    if anchor not in h: raise SystemExit('No se encontró anticipos-profesional-flow.js')
    h=h.replace(anchor,anchor+'\n'+tag,1)
I.write_text(h,encoding='utf-8')
print('Selector independiente v7 generado y enlazado directamente al botón Nuevo anticipo')
