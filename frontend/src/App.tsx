import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";

export default function App() {
  // Separate screens for local development; Cognito keeps its existing callback.
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/dashboard") return <Dashboard />;
  if (path === "/" || path === "/auth/callback") return <SignIn />;
  return (
    <main className="auth-layout">
      <h1>Page not found</h1>
      <p><a href="/">Back to home</a></p>
    </main>
  );
}
