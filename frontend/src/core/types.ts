export type TabId = "overview" | "users" | "documents" | "upload";

export interface TabItem {
  id: TabId;
  label: string;
}

export interface NoticeState {
  type: "success" | "error";
  message: string;
}

export interface UserRecord {
  id: number;
  platform: string;
  platform_user_id: string;
  name: string | null;
  username: string | null;
  login?: string | null;
  is_blocked: boolean;
  is_admin: boolean;
  created_at: string | null;
}

export interface DocumentRecord {
  id: number;
  file_name: string;
  file_type: string;
  uploaded_by: string;
  status: string;
  chunk_count?: number;
  created_at?: string | null;
}

export interface StatsResponse {
  total_users: number;
  total_messages: number;
  total_documents: number;
  total_chunks: number;
  by_platform: Record<string, number>;
}

export interface LoginResponse {
  accessToken: string;
  role?: "user" | "admin";
  user?: {
    id?: string;
    username?: string;
    displayName?: string;
  };
}

export interface MakeAdminPayload {
  login: string;
  password: string;
}

export interface LoadingState {
  stats: boolean;
  users: boolean;
  documents: boolean;
  upload: boolean;
}

