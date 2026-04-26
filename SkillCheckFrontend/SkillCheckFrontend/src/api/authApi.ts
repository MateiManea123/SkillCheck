import { apiClient } from "./http";
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from "../types/auth";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login/", payload);
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/register/", payload);
  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>("/auth/me/");
  return response.data;
}
