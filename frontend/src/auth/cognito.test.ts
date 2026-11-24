import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signinRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  getUser: vi.fn(),
  removeUser: vi.fn(),
}));
vi.mock("oidc-client-ts", () => ({
  UserManager: class {
    signinRedirect = mocks.signinRedirect;
    signinRedirectCallback = mocks.signinRedirectCallback;
    getUser = mocks.getUser;
    removeUser = mocks.removeUser;
  },
  WebStorageStateStore: class {},
}));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv("VITE_COGNITO_AUTHORITY", "https://issuer.example");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "public-client");
  vi.stubEnv("VITE_COGNITO_DOMAIN", "https://login.example");
  vi.stubGlobal("window", {
    location: { origin: "http://localhost:5173", pathname: "/", assign: vi.fn() },
    sessionStorage: {},
    history: { replaceState: vi.fn() },
  });
  vi.stubGlobal("document", { title: "SurpriseMe" });
});

describe("hosted sign-in", () => {
  it("does not start authentication when configuration is missing", async () => {
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "");
    const auth = await import("./cognito");
    expect(() => auth.signIn()).toThrow("isn't configured");
    expect(mocks.signinRedirect).not.toHaveBeenCalled();
  });

  it("handles a callback once and removes its query parameters", async () => {
    window.location.pathname = "/auth/callback";
    const user = { expired: false };
    mocks.signinRedirectCallback.mockResolvedValue(user);
    const auth = await import("./cognito");
    expect(await Promise.all([auth.getSession(), auth.getSession()])).toEqual([user, user]);
    expect(mocks.signinRedirectCallback).toHaveBeenCalledTimes(1);
    expect(window.history.replaceState).toHaveBeenCalledWith({}, "SurpriseMe", "/");
  });

  it("does not restore an expired session", async () => {
    mocks.getUser.mockResolvedValue({ expired: true });
    const auth = await import("./cognito");
    expect(await auth.getSession()).toBeNull();
  });

  it("cleans up the URL even when Cognito rejects the callback", async () => {
    window.location.pathname = "/auth/callback";
    mocks.signinRedirectCallback.mockRejectedValue(new Error("Invalid state"));
    const auth = await import("./cognito");
    await expect(auth.getSession()).rejects.toThrow("Invalid state");
    expect(window.history.replaceState).toHaveBeenCalled();
  });
});
