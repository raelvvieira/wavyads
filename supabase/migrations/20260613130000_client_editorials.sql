-- Editorial Criativo por cliente: guarda o VisualAnalysis gerado pelo Criativo Studio
create table if not exists public.client_editorials (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  design_system_doc text not null default '',
  visual_analysis   jsonb not null default '{}',
  updated_at        timestamptz not null default now(),
  unique(client_id)
);

alter table public.client_editorials enable row level security;

create policy "admins can manage client editorials"
  on public.client_editorials
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
