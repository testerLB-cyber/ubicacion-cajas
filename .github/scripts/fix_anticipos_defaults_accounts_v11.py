from pathlib import Path
import re

FILES=[
    Path('profesional/assets/js/modules/anticipos-forms-standalone-v10.js'),
    Path('.github/scripts/add_anticipos_standalone_forms_v10.py'),
]

for P in FILES:
    if not P.exists():
        continue
    text=P.read_text(encoding='utf-8')
    text=text.replace(
        "accounts=active((b.cuentas||[]).filter(x=>x.uso_operadores!==false)),concepts=active(b.conceptos)",
        "accounts=active((b.cuentas||[]).filter(x=>x.uso_operadores===true)),concepts=active((b.conceptos||[]).filter(x=>x.uso_operadores!==false))"
    )
    text=text.replace(
        "const x=mm.get(c.id),checked=!!x;return",
        "const x=mm.get(c.id),checked=!!x&&!!(x.esDefault??x.es_default);return"
    )
    text=text.replace(
        "if(!active((b.cuentas||[]).filter(x=>x.uso_operadores!==false)).length)m.push('Cuentas habilitadas para operadores')",
        "if(!active((b.cuentas||[]).filter(x=>x.uso_operadores===true)).length)m.push('Cuentas habilitadas para operadores')"
    )
    P.write_text(text,encoding='utf-8')

# Reemplaza formulario de cuentas por uso exclusivo Operadores / Beneficiarios.
P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if P.exists():
    text=P.read_text(encoding='utf-8')
    pat=r"  function accountForm\(q=\{\}\)\{.*?\n  \}\n\n  function transferForm"
    repl=r'''  function accountForm(q={}){
    const usoActual=q.usoOperadores&&!q.usoCajaChica?'OPERADORES':(!q.usoOperadores&&q.usoCajaChica?'BENEFICIARIOS':'');
    modal(q.id?'Editar cuenta':'Nueva cuenta','<div class="cc-grid"><div class="cc-field"><label>Nombre de la cuenta *</label><input name="nombre" required value="'+esc(q.nombre||'')+'"></div><div class="cc-field"><label>Saldo inicial</label><input name="saldo" type="number" step="0.01" value="'+Number(q.saldoInicial||0)+'"></div><div class="cc-field"><label>Uso de la cuenta *</label><select name="uso" required><option value="">Seleccionar</option><option value="OPERADORES" '+(usoActual==='OPERADORES'?'selected':'')+'>Anticipos a Operadores</option><option value="BENEFICIARIOS" '+(usoActual==='BENEFICIARIOS'?'selected':'')+'>Anticipos a Beneficiarios</option></select></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(q.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(q.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div class="cc-config-alert" style="margin-top:12px"><strong>Separación de cuentas:</strong> cada cuenta se asigna a un solo flujo. Las cuentas de Operadores solo aparecerán en anticipos de Operador y las de Beneficiarios solo en anticipos de Beneficiario.</div>',async fd=>{const uso=String(fd.get('uso')||'');if(!uso)throw new Error('Selecciona si la cuenta es para Operadores o Beneficiarios.');const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:'CUENTA',p_item:{id:q.id||'',nombre:String(fd.get('nombre')||''),tipo:'CUENTA',saldoInicial:Number(fd.get('saldo')||0),estatus:String(fd.get('estatus')||'ACTIVO'),usoOperadores:uso==='OPERADORES',usoCajaChica:uso==='BENEFICIARIOS'}});if(r.error)throw r.error;});
  }

  function transferForm'''
    text2,n=re.subn(pat,repl,text,flags=re.S)
    if n:
        text=text2
    text=text.replace("(q.usoOperadores?'Operadores ':'')+(q.usoCajaChica?'Responsables / caja chica':'')","(q.usoOperadores?'Operadores':'')+(q.usoCajaChica?'Beneficiarios':'')")
    text=text.replace("Administra las cuentas que financiarán anticipos a operadores o responsables.","Administra cuentas separadas para anticipos a Operadores o Beneficiarios.")
    P.write_text(text,encoding='utf-8')

# Mantén persistencia en el generador de cuentas.
P=Path('.github/scripts/add_anticipos_cuentas_corrected_ui.py')
if P.exists():
    text=P.read_text(encoding='utf-8')
    pat=r"  function accountForm\(q=\{\}\)\{.*?\n  \}\n\n  function transferForm"
    repl=r'''  function accountForm(q={}){
    const usoActual=q.usoOperadores&&!q.usoCajaChica?'OPERADORES':(!q.usoOperadores&&q.usoCajaChica?'BENEFICIARIOS':'');
    modal(q.id?'Editar cuenta':'Nueva cuenta','<div class="cc-grid"><div class="cc-field"><label>Nombre de la cuenta *</label><input name="nombre" required value="'+esc(q.nombre||'')+'"></div><div class="cc-field"><label>Saldo inicial</label><input name="saldo" type="number" step="0.01" value="'+Number(q.saldoInicial||0)+'"></div><div class="cc-field"><label>Uso de la cuenta *</label><select name="uso" required><option value="">Seleccionar</option><option value="OPERADORES" '+(usoActual==='OPERADORES'?'selected':'')+'>Anticipos a Operadores</option><option value="BENEFICIARIOS" '+(usoActual==='BENEFICIARIOS'?'selected':'')+'>Anticipos a Beneficiarios</option></select></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(q.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(q.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div class="cc-config-alert" style="margin-top:12px"><strong>Separación de cuentas:</strong> cada cuenta se asigna a un solo flujo. Las cuentas de Operadores solo aparecerán en anticipos de Operador y las de Beneficiarios solo en anticipos de Beneficiario.</div>',async fd=>{const uso=String(fd.get('uso')||'');if(!uso)throw new Error('Selecciona si la cuenta es para Operadores o Beneficiarios.');const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:'CUENTA',p_item:{id:q.id||'',nombre:String(fd.get('nombre')||''),tipo:'CUENTA',saldoInicial:Number(fd.get('saldo')||0),estatus:String(fd.get('estatus')||'ACTIVO'),usoOperadores:uso==='OPERADORES',usoCajaChica:uso==='BENEFICIARIOS'}});if(r.error)throw r.error;});
  }

  function transferForm'''
    text2,n=re.subn(pat,repl,text,flags=re.S)
    if n:
        text=text2
    text=text.replace("(q.usoOperadores?'Operadores ':'')+(q.usoCajaChica?'Responsables / caja chica':'')","(q.usoOperadores?'Operadores':'')+(q.usoCajaChica?'Beneficiarios':'')")
    text=text.replace("Administra las cuentas que financiarán anticipos a operadores o responsables.","Administra cuentas separadas para anticipos a Operadores o Beneficiarios.")
    P.write_text(text,encoding='utf-8')

print('Anticipos v11: conceptos default y cuentas separadas aplicados')
