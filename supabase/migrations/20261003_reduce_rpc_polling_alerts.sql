create or replace function public.cc_ant_link_proofs_recent(p_minutes integer default 15)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_minutes integer:=greatest(1,least(coalesce(p_minutes,15),1440));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUERIDA'; end if;
  if not (public.cc_is_admin() or public.cc_has_permission('anticipos.ver')) then
    raise exception 'SIN_PERMISO_ANTICIPOS';
  end if;

  return jsonb_build_object(
    'ok',true,
    'rows',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,
        'anticipoId',c.anticipo_id,
        'folio',a.folio,
        'operador',o.nombre,
        'responsable',null,
        'concepto',c.concepto,
        'monto',c.monto,
        'createdAt',c.created_at
      ) order by c.created_at desc)
      from public.cc_ant_comprobaciones c
      join public.cc_anticipos a on a.id=c.anticipo_id
      left join public.cc_ant_operadores o on o.id=a.operador_id
      where c.estatus='ACTIVO'
        and upper(coalesce(c.origen,'')) in ('ENLACE','LINK','PUBLICO','QR')
        and c.created_at >= now() - make_interval(mins=>v_minutes)
    ),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.cc_ant_link_proofs_recent(integer) from public,anon;
grant execute on function public.cc_ant_link_proofs_recent(integer) to authenticated;
