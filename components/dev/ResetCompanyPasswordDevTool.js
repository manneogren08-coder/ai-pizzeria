// Local-development-only shortcut for resetting a forgotten test-company
// login password. Links to /dev/reset-password - no password logic lives
// here, this is purely a visibility/navigation shortcut.
//
// To remove this tool entirely later: delete this file, delete
// pages/dev/reset-password.js and pages/api/dev/reset-company-password.js,
// and remove the one import + render line in pages/_app.js.
import Link from "next/link";
import { useEffect, useState } from "react";
import { isLocalDev } from "../../lib/isLocalDev";

export default function ResetCompanyPasswordDevTool() {
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
      href="/dev/reset-password"
      style={{
        position: "fixed",
        bottom: 70,
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
      🔑 Återställ lösenord
    </Link>
  );
}
