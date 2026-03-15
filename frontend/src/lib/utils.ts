export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function saveToken(token: string, username: string): void {
  localStorage.setItem("admin_access_token", token);
  localStorage.setItem("admin_username", username);
}

export function clearToken(): void {
  localStorage.removeItem("admin_access_token");
  localStorage.removeItem("admin_username");
}

export function getStoredAuth(): { token: string; username: string } {
  return {
    token: localStorage.getItem("admin_access_token") || "",
    username: localStorage.getItem("admin_username") || "admin",
  };
}
