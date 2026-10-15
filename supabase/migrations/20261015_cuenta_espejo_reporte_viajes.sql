alter table public.cc_cuentas_espejo_usuarios add column if not exists ver_reporte_viajes boolean not null default false;

CREATE OR REPLACE FUNCTION public.gm_reporte_trayecto(p_viaje_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_cliente text; v_interno boolean; t record; v_pts jsonb; v_geo jsonb; v_status jsonb;
 v_last timestamptz; v_count bigint; v_pos jsonb; v_salida timestamptz;
begin
 if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
 select exists(select 1 from public.cc_app_users where user_id=auth.uid() and activo=true) into v_interno;
 if not v_interno then
   select c.nombre into v_cliente from public.cc_cuentas_espejo_usuarios e join public.cc_clientes c on c.id=e.cliente_id
   where e.auth_user_id=auth.uid() and e.activo=true and e.ver_reporte_viajes=true and c.estatus='ACTIVO' limit 1;
   if v_cliente is null then raise exception 'SIN_ACCESO'; end if;
 end if;
 select h.*, coalesce(nullif(upper(trim(h.numero_viaje)),''),nullif(upper(trim(h.identificador_viaje)),''),h.trip_key) as report_key
 into t from public.gm_trip_history h where h.id=p_viaje_id and (v_interno or lower(trim(h.cliente))=lower(trim(v_cliente)));
 if not found then raise exception 'VIAJE_NO_DISPONIBLE'; end if;
 begin
   if coalesce(t.salida,'') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then v_salida:=t.salida::timestamptz; end if;
 exception when others then v_salida:=null;
 end;
 select max(gps_at),count(*) into v_last,v_count from public.gm_gps_positions where unidad=t.unidad and (v_interno or lower(trim(cliente))=lower(trim(v_cliente)));
 select jsonb_build_object('lat',latitud,'lon',longitud,'fecha',gps_at) into v_pos from public.gm_gps_positions where unidad=t.unidad and (v_interno or lower(trim(cliente))=lower(trim(v_cliente))) order by gps_at desc limit 1;
 with gr as (
  select h.* from public.gm_trip_history h where h.unidad=t.unidad
  and coalesce(nullif(upper(trim(h.numero_viaje)),''),nullif(upper(trim(h.identificador_viaje)),''),h.trip_key)=t.report_key
  and (v_interno or lower(trim(h.cliente))=lower(trim(v_cliente)))
 ), b as (
  select coalesce(v_salida,min(first_seen)-interval '2 minutes') started,
   case when bool_or(ended_at is null) then max(last_seen) else max(ended_at) end finished from gr
 ), keys as (select array_agg(distinct identificador_viaje) filter(where identificador_viaje is not null) ids from gr)
 select coalesce(jsonb_agg(jsonb_build_object('lat',p.latitud,'lon',p.longitud,'fecha',p.gps_at,'velocidad',p.velocidad_kmh) order by p.gps_at),'[]'::jsonb)
 into v_pts from public.gm_gps_positions p cross join b cross join keys
 where p.unidad=t.unidad and (v_interno or lower(trim(p.cliente))=lower(trim(v_cliente))) and p.gps_at>=b.started and p.gps_at<=b.finished
 and (p.numero_viaje=t.numero_viaje
   or (p.identificador_viaje is not null and p.identificador_viaje=any(keys.ids))
   or exists(select 1 from public.gm_unit_status_history s where s.unidad=p.unidad and s.gps_at=p.gps_at
    and (s.numero_viaje=t.numero_viaje or (s.identificador_viaje is not null and s.identificador_viaje=any(keys.ids)))));
 with gr as (
  select h.* from public.gm_trip_history h where h.unidad=t.unidad
  and coalesce(nullif(upper(trim(h.numero_viaje)),''),nullif(upper(trim(h.identificador_viaje)),''),h.trip_key)=t.report_key
  and (v_interno or lower(trim(h.cliente))=lower(trim(v_cliente)))
 )
 select coalesce(jsonb_agg(jsonb_build_object('nombre',g.geocerca,'evento',g.evento,'fecha',g.fecha_hora) order by g.recorded_at),'[]'::jsonb)
 into v_geo from (
   select distinct on (unidad,gps_at,geocerca,evento,fecha_hora) * from public.gm_geofence_event_history
   order by unidad,gps_at,geocerca,evento,fecha_hora,recorded_at
 ) g
 where g.unidad=t.unidad and (v_interno or lower(trim(g.cliente))=lower(trim(v_cliente))) and (g.numero_viaje=t.numero_viaje or exists(select 1 from gr where gr.identificador_viaje=g.identificador_viaje))
 and g.gps_at>=coalesce(v_salida,(select min(first_seen)-interval '2 minutes' from gr))
 and g.gps_at<=(select case when bool_or(ended_at is null) then max(last_seen) else max(ended_at) end from gr);
 with gr as (
  select h.* from public.gm_trip_history h where h.unidad=t.unidad
  and coalesce(nullif(upper(trim(h.numero_viaje)),''),nullif(upper(trim(h.identificador_viaje)),''),h.trip_key)=t.report_key
  and (v_interno or lower(trim(h.cliente))=lower(trim(v_cliente)))
 ), b as (
  select coalesce(v_salida,min(first_seen)-interval '2 minutes') started,
   case when bool_or(ended_at is null) then max(last_seen) else max(ended_at) end finished from gr
 ), keys as (select array_agg(distinct identificador_viaje) filter(where identificador_viaje is not null) ids from gr)
 select coalesce(jsonb_agg(jsonb_build_object('fecha',s.observed_at,'gpsAt',s.gps_at,'estatusGps',s.estatus_gps,'estatusViaje',s.estatus_viaje,'evento',s.evento,'numeroViaje',s.numero_viaje,'lat',s.latitud,'lon',s.longitud,'velocidad',s.velocidad_kmh) order by s.observed_at),'[]'::jsonb)
 into v_status from public.gm_unit_status_history s cross join b cross join keys
 where s.unidad=t.unidad and (v_interno or lower(trim(s.cliente))=lower(trim(v_cliente))) and s.observed_at>=b.started and s.observed_at<=b.finished
 and (s.numero_viaje=t.numero_viaje or (s.identificador_viaje is not null and s.identificador_viaje=any(keys.ids)));
 return jsonb_build_object('ok',true,'puntos',v_pts,'geocercas',v_geo,'estatus_unidad',v_status,
 'ultimo_gps_unidad',v_last,'ultima_posicion',v_pos,'unidad',t.unidad,'remolque',t.remolque,'operador',t.operador,'destino',t.destino,'origen',t.origen,'estatus',t.estatus,'numero_viaje',t.numero_viaje,'cliente',t.cliente,'total_lecturas_unidad',v_count,'salida_viaje',coalesce(v_salida,t.first_seen),'inicio_viaje',coalesce(v_salida,(v_pts->0->>'fecha')::timestamptz,t.first_seen),'fin_viaje',(select case when bool_or(ended_at is null) then max(last_seen) else max(ended_at) end from public.gm_trip_history where unidad=t.unidad and coalesce(nullif(upper(trim(numero_viaje)),''),nullif(upper(trim(identificador_viaje)),''),trip_key)=t.report_key),'perdido_api',(select bool_and(ended_at is not null) from public.gm_trip_history where unidad=t.unidad and coalesce(nullif(upper(trim(numero_viaje)),''),nullif(upper(trim(identificador_viaje)),''),trip_key)=t.report_key));
end
$function$;

CREATE OR REPLACE FUNCTION public.gm_reporte_viajes(p_desde date, p_hasta date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_cliente text; v_interno boolean; v_rows jsonb;
begin
 if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
 if p_desde is null or p_hasta is null or p_desde>p_hasta or p_hasta-p_desde>31 then raise exception 'RANGO_INVALIDO_MAXIMO_31_DIAS'; end if;
 select exists(select 1 from public.cc_app_users where user_id=auth.uid() and activo=true) into v_interno;
 if not v_interno then
   select c.nombre into v_cliente from public.cc_cuentas_espejo_usuarios e join public.cc_clientes c on c.id=e.cliente_id
   where e.auth_user_id=auth.uid() and e.activo=true and e.ver_reporte_viajes=true and c.estatus='ACTIVO' limit 1;
   if v_cliente is null then raise exception 'SIN_ACCESO'; end if;
 end if;
 with scoped as (
   select h.*, coalesce(nullif(upper(trim(h.numero_viaje)),''), nullif(upper(trim(h.identificador_viaje)),''), h.trip_key) as report_key
   from public.gm_trip_history h
   where h.first_seen < (p_hasta+1)::timestamptz
     and h.last_seen >= p_desde::timestamptz
     and (v_interno or lower(trim(h.cliente))=lower(trim(v_cliente)))
 ), grouped as (
   select unidad, report_key,
     min(first_seen) as first_seen,
     max(last_seen) as last_seen,
     (array_agg(ended_at order by first_seen desc, id desc))[1] as ended_at,
     (array_agg(id order by first_seen desc, id desc))[1] as id,
     (array_agg(numero_viaje order by first_seen desc, id desc))[1] as numero_viaje,
     (array_agg(identificador_viaje order by first_seen desc, id desc))[1] as identificador_viaje,
     (array_agg(operador order by first_seen desc, id desc))[1] as operador,
     (array_agg(cliente order by first_seen desc, id desc))[1] as cliente,
     (array_agg(origen order by first_seen desc, id desc))[1] as origen,
     (array_agg(destino order by first_seen desc, id desc))[1] as destino,
     (array_agg(remolque order by first_seen desc, id desc))[1] as remolque,
     (array_agg(estatus order by first_seen desc, id desc))[1] as estatus
   from scoped group by unidad, report_key
 )
 select coalesce(jsonb_agg(to_jsonb(t) order by t.first_seen desc),'[]'::jsonb) into v_rows
 from (select id,unidad,numero_viaje,identificador_viaje,operador,cliente,origen,destino,remolque,estatus,first_seen,last_seen,ended_at
       from grouped order by first_seen desc limit 500) t;
 return jsonb_build_object('ok',true,'viajes',v_rows);
end $function$;
