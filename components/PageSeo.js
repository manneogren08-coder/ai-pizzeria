import Head from "next/head";

const SITE_URL = "https://www.effexo.se";

// Single source for a public page's title, description, canonical URL
// and basic Open Graph tags, so canonical and og:url can never drift
// apart. `path` is the page's path on the canonical host ("/",
// "/webbdesign", ...).
export default function PageSeo({ title, description, path }) {
  const url = `${SITE_URL}${path}`;

  return (
    <Head>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Effexo" />
      <meta property="og:locale" content="sv_SE" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
    </Head>
  );
}
