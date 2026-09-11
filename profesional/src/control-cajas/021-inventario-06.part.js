    const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const pick=(r,keys)=>{const found=Object.keys(r).find(k=>keys.includes(norm(k)));return found===undefined?'':r[found];};
    const tipoFind=v=>{
      const n=String(v||'CAJA').trim().toUpperCase();
      return configuracion.tiposUnidad.find(t=>String(t.nombre).trim().toUpperCase()===n)
        ||configuracion.tiposUnidad.find(t=>String(t.categoria||'').trim().toUpperCase()===n)
        ||configuracion.tiposUnidad.find(t=>String(t.nombre).trim().toUpperCase()==='CAJA');
    };
    const usoFind=v=>{
      const raw=String(v||'').trim();
      if(!raw)return '';
      const n=norm(raw);
      return (configuracion.tiposUsoCaja||[]).find(u=>norm(u.nombre)===n)?.nombre||raw;
    };

    const nuevos=rows.map((r,index)=>{
      const t=tipoFind(pick(r,['tipodeunidad','tipounidad','unidad','categoria']));
      const placasMx=String(pick(r,['placasmx','placamexico','placasmexico'])).trim();
      const placasUsa=String(pick(r,['placasusa','placausa','placaseua','placasestadosunidos'])).trim();
      const placasGeneral=String(pick(r,['placas','placa'])).trim();
      const obj={
        id:uid(),
        tipoUnidadId:t?.id||'tipo_caja',
        tipoUnidadNombre:t?.nombre||'CAJA',
        categoriaUnidad:t?.categoria||'CAJA',
        numero:String(pick(r,['identificadornumero','identificador','numero','economico','unidadnumero','unidad'])).trim(),
        descripcion:String(pick(r,['descripcion','nombre'])).trim(),
        placasMx:placasMx||placasGeneral,
        placasUsa,
        placas:placasMx||placasGeneral||placasUsa,
        tipoUsoCaja:usoFind(pick(r,['tipodeusodecaja','tipousocaja','usodecaja','uso'])),
        marca:String(pick(r,['marca'])).trim(),
        modelo:String(pick(r,['modeloano','modelo','ano','year'])).trim(),
        tamano:String(pick(r,['tamano','tamanio','ft'])).trim(),
        tipo:String(pick(r,['tipoconfiguracion','configuracion','tipocaja'])).trim(),
        origen:String(pick(r,['origen','paisorigen'])).trim()||'MEXICANA',
        clienteId:(()=>{const n=String(pick(r,['cliente','clienteasignado','razonsocial'])).trim().toLowerCase();return clientes.find(c=>String(c.nombre||'').trim().toLowerCase()===n)?.id||'';})(),
        capacidad:String(pick(r,['capacidad'])).trim(),
        largoFt:Number(String(pick(r,['largoft','largopies','largoenpies'])).replace(',','.'))||0,
        anchoFt:Number(String(pick(r,['anchoft','anchopies','anchoenpies'])).replace(',','.'))||0,
        altoFt:Number(String(pick(r,['altoft','altopies','altoenpies'])).replace(',','.'))||0,
        largo:Number(String(pick(r,['largo'])).replace(',','.'))||0,
        ancho:Number(String(pick(r,['ancho'])).replace(',','.'))||0,
        alto:Number(String(pick(r,['alto'])).replace(',','.'))||0,
        estatus:String(pick(r,['estatus','status'])).trim().toUpperCase()||'ACTIVO',
        observaciones:String(pick(r,['observaciones','comentarios','notas'])).trim(),
        _fila:index+2
      };
      if(String(obj.categoriaUnidad||obj.tipoUnidadNombre).toUpperCase()==='CARRO'){
        obj.largoFt=obj.largoFt||obj.largo/0.3048;obj.anchoFt=obj.anchoFt||obj.ancho/0.3048;obj.altoFt=obj.altoFt||obj.alto/0.3048;
        obj.largo=obj.largoFt*0.3048;obj.ancho=obj.anchoFt*0.3048;obj.alto=obj.altoFt*0.3048;
      }
      return obj;
    }).filter(x=>x.numero||x.descripcion);

    if(!nuevos.length)throw new Error('No se encontraron unidades válidas. Revisa los encabezados del archivo.');

    const sinNumero=nuevos.filter(x=>!x.numero);
    if(sinNumero.length)throw new Error(`Hay ${sinNumero.length} fila(s) sin Identificador / Número. Corrige el Excel antes de importar.`);

    const seen=new Map(),duplicadosArchivo=[];
    for(const x of nuevos){
      const k=x.numero.trim().toUpperCase();
      if(seen.has(k))duplicadosArchivo.push(`${x.numero} (filas ${seen.get(k)} y ${x._fila})`);
      else seen.set(k,x._fila);
    }
    if(duplicadosArchivo.length)throw new Error('Hay identificadores duplicados dentro del Excel: '+duplicadosArchivo.slice(0,10).join(', '));

    const existentes=new Set(cajas.map(c=>String(c.numero||'').trim().toUpperCase()).filter(Boolean));
    const repetidos=nuevos.filter(x=>existentes.has(x.numero.trim().toUpperCase()));
    if(repetidos.length)throw new Error('Estas unidades ya existen en la base y no se importaron: '+repetidos.slice(0,15).map(x=>x.numero).join(', '));

    nuevos.forEach(x=>delete x._fila);

    showStatus?.(`Importando ${nuevos.length} unidades directamente en Supabase...`,'info');
    const {data:importResult,error:importError}=await gmSupabase.rpc('cc_import_units',{p_unidades:nuevos});
    if(importError)throw importError;
    if(importResult?.ok===false){
      const dup=Array.isArray(importResult?.duplicados)?' · '+importResult.duplicados.join(', '):'';
      throw new Error((importResult?.detalle||importResult?.error||'Supabase rechazó la importación')+dup);
    }

    // Verificación adicional contra lo realmente persistido.
    const {data:verify,error:verifyError}=await gmSupabase.rpc('cc_load_all');
    if(verifyError)throw verifyError;
    const dbUnits=Array.isArray(verify?.state?.cajas)?verify.state.cajas:[];
    const dbIds=new Set(dbUnits.map(x=>String(x.numero||'').trim().toUpperCase()));
    const faltantes=nuevos.filter(x=>!dbIds.has(x.numero.trim().toUpperCase()));
    if(faltantes.length)throw new Error('Supabase no devolvió todas las unidades importadas: '+faltantes.map(x=>x.numero).join(', '));

    ccRevision=Number(verify?.revision||ccRevision);
    ccNormalizeState(verify?.state||{});
    ccRenderAll();

    await ccAudit({
      operacionId:ccAuditId('IMP'),
      accion:'IMPORTAR_UNIDADES',
      modulo:'INVENTARIO',
      submodulo:'IMPORTACION_EXCEL',
      detalle:`Importación confirmada en Supabase: ${nuevos.length} unidades`,
      datosNuevos:{cantidad:nuevos.length,unidades:nuevos.map(x=>({id:x.id,numero:x.numero,tipo:x.tipoUnidadNombre}))}
    });

