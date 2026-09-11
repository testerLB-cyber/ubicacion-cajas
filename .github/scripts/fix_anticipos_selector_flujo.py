from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists(): raise SystemExit('No existe anticipos-profesional-flow.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Fix selector + flujo común v2 */'
if marker in s:
    print('fix selector flujo v2 ya aplicado'); raise SystemExit(0)

# Exponer el selector definitivo del flujo Restaurar operador/beneficiario.
old="function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntNuevoAnticipo=chooseType;}"
new="function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntChooseTypeFinal=chooseType;window.ccAntNuevoAnticipo=chooseType;}"
if old not in s:
    raise SystemExit('No se encontró install() del selector Operador/Beneficiario')
s=s.replace(old,new,1)

# Beneficiarios deben usar exactamente el mismo PDF base que Operadores.
# Se evita instalar el override PDF especial del overlay anterior.
s=s.replace("installRenderWrap();installLinksWrap();installPdfWrap();applyAll();",
            "installRenderWrap();installLinksWrap();applyAll();",1)

# Refuerzo final: después de que carguen todos los overlays, el botón Nuevo anticipo
# siempre vuelve a abrir la pregunta Operador / Beneficiario.
js=r'''

/* Tráfico App Profesional · Fix selector + flujo común v2 */
(function(){
 if(window.__ccAntSelectorFlujoComunV2)return;window.__ccAntSelectorFlujoComunV2=true;
 function restoreChooser(){
   if(typeof window.ccAntChooseTypeFinal==='function')window.ccAntNuevoAnticipo=window.ccAntChooseTypeFinal;
 }
 function syncFilters(){
   // Solo presentación: Operadores y Beneficiarios se separan en listados.
   // Las acciones siguen siendo las mismas funciones base del módulo.
   const main=document.getElementById('ccAntTipoPersonaSwitch');
   const pend=document.getElementById('ccAntPendTipoPersonaSwitch');
   if(main)main.dataset.flujoComun='1';
   if(pend)pend.dataset.flujoComun='1';
 }
 function install(){restoreChooser();syncFilters();setTimeout(restoreChooser,600);setTimeout(restoreChooser,1800);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,2800));else setTimeout(install,2800);
})();
'''
s+=js
P.write_text(s,encoding='utf-8')
print('Selector Nuevo anticipo restaurado y flujo común de acciones aplicado')
