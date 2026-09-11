from pathlib import Path
import hashlib
import json
import re
import shutil

ROOT = Path('.')
OUT = ROOT / 'profesional'
SRC = ROOT / 'app-correcta.html'

if not SRC.exists():
    raise SystemExit('No existe app-correcta.html')

# Solo se reconstruye la versión paralela.
for p in [OUT / 'assets', OUT / 'vendor', OUT / 'src']:
    if p.exists():
        shutil.rmtree(p)
OUT.mkdir(exist_ok=True)
(OUT / 'assets' / 'css').mkdir(parents=True, exist_ok=True)
(OUT / 'assets' / 'js').mkdir(parents=True, exist_ok=True)
(OUT / 'src' / 'control-cajas').mkdir(parents=True, exist_ok=True)

source_text = SRC.read_text(encoding='utf-8')
(OUT / 'source-original.html').write_text(source_text, encoding='utf-8')

for name in ['anticipo-operador.html','comprobacion-anticipo-completa.html','comprobar-anticipo.html','ubicacion.html']:
    src = ROOT / name
    if src.exists():
        shutil.copy2(src, OUT / name)

if (ROOT / 'vendor').exists():
    shutil.copytree(ROOT / 'vendor', OUT / 'vendor')

css_dir = OUT / 'assets' / 'css'
js_dir = OUT / 'assets' / 'js'
src_cc_dir = OUT / 'src' / 'control-cajas'
css_count = 0
js_count = 0
control_cajas_original = None

style_re = re.compile(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style\s*>', re.I | re.S)
script_re = re.compile(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script\s*>', re.I | re.S)

JS_MODULES = {
    1: ('core/dashboard-operaciones.js', 'Dashboard operativo, carga Excel, KPIs y reportes'),
    2: ('ui/dashboard-shell.js', 'Shell visual, navegación lateral y carga unificada de archivos'),
    3: ('modules/gerencial-analytics.js', 'Radiografía gerencial, alertas analíticas y drill-downs'),
    4: ('vendor/supabase-sdk.js', 'SDK Supabase embebido de la versión funcional'),
    5: ('config/supabase-config.js', 'Configuración pública URL/anon key de Supabase'),
    6: ('modules/control-cajas-core.js', 'Bundle compatible generado desde fuentes modulares de Control de Cajas'),
    7: ('ui/app-navigation.js', 'Cambio entre Dashboard y Control de Cajas'),
    8: ('modules/anticipos.js', 'Módulo de anticipos, caja, comprobaciones, saldos y reportes'),
    9: ('security/auth-permissions.js', 'Autenticación, perfiles, permisos y protección de acciones'),
    10: ('core/location-preservation.js', 'Bandera de preservación de IDs/QR y ubicaciones'),
    11: ('core/performance-flags.js', 'Banderas de rendimiento'),
    12: ('modules/alerts-center.js', 'Centro global de alertas basado en permisos'),
}
module_manifest = []

# Fachadas públicas. No duplican estado; ofrecen puntos de entrada estables.
FACADE_MODULES = {
    'modules/inventario.js': '''/* Tráfico App · API pública · Inventario */\n(function(){const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};root.modules.inventario={name:'inventario',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));if(b&&typeof window.ccTab==='function')return window.ccTab('inventario',b);},render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();},edit(id){if(typeof window.ccEditarUnidadDirecto==='function')return window.ccEditarUnidadDirecto(id);}};})();\n''',
    'modules/rentas.js': '''/* Tráfico App · API pública · Rentas */\n(function(){const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};root.modules.rentas={name:'rentas',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('renta'"));if(b&&typeof window.ccTab==='function')return window.ccTab('renta',b);},render(){if(typeof window.ccRenderRenta==='function')return window.ccRenderRenta();},history(){if(typeof window.ccRenderHistorial==='function')return window.ccRenderHistorial();}};})();\n''',
    'modules/mantenimiento-dot.js': '''/* Tráfico App · API pública · Mantenimiento/DOT */\n(function(){const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};root.modules.mantenimiento={name:'mantenimiento-dot',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('mantenimiento'"));if(b&&typeof window.ccTab==='function')return window.ccTab('mantenimiento',b);},render(){if(typeof window.ccRenderMantenimiento==='function')return window.ccRenderMantenimiento();}};})();\n''',
    'modules/mapa.js': '''/* Tráfico App · API pública · Mapa/QR */\n(function(){const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};root.modules.mapa={name:'mapa',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('mapa'"));if(b&&typeof window.ccTab==='function')return window.ccTab('mapa',b);},render(){if(typeof window.ccCargarMapaUnidades==='function')return window.ccCargarMapaUnidades();}};})();\n''',
    'modules/configuracion.js': '''/* Tráfico App · API pública · Configuración */\n(function(){const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};root.modules.configuracion={name:'configuracion',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('configuracion'"));if(b&&typeof window.ccTab==='function')return window.ccTab('configuracion',b);},render(){if(typeof window.ccRenderConfiguracion==='function')return window.ccRenderConfiguracion();}};})();\n''',
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
    preserved=[]
    style_id=attr_value(attrs,'id'); media=attr_value(attrs,'media')
    if style_id: preserved.append(f'id="{style_id}"')
    if media: preserved.append(f'media="{media}"')
    extra=(' '+' '.join(preserved)) if preserved else ''
    return f'<link rel="stylesheet" href="assets/css/{filename}"{extra}/>'

html = style_re.sub(replace_style, source_text)


def replace_script(match):
    global js_count, control_cajas_original
    attrs=match.group('attrs') or ''
    body=match.group('body') or ''
    if re.search(r'\bsrc\s*=',attrs,re.I): return match.group(0)
    script_type=(attr_value(attrs,'type') or '').strip().lower()
    if script_type and script_type not in ('text/javascript','application/javascript','module'): return match.group(0)
    if not body.strip(): return match.group(0)
    js_count+=1
    relative,description=JS_MODULES.get(js_count,(f'legacy/script-{js_count:03d}.js',f'Bloque legado {js_count}'))
    normalized=body.strip()+'\n'
    if js_count == 6:
        control_cajas_original = normalized
    target=js_dir/relative
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(normalized,encoding='utf-8')
    module_manifest.append({'order':js_count,'file':f'assets/js/{relative}','description':description,'bytes':len(normalized.encode('utf-8'))})
    preserved=[]
    for name in ('type','id'):
        value=attr_value(attrs,name)
        if value: preserved.append(f'{name}="{value}"')
    for name in ('nomodule','defer','async'):
        if re.search(rf'\b{name}\b',attrs,re.I): preserved.append(name)
    extra=(' '+' '.join(preserved)) if preserved else ''
    return f'<script{extra} src="assets/js/{relative}"></script>'

html = script_re.sub(replace_script, html)

if not control_cajas_original:
    raise SystemExit('No se pudo extraer Control de Cajas')

# ---------------------------------------------------------------------------
# MIGRACIÓN COMPLETA DE FUENTE DE CONTROL DE CAJAS
# ---------------------------------------------------------------------------
# El bundle funcional mantiene exactamente el mismo contenido. Para edición y
# mantenimiento, la fuente se publica en fragmentos ordenados y clasificados
# por dominio. Los fragmentos son build-time source parts y se concatenan en el
# orden del manifiesto. La validación SHA-256 obliga a que el resultado sea
# idéntico al script original extraído desde app-correcta.html.

DOMAIN_RULES = [
    ('inventario', ('unidad','unidades','inventario','caja','carro','placa','dimension','simular','importar')),
    ('rentas', ('renta','rentas','historial','proforma','responsable','cliente')),
    ('mantenimiento-dot', ('mantenimiento','fuera de servicio','dot','repar','evidencia')),
    ('mapa-qr', ('mapa','ubicacion','ubicación','qr','geocerca','token')),
    ('configuracion', ('configuracion','configuración','correo','tarifa','catalogo','catálogo')),
    ('supabase-data', ('supabase','cloud','revision','rpc','audit','save','load')),
]


def classify_chunk(text):
    low=text.lower()
    scores=[]
    for domain,words in DOMAIN_RULES:
        score=sum(low.count(w) for w in words)
        scores.append((score,domain))
    score,domain=max(scores)
    return domain if score else 'shared-core'

lines=control_cajas_original.splitlines(keepends=True)
# Aproximadamente 24 fragmentos; se busca un salto vacío cercano para hacerlos legibles.
target=max(45, len(lines)//24)
chunks=[]
start=0
while start < len(lines):
    end=min(len(lines), start+target)
    if end < len(lines):
        search_end=min(len(lines),end+25)
        search_start=max(start+1,end-15)
        candidates=[i for i in range(search_start,search_end) if lines[i-1].strip()=='' or lines[i-1].lstrip().startswith('//')]
        if candidates:
            end=min(candidates,key=lambda i:abs(i-end))
    if end<=start:
        end=min(len(lines),start+target)
    text=''.join(lines[start:end])
    chunks.append((start+1,end,classify_chunk(text),text))
    start=end

parts_manifest=[]
rebuilt=[]
domain_counts={}
for idx,(line_start,line_end,domain,text) in enumerate(chunks,1):
    domain_counts[domain]=domain_counts.get(domain,0)+1
    name=f'{idx:03d}-{domain}-{domain_counts[domain]:02d}.part.js'
    path=src_cc_dir/name
    path.write_text(text,encoding='utf-8')
    rebuilt.append(text)
    parts_manifest.append({
        'order':idx,
        'file':f'src/control-cajas/{name}',
        'domain':domain,
        'source_lines':[line_start,line_end],
        'bytes':len(text.encode('utf-8')),
    })

rebuilt_text=''.join(rebuilt)
orig_sha=hashlib.sha256(control_cajas_original.encode('utf-8')).hexdigest()
rebuilt_sha=hashlib.sha256(rebuilt_text.encode('utf-8')).hexdigest()
if rebuilt_text != control_cajas_original or rebuilt_sha != orig_sha:
    raise SystemExit('La recomposición modular de Control de Cajas no coincide byte a byte con la fuente funcional')

# El bundle que usa el navegador se escribe desde la recomposición, no desde el original.
(js_dir/'modules/control-cajas-core.js').write_text(rebuilt_text,encoding='utf-8')
(src_cc_dir/'manifest.json').write_text(json.dumps({
    'source':'app-correcta.html / script interno #6',
    'strategy':'ordered-build-parts',
    'sha256':orig_sha,
    'recomposed_sha256':rebuilt_sha,
    'parts':parts_manifest,
    'domains':domain_counts,
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

(src_cc_dir/'README.md').write_text('''# Control de Cajas · fuente modular\n\nEsta carpeta es la fuente modular de compilación del antiguo bloque monolítico de Control de Cajas.\n\nLos archivos `*.part.js` están ordenados por prefijo numérico y clasificados por dominio: Inventario, Rentas, Mantenimiento/DOT, Mapa/QR, Configuración, Supabase/Data y Shared Core. El build concatena los fragmentos exactamente en el orden del manifiesto y verifica SHA-256 contra el bloque funcional de `app-correcta.html`.\n\n**Regla:** no cambiar el orden de los fragmentos. Para migraciones futuras, mover funciones completas entre fragmentos solo cuando la recomposición y las pruebas de contrato continúen pasando.\n''',encoding='utf-8')

for relative,body in FACADE_MODULES.items():
    target=js_dir/relative
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(body,encoding='utf-8')

facade_tags='\n'.join(f'<script src="assets/js/{p}"></script>' for p in FACADE_MODULES)
core_tag_re=re.compile(r'(<script\b[^>]*\bsrc=["\']assets/js/modules/control-cajas-core\.js["\'][^>]*>\s*</script>)',re.I)
if not core_tag_re.search(html):
    raise SystemExit('No se encontró el punto de carga de control-cajas-core.js')
html=core_tag_re.sub(lambda m:m.group(1)+'\n'+facade_tags,html,count=1)

marker='<meta name="trafico-app-build" content="profesional-modular-v4"/>'
head_match=re.search(r'<head\b[^>]*>',html,re.I)
if not head_match: raise SystemExit('No se encontró <head> en app-correcta.html')
pos=head_match.end(); html=html[:pos]+'\n'+marker+html[pos:]

(OUT/'index.html').write_text(html,encoding='utf-8')
facade_manifest=[{'file':f'assets/js/{p}','role':'API pública de dominio sobre el bundle compatible'} for p in FACADE_MODULES]
(OUT/'module-manifest.json').write_text(json.dumps({
    'base':'app-correcta.html',
    'modules':module_manifest,
    'facades':facade_manifest,
    'controlCajasSource':{
        'manifest':'src/control-cajas/manifest.json',
        'parts':len(parts_manifest),
        'domains':domain_counts,
        'sha256':orig_sha,
    }
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

architecture=f'''# Arquitectura · Tráfico App Profesional\n\nBase funcional: `app-correcta.html`. La versión activa original no se modifica.\n\n## Runtime\nEl navegador carga archivos separados para Dashboard, Analítica, Supabase, Control de Cajas, Anticipos, Auth/Permisos, navegación y Alertas.\n\n## Control de Cajas\nEl antiguo bloque monolítico fue migrado a `{len(parts_manifest)}` fragmentos fuente de compilación en `src/control-cajas/`, clasificados por dominio. Para conservar el alcance léxico y no romper variables compartidas, el build recompone esos fragmentos como `assets/js/modules/control-cajas-core.js`.\n\nLa recomposición se valida byte a byte y por SHA-256 (`{orig_sha}`) contra el bloque funcional extraído de `app-correcta.html`. Si existe una diferencia, la publicación falla.\n\n## Dominios\n{chr(10).join('- '+k+': '+str(v)+' fragmento(s)' for k,v in sorted(domain_counts.items()))}\n\n## APIs públicas\nInventario, Rentas, Mantenimiento/DOT, Mapa/QR y Configuración exponen fachadas estables en `assets/js/modules/`.\n'''
(OUT/'ARCHITECTURE.md').write_text(architecture,encoding='utf-8')

readme=f'''# Tráfico App · Versión Profesional Paralela\n\n- Base funcional: `app-correcta.html`.\n- Producción no se modifica.\n- `source-original.html` es copia exacta de la base.\n- CSS extraídos: {css_count}.\n- Bloques JS principales: {js_count}.\n- Control de Cajas: {len(parts_manifest)} fragmentos fuente recompuestos y validados.\n- Fachadas de dominio: {len(FACADE_MODULES)}.\n- Build: `profesional-modular-v4`.\n'''
(OUT/'README.md').write_text(readme,encoding='utf-8')

# Validaciones de publicación.
if (OUT/'source-original.html').read_bytes()!=SRC.read_bytes():
    raise SystemExit('El respaldo paralelo no coincide con app-correcta.html')
if marker not in (OUT/'index.html').read_text(encoding='utf-8'):
    raise SystemExit('No se generó la marca de build profesional v4')
if css_count==0 or js_count!=12:
    raise SystemExit(f'Extracción inesperada: CSS={css_count}, JS={js_count}')
if not parts_manifest or rebuilt_sha != orig_sha:
    raise SystemExit('Fuente modular de Control de Cajas inválida')
for item in module_manifest:
    if not (OUT/item['file']).exists(): raise SystemExit('Módulo faltante: '+item['file'])
for relative in FACADE_MODULES:
    if not (js_dir/relative).exists(): raise SystemExit('Fachada faltante: '+relative)
    if f'assets/js/{relative}' not in html: raise SystemExit('Fachada no cargada en index: '+relative)

print(f'Build profesional v4 listo. CSS={css_count}, JS={js_count}, Control Cajas parts={len(parts_manifest)}, SHA={orig_sha}')