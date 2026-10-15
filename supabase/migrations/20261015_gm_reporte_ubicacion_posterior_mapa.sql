create or replace function public.gm_reporte_ubicacion_posterior(p_viaje_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cliente text;
  v_interno boolean;
  t record;
  v_fin timestamptz;
  v_next jsonb;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  select exists(select 1 from public.cc_app_users where user_id=auth.uid() and activo=true) into v_interno;
  if not v_interno then
    select c.nombre into v_cliente
    from public.cc_cuentas_espejo_usuarios e
    join public.cc_clientes c on c.id=e.cliente_id
    where e.auth_user_id=auth.uid() and e.activo=true
      and e.ver_reporte_viajes=true and c.estatus='ACTIVO'
    limit 1;
    if v_cliente is null then raise exception 'SIN_ACCESO'; end if;
  end if;
  select h.*,
    coalesce(nullif(upper(trim(h.numero_viaje)),''),nullif(upper(trim(h.identificador_viaje)),''),h.trip_key) as report_key
  into t from public.gm_trip_history h
  where h.id=p_viaje_id
    and (v_interno or lower(trim(h.cliente))=lower(trim(v_cliente)));
  if not found then raise exception 'VIAJE_NO_DISPONIBLE'; end if;
  select case when bool_or(ended_at is null) then max(last_seen) else max(ended_at) end
  into v_fin from public.gm_trip_history h
  where h.unidad=t.unidad
    and coalesce(nullif(upper(trim(h.numero_viaje)),''),nullif(upper(trim(h.identificador_viaje)),''),h.trip_key)=t.report_key
    and (v_interno or lower(trim(h.cliente))=lower(trim(v_cliente)));
  if v_fin is null then
    select max(last_seen) into v_fin from public.gm_trip_history h
    where h.unidad=t.unidad
      and coalesce(nullif(upper(trim(h.numero_viaje)),''),nullif(upper(trim(h.identificador_viaje)),''),h.trip_key)=t.report_key
      and (v_interno or lower(trim(h.cliente))=lower(trim(v_cliente)));
  end if;
  select jsonb_build_object('lat',p.latitud,'lon',p.longitud,'fecha',p.gps_at,
    'unidad',p.unidad,'velocidad',p.velocidad_kmh)
  into v_next from public.gm_gps_positions p
  where p.unidad=t.unidad and p.gps_at>v_fin
    and p.latitud is not null and p.longitud is not null
    and (v_interno or lower(trim(p.cliente))=lower(trim(v_cliente)))
  order by p.gps_at asc limit 1;
  return jsonb_build_object('ok',true,'fin_viaje',v_fin,'ubicacion_posterior',v_next);
end
$function$;
revoke all on function public.gm_reporte_ubicacion_posterior(bigint) from public;
grant execute on function public.gm_reporte_ubicacion_posterior(bigint) to authenticated;
