begin;

create index if not exists jobs_reminder_pending_idx
  on public.jobs (owner_id, reminder_at)
  where status = 'Scheduled'
    and reminder_at is not null
    and reminder_sent_at is null;

commit;

