import { apiRequest } from "../api";
import type { LoginResponse } from "../types";
import type { AuthSession, LoginInput, RegisterInput, UpdateProfileInput, UserRole } from "./types";

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

function localizeAuthError(error: unknown, fallbackMessage: string): Error {
  if (!(error instanceof Error)) {
    return new Error(fallbackMessage);
  }

  const normalized = error.message.trim().toLowerCase();

  if (normalized.includes("invalid credentials") || normalized.includes("incorrect username or password")) {
    return new Error("Неверный логин или пароль.");
  }

  if (normalized.includes("user already exists") || normalized.includes("already registered")) {
    return new Error("Пользователь с таким email уже зарегистрирован.");
  }

  return error;
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

  let response: LoginResponse;

  try {
    response = await apiRequest<LoginResponse>({
      path: "/api/v1/auth/login",
      method: "POST",
      body: {
        username,
        password,
      },
    });
  } catch (error) {
    throw localizeAuthError(error, "Не удалось войти.");
  }

  return buildSessionFromResponse(response, username, "user");
}

export async function registerWithAdapter(input: RegisterInput): Promise<AuthSession> {
  const name = input.name.trim();
  const email = normalizeIdentifier(input.email);
  const password = input.password.trim();

  if (!name || !email || !password) {
    throw new Error("Укажите имя, email и пароль.");
  }

  let response: LoginResponse;

  try {
    response = await apiRequest<LoginResponse>({
      path: "/api/v1/auth/register",
      method: "POST",
      body: {
        name,
        email,
        password,
      },
    });
  } catch (error) {
    throw localizeAuthError(error, "Не удалось зарегистрироваться.");
  }

  return buildSessionFromResponse(response, email, "user");
}

export async function updateProfileWithAdapter(token: string, input: UpdateProfileInput): Promise<AuthSession> {
  const name = input.name.trim();
  const email = normalizeIdentifier(input.email);
  const password = input.password?.trim() || "";

  if (!name) {
    throw new Error("Укажите имя.");
  }

  if (!email) {
    throw new Error("Укажите email.");
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
