export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attachments: {
        Row: {
          id: string
          submission_id: string
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          question_name: string
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          question_name: string
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          storage_path?: string
          question_name?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          created_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      forms: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          xml_content: string
          version: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          xml_content: string
          version?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          xml_content?: string
          version?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          teable_base_url: string | null
          teable_base_id: string | null
          teable_api_token: string | null
          teable_table_id: string | null
          teable_table_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          teable_base_url?: string | null
          teable_base_id?: string | null
          teable_api_token?: string | null
          teable_table_id?: string | null
          teable_table_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          teable_base_url?: string | null
          teable_base_id?: string | null
          teable_api_token?: string | null
          teable_table_id?: string | null
          teable_table_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          form_id: string
          user_id: string | null
          data: Json
          status: string
          synced_to_teable: boolean
          teable_record_id: string | null
          sync_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          user_id?: string | null
          data?: Json
          status?: string
          synced_to_teable?: boolean
          teable_record_id?: string | null
          sync_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          user_id?: string | null
          data?: Json
          status?: string
          synced_to_teable?: boolean
          teable_record_id?: string | null
          sync_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_project_access: {
        Row: {
          id: string
          user_id: string
          project_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string
          email: string
          username: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id: string
          email: string
          username: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          username?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
