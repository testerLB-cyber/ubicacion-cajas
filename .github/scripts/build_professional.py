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

JS_MODULES = {
    1: ('core/dashboard-operaciones.js', 'Dashboard operativo, carga Excel, KPIs y reportes'),
    2: ('ui/dashboard-shell.js', 'Shell visual, navegación lateral y carga unificada de archivos'),
    3: ('modules/gerencial-analytics.js', 'Radiografía gerencial, alertas analíticas y drill-downs'),
    4: ('vendor/supabase-sdk.js', 'SDK Supabase embebido de la versión funcional'),
    5: ('config/supabase-config.js', 'Configuración pública URL/anon key de Supabase'),
    6: ('modules/control-cajas-core.js', 'Núcleo compatible de Control de Cajas; conserva estado compartido y comportamiento original'),
    7: ('ui/app-navigation.js', 'Cambio entre Dashboard y Control de Cajas'),
    8: ('modules/anticipos.js', 'Módulo de anticipos, caja, comprobaciones, saldos y reportes'),
    9: ('security/auth-permissions.js', 'Autenticación, perfiles, permisos y protección de acciones'),
    10: ('core/location-preservation.js', 'Bandera de preservación de IDs/QR y ubicaciones'),
    11: ('core/performance-flags.js', 'Banderas de rendimiento'),
    12: ('modules/alerts-center.js', 'Centro global de alertas basado en permisos'),
}
module_manifest = []

FACADE_MODULES = {
    'modules/inventario.js': '''/* Tráfico App · Fachada modular segura · Inventario */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};
  root.modules.inventario={
    name:'inventario',
    open(){const btn=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));if(btn&&typeof window.ccTab==='function')return window.ccTab('inventario',btn);},
    render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();}
  };
})();\n''',
    'modules/rentas.js': '''/* Tráfico App · Fachada modular segura · Rentas */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};
  root.modules.rentas={
    name:'rentas',
    open(){const btn=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('renta'"));if(btn&&typeof window.ccTab==='function')return window.ccTab('renta',btn);},
    render(){if(typeof window.ccRenderRenta==='function')return window.ccRenderRenta();},
    history(){if(typeof window.ccRenderHistorial==='function')return window.ccRenderHistorial();}
  };
})();\n''',
    'modules/mantenimiento-dot.js': '''/* Tráfico App · Fachada modular segura · Mantenimiento y DOT */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};
  root.modules.mantenimiento={
    name:'mantenimiento-dot',
    open(){const btn=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('mantenimiento'"));if(btn&&typeof window.ccTab==='function')return window.ccTab('mantenimiento',btn);},
    render(){if(typeof window.ccRenderMantenimiento==='function')return window.ccRenderMantenimiento();}
  };
})();\n''',
    'modules/mapa.js': '''/* Tráfico App · Fachada modular segura · Mapa y ubicación */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};
  root.modules.mapa={
    name:'mapa',
    open(){const btn=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('mapa'"));if(btn&&typeof window.ccTab==='function')return window.ccTab('mapa',btn);},
    render(){if(typeof window.ccCargarMapaUnidades==='function')return window.ccCargarMapaUnidades();}
  };
})();\n''',
    'modules/configuracion.js': '''/* Tráfico App · Fachada modular segura · Configuración */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};
  root.modules.configuracion={
    name:'configuracion',
    open(){const btn=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('configuracion'"));if(btn&&typeof window.ccTab==='function')return window.ccTab('configuracion',btn);},
    render(){if(typeof window.ccRenderConfiguracion==='function')return window.ccRenderConfiguracion();}
  };
})();\n''',
}


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
    relative, description = JS_MODULES.get(js_count,(f'legacy/script-{js_count:03d}.js', f'Bloque legado {js_count}'))
    target = js_dir / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body.strip() + '\n', encoding='utf-8')
    module_manifest.append({'order':js_count,'file':f'assets/js/{relative}','description':description,'bytes':len((body.strip()+'\n').encode('utf-8'))})

    preserved=[]
    for name in ('type','id'):
        value=attr_value(attrs,name)
        if value: preserved.append(f'{name}="{value}"')
    for name in ('nomodule','defer','async'):
        if re.search(rf'\b{name}\b',attrs,re.I): preserved.append(name)
    extra=(' '+' '.join(preserved)) if preserved else ''
    return f'<script{extra} src="assets/js/{relative}"></script>'


html = script_re.sub(replace_script, html)

# Crear fachadas de dominio sin alterar el IIFE legado ni su estado compartido.
for relative, body in FACADE_MODULES.items():
    target=js_dir/relative
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(body,encoding='utf-8')

core_tag='<script src="assets/js/modules/control-cajas-core.js"></script>'
facade_tags='\n'.join(f'<script src="assets/js/{p}"></script>' for p in FACADE_MODULES)
if core_tag not in html:
    raise SystemExit('No se encontró el punto de carga de control-cajas-core.js')
html=html.replace(core_tag,core_tag+'\n'+facade_tags,1)

marker = '<meta name="trafico-app-build" content="profesional-modular-v3"/>'
head_match = re.search(r'<head\b[^>]*>', html, re.I)
if head_match:
    pos=head_match.end(); html=html[:pos]+'\n'+marker+html[pos:]
else:
    raise SystemExit('No se encontró <head> en app-correcta.html')

(OUT/'index.html').write_text(html,encoding='utf-8')

facade_manifest=[{'file':f'assets/js/{p}','role':'fachada de dominio; no duplica estado ni modifica lógica legado'} for p in FACADE_MODULES]
(OUT/'module-manifest.json').write_text(json.dumps({'base':'app-correcta.html','modules':module_manifest,'facades':facade_manifest},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

architecture='''# Arquitectura · Tráfico App Profesional\n\nEsta versión se genera en paralelo desde `app-correcta.html`. Producción no se modifica.\n\n## Estructura JavaScript\n\n- `assets/js/core/`: lógica transversal del dashboard y banderas de compatibilidad/rendimiento.\n- `assets/js/ui/`: navegación y shell visual.\n- `assets/js/modules/`: módulos funcionales de negocio.\n- `assets/js/security/`: autenticación y permisos.\n- `assets/js/config/`: configuración pública del cliente Supabase.\n- `assets/js/vendor/`: SDK externo embebido.\n\n## Control de Cajas · estrategia segura\n\n`control-cajas-core.js` conserva por ahora el IIFE y el estado compartido original. Encima de ese núcleo se cargan fachadas independientes para `inventario.js`, `rentas.js`, `mantenimiento-dot.js`, `mapa.js` y `configuracion.js`. Esto crea límites de módulo y puntos de entrada estables sin duplicar estado ni cortar cierres léxicos.\n\nLa siguiente migración puede mover implementación desde el núcleo hacia cada fachada de forma incremental, una función a la vez, validando comportamiento después de cada extracción.\n'''
(OUT/'ARCHITECTURE.md').write_text(architecture,encoding='utf-8')

readme=f'''# Tráfico App - Versión Profesional Paralela\n\nBase funcional: `app-correcta.html`.\n\n- Producción no se modifica.\n- `source-original.html` es una copia exacta de la base funcional.\n- `index.html` conserva el HTML y el orden de ejecución original.\n- `assets/css/` contiene {css_count} bloques CSS extraídos.\n- `assets/js/` contiene {js_count} bloques originales organizados por responsabilidad.\n- Se agregaron {len(FACADE_MODULES)} fachadas de dominio: Inventario, Rentas, Mantenimiento/DOT, Mapa y Configuración.\n- `module-manifest.json` documenta módulos y fachadas.\n\nBuild actual: `profesional-modular-v3`.\n'''
(OUT/'README.md').write_text(readme,encoding='utf-8')

if (OUT/'source-original.html').read_bytes()!=SRC.read_bytes():
    raise SystemExit('El respaldo paralelo no coincide con app-correcta.html')
if marker not in (OUT/'index.html').read_text(encoding='utf-8'):
    raise SystemExit('No se generó la marca de build profesional v3')
if css_count==0 or js_count!=12:
    raise SystemExit(f'Extracción inesperada: CSS={css_count}, JS={js_count}')
for item in module_manifest:
    if not (OUT/item['file']).exists(): raise SystemExit('Módulo faltante: '+item['file'])
for relative in FACADE_MODULES:
    if not (js_dir/relative).exists(): raise SystemExit('Fachada faltante: '+relative)
    if f'assets/js/{relative}' not in html: raise SystemExit('Fachada no cargada en index: '+relative)

print(f'Build profesional v3 listo. CSS={css_count}, JS originales={js_count}, fachadas={len(FACADE_MODULES)}')
