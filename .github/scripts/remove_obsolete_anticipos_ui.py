from pathlib import Path
import re

INDEX = Path('profesional/index.html')
FLOW = Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not INDEX.exists() or not FLOW.exists():
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

# Vistas antiguas completas. El cierre ahora ocurre en el listado principal y caja fue reemplazada por Movimientos cajas.
html, n_conf_view = remove_div_by_id(html, 'ccAntViewConfirmar')
html, n_caja_view = remove_div_by_id(html, 'ccAntViewCaja')

INDEX.write_text(html, encoding='utf-8')

flow = FLOW.read_text(encoding='utf-8')

# Eliminar de raíz la creación transitoria de botones/vistas descartados.
flow, n_defs = re.subn(
    r"\n\s*const defs=\[\['cajachica','Caja chica'\],\['cajaspro','Cajas y balances'\],\['traspasos','Traspasos'\],\['catalogospro','Responsables / comprobantes'\]\];\n\s*defs\.forEach\(\(\[id,name\]\)=>\{.*?\}\);",
    '', flow, count=1, flags=re.S
)
removed = n_defs
for view_id in ['Cajachica','Cajaspro','Traspasos','Catalogospro']:
    flow, n = re.subn(r"\n\s*mk\('ccAntView"+view_id+r"'.*?\);", '', flow, count=1, flags=re.S)
    removed += n

# Ya no se necesita ocultar Pendientes de confirmar en runtime porque no existe físicamente.
flow = flow.replace('    ocultarPendientesConfirmar();\n', '')

marker = '/* Tráfico App Profesional · Anticipos cleanup definitivo v1 */'
if marker not in flow:
    flow += '\n\n' + marker + '\n/* Controles obsoletos eliminados en build; no se crean ni se ocultan en runtime. */\n'
FLOW.write_text(flow, encoding='utf-8')

# Validaciones físicas del HTML generado.
for forbidden in [
    'data-antv="confirmar"',
    'data-antv="caja"',
    'id="ccAntCajaBtn"',
    'id="ccAntViewConfirmar"',
    'id="ccAntViewCaja"',
]:
    if forbidden in html:
        raise SystemExit(f'Sigue presente control obsoleto: {forbidden}')

# Validar que el bloque que generaba los botones descartados ya no existe.
if "const defs=[['cajachica','Caja chica']" in flow:
    raise SystemExit('Sigue presente generación de botones obsoletos de Anticipos')

print('Cleanup definitivo Anticipos aplicado:', {
    'top': n_top,
    'confirmar_btn': n_conf_btn,
    'caja_btn': n_caja_btn,
    'confirmar_view': n_conf_view,
    'caja_view': n_caja_view,
    'bloques_js': removed,
})
