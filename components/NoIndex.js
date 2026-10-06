import Head from "next/head";

// Keeps a page publicly reachable (e.g. /setup, /demo) while telling
// search engines not to index it or follow its links. Rendered in the
// server HTML, so it is present even before client-side JS runs.
export default function NoIndex() {
  return (
    <Head>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
  );
}
