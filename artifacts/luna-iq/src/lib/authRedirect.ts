/** Full URL for Supabase auth email links (forgot password, etc.). */
export function getAuthRedirectUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${base}${normalized}`;
}
