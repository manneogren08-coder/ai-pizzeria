import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

const problems = [
  {
    icon: "🗂️",
    title: "Rutiner finns på olika ställen",
    text: "Papperslappar, gruppchattar och minnet hos några få personer – sällan på samma plats."
  },
  {
    icon: "🙋",
    title: "Nya medarbetare får fråga sig fram",
    text: "Onboarding tar längre tid än den behöver när svaren inte finns samlade."
  },
  {
    icon: "🔎",
    title: "Viktig information är svår att hitta",
    text: "Särskilt när det är stressigt och man behöver svaret direkt."
  },
  {
    icon: "🔁",
    title: "Personalen lägger tid på återkommande frågor",
    text: "Samma frågor ställs om och om igen till samma kollegor."
  },
  {
    icon: "📉",
    title: "Kunskap försvinner när personal slutar",
    text: "Rutiner som aldrig skrevs ner glöms bort tillsammans med den som kunde dem."
  }
];

const features = [
  { icon: "📋", title: "Rutiner", text: "Öppnings- och stängningsrutiner, samlade och alltid uppdaterade." },
  { icon: "🍕", title: "Recept", text: "Recept och tillagningsinstruktioner på ett ställe, tydligt beskrivna." },
  { icon: "⚠️", title: "Allergener", text: "Allergeninformation som går snabbt att slå upp när det gäller." },
  { icon: "👥", title: "Personalinformation", text: "Roller, behörigheter och kontaktuppgifter för hela teamet." },
  { icon: "📌", title: "Viktiga instruktioner", text: "Beteenderiktlinjer och rutiner för vanliga situationer i vardagen." },
  { icon: "🤖", title: "AI-assistent", text: "Personalen kan fråga och få svar baserat på restaurangens egen information." }
];

const steps = [
  {
    number: "1",
    title: "Restaurangen lägger in sin information",
    text: "Rutiner, recept, allergener och annan viktig information samlas i StaffGuide."
  },
  {
    number: "2",
    title: "Personalen får tillgång",
    text: "Varje medarbetare bjuds in och loggar in med sin egen åtkomst."
  },
  {
    number: "3",
    title: "Personalen söker eller frågar AI-assistenten",
    text: "När de behöver hjälp hittar de svaret snabbt, utan att behöva fråga runt."
  }
];

export default function StaffGuidePage() {
  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (!section) return;

    const nav = document.querySelector(".landingNav");
    const headerOffset = (nav ? nav.getBoundingClientRect().height : 0) + 16;
    const targetY = section.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top: Math.max(targetY, 0), behavior: "smooth" });
  };

  return (
    <div style={styles.landingPage} className="landingPage">
      <Head>
        <title>StaffGuide | Effexo – AI-assistent för restaurangpersonal</title>
        <meta
          name="description"
          content="StaffGuide från Effexo samlar rutiner, recept, allergener och personalinformation på ett ställe – med en AI-assistent som hjälper personalen hitta rätt svar."
        />
        <meta property="og:title" content="StaffGuide | Effexo" />
        <meta
          property="og:description"
          content="StaffGuide från Effexo samlar rutiner, recept, allergener och personalinformation på ett ställe – med en AI-assistent som hjälper personalen hitta rätt svar."
        />
      </Head>

      <style jsx>{`
        :global(body) {
          background: #05070d;
        }

        .landingOrb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(2px);
          opacity: 0.55;
          animation: drift 12s ease-in-out infinite;
        }

        .orbA {
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.28) 0%, rgba(37, 99, 235, 0) 72%);
          top: 5%;
          left: -70px;
        }

        .orbB {
          width: 360px;
          height: 360px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.24) 0%, rgba(59, 130, 246, 0) 74%);
          bottom: -100px;
          right: -100px;
          animation-duration: 15s;
        }

        @keyframes drift {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -12px, 0) scale(1.04); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .landingNav {
          animation: fadeInDown 0.7s ease both;
        }

        .fadeInSection {
          animation: fadeInUp 0.7s ease both;
        }

        .landingNavLink {
          transition: color 0.2s ease;
        }

        .landingNavLink:hover {
          color: #f8fafc !important;
        }

        .landingNavLogoLink {
          transition: opacity 0.2s ease;
        }

        .landingNavLogoLink:hover {
          opacity: 0.82;
        }

        .landingNavLoginBtn:hover {
          background: rgba(255, 255, 255, 0.09) !important;
          border-color: rgba(148, 163, 184, 0.5) !important;
          transform: translateY(-1px);
        }

        .heroCtaBtn {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }

        .heroCtaPrimaryBtn:hover {
          background: #1d4ed8 !important;
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(37, 99, 235, 0.35);
        }

        .heroCtaSecondaryBtn:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(148, 163, 184, 0.5) !important;
          transform: translateY(-2px);
        }

        .featureCard {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .featureCard:hover {
          transform: translateY(-6px);
          box-shadow: 0 22px 48px rgba(0, 0, 0, 0.4), 0 0 32px rgba(37, 99, 235, 0.14);
          border-color: rgba(59, 130, 246, 0.4) !important;
        }

        .ctaButtonPrimary,
        .ctaButtonSecondary {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }

        .ctaButtonPrimary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.35);
        }

        .ctaButtonSecondary:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(148, 163, 184, 0.5) !important;
        }

        .footerColLink:hover {
          color: #f8fafc !important;
        }

        @media (max-width: 1040px) {
          .heroGrid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .featuresGrid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .footerGrid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .stepsGrid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .aiDemoGrid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          .landingPage {
            overflow-x: hidden;
          }

          .landingNavLinks a.landingNavLink {
            display: none;
          }

          .landingNavLogoIcon {
            height: 28px !important;
          }

          .landingNavLogoWordmark {
            height: 16px !important;
          }

          .landingNavLogoLink {
            gap: 9px !important;
          }

          .landingContentWrap {
            padding: 12px !important;
          }

          .heroTitle {
            font-size: 1.7rem !important;
          }

          .heroLead {
            font-size: 0.95rem !important;
          }

          .heroCtaRow {
            flex-direction: column;
          }

          .heroCtaBtn {
            width: 100%;
          }

          .featuresGrid {
            grid-template-columns: 1fr !important;
          }

          .sectionTitle {
            font-size: 1.6rem !important;
          }

          .ctaButtons {
            flex-direction: column;
            gap: 8px !important;
          }

          .ctaButtonPrimary,
          .ctaButtonSecondary {
            width: 100%;
          }

          .footerGrid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }

          .footerColumn {
            align-items: center !important;
          }

          .footerBottom {
            flex-direction: column;
            gap: 8px !important;
          }
        }
      `}</style>

      <nav style={styles.landingNav} className="landingNav">
        <div style={styles.landingNavInner} className="landingNavInner">
          <Link href="/" style={styles.landingNavLogoLink} className="landingNavLogoLink" aria-label="Effexo – till startsidan">
            <Image src="/effexo-icon-white.png" alt="" width={201} height={216} priority style={styles.landingNavLogoIcon} className="landingNavLogoIcon" />
            <Image src="/effexo-wordmark-white.png" alt="" width={448} height={124} priority style={styles.landingNavLogoWordmark} className="landingNavLogoWordmark" />
          </Link>
          <div style={styles.landingNavLinks} className="landingNavLinks">
            <Link href="/webbdesign" style={styles.landingNavLink} className="landingNavLink">Hemsidor</Link>
            <Link href="/staffguide" style={styles.landingNavLink} className="landingNavLink">Staffguide</Link>
            <Link href="/#contact-section" style={styles.landingNavLink} className="landingNavLink">Kontakt</Link>
            <Link href="/#login-section" style={styles.landingNavLoginBtn} className="landingNavLoginBtn">Logga in</Link>
          </div>
        </div>
      </nav>

      <div style={styles.landingBackground}>
        <div className="landingOrb orbA" />
        <div className="landingOrb orbB" />
      </div>

      <div style={styles.landingContentWrap} className="landingContentWrap">
        <section style={styles.heroSection} className="fadeInSection">
          <span style={styles.heroBadge}>EFFEXO</span>
          <h1 className="heroTitle" style={styles.heroTitle}>All personalinformation. På ett ställe.</h1>
          <p className="heroLead" style={styles.heroLead}>
            StaffGuide hjälper restauranger att samla rutiner, information och kunskap på ett ställe – så att personalen snabbt kan hitta rätt svar, utan att behöva fråga runt.
          </p>
          <div style={styles.heroCtaRow} className="heroCtaRow">
            <button type="button" style={styles.heroCtaPrimary} className="heroCtaBtn heroCtaPrimaryBtn" onClick={() => scrollToSection("ai-demo-section")}>
              Se hur StaffGuide fungerar
            </button>
            <Link href="/#contact-section" style={{ ...styles.heroCtaSecondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }} className="heroCtaBtn heroCtaSecondaryBtn">
              Kontakta oss
            </Link>
          </div>
          <div style={styles.heroMetaRow}>
            <span style={styles.heroMetaChip}>Rutiner &amp; recept</span>
            <span style={styles.heroMetaChip}>Allergener</span>
            <span style={styles.heroMetaChip}>AI-assistent</span>
          </div>
        </section>

        <section style={styles.section}>
          <h2 className="sectionTitle" style={styles.sectionTitle}>Ett återkommande problem i många restaurangkök</h2>
          <p style={styles.sectionLead}>
            De flesta restauranger känner igen det här – oavsett hur bra personalen är.
          </p>
          <div style={styles.featuresGrid} className="featuresGrid">
            {problems.map((item) => (
              <div key={item.title} style={styles.featureCard} className="featureCard">
                <div style={styles.featureIconWrap}><span style={styles.featureIcon}>{item.icon}</span></div>
                <h3 style={styles.featureTitle}>{item.title}</h3>
                <p style={styles.featureText}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 className="sectionTitle" style={styles.sectionTitle}>StaffGuide samlar allt på ett ställe</h2>
          <p style={styles.sectionLead}>
            StaffGuide fungerar som restaurangens digitala kunskapsbas – en plats där all viktig information finns samlad och är enkel att hitta.
          </p>
          <div style={styles.featuresGrid} className="featuresGrid">
            {features.map((item) => (
              <div key={item.title} style={styles.featureCard} className="featureCard">
                <div style={styles.featureIconWrap}><span style={styles.featureIcon}>{item.icon}</span></div>
                <h3 style={styles.featureTitle}>{item.title}</h3>
                <p style={styles.featureText}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="ai-demo-section" style={styles.section}>
          <h2 className="sectionTitle" style={styles.sectionTitle}>Fråga, få svar</h2>
          <div style={styles.aiDemoGrid} className="aiDemoGrid">
            <div style={styles.mockupWindow}>
              <div style={styles.mockupTopBar}>
                <span style={{ ...styles.mockupDot, background: "#ef4444" }} />
                <span style={{ ...styles.mockupDot, background: "#f59e0b" }} />
                <span style={{ ...styles.mockupDot, background: "#22c55e" }} />
                <span style={styles.mockupUrlPill}>staffguide.app/chat</span>
              </div>
              <div style={styles.guideChatBody}>
                <div style={styles.guideChatBubbleUser}>Vad ska jag göra vid stängning?</div>
                <div style={styles.guideChatBubbleAI}>Enligt er stängningsrutin: släck ugnarna, diska klart och räkna kassan. Vill du se hela listan?</div>
                <div style={styles.guideChatInputRow}>
                  <span style={styles.guideChatInputText}>Skriv din fråga...</span>
                  <span style={styles.guideChatSendBtn}>➤</span>
                </div>
              </div>
            </div>
            <div style={styles.aiDemoText}>
              <p style={styles.sectionLead}>
                AI-assistenten använder restaurangens egen inlagda information för att hjälpa personalen hitta rätt svar snabbare.
              </p>
              <p style={styles.sectionLead}>
                Den är ett hjälpmedel för att hitta i det ni redan dokumenterat – inte en ersättning för sunt förnuft eller viktiga säkerhetsrutiner.
              </p>
            </div>
          </div>
        </section>

        <section style={styles.timeSection}>
          <h2 className="sectionTitle" style={styles.sectionTitle}>Mindre tid på att leta och fråga.<br />Mer tid på restaurangen.</h2>
          <p style={{ ...styles.sectionLead, maxWidth: "56ch", margin: "0 auto" }}>
            När information är lätt att hitta slipper personalen leta eller vänta på svar från en kollega eller chef. Det kan frigöra tid i vardagen och göra det enklare att komma igång som ny medarbetare.
          </p>
        </section>

        <section style={styles.section}>
          <h2 className="sectionTitle" style={styles.sectionTitle}>Så fungerar det</h2>
          <div style={styles.stepsGrid} className="stepsGrid">
            {steps.map((step) => (
              <div key={step.number} style={styles.stepCard}>
                <div style={styles.stepNumber}>{step.number}</div>
                <h3 style={styles.featureTitle}>{step.title}</h3>
                <p style={styles.featureText}>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.ctaSection} className="ctaSection">
          <h2 style={styles.ctaTitle}>Vill du se vad StaffGuide kan göra för din restaurang?</h2>
          <div style={styles.ctaButtons} className="ctaButtons">
            <Link href="/#contact-section" style={{ ...styles.ctaButtonPrimary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }} className="ctaButtonPrimary">
              Kontakta Effexo
            </Link>
          </div>
        </section>

        <footer style={styles.footer}>
          <div style={styles.footerGrid} className="footerGrid">
            <div style={styles.footerColumn} className="footerColumn">
              <div style={styles.footerLogo}>Effexo</div>
              <p style={styles.footerTagline}>Digitala lösningar som sparar tid och hjälper företag att växa.</p>
            </div>
            <div style={styles.footerColumn} className="footerColumn">
              <h4 style={styles.footerHeading}>Produkt</h4>
              <Link href="/staffguide" className="footerColLink" style={styles.footerColLink}>StaffGuide</Link>
              <Link href="/webbdesign" className="footerColLink" style={styles.footerColLink}>Hemsidor</Link>
            </div>
            <div style={styles.footerColumn} className="footerColumn">
              <h4 style={styles.footerHeading}>Företag</h4>
              <Link href="/" className="footerColLink" style={styles.footerColLink}>Om oss</Link>
              <Link href="/#contact-section" className="footerColLink" style={styles.footerColLink}>Kontakt</Link>
            </div>
            <div style={styles.footerColumn} className="footerColumn">
              <h4 style={styles.footerHeading}>Juridik</h4>
              <Link href="/privacy" className="footerColLink" style={styles.footerColLink}>Integritetspolicy</Link>
              <Link href="/privacy" className="footerColLink" style={styles.footerColLink}>GDPR</Link>
            </div>
          </div>
          <div style={styles.footerBottom}>
            <a href="mailto:kontakt@effexo.se" style={styles.footerLink}>kontakt@effexo.se</a>
            <a href="https://effexo.se" style={styles.footerLink}>effexo.se</a>
          </div>
          <p style={styles.footerText}>© 2026 Effexo. Alla rättigheter reserverade.</p>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  landingPage: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(180deg, #05070d 0%, #0a0e1a 45%, #0b0f1c 100%)"
  },
  landingNav: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "rgba(5, 7, 13, 0.72)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)"
  },
  landingNavInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  landingNavLogoLink: { display: "inline-flex", alignItems: "center", flex: "none", gap: 12, lineHeight: 0, textDecoration: "none", borderRadius: 6 },
  landingNavLogoIcon: { display: "block", height: 36, width: "auto" },
  landingNavLogoWordmark: { display: "block", height: 20.6, width: "auto" },
  landingNavLinks: { display: "flex", alignItems: "center", gap: 22 },
  landingNavLink: { color: "#94a3b8", fontSize: 14, fontWeight: 600, textDecoration: "none" },
  landingNavLoginBtn: {
    border: "1px solid rgba(148, 163, 184, 0.28)",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#f8fafc",
    borderRadius: 8,
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
    display: "inline-block",
    transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease"
  },
  landingBackground: { position: "absolute", inset: 0, pointerEvents: "none" },
  landingContentWrap: { position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "56px 18px 34px" },

  heroSection: { maxWidth: 760, margin: "0 auto 64px", textAlign: "center" },
  heroBadge: {
    display: "inline-block",
    background: "rgba(37, 99, 235, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.35)",
    color: "#93c5fd",
    padding: "7px 14px",
    borderRadius: 999,
    fontSize: 12,
    letterSpacing: "0.09em",
    fontWeight: 800,
    marginBottom: 20
  },
  heroTitle: { margin: "0 0 18px", fontSize: "2.6rem", lineHeight: 1.15, color: "#f8fafc", fontWeight: 800, letterSpacing: "-0.02em" },
  heroLead: { margin: "0 auto 28px", fontSize: "1.13rem", lineHeight: 1.6, color: "#94a3b8", maxWidth: "56ch" },
  heroCtaRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, justifyContent: "center" },
  heroCtaPrimary: { border: "1px solid #2563eb", background: "#2563eb", color: "#fff", borderRadius: 10, padding: "14px 26px", fontWeight: 700, cursor: "pointer", minHeight: 48, fontSize: 15 },
  heroCtaSecondary: { border: "1px solid rgba(148, 163, 184, 0.3)", background: "rgba(255, 255, 255, 0.03)", color: "#e2e8f0", borderRadius: 10, padding: "14px 26px", fontWeight: 700, cursor: "pointer", minHeight: 48, fontSize: 15 },
  heroMetaRow: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  heroMetaChip: { background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(148, 163, 184, 0.18)", color: "#cbd5e1", borderRadius: 999, padding: "8px 12px", fontSize: 13, fontWeight: 600 },

  section: { marginTop: 64, maxWidth: 980, marginLeft: "auto", marginRight: "auto" },
  sectionTitle: { margin: "0 0 14px", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.01em", color: "#f8fafc", textAlign: "center" },
  sectionLead: { margin: "0 auto 32px", fontSize: "1.05rem", lineHeight: 1.6, color: "#94a3b8", textAlign: "center", maxWidth: "60ch" },

  featuresGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 },
  featureCard: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "24px 22px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)"
  },
  featureIconWrap: { width: 44, height: 44, borderRadius: 14, background: "rgba(37, 99, 235, 0.14)", border: "1px solid rgba(59, 130, 246, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  featureIcon: { lineHeight: 1 },
  featureTitle: { margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" },
  featureText: { margin: 0, fontSize: 14, lineHeight: 1.6, color: "#94a3b8" },

  aiDemoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" },
  aiDemoText: { display: "flex", flexDirection: "column", gap: 12 },
  mockupWindow: {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    background: "linear-gradient(155deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 20,
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45), 0 0 40px rgba(37, 99, 235, 0.08)",
    overflow: "hidden",
    backdropFilter: "blur(6px)"
  },
  mockupTopBar: { display: "flex", alignItems: "center", gap: 7, padding: "12px 14px", borderBottom: "1px solid rgba(148, 163, 184, 0.14)" },
  mockupDot: { width: 9, height: 9, borderRadius: 999, display: "inline-block" },
  mockupUrlPill: { marginLeft: 10, fontSize: 11, color: "#64748b", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148, 163, 184, 0.14)", borderRadius: 999, padding: "3px 10px" },
  guideChatBody: { display: "flex", flexDirection: "column", gap: 10, padding: "18px 16px", minHeight: 200 },
  guideChatBubbleUser: { alignSelf: "flex-end", maxWidth: "82%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#f8fafc", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", fontSize: 13, lineHeight: 1.5, fontWeight: 600 },
  guideChatBubbleAI: { alignSelf: "flex-start", maxWidth: "86%", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(148, 163, 184, 0.14)", color: "#cbd5e1", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", fontSize: 13, lineHeight: 1.55 },
  guideChatInputRow: { marginTop: "auto", display: "flex", alignItems: "center", gap: 8, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(148, 163, 184, 0.14)", borderRadius: 999, padding: "8px 8px 8px 14px" },
  guideChatInputText: { flex: 1, fontSize: 12, color: "#64748b" },
  guideChatSendBtn: { width: 28, height: 28, borderRadius: 999, background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 },

  timeSection: {
    marginTop: 64,
    textAlign: "center",
    background: "linear-gradient(155deg, rgba(37,99,235,0.12) 0%, rgba(10,14,26,0.3) 60%, rgba(10,14,26,0.1) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    borderRadius: 20,
    padding: "48px 24px",
    maxWidth: 900,
    marginLeft: "auto",
    marginRight: "auto"
  },

  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 },
  stepCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "24px 22px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)"
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.16)",
    border: "1px solid rgba(59, 130, 246, 0.35)",
    color: "#93c5fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 800
  },

  ctaSection: {
    textAlign: "center",
    padding: "56px 32px",
    background: "linear-gradient(155deg, rgba(37,99,235,0.16) 0%, rgba(10,14,26,0.4) 60%, rgba(10,14,26,0.1) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    borderRadius: 20,
    margin: "64px auto 0",
    maxWidth: 820,
    boxShadow: "0 30px 70px rgba(0, 0, 0, 0.35), 0 0 60px rgba(37, 99, 235, 0.12)"
  },
  ctaTitle: { margin: "0 0 24px", fontSize: "2rem", color: "#f8fafc", fontWeight: 800, letterSpacing: "-0.01em" },
  ctaButtons: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  ctaButtonPrimary: { border: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", borderRadius: 10, padding: "14px 26px", fontWeight: 700, cursor: "pointer", minHeight: 48, fontSize: 15 },

  footer: { marginTop: 64, background: "rgba(255, 255, 255, 0.02)", borderTop: "1px solid rgba(148, 163, 184, 0.14)", padding: "32px 8px 20px", color: "#94a3b8" },
  footerGrid: { display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 24, marginBottom: 24, textAlign: "left" },
  footerColumn: { display: "flex", flexDirection: "column", gap: 10 },
  footerLogo: { fontSize: 17, fontWeight: 800, color: "#f8fafc" },
  footerTagline: { margin: 0, fontSize: 13, lineHeight: 1.6, color: "#64748b", maxWidth: "28ch" },
  footerHeading: { margin: "0 0 2px", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#cbd5e1" },
  footerColLink: { color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "color 0.2s ease", width: "fit-content" },
  footerBottom: { display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", borderTop: "1px solid rgba(148, 163, 184, 0.1)", paddingTop: 18, marginBottom: 8 },
  footerLink: { color: "#60a5fa", textDecoration: "none", fontSize: 13, fontWeight: 600 },
  footerText: { fontSize: 12.5, color: "#64748b", margin: 0, textAlign: "center" }
};
