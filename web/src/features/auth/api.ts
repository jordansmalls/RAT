import { api, isApiError, type MessageResponse, type Resource, type User } from "@/lib/api";
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from "./schemas";

export const authApi = {
  /** The signed-in user, or `null` for guests. */
  async me(signal?: AbortSignal): Promise<User | null> {
    try {
      const response = await api.get<Resource<User>>("/api/v1/me", { signal });
      return response.data;
    } catch (error) {
      if (isApiError(error) && error.isUnauthenticated) return null;
      throw error;
    }
  },

  async login(input: LoginInput): Promise<User> {
    const response = await api.post<Resource<User>>("/api/v1/auth/login", input);
    return response.data;
  },

  async register(input: RegisterInput): Promise<User> {
    const response = await api.post<Resource<User>>("/api/v1/auth/register", input);
    return response.data;
  },

  logout(): Promise<void> {
    return api.post<void>("/api/v1/auth/logout");
  },

  forgotPassword(input: ForgotPasswordInput): Promise<MessageResponse> {
    return api.post<MessageResponse>("/api/v1/auth/forgot-password", input);
  },

  resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
    return api.post<MessageResponse>("/api/v1/auth/reset-password", input);
  },

  resendVerificationEmail(): Promise<MessageResponse> {
    return api.post<MessageResponse>("/api/v1/auth/email/verification-notification");
  },

  /**
   * `signedQuery` is the untouched query string from the emailed link (expires + signature).
   * It must be forwarded verbatim for the signature to validate.
   */
  verifyEmail(id: string, hash: string, signedQuery: string): Promise<MessageResponse> {
    const path = `/api/v1/auth/email/verify/${encodeURIComponent(id)}/${encodeURIComponent(hash)}`;
    return api.post<MessageResponse>(`${path}?${signedQuery}`);
  },
};
