import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";

// Smooth-scrolls to a section on the current page, offset by the sticky
// nav's real height so the target doesn't land underneath it. Only makes
// sense when we're already on the page that contains the section (the
// homepage) - on other pages the plain "/#id" Link href does the right
// thing by navigating home and letting the browser jump to the anchor.
function scrollToSectionOnHome(id) {
  const section = document.getElementById(id);
  if (!section) return;

  const nav = document.querySelector(".landingNav");
  const headerOffset = (nav ? nav.getBoundingClientRect().height : 0) + 16;
  const targetY = section.getBoundingClientRect().top + window.scrollY - headerOffset;

  window.scrollTo({ top: Math.max(targetY, 0), behavior: "smooth" });
}

// On the homepage these scroll to the matching teaser section (existing
// behaviour, preserved as-is); from any other page they navigate to the
// dedicated product page instead, since the teaser sections only exist
// on the homepage.
const NAV_LINKS = [
  { href: "/webbdesign", label: "Hemsidor", sectionId: "hemsidor-section" },
  { href: "/staffguide", label: "Staffguide", sectionId: "staffguide-section" }
];

// Same links as desktop, plus an explicit "Hem" entry since the mobile
// menu doesn't rely on the logo alone for getting back to the homepage.
const MOBILE_LINKS = [
  { href: "/", label: "Hem" },
  ...NAV_LINKS
];

export default function LandingNav({ onLoginClick }) {
  const router = useRouter();
  const isHome = router.pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    router.events.on("routeChangeStart", closeMenu);
    return () => router.events.off("routeChangeStart", closeMenu);
  }, [router.events]);

  const handleSectionLinkClick = (event, sectionId) => {
    setMenuOpen(false);
    if (isHome) {
      event.preventDefault();
      scrollToSectionOnHome(sectionId);
    }
  };

  const handleLoginClick = (event) => {
    setMenuOpen(false);
    if (isHome) {
      event.preventDefault();
      if (onLoginClick) {
        onLoginClick();
      } else {
        scrollToSectionOnHome("login-section");
      }
    }
  };

  return (
    <nav style={styles.landingNav} className="landingNav" ref={navRef}>
      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .landingNav {
          animation: fadeInDown 0.7s ease both;
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

        .landingNavLogoLink:focus-visible {
          outline: 2px solid rgba(148, 163, 184, 0.6);
          outline-offset: 4px;
        }

        .landingNavLoginBtn:hover {
          background: rgba(255, 255, 255, 0.09) !important;
          border-color: rgba(148, 163, 184, 0.5) !important;
          transform: translateY(-1px);
        }

        .landingNavMenuBtn {
          display: none;
        }

        .landingNavMenuBtn:hover {
          background: rgba(255, 255, 255, 0.09) !important;
          border-color: rgba(148, 163, 184, 0.5) !important;
        }

        .hamburgerIcon {
          position: relative;
          width: 18px;
          height: 13px;
          display: inline-block;
        }

        .hamburgerIcon span {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 2px;
          background: #f8fafc;
          transition: transform 0.25s ease, opacity 0.2s ease, top 0.25s ease;
        }

        .hamburgerIcon span:nth-child(1) { top: 0; }
        .hamburgerIcon span:nth-child(2) { top: 5.5px; }
        .hamburgerIcon span:nth-child(3) { top: 11px; }

        .hamburgerIcon.isOpen span:nth-child(1) {
          top: 5.5px;
          transform: rotate(45deg);
        }

        .hamburgerIcon.isOpen span:nth-child(2) {
          opacity: 0;
        }

        .hamburgerIcon.isOpen span:nth-child(3) {
          top: 5.5px;
          transform: rotate(-45deg);
        }

        .mobileMenuPanel {
          animation: fadeInDown 0.2s ease both;
        }

        .mobileMenuLink:hover,
        .mobileMenuLoginBtn:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        @media (max-width: 700px) {
          .landingNavLinks {
            display: none !important;
          }

          .landingNavMenuBtn {
            display: inline-flex !important;
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
        }
      `}</style>

      <div style={styles.landingNavInner} className="landingNavInner">
        <Link
          href="/"
          style={styles.landingNavLogoLink}
          className="landingNavLogoLink"
          aria-label="Effexo – till startsidan"
          onClick={() => setMenuOpen(false)}
        >
          <Image src="/effexo-icon-white.png" alt="" width={201} height={216} priority style={styles.landingNavLogoIcon} className="landingNavLogoIcon" />
          <Image src="/effexo-wordmark-white.png" alt="" width={448} height={124} priority style={styles.landingNavLogoWordmark} className="landingNavLogoWordmark" />
        </Link>

        <div style={styles.landingNavLinks} className="landingNavLinks">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={styles.landingNavLink}
              className="landingNavLink"
              onClick={(event) => handleSectionLinkClick(event, link.sectionId)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/#contact-section" style={styles.landingNavLink} className="landingNavLink" onClick={(event) => handleSectionLinkClick(event, "contact-section")}>
            Kontakt
          </Link>
          <Link href="/#login-section" style={styles.landingNavLoginBtn} className="landingNavLoginBtn" onClick={handleLoginClick}>
            Logga in
          </Link>
        </div>

        <button
          type="button"
          style={styles.landingNavMenuBtn}
          className="landingNavMenuBtn"
          aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={`hamburgerIcon${menuOpen ? " isOpen" : ""}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav-menu" style={styles.mobileMenuPanel} className="mobileMenuPanel">
          {MOBILE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={styles.mobileMenuLink}
              className="mobileMenuLink"
              onClick={(event) => (link.sectionId ? handleSectionLinkClick(event, link.sectionId) : setMenuOpen(false))}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/#contact-section" style={styles.mobileMenuLink} className="mobileMenuLink" onClick={(event) => handleSectionLinkClick(event, "contact-section")}>
            Kontakt
          </Link>
          <Link href="/#login-section" style={styles.mobileMenuLoginBtn} className="mobileMenuLoginBtn" onClick={handleLoginClick}>
            Logga in
          </Link>
        </div>
      )}
    </nav>
  );
}

const styles = {
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
  landingNavLogoLink: {
    display: "inline-flex",
    alignItems: "center",
    flex: "none",
    gap: 12,
    lineHeight: 0,
    textDecoration: "none",
    borderRadius: 6
  },
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
  landingNavMenuBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    padding: 0,
    border: "1px solid rgba(148, 163, 184, 0.28)",
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.04)",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.2s ease, border-color 0.2s ease"
  },
  mobileMenuPanel: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    background: "rgba(5, 7, 13, 0.96)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
    padding: "4px 18px 16px"
  },
  mobileMenuLink: {
    display: "block",
    padding: "14px 6px",
    minHeight: 44,
    boxSizing: "border-box",
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: 600,
    textDecoration: "none",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: 6
  },
  mobileMenuLoginBtn: {
    display: "block",
    textAlign: "center",
    marginTop: 14,
    padding: "13px 16px",
    minHeight: 44,
    boxSizing: "border-box",
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(148, 163, 184, 0.28)",
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: 15,
    textDecoration: "none"
  }
};
