/*
 * DRAFT, PENDING LEGAL REVIEW. Not reviewed by a lawyer yet. See LEGAL_REVIEW.md.
 * Keep this in sync with what the code does (SPEC.md §3, §7, supabase/migrations/*retention*).
 */
import { CONTACT, LegalPage, List, Section } from './shared';

export default function PrivacyEn() {
  return (
    <LegalPage title="Privacy policy" updated="Draft of 29 September 2026">
      <p>
        Wanted Level (wantedlevel.be) is a free, non-commercial community website that lists GTA 6 launch night meetups at public
        venues in Antwerp. We collect as little as we can, delete it on a schedule, and never sell it or use it for advertising.
      </p>

      <Section title="Who is responsible">
        <p>
          The controller is the Wanted Level project, run by [OPERATOR NAME AND ADDRESS, to be completed before launch]. Contact us
          about anything in this policy at {CONTACT}.
        </p>
      </Section>

      <Section title="What we collect and why">
        <List>
          <li>
            <strong>Your account:</strong> email address (to log in with a link and to send you notifications), display name, date of
            birth, language, and an optional social link. We use your date of birth only to check that you are 13 or older and to
            check an event&apos;s minimum age when you RSVP. Nobody else can see it: not other users, not organizers.
          </li>
          <li>
            <strong>Rules acceptance:</strong> the date and time you accepted the community &amp; safety rules, and which version.
          </li>
          <li>
            <strong>RSVPs:</strong> which events you&apos;re going to. Organizers only see how many people are going, never who.
          </li>
          <li>
            <strong>Group board posts:</strong> your display name, your note and, only if you choose to add it, your Discord handle.
            Only people who RSVPed to the same event can see them.
          </li>
          <li>
            <strong>Organizers:</strong> the organization or venue name, social link, venue details and message from your application.
            Once approved, your organization name and social link, and your venues&apos; names and addresses, are shown publicly on
            your events.
          </li>
          <li>
            <strong>Reports:</strong> what you reported, the category and what you wrote. Moderators can see who filed a report; the
            people you report cannot. When a group board post is reported we keep a copy of its text with the report so moderators
            can review it.
          </li>
          <li>
            <strong>Moderation records:</strong> when a moderator takes an action (for example removes an event or suspends an
            account), we record who did it, what, and why.
          </li>
          <li>
            <strong>Abuse protection:</strong> to limit abuse (for example floods of signups or reports) we count requests per IP
            address and per email address. We store only a keyed one-way hash of these, never the address itself, for at most 2 days.
          </li>
        </List>
        <p>
          We process this data to provide the service you signed up for (GDPR art. 6(1)(b)) and, for safety, moderation and abuse
          protection, on the basis of our legitimate interest in keeping meetups safe (art. 6(1)(f)).
        </p>
      </Section>

      <Section title="Cookies and analytics">
        <p>
          We set only one kind of cookie: the login session cookie, which is strictly necessary to keep you signed in. Your language
          is part of the web address, not a cookie. We use Vercel Web Analytics, which counts page views without cookies and without
          building profiles of individual visitors. That&apos;s why there is no cookie banner.
        </p>
      </Section>

      <Section title="Services we use">
        <List>
          <li>Supabase: database and login, hosted in the EU (Frankfurt, Germany).</li>
          <li>Vercel: hosts the website; our server functions run in the EU (Frankfurt).</li>
          <li>Resend: sends our emails (login links and notifications).</li>
          <li>Cloudflare Turnstile: checks that forms (signup, login, organizer applications, reports) are sent by a person, not a bot.</li>
          <li>MapTiler: map tiles and address search. Your browser loads map images directly from MapTiler.</li>
        </List>
        <p>
          Some of these companies are based in the United States. Where data leaves the European Economic Area, we rely on the EU-US
          Data Privacy Framework or the European Commission&apos;s standard contractual clauses.
        </p>
      </Section>

      <Section title="How long we keep things">
        <List>
          <li>RSVPs and group board posts: deleted automatically 30 days after the event ends.</li>
          <li>Accounts that never confirmed their email: deleted after 7 days.</li>
          <li>Abuse-protection counters: deleted after 2 days.</li>
          <li>Resolved reports: deleted 12 months after they were resolved.</li>
          <li>Your account and profile: until you delete your account.</li>
          <li>
            Exception: if we receive an official request from the authorities about a specific event, we may keep that event&apos;s
            data (a &quot;legal hold&quot;) for as long as the request requires.
          </li>
        </List>
      </Section>

      <Section title="Deleting your account">
        <p>
          You can delete your account yourself, any time, in your account settings. This deletes your login, profile (including your
          date of birth), RSVPs, group board posts and organizer applications right away. If you are an organizer, your venues and
          events are deleted too and the people going are told the event is off. Reports you filed are kept but no longer linked to
          you, and moderation records stay without your name.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You have the right to access, correct, delete and port your data, and to object to or restrict how we use it. Most of this
          you can do yourself in your account; for anything else, email {CONTACT}. You can also complain to the Belgian Data Protection
          Authority (Gegevensbeschermingsautoriteit / Autorité de protection des données, dataprotectionauthority.be).
        </p>
      </Section>

      <Section title="Young people">
        <p>
          You must be at least 13 to create an account, the age from which you can agree to this yourself in Belgium. Events can have
          a higher minimum age (16 or 18, for example when a bar serves alcohol), and our system blocks RSVPs for anyone younger.
        </p>
      </Section>

      <Section title="Changes">
        <p>If we change this policy in a way that matters, we&apos;ll email account holders before the change takes effect.</p>
      </Section>
    </LegalPage>
  );
}
