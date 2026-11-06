import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const authConfigured = Boolean(
  url &&
    key &&
    !url.includes("your-project-ref") &&
    !key.includes("replace_with"),
);
export const supabase = authConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // 전용 콜백 페이지는 이번 코드 교환의 결과를 직접 확인합니다.
        detectSessionInUrl: window.location.pathname !== "/auth/callback",
        flowType: "pkce",
      },
    })
  : null;
export function requireSupabase() {
  if (!supabase)
    throw new Error(
      "클라이언트의 Supabase URL과 Publishable key를 설정하세요.",
    );
  return supabase;
}
