begin;

-- Remap existing lead statuses into the linear pipeline.
update public.leads
set status = 'Quoted'
where status = 'Qualified';

update public.leads
set status = 'Won'
where status = 'ClosedWon';

update public.leads
set status = 'Lost'
where status in ('ClosedLost', 'Unqualified');

-- Remap integration default statuses so new website leads follow the pipeline.
update public.integrations
set default_status = 'Quoted'
where default_status = 'Qualified';

update public.integrations
set default_status = 'Won'
where default_status = 'ClosedWon';

update public.integrations
set default_status = 'Lost'
where default_status in ('ClosedLost', 'Unqualified');

commit;

