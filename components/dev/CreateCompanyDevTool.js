// Local-development-only shortcut for quickly creating test companies while
// building StaffGuide. Links to the dev-only /dev/create-company page (not
// the public /setup flow), so you can set your own admin-panel password
// instead of getting a randomly generated one - purely a
// visibility/navigation shortcut, no creation logic lives here.
//
// To remove this tool entirely later: delete this file and its one
// import + render line in pages/_app.js.
import Link from "next/link";
import { useEffect, useState } from "react";
import { isLocalDev } from "../../lib/isLocalDev";

export default function CreateCompanyDevTool() {
  // Starts hidden and only ever flips to visible client-side, after
  // confirming the page is genuinely being viewed on localhost. This means
  // the button is absent from server-rendered/static HTML entirely.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(isLocalDev());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Link
      href="/dev/create-company"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "#111827",
        color: "#fbbf24",
        border: "1px solid #fbbf24",
        borderRadius: 8,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 700,
        textDecoration: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
      }}
      title="Utvecklarverktyg - endast synligt lokalt"
    >
      🛠️ Skapa företag
    </Link>
  );
}
