import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import StaffguideApp from "../../components/staffguide/StaffguideApp";
import { restoreSession } from "../../lib/staffguide/session";

export default function StaffguideDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = checking

  useEffect(() => {
    const restored = restoreSession();
    if (!restored) {
      router.replace("/staffguide/login");
      return;
    }
    // Deferred a tick rather than calling setState directly in the
    // effect body - queueMicrotask still runs before the browser
    // paints, just avoids the synchronous-setState-in-effect pattern.
    queueMicrotask(() => setSession(restored));
  }, [router]);

  if (!session) {
    return (
      <div style={styles.loadingScreen}>
        <p style={styles.loadingText}>Laddar Staffguide...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Staffguide</title>
        <meta name="robots" content="noindex" />
      </Head>
      <StaffguideApp
        initialToken={session.token}
        initialCompany={session.company}
        initialUserRole={session.userRole}
      />
    </>
  );
}

const styles = {
  loadingScreen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "var(--background)"
  },
  loadingText: {
    color: "var(--text-muted)",
    fontSize: 14,
    fontWeight: 600
  }
};
