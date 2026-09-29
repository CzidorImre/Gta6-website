/*
 * ONTWERP, IN AFWACHTING VAN JURIDISCHE CONTROLE (draft, pending legal review). Zie LEGAL_REVIEW.md.
 */
import { Link } from '@/i18n/navigation';
import { CONTACT, LegalPage, List, Section } from './shared';

export default function TermsNl() {
  return (
    <LegalPage title="Gebruiksvoorwaarden" updated="Ontwerp van 29 september 2026">
      <p>
        Deze voorwaarden gelden voor wantedlevel.be (&quot;Wanted Level&quot;, &quot;wij&quot;). Door een account te maken ga je ermee
        akkoord, en met de{' '}
        <Link href="/rules" className="link">
          community- &amp; veiligheidsregels
        </Link>
        .
      </p>

      <Section title="Wat Wanted Level is">
        <p>
          Een gratis, niet-commercieel overzicht van GTA 6-launchavonden op openbare locaties in en rond Antwerpen. De events worden
          georganiseerd door de locaties en groepen die op elke eventpagina staan, niet door ons. We verkopen geen tickets en er gaat geen
          geld tussen gebruikers via ons.
        </p>
        <p>
          Wanted Level is niet verbonden aan, gesteund of gesponsord door Rockstar Games of Take-Two Interactive. &quot;GTA 6&quot;
          gebruiken we enkel om te beschrijven wat er op deze meetups gespeeld wordt.
        </p>
      </Section>

      <Section title="Je account">
        <List>
          <li>Je moet minstens 13 jaar zijn.</li>
          <li>Geef je echte geboortedatum op. Liegen over je leeftijd om binnen te raken op een event is een reden om je account te schorsen.</li>
          <li>Bescherm de toegang tot je e-mailadres: wie je mail kan lezen, kan als jou inloggen.</li>
          <li>Je kan je account altijd wissen in je accountinstellingen.</li>
        </List>
      </Section>

      <Section title="Organisatoren">
        <List>
          <li>Enkel openbare locaties: bars, cafés, gamingcafés, lokalen van studentenverenigingen en gelijkaardige plekken. Nooit een privéwoning.</li>
          <li>Events op Wanted Level zijn gratis toegankelijk. Locaties mogen gewoon eten en drinken verkopen.</li>
          <li>Geef correcte informatie (uur, plaats, capaciteit, consoles, minimumleeftijd) en pas het event aan of annuleer het als er iets verandert.</li>
          <li>Volg de Belgische wet en de regels van de locatie, ook de leeftijdsgrenzen voor alcohol (16 voor bier en wijn, 18 voor sterkedrank), capaciteit en brandveiligheid.</li>
          <li>Wees op de avond zelf bereikbaar en onderneem actie als iemand je een probleem meldt.</li>
          <li>Elk event wordt nagekeken voor het online komt, en opnieuw nadat je het aanpast.</li>
        </List>
      </Section>

      <Section title="Wat je plaatst">
        <p>
          Je bent verantwoordelijk voor wat je in je profiel, eventbeschrijvingen en berichten op groepsborden zet. Het moet de community-
          &amp; veiligheidsregels volgen. Je behoudt je rechten en laat ons het tonen op Wanted Level zolang het online staat.
        </p>
      </Section>

      <Section title="Moderatie">
        <p>
          We kunnen events en berichten verbergen of verwijderen en accounts schorsen als ze deze voorwaarden of de regels breken, of als
          iemands veiligheid in gevaar is. Een veiligheidsmelding verbergt een event of bericht automatisch tot een moderator het bekijkt.
          Als we iets doen met je account of je inhoud, mailen we je wat we deden en waarom. Ben je het er niet mee eens, beantwoord dan
          die mail.
        </p>
      </Section>

      <Section title="Naar events gaan">
        <p>
          Je gaat naar events op eigen risico en verantwoordelijkheid. Volg de instructies van het personeel van de locatie. We controleren
          organisatoren en events, maar we kunnen niet op elk event zijn en niet garanderen dat een event verloopt zoals beschreven. Voor
          zover de Belgische wet het toelaat, zijn we niet aansprakelijk voor wat er op events gebeurt of voor events die wijzigen of niet
          doorgaan. Niets in deze voorwaarden beperkt rechten die je als consument hebt en die wettelijk niet beperkt mogen worden.
        </p>
      </Section>

      <Section title="Wijzigingen en contact">
        <p>
          We kunnen deze voorwaarden aanpassen; bij een belangrijke wijziging mailen we accounthouders eerst. Het Belgisch recht is van
          toepassing. Vragen: {CONTACT}.
        </p>
      </Section>
    </LegalPage>
  );
}
