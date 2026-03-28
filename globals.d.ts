interface ClerkSession {
  getToken(): Promise<string>;
}

interface ClerkInstance {
  session?: ClerkSession;
}

interface Window {
  Clerk?: ClerkInstance;
}
