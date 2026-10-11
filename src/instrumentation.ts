/**
 * Runs once when the server starts. Logs a prominent warning when the app is
 * running without authentication, and a clear error when auth is enabled but
 * misconfigured. Actual enforcement lives in proxy.ts / the login route.
 */
export async function register() {
  const { getAuthConfig } = await import("./lib/auth");
  const config = getAuthConfig();

  if (!config.enabled) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[bookquotr] ⚠️  AUTH_ENABLED=false — authentication is DISABLED. " +
          "Anyone who can reach this server has full access to your data. " +
          "Only use this on a trusted, private network."
      );
    }
    return;
  }

  if (config.errors.length > 0) {
    console.error(
      "[bookquotr] ❌ Authentication is enabled but misconfigured. " +
        "Requests will be rejected until this is fixed:\n- " +
        config.errors.join("\n- ")
    );
  }
}
