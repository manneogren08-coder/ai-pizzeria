import Head from "next/head";
import Link from "next/link";
import LandingNav from "../components/LandingNav";

const values = [
  { icon: "🔍", title: "Hitta företaget", text: "Snabb att hitta via Google, sociala medier och rekommendationer." },
  { icon: "💡", title: "Förstå vad ni erbjuder", text: "Tydligt vad ni gör och för vem, redan på startsidan." },
  { icon: "📞", title: "Hitta kontaktuppgifter", text: "Telefonnummer, e-post och adress ett klick bort." },
  { icon: "🕒", title: "Hitta öppettider", text: "Aktuella öppettider utan att behöva ringa och fråga." },
  { icon: "📋", title: "Hitta meny/information", text: "Rätt information samlad och lätt att bläddra i, även på mobilen." },
  { icon: "➡️", title: "Ta nästa steg", text: "Boka, ringa eller höra av sig – utan onödiga klick." }
];

const process = [
  { number: "1", title: "Vi lär känna företaget", text: "Vi pratar om vad ni gör, vilka era kunder är och vad webbplatsen ska uppnå." },
  { number: "2", title: "Vi designar webbplatsen", text: "En design som speglar ert varumärke och passar era kunder." },
  { number: "3", title: "Kunden får se och ge feedback", text: "Ni får se förslaget och vi justerar tillsammans innan lansering." },
  { number: "4", title: "Webbplatsen lanseras", text: "Vi publicerar webbplatsen och säkerställer att allt fungerar." },
  { number: "5", title: "Drift och underhåll", text: "Effexo kan hjälpa till att hålla webbplatsen igång och uppdaterad." }
];

export default function WebbdesignPage() {
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
        <title>Webbdesign | Effexo – Webbplatser för restauranger och småföretag</title>
        <meta
          name="description"
          content="Effexo bygger moderna, mobilanpassade webbplatser för restauranger och små och medelstora företag – från design till drift."
        />
        <meta property="og:title" content="Webbdesign | Effexo" />
        <meta
          property="og:description"
          content="Effexo bygger moderna, mobilanpassade webbplatser för restauranger och små och medelstora företag – från design till drift."
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

        .fadeInSection {
          animation: fadeInUp 0.7s ease both;
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
          .featuresGrid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .footerGrid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .stepsGrid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }

          .portfolioGrid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          .landingPage {
            overflow-x: hidden;
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

          .stepsGrid {
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

      <LandingNav />

      <div style={styles.landingBackground}>
        <div className="landingOrb orbA" />
        <div className="landingOrb orbB" />
      </div>

      <div style={styles.landingContentWrap} className="landingContentWrap">
        <section style={styles.heroSection} className="fadeInSection">
          <span style={styles.heroBadge}>EFFEXO</span>
          <h1 className="heroTitle" style={styles.heroTitle}>Webbplatser som gör jobbet.</h1>
          <p className="heroLead" style={styles.heroLead}>
            Effexo bygger moderna, mobilanpassade webbplatser för företag – med särskilt fokus på restauranger och små och medelstora företag.
          </p>
          <div style={styles.heroCtaRow} className="heroCtaRow">
            <button type="button" style={styles.heroCtaPrimary} className="heroCtaBtn heroCtaPrimaryBtn" onClick={() => scrollToSection("process-section")}>
              Se vår process
            </button>
            <Link href="/#contact-section" style={{ ...styles.heroCtaSecondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }} className="heroCtaBtn heroCtaSecondaryBtn">
              Kontakta oss
            </Link>
          </div>
          <div style={styles.heroMetaRow}>
            <span style={styles.heroMetaChip}>Snabba</span>
            <span style={styles.heroMetaChip}>Mobilanpassade</span>
            <span style={styles.heroMetaChip}>SEO-optimerade</span>
          </div>
        </section>

        <section style={styles.section}>
          <h2 className="sectionTitle" style={styles.sectionTitle}>En webbplats som faktiskt gör nytta</h2>
          <p style={styles.sectionLead}>
            En bra webbplats gör det enkelt för kunder att hitta det de behöver – snabbt, och utan att leta.
          </p>
          <div style={styles.featuresGrid} className="featuresGrid">
            {values.map((item) => (
              <div key={item.title} style={styles.featureCard} className="featureCard">
                <div style={styles.featureIconWrap}><span style={styles.featureIcon}>{item.icon}</span></div>
                <h3 style={styles.featureTitle}>{item.title}</h3>
                <p style={styles.featureText}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="process-section" style={styles.section}>
          <h2 className="sectionTitle" style={styles.sectionTitle}>Så jobbar vi</h2>
          <div style={styles.stepsGrid} className="stepsGrid">
            {process.map((step) => (
              <div key={step.number} style={styles.stepCard}>
                <div style={styles.stepNumber}>{step.number}</div>
                <h3 style={styles.featureTitle}>{step.title}</h3>
                <p style={styles.featureText}>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 className="sectionTitle" style={styles.sectionTitle}>Exempel på vad vi bygger</h2>
          <p style={styles.sectionLead}>
            Vi fyller på med fler exempel här allt eftersom projekt blir klara.
          </p>
          <div style={styles.portfolioGrid} className="portfolioGrid">
            <div style={styles.portfolioCard}>
              <span style={styles.portfolioBadge}>Kommer snart</span>
              <h3 style={styles.featureTitle}>Restaurangwebbplats</h3>
              <p style={styles.featureText}>Ett kommande exempel på en modern, mobilanpassad restaurangsida.</p>
            </div>
            <div style={styles.portfolioCard}>
              <span style={styles.portfolioBadge}>Kommer snart</span>
              <h3 style={styles.featureTitle}>Företagswebbplats</h3>
              <p style={styles.featureText}>Ett kommande exempel på en webbplats för ett litet eller medelstort företag.</p>
            </div>
          </div>
        </section>

        <section style={styles.ctaSection} className="ctaSection">
          <h2 style={styles.ctaTitle}>Behöver ditt företag en bättre webbplats?</h2>
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

  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 },
  stepCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "22px 18px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)"
  },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.16)",
    border: "1px solid rgba(59, 130, 246, 0.35)",
    color: "#93c5fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 800
  },

  portfolioGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 },
  portfolioCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-start",
    background: "linear-gradient(155deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
    border: "1px dashed rgba(148, 163, 184, 0.28)",
    borderRadius: 20,
    padding: "24px 22px"
  },
  portfolioBadge: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#93c5fd",
    background: "rgba(37, 99, 235, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: 999,
    padding: "4px 10px"
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
