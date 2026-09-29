-- Wanted Level: LOCAL DEVELOPMENT SEED. Never run against production.
-- Loaded by `supabase db reset` / `supabase start`. Venues and people are fictional.
--
-- Test accounts (log in with a magic link; emails land in Mailpit at http://127.0.0.1:54324):
--   admin@wantedlevel.test       admin. TOTP secret WANTEDLEVELLOCALADMINTOTPSEED234 (local only)
--   organizer@wantedlevel.test   organizer, "Pixel & Pint"
--   respawn@wantedlevel.test     organizer, "Respawn Gaming Café"
--   gamekring@wantedlevel.test   organizer, student association room
--   player@wantedlevel.test      regular adult user, rules accepted, 2 RSVPs and a group post
--   teen@wantedlevel.test        15-year-old user
--   applicant@wantedlevel.test   user with a pending organizer application
--   banned@wantedlevel.test      banned user

-- ---------------------------------------------------------------------------------------------
-- Users. Profiles are created by the handle_new_user trigger from raw_user_meta_data.
-- ---------------------------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', u.display_name, 'date_of_birth', u.dob::text, 'locale', u.locale),
  now(), now()
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@wantedlevel.test',     'Ada (admin)',   date '1990-01-15', 'en'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'organizer@wantedlevel.test', 'Lotte',         date '1992-03-10', 'nl-BE'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'respawn@wantedlevel.test',   'Karim',         date '1988-07-22', 'nl-BE'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'gamekring@wantedlevel.test', 'Jonas',         date '2003-11-02', 'nl-BE'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'player@wantedlevel.test',    'Sam',           date '2001-06-30', 'en'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'teen@wantedlevel.test',      'Mila',          (current_date - interval '15 years 2 months')::date, 'nl-BE'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'applicant@wantedlevel.test', 'Noor',          date '1996-09-09', 'en'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 'banned@wantedlevel.test',    'Troll',         date '1999-01-01', 'en')
) as u(id, email, display_name, dob, locale);

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@wantedlevel.test';

-- Admin TOTP factor with a fixed secret so local testing (and Playwright) can produce codes.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        'Local dev authenticator', 'totp', 'verified', now(), now(), 'WANTEDLEVELLOCALADMINTOTPSEED234');

update public.profiles
set rules_accepted_at = now(), rules_version = public.current_rules_version()
where id in (
  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000008'
);

update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'organizer'
where id in ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
             'a0000000-0000-4000-8000-000000000004');
update public.profiles set banned_at = now(), ban_reason = 'Seed: spam on group boards'
where id = 'a0000000-0000-4000-8000-000000000008';

-- ---------------------------------------------------------------------------------------------
-- Organizers, applications
-- ---------------------------------------------------------------------------------------------
insert into public.organizers (user_id, org_name, social_url, approved_by) values
  ('a0000000-0000-4000-8000-000000000002', 'Pixel & Pint', 'https://www.instagram.com/example_pixelpint', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000003', 'Respawn Gaming Café', 'https://www.facebook.com/example.respawn', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000004', 'Gamekring Stadscampus', 'https://discord.gg/example-gamekring', 'a0000000-0000-4000-8000-000000000001');

insert into public.organizer_applications
  (user_id, org_name, social_url, venue_name, venue_address, venue_kind, message, status, reviewed_by, reviewed_at, review_reason)
values
  ('a0000000-0000-4000-8000-000000000002', 'Pixel & Pint', 'https://www.instagram.com/example_pixelpint',
   'Pixel & Pint', 'Groenplaats 99, 2000 Antwerpen', 'bar', 'We have a big screen and six consoles.',
   'approved', 'a0000000-0000-4000-8000-000000000001', now(), 'Known local bar, checked socials.'),
  ('a0000000-0000-4000-8000-000000000007', 'Borgerhout Board & Pad', 'https://www.instagram.com/example_boardpad',
   'Board & Pad', 'Turnhoutsebaan 999, 2140 Antwerpen', 'gaming_cafe', 'Small café, 3 consoles, happy to host a launch night.',
   'pending', null, null, null);

-- ---------------------------------------------------------------------------------------------
-- Venues (fictional names, public areas of central Antwerp)
-- ---------------------------------------------------------------------------------------------
insert into public.venues (id, organizer_id, name, address, kind, lat, lng, verified_at, verified_by) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'Pixel & Pint', 'Groenplaats 99, 2000 Antwerpen', 'bar', 51.21862, 4.40062,
   now(), 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
   'Respawn Gaming Café', 'De Keyserlei 999, 2018 Antwerpen', 'gaming_cafe', 51.21806, 4.41731,
   now(), 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
   'Gamekring room, Stadscampus', 'Prinsstraat 999, 2000 Antwerpen', 'student_association', 51.22270, 4.41000,
   null, null);

-- ---------------------------------------------------------------------------------------------
-- Events: launch night is 18→19 November 2026. After that date the seed rolls to next week so
-- local development always has upcoming events.
-- ---------------------------------------------------------------------------------------------
do $$
declare
  base date := case when current_date < date '2026-11-18' then date '2026-11-18' else current_date + 7 end;
  tz constant text := 'Europe/Brussels';
begin
  insert into public.events
    (id, organizer_id, venue_id, title, description, starts_at, ends_at, platforms, console_count, capacity, min_age, status, published_at)
  values
    ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
     'Midnight launch at Pixel & Pint',
     'Countdown on the big screen, then six consoles unlocked at midnight. Snacks at the bar, bring your own controller if you have one. 18+ because we serve spirits.',
     (base + time '22:00') at time zone tz, (base + 1 + time '03:00') at time zone tz,
     '{ps5,xbox}', 6, 40, 18, 'published', now()),
    ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002',
     'Launch day at Respawn',
     'Ten PS5 stations, one-hour slots so everyone gets to play. Soft drinks and toasties. All ages 13+.',
     (base + 1 + time '12:00') at time zone tz, (base + 1 + time '20:00') at time zone tz,
     '{ps5}', 10, 30, 13, 'published', now()),
    ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003',
     'Student launch night',
     'Gamekring opens the association room for launch night. Free for everyone 16+, student card not required. Two PS5s and two Xboxes on the projector.',
     (base + 1 + time '19:00') at time zone tz, (base + 2 + time '01:00') at time zone tz,
     '{ps5,xbox}', 4, 25, 16, 'published', now()),
    ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002',
     'Saturday co-op session',
     'Small group, one Xbox corner. Full already? Check back, people cancel.',
     (base + 3 + time '13:00') at time zone tz, (base + 3 + time '19:00') at time zone tz,
     '{xbox}', 1, 2, 16, 'published', now()),
    ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
     'Second night at Pixel & Pint',
     'Round two for everyone who missed midnight. Waiting for review.',
     (base + 1 + time '20:00') at time zone tz, (base + 2 + time '01:00') at time zone tz,
     '{ps5,xbox}', 6, 40, 18, 'pending', null);
end;
$$;

-- RSVPs (the trigger keeps events.rsvp_count in sync). "Saturday co-op session" ends up full.
insert into public.rsvps (event_id, user_id) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003');

insert into public.group_posts (event_id, user_id, display_name, note, discord_handle) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'Sam',
   'Going solo, first time at a launch night. Happy to team up for the first missions!', 'sam_plays');
