# Incident response

What to do when something goes wrong at or around a Wanted Level event, when the authorities contact
us, or when the site itself is compromised. Keep this open on launch night.

**Rule zero: if anyone is in immediate danger, call 112 first.** Everything below comes after.

## Severity

| Level | Examples | Response |
| --- | --- | --- |
| **S1: danger** | threat of violence, someone missing or hurt, a minor at risk, an event moved to a private address | act now, any hour; two admins involved |
| **S2: serious** | harassment at an event, organizer unreachable on the night, police or authority request, data leak | same day |
| **S3: normal** | wrong info, spam, a complaint | normal moderation queue (MODERATION.md) |

## Roles during an incident

- **Incident lead**: the first admin who picks it up. Owns the timeline, decides, writes the log.
- **Second admin**: double-checks actions, handles emails, takes over if the lead has to step away.
- One person speaks for Wanted Level externally (default: the incident lead). Nobody else comments.

## Step by step

### 1. Hide the event (seconds)

Admin → Events → the event → Actions → **Hide**, reason e.g. "Hidden while we look into a safety
concern." Hiding is reversible and tells the organizer only that it's under review.

If the admin panel is unavailable, in Supabase SQL Editor:

```sql
update public.events set hidden_at = now(), hidden_reason = 'admin'
where id = '<event-id>';
```

### 2. Set a legal hold if there may be an investigation

Admin → Events → Actions → **Set legal hold**, reason with a reference ("Police report PV ... /
incident 2026-11-19-01"). While set, the nightly job keeps the event's RSVPs and group posts beyond
30 days. The organizer is never told.

Important limit: a legal hold does **not** stop a user from deleting their own account, which erases
their RSVPs and posts. So, straight after setting the hold, **export the data** (step 3).

### 3. Preserve evidence

Run in Supabase SQL Editor and save the results (CSV) to the admin team's encrypted storage, never
to personal devices or chat:

```sql
-- Event, venue and organizer
select e.*, v.name as venue, v.address, v.lat, v.lng, o.org_name, u.email as organizer_email
from public.events e
join public.venues v on v.id = e.venue_id
join public.organizers o on o.user_id = e.organizer_id
join auth.users u on u.id = e.organizer_id
where e.id = '<event-id>';

-- People who RSVPed (only export when an authority's request requires it, see below)
select r.created_at, p.display_name, u.email
from public.rsvps r
join public.profiles p on p.id = r.user_id
join auth.users u on u.id = r.user_id
where r.event_id = '<event-id>';

-- Group board posts and reports
select * from public.group_posts where event_id = '<event-id>';
select * from public.reports where event_id = '<event-id>';

-- Every admin action on it
select * from public.moderation_actions where target_id = '<event-id>' order by created_at;
```

Write in the incident log: who exported what, when, why, and where it's stored.

### 4. Contact the organizer

Email from `hello@wantedlevel.be` to the organizer's account email (Admin → Users, search their
org or display name). If it's the night itself and urgent, call the venue on its public phone
number. Ask what happened; don't share who reported or any other user's details. Don't mention a
legal hold.

If the organizer is the problem (e.g. moved the event to a private place), **Remove** the event:
everyone who RSVPed gets an email that it's off and not to go. Consider suspending the organizer.

### 5. Tell attendees what they need to know, nothing more

Removing an event emails attendees automatically. For anything else (e.g. "the venue is closed
tonight"), email them from `hello@wantedlevel.be` with BCC, using the RSVP list from step 3. Facts
and instructions only.

### 6. Close

Decide: restore (Unhide), keep hidden, or remove. Release the legal hold only when the authority
confirms it's no longer needed. Write a short summary in the incident log within 48 hours:
timeline, decisions, what we'd do differently.

## Requests from police or other authorities

- **Only through proper channels.** We need a written request from a police service, the public
  prosecutor's office (parket) or an investigating judge, on official letterhead or from an official
  address, stating the legal basis and what exactly is needed. A phone call or a social media
  message is not enough.
- **Verify** the requester by calling back the service's official switchboard number (found
  independently, not the number in the request).
- **Share the minimum**: exactly what's requested, for the persons and period requested.
- **Emergency**: if the authority says there's an immediate threat to life, you may share what's
  needed to prevent it right away, then ask for the formal request afterwards and document both.
- **Log it**: request reference, date, what was shared, who approved. Keep it with the legal hold
  reason.
- **Tell the user?** Only if the request doesn't ask for confidentiality and a lawyer agrees. When in
  doubt, don't, and ask counsel (see LEGAL_REVIEW.md).
- Never hand over data because of pressure, threats or a request from a private person, journalist
  or another platform.

## Communication while an incident is ongoing

- **No public comment** on social media, Discord, press or the site while it's ongoing, not even
  "we're looking into it" with details.
- If asked, the one holding line (EN/NL):
  - "We're aware and we're handling it with the people involved. We don't comment on individual
    cases."
  - "We zijn op de hoogte en behandelen het met de betrokkenen. We doen geen uitspraken over
    individuele gevallen."
- Don't name people, venues or reporters. Don't speculate.
- After it's over, a short factual note is fine if it helps the community (e.g. a venue change).

## Security incidents (the site itself)

**Leaked key or compromised admin account**

1. Rotate the affected secret now: Supabase secret key (Project Settings → API Keys), Resend API key,
   Turnstile secret, MapTiler key, `RATE_LIMIT_SECRET`. Update Vercel and redeploy.
2. Compromised admin: in Supabase Authentication → Users, sign the user out of all sessions, remove
   their MFA factor, set their role to `user` in SQL. Check the moderation log for actions they took.
3. Review Supabase logs (API, Auth) and Vercel logs for the time window.

**Personal data breach**

1. Contain (step above), then establish what data, whose, and since when.
2. If there's a risk to people's rights, notify the Belgian Data Protection Authority
   (Gegevensbeschermingsautoriteit) **within 72 hours** of becoming aware, and inform affected users
   without undue delay if the risk is high. Document the breach either way.
3. Get legal advice (LEGAL_REVIEW.md) before public statements.

## Useful SQL

```sql
-- Find a user by email
select * from public.admin_find_users('someone@example.com');  -- only works from an aal2 session;
-- from the SQL editor instead:
select u.id, u.email, p.display_name, p.role, p.banned_at
from auth.users u join public.profiles p on p.id = u.id where u.email ilike '%someone%';

-- Unhide an event
update public.events set hidden_at = null, hidden_reason = null where id = '<event-id>';

-- Legal holds currently set
select h.*, e.title from public.event_legal_holds h join public.events e on e.id = h.event_id;
```

SQL editor changes bypass the moderation log. When you use them, add a log row afterwards so the
record stays complete:

```sql
insert into public.moderation_actions (admin_id, action, target_type, target_id, reason)
values ((select id from auth.users where email = 'you@example.com'), 'event_hidden', 'event',
        '<event-id>', 'Hidden via SQL during incident 2026-11-19-01');
```
