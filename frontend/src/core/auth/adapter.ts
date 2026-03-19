import { apiRequest } from "../api";
import type { LoginResponse } from "../types";
import type { AuthSession, LoginInput, RegisterInput, UpdateProfileInput, UserRole } from "./types";

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function buildSessionFromResponse(response: LoginResponse, fallbackIdentifier: string, defaultRole: UserRole): AuthSession {
  if (!response?.accessToken) {
    throw new Error("Ð¡ÐµÑÐ²ÐµÑ Ð½Ðµ Ð²ÐµÑÐ½ÑÐ» ÑÐ¾ÐºÐµÐ½ Ð´Ð¾ÑÑÑÐ¿Ð°.");
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
    throw new Error("Ð£ÐºÐ°Ð¶Ð¸ÑÐµ email Ð¸Ð»Ð¸ Ð¸Ð¼Ñ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð¸ Ð¿Ð°ÑÐ¾Ð»Ñ.");
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
    throw new Error("Ð£ÐºÐ°Ð¶Ð¸ÑÐµ Ð¸Ð¼Ñ, email Ð¸ Ð¿Ð°ÑÐ¾Ð»Ñ.");
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

export async function updateProfileWithAdapter(token: string, input: UpdateProfileInput): Promise<AuthSession> {
  const name = input.name.trim();
  const email = normalizeIdentifier(input.email);
  const password = input.password?.trim() || "";

  if (!name) {
    throw new Error("Ð£ÐºÐ°Ð¶Ð¸ÑÐµ Ð¸Ð¼Ñ.");
  }

  if (!email) {
    throw new Error("Ð£ÐºÐ°Ð¶Ð¸ÑÐµ email.");
  }

  const response = await apiRequest<LoginResponse>({
    path: "/api/v1/auth/me",
    method: "POST",
    token,
    body: {
      name,
      email,
      password: password || undefined,
    },
  });

  const fallbackIdentifier = response.user?.username || email;
  return buildSessionFromResponse(response, fallbackIdentifier, "user");
}
