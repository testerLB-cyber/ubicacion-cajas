from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
I=Path('profesional/index.html')
if not P.exists() or not I.exists(): raise SystemExit('Faltan archivos profesionales')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Selector obligatorio Operador/Beneficiario v6 */'
if marker in s:
    print('selector obligatorio v6 ya aplicado'); raise SystemExit(0)

# Exponer directamente los dos formularios reales ya existentes.
s=s.replace(
"function install(){originalNew=window.ccAntNuevoAnticipo;window.ccAntNuevoAnticipo=chooseType;renameLabels();refresh();",
"function install(){originalNew=window.ccAntNuevoAnticipo;window.ccAntOpenBeneficiaryForm=beneficiaryAdvance;window.ccAntNuevoAnticipo=chooseType;renameLabels();refresh();",
1)
s=s.replace(
"function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntNuevoAnticipo=chooseType;}",
"function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntOpenOperatorForm=operatorAdvance;window.ccAntChooseTypeFinal=chooseType;window.ccAntNuevoAnticipo=chooseType;}",
1)
s=s.replace(
"function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntChooseTypeFinal=chooseType;window.ccAntNuevoAnticipo=chooseType;}",
"function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntOpenOperatorForm=operatorAdvance;window.ccAntChooseTypeFinal=chooseType;window.ccAntNuevoAnticipo=chooseType;}",
1)

js=r'''

/* Tráfico App Profesional · Selector obligatorio Operador/Beneficiario v6 */
(function(){
 if(window.__ccAntSelectorObligatorioV6)return;window.__ccAntSelectorObligatorioV6=true;
 const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 function abrirSelector(){
   document.getElementById('ccAntSelectorV6')?.remove();
   const ov=document.createElement('div');
   ov.id='ccAntSelectorV6';
   ov.style='position:fixed;inset:0;background:rgba(15,23,42,.82);z-index:100500;display:flex;align-items:center;justify-content:center;padding:16px';
   ov.innerHTML='<div style="background:#fff;width:min(620px,96vw);border-radius:18px;overflow:hidden;box-shadow:0 30px 90px rgba(15,23,42,.45)"><div style="background:#0f172a;color:#fff;padding:18px 20px;display:flex;justify-content:space-between;align-items:center"><div><strong style="font-size:18px">Nuevo anticipo</strong><div style="font-size:11px;color:#cbd5e1;margin-top:3px">¿Para quién es el anticipo?</div></div><button type="button" data-close style="border:0;background:none;color:#fff;font-size:25px;cursor:pointer">×</button></div><div style="padding:20px"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px"><button type="button" data-op style="padding:22px 18px;border:2px solid #bfdbfe;border-radius:14px;background:#eff6ff;text-align:left;cursor:pointer"><div style="font-size:18px;font-weight:900;color:#1e3a8a">Operador</div><div style="font-size:11px;color:#475569;margin-top:6px">Unidad, destino, tipo de anticipo y conceptos operativos.</div></button><button type="button" data-ben style="padding:22px 18px;border:2px solid #ddd6fe;border-radius:14px;background:#f5f3ff;text-align:left;cursor:pointer"><div style="font-size:18px;font-weight:900;color:#5b21b6">Beneficiario</div><div style="font-size:11px;color:#475569;margin-top:6px">Anticipo por conceptos. Sin unidad ni destino.</div></button></div><div style="text-align:right;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button></div></div></div>';
   document.body.appendChild(ov);
   const close=()=>ov.remove();
   ov.querySelector('[data-close]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
   ov.querySelector('[data-op]').onclick=()=>{close();if(typeof window.ccAntOpenOperatorForm==='function')window.ccAntOpenOperatorForm();else alert('No se pudo abrir el formulario de Operador.');};
   ov.querySelector('[data-ben]').onclick=()=>{close();if(typeof window.ccAntOpenBeneficiaryForm==='function')window.ccAntOpenBeneficiaryForm();else alert('No se pudo abrir el formulario de Beneficiario.');};
 }
 window.ccAntNuevoAnticipoV6=abrirSelector;
 function bind(){
   const btn=document.getElementById('ccAntNuevoBtn');if(!btn)return false;
   btn.removeAttribute('onclick');btn.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();abrirSelector();};
   btn.dataset.selectorAnticipo='obligatorio-v6';
   try{Object.defineProperty(window,'ccAntNuevoAnticipo',{configurable:true,enumerable:true,get(){return abrirSelector},set(){}});}catch(e){window.ccAntNuevoAnticipo=abrirSelector;}
   return true;
 }
 function install(){if(!bind())return setTimeout(install,200);[400,1200,2500,5000].forEach(ms=>setTimeout(bind,ms));const root=document.getElementById('ccPanelAnticipos')||document.body;new MutationObserver(bind).observe(root,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,2200));else setTimeout(install,2200);
})();
'''
s+=js
P.write_text(s,encoding='utf-8')

h=I.read_text(encoding='utf-8')
import re
h=re.sub(r'src="assets/js/modules/anticipos-profesional-flow\.js(?:\?v=[^"]*)?"','src="assets/js/modules/anticipos-profesional-flow.js?v=selector-v6"',h,count=1)
I.write_text(h,encoding='utf-8')
print('Selector obligatorio v6 aplicado: Operador/Beneficiario y cache-buster')
