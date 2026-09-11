from pathlib import Path
import re
import shutil

ROOT = Path('.')
OUT = ROOT / 'profesional'
SRC = ROOT / 'app-correcta.html'

if not SRC.exists():
    raise SystemExit('No existe app-correcta.html')

# Limpiar únicamente la versión paralela.
for p in [OUT / 'assets', OUT / 'vendor']:
    if p.exists():
        shutil.rmtree(p)
OUT.mkdir(exist_ok=True)
(OUT / 'assets' / 'css').mkdir(parents=True, exist_ok=True)
(OUT / 'assets' / 'js').mkdir(parents=True, exist_ok=True)

source_text = SRC.read_text(encoding='utf-8')
(OUT / 'source-original.html').write_text(source_text, encoding='utf-8')

# Copiar páginas auxiliares para conservar las rutas relativas de la app.
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

    # No modificar scripts CDN/externos ni bloques de datos JSON/template.
    if re.search(r'\bsrc\s*=', attrs, re.I):
        return match.group(0)
    script_type = (attr_value(attrs, 'type') or '').strip().lower()
    if script_type and script_type not in ('text/javascript', 'application/javascript', 'module'):
        return match.group(0)
    if not body.strip():
        return match.group(0)

    js_count += 1
    filename = f'script-{js_count:03d}.js'
    (js_dir / filename).write_text(body.strip() + '\n', encoding='utf-8')

    preserved = []
    for name in ('type', 'id'):
        value = attr_value(attrs, name)
        if value:
            preserved.append(f'{name}="{value}"')
    for name in ('nomodule', 'defer', 'async'):
        if re.search(rf'\b{name}\b', attrs, re.I):
            preserved.append(name)
    extra = (' ' + ' '.join(preserved)) if preserved else ''
    return f'<script{extra} src="assets/js/{filename}"></script>'


html = script_re.sub(replace_script, html)

marker = '<meta name="trafico-app-build" content="profesional-modular-v1"/>'
head_match = re.search(r'<head\b[^>]*>', html, re.I)
if head_match:
    pos = head_match.end()
    html = html[:pos] + '\n' + marker + html[pos:]
else:
    raise SystemExit('No se encontró <head> en app-correcta.html')

(OUT / 'index.html').write_text(html, encoding='utf-8')

readme = f'''# Tráfico App - Versión Profesional Paralela

Base funcional: `app-correcta.html`.

- La versión original de producción no se modifica.
- `source-original.html` es una copia exacta de la base funcional.
- `index.html` conserva el HTML y orden de ejecución, pero carga bloques internos desde archivos separados.
- `assets/css/` contiene {css_count} bloques CSS extraídos.
- `assets/js/` contiene {js_count} bloques JavaScript extraídos.
- Las páginas auxiliares y `vendor` se copian dentro de `/profesional/` para conservar rutas relativas.

Esta es la primera etapa de modularización segura. Los módulos funcionales pueden separarse progresivamente sobre esta base sin tocar producción.
'''
(OUT / 'README.md').write_text(readme, encoding='utf-8')

# Validaciones mínimas antes de permitir publicación.
if (OUT / 'source-original.html').read_bytes() != SRC.read_bytes():
    raise SystemExit('El respaldo paralelo no coincide con app-correcta.html')
if marker not in (OUT / 'index.html').read_text(encoding='utf-8'):
    raise SystemExit('No se generó la marca de build profesional')
if css_count == 0 or js_count == 0:
    raise SystemExit(f'Extracción incompleta: CSS={css_count}, JS={js_count}')

print(f'Build profesional listo. CSS={css_count}, JS={js_count}')
