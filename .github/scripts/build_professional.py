from pathlib import Path
import json
import re
import shutil

ROOT = Path('.')
OUT = ROOT / 'profesional'
SRC = ROOT / 'app-correcta.html'

if not SRC.exists():
    raise SystemExit('No existe app-correcta.html')

for p in [OUT / 'assets', OUT / 'vendor']:
    if p.exists():
        shutil.rmtree(p)
OUT.mkdir(exist_ok=True)
(OUT / 'assets' / 'css').mkdir(parents=True, exist_ok=True)
(OUT / 'assets' / 'js').mkdir(parents=True, exist_ok=True)

source_text = SRC.read_text(encoding='utf-8')
(OUT / 'source-original.html').write_text(source_text, encoding='utf-8')

for name in [
    'anticipo-operador.html',
    'comprobacion-anticipo-completa.html',
    'comprobar-anticipo.html',
    'ubicacion.html',
]:
    src = ROOT / name
    if src.exists():
        shutil.copy2(src, OUT / name)

if (ROOT / 'vendor').exists():
    shutil.copytree(ROOT / 'vendor', OUT / 'vendor')

css_dir = OUT / 'assets' / 'css'
js_dir = OUT / 'assets' / 'js'
css_count = 0
js_count = 0

style_re = re.compile(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style\s*>', re.I | re.S)
script_re = re.compile(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script\s*>', re.I | re.S)

# Nombres semánticos para los 12 bloques existentes en app-correcta.html.
# Se preserva exactamente el mismo orden de ejecución del HTML original.
JS_MODULES = {
    1: ('core/dashboard-operaciones.js', 'Dashboard operativo, carga Excel, KPIs y reportes'),
    2: ('ui/dashboard-shell.js', 'Shell visual, navegación lateral y carga unificada de archivos'),
    3: ('modules/gerencial-analytics.js', 'Radiografía gerencial, alertas analíticas y drill-downs'),
    4: ('vendor/supabase-sdk.js', 'SDK Supabase embebido de la versión funcional'),
    5: ('config/supabase-config.js', 'Configuración pública URL/anon key de Supabase'),
    6: ('modules/control-cajas-core.js', 'Núcleo de Control de Cajas, inventario, rentas, mantenimiento, DOT, mapa y configuración'),
    7: ('ui/app-navigation.js', 'Cambio entre Dashboard y Control de Cajas'),
    8: ('modules/anticipos.js', 'Módulo de anticipos, caja, comprobaciones, saldos y reportes'),
    9: ('security/auth-permissions.js', 'Autenticación, perfiles, permisos y protección de acciones'),
    10: ('core/location-preservation.js', 'Bandera de preservación de IDs/QR y ubicaciones'),
    11: ('core/performance-flags.js', 'Banderas de rendimiento'),
    12: ('modules/alerts-center.js', 'Centro global de alertas basado en permisos'),
}
module_manifest = []


def attr_value(attrs, name):
    m = re.search(rf'\b{name}\s*=\s*(["\'])(.*?)\1', attrs, re.I | re.S)
    return m.group(2) if m else None


def replace_style(match):
    global css_count
    attrs = match.group('attrs') or ''
    body = match.group('body') or ''
    css_count += 1
    filename = f'style-{css_count:03d}.css'
    (css_dir / filename).write_text(body.strip() + '\n', encoding='utf-8')
    preserved = []
    style_id = attr_value(attrs, 'id')
    media = attr_value(attrs, 'media')
    if style_id:
        preserved.append(f'id="{style_id}"')
    if media:
        preserved.append(f'media="{media}"')
    extra = (' ' + ' '.join(preserved)) if preserved else ''
    return f'<link rel="stylesheet" href="assets/css/{filename}"{extra}/>'


html = style_re.sub(replace_style, source_text)


def replace_script(match):
    global js_count
    attrs = match.group('attrs') or ''
    body = match.group('body') or ''

    if re.search(r'\bsrc\s*=', attrs, re.I):
        return match.group(0)
    script_type = (attr_value(attrs, 'type') or '').strip().lower()
    if script_type and script_type not in ('text/javascript', 'application/javascript', 'module'):
        return match.group(0)
    if not body.strip():
        return match.group(0)

    js_count += 1
    relative, description = JS_MODULES.get(
        js_count,
        (f'legacy/script-{js_count:03d}.js', f'Bloque legado {js_count}')
    )
    target = js_dir / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body.strip() + '\n', encoding='utf-8')
    module_manifest.append({
        'order': js_count,
        'file': f'assets/js/{relative}',
        'description': description,
        'bytes': len((body.strip() + '\n').encode('utf-8')),
    })

    preserved = []
    for name in ('type', 'id'):
        value = attr_value(attrs, name)
        if value:
            preserved.append(f'{name}="{value}"')
    for name in ('nomodule', 'defer', 'async'):
        if re.search(rf'\b{name}\b', attrs, re.I):
            preserved.append(name)
    extra = (' ' + ' '.join(preserved)) if preserved else ''
    return f'<script{extra} src="assets/js/{relative}"></script>'


html = script_re.sub(replace_script, html)

marker = '<meta name="trafico-app-build" content="profesional-modular-v2"/>'
head_match = re.search(r'<head\b[^>]*>', html, re.I)
if head_match:
    pos = head_match.end()
    html = html[:pos] + '\n' + marker + html[pos:]
else:
    raise SystemExit('No se encontró <head> en app-correcta.html')

(OUT / 'index.html').write_text(html, encoding='utf-8')
(OUT / 'module-manifest.json').write_text(
    json.dumps({'base': 'app-correcta.html', 'modules': module_manifest}, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8'
)

architecture = '''# Arquitectura · Tráfico App Profesional\n\nEsta versión se genera en paralelo desde `app-correcta.html`. Producción no se modifica.\n\n## Estructura JavaScript\n\n- `assets/js/core/`: lógica transversal del dashboard y banderas de compatibilidad/rendimiento.\n- `assets/js/ui/`: navegación y shell visual.\n- `assets/js/modules/`: módulos funcionales de negocio.\n- `assets/js/security/`: autenticación y permisos.\n- `assets/js/config/`: configuración pública del cliente Supabase.\n- `assets/js/vendor/`: SDK externo embebido que ya utilizaba la versión funcional.\n\n## Regla de seguridad\n\nLos archivos se extraen sin modificar su contenido y `index.html` conserva el mismo orden de ejecución que `app-correcta.html`. Esto permite profesionalizar la estructura sin cambiar el comportamiento actual.\n\n## Próxima división segura\n\nEl archivo `modules/control-cajas-core.js` sigue siendo el bloque funcional más grande. Se dividirá internamente por Inventario, Rentas, Mantenimiento/DOT, Mapa/QR y Configuración solamente después de identificar dependencias globales y mantener una capa de compatibilidad.\n'''
(OUT / 'ARCHITECTURE.md').write_text(architecture, encoding='utf-8')

readme = f'''# Tráfico App - Versión Profesional Paralela\n\nBase funcional: `app-correcta.html`.\n\n- Producción no se modifica.\n- `source-original.html` es una copia exacta de la base funcional.\n- `index.html` conserva el HTML y el orden de ejecución original.\n- `assets/css/` contiene {css_count} bloques CSS extraídos.\n- `assets/js/` contiene {js_count} bloques JavaScript organizados por responsabilidad.\n- `module-manifest.json` documenta el orden y propósito de cada módulo.\n- `ARCHITECTURE.md` documenta la arquitectura paralela.\n- Las páginas auxiliares y `vendor` se copian dentro de `/profesional/` para conservar rutas relativas.\n\nBuild actual: `profesional-modular-v2`.\n'''
(OUT / 'README.md').write_text(readme, encoding='utf-8')

if (OUT / 'source-original.html').read_bytes() != SRC.read_bytes():
    raise SystemExit('El respaldo paralelo no coincide con app-correcta.html')
if marker not in (OUT / 'index.html').read_text(encoding='utf-8'):
    raise SystemExit('No se generó la marca de build profesional v2')
if css_count == 0 or js_count == 0:
    raise SystemExit(f'Extracción incompleta: CSS={css_count}, JS={js_count}')
if js_count != 12:
    raise SystemExit(f'Cambio inesperado en scripts internos: se esperaban 12 y se encontraron {js_count}')
for item in module_manifest:
    if not (OUT / item['file']).exists():
        raise SystemExit('Módulo faltante: ' + item['file'])

print(f'Build profesional v2 listo. CSS={css_count}, JS={js_count}, módulos={len(module_manifest)}')
