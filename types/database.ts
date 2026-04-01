// Database types based on schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          organization_id: string;
          department_id: string | null;
          role_id: string | null;
          email: string;
          status: string;
          last_login: string | null;
          created_at: string;
          updated_at: string;
          is_deleted: boolean;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          organization_id: string;
          department_id?: string | null;
          role_id?: string | null;
          email: string;
          status?: string;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          department_id?: string | null;
          role_id?: string | null;
          email?: string;
          status?: string;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
          created_at?: string;
        };
      };
    };
  };
}
