import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const authority = import.meta.env.VITE_COGNITO_AUTHORITY;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const domain = import.meta.env.VITE_COGNITO_DOMAIN;
const redirectUri = `${window.location.origin}/auth/callback`;

// The library manages PKCE, OAuth state, token exchange, and OIDC validation.
// Browser app clients must not have a client secret.
const manager = authority && clientId && domain ? new UserManager({
  authority,
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope: "openid email profile",
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: false,
  loadUserInfo: false,
}) : null;

function requireManager() {
  if (!manager) throw new Error("Sign-in isn't configured yet. Please try again later.");
  return manager;
}

export function signIn() {
  return requireManager().signinRedirect();
}

// Reuse the callback promise when React StrictMode runs effects twice.
let sessionPromise: ReturnType<typeof readSession> | undefined;
async function readSession() {
  if (!manager) return null;
  if (window.location.pathname === "/auth/callback") {
    try {
      return await manager.signinRedirectCallback();
    } finally {
      // Remove the authorization code and state from browser history.
      window.history.replaceState({}, document.title, "/");
    }
  }
  const user = await manager.getUser();
  return user && !user.expired ? user : null;
}

export function getSession() {
  return sessionPromise ??= readSession();
}

export async function signOut() {
  await requireManager().removeUser();
  const url = new URL("/logout", domain);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("logout_uri", `${window.location.origin}/`);
  window.location.assign(url);
}
