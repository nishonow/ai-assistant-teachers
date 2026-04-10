export type UserRole = "user" | "admin";

export type AuthSessionKind = "backend" | "local";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isBlocked: boolean;
}

export interface AuthSession {
  token: string;
  kind: AuthSessionKind;
  createdAt: string;
  user: AuthUser;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name: string;
  email: string;
  password?: string;
}

