from pathlib import Path
import re

INDEX = Path('profesional/index.html')
FLOW = Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
CORE = Path('profesional/assets/js/modules/anticipos.js')
if not INDEX.exists() or not FLOW.exists() or not CORE.exists():
    raise SystemExit('Faltan archivos profesionales de Anticipos')

html = INDEX.read_text(encoding='utf-8')

def remove_div_by_id(text, element_id):
    marker = f'<div id="{element_id}"'
    start = text.find(marker)
    if start < 0:
        return text, 0
    tag_re = re.compile(r'<div\b|</div>', re.I)
    depth = 0
    for m in tag_re.finditer(text, start):
        token = m.group(0).lower()
        if token.startswith('<div'):
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return text[:start] + text[m.end():], 1
    raise SystemExit(f'No se pudo cerrar estructuralmente {element_id}')

# Botón superior viejo de movimiento de caja: sustituido por la vista Movimientos cajas.
html, n_top = re.subn(r'<button id="ccAntCajaBtn"[^>]*>Movimiento caja</button>', '', html, count=1)

# Navegación vieja que ya no debe existir.
html, n_conf_btn = re.subn(r'<button class="cc-btn cc-btn-light" data-antv="confirmar"[^>]*>Pendientes de confirmar</button>', '', html, count=1)
html, n_caja_btn = re.subn(r'<button class="cc-btn cc-btn-light" data-antv="caja"[^>]*>Caja</button>', '', html, count=1)

# Vistas antiguas completas.
html, n_conf_view = remove_div_by_id(html, 'ccAntViewConfirmar')
html, n_caja_view = remove_div_by_id(html, 'ccAntViewCaja')

# Estilo compacto y estable para las acciones de la lista de anticipos.
compact_css = '''
<style id="ccAntCompactActionsStyle">
#ccAntBody td:last-child{min-width:340px;vertical-align:middle}
#ccAntBody td:last-child>div{display:flex!important;flex-wrap:nowrap!important;gap:4px!important;align-items:center;white-space:nowrap;overflow-x:auto;overflow-y:hidden;padding:2px 0;scrollbar-width:thin}
#ccAntBody td:last-child .cc-btn{font-size:9px!important;line-height:1.1!important;padding:4px 7px!important;min-height:24px!important;border-radius:6px!important;white-space:nowrap!important;flex:0 0 auto!important}
#ccAntBody td:last-child .cc-btn i{font-size:9px!important;margin-right:3px!important}
@media (max-width:900px){#ccAntBody td:last-child{min-width:300px}#ccAntBody td:last-child .cc-btn{font-size:8.5px!important;padding:4px 6px!important}}
</style>
'''
if 'id="ccAntCompactActionsStyle"' not in html:
    html = html.replace('</head>', compact_css + '</head>', 1)
INDEX.write_text(html, encoding='utf-8')

flow = FLOW.read_text(encoding='utf-8')
flow, n_defs = re.subn(
    r"\n\s*const defs=\[\['cajachica','Caja chica'\],\['cajaspro','Cajas y balances'\],\['traspasos','Traspasos'\],\['catalogospro','Responsables / comprobantes'\]\];\n\s*defs\.forEach\(\(\[id,name\]\)=>\{.*?\}\);",
    '', flow, count=1, flags=re.S
)
removed = n_defs
for view_id in ['Cajachica','Cajaspro','Traspasos','Catalogospro']:
    flow, n = re.subn(r"\n\s*mk\('ccAntView"+view_id+r"'.*?\);", '', flow, count=1, flags=re.S)
    removed += n
flow = flow.replace('    ocultarPendientesConfirmar();\n', '')
marker = '/* Tráfico App Profesional · Anticipos cleanup definitivo v1 */'
if marker not in flow:
    flow += '\n\n' + marker + '\n/* Controles obsoletos eliminados en build; no se crean ni se ocultan en runtime. */\n'
FLOW.write_text(flow, encoding='utf-8')

# El core original todavía referenciaba controles eliminados. Convertir esas referencias en seguras.
core = CORE.read_text(encoding='utf-8')
core = core.replace(";ccAntRenderConfirmar();", ";")
core = core.replace("document.getElementById('ccAntCajaBtn').style.display=ccPerm('anticipos.caja')?'':'none'", "var cajaBtn=document.getElementById('ccAntCajaBtn');if(cajaBtn)cajaBtn.style.display=ccPerm('anticipos.caja')?'':'none'")
core = core.replace(
    "window.ccAntView=function(v,b){document.querySelectorAll('#ccPanelAnticipos .cc-ant-view').forEach(x=>x.style.display='none');document.getElementById('ccAntView'+v.charAt(0).toUpperCase()+v.slice(1)).style.display='block';document.querySelectorAll('#ccPanelAnticipos [data-antv]').forEach(x=>x.className='cc-btn cc-btn-light');if(b)b.className='cc-btn cc-btn-primary'};",
    "window.ccAntView=function(v,b){document.querySelectorAll('#ccPanelAnticipos .cc-ant-view').forEach(x=>x.style.display='none');var target=document.getElementById('ccAntView'+v.charAt(0).toUpperCase()+v.slice(1));if(target)target.style.display='block';document.querySelectorAll('#ccPanelAnticipos [data-antv]').forEach(x=>x.className='cc-btn cc-btn-light');if(b)b.className='cc-btn cc-btn-primary'};"
)
CORE.write_text(core, encoding='utf-8')

for forbidden in [
    'data-antv="confirmar"',
    'data-antv="caja"',
    'id="ccAntCajaBtn"',
    'id="ccAntViewConfirmar"',
    'id="ccAntViewCaja"',
]:
    if forbidden in html:
        raise SystemExit(f'Sigue presente control obsoleto: {forbidden}')
if "const defs=[['cajachica','Caja chica']" in flow:
    raise SystemExit('Sigue presente generación de botones obsoletos de Anticipos')
if "document.getElementById('ccAntCajaBtn').style" in core:
    raise SystemExit('Sigue referencia insegura a ccAntCajaBtn')
if "document.getElementById('ccAntView'+v.charAt(0).toUpperCase()+v.slice(1)).style" in core:
    raise SystemExit('Sigue navegación insegura de Anticipos')
if 'id="ccAntCompactActionsStyle"' not in html:
    raise SystemExit('No se agregó estilo compacto a acciones de Anticipos')

print('Cleanup definitivo Anticipos + acciones compactas aplicado:', {
    'top': n_top,
    'confirmar_btn': n_conf_btn,
    'caja_btn': n_caja_btn,
    'confirmar_view': n_conf_view,
    'caja_view': n_caja_view,
    'bloques_js': removed,
})
