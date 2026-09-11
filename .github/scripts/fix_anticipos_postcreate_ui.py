from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists(): raise SystemExit('No existe anticipos-profesional-flow.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Post-create común Operador/Beneficiario v3 */'
if marker in s:
    print('post-create común v3 ya aplicado'); raise SystemExit(0)

anchors=[
    '/* Tráfico App Profesional · Selector definitivo directo v5 */',
    '/* Tráfico App Profesional · Selector definitivo bloqueado v4 */',
    '/* Tráfico App Profesional · Fix selector + flujo común v2 */'
]
anchor=next((a for a in anchors if a in s),None)
if not anchor:
    raise SystemExit('No se encontró ancla del selector definitivo de Anticipos')
helper=r'''

/* Tráfico App Profesional · Post-create común Operador/Beneficiario v3 */
async function ccAntPostCreateComun(r){
  if(!r?.data?.ok)return;
  try{
    await window.ccAntLoad?.(true);
    const lr=await window.gmSupabase.rpc('cc_ant_list');
    if(lr.error)throw lr.error;
    const a=(lr.data?.anticipos||[]).find(x=>x.id===r.data.id)||{id:r.data.id,folio:r.data.folio,montoAutorizado:r.data.montoAutorizado,montoEntregado:r.data.montoEntregado};
    const links={
      firma:typeof window.ccAntPublicUrl==='function'?window.ccAntPublicUrl('anticipo-operador.html',r.data.firmaToken):'',
      comprobacion:typeof window.ccAntPublicUrl==='function'?window.ccAntPublicUrl('comprobacion-anticipo-completa.html?v=2',r.data.comprobacionToken):''
    };
    if(typeof window.ccAntPostCreate==='function')window.ccAntPostCreate(a,links);
    else if(typeof window.ccAntShowLinks==='function')window.ccAntShowLinks(a,links,false);
  }catch(e){console.warn('Post-create anticipo',e);}
}
'''
s=s.replace(anchor,helper+'\n'+anchor,1)

old_b="const r=await sb().rpc('cc_ant_create',{p_item:{esCajaChica:true,responsableId:String(fd.get('beneficiario')||''),cuentaId:String(fd.get('cuenta')||''),fecha:String(fd.get('fecha')||''),metodoDepositoId:String(fd.get('metodo')||''),montoEntregado:ent,referencia:String(fd.get('referencia')||''),observaciones:String(fd.get('obs')||''),detalles}});if(r.error)throw r.error;alert('Anticipo a beneficiario '+(r.data?.folio||'')+' creado.');"
new_b="const r=await sb().rpc('cc_ant_create',{p_item:{esCajaChica:true,responsableId:String(fd.get('beneficiario')||''),cuentaId:String(fd.get('cuenta')||''),fecha:String(fd.get('fecha')||''),metodoDepositoId:String(fd.get('metodo')||''),montoEntregado:ent,referencia:String(fd.get('referencia')||''),observaciones:String(fd.get('obs')||''),detalles}});if(r.error)throw r.error;await ccAntPostCreateComun(r);"
if old_b not in s: raise SystemExit('No se encontró creación de Beneficiario esperada')
s=s.replace(old_b,new_b,1)

old_o="const r=await sb().rpc('cc_ant_create',{p_item:{esCajaChica:false,operadorId:String(fd.get('operador')||''),unidadId:String(fd.get('unidad')||''),destinoId:String(fd.get('destino')||''),tipoUnidadAnticipoId:String(fd.get('tipoUnidad')||''),cuentaId:String(fd.get('cuenta')||''),metodoDepositoId:String(fd.get('metodo')||''),fecha:String(fd.get('fecha')||''),viaje:String(fd.get('viaje')||''),referencia:String(fd.get('referencia')||''),montoEntregado:ent,observaciones:String(fd.get('obs')||''),detalles}});if(r.error)throw r.error;alert('Anticipo '+(r.data?.folio||'')+' creado.');"
new_o="const r=await sb().rpc('cc_ant_create',{p_item:{esCajaChica:false,operadorId:String(fd.get('operador')||''),unidadId:String(fd.get('unidad')||''),destinoId:String(fd.get('destino')||''),tipoUnidadAnticipoId:String(fd.get('tipoUnidad')||''),cuentaId:String(fd.get('cuenta')||''),metodoDepositoId:String(fd.get('metodo')||''),fecha:String(fd.get('fecha')||''),viaje:String(fd.get('viaje')||''),referencia:String(fd.get('referencia')||''),montoEntregado:ent,observaciones:String(fd.get('obs')||''),detalles}});if(r.error)throw r.error;await ccAntPostCreateComun(r);"
if old_o not in s: raise SystemExit('No se encontró creación de Operador esperada')
s=s.replace(old_o,new_o,1)

if 'ccAntTipoPersonaSwitch' not in s or 'ccAntPendTipoPersonaSwitch' not in s: raise SystemExit('Faltan selectores Operador/Beneficiario')
if 'window.ccAntChooseTypeFinal=chooseType' not in s: raise SystemExit('Falta selector final Nuevo anticipo')
if 'Selector definitivo directo v5' not in s: raise SystemExit('Falta selector directo v5')

P.write_text(s,encoding='utf-8')
print('Post-create común conectado para Operador y Beneficiario con selector v5')
