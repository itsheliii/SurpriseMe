import SurpriseDetails from "./pages/SurpriseDetails";
import SignIn from "./pages/SignIn";
import CreateSurprise from "./pages/CreateSurprise";
import Dashboard from "./pages/Dashboard";

export default function App() {
  // Separate screens for local development; Cognito keeps its existing callback.
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/surprises/new") return <CreateSurprise />;
  const surpriseRoute = /^\/surprises\/([^/]+)$/.exec(path);
  if (surpriseRoute) return <SurpriseDetails id={surpriseRoute[1]} />;
  if (path === "/dashboard") return <Dashboard />;
  if (path === "/" || path === "/auth/callback") return <SignIn />;
  return (
    <main className="auth-layout">
      <h1>Page not found</h1>
      <p><a href="/">Back to home</a></p>
    </main>
  );
}
