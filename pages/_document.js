import { Html, Head, Main, NextScript } from "next/document";
import { THEME_INIT_SCRIPT } from "../lib/theme/themeInitScript";

// Applies the stored/system theme to <html> before React hydrates, so
// CRM/Staffguide never show light mode for a moment and then flip to
// dark (see lib/theme/ThemeContext.tsx for the matching React-side
// logic). Harmless on every other page too - data-theme only has a
// visual effect where components actually read the CSS variables it
// controls (styles/globals.css), which is nowhere on the public
// marketing pages. The site's CSP (next.config.ts) is script-src
// 'self' with no 'unsafe-inline', so this exact script's hash is
// allowlisted there instead - see THEME_INIT_SCRIPT's own comment.

export default function Document() {
  return (
    <Html lang="sv">
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#05070d" />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
