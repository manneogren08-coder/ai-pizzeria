import { useState } from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8fbff 52%, #eff6ff 100%)',
      padding: '40px 20px'
    }}>
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
          Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
        </p>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            1. Vilken data samlar vi in?
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Staffguide samlar in följande typer av personuppgifter:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Företagsinformation:</strong> Företagsnamn, e-postadress och lösenord för administratörer
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Personaldata:</strong> Namn och e-postadress för anställda som använder tjänsten
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Systemdata:</strong> IP-adresser, användar-ID, sessionstider och annan teknisk data för att säkerställa tjänstens funktion
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Kommunikation:</strong> Meddelanden som skickas via kontaktformuläret
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
            2. Hur använder vi din data?
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Vi använder insamlad data för följande ändamål:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Tillhandahålla tjänsten:</strong> För att ge personal tillgång till rutiner, recept och annan viktig information
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Authentication:</strong> För att verifiera användare och säkerställa att endast behöriga har tillgång
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Kundsupport:</strong> För att svara på frågor och ge teknisk support
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Systemförbättring:</strong> För att analysera användning och förbättra tjänsten
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
            3. Lagring och säkerhet
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Dina personuppgifter lagras på servrar inom EU och skyddas med branschstandard för kryptering och säkerhet. 
            Vi begränsar tillgången till personuppgifter till endast personal som behöver dem för att utföra sina arbetsuppgifter.
          </p>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
            Data sparas så länge det är nödvändigt för att tillhandahålla tjänsten eller enligt lagkrav.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            fontWeight: 700,
            margin: '0 0 15px'
          }}>
            4. Cookies
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Vi använder cookies för att:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Sessionshantering:</strong> För att hålla dig inloggad under din session
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Säkerhet:</strong> För att skydda mot CSRF-attacker och andra säkerhetshot
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Analys:</strong> För att förstå hur tjänsten används och förbättra användarupplevelsen
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
            5. Dina rättigheter
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Enligt GDPR har du rätt till:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Insyn:</strong> Begära en kopia av dina personuppgifter
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Rättelse:</strong> Begära korrigering av felaktiga uppgifter
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Radering:</strong> Begära radering av dina personuppgifter
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Dataportabilitet:</strong> Begära att få dina uppgifter i ett maskinläsbart format
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
            6. Tredjeparter
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Vi delar inte dina personuppgifter med tredjeparter för marknadsföring. Vi använder betrodda 
            tjänsteleverantörer för:
          </p>
          <ul style={{ color: '#475569', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>E-posttjänster:</strong> För att skicka utskick och bekräftelser
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Hosting:</strong> För att lagra och driva tjänsten
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
            7. Kontaktuppgifter
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>
            Om du har frågor om denna integritetspolicy eller vill utöva dina rättigheter, kontakta oss:
          </p>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <p style={{ color: '#0f172a', fontWeight: 600, margin: '0 0 8px' }}>
              Staffguide AB
            </p>
            <p style={{ color: '#475569', margin: '0 0 8px' }}>
              E-post: <a href="mailto:staffguide.se@gmail.com" style={{ color: '#2563eb', textDecoration: 'none' }}>staffguide.se@gmail.com</a>
            </p>
            <p style={{ color: '#475569', margin: 0 }}>
              Webbplats: staffguide.se
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
