/*
 * DRAFT, PENDING LEGAL REVIEW. Not reviewed by a lawyer yet. See LEGAL_REVIEW.md.
 * Version 2026-10 (RULES_VERSION). Changing the substance of these rules? Bump RULES_VERSION in
 * src/lib/constants.ts and public.current_rules_version() so everyone accepts them again.
 */
import { Link } from '@/i18n/navigation';
import { CONTACT, LegalPage, List, Section } from './shared';

export default function RulesEn() {
  return (
    <LegalPage title="Community & safety rules" updated="Version 2026-10 (draft)">
      <p className="text-lg">
        Launch night should be fun for everyone: first-timers, regulars, the venue staff and the parents who drop someone off. These are
        the rules you accept before your first RSVP.
      </p>

      <Section title="1. Be decent">
        <List>
          <li>No harassment, threats, hate, discrimination or unwanted sexual attention. Online or at the venue.</li>
          <li>Trash talk about the game is fine. Going after a person is not.</li>
          <li>No selling, spam or recruiting for anything unrelated to the meetup.</li>
        </List>
      </Section>

      <Section title="2. Public places only">
        <List>
          <li>Every event is at a public venue. Never go to a private address you were given through Wanted Level.</li>
          <li>Don&apos;t post home addresses, phone numbers or anyone else&apos;s contact details on a group board.</li>
          <li>If someone tries to move the meetup to a private place, don&apos;t go, and report it.</li>
        </List>
      </Section>

      <Section title="3. Age limits are real">
        <List>
          <li>You need to be 13 to have an account. Events can be 16+ or 18+, often because the venue serves alcohol.</li>
          <li>Use your real date of birth. Venues may ask for ID at the door.</li>
          <li>In Belgium you must be 16 for beer and wine and 18 for spirits. Don&apos;t buy drinks for anyone under age.</li>
        </List>
      </Section>

      <Section title="4. The group board">
        <List>
          <li>It&apos;s for finding people to play with. Only people going to the same event can see it.</li>
          <li>Share your Discord handle only if you want to. Don&apos;t share anyone else&apos;s.</li>
          <li>Meet your new squad at the venue, not somewhere else first.</li>
        </List>
      </Section>

      <Section title="5. Stay safe on the night">
        <List>
          <li>Tell a friend or family member where you&apos;re going and when you&apos;ll be back.</li>
          <li>Plan your way home before you go, especially for late events. Check the last tram or bus, or arrange a lift.</li>
          <li>Keep your drink and your stuff in sight.</li>
          <li>If someone makes you uncomfortable, tell the venue staff or the organizer. You can always leave.</li>
          <li>
            In an emergency call <a href="tel:112" className="link font-bold">112</a>. Under 18 and want to talk to someone? Awel is free
            and anonymous: call <a href="tel:102" className="link font-bold">102</a> or chat at awel.be.
          </li>
        </List>
      </Section>

      <Section title="6. Organizers">
        <List>
          <li>Accurate info, a safe number of people, and someone responsible on site the whole night.</li>
          <li>Enforce the minimum age and the venue&apos;s house rules.</li>
          <li>Events are free to attend. Update or cancel the event on Wanted Level if anything changes.</li>
        </List>
      </Section>

      <Section title="7. Reporting">
        <p>
          Every event and every group board post has a report button. Choose <strong>Safety</strong> if someone could get hurt or feels
          unsafe: the event or post is hidden immediately until a moderator checks it. Other reports (spam, wrong info, other) go into the
          moderators&apos; queue. False reports to get events taken down are themselves against the rules.
        </p>
        <p>Can&apos;t use the button? Email {CONTACT}.</p>
      </Section>

      <Section title="8. What happens when rules are broken">
        <p>
          Moderators can hide or remove posts and events and suspend accounts. We always tell the person affected what we did and why.
          See the{' '}
          <Link href="/terms" className="link">
            terms of use
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
