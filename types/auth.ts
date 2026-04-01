export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
  status?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  organization_id: string;
  department_id: string | null;
  role_id: string | null;
  status: string;
}
