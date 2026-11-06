import api, { publicApi } from "./api";
import { requireSupabase } from "../config/supabase";
export const authAPIService = {
  getProviders: async () => (await publicApi.get("/api/auth/providers")).data,
  register: async ({ email, password, name }) => {
    const { data, error } = await requireSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  },
  login: async ({ email, password }) => {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  },
  logout: async () => {
    const { error } = await requireSupabase().auth.signOut({ scope: "local" });
    if (error) throw error;
  },
  getCurrentUser: async () => (await api.get("/api/auth/me")).data,
  getAllUsers: async () => (await api.get("/api/users/all")).data,
  changeUserType: async (userId, userType) =>
    (await api.put(`/api/users/${userId}/type`, { userType })).data,
  updateProfile: async (payload) =>
    (await api.put("/api/users/profile", payload)).data,
  deactivateAccount: async () => (await api.delete("/api/users/account")).data,
  changePassword: async (currentPassword, password) => {
    const { error } = await requireSupabase().auth.updateUser({
      current_password: currentPassword,
      password,
    });
    if (error) throw error;
  },
  socialLogin: async (provider) => {
    if (!["google", "custom:naver"].includes(provider))
      throw new Error("지원하지 않는 로그인 방식입니다.");
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  },
};
export { api as authAPI };
