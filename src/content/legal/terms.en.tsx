/*
 * DRAFT, PENDING LEGAL REVIEW. Not reviewed by a lawyer yet. See LEGAL_REVIEW.md.
 */
import { Link } from '@/i18n/navigation';
import { CONTACT, LegalPage, List, Section } from './shared';

export default function TermsEn() {
  return (
    <LegalPage title="Terms of use" updated="Draft of 29 September 2026">
      <p>
        These terms apply to wantedlevel.be (&quot;Wanted Level&quot;, &quot;we&quot;). By creating an account you agree to them and to
        the{' '}
        <Link href="/rules" className="link">
          community &amp; safety rules
        </Link>
        .
      </p>

      <Section title="What Wanted Level is">
        <p>
          A free, non-commercial listing of GTA 6 launch night meetups at public venues in and around Antwerp. Events are organized by
          the venues and groups listed on each event page, not by us. We don&apos;t sell tickets and don&apos;t handle money between
          users.
        </p>
        <p>
          Wanted Level is not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive. &quot;GTA 6&quot; is used
          only to describe what people play at these meetups.
        </p>
      </Section>

      <Section title="Your account">
        <List>
          <li>You must be at least 13 years old.</li>
          <li>Give your real date of birth. Lying about your age to get into an event is a reason to suspend your account.</li>
          <li>Keep access to your email address safe: anyone who can read your email can log in as you.</li>
          <li>You can delete your account at any time in your account settings.</li>
        </List>
      </Section>

      <Section title="Organizers">
        <List>
          <li>Only public venues: bars, cafés, gaming cafés, student association rooms and similar. Never a private home.</li>
          <li>Events listed on Wanted Level must be free to attend. Venues can sell food and drinks as usual.</li>
          <li>Give accurate information (time, place, capacity, consoles, minimum age) and update or cancel the event if it changes.</li>
          <li>Follow Belgian law and the venue&apos;s own rules, including alcohol age limits (16 for beer and wine, 18 for spirits), capacity and fire safety.</li>
          <li>Be reachable on the night and act when someone reports a problem to you.</li>
          <li>Every event is reviewed before it goes live, and again after you change it.</li>
        </List>
      </Section>

      <Section title="What you post">
        <p>
          You are responsible for what you write in your profile, event descriptions and group board posts. It must follow the community
          &amp; safety rules. You keep the rights to it and let us show it on Wanted Level for as long as it&apos;s online.
        </p>
      </Section>

      <Section title="Moderation">
        <p>
          We may hide or remove events and posts, and suspend accounts, when they break these terms or the rules or when someone&apos;s
          safety is at risk. A safety report hides an event or post automatically until a moderator looks at it. When we take action on
          your account or content, we email you what we did and why. If you disagree, reply to that email.
        </p>
      </Section>

      <Section title="Going to events">
        <p>
          You go to events at your own risk and responsibility. Follow the venue staff&apos;s instructions. We check organizers and
          events, but we can&apos;t be at every event and can&apos;t guarantee that an event happens as described. As far as Belgian
          law allows, we are not liable for what happens at events or for events being changed or cancelled. Nothing in these terms limits
          rights you have as a consumer that can&apos;t be limited by law.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          We may update these terms; if a change matters, we&apos;ll email account holders first. Belgian law applies. Questions:{' '}
          {CONTACT}.
        </p>
      </Section>
    </LegalPage>
  );
}
