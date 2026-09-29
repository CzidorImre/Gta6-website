# Moderation guide

For everyone with admin access to wantedlevel.be. Read this and [INCIDENT.md](INCIDENT.md) before
your first shift. Admin panel: https://wantedlevel.be/en/admin (you'll need your authenticator app).

## Principles

1. **Safety first, then fairness.** When in doubt about someone's safety, hide first and ask
   questions after. Hiding is reversible; a meetup at the wrong address isn't.
2. **Every action has a reason, and the person affected reads it.** The reason you type is logged in
   the moderation log *and emailed to the organizer or poster* ("Reason: …"). Write it for them:
   factual, short, polite. Never put another person's name, contact details or the reporter's
   identity in a reason.
3. **Nobody learns who reported them.** Not in reasons, not in replies.
4. **Legal holds are never mentioned** to the organizer or anyone outside the admin team.
5. **One person, one decision.** If you're unsure, leave the report open and ask another admin in the
   admin channel rather than acting twice.

## What happens automatically

| Trigger | What the system does |
| --- | --- |
| Safety report on an event or post | Hidden immediately (`hidden_reason = safety_report`), admins emailed |
| Any other report | Stays visible, admins emailed |
| New organizer application | Admins emailed |
| New or edited event | Saved as *pending*, not public, admins emailed |
| Organizer changes a venue's address or pin | Verified badge removed, its published events go back to *pending* |
| Ban | Upcoming RSVPs of that user deleted, their group posts hidden, their upcoming events hidden |
| Nightly (02:15 UTC) | RSVPs and group posts deleted 30 days after an event ends (unless legal hold) |

## Response times

| Queue | Normal weeks | Launch week (16–23 Nov 2026) |
| --- | --- | --- |
| Safety reports | within 12 h | within 1 h, 08:00–02:00; agree a rota |
| Other reports | within 48 h | within 12 h |
| Pending events | within 48 h | within 12 h |
| Organizer applications | within 3 days | within 24 h |
| Appeals (replies to our emails) | within 5 days | within 48 h |

Launch night itself (18→19 Nov): keep one admin on call until 03:00 with the INCIDENT.md steps open.

## What gets removed

Remove (event → **Remove**, post → **Remove post**, and consider a ban):

- Any private address or home: "come to my place", "DM me for the address", a residential
  address, a meetup point outside the venue. Venues must be public (bar, café, gaming café, student
  association room, library, community centre).
- Threats, harassment, hate or discrimination, sexual content, anything sexual involving minors
  (also follow INCIDENT.md: this is a police matter).
- Asking for or sharing someone else's personal data (phone, address, socials) on a group board.
- Events that charge entry, sell tickets, or are fronts for selling something. Venues selling food
  and drinks is fine.
- Events that ignore alcohol age law: a bar serving spirits must be 18+, beer and wine 16+.
- Spam, scams, links to unrelated sites, recruitment.
- Impersonation: pretending to be a venue or organization you're not, or using Rockstar / Take-Two
  logos or artwork as if official.

Hide and ask (event → **Hide**, then email the organizer from `hello@wantedlevel.be`):

- Details that look wrong (time, venue, capacity that the venue can't hold).
- Venue you can't verify exists or is public.

Leave it (dismiss the report with a reason):

- Trash talk about the game, jokes, disagreements that don't target a person.
- "Wrong info" that turns out to be right.

## How to handle each queue

### Reports (Admin → Reports)

Safety reports are at the top and are already hidden.

- **Remove event / Remove post**: the content is gone for good; all open reports on it close; the
  owner gets an email with your reason; for events, everyone who RSVPed is told it's off.
- **Dismiss and unhide / Dismiss**: the report was unfounded. If a safety report hid the content and
  no other safety report is open on it, it becomes visible again and the owner is told it's back.
- **Resolve, leave as is**: the report was right but no removal is needed (e.g. the organizer fixed
  the time after you emailed them). No email to the owner.
- **Hide post while reviewing**: for non-safety post reports that you want out of sight while you
  check.

A reporter who repeatedly files false safety reports to take events down is breaking the rules
(section 7). Warn by email once, then ban.

### Organizer applications (Admin → Applications)

Before approving, check:

1. The social link is real, active, and belongs to that venue or group (look at posts, not just the
   name).
2. The venue exists at that address on a map and is a public place.
3. The venue type fits (bars, cafés, gaming cafés, student association rooms).
4. For student associations: the association is recognized or clearly active.

If something is missing, **reject** with a reason that says what they can fix and reapply with.
Approving creates the organizer; they still need every event reviewed.

### Events (Admin → Events)

Check: public venue, sensible capacity for that venue, times, minimum age vs. alcohol, free entry,
description has nothing that breaks the rules. Then **Publish** (reason e.g. "Checked venue and
details") or **Reject** with what to fix. Use **Give venue verified badge** only after you've
confirmed the venue itself (phone call, visit, or its official website/socials announce the event).

### Users (Admin → Users)

Search by email, display name or user id.

- **Suspend** for: private-address attempts, harassment, threats, repeated spam, repeated false
  reports, lying about age to get into an 18+ event. Suspended users can still log in to see and
  delete their data; they can't RSVP, post, report or host.
- **Lift suspension** after a successful appeal.
- Admins can't be suspended from the panel. Remove the role in SQL first (see README "First admin").

### Moderation log (Admin → Log)

Read-only record of every admin action and reason. Review it together once a week during launch
month.

## Message templates

Paste into the reason field (it's emailed after "Reason:"), or adapt for direct emails from
`hello@wantedlevel.be`. Use the recipient's language (their account language decides the email
language; if you write directly, match what they wrote in).

**Event published**
- EN: `Checked the venue and details. Have a great launch night!`
- NL: `Locatie en details nagekeken. Veel plezier op de launchavond!`

**Event rejected: missing or wrong details**
- EN: `The start time/venue/capacity doesn't look right. Please correct it and send it in again.`
- NL: `Het beginuur/de locatie/de capaciteit lijkt niet te kloppen. Pas het aan en dien het opnieuw in.`

**Event rejected: minimum age vs alcohol**
- EN: `The venue serves spirits, so the event must be 18+. Please change the minimum age and resubmit.`
- NL: `De locatie schenkt sterkedrank, dus het event moet 18+ zijn. Pas de minimumleeftijd aan en dien opnieuw in.`

**Event removed: private place**
- EN: `Events on Wanted Level must take place at a public venue. Meeting at a private address is not allowed.`
- NL: `Events op Wanted Level moeten op een openbare locatie plaatsvinden. Afspreken op een privéadres is niet toegestaan.`

**Event removed: entry fee / selling**
- EN: `Events on Wanted Level must be free to attend. Please don't charge entry or sell tickets.`
- NL: `Events op Wanted Level zijn gratis toegankelijk. Vraag geen inkom en verkoop geen tickets.`

**Event hidden while we check**
- EN: `We received a report and are checking a few details with you by email. The event is hidden in the meantime.`
- NL: `We kregen een melding en kijken een paar details met je na via mail. Het event is intussen verborgen.`

**Post removed: personal data**
- EN: `Group board posts can't contain addresses, phone numbers or other people's contact details.`
- NL: `Berichten op het groepsbord mogen geen adressen, telefoonnummers of contactgegevens van anderen bevatten.`

**Post removed: harassment**
- EN: `Your post broke the community rules on respectful behaviour.`
- NL: `Je bericht ging in tegen de communityregels over respectvol gedrag.`

**Application rejected: can't verify**
- EN: `We couldn't verify the venue or organization from the link you gave. Reply with an official website or social page and we'll look again.`
- NL: `We konden de locatie of organisatie niet nagaan via de link die je gaf. Stuur een officiële website of sociale pagina en we kijken opnieuw.`

**Suspension**
- EN: `Your account was suspended for [short factual reason, e.g. repeated harassment on group boards]. Reply to this email if you want to appeal.`
- NL: `Je account is geschorst wegens [korte feitelijke reden, bv. herhaaldelijke intimidatie op groepsborden]. Beantwoord deze mail als je in beroep wil gaan.`

**Appeal accepted / suspension lifted**
- EN: `We looked at your appeal and lifted the suspension. Thanks for explaining.`
- NL: `We bekeken je beroep en hieven de schorsing op. Bedankt voor de uitleg.`

**Reply to a reporter (direct email, optional)**
- EN: `Thanks for reporting. We looked into it and took action where needed. We don't share details about other people's accounts.`
- NL: `Bedankt voor je melding. We hebben het bekeken en waar nodig ingegrepen. We delen geen details over andermans account.`

## Admin accounts

- Admin access requires TOTP MFA; the panel and the database refuse sessions without it.
- Use a personal account, never a shared one. Don't use admin accounts for organizing.
- Lost your phone: another admin removes your MFA factor in Supabase (Authentication → Users → your
  user → MFA factors), you enroll again.
- Leaving the team: set the role back to `user` in SQL and remove your MFA factor.
