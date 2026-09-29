/*
 * ONTWERP, IN AFWACHTING VAN JURIDISCHE CONTROLE (draft, pending legal review). Zie LEGAL_REVIEW.md.
 * Versie 2026-10 (RULES_VERSION). Pas je de inhoud van de regels aan? Verhoog dan RULES_VERSION in
 * src/lib/constants.ts en public.current_rules_version() zodat iedereen ze opnieuw aanvaardt.
 */
import { Link } from '@/i18n/navigation';
import { CONTACT, LegalPage, List, Section } from './shared';

export default function RulesNl() {
  return (
    <LegalPage title="Community- & veiligheidsregels" updated="Versie 2026-10 (ontwerp)">
      <p className="text-lg">
        Launchavond moet leuk zijn voor iedereen: nieuwkomers, vaste gamers, het personeel van de locatie en de ouders die iemand komen
        afzetten. Deze regels aanvaard je voor je je de eerste keer inschrijft.
      </p>

      <Section title="1. Wees fatsoenlijk">
        <List>
          <li>Geen pesterijen, bedreigingen, haat, discriminatie of ongewenste seksuele aandacht. Online of op de locatie.</li>
          <li>Plagen over het spel mag. Iemand persoonlijk aanvallen niet.</li>
          <li>Geen verkoop, spam of rekrutering voor iets dat niets met de meetup te maken heeft.</li>
        </List>
      </Section>

      <Section title="2. Enkel openbare plekken">
        <List>
          <li>Elk event vindt plaats op een openbare locatie. Ga nooit naar een privéadres dat je via Wanted Level kreeg.</li>
          <li>Zet geen huisadressen, telefoonnummers of contactgegevens van iemand anders op een groepsbord.</li>
          <li>Probeert iemand de meetup naar een privéplek te verplaatsen? Ga niet, en meld het.</li>
        </List>
      </Section>

      <Section title="3. Leeftijdsgrenzen zijn echt">
        <List>
          <li>Je moet 13 zijn om een account te hebben. Events kunnen 16+ of 18+ zijn, vaak omdat de locatie alcohol schenkt.</li>
          <li>Gebruik je echte geboortedatum. Locaties kunnen aan de deur je identiteitskaart vragen.</li>
          <li>In België moet je 16 zijn voor bier en wijn en 18 voor sterkedrank. Koop geen drank voor wie te jong is.</li>
        </List>
      </Section>

      <Section title="4. Het groepsbord">
        <List>
          <li>Het is er om mensen te vinden om mee te spelen. Enkel wie naar hetzelfde event gaat, ziet het.</li>
          <li>Deel je Discord-naam alleen als je dat wil. Deel nooit die van iemand anders.</li>
          <li>Ontmoet je nieuwe squad op de locatie, niet eerst ergens anders.</li>
        </List>
      </Section>

      <Section title="5. Blijf veilig op de avond zelf">
        <List>
          <li>Laat een vriend of familielid weten waar je naartoe gaat en wanneer je terug bent.</li>
          <li>Plan je terugweg voor je vertrekt, zeker bij late events. Check de laatste tram of bus, of regel een lift.</li>
          <li>Houd je drankje en je spullen in het oog.</li>
          <li>Voel je je niet op je gemak bij iemand? Zeg het tegen het personeel of de organisator. Je mag altijd vertrekken.</li>
          <li>
            In nood bel je <a href="tel:112" className="link font-bold">112</a>. Jonger dan 18 en wil je met iemand praten? Awel is gratis
            en anoniem: bel <a href="tel:102" className="link font-bold">102</a> of chat via awel.be.
          </li>
        </List>
      </Section>

      <Section title="6. Organisatoren">
        <List>
          <li>Correcte info, een veilig aantal mensen en de hele avond iemand verantwoordelijk ter plaatse.</li>
          <li>Handhaaf de minimumleeftijd en het huisreglement van de locatie.</li>
          <li>Events zijn gratis toegankelijk. Pas het event aan of annuleer het op Wanted Level als er iets verandert.</li>
        </List>
      </Section>

      <Section title="7. Melden">
        <p>
          Elk event en elk bericht op een groepsbord heeft een meldknop. Kies <strong>Veiligheid</strong> als iemand gekwetst kan worden
          of zich onveilig voelt: het event of bericht wordt meteen verborgen tot een moderator het bekijkt. Andere meldingen (spam, foute
          info, iets anders) komen in de wachtrij van de moderators. Valse meldingen om events offline te krijgen zijn zelf tegen de regels.
        </p>
        <p>Lukt de knop niet? Mail {CONTACT}.</p>
      </Section>

      <Section title="8. Wat er gebeurt als regels gebroken worden">
        <p>
          Moderators kunnen berichten en events verbergen of verwijderen en accounts schorsen. We laten de betrokken persoon altijd weten
          wat we deden en waarom. Zie de{' '}
          <Link href="/terms" className="link">
            gebruiksvoorwaarden
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
