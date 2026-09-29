# Legal review: DRAFT, pending legal review

Nothing on wantedlevel.be has been reviewed by a lawyer yet. The texts below are complete drafts
written to match what the code actually does, but they are **drafts, pending legal review**. This file
lists what a lawyer (Belgian privacy/consumer law, ideally with platform experience) should check
before launch, and the choices that were made on the cautious side instead of being treated as
settled.

## Draft documents

Each of these has a "DRAFT, PENDING LEGAL REVIEW" header comment:

| Document | English | Dutch |
| --- | --- | --- |
| Privacy policy | `src/content/legal/privacy.en.tsx` | `src/content/legal/privacy.nl.tsx` |
| Terms of use | `src/content/legal/terms.en.tsx` | `src/content/legal/terms.nl.tsx` |
| Community & safety rules | `src/content/legal/rules.en.tsx` | `src/content/legal/rules.nl.tsx` |
| Contact page | `src/app/[locale]/contact/page.tsx` + `messages/en.json` → `contact` | `messages/nl-BE.json` → `contact` |
| Emails (notifications) | `messages/en.json` → `email` | `messages/nl-BE.json` → `email` |
| Auth emails | `supabase/templates/*.html` (bilingual) | same |

**Must be filled in before launch:** the operator's name and address in both privacy policies
(`[OPERATOR NAME AND ADDRESS …]`). The project's admin notification address was left as a
placeholder in the brief (`{{ADMIN_EMAIL}}`) and is configured through `ADMIN_NOTIFICATION_EMAILS`.

## What the code does (so the texts can be checked against it)

- **Collected**: email, display name, date of birth, language, optional social link, rules acceptance
  time + version, RSVPs, group board posts (note, optional Discord handle), organizer applications,
  organizer/venue details (public once approved), reports (reporter visible to admins only;
  reported post text copied into the report), moderation log (admin, action, target, reason).
- **Not collected**: no phone numbers, no precise location of users, no payment data, no photos, no
  analytics cookies, no advertising or tracking IDs.
- **Cookies**: only the Supabase auth session cookie (httpOnly). Language is in the URL. Vercel Web
  Analytics is cookieless.
- **Retention (automatic, nightly)**: RSVPs + group posts 30 days after the event ends unless a legal
  hold is set; unconfirmed signups after 7 days; rate-limit counters (HMAC-hashed IP/email) after 2
  days; resolved reports 12 months after resolution. Profiles until account deletion. Moderation log:
  **no automatic deletion** (see question 5).
- **Account deletion**: self-service, immediate, cascades to profile, RSVPs, posts, applications,
  organizer record, venues and events. Reports the user filed stay with the reporter unlinked;
  moderation log rows stay with the user unlinked.
- **Minimum age**: 13 at signup, enforced in the database (a signup under 13 is refused before
  anything is stored). Event minimum ages 13/16/18 enforced at RSVP, measured on the event date.
- **Processors**: Supabase (EU, Frankfurt), Vercel (functions in Frankfurt; global CDN), Resend
  (email), Cloudflare (Turnstile), MapTiler (tiles, geocoding).

## Questions for counsel

### Data protection (GDPR, Belgian law of 30 July 2018)

1. **Controller identity.** Who is the controller: a natural person, a feitelijke vereniging, a vzw?
   This affects liability, the privacy policy and the contact details.
2. **Legal bases.** The draft uses contract (art. 6(1)(b)) for the account and legitimate interest
   (art. 6(1)(f)) for safety, moderation and abuse protection. Confirm, and whether a documented
   legitimate interest assessment is needed.
3. **Date of birth vs. data minimisation.** We store the full date of birth to enforce 13+ at signup
   and 16+/18+ per event on the event date. Alternatives: store only the birth year-month, or only
   age-band flags. Is the full date proportionate?
4. **Age 13.** Belgium's age of digital consent is 13 (art. 7 of the law of 30 July 2018), but it
   applies to consent-based processing and we rely on contract. Confirm 13+ without parental
   involvement is acceptable for a service that leads minors to physical meetups in bars, and whether
   parental notice is advisable for 13–15-year-olds.
5. **Retention periods.** Confirm 30 days (RSVPs/posts), 7 days (unconfirmed signups), 2 days (rate
   limits), 12 months (resolved reports). The moderation log currently has **no retention limit**;
   propose one. Reports are kept after the reporter deletes their account (unlinked): acceptable?
6. **Reported post snapshots.** A reported group post's text (and the author's display name and
   Discord handle) is copied into the report so moderators can review it, and stays after the author
   deletes the post or the account. Needed for moderation and evidence, but it's retention beyond
   the author's own deletion. Confirm or set a limit.
7. **Legal hold vs. erasure.** A legal hold stops the nightly purge but **does not** stop a user from
   deleting their account (we chose the privacy-protective behaviour; INCIDENT.md tells admins to
   export data when setting a hold). Should deletion be deferred for data under a legal hold (art.
   17(3)(e))? If so, the privacy policy must say so.
8. **Ban evasion.** When a suspended user deletes their account, nothing is kept, so they can sign up
   again with the same email. We did not keep hashed emails of banned users (privacy-protective).
   Is a limited "do not re-register" list justified for safety, and for how long?
9. **DPIA.** The service processes minors' data and arranges physical meetups. Is a DPIA (art. 35)
   required or advisable? We recommend doing one.
10. **Records of processing (art. 30)** and **DPAs** with Supabase, Vercel, Resend, Cloudflare and
    MapTiler; check each one's sub-processors and transfer mechanism (EU-US Data Privacy Framework or
    SCCs) and that the privacy policy's description is accurate.
11. **Security measures** worth stating (encryption in transit, RLS, MFA for admins, hashed rate
    limit keys): enough for art. 32, and should any be mentioned in the policy?

### Cookies and terminal equipment (ePrivacy, Belgian implementation)

12. Confirm the auth session cookie is strictly necessary (no consent needed).
13. Vercel Web Analytics is cookieless; confirm no consent is needed and that it's covered in the
    privacy policy correctly.
14. Cloudflare Turnstile runs scripts and reads device signals to detect bots. We treat it as
    necessary for security. Confirm, or do we need consent/opt-out?
15. Map tiles are loaded directly from MapTiler, exposing visitors' IP addresses to MapTiler.
    Acceptable as described, or should tiles be proxied?

### Platform rules (Digital Services Act) and liability

16. **Hosting service / online platform duties.** We host user content (events, posts). Check which
    DSA obligations apply (micro/small enterprise exemptions), in particular:
    - **Notice and action (art. 16):** our report button requires an account; anyone else can email
      hello@wantedlevel.be. Is that sufficient, or do we need a logged-out reporting form?
    - **Statement of reasons (art. 17):** our moderation emails state what was done and why. Do they
      need more (legal vs. terms ground, redress options)?
    - **Point of contact (arts. 11–12)** and terms requirements (art. 14).
17. **Liability for events.** Are we at risk of being seen as co-organizer? Is the disclaimer in the
    terms valid under Belgian consumer law (Book VI Code of Economic Law) for a free service? Is
    insurance advisable?
18. **Organizer obligations.** Alcohol age limits (16 beer/wine, 18 spirits), capacity, fire safety:
    is putting these on organizers in the terms enough? Should organizers accept separate organizer
    terms?
19. **Free-entry rule.** We require events to be free to attend (no money between users in v1). Is
    this clear and enforceable as written?

### Minors and safety

20. Safety advice in the rules mentions 112 and Awel (102). Confirm numbers and wording.
21. Is there any duty to verify age (beyond self-declared date of birth) for 16+/18+ events, or is
    venue ID checking at the door the right place for that?

### Law enforcement

22. Review the police/authority request procedure in INCIDENT.md: legal basis for disclosure,
    confidentiality, when we may notify the user, and emergency disclosure.

### Brand and trademarks

23. Use of "GTA 6" in descriptive text, the non-affiliation line, and the name/domain "Wanted Level"
    (a general gaming term). Confirm no trademark problem with Take-Two/Rockstar; no logos, fonts,
    artwork or game character names are used anywhere.

### Operational promises in the drafts

24. The privacy policy and terms promise to **email account holders before significant changes**.
    That's an operational commitment; keep it only if someone will actually do it.
25. The contact page says we "usually answer within a day". Confirm it's realistic.

## Choices made on the privacy-protective side

Implemented this way pending advice, each reversible:

- No locale cookie (language in the URL), no analytics cookies, no consent banner needed.
- Date of birth kept out of Supabase Auth metadata and JWTs; readable only by its owner and admins.
- Organizers see RSVP counts, never attendee names.
- Group board only visible to people with an RSVP; Discord handle optional.
- IPs and emails used for rate limiting are HMAC-hashed and kept 2 days.
- Account deletion is immediate and complete, even under a legal hold (question 7).
- No retention of banned users' identifiers after they delete their account (question 8).
- Unconfirmed signups (with a DOB) are deleted after 7 days.
