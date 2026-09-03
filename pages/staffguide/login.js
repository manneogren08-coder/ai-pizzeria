import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import LandingNav from "../../components/LandingNav";
import StaffguideLogin from "../../components/staffguide/StaffguideLogin";
import { restoreSession } from "../../lib/staffguide/session";

export default function StaffguideLoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (restoreSession()) {
      router.replace("/staffguide/dashboard");
      return;
    }
    // Deferred a tick rather than calling setState directly in the
    // effect body - see the matching comment in dashboard.js.
    queueMicrotask(() => setCheckingSession(false));
  }, [router]);

  const handleLoginSuccess = () => {
    router.push("/staffguide/dashboard");
  };

  return (
    <div style={styles.page} className="landingPage">
      <Head>
        <title>Logga in | Staffguide</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style jsx global>{`
        :global(body) {
          background: #05070d;
        }
      `}</style>

      <LandingNav />

      {!checkingSession && (
        <div style={styles.content}>
          <StaffguideLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #05070d 0%, #0a0e1a 45%, #0b0f1c 100%)"
  },
  content: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 72px)",
    padding: "24px 16px"
  }
};
