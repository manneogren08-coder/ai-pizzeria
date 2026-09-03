import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import LandingNav from "../components/LandingNav";

export default function Home() {
  const landingFaqs = [
    {
      question: "Vad är Effexo?",
      answer: "Effexo är företaget bakom StaffGuide och hemsidor för restauranger och småföretag."
    },
    {
      question: "Vad är StaffGuide?",
      answer: "StaffGuide är Effexos interna verktyg som hjälper restauranger och företag att samla rutiner, recept och information på ett ställe."
    },
    {
      question: "Hur snabbt kommer vi igång?",
      answer: "Vanligtvis kan ni börja använda systemet inom några dagar efter onboarding."
    },
    {
      question: "Behöver vi teknisk kunskap?",
      answer: "Nej, vi sätter upp allt åt er."
    },
    {
      question: "Kan vi anpassa innehållet?",
      answer: "Ja, all information är helt anpassningsbar för ert företag."
    }
  ];

  const [contactForm, setContactForm] = useState({
    name: "",
    restaurant: "",
    email: "",
    message: ""
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactMessage, setContactMessage] = useState("");

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setContactMessage("Fyll i alla obligatoriska fält");
      return;
    }

    setContactSubmitting(true);
    setContactMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });

      if (res.ok) {
        setContactMessage("Tack för ditt meddelande! Vi återkommer snart.");
        setContactForm({ name: "", restaurant: "", email: "", message: "" });
      } else {
        setContactMessage("Något gick fel. Försök igen senare.");
      }
    } catch {
      setContactMessage("Något gick fel. Försök igen senare.");
    }

    setContactSubmitting(false);
  };

  const handleContactChange = (field, value) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
    setContactMessage("");
  };
    const scrollToSection = (id) => {
      const section = document.getElementById(id);
      if (!section) return;

      // Offset the scroll target by the sticky nav's real height (measured live so it
      // stays correct on both desktop and mobile) plus a little breathing room, so the
      // section doesn't land underneath the fixed header.
      const nav = document.querySelector(".landingNav");
      const headerOffset = (nav ? nav.getBoundingClientRect().height : 0) + 16;
      const targetY = section.getBoundingClientRect().top + window.scrollY - headerOffset;

      window.scrollTo({ top: Math.max(targetY, 0), behavior: "smooth" });
    };

    return (
      <div style={styles.landingPage} className="landingPage">
        <Head>
          <title>Effexo | Digitala lösningar för restauranger och småföretag</title>
          <meta name="description" content="Effexo bygger digitala lösningar som StaffGuide och hemsidor för restauranger och småföretag." />
          <meta property="og:title" content="Effexo | Digitala lösningar för restauranger och småföretag" />
          <meta property="og:description" content="Effexo bygger digitala lösningar som StaffGuide och hemsidor för restauranger och småföretag." />
        </Head>
        <style jsx>{`
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

          .orbC {
            width: 180px;
            height: 180px;
            background: radial-gradient(circle, rgba(191, 219, 254, 0.8) 0%, rgba(191, 219, 254, 0) 72%);
            top: 44%;
            right: 20%;
            animation-duration: 10s;
          }

          .heroPulse {
            animation: pulse 6s ease-in-out infinite;
          }

          @keyframes drift {
            0% { transform: translate3d(0, 0, 0) scale(1); }
            50% { transform: translate3d(0, -12px, 0) scale(1.04); }
            100% { transform: translate3d(0, 0, 0) scale(1); }
          }

          @keyframes pulse {
            0% { box-shadow: 0 10px 28px rgba(37, 99, 235, 0.14); }
            50% { box-shadow: 0 14px 34px rgba(37, 99, 235, 0.2); }
            100% { box-shadow: 0 10px 28px rgba(37, 99, 235, 0.14); }
          }

          @media (max-width: 1040px) {
            .landingGrid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }

            .faqGrid {
              grid-template-columns: 1fr !important;
            }

            .landingGrid > section {
              min-width: 0;
            }

            .footerGrid {
              grid-template-columns: repeat(2, 1fr) !important;
            }

            .servicesSection,
            .faqSection,
            .trustSection {
              margin-top: 48px !important;
            }

            .ctaSection {
              margin: 48px auto 0 !important;
            }

            .siteFooter {
              margin-top: 48px !important;
            }
          }

          @media (max-width: 700px) {
            .landingPage {
              overflow-x: hidden;
            }

            .landingGrid {
              gap: 12px !important;
            }

            .landingContentWrap {
              padding: 12px !important;
            }

            .heroPanel {
              padding: 16px !important;
              border-radius: 14px !important;
            }

            .heroTitle {
              font-size: 1.55rem !important;
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

            .contactSection {
              padding: 20px 16px !important;
              margin-bottom: 28px !important;
            }

            .servicesSection,
            .faqSection,
            .trustSection {
              margin-top: 32px !important;
            }

            .faqSection {
              margin-bottom: 28px !important;
            }

            .ctaSection {
              margin: 32px auto 0 !important;
            }

            .siteFooter {
              margin-top: 32px !important;
            }

            .ctaButtons {
              flex-direction: column;
              gap: 8px !important;
            }

            .ctaButtonPrimary,
            .ctaButtonSecondary {
              width: 100%;
            }

            .ctaSection {
              padding: 36px 20px !important;
            }

            .ctaTitle {
              font-size: 1.5rem !important;
            }

            .trustGrid {
              grid-template-columns: 1fr !important;
            }

            .trustTitle {
              font-size: 1.3rem !important;
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

          :global(body) {
            background: #05070d;
          }

          .fadeInSection {
            animation: fadeInUp 0.7s ease both;
          }

          .heroMockupWrap {
            animation: fadeInUp 0.7s ease 0.1s both, floatMockup 8s ease-in-out 0.8s infinite;
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes floatMockup {
            0% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0); }
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

          .mockupWindow {
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }

          .heroMockupWrap:hover .mockupWindow {
            transform: translateY(-4px);
            box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5), 0 0 50px rgba(37, 99, 235, 0.14);
          }

          .servicesSection {
            animation: fadeInUp 0.7s ease 0.1s both;
          }

          .serviceCard {
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          }

          .serviceCard:hover {
            transform: translateY(-6px);
            box-shadow: 0 22px 48px rgba(0, 0, 0, 0.4), 0 0 32px rgba(37, 99, 235, 0.14);
            border-color: rgba(59, 130, 246, 0.4) !important;
          }

          .serviceCardButton {
            transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          }

          .serviceCardButton:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(148, 163, 184, 0.5) !important;
            transform: translateY(-1px);
          }

          .trustSection,
          .faqSection {
            animation: fadeInUp 0.7s ease 0.1s both;
          }

          .ctaSection {
            animation: fadeInUp 0.7s ease 0.1s both, pulse 5s ease-in-out 1s infinite;
          }

          .siteFooter {
            animation: fadeInUp 0.7s ease both;
          }

          .ctaButtonPrimary:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(37, 99, 235, 0.45);
          }

          .ctaButtonSecondary:hover {
            background: rgba(255, 255, 255, 0.07) !important;
            border-color: rgba(148, 163, 184, 0.5) !important;
            transform: translateY(-2px);
          }

          .footerColLink:hover {
            color: #e2e8f0 !important;
          }

          .contactField {
            caret-color: #60a5fa;
          }

          .contactField::placeholder {
            color: #64748b;
          }

          .contactField:focus {
            border-color: rgba(59, 130, 246, 0.5) !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
          }

          .contactSubmitButton:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(37, 99, 235, 0.35);
          }

          .faqItem:hover {
            border-color: rgba(59, 130, 246, 0.35) !important;
            background: rgba(255, 255, 255, 0.045) !important;
          }

          .faqItem[open] .faqAnswer {
            animation: faqReveal 0.25s ease both;
          }

          @keyframes faqReveal {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @media (max-width: 1040px) {
            .servicesGrid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 18px !important;
            }


            .valueFeaturesGrid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 16px !important;
            }
          }

          @media (max-width: 700px) {
            .servicesGrid {
              grid-template-columns: 1fr !important;
            }

            .servicesTitle {
              font-size: 1.6rem !important;
            }


            .valueFeaturesGrid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        <LandingNav />

        <div style={styles.landingBackground}>
          <div className="landingOrb orbA" />
          <div className="landingOrb orbB" />
          <div className="landingOrb orbC" />
        </div>

        <div style={styles.landingContentWrap} className="landingContentWrap">
          <div className="landingGrid" style={styles.landingGrid}>
            <section style={styles.heroPanel} className="heroPanel fadeInSection">
              <span style={styles.heroBadge}>EFFEXO</span>
              <h1 className="heroTitle" style={styles.heroTitle}>
                Digitala lösningar som sparar tid och hjälper företag att växa.
              </h1>
              <p className="heroLead" style={styles.heroLead}>
                Vi bygger smarta digitala verktyg, hemsidor och synlighet för småföretag och restauranger – så att ni kan lägga tiden på det ni gör bäst.
              </p>

              <div style={styles.heroCtaRow} className="heroCtaRow">
                <button
                  type="button"
                  style={styles.heroCtaPrimary}
                  className="heroCtaBtn heroCtaPrimaryBtn"
                  onClick={() => scrollToSection("contact-section")}
                >
                  Boka möte
                </button>
                <button
                  type="button"
                  style={styles.heroCtaSecondary}
                  className="heroCtaBtn heroCtaSecondaryBtn"
                  onClick={() => scrollToSection("services-section")}
                >
                  Utforska våra tjänster
                </button>
              </div>

              <div style={styles.heroMetaRow}>
                <span style={styles.heroMetaChip}>Meny + recept i realtid</span>
                <span style={styles.heroMetaChip}>Säkrare svar om allergener</span>
                <span style={styles.heroMetaChip}>Byggt för iPad och mobil</span>
              </div>
            </section>

            <div style={styles.heroMockupWrap} className="heroMockupWrap">
              <div style={styles.mockupWindow} className="mockupWindow">
                <div style={styles.mockupTopBar}>
                  <span style={{ ...styles.mockupDot, background: "#ff5f57" }} />
                  <span style={{ ...styles.mockupDot, background: "#febc2e" }} />
                  <span style={{ ...styles.mockupDot, background: "#28c840" }} />
                  <span style={styles.mockupUrlPill}>staffguide.app/dashboard</span>
                </div>
                <div style={styles.mockupBody}>
                  <div style={styles.mockupSidebar}>
                    <span style={{ ...styles.mockupSidebarIcon, background: "#2563eb" }} />
                    <span style={styles.mockupSidebarIcon} />
                    <span style={styles.mockupSidebarIcon} />
                    <span style={styles.mockupSidebarIcon} />
                  </div>
                  <div style={styles.mockupMain}>
                    <div style={styles.mockupMainHeader}>
                      <span>Dagens prep</span>
                      <span style={styles.mockupLivePill}>Live</span>
                    </div>
                    <div style={styles.mockupTaskRow}>
                      <span style={styles.mockupTaskCheck}>✓</span>
                      <span style={styles.mockupTaskText}>Degjäsning kontrollerad 09:00</span>
                    </div>
                    <div style={styles.mockupTaskRow}>
                      <span style={styles.mockupTaskCheck}>✓</span>
                      <span style={styles.mockupTaskText}>Allergenlista verifierad</span>
                    </div>
                    <div style={styles.mockupTaskRow}>
                      <span style={{ ...styles.mockupTaskCheck, ...styles.mockupTaskCheckPending }}>•</span>
                      <span style={styles.mockupTaskText}>Specialsås uppdateras</span>
                    </div>
                    <div style={styles.mockupChartRow}>
                      <span style={{ ...styles.mockupChartBar, height: 14 }} />
                      <span style={{ ...styles.mockupChartBar, height: 22 }} />
                      <span style={{ ...styles.mockupChartBar, height: 30 }} />
                      <span style={{ ...styles.mockupChartBar, height: 18 }} />
                      <span style={{ ...styles.mockupChartBar, height: 26 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section id="services-section" style={styles.servicesSection} className="servicesSection">
            <h2 className="servicesTitle" style={styles.servicesTitle}>Våra tjänster</h2>
            <div style={styles.servicesGrid} className="servicesGrid">
              <div style={styles.serviceCard} className="serviceCard">
                <div style={styles.serviceIconWrap}>
                  <span style={styles.serviceIcon}>🤖</span>
                </div>
                <h3 style={styles.serviceCardTitle}>StaffGuide</h3>
                <p style={styles.serviceCardDesc}>
                  Effexo erbjuder StaffGuide för restauranger – en AI-assistent som hjälper personalen att hitta svar på rutiner, allergener, recept, arbetsuppgifter och intern information på några sekunder.
                </p>
                <div style={styles.serviceBadgeRow}>
                  <span style={styles.serviceBadge}>AI</span>
                  <span style={styles.serviceBadge}>Personal</span>
                  <span style={styles.serviceBadge}>Kunskap</span>
                  <span style={styles.serviceBadge}>Mise en place</span>
                </div>
                <Link href="/staffguide" style={styles.serviceCardButton} className="serviceCardButton">Läs mer</Link>
              </div>

              <div style={styles.serviceCard} className="serviceCard">
                <div style={styles.serviceIconWrap}>
                  <span style={styles.serviceIcon}>🌐</span>
                </div>
                <h3 style={styles.serviceCardTitle}>Hemsidor</h3>
                <p style={styles.serviceCardDesc}>
                  Vi bygger moderna, snabba och mobilanpassade hemsidor som hjälper företag att skapa förtroende och få fler kunder.
                </p>
                <div style={styles.serviceBadgeRow}>
                  <span style={styles.serviceBadge}>Responsive</span>
                  <span style={styles.serviceBadge}>SEO</span>
                  <span style={styles.serviceBadge}>Modern Design</span>
                  <span style={styles.serviceBadge}>Snabb</span>
                </div>
                <Link href="/webbdesign" style={styles.serviceCardButton} className="serviceCardButton">Läs mer</Link>
              </div>
            </div>
          </section>

          <div style={styles.sectionDivider} />

          <section style={styles.faqSection} className="faqSection">
            <h3 style={styles.faqTitle}>Vanliga frågor</h3>
            <div className="faqGrid" style={styles.faqGrid}>
              {landingFaqs.map((item, index) => (
                <details key={item.question} style={styles.faqItem} className="faqItem">
                  <summary
                    className={`faqSummary faq-${index}`}
                    style={styles.faqSummary}
                  >{item.question}</summary>
                  <p style={styles.faqAnswer} className="faqAnswer">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="contact-section" style={styles.contactSection} className="contactSection fadeInSection">
            <h2 style={styles.contactTitle}>Intresserad? Hör av dig</h2>
            <form style={styles.contactForm} onSubmit={handleContactSubmit}>
              <input
                style={styles.contactInput}
                className="contactField"
                type="text"
                placeholder="Namn *"
                value={contactForm.name}
                onChange={(e) => handleContactChange("name", e.target.value)}
                disabled={contactSubmitting}
                required
              />
              <input
                style={styles.contactInput}
                className="contactField"
                type="text"
                placeholder="Restaurangnamn"
                value={contactForm.restaurant}
                onChange={(e) => handleContactChange("restaurant", e.target.value)}
                disabled={contactSubmitting}
              />
              <input
                style={styles.contactInput}
                className="contactField"
                type="email"
                placeholder="E-post *"
                value={contactForm.email}
                onChange={(e) => handleContactChange("email", e.target.value)}
                disabled={contactSubmitting}
                required
              />
              <textarea
                style={styles.contactTextarea}
                className="contactField"
                placeholder="Meddelande *"
                value={contactForm.message}
                onChange={(e) => handleContactChange("message", e.target.value)}
                disabled={contactSubmitting}
                required
              />
              {contactMessage && (
                <p style={{ color: contactMessage.includes("Tack") ? "#059669" : "#dc2626", fontSize: 14, textAlign: "center" }}>
                  {contactMessage}
                </p>
              )}
              <button
                style={styles.contactSubmitButton}
                className="contactSubmitButton"
                type="submit"
                disabled={contactSubmitting}
              >
                {contactSubmitting ? "Skickar..." : "Skicka"}
              </button>
            </form>
          </section>

          <section style={styles.trustSection} className="trustSection">
            <h2 style={styles.trustTitle}>Byggd från grunden med fokus på restauranger!</h2>
            <div style={styles.trustGrid} className="trustGrid">
              <div style={{ ...styles.serviceCard, ...styles.trustCard }} className="serviceCard">
                <div style={styles.trustCheckWrap}>✓</div>
                <h3 style={styles.trustCardTitle}>Snabbare arbetsflöden</h3>
              </div>
              <div style={{ ...styles.serviceCard, ...styles.trustCard }} className="serviceCard">
                <div style={styles.trustCheckWrap}>✓</div>
                <h3 style={styles.trustCardTitle}>Mindre frågor till chefen</h3>
              </div>
              <div style={{ ...styles.serviceCard, ...styles.trustCard }} className="serviceCard">
                <div style={styles.trustCheckWrap}>✓</div>
                <h3 style={styles.trustCardTitle}>Bättre struktur i teamet</h3>
              </div>
            </div>
          </section>

          <section style={styles.ctaSection} className="ctaSection">
            <h2 style={styles.ctaTitle}>Redo att digitalisera er verksamhet?</h2>
            <p style={styles.ctaSubtitle}>
              Vi hjälper företag att spara tid, minska stress och få bättre struktur i vardagen.
            </p>
            <div style={styles.ctaButtons}>
              <button
                style={styles.ctaButtonPrimary}
                className="ctaButtonPrimary"
                onClick={() => scrollToSection("contact-section")}
              >
                Boka demo
              </button>
              <button
                style={styles.ctaButtonSecondary}
                className="ctaButtonSecondary"
                onClick={() => scrollToSection("contact-section")}
              >
                Kontakta oss
              </button>
            </div>
          </section>

          <footer style={styles.footer} className="siteFooter">
            <div style={styles.footerGrid} className="footerGrid">
              <div style={styles.footerColumn} className="footerColumn">
                <div style={styles.footerLogo}>Effexo</div>
                <p style={styles.footerTagline}>
                  Digitala lösningar som sparar tid och hjälper företag att växa.
                </p>
              </div>

              <div style={styles.footerColumn} className="footerColumn">
                <h4 style={styles.footerHeading}>Produkt</h4>
                <Link href="/staffguide" className="footerColLink" style={styles.footerColLink}>StaffGuide</Link>
                <Link href="/webbdesign" className="footerColLink" style={styles.footerColLink}>Hemsidor</Link>
              </div>

              <div style={styles.footerColumn} className="footerColumn">
                <h4 style={styles.footerHeading}>Företag</h4>
                <a href="#" className="footerColLink" style={styles.footerColLink} onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Om oss</a>
                <a href="#contact-section" className="footerColLink" style={styles.footerColLink} onClick={(e) => { e.preventDefault(); scrollToSection("contact-section"); }}>Kontakt</a>
              </div>

              <div style={styles.footerColumn} className="footerColumn">
                <h4 style={styles.footerHeading}>Juridik</h4>
                <a href="/privacy" className="footerColLink" style={styles.footerColLink}>Integritetspolicy</a>
                <a href="/privacy" className="footerColLink" style={styles.footerColLink}>GDPR</a>
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

  landingBackground: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none"
  },

  landingContentWrap: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1200,
    margin: "0 auto",
    padding: "56px 18px 34px"
  },

  landingGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 1fr",
    gap: 40,
    alignItems: "center"
  },

  heroPanel: {
    padding: "12px 4px"
  },

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

  heroTitle: {
    margin: "0 0 18px",
    fontSize: "3rem",
    lineHeight: 1.1,
    color: "#f8fafc",
    fontWeight: 800,
    letterSpacing: "-0.02em"
  },

  heroLead: {
    margin: "0 0 28px",
    fontSize: "1.13rem",
    lineHeight: 1.6,
    color: "#94a3b8",
    maxWidth: "52ch"
  },

  heroCtaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 28
  },

  heroCtaPrimary: {
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
    fontSize: 15
  },

  heroCtaSecondary: {
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#e2e8f0",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
    fontSize: 15
  },

  heroMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4
  },

  heroMetaChip: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    color: "#cbd5e1",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600
  },

  heroMockupWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  mockupWindow: {
    width: "100%",
    maxWidth: 420,
    background: "linear-gradient(155deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 20,
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45), 0 0 40px rgba(37, 99, 235, 0.08)",
    overflow: "hidden",
    backdropFilter: "blur(6px)"
  },

  mockupTopBar: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "12px 14px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.14)"
  },

  mockupDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    display: "inline-block"
  },

  mockupUrlPill: {
    marginLeft: 10,
    fontSize: 11,
    color: "#64748b",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 999,
    padding: "3px 10px"
  },

  mockupBody: {
    display: "flex",
    minHeight: 220
  },

  mockupSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "16px 12px",
    borderRight: "1px solid rgba(148, 163, 184, 0.12)"
  },

  mockupSidebarIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    background: "rgba(148, 163, 184, 0.16)",
    display: "inline-block"
  },

  mockupMain: {
    flex: 1,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  mockupMainHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 700
  },

  mockupLivePill: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.05em",
    color: "#4ade80",
    background: "rgba(74, 222, 128, 0.12)",
    border: "1px solid rgba(74, 222, 128, 0.3)",
    borderRadius: 999,
    padding: "3px 8px"
  },

  mockupTaskRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    borderRadius: 10,
    padding: "8px 10px"
  },

  mockupTaskCheck: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.25)",
    color: "#93c5fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    flexShrink: 0
  },

  mockupTaskCheckPending: {
    background: "rgba(148, 163, 184, 0.16)",
    color: "#94a3b8"
  },

  mockupTaskText: {
    fontSize: 12.5,
    color: "#cbd5e1",
    fontWeight: 500
  },

  mockupChartRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    marginTop: "auto",
    paddingTop: 8
  },

  mockupChartBar: {
    width: 14,
    borderRadius: 4,
    background: "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
    display: "inline-block"
  },

  loginRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: 64
  },

  servicesSection: {
    marginTop: 64
  },

  servicesTitle: {
    margin: "0 0 36px",
    fontSize: "2.1rem",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#f8fafc",
    textAlign: "center"
  },

  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 24,
    alignItems: "stretch",
    maxWidth: 820,
    margin: "0 auto"
  },

  serviceCard: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "28px 24px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)"
  },

  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "rgba(37, 99, 235, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22
  },

  serviceIcon: {
    lineHeight: 1
  },

  serviceCardTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#f8fafc"
  },

  serviceCardDesc: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#94a3b8",
    flex: 1
  },

  serviceBadgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },

  serviceBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: "#cbd5e1",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 999,
    padding: "5px 10px"
  },

  serviceCardButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#f8fafc",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block"
  },

  sectionDivider: {
    height: 1,
    maxWidth: 1100,
    margin: "0 auto",
    background: "linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.22), transparent)"
  },

  valuesRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 18
  },

  valueFeaturesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20
  },

  loginCard: {
    background: "#ffffff",
    padding: "35px 30px 30px",
    borderRadius: 16,
    width: "100%",
    maxWidth: 430,
    boxShadow: "0 10px 24px rgba(37,99,235,0.08)",
    border: "1px solid #dbeafe",
    textAlign: "center",
    boxSizing: "border-box",
    transition: "transform 0.2s, box-shadow 0.2s",
  },

  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 32,
    margin: "0 auto 20px auto"
  },

  subtitle: {
    marginBottom: 24,
    color: "#475569",
    fontSize: 14,
    fontWeight: 600
  },

  loginModeRow: {
    display: "flex",
    gap: 8,
    marginBottom: 14
  },

  loginModeButton: {
    flex: 1,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out"
  },

  loginModeButtonActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
    transition: "all 0.2s ease-in-out"
  },

  employeeLoginHint: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "left"
  },

  // Shared by the public login form (out of dark-mode scope) AND dozens
  // of admin-panel/app forms (in scope) - themed here since the app
  // usages vastly outnumber the login form's; the login form's 6 call
  // sites override these color properties inline to stay pinned to
  // their original light-only look (see the `!company` branch above).
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 16,
    borderRadius: 10,
    border: "1.5px solid var(--border-input)",
    marginBottom: 12,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    background: "var(--surface)",
    color: "var(--text)"
  },

  primaryButton: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 48,
    transition: "background 0.2s, transform 0.1s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(37,99,235,0.18)"
  },

  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontSize: 14
  },

  faqSection: {
    marginTop: 64,
    marginBottom: 40,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "28px 24px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)"
  },

  faqTitle: {
    margin: "0 0 16px",
    fontSize: "1.6rem",
    color: "#f8fafc",
    letterSpacing: "-0.01em",
    fontWeight: 800
  },

  faqGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10
  },

  faqItem: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 12,
    padding: 12,
    transition: "border-color 0.2s ease, background 0.2s ease"
  },

  faqSummary: {
    cursor: "pointer",
    fontWeight: 700,
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 1.35,
    listStyle: "none",
    position: "relative",
    paddingLeft: "25px",
    transition: "all 0.2s ease-in-out"
  },

  faqAnswer: {
    margin: "10px 0 0",
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 1.6
  },

  contactSection: {
    maxWidth: 600,
    margin: "0 auto",
    marginBottom: 40,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "28px 24px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)",
    backdropFilter: "blur(5px)"
  },

  contactTitle: {
    margin: "0 0 20px",
    fontSize: "1.6rem",
    color: "#f8fafc",
    fontWeight: 800,
    textAlign: "center"
  },

  contactForm: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },

  contactInput: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.24)",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#f1f5f9"
  },

  contactTextarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.24)",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#f1f5f9",
    minHeight: 100,
    resize: "vertical",
    fontFamily: "inherit"
  },

  contactSubmitButton: {
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    minHeight: 48,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease"
  },

  trustSection: {
    marginTop: 64,
    textAlign: "center"
  },

  trustTitle: {
    margin: "0 0 32px",
    fontSize: "1.6rem",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#f8fafc"
  },

  trustGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20
  },

  trustCard: {
    alignItems: "center",
    textAlign: "center"
  },

  trustCheckWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "rgba(74, 222, 128, 0.12)",
    border: "1px solid rgba(74, 222, 128, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 800,
    color: "#4ade80",
    margin: "0 auto"
  },

  trustCardTitle: {
    margin: 0,
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#f1f5f9"
  },

  ctaSection: {
    textAlign: "center",
    padding: "56px 32px",
    background: "linear-gradient(155deg, rgba(37,99,235,0.16) 0%, rgba(10,14,26,0.4) 60%, rgba(10,14,26,0.1) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    borderRadius: 20,
    margin: "64px auto 0",
    maxWidth: 820,
    boxShadow: "0 30px 70px rgba(0, 0, 0, 0.35), 0 0 60px rgba(37, 99, 235, 0.12)",
    position: "relative",
    overflow: "hidden"
  },

  ctaTitle: {
    margin: "0 0 14px",
    fontSize: "2.1rem",
    color: "#f8fafc",
    fontWeight: 800,
    letterSpacing: "-0.01em"
  },

  ctaSubtitle: {
    margin: "0 auto 28px",
    maxWidth: "48ch",
    fontSize: "1.05rem",
    lineHeight: 1.6,
    color: "#cbd5e1"
  },

  ctaButtons: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    position: "relative",
    zIndex: 1
  },

  ctaButtonPrimary: {
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#fff",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
    fontSize: 15,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease"
  },

  ctaButtonSecondary: {
    border: "1px solid rgba(148, 163, 184, 0.35)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#f8fafc",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
    fontSize: 15,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease"
  },

  footer: {
    marginTop: 64,
    background: "rgba(255, 255, 255, 0.02)",
    borderTop: "1px solid rgba(148, 163, 184, 0.14)",
    padding: "32px 8px 20px",
    color: "#94a3b8"
  },

  footerGrid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
    gap: 24,
    marginBottom: 24,
    textAlign: "left"
  },

  footerColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  footerLogo: {
    fontSize: 17,
    fontWeight: 800,
    color: "#f8fafc"
  },

  footerTagline: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.6,
    color: "#64748b",
    maxWidth: "28ch"
  },

  footerHeading: {
    margin: "0 0 2px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#cbd5e1"
  },

  footerColLink: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "color 0.2s ease",
    width: "fit-content"
  },

  footerBottom: {
    display: "flex",
    justifyContent: "center",
    gap: 20,
    flexWrap: "wrap",
    borderTop: "1px solid rgba(148, 163, 184, 0.1)",
    paddingTop: 18,
    marginBottom: 8
  },

  footerLink: {
    color: "#60a5fa",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600
  },

  footerText: {
    fontSize: 12.5,
    color: "#64748b",
    margin: 0,
    textAlign: "center"
  },
};
