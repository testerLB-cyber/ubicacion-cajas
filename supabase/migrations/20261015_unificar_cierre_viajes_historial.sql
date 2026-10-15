-- Unifica el criterio de cierre de Historial con la ausencia del viaje en la respuesta vigente de GM.
-- La llegada real no se inventa: se registra el cierre de seguimiento y se conserva el último recorrido confirmado.
create or replace function public.gm_trip_close_on_missing_response()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $function$
begin
  if new.ended_at is null
     and old.ended_at is null
     and new.missing_checks > old.missing_checks
     and new.last_seen is not distinct from old.last_seen
     and new.last_seen < now() - interval '25 seconds' then
    new.ended_at := now();
    new.details := jsonb_set(
      jsonb_set(coalesce(new.details, '{}'::jsonb), '{cierreDetectadoPor}',
        '"AUSENCIA_EN_RESPUESTA_GM"'::jsonb, true),
      '{llegadaConfirmadaGM}', 'false'::jsonb, true
    );
    new.details := jsonb_set(new.details, '{cierreDetectadoAt}', to_jsonb(new.ended_at), true);
  end if;
  return new;
end
$function$;

drop trigger if exists gm_trip_close_on_missing_response on public.gm_trip_history;
create trigger gm_trip_close_on_missing_response
before update of missing_checks, ended_at on public.gm_trip_history
for each row execute function public.gm_trip_close_on_missing_response();

-- Reconciliar viajes que ya llevan ausencias registradas y no han reaparecido en GM.
update public.gm_trip_history
set ended_at = now(),
    details = jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(details, '{}'::jsonb), '{cierreDetectadoPor}',
          '"AUSENCIA_EN_RESPUESTA_GM"'::jsonb, true),
        '{llegadaConfirmadaGM}', 'false'::jsonb, true
      ),
      '{cierreDetectadoAt}', to_jsonb(now()), true
    )
where ended_at is null
  and missing_checks > 0
  and last_seen < now() - interval '25 seconds';
