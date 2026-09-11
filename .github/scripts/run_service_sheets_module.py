from pathlib import Path
p=Path('.github/scripts/add_service_sheets_module.py')
code=p.read_text(encoding='utf-8')
old='needle=" [\'notificaciones\',\'Notificaciones\'"'
new='needle=" [\'usuarios\',\'Usuarios\'"'
if old not in code:
    raise SystemExit('No se encontró el punto de inserción esperado en add_service_sheets_module.py')
code=code.replace(old,new,1)
exec(compile(code,str(p),'exec'),{'__name__':'__main__'})
