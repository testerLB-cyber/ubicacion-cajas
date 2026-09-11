from pathlib import Path
import re

INDEX = Path('profesional/index.html')
FLOW = Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not INDEX.exists() or not FLOW.exists():
    raise SystemExit('Faltan archivos profesionales de Anticipos')

html = INDEX.read_text(encoding='utf-8')

# Botón superior viejo de movimiento de caja: sustituido por la vista Movimientos cajas.
html, n_top = re.subn(r'<button id="ccAntCajaBtn"[^>]*>Movimiento caja</button>', '', html, count=1)

# Navegación vieja que ya no debe existir.
html, n_conf_btn = re.subn(r'<button class="cc-btn cc-btn-light" data-antv="confirmar"[^>]*>Pendientes de confirmar</button>', '', html, count=1)
html, n_caja_btn = re.subn(r'<button class="cc-btn cc-btn-light" data-antv="caja"[^>]*>Caja</button>', '', html, count=1)

# Vistas antiguas completas. El cierre ahora ocurre en el listado principal y caja fue reemplazada por Movimientos cajas.
html, n_conf_view = re.subn(
    r'<div id="ccAntViewConfirmar" class="cc-ant-view" style="display:none">.*?</div>(?=<div id="ccAntViewSaldos")',
    '', html, count=1, flags=re.S
)
html, n_caja_view = re.subn(
    r'<div id="ccAntViewCaja" class="cc-ant-view" style="display:none">.*?</div>(?=<div id="ccAntViewReportes")',
    '', html, count=1, flags=re.S
)

INDEX.write_text(html, encoding='utf-8')

flow = FLOW.read_text(encoding='utf-8')

# Eliminar la generación transitoria de vistas/botones que después se ocultaban.
patterns = [
    r"\n\s*const defs=\[\['cajachica','Caja chica'\],\['cajaspro','Cajas y balances'\],\['traspasos','Traspasos'\],\['catalogospro','Responsables / comprobantes'\]\];\n\s*defs\.forEach\(.*?\);\n",
    r"\n\s*mk\('ccAntViewCajachica'.*?\);",
    r"\n\s*mk\('ccAntViewCajaspro'.*?\);",
    r"\n\s*mk\('ccAntViewTraspasos'.*?\);",
    r"\n\s*mk\('ccAntViewCatalogospro'.*?\);",
]
removed = 0
for p in patterns:
    flow, n = re.subn(p, '', flow, count=1, flags=re.S)
    removed += n

# Quitar funciones de limpieza que ya solo existían para esconder elementos obsoletos.
flow = flow.replace("    ocultarPendientesConfirmar();\n", '')
flow = flow.replace("    ocultarPendientesConfirmar();\n", '')

marker = '/* Tráfico App Profesional · Anticipos cleanup definitivo v1 */'
if marker not in flow:
    flow += "\n\n" + marker + "\n/* Controles obsoletos eliminados en build; no se crean ni se ocultan en runtime. */\n"
FLOW.write_text(flow, encoding='utf-8')

# Validaciones: ninguno de estos controles debe quedar físicamente en el HTML generado.
for forbidden in [
    'data-antv="confirmar"',
    'data-antv="caja"',
    'id="ccAntCajaBtn"',
    'id="ccAntViewConfirmar"',
    'id="ccAntViewCaja"',
]:
    if forbidden in html:
        raise SystemExit(f'Sigue presente control obsoleto: {forbidden}')

# Tampoco debe quedar el bloque que crea las cuatro vistas profesionales descartadas.
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
