begin;

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz null;

comment on column public.profiles.onboarding_completed_at is
  'Set when the user finishes in-app onboarding (profile, integration, sample lead).';

commit;
