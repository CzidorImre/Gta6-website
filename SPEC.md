# Wanted Level: v1 specification

Wanted Level (wantedlevel.be) is a free, non-commercial community site for Antwerp. It shows a map of
GTA 6 launch night meetups (launch: 19 November 2026, PS5 and Xbox Series X|S only) at **public
venues** so people without a console can find one, RSVP and go play together.

Not affiliated with Rockstar Games or Take-Two Interactive. "GTA 6" is only used descriptively.

This document is the source of truth for the data model, access rules, routes and flows. If code and
this file disagree, one of them is a bug.

---

## 1. Principles

1. **Enforce in the database.** The Supabase publishable key is public and any signed-in user can call
   PostgREST directly. Every rule that matters (who can read what, capacity, age, publishing, bans) is
   enforced by row-level security (RLS) or a `security definer` function, never only in the UI.
2. **Collect little, delete on schedule.** We store a date of birth (needed for age checks) and an email
   (needed to log in). Nothing else is required. RSVPs and group posts are deleted 30 days after an event
   ends. Account deletion is one click and cascades.
3. **Safety is visible.** Public venues only, reviewed organizers, a report button on every event and
   post, safety reports hide content instantly, and the rules are linked from every event page.
4. **No tracking.** Only strictly necessary cookies (the Supabase auth session). Vercel Web Analytics is
   cookieless. The language lives in the URL (`/en`, `/nl`), not a cookie.

## 2. Roles

| Role | How you get it | Can |
| --- | --- | --- |
| anonymous | not signed in | read published events, venues and organizers that have a published event, legal pages |
| user | sign up (13+) | RSVP, cancel, group board (only for events they RSVPed to), report, apply to organize, edit own profile, delete account |
| organizer | admin approves an application | everything a user can, plus create venues and events (events start `pending`) |
| admin | set manually in SQL (see README) | everything, but **only with an MFA (TOTP, `aal2`) session** |

`is_admin()` returns true only when `profiles.role = 'admin'` **and** the JWT claim `aal = 'aal2'`.
Admin pages redirect `aal1` sessions to the MFA screen; admin SQL functions raise for `aal1`.

Banned users (`profiles.banned_at is not null`) can still sign in, read, edit their profile and delete their
account, but cannot RSVP, post, report, apply or create/edit events.

## 3. Data model

All tables live in `public`, have RLS enabled, and start from `revoke all ... from anon, authenticated`
followed by explicit grants, so behaviour is the same whether or not the project auto-exposes new tables.
Timestamps are `timestamptz` (UTC); everything is displayed in `Europe/Brussels`.

### Enums

- `user_role`: `user`, `organizer`, `admin`
- `platform`: `ps5`, `xbox`
- `venue_kind`: `bar`, `gaming_cafe`, `student_association`, `other_public`
- `event_status`: `pending`, `published`, `rejected`, `cancelled`, `removed`
- `application_status`: `pending`, `approved`, `rejected`
- `report_category`: `safety`, `spam`, `wrong_info`, `other`
- `report_target`: `event`, `group_post`
- `report_status`: `open`, `actioned`, `dismissed`
- `moderation_action_type`: `application_approved`, `application_rejected`, `event_published`,
  `event_rejected`, `event_removed`, `event_hidden`, `event_restored`, `group_post_removed`,
  `group_post_restored`, `report_dismissed`, `report_actioned`, `user_banned`, `user_unbanned`,
  `legal_hold_set`, `legal_hold_released`, `venue_verified`, `venue_unverified`

### Tables

**profiles** (one per auth user, created by trigger on `auth.users` insert)

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | = `auth.users.id`, `on delete cascade` |
| display_name | text | 2–40 chars |
| date_of_birth | date | required, user must be 13+ at signup, not editable afterwards |
| social_url | text null | optional, `https://` only, ≤ 200 chars |
| locale | text | `en` or `nl-BE`, used for emails |
| role | user_role | default `user`, only changed by admin functions / SQL |
| rules_accepted_at | timestamptz null | set by `accept_community_rules()` |
| rules_version | text null | version string of the rules accepted |
| banned_at, ban_reason | timestamptz, text | set by `admin_set_ban()` |
| created_at, updated_at | timestamptz | |

**organizers** (public identity of an approved organizer)

| column | type | notes |
| --- | --- | --- |
| user_id | uuid pk | → profiles, cascade |
| org_name | text | 2–80 chars, shown on event pages |
| social_url | text null | shown on event pages |
| approved_at | timestamptz | |
| approved_by | uuid null | → profiles, set null |

**organizer_applications**

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid | → profiles, cascade. At most one `pending` per user (partial unique index) |
| org_name | text | organization or venue name |
| social_url | text | required, `https://` |
| venue_name, venue_address | text | which venue they want to host at |
| venue_kind | venue_kind | |
| message | text null | ≤ 1000 chars |
| status | application_status | default `pending` |
| reviewed_by, reviewed_at, review_reason | | set by admin |
| created_at | timestamptz | |

**venues**

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| organizer_id | uuid | → organizers, cascade |
| name | text | 2–80 |
| address | text | 5–200, must be a public venue (organizer confirms, admin reviews) |
| kind | venue_kind | |
| lat, lng | double precision | must fall inside the Antwerp area box (51.05–51.40 N, 4.15–4.65 E) |
| verified_at, verified_by | | the "verified venue" badge, admin only |
| created_at, updated_at | | |

**events**

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| organizer_id | uuid | → organizers, cascade |
| venue_id | uuid | → venues, cascade; must belong to the same organizer |
| title | text | 3–80 |
| description | text | ≤ 2000 |
| starts_at, ends_at | timestamptz | `ends_at > starts_at`, max 24 h |
| platforms | platform[] | non-empty, no duplicates |
| console_count | int | 1–100 |
| capacity | int | 1–500, never below `rsvp_count` |
| min_age | int | one of 13, 16, 18 |
| rsvp_count | int | maintained by trigger on `rsvps`, ≥ 0 |
| status | event_status | default `pending`; only admins can set `published`/`rejected`/`removed` |
| hidden_at, hidden_reason | | set instantly by a safety report or by an admin; hides from everyone but the organizer and admins |
| review_reason, reviewed_by, published_at | | |
| cancelled_at | timestamptz null | |
| created_at, updated_at | | |

"Visible" means `status in ('published','cancelled') and hidden_at is null`. Only `published`, upcoming
events appear on the map; a cancelled event's page stays reachable so people with the link see it's off.

**event_legal_holds** (admin only; kept out of `events` so organizers never learn about a hold)

| column | type | notes |
| --- | --- | --- |
| event_id | uuid pk | → events, cascade |
| reason | text | required |
| set_by | uuid null | → profiles, set null |
| set_at | timestamptz | |

**rsvps**

| column | type | notes |
| --- | --- | --- |
| event_id | uuid | → events, cascade |
| user_id | uuid | → profiles, cascade |
| created_at | timestamptz | |
| | | primary key `(event_id, user_id)` |

**group_posts** ("going solo, want a group" board)

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| event_id | uuid | → events, cascade |
| user_id | uuid | → profiles, cascade. One post per user per event |
| display_name | text | copied from the profile by trigger (users can't spoof it) |
| note | text | 1–280 |
| discord_handle | text null | optional, 2–37 chars, the user chooses to share it |
| hidden_at, hidden_reason | | safety report or admin |
| created_at, updated_at | | |

**reports**

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| reporter_id | uuid null | → profiles, **set null** (the report survives, unlinked, if the reporter deletes their account) |
| target_type | report_target | |
| event_id | uuid | → events, cascade (for post reports: the post's event) |
| group_post_id | uuid null | → group_posts, set null |
| target_snapshot | jsonb null | for post reports: copy of the note and Discord handle at report time, so moderators can review it if the author deletes it |
| category | report_category | |
| details | text null | ≤ 1000 |
| status | report_status | default `open` |
| resolved_by, resolved_at, resolution_note | | |
| created_at | timestamptz | |

**moderation_actions** (append-only audit log)

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| admin_id | uuid null | → profiles, set null |
| action | moderation_action_type | |
| target_type | text | `application`, `event`, `group_post`, `report`, `user`, `venue` |
| target_id | uuid | |
| target_user_id | uuid null | → profiles, set null; the person affected (gets the email) |
| reason | text | required, 3–1000 chars |
| created_at | timestamptz | |

**rate_limits** (fixed-window counters)

| column | type | notes |
| --- | --- | --- |
| bucket | text | e.g. `rsvp:user:<uuid>`, `signup:ip:<hmac>`; IPs are HMAC-hashed, never stored raw |
| window_start | timestamptz | |
| hits | int | |
| | | primary key `(bucket, window_start)` |

## 4. Row-level security and grants

`self` = `auth.uid()`. "fn only" = no table privilege for `anon`/`authenticated`; writes go through a
`security definer` function with its own checks. `service_role` bypasses RLS and is only used on the
server after the server has verified the session, Turnstile and rate limits.

| table | anon select | authenticated select | insert | update | delete |
| --- | --- | --- | --- | --- | --- |
| profiles | none | own row; admin: all | trigger only | own row, columns `display_name`, `social_url`, `locale` only | via `auth.users` cascade |
| organizers | if they have a visible event | same, plus own row; admin: all | fn only (admin approval) | fn only | cascade |
| organizer_applications | none | own; admin: all | fn only (`submit_organizer_application`, service role, after Turnstile) | fn only (admin) | cascade |
| venues | if linked to a visible event | same, plus own; admin: all | fn only (`save_venue`, organizer) | fn only | cascade |
| events | visible events | visible events, plus own (any status); admin: all | fn only (`save_event`, organizer, always `pending`) | fn only (`save_event` resets to `pending`, `cancel_event`, admin fns) | cascade |
| event_legal_holds | none | admin only | fn only (admin) | none | fn only (admin) |
| rsvps | none | own rows; admin: all | fn only (`rsvp_event`) | none | fn only (`cancel_rsvp`) |
| group_posts | none | own posts; posts on events you RSVPed to that aren't hidden; admin: all | own, only if you have an RSVP, rules accepted, not banned | own: `note`, `discord_handle` | own |
| reports | none | own (as reporter); admin: all | fn only (`submit_report`, service role, after Turnstile) | fn only (admin) | none |
| moderation_actions | none | admin only | fn only (admin fns) | none | none |
| rate_limits | none | none | fn only | fn only | fn only |

Functions callable by signed-in users (`authenticated`): `accept_community_rules`, `rsvp_event`,
`cancel_rsvp`, `save_venue`, `save_event`, `cancel_event`, and the `admin_*` functions (which raise
unless `is_admin()`). Functions callable only by `service_role`: `submit_report`,
`submit_organizer_application`, `check_rate_limit`, `purge_expired_data`. Everything else is revoked from
`public`.

## 5. Database functions

| function | who | what it enforces |
| --- | --- | --- |
| `handle_new_user()` | trigger on `auth.users` insert | requires `display_name` and a valid `date_of_birth` in user metadata, **rejects under 13**, creates the profile, then strips the DOB from `raw_user_meta_data` so it only lives in `profiles` |
| `accept_community_rules(version)` | user | sets `rules_accepted_at`, `rules_version` |
| `rsvp_event(event_id)` | user | rate limit (30 per 10 min); not banned; rules accepted; event published, not hidden, not started; **age on the event date ≥ `min_age`**; **`rsvp_count < capacity`** (event row locked `for update`); idempotent |
| `cancel_rsvp(event_id)` | user | rate limit; removes the RSVP and the user's group post for that event |
| `save_venue(...)` | organizer | owns the venue; coordinates inside the Antwerp box; editing clears the verified badge if the address or position moved |
| `save_event(...)` | organizer | not banned; venue belongs to them; field checks; new and edited events are always `pending` (editing a published event sends it back for review); capacity ≥ current RSVPs; 20 saves per day |
| `cancel_event(event_id)` | organizer | own event, sets `cancelled` |
| `submit_organizer_application(...)` | service role | not banned, not already an organizer, one pending at a time, 3 per day |
| `submit_report(...)` | service role | not banned; 10 per hour; **category `safety` sets `hidden_at` on the target immediately** |
| `admin_review_application(id, approve, reason)` | admin (aal2) | approve: creates `organizers` row, sets role `organizer` |
| `admin_review_event(id, action, reason)` | admin | `publish`, `reject`, `remove`, `hide`, `restore` |
| `admin_moderate_group_post(id, action, reason)` | admin | `remove` (delete, snapshot stays on reports), `hide`, `restore` |
| `admin_resolve_report(id, outcome, reason)` | admin | `dismiss` (restores the target if no other open safety report) or `action` (target stays hidden/removed) |
| `admin_set_ban(user_id, banned, reason)` | admin | can't ban admins or yourself |
| `admin_set_legal_hold(event_id, hold, reason)` | admin | inserts/deletes `event_legal_holds` |
| `admin_set_venue_verified(venue_id, verified, reason)` | admin | badge |
| `check_rate_limit(bucket, max, window_seconds)` | service role | fixed window counter |
| `purge_expired_data()` | pg_cron nightly 02:15 UTC | see §8 |

Every `admin_*` function writes one `moderation_actions` row with the admin, target, affected user and
reason (required). The server action that called it then emails the affected user.

## 6. Routes

Locale prefix: `/en` or `/nl` (internally `en` / `nl-BE`). `/` redirects based on `Accept-Language`.
All pages are dynamically rendered (nonce-based CSP).

| route | access | purpose |
| --- | --- | --- |
| `/{locale}` | public | map (default) or list (`?view=list`), filters `date`, `platform`, `spots=1`, launch countdown |
| `/{locale}/events/{id}` | public (visible events); organizer/admin see theirs | details, RSVP, add to calendar, group board, report |
| `/api/events/{id}/calendar?locale=` | public | `.ics` download |
| `/{locale}/signup`, `/{locale}/login` | public | magic-link forms with Turnstile |
| `/{locale}/auth/check-email` | public | "check your inbox" |
| `/auth/confirm` | public | verifies `token_hash`, sets session, redirects to a same-origin `next` |
| `/{locale}/account` | user | profile, my RSVPs, language, sign out, delete account |
| `/{locale}/rules` | public; accept button for users | community and safety rules |
| `/{locale}/report?type=event\|group_post&id=` | user | report form with Turnstile |
| `/{locale}/organizer` | user | application status or organizer dashboard |
| `/{locale}/organizer/apply` | user | application form with Turnstile |
| `/{locale}/organizer/events/new`, `/{locale}/organizer/events/{id}/edit` | organizer | venue + event form, geocoding, draggable pin |
| `/{locale}/admin` | admin aal2 | queue counts |
| `/{locale}/admin/applications`, `/events`, `/reports`, `/users`, `/log` | admin aal2 | moderation |
| `/{locale}/admin/mfa` | admin aal1+ | enroll or verify TOTP |
| `/{locale}/privacy`, `/terms`, `/contact` | public | legal drafts (EN + NL) |

## 7. Flows

**Signup.** Form: display name, date of birth, email, Turnstile. The server action rate-limits by IP
(5 / 10 min) and email (3 / hour), validates, and **rejects under-13 before anything is stored or sent**.
It then calls `signInWithOtp` with `display_name`, `date_of_birth` and `locale` as user metadata and the
Turnstile token (verified by Supabase Auth's captcha in production). The `handle_new_user` trigger repeats
the age check, so the raw Auth API can't bypass it. The confirmation email links to `/auth/confirm`.

**Login.** Email + Turnstile, rate-limited (10 / 10 min per IP, 5 / hour per email), `shouldCreateUser: false`.
The response is the same whether or not the email exists.

**First RSVP.** Event page → RSVP. If rules aren't accepted, the user is sent to `/rules?next=...`, reads,
ticks the box and accepts (stored with timestamp and version), then comes back and RSVPs. `rsvp_event`
enforces everything; the UI only mirrors it (full → button disabled; too young → explanation instead of a
button). Cancel removes the RSVP and the user's group post.

**Group board.** Visible only to people with an RSVP (and admins). One post each: note (≤ 280) and an
optional Discord handle. Display name comes from the profile. Each post has a report link.

**Organizer.** User applies (Turnstile, 3/day) → admins get an email → admin approves or rejects with a
reason → applicant gets an email. Approved organizers create a venue (address geocoded with MapTiler,
draggable pin to correct) and events. Events are `pending` → admin gets an email → admin publishes or
rejects with a reason → organizer gets an email. Editing a published event sends it back to `pending`.

**Report.** Signed-in user, Turnstile, 10/hour. Categories: safety, spam, wrong info, other.
`safety` hides the event/post **in the same transaction**. Every report emails the admins. Admins
dismiss (restores the target unless another safety report is open) or action it (remove/keep hidden),
always with a reason; the affected organizer/author gets an email with what happened and why.

**Ban.** Admin bans with a reason; the user gets an email. Banned users can still delete their account.

**Legal hold.** Admin toggles it on an event with a reason. While set, the nightly purge skips that
event's RSVPs and posts. See INCIDENT.md.

**Account deletion.** Settings → "Delete my account" → confirm → the server deletes the auth user with
the service role. Cascades remove profile, RSVPs, group posts, applications, organizer record, venues and
events (their attendees get a cancellation email first). Reports they filed stay, with `reporter_id` null.
Moderation log rows stay with `target_user_id`/`admin_id` null.

**Retention (`purge_expired_data`, nightly).**
- RSVPs and group posts of events that ended more than 30 days ago, unless the event has a legal hold.
- Unconfirmed auth users older than 7 days (people who never clicked the signup link).
- Rate-limit rows older than 2 days.
- Resolved reports older than 12 months, unless the event has a legal hold.

**Admin MFA.** Admin signs in with a magic link (`aal1`) → any admin route redirects to `/admin/mfa` →
enroll TOTP (QR + secret) or enter a code → session becomes `aal2` → admin routes and functions work.

## 8. Email

Sender `Wanted Level <noreply@wantedlevel.be>`, reply-to `hello@wantedlevel.be`.

- **Auth** (magic link, signup confirmation): Supabase Auth through Resend SMTP (`smtp.resend.com`).
  Templates in `supabase/templates/`, bilingual.
- **Notifications** (Resend API from the server; in local dev they go to Mailpit):
  new report → admins; new application → admins; new pending event → admins; application approved/
  rejected; event published/rejected/removed/hidden/restored; post removed; ban/unban; event cancelled or
  removed → people who RSVPed; account deleted → the user. Written in the recipient's `locale`.

Admin recipients: `ADMIN_NOTIFICATION_EMAILS` (comma-separated).

## 9. Security

- Nonce-based CSP with `strict-dynamic` from `src/proxy.ts`; `frame-ancestors 'none'`,
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. Allowed origins: MapTiler (tiles),
  Cloudflare Turnstile, Supabase. HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` with everything off, COOP `same-origin`.
- Service-role key only in server code (`server-only` import guard).
- Turnstile on signup, login, organizer application and reports.
- Postgres-backed rate limits on signup, login, RSVP, reports, applications, event saves, geocoding.
- Redirect targets (`next`) must be same-origin paths.

## 10. Out of scope for v1

House parties or private addresses, direct messages, payments, public user profiles, native apps,
social login. Organizers can't see attendee names (only counts).
