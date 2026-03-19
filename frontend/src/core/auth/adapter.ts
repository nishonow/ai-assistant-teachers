import { apiRequest } from "../api";
import type { LoginResponse } from "../types";
import type { AuthSession, LoginInput, RegisterInput, UserRole } from "./types";

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function buildSessionFromResponse(response: LoginResponse, fallbackIdentifier: string, defaultRole: UserRole): AuthSession {
  if (!response?.accessToken) {
    throw new Error("Сервер не вернул токен доступа.");
  }

  const role = response.role || defaultRole;
  const userId = response.user?.id || normalizeIdentifier(fallbackIdentifier);
  const username = response.user?.username || normalizeIdentifier(fallbackIdentifier);
  const displayName = response.user?.displayName || username;

  return {
    token: response.accessToken,
    kind: "backend",
    createdAt: new Date().toISOString(),
    user: {
      id: userId,
      username,
      displayName,
      role,
    },
  };
}

export async function fetchCurrentSession(token: string): Promise<AuthSession> {
  const response = await apiRequest<LoginResponse>({
    path: "/api/v1/auth/me",
    token,
  });

  const fallbackIdentifier = response.user?.username || "user";
  return buildSessionFromResponse(response, fallbackIdentifier, "user");
}

export async function loginWithAdapter(input: LoginInput): Promise<AuthSession> {
  const username = input.username.trim();
  const password = input.password.trim();

  if (!username || !password) {
    throw new Error("Укажите email или имя пользователя и пароль.");
  }

  const response = await apiRequest<LoginResponse>({
    path: "/api/v1/auth/login",
    method: "POST",
    body: {
      username,
      password,
    },
  });

  return buildSessionFromResponse(response, username, "user");
}

export async function registerWithAdapter(input: RegisterInput): Promise<AuthSession> {
  const name = input.name.trim();
  const email = normalizeIdentifier(input.email);
  const password = input.password.trim();

  if (!name || !email || !password) {
    throw new Error("Укажите имя, email и пароль.");
  }

  const response = await apiRequest<LoginResponse>({
    path: "/api/v1/auth/register",
    method: "POST",
    body: {
      name,
      email,
      password,
    },
  });

  return buildSessionFromResponse(response, email, "user");
}