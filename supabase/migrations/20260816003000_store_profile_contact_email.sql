-- Contact email is private profile metadata. Leaderboards continue to read
-- only the denormalised display name in verified season rows.
alter table public.profiles
  add column contact_email text;

alter table public.profiles
  add constraint profiles_contact_email_length
  check (contact_email is null or char_length(contact_email) between 3 and 320);

comment on column public.profiles.contact_email is
  'Private contact metadata. It is protected by profiles own-row RLS and never exposed by leaderboard views.';
