
insert into storage.buckets (id, name, public)
values ('social-media', 'social-media', true)
on conflict (id) do nothing;

create policy "Public can view social-media"
on storage.objects for select
using (bucket_id = 'social-media');

create policy "Admins can upload to social-media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'social-media' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can update social-media"
on storage.objects for update
to authenticated
using (bucket_id = 'social-media' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete social-media"
on storage.objects for delete
to authenticated
using (bucket_id = 'social-media' and public.has_role(auth.uid(), 'admin'));
