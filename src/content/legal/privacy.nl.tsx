/*
 * ONTWERP, IN AFWACHTING VAN JURIDISCHE CONTROLE (draft, pending legal review). Zie LEGAL_REVIEW.md.
 * Houd dit gelijk met wat de code doet (SPEC.md §3, §7, supabase/migrations/*retention*).
 */
import { CONTACT, LegalPage, List, Section } from './shared';

export default function PrivacyNl() {
  return (
    <LegalPage title="Privacybeleid" updated="Ontwerp van 29 september 2026">
      <p>
        Wanted Level (wantedlevel.be) is een gratis, niet-commerciële communitywebsite met GTA 6-launchavonden op openbare locaties in
        Antwerpen. We verzamelen zo weinig mogelijk, wissen alles volgens een vast schema, en verkopen niets of gebruiken niets voor
        reclame.
      </p>

      <Section title="Wie is verantwoordelijk">
        <p>
          De verwerkingsverantwoordelijke is het project Wanted Level, uitgebaat door [NAAM EN ADRES VAN DE UITBATER, in te vullen voor
          de lancering]. Voor alles in dit beleid kan je terecht bij {CONTACT}.
        </p>
      </Section>

      <Section title="Wat we verzamelen en waarom">
        <List>
          <li>
            <strong>Je account:</strong> e-mailadres (om in te loggen met een link en om je meldingen te sturen), schermnaam,
            geboortedatum, taal en een optionele sociale link. Je geboortedatum gebruiken we enkel om na te gaan dat je minstens 13 bent
            en om de minimumleeftijd van een event te controleren als je je inschrijft. Niemand anders ziet ze: geen andere gebruikers,
            geen organisatoren.
          </li>
          <li>
            <strong>Aanvaarding van de regels:</strong> de datum en het uur waarop je de community- &amp; veiligheidsregels aanvaardde, en
            welke versie.
          </li>
          <li>
            <strong>Inschrijvingen:</strong> naar welke events je gaat. Organisatoren zien enkel hoeveel mensen komen, nooit wie.
          </li>
          <li>
            <strong>Berichten op het groepsbord:</strong> je schermnaam, je bericht en, enkel als je dat zelf toevoegt, je
            Discord-naam. Alleen wie ingeschreven is voor hetzelfde event kan ze zien.
          </li>
          <li>
            <strong>Organisatoren:</strong> de naam van de organisatie of locatie, de sociale link, locatiegegevens en het bericht uit
            je aanvraag. Na goedkeuring tonen we je organisatienaam en sociale link, en de naam en het adres van je locaties, openbaar
            bij je events.
          </li>
          <li>
            <strong>Meldingen:</strong> wat je meldde, de categorie en wat je schreef. Moderators zien wie een melding deed; wie je
            meldt, ziet dat niet. Als een bericht op een groepsbord gemeld wordt, bewaren we een kopie van de tekst bij de melding zodat
            moderators het kunnen nakijken.
          </li>
          <li>
            <strong>Moderatie:</strong> als een moderator iets doet (bijvoorbeeld een event verwijdert of een account schorst), noteren
            we wie, wat en waarom.
          </li>
          <li>
            <strong>Bescherming tegen misbruik:</strong> om misbruik te beperken (zoals massaal inschrijven of melden) tellen we
            verzoeken per IP-adres en per e-mailadres. We bewaren enkel een versleutelde, onomkeerbare hash daarvan, nooit het adres
            zelf, en maximaal 2 dagen.
          </li>
        </List>
        <p>
          We verwerken deze gegevens om de dienst te leveren waarvoor je je aanmeldde (AVG art. 6(1)(b)) en, voor veiligheid, moderatie
          en bescherming tegen misbruik, op basis van ons gerechtvaardigd belang om meetups veilig te houden (art. 6(1)(f)).
        </p>
      </Section>

      <Section title="Cookies en statistieken">
        <p>
          We zetten maar één soort cookie: de inlogcookie, die strikt nodig is om je ingelogd te houden. Je taal zit in het webadres, niet
          in een cookie. We gebruiken Vercel Web Analytics, dat paginabezoeken telt zonder cookies en zonder profielen van individuele
          bezoekers. Daarom is er geen cookiebanner.
        </p>
      </Section>

      <Section title="Diensten die we gebruiken">
        <List>
          <li>Supabase: database en inloggen, gehost in de EU (Frankfurt, Duitsland).</li>
          <li>Vercel: host de website; onze serverfuncties draaien in de EU (Frankfurt).</li>
          <li>Resend: verstuurt onze e-mails (inloglinks en meldingen).</li>
          <li>Cloudflare Turnstile: controleert of formulieren (aanmelden, inloggen, aanvragen als organisator, meldingen) door een mens verstuurd worden en niet door een bot.</li>
          <li>MapTiler: kaarttegels en adreszoeker. Je browser laadt kaartafbeeldingen rechtstreeks bij MapTiler.</li>
        </List>
        <p>
          Sommige van deze bedrijven zijn gevestigd in de Verenigde Staten. Als gegevens de Europese Economische Ruimte verlaten, steunen
          we op het EU-VS Data Privacy Framework of op de standaardcontractbepalingen van de Europese Commissie.
        </p>
      </Section>

      <Section title="Hoe lang we iets bewaren">
        <List>
          <li>Inschrijvingen en berichten op groepsborden: automatisch gewist 30 dagen na het einde van het event.</li>
          <li>Accounts waarvan het e-mailadres nooit bevestigd werd: gewist na 7 dagen.</li>
          <li>Tellers tegen misbruik: gewist na 2 dagen.</li>
          <li>Afgehandelde meldingen: gewist 12 maanden na de afhandeling.</li>
          <li>Je account en profiel: tot je je account wist.</li>
          <li>
            Uitzondering: als we een officieel verzoek van de overheid krijgen over een bepaald event, kunnen we de gegevens van dat event
            bewaren (een &quot;legal hold&quot;) zolang dat verzoek het vereist.
          </li>
        </List>
      </Section>

      <Section title="Je account wissen">
        <p>
          Je kan je account altijd zelf wissen in je accountinstellingen. Daarmee verdwijnen meteen je login, profiel (ook je
          geboortedatum), inschrijvingen, berichten op groepsborden en aanvragen als organisator. Ben je organisator, dan worden ook je
          locaties en events gewist en krijgen de ingeschreven mensen bericht dat het event niet doorgaat. Meldingen die jij deed blijven
          bestaan maar zijn niet langer aan jou gekoppeld, en moderatieverslagen blijven bestaan zonder je naam.
        </p>
      </Section>

      <Section title="Je rechten">
        <p>
          Je hebt het recht om je gegevens in te zien, te verbeteren, te wissen en mee te nemen, en om bezwaar te maken tegen of een
          beperking te vragen van hoe we ze gebruiken. Het meeste kan je zelf in je account; voor de rest mail je {CONTACT}. Je kan ook
          klacht indienen bij de Gegevensbeschermingsautoriteit (gegevensbeschermingsautoriteit.be).
        </p>
      </Section>

      <Section title="Jongeren">
        <p>
          Je moet minstens 13 zijn om een account te maken, de leeftijd vanaf wanneer je daar in België zelf toestemming voor kan geven.
          Events kunnen een hogere minimumleeftijd hebben (16 of 18, bijvoorbeeld als een bar alcohol schenkt), en ons systeem blokkeert
          inschrijvingen van iedereen die jonger is.
        </p>
      </Section>

      <Section title="Wijzigingen">
        <p>Als we dit beleid op een belangrijke manier aanpassen, mailen we accounthouders voor de wijziging ingaat.</p>
      </Section>
    </LegalPage>
  );
}
