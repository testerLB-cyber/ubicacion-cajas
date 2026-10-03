-- Liquidaciones: cálculo seguro de comisión, compatibilidad con capturas legacy
-- y bloqueo de liquidaciones parciales cuando falte una tarifa.

create or replace function public.hs_liquidacion_tarifa(p_comprobacion_id text)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
with base0 as (
  select c.*,
         coalesce(nullif(u.tipo_unidad_general_nombre,''),c.unidad_tipo) as tipo_unidad_resuelta
    from public.hs_comprobaciones c
    left join public.cc_unidades u
      on upper(trim(coalesce(u.numero,'')))=upper(trim(coalesce(c.unidad_numero,'')))
   where c.id=p_comprobacion_id
),
base as (
  select b0.*,
         coalesce(legacy.tipo_viaje_normalizado,coalesce(b0.tipo_viaje,b0.servicio,'')) as tipo_viaje_resuelto,
         coalesce(legacy.clasificacion_normalizada,b0.clasificacion) as clasificacion_resuelta
    from base0 b0
    left join lateral (
      select tv.nombre as tipo_viaje_normalizado,cl.nombre as clasificacion_normalizada
        from public.cc_clasificaciones_hoja cl
        join public.cc_tipos_viaje tv on tv.id::text=cl.tipo_viaje_id
       where cl.estatus='ACTIVO'
         and tv.estatus='ACTIVO'
         and upper(trim(coalesce(b0.clasificacion,''))) in ('','N/A','NA','NO APLICA')
         and regexp_replace(upper(translate(trim(cl.nombre),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
             = regexp_replace(upper(translate(trim(coalesce(b0.tipo_viaje,b0.servicio,'')),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
         and not exists (
           select 1
             from public.cc_tipos_viaje tv2
            where tv2.estatus='ACTIVO'
              and regexp_replace(upper(translate(trim(tv2.nombre),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
                  = regexp_replace(upper(translate(trim(coalesce(b0.tipo_viaje,b0.servicio,'')),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
         )
       order by cl.updated_at desc
       limit 1
    ) legacy on true
)
select (
  select case
           when coalesce(t.aplica,true)=false then 0::numeric
           when tv.clasificacion_manual and coalesce(b.cantidad_cobro,0)>0
             then round(coalesce(b.cantidad_cobro,0)*t.tarifa,2)
           else t.tarifa
         end
    from base b
    join public.cc_tipos_viaje tv
      on regexp_replace(upper(translate(trim(tv.nombre),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
         = regexp_replace(upper(translate(trim(coalesce(b.tipo_viaje_resuelto,'')),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
     and tv.estatus='ACTIVO'
    join public.cc_tarifas_comisiones t
      on t.tipo_movimiento_id=tv.id::text
     and t.estatus='ACTIVO'
     and regexp_replace(upper(translate(trim(coalesce(t.tipo_unidad_nombre,'')),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
         = regexp_replace(upper(translate(trim(coalesce(b.tipo_unidad_resuelta,'')),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
   where (
          tv.clasificacion_manual
          and (
            upper(trim(coalesce(t.clasificacion_nombre,''))) in ('CANTIDAD DE HORAS','CANTIDAD DE DÍAS','CANTIDAD DE DIAS')
            or t.clasificacion_id is null
          )
         )
      or (
          not tv.clasificacion_manual
          and regexp_replace(upper(translate(trim(coalesce(t.clasificacion_nombre,'')),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
              = regexp_replace(upper(translate(trim(coalesce(b.clasificacion_resuelta,'')),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
         )
   order by t.updated_at desc
   limit 1
)
from base
$function$;

revoke all on function public.hs_liquidacion_tarifa(text) from public,anon;
grant execute on function public.hs_liquidacion_tarifa(text) to authenticated;

create or replace function public.hs_liquidaciones_preview(p_desde date,p_hasta date,p_operador_id text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare a public.cc_app_users;
begin
  select * into a from public.cc_app_users where user_id=auth.uid() and activo=true;
  if not found then return jsonb_build_object('ok',false,'error','NO_AUTORIZADO'); end if;
  if a.rol<>'ADMIN' and coalesce((a.permisos #>> '{hojas_servicio,ver}')::boolean,false)=false then
    return jsonb_build_object('ok',false,'error','SIN_PERMISO');
  end if;

  return jsonb_build_object('ok',true,'rows',coalesce((
    select jsonb_agg(to_jsonb(q) order by q.operador_nombre,q.fecha_servicio,q.folio)
    from (
      select c.id comprobacion_id,c.folio_id,f.folio,
             coalesce(c.fecha_uso,c.fecha,c.created_at::date) fecha_servicio,
             c.operador_id,c.operador_nombre,c.unidad_numero,
             coalesce(nullif(u.tipo_unidad_general_nombre,''),c.unidad_tipo) tipo_unidad,
             c.tipo_viaje tipo_movimiento,c.clasificacion,
             public.hs_liquidacion_tarifa(c.id) tarifa,
             case when public.hs_liquidacion_tarifa(c.id) is null then 'SIN_TARIFA' else 'CALCULADA' end estado_tarifa
        from public.hs_comprobaciones c
        left join public.hs_folios f on f.id=c.folio_id
        left join public.cc_unidades u on upper(trim(coalesce(u.numero,'')))=upper(trim(coalesce(c.unidad_numero,'')))
        left join public.hs_liquidacion_detalles ld on ld.comprobacion_id=c.id
        left join public.hs_liquidaciones l on l.id=ld.liquidacion_id and l.estatus<>'CANCELADA'
       where coalesce(c.fecha_uso,c.fecha,c.created_at::date) between p_desde and p_hasta
         and coalesce(c.tipo_persona,'OPERADOR')='OPERADOR'
         and c.operador_id is not null
         and (p_operador_id is null or p_operador_id='' or c.operador_id=p_operador_id)
         and l.id is null
    ) q
  ),'[]'::jsonb));
end
$function$;

create or replace function public.hs_liquidacion_generar(p_desde date,p_hasta date,p_operador_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  a public.cc_app_users;
  v_id text;
  v_nombre text;
  v_total numeric:=0;
  v_count int:=0;
  v_faltantes int:=0;
begin
  select * into a from public.cc_app_users where user_id=auth.uid() and activo=true;
  if not found then return jsonb_build_object('ok',false,'error','NO_AUTORIZADO'); end if;
  if a.rol<>'ADMIN' and coalesce((a.permisos #>> '{hojas_servicio,comprobar}')::boolean,false)=false then
    return jsonb_build_object('ok',false,'error','SIN_PERMISO');
  end if;

  select max(c.operador_nombre) into v_nombre
    from public.hs_comprobaciones c
   where c.operador_id=p_operador_id;
  if v_nombre is null then return jsonb_build_object('ok',false,'error','OPERADOR_SIN_HOJAS'); end if;

  select count(*) into v_faltantes
    from public.hs_comprobaciones c
    left join public.hs_liquidacion_detalles ld on ld.comprobacion_id=c.id
    left join public.hs_liquidaciones l on l.id=ld.liquidacion_id and l.estatus<>'CANCELADA'
   where coalesce(c.fecha_uso,c.fecha,c.created_at::date) between p_desde and p_hasta
     and c.operador_id=p_operador_id
     and coalesce(c.tipo_persona,'OPERADOR')='OPERADOR'
     and l.id is null
     and public.hs_liquidacion_tarifa(c.id) is null;

  if v_faltantes>0 then
    return jsonb_build_object('ok',false,'error','FALTAN_TARIFAS_COMISION','faltantes',v_faltantes);
  end if;

  v_id:=gen_random_uuid()::text;
  insert into public.hs_liquidaciones(id,operador_id,operador_nombre,fecha_desde,fecha_hasta,creado_por,creado_por_nombre)
  values(v_id,p_operador_id,v_nombre,p_desde,p_hasta,auth.uid(),coalesce(a.nombre,a.email));

  insert into public.hs_liquidacion_detalles(
    liquidacion_id,comprobacion_id,folio_id,folio,fecha_servicio,operador_id,operador_nombre,
    unidad_numero,tipo_unidad,tipo_movimiento,clasificacion,tarifa,importe
  )
  select v_id,c.id,c.folio_id,f.folio,coalesce(c.fecha_uso,c.fecha,c.created_at::date),
         c.operador_id,c.operador_nombre,c.unidad_numero,
         coalesce(nullif(u.tipo_unidad_general_nombre,''),c.unidad_tipo),
         c.tipo_viaje,c.clasificacion,
         public.hs_liquidacion_tarifa(c.id),
         public.hs_liquidacion_tarifa(c.id)
    from public.hs_comprobaciones c
    left join public.hs_folios f on f.id=c.folio_id
    left join public.cc_unidades u on upper(trim(coalesce(u.numero,'')))=upper(trim(coalesce(c.unidad_numero,'')))
    left join public.hs_liquidacion_detalles ex on ex.comprobacion_id=c.id
    left join public.hs_liquidaciones el on el.id=ex.liquidacion_id and el.estatus<>'CANCELADA'
   where coalesce(c.fecha_uso,c.fecha,c.created_at::date) between p_desde and p_hasta
     and c.operador_id=p_operador_id
     and coalesce(c.tipo_persona,'OPERADOR')='OPERADOR'
     and el.id is null;

  select count(*),coalesce(sum(importe),0)
    into v_count,v_total
    from public.hs_liquidacion_detalles
   where liquidacion_id=v_id;

  if v_count=0 then
    delete from public.hs_liquidaciones where id=v_id;
    return jsonb_build_object('ok',false,'error','NO_HAY_HOJAS_PENDIENTES');
  end if;

  update public.hs_liquidaciones
     set total_hojas=v_count,total_comision=v_total
   where id=v_id;

  return jsonb_build_object('ok',true,'liquidacionId',v_id,'totalHojas',v_count,'totalComision',v_total);
end
$function$;

revoke all on function public.hs_liquidaciones_preview(date,date,text) from public,anon;
revoke all on function public.hs_liquidacion_generar(date,date,text) from public,anon;
grant execute on function public.hs_liquidaciones_preview(date,date,text) to authenticated;
grant execute on function public.hs_liquidacion_generar(date,date,text) to authenticated;
