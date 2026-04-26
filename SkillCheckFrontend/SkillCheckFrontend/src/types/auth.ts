export interface AuthUser {
  id: number;
  email: string;
  username: string | null;
  first_name: string;
  last_name: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  password_confirm: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}
