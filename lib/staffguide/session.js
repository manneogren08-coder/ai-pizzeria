// Single source of truth for restoring a Staffguide session from
// localStorage - previously duplicated inline inside the monolithic
// pages/index.js. Purely client-trusting (decodes the JWT's own `exp`
// claim, no server round-trip) - this matches the exact behavior that
// already existed before the route split, see the auth investigation
// this refactor was based on. Do not change this logic without also
// checking lib/auth.js server-side, which independently verifies the
// token's signature on every API call regardless of what this returns.

function isJwtExpired(jwtToken) {
  if (!jwtToken || typeof jwtToken !== "string") {
    return true;
  }

  try {
    const parts = jwtToken.split(".");
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));
    if (!payload?.exp) return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// Returns { token, company, userRole } if a valid, non-expired session
// is stored, otherwise null. Clears storage as a side effect when what's
// stored is missing/invalid/expired, exactly like the original inline
// effect did.
export function restoreSession() {
  const savedToken = localStorage.getItem("token");
  const savedCompany = localStorage.getItem("company");

  if (!savedToken || !savedCompany || isJwtExpired(savedToken)) {
    localStorage.removeItem("token");
    localStorage.removeItem("company");
    return null;
  }

  try {
    const parsedCompany = JSON.parse(savedCompany);
    return {
      token: savedToken,
      company: parsedCompany,
      userRole: parsedCompany?.role || "member"
    };
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("company");
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("company");
}
