import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8fbff 52%, #eff6ff 100%)',
      padding: '40px 20px'
    }}>
      <Head>
        <title>Integritetspolicy | Effexo</title>
      </Head>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.92)',
        border: '1px solid #dbeafe',
        borderRadius: '20px',
        padding: '40px 30px',
        backdropFilter: 'blur(5px)'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          color: '#0f172a',
          fontWeight: 800,
          margin: '0 0 30px',
          letterSpacing: '-0.02em'
        }}>
          Integritetspolicy
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#475569',
          lineHeight: 1.6,
          marginBottom: '30px'
        }}>
          Senast uppdaterad: 2 augusti 2026
        </p>

        <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '30px' }}>
          Denna integritetspolicy beskriver hur Effexo samlar in, använder och skyddar personuppgifter
          i samband med vår tjänst StaffGuide och våra hemsidelösningar för restauranger och småföretag.
        </p>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            1. Personuppgiftsansvarig
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Effexo är personuppgiftsansvarig för behandlingen av personuppgifter som beskrivs i denna
            integritetspolicy. Det innebär att vi bestämmer varför och hur personuppgifter behandlas
            inom tjänsten, och att vi ansvarar för att behandlingen sker i enlighet med gällande
            dataskyddslagstiftning (GDPR).
          </p>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Vem som är personuppgiftsansvarig beror på vilken uppgift det gäller:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px', marginBottom: '15px' }}>
            <li style={{ marginBottom: '10px' }}>
              Effexo är personuppgiftsansvarig för de personuppgifter vi behandlar i egenskap av
              leverantör, till exempel kontaktuppgifter till företagets administratörer och information
              som lämnas via kontaktformuläret.
            </li>
            <li style={{ marginBottom: '10px' }}>
              Restaurangföretaget (kunden) är normalt personuppgiftsansvarig för sin egen personaldata,
              det vill säga uppgifter om de anställda som får tillgång till StaffGuide.
            </li>
            <li style={{ marginBottom: '10px' }}>
              I den rollen agerar Effexo som personuppgiftsbiträde och behandlar personaldatan enbart på
              uppdrag av och enligt instruktioner från kunden, för att kunna leverera tjänsten.
            </li>
          </ul>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Kontaktuppgifter till personuppgiftsansvarig:
          </p>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <p style={{ color: '#0f172a', fontWeight: 600, margin: '0 0 8px' }}>
              Effexo
            </p>
            <p style={{ color: '#475569', margin: '0 0 8px' }}>
              E-post: <a href="mailto:kontakt@effexo.se" style={{ color: '#2563eb', textDecoration: 'none' }}>kontakt@effexo.se</a>
            </p>
            <p style={{ color: '#475569', margin: 0 }}>
              Webbplats: effexo.se
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            2. Vilken data samlar vi in?
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Effexo samlar in följande typer av personuppgifter:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Kunddata (företagskonto):</strong> Företagsnamn, e-postadress och lösenord för
              administratörer som skapar och hanterar företagets konto. Lösenord hashas alltid och
              lagras aldrig i klartext.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Personaldata:</strong> Namn, e-postadress och roll för anställda som får tillgång
              till tjänsten av sin arbetsgivare, samt tidpunkt för senaste inloggning.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Teknisk data:</strong> IP-adress behandlas tillfälligt vid inloggning för att
              förhindra missbruk (t.ex. upprepade felaktiga inloggningsförsök), men lagras inte i vår
              databas.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Kommunikation:</strong> Namn, e-postadress och meddelande som anges när någon
              kontaktar oss via kontaktformuläret på vår hemsida.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Faktureringsuppgifter:</strong> För betalande kunder behandlar vi företagsnamn,
              kontaktuppgifter samt den information som krävs för fakturering och bokföring, i enlighet
              med gällande bokföringslagstiftning.
            </li>
          </ul>
          <p style={{ color: '#475569', lineHeight: 1.6, marginTop: '15px' }}>
            För kunder som beställer en hemsidelösning av oss kan ytterligare personuppgiftsbehandling
            förekomma beroende på vilka funktioner som ingår, till exempel kontaktformulär eller
            bokningsfunktioner. Vilken data det rör sig om och hur den hanteras beskrivs i så fall i
            samband med beställningen.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            3. Hur använder vi din data?
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Vi använder insamlad data för följande ändamål:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Tillhandahålla tjänsten:</strong> För att ge företagets personal tillgång till
              rutiner, recept, checklistor och annan information som företaget har lagt in i StaffGuide.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Autentisering:</strong> För att verifiera att den som loggar in är den den utger
              sig för att vara, och säkerställa att endast behöriga användare får tillgång till
              respektive företags information.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Kundsupport:</strong> För att svara på frågor, felsöka problem och ge teknisk
              support till våra kunder.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>AI-assistenten:</strong> StaffGuides AI-funktion drivs av OpenAI. När en användare
              ställer en fråga skickas den, tillsammans med den företagsinformation som faktiskt behövs
              för att besvara just den frågan (t.ex. relevanta rutiner eller recept som företaget har
              lagt in), till OpenAI för att generera ett svar. Vi skickar aldrig mer data än vad som krävs
              för att besvara frågan, och vi är transparenta med att denna behandling sker - läs mer om
              leverantören under punkt 7. Företagsinformation som inte behövs för att besvara den
              aktuella frågan skickas inte till OpenAI.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.3rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            3.1 Rättslig grund för behandling
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Effexo behandlar personuppgifter med stöd av följande rättsliga grunder:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Avtal:</strong> För att kunna leverera StaffGuide till våra kunder enligt det avtal
              som ingåtts.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Berättigat intresse:</strong> Till exempel för att upprätthålla säkerheten i
              tjänsten, felsöka problem och förbättra StaffGuide.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Rättslig förpliktelse:</strong> Till exempel för att uppfylla krav enligt
              bokföringslagstiftningen.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            4. Lagring och säkerhet
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Vi använder leverantörer som i första hand erbjuder serverdrift inom EU/EES. I vissa fall,
            till exempel vid AI-bearbetning via OpenAI, kan personuppgifter behandlas av leverantörer
            utanför EU/EES. Sådan överföring sker då alltid med de skyddsåtgärder som krävs enligt GDPR,
            exempelvis EU-kommissionens standardavtalsklausuler. All trafik till och från tjänsten
            krypteras (HTTPS/TLS), och lösenord lagras aldrig i klartext utan hashas med
            branschstandarden bcrypt. Åtkomst till data begränsas per företag och per roll, så att en
            användare bara kan se information som hör till det egna företaget och den egna
            behörighetsnivån.
          </p>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
            Data sparas så länge det är nödvändigt för att tillhandahålla tjänsten till dig eller
            enligt lagkrav. Om ett företag avslutar sitt konto raderas eller anonymiseras tillhörande
            personuppgifter inom rimlig tid, om inte längre lagring krävs enligt lag.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            5. Cookies
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Vi använder endast en strikt nödvändig cookie: en inloggningscookie som håller dig inloggad
            under din session. Den är skyddad mot åtkomst från JavaScript (HttpOnly) och begränsad så
            att den inte skickas med vid förfrågningar från andra webbplatser (SameSite), vilket
            minskar risken för vissa typer av attacker. Vi använder inga cookies för analys,
            marknadsföring eller spårning.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            6. Dina rättigheter enligt GDPR
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Enligt dataskyddsförordningen (GDPR) har du rätt till:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Insyn:</strong> Begära en kopia av de personuppgifter vi behandlar om dig.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Rättelse:</strong> Begära att felaktiga eller ofullständiga uppgifter korrigeras.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Radering:</strong> Begära att dina personuppgifter raderas, i den utsträckning det
              är möjligt enligt lag.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Begränsning:</strong> Begära att behandlingen av dina uppgifter begränsas under
              tiden en invändning eller felaktighet utreds.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Invändning:</strong> Invända mot hur vi behandlar dina personuppgifter.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Dataportabilitet:</strong> Begära att få ut dina uppgifter i ett strukturerat,
              maskinläsbart format för att flytta dem till en annan tjänst.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Klagomål:</strong> Lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY)
              om du anser att dina personuppgifter behandlas felaktigt.
            </li>
          </ul>
          <p style={{ color: '#475569', lineHeight: 1.6, marginTop: '15px' }}>
            Om du är anställd hos ett företag som använder StaffGuide och vill utöva dina rättigheter
            rekommenderar vi att du i första hand kontaktar din arbetsgivare, eftersom det är
            arbetsgivaren som lägger in och styr över personaldatan i tjänsten. Du kan även kontakta
            oss direkt på <a href="mailto:kontakt@effexo.se" style={{ color: '#2563eb', textDecoration: 'none' }}>kontakt@effexo.se</a>, så hjälper vi dig vidare.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            7. Leverantörer och personuppgiftsbiträden
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Vi säljer eller delar inte dina personuppgifter med tredjeparter för marknadsföring. För att
            driva StaffGuide använder vi Vercel, Supabase, OpenAI och Resend som leverantörer. De
            behandlar personuppgifter enligt sina respektive dataskyddsvillkor och, där sådana krävs,
            personuppgiftsbiträdesavtal, och endast i den utsträckning som krävs för att leverera
            respektive del av tjänsten:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Vercel:</strong> Hosting och drift av applikationen.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Supabase:</strong> Databas och lagring av företags- och personaldata.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>OpenAI:</strong> AI-bearbetning av frågor som ställs till AI-assistenten, för att
              generera svar.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Resend:</strong> E-postutskick, t.ex. engångskoder för inloggning till anställda
              samt vidarebefordran av meddelanden som skickas via kontaktformuläret.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            8. Kontaktuppgifter
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Om du har frågor om denna integritetspolicy, om vår behandling av personuppgifter, eller
            vill utöva någon av dina rättigheter enligt GDPR, är du välkommen att kontakta oss:
          </p>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <p style={{ color: '#0f172a', fontWeight: 600, margin: '0 0 8px' }}>
              Effexo
            </p>
            <p style={{ color: '#475569', margin: '0 0 8px' }}>
              E-post: <a href="mailto:kontakt@effexo.se" style={{ color: '#2563eb', textDecoration: 'none' }}>kontakt@effexo.se</a>
            </p>
            <p style={{ color: '#475569', margin: 0 }}>
              Webbplats: effexo.se
            </p>
          </div>
        </section>

        <div style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <button
            onClick={() => window.history.back()}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#1e40af'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            Tillbaka
          </button>
        </div>
      </div>
    </div>
  );
}
