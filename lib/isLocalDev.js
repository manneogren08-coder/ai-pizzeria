// Detects whether the app is being viewed as local development - checked at
// runtime in the actual browser, not just inferred from build-time env vars,
// since a production build could in theory still be run on someone's machine.
// Defaults to false (hidden) whenever it can't be sure, e.g. during server
// rendering before this can run - a dev-only feature should never fail open.
export function isLocalDev() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}
