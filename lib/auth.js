const AUTH_COOKIE_NAME = "staffguide_auth";

function parseCookies(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) return acc;

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
}

export function extractAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice("Bearer ".length).trim();
    if (bearerToken) return bearerToken;
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || "";
}

function appendSetCookie(res, cookieValue) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookieValue]);
    return;
  }

  res.setHeader("Set-Cookie", [String(existing), cookieValue]);
}

export function setAuthCookie(res, token) {
  if (!token) return;

  const maxAge = 24 * 60 * 60;
  const cookieParts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ];

  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  appendSetCookie(res, cookieParts.join("; "));
}
