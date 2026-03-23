begin;

-- Auto-dispatch queued lead push events to the Edge Function without requiring
-- a manually created Dashboard webhook.
-- NOTE: Function auth is disabled for lead-webpush in supabase/config.toml.
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

commit;

