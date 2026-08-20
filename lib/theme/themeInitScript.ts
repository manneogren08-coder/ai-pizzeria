// The anti-flash theme script's exact text, shared between
// pages/_document.js (which inlines it) and next.config.ts (which
// allowlists it in the CSP's script-src via a hash of this exact
// string - see CONTENT_SECURITY_POLICY). Keeping both in one place
// means the hash can never drift out of sync with the script it's
// supposed to authorize.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("effexo_theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;
