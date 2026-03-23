begin;

-- Ensure the lead push dispatch trigger exists after lead_push_events table creation.
do $$
begin
  if to_regclass('public.lead_push_events') is not null then
    drop trigger if exists trg_lead_push_events_http_dispatch on public.lead_push_events;
    create trigger trg_lead_push_events_http_dispatch
    after insert on public.lead_push_events
    for each row
    execute function supabase_functions.http_request(
      'https://bwbsxgjvuxuedejxusnv.supabase.co/functions/v1/lead-webpush',
      'POST',
      '{"Content-Type":"application/json"}',
      '{}',
      '5000'
    );
  end if;
end;
$$;

commit;

