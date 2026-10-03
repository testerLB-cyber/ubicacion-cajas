-- Fix legacy service-sheet tariff lookup for Proformas.
-- Legacy captures may store a classification name in tipo_viaje and N/A in clasificacion.
-- Normalize those rows through cc_clasificaciones_hoja before matching cc_matriz_cobro.

create or replace function public.hs_proforma_importe(p_comprobacion_id text)
returns numeric
language sql
stable security definer
set search_path to 'public'
as $function$
with base0 as (
  select c.*,
         coalesce(
           (select u.tipo_unidad_general_id
              from public.cc_unidades u
             where upper(trim(u.numero))=upper(trim(coalesce(c.unidad_numero,'')))
             limit 1),
           (select tug.id
              from public.cc_tipos_unidad_general tug
             where tug.estatus='ACTIVO'
               and regexp_replace(upper(translate(trim(tug.nombre),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
                   = regexp_replace(upper(translate(trim(coalesce(c.unidad_tipo,'')),'ÁÉÍÓÚÜÑ','AEIOUUN')),'[^A-Z0-9]','','g')
             limit 1)
         ) as resolved_tipo_unidad_id
    from public.hs_comprobaciones c
   where c.id=p_comprobacion_id
),
base as (
  select b0.*,
         coalesce(legacy.tipo_viaje_normalizado, coalesce(b0.tipo_viaje,b0.servicio,'')) as tipo_viaje_resuelto,
         coalesce(legacy.clasificacion_normalizada, b0.clasificacion) as clasificacion_resuelta
    from base0 b0
    left join lateral (
      select tv.nombre as tipo_viaje_normalizado,
             cl.nombre as clasificacion_normalizada
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
),
calc as (
  select b.*,
         (
           select case
                    when coalesce(m.aplica,true)=false then null
                    when upper(coalesce(b.tipo_viaje_resuelto,''))='RESGUARDO'
                         and upper(coalesce(b.unidad_cobro,''))='HORA'
                      then round((coalesce(b.cantidad_cobro,0)/24.0)*m.precio,2)
                    when upper(coalesce(b.tipo_viaje_resuelto,''))='RESGUARDO'
                         and coalesce(b.cantidad_cobro,0)>0
                      then round(b.cantidad_cobro*m.precio,2)
                    when tv.clasificacion_manual and coalesce(b.cantidad_cobro,0)>0
                      then round(b.cantidad_cobro*m.precio,2)
                    else m.precio
                  end
             from public.cc_tipos_viaje tv
             join public.cc_matriz_cobro m
               on m.tipo_viaje_id=tv.id::text
              and m.cliente_id=b.cliente_id
              and m.estatus='ACTIVO'
             left join public.cc_clasificaciones_hoja cl
               on cl.id::text=m.clasificacion_id
            where upper(trim(tv.nombre))=upper(trim(coalesce(b.tipo_viaje_resuelto,'')))
              and (tv.clasificacion_manual
                   or upper(trim(coalesce(cl.nombre,'')))=upper(trim(coalesce(b.clasificacion_resuelta,''))))
              and (
                   m.tipo_unidad_id=b.resolved_tipo_unidad_id::text
                   or (
                     m.tipo_unidad_id is null
                     and m.cobra_cliente is null
                     and m.comisiona_operador is null
                   )
              )
            order by case when m.tipo_unidad_id=b.resolved_tipo_unidad_id::text then 0 else 1 end,
                     m.updated_at desc
            limit 1
         ) as tarifa_directa,
         (
           select case when count(distinct m.precio)=1 then max(m.precio) else null end
             from public.cc_tipos_viaje tv
             join public.cc_matriz_cobro m
               on m.tipo_viaje_id=tv.id::text
              and m.cliente_id=b.cliente_id
              and m.estatus='ACTIVO'
              and coalesce(m.aplica,true)=true
              and m.tipo_unidad_id is not null
             left join public.cc_clasificaciones_hoja cl
               on cl.id::text=m.clasificacion_id
            where upper(trim(tv.nombre))=upper(trim(coalesce(b.tipo_viaje_resuelto,'')))
              and (tv.clasificacion_manual
                   or upper(trim(coalesce(cl.nombre,'')))=upper(trim(coalesce(b.clasificacion_resuelta,''))))
         ) as tarifa_uniforme
    from base b
)
select coalesce(importe_calculado, tarifa_directa, tarifa_uniforme)
from calc
$function$;

revoke all on function public.hs_proforma_importe(text) from public, anon;
grant execute on function public.hs_proforma_importe(text) to authenticated;
