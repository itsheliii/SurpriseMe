import { useEffect, useState } from "react";
import type { User } from "oidc-client-ts";
import { getSession, signIn, signOut } from "../auth/cognito";

export default function SignIn() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSession().then((session) => {
      if (active) setUser(session);
    }).catch(() => {
      if (active) setError("We couldn't complete sign-in. Please try again.");
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, []);

  async function handleSignIn() {
    setError("");
    setBusy(true);
    try {
      await signIn();
    } catch (err) {
      setError(err instanceof Error && err.message.includes("isn't configured")
        ? err.message : "We couldn't open sign-in. Please try again.");
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError("");
    setBusy(true);
    try {
      await signOut();
    } catch {
      setUser(null);
      setError("We couldn't complete sign-out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <header className="brand" aria-label="SurpriseMe">
        <span className="brand-icon" aria-hidden="true">✦</span>
        SurpriseMe
      </header>
      <section className="sign-in-card" aria-labelledby="sign-in-title" aria-busy={busy}>
        <h1 id="sign-in-title">{user ? "You're signed in." : "Welcome back."}</h1>
        <p className="intro">{user
          ? "Your account is connected."
          : "Sign in to your account to continue."}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="sign-in-button" type="button" disabled={busy}
          onClick={user ? handleSignOut : handleSignIn}>
          {busy ? "Please wait…" : user ? "Sign out" : "Sign in"}
          {!busy && <span aria-hidden="true">→</span>}
        </button>
      </section>
    </main>
  );
}
