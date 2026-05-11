import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

// Singleton — never call initializeApp more than once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;

// Analytics is only supported in browser environments (not SSR/Node)
let analyticsPromise: ReturnType<typeof getAnalytics> | null = null;

export async function initAnalytics() {
  if (analyticsPromise) return analyticsPromise;
  const supported = await isSupported();
  if (supported) {
    analyticsPromise = getAnalytics(app);
    return analyticsPromise;
  }
  return null;
}

// ── Typed event helpers ────────────────────────────────────────────────────────

export async function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
) {
  try {
    const analytics = await initAnalytics();
    if (analytics) logEvent(analytics, name, params);
  } catch {
    // Analytics is non-critical — never let it break the app
  }
}

// Convenience wrappers for Luna-specific events
export const analytics = {
  moodLogged: (mood: string) =>
    trackEvent("mood_logged", { mood }),

  cycleLogged: (flow: string) =>
    trackEvent("cycle_logged", { flow }),

  journalCreated: () =>
    trackEvent("journal_entry_created"),

  pageView: (page: string) =>
    trackEvent("page_view", { page_title: page }),

  pointsEarned: (action: string, points: number) =>
    trackEvent("points_earned", { action, points }),

  login: () =>
    trackEvent("login"),

  signUp: () =>
    trackEvent("sign_up"),
};

export default app;
