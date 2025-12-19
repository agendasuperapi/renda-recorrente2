export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          bank_id: string | null
          cancel_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          is_production: boolean | null
          key_authorization: string
          name: string
          product_id: string | null
          return_url: string | null
          signing_secret: string
          success_url: string | null
          updated_at: string | null
        }
        Insert: {
          bank_id?: string | null
          cancel_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          key_authorization: string
          name: string
          product_id?: string | null
          return_url?: string | null
          signing_secret: string
          success_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_id?: string | null
          cancel_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          key_authorization?: string
          name?: string
          product_id?: string | null
          return_url?: string | null
          signing_secret?: string
          success_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "accounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_type: string
          category: string | null
          created_at: string | null
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      affiliate_coupons: {
        Row: {
          affiliate_id: string
          coupon_code_at_creation: string | null
          coupon_id: string
          created_at: string | null
          custom_code: string | null
          custom_code_history: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          product_id: string | null
          username_at_creation: string | null
        }
        Insert: {
          affiliate_id: string
          coupon_code_at_creation?: string | null
          coupon_id: string
          created_at?: string | null
          custom_code?: string | null
          custom_code_history?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          username_at_creation?: string | null
        }
        Update: {
          affiliate_id?: string
          coupon_code_at_creation?: string | null
          coupon_id?: string
          created_at?: string | null
          custom_code?: string | null
          custom_code_history?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          username_at_creation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "affiliate_coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "affiliate_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "affiliate_coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      affiliate_goals: {
        Row: {
          affiliate_id: string
          created_at: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          period_end: string
          period_start: string
          product_id: string | null
          target_value: number
          updated_at: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          period_end: string
          period_start: string
          product_id?: string | null
          target_value: number
          updated_at?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          period_end?: string
          period_start?: string
          product_id?: string | null
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "affiliate_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "affiliate_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          changes: string[] | null
          created_at: string | null
          created_by: string | null
          deploy_completed_at: string | null
          deploy_error: string | null
          deploy_started_at: string | null
          deploy_status: string | null
          description: string | null
          github_run_id: string | null
          id: string
          released_at: string | null
          version: string
        }
        Insert: {
          changes?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deploy_completed_at?: string | null
          deploy_error?: string | null
          deploy_started_at?: string | null
          deploy_status?: string | null
          description?: string | null
          github_run_id?: string | null
          id?: string
          released_at?: string | null
          version: string
        }
        Update: {
          changes?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deploy_completed_at?: string | null
          deploy_error?: string | null
          deploy_started_at?: string | null
          deploy_status?: string | null
          description?: string | null
          github_run_id?: string | null
          id?: string
          released_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "app_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      banks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      banner_templates: {
        Row: {
          background_color: string | null
          button_text: string | null
          button_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          subtitle: string | null
          text: string
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          subtitle?: string | null
          text: string
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          subtitle?: string | null
          text?: string
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_levels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: number
          percentage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          percentage: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          affiliate_id: string
          amount: number
          available_date: string | null
          commission_type: string
          created_at: string | null
          id: string
          level: number | null
          notes: string | null
          payment_date: string | null
          percentage: number
          product_id: string | null
          reference_month: string | null
          status: Database["public"]["Enums"]["commission_status"]
          subscription_id: string | null
          unified_payment_id: string | null
          unified_user_id: string | null
          updated_at: string | null
          withdrawal_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          available_date?: string | null
          commission_type: string
          created_at?: string | null
          id?: string
          level?: number | null
          notes?: string | null
          payment_date?: string | null
          percentage: number
          product_id?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          subscription_id?: string | null
          unified_payment_id?: string | null
          unified_user_id?: string | null
          updated_at?: string | null
          withdrawal_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          available_date?: string | null
          commission_type?: string
          created_at?: string | null
          id?: string
          level?: number | null
          notes?: string | null
          payment_date?: string | null
          percentage?: number
          product_id?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          subscription_id?: string | null
          unified_payment_id?: string | null
          unified_user_id?: string | null
          updated_at?: string | null
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_unified_payment_id_fkey"
            columns: ["unified_payment_id"]
            isOneToOne: false
            referencedRelation: "unified_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_unified_payment_id_fkey"
            columns: ["unified_payment_id"]
            isOneToOne: false
            referencedRelation: "view_admin_commission_processing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_unified_payment_id_fkey"
            columns: ["unified_payment_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["first_payment_id"]
          },
          {
            foreignKeyName: "fk_commissions_unified_user_id"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "unified_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_commissions_unified_user_id"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["unified_user_id"]
          },
          {
            foreignKeyName: "fk_commissions_unified_user_id"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_commissions_unified_user_id"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_commissions_withdrawal_id"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          app_filter: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          is_visible_to_affiliates: boolean | null
          max_uses: number | null
          name: string
          product_id: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          app_filter?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          is_visible_to_affiliates?: boolean | null
          max_uses?: number | null
          name: string
          product_id?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          app_filter?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          is_visible_to_affiliates?: boolean | null
          max_uses?: number | null
          name?: string
          product_id?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      cpf_apis: {
        Row: {
          api_type: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          priority: number
          updated_at: string
          url: string
        }
        Insert: {
          api_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number
          updated_at?: string
          url: string
        }
        Update: {
          api_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      deleted_users: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          deletion_reason: string | null
          email: string
          id: string
          metadata: Json | null
          name: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          deletion_reason?: string | null
          email: string
          id?: string
          metadata?: Json | null
          name: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      landing_announcement_banner: {
        Row: {
          background_color: string | null
          button_text: string | null
          button_url: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          subtitle: string | null
          text: string
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subtitle?: string | null
          text: string
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subtitle?: string | null
          text?: string
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_block_gradients: {
        Row: {
          block_name: string
          color_end: string
          color_start: string
          created_at: string | null
          gradient_start_position: number
          heading_color: string | null
          heading_color_dark: string | null
          heading_color_light: string | null
          id: string
          intensity_end: number
          intensity_start: number
          text_color: string | null
          text_color_dark: string | null
          text_color_light: string | null
          updated_at: string | null
        }
        Insert: {
          block_name: string
          color_end?: string
          color_start?: string
          created_at?: string | null
          gradient_start_position?: number
          heading_color?: string | null
          heading_color_dark?: string | null
          heading_color_light?: string | null
          id?: string
          intensity_end?: number
          intensity_start?: number
          text_color?: string | null
          text_color_dark?: string | null
          text_color_light?: string | null
          updated_at?: string | null
        }
        Update: {
          block_name?: string
          color_end?: string
          color_start?: string
          created_at?: string | null
          gradient_start_position?: number
          heading_color?: string | null
          heading_color_dark?: string | null
          heading_color_light?: string | null
          id?: string
          intensity_end?: number
          intensity_start?: number
          text_color?: string | null
          text_color_dark?: string | null
          text_color_light?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_faqs: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          is_active: boolean | null
          order_position: number | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_position?: number | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_position?: number | null
          question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_features: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          order_position: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          order_position?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          order_position?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_hero_images: {
        Row: {
          alt_text: string
          created_at: string | null
          dark_image_url: string | null
          id: string
          light_image_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          alt_text: string
          created_at?: string | null
          dark_image_url?: string | null
          id?: string
          light_image_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          alt_text?: string
          created_at?: string | null
          dark_image_url?: string | null
          id?: string
          light_image_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          order_position: number | null
          rating: number
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_position?: number | null
          rating?: number
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_position?: number | null
          rating?: number
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string | null
          id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          block_reason: string | null
          created_at: string | null
          email: string
          failed_count: number | null
          id: string
          ip_address: string | null
          is_permanently_blocked: boolean | null
          last_failed_at: string | null
          locked_until: string | null
          updated_at: string | null
        }
        Insert: {
          block_reason?: string | null
          created_at?: string | null
          email: string
          failed_count?: number | null
          id?: string
          ip_address?: string | null
          is_permanently_blocked?: boolean | null
          last_failed_at?: string | null
          locked_until?: string | null
          updated_at?: string | null
        }
        Update: {
          block_reason?: string | null
          created_at?: string | null
          email?: string
          failed_count?: number | null
          id?: string
          ip_address?: string | null
          is_permanently_blocked?: boolean | null
          last_failed_at?: string | null
          locked_until?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          admin_new_support_message: boolean
          created_at: string
          goal_achieved: boolean
          id: string
          new_affiliate: boolean
          new_commission: boolean
          new_payment: boolean
          new_payment_all_products: boolean | null
          new_sub_affiliate: boolean
          new_support_message: boolean
          new_version: boolean
          new_withdrawal_request: boolean
          updated_at: string
          user_id: string
          withdrawal_day: boolean
          withdrawal_paid: boolean
        }
        Insert: {
          admin_new_support_message?: boolean
          created_at?: string
          goal_achieved?: boolean
          id?: string
          new_affiliate?: boolean
          new_commission?: boolean
          new_payment?: boolean
          new_payment_all_products?: boolean | null
          new_sub_affiliate?: boolean
          new_support_message?: boolean
          new_version?: boolean
          new_withdrawal_request?: boolean
          updated_at?: string
          user_id: string
          withdrawal_day?: boolean
          withdrawal_paid?: boolean
        }
        Update: {
          admin_new_support_message?: boolean
          created_at?: string
          goal_achieved?: boolean
          id?: string
          new_affiliate?: boolean
          new_commission?: boolean
          new_payment?: boolean
          new_payment_all_products?: boolean | null
          new_sub_affiliate?: boolean
          new_support_message?: boolean
          new_version?: boolean
          new_withdrawal_request?: boolean
          updated_at?: string
          user_id?: string
          withdrawal_day?: boolean
          withdrawal_paid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          icon: string | null
          id: string
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      payments: {
        Row: {
          affiliate_coupon_id: string | null
          affiliate_id: string | null
          amount: number
          billing_reason: string | null
          created_at: string | null
          currency: string | null
          environment: string | null
          id: string
          metadata: Json | null
          payment_date: string | null
          plan_id: string | null
          status: string
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          subscription_id: string | null
          sync_response: string | null
          sync_status: string | null
          synced_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_coupon_id?: string | null
          affiliate_id?: string | null
          amount: number
          billing_reason?: string | null
          created_at?: string | null
          currency?: string | null
          environment?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          plan_id?: string | null
          status?: string
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          sync_response?: string | null
          sync_status?: string | null
          synced_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_coupon_id?: string | null
          affiliate_id?: string | null
          amount?: number
          billing_reason?: string | null
          created_at?: string | null
          currency?: string | null
          environment?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          plan_id?: string | null
          status?: string
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          sync_response?: string | null
          sync_status?: string | null
          synced_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_affiliate_coupon_id_fkey"
            columns: ["affiliate_coupon_id"]
            isOneToOne: false
            referencedRelation: "affiliate_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "payments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      pending_checkouts: {
        Row: {
          checkout_url: string
          created_at: string | null
          expires_at: string | null
          id: string
          plan_id: string
          status: string
          stripe_session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checkout_url: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checkout_url?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_checkouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_checkouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "pending_checkouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "pending_checkouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "pending_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "pending_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      plan_commission_levels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: number
          percentage: number
          plan_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          percentage: number
          plan_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          percentage?: number
          plan_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_commission_levels_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_commission_levels_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_commission_levels_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_commission_levels_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string | null
          feature_id: string
          id: string
          plan_id: string
        }
        Insert: {
          created_at?: string | null
          feature_id: string
          id?: string
          plan_id: string
        }
        Update: {
          created_at?: string | null
          feature_id?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "landing_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      plan_integrations: {
        Row: {
          account_id: string
          created_at: string | null
          environment_type: string
          id: string
          is_active: boolean | null
          plan_id: string
          stripe_price_id: string
          stripe_product_id: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          environment_type: string
          id?: string
          is_active?: boolean | null
          plan_id: string
          stripe_price_id: string
          stripe_product_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          environment_type?: string
          id?: string
          is_active?: boolean | null
          plan_id?: string
          stripe_price_id?: string
          stripe_product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_integrations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_integrations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_integrations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_integrations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_period: string
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_free: boolean
          name: string
          original_price: number | null
          price: number
          product_id: string | null
          test_account_id: string | null
          test_stripe_price_id: string | null
          test_stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          billing_period: string
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean
          name: string
          original_price?: number | null
          price: number
          product_id?: string | null
          test_account_id?: string | null
          test_stripe_price_id?: string | null
          test_stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean
          name?: string
          original_price?: number | null
          price?: number
          product_id?: string | null
          test_account_id?: string | null
          test_stripe_price_id?: string | null
          test_stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "plans_test_account_id_fkey"
            columns: ["test_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_commission_levels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: number
          percentage: number
          plan_type: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          percentage: number
          plan_type: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          percentage?: number
          plan_type?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_commission_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_commission_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_commission_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string | null
          descricao: string | null
          email: string | null
          icone_dark: string | null
          icone_light: string | null
          id: string
          logo_dark: string | null
          logo_light: string | null
          nome: string
          nome_apk: string | null
          show_on_landing: boolean | null
          site: string | null
          site_landingpage: string | null
          telefone: string | null
          texto_telefone: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          icone_dark?: string | null
          icone_light?: string | null
          id?: string
          logo_dark?: string | null
          logo_light?: string | null
          nome: string
          nome_apk?: string | null
          show_on_landing?: boolean | null
          site?: string | null
          site_landingpage?: string | null
          telefone?: string | null
          texto_telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          icone_dark?: string | null
          icone_light?: string | null
          id?: string
          logo_dark?: string | null
          logo_light?: string | null
          nome?: string
          nome_apk?: string | null
          show_on_landing?: boolean | null
          site?: string | null
          site_landingpage?: string | null
          telefone?: string | null
          texto_telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          affiliate_code: string | null
          avatar_url: string | null
          birth_date: string | null
          blocked_at: string | null
          blocked_by: string | null
          blocked_message: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_reason: string | null
          email: string | null
          facebook: string | null
          gender: string | null
          has_seen_welcome_dashboard: boolean | null
          id: string
          instagram: string | null
          is_blocked: boolean | null
          linkedin: string | null
          name: string
          neighborhood: string | null
          number: string | null
          phone: string | null
          pix_key: string | null
          pix_type: string | null
          referrer_code: string | null
          state: string | null
          street: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string | null
          username: string | null
          withdrawal_day: number | null
          youtube: string | null
        }
        Insert: {
          affiliate_code?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_message?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          email?: string | null
          facebook?: string | null
          gender?: string | null
          has_seen_welcome_dashboard?: boolean | null
          id: string
          instagram?: string | null
          is_blocked?: boolean | null
          linkedin?: string | null
          name: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_type?: string | null
          referrer_code?: string | null
          state?: string | null
          street?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          username?: string | null
          withdrawal_day?: number | null
          youtube?: string | null
        }
        Update: {
          affiliate_code?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_message?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          email?: string | null
          facebook?: string | null
          gender?: string | null
          has_seen_welcome_dashboard?: boolean | null
          id?: string
          instagram?: string | null
          is_blocked?: boolean | null
          linkedin?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_type?: string | null
          referrer_code?: string | null
          state?: string | null
          street?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          username?: string | null
          withdrawal_day?: number | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          browser: string | null
          created_at: string
          device_type: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          browser?: string | null
          created_at?: string
          device_type?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          browser?: string | null
          created_at?: string
          device_type?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      referrals: {
        Row: {
          conversion_date: string | null
          coupon_code: string | null
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          conversion_date?: string | null
          coupon_code?: string | null
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          conversion_date?: string | null
          coupon_code?: string | null
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          affiliate_coupon_id: string | null
          affiliate_id: string | null
          cancellation_details: Json | null
          created_at: string | null
          email: string | null
          environment: string | null
          event_data: Json
          event_id: string
          event_type: string
          id: string
          plan_id: string | null
          processed: boolean | null
          product_id: string | null
          reason: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_coupon_id?: string | null
          affiliate_id?: string | null
          cancellation_details?: Json | null
          created_at?: string | null
          email?: string | null
          environment?: string | null
          event_data: Json
          event_id: string
          event_type: string
          id?: string
          plan_id?: string | null
          processed?: boolean | null
          product_id?: string | null
          reason?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_coupon_id?: string | null
          affiliate_id?: string | null
          cancellation_details?: Json | null
          created_at?: string | null
          email?: string | null
          environment?: string | null
          event_data?: Json
          event_id?: string
          event_type?: string
          id?: string
          plan_id?: string | null
          processed?: boolean | null
          product_id?: string | null
          reason?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stripe_events_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stripe_events_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "fk_stripe_events_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "fk_stripe_events_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "fk_stripe_events_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stripe_events_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_stripe_events_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_stripe_events_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stripe_events_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stripe_events_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stripe_events_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "fk_stripe_events_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "stripe_events_affiliate_coupon_id_fkey"
            columns: ["affiliate_coupon_id"]
            isOneToOne: false
            referencedRelation: "affiliate_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "stripe_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      sub_affiliates: {
        Row: {
          created_at: string | null
          id: string
          level: number
          parent_affiliate_id: string
          sub_affiliate_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number
          parent_affiliate_id: string
          sub_affiliate_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number
          parent_affiliate_id?: string
          sub_affiliate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "sub_affiliates_sub_affiliate_id_fkey"
            columns: ["sub_affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_sub_affiliate_id_fkey"
            columns: ["sub_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_sub_affiliate_id_fkey"
            columns: ["sub_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_sub_affiliate_id_fkey"
            columns: ["sub_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "sub_affiliates_sub_affiliate_id_fkey"
            columns: ["sub_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          affiliate_coupon_id: string | null
          affiliate_id: string | null
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          cancellation_details: Json | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string | null
          id: string
          payment_method_data: Json | null
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_coupon_id?: string | null
          affiliate_id?: string | null
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_details?: Json | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string | null
          id?: string
          payment_method_data?: Json | null
          plan_id: string
          status: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_coupon_id?: string | null
          affiliate_id?: string | null
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_details?: Json | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string | null
          id?: string
          payment_method_data?: Json | null
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_affiliate_coupon_id_fkey"
            columns: ["affiliate_coupon_id"]
            isOneToOne: false
            referencedRelation: "affiliate_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "subscriptions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attached_references: Json | null
          created_at: string | null
          id: string
          image_urls: string[] | null
          is_admin: boolean
          message: string | null
          read_at: string | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attached_references?: Json | null
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          is_admin?: boolean
          message?: string | null
          read_at?: string | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          attached_references?: Json | null
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          is_admin?: boolean
          message?: string | null
          read_at?: string | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          closed_at: string | null
          created_at: string | null
          id: string
          is_resolved: boolean | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          rating: number | null
          rating_comment: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: number
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          rating?: number | null
          rating_comment?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number?: number
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          rating?: number | null
          rating_comment?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: number
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      test_users_counter: {
        Row: {
          id: string
          last_number: number
          updated_at: string | null
        }
        Insert: {
          id?: string
          last_number?: number
          updated_at?: string | null
        }
        Update: {
          id?: string
          last_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      unified_payments: {
        Row: {
          affiliate_coupon_id: string | null
          affiliate_id: string | null
          amount: number
          billing_reason: string | null
          commission_error: string | null
          commission_processed: boolean | null
          commission_processed_at: string | null
          commissions_generated: number | null
          created_at: string | null
          currency: string | null
          environment: string | null
          external_payment_id: string | null
          id: string
          metadata: Json | null
          payment_date: string | null
          plan_id: string | null
          product_id: string
          status: string
          stripe_invoice_id: string | null
          stripe_subscription_id: string | null
          unified_user_id: string | null
        }
        Insert: {
          affiliate_coupon_id?: string | null
          affiliate_id?: string | null
          amount: number
          billing_reason?: string | null
          commission_error?: string | null
          commission_processed?: boolean | null
          commission_processed_at?: string | null
          commissions_generated?: number | null
          created_at?: string | null
          currency?: string | null
          environment?: string | null
          external_payment_id?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          plan_id?: string | null
          product_id: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
          unified_user_id?: string | null
        }
        Update: {
          affiliate_coupon_id?: string | null
          affiliate_id?: string | null
          amount?: number
          billing_reason?: string | null
          commission_error?: string | null
          commission_processed?: boolean | null
          commission_processed_at?: string | null
          commissions_generated?: number | null
          created_at?: string | null
          currency?: string | null
          environment?: string | null
          external_payment_id?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          plan_id?: string | null
          product_id?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
          unified_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "unified_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "unified_payments_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "unified_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_payments_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["unified_user_id"]
          },
          {
            foreignKeyName: "unified_payments_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_payments_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_users: {
        Row: {
          affiliate_code: string | null
          affiliate_id: string | null
          avatar_url: string | null
          cancel_at_period_end: boolean | null
          cpf: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          deleted_at: string | null
          email: string
          environment: string | null
          external_user_id: string
          id: string
          name: string | null
          phone: string | null
          plan_id: string | null
          product_id: string
          status: string | null
          trial_end: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_id?: string | null
          avatar_url?: string | null
          cancel_at_period_end?: boolean | null
          cpf?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          deleted_at?: string | null
          email: string
          environment?: string | null
          external_user_id: string
          id?: string
          name?: string | null
          phone?: string | null
          plan_id?: string | null
          product_id: string
          status?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_id?: string | null
          avatar_url?: string | null
          cancel_at_period_end?: boolean | null
          cpf?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          deleted_at?: string | null
          email?: string
          environment?: string | null
          external_user_id?: string
          id?: string
          name?: string | null
          phone?: string | null
          plan_id?: string | null
          product_id?: string
          status?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      username_history: {
        Row: {
          changed_at: string
          id: string
          new_username: string | null
          user_id: string
          username: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_username?: string | null
          user_id: string
          username: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_username?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "username_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "username_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "username_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "username_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "username_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          affiliate_id: string
          amount: number
          approved_by: string | null
          approved_date: string | null
          commission_ids: string[]
          created_at: string | null
          id: string
          paid_date: string | null
          payment_proof_url: Json | null
          pix_key: string
          pix_type: string
          rejected_reason: string | null
          requested_date: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          approved_by?: string | null
          approved_date?: string | null
          commission_ids: string[]
          created_at?: string | null
          id?: string
          paid_date?: string | null
          payment_proof_url?: Json | null
          pix_key: string
          pix_type: string
          rejected_reason?: string | null
          requested_date?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          approved_by?: string | null
          approved_date?: string | null
          commission_ids?: string[]
          created_at?: string | null
          id?: string
          paid_date?: string | null
          payment_proof_url?: Json | null
          pix_key?: string
          pix_type?: string
          rejected_reason?: string | null
          requested_date?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "withdrawals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "withdrawals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
    }
    Views: {
      view_admin_affiliates: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_blocked: boolean | null
          name: string | null
          plan_name: string | null
          plan_period: string | null
          plan_status: string | null
          referrals_count: number | null
          referrer_code: string | null
          referrer_name: string | null
          username: string | null
          withdrawal_day: number | null
        }
        Relationships: []
      }
      view_admin_commission_processing: {
        Row: {
          affiliate_id: string | null
          affiliate_name: string | null
          amount: number | null
          billing_reason: string | null
          commission_error: string | null
          commission_processed: boolean | null
          commission_processed_at: string | null
          commissions_generated: number | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          environment: string | null
          external_payment_id: string | null
          id: string | null
          payment_date: string | null
          payment_status: string | null
          plan_id: string | null
          plan_name: string | null
          product_icon_dark: string | null
          product_icon_light: string | null
          product_id: string | null
          product_name: string | null
          unified_user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "unified_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "unified_payments_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "unified_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_payments_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["unified_user_id"]
          },
          {
            foreignKeyName: "unified_payments_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_payments_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "view_sub_affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      view_admin_payments: {
        Row: {
          affiliate_name: string | null
          amount: number | null
          billing_reason: string | null
          coupon_code: string | null
          coupon_custom_code: string | null
          created_at: string | null
          currency: string | null
          environment: string | null
          id: string | null
          payment_date: string | null
          plan_name: string | null
          plan_price: number | null
          status: string | null
          stripe_invoice_id: string | null
          stripe_subscription_id: string | null
          sync_response: string | null
          sync_status: string | null
          synced_at: string | null
          user_email: string | null
          user_name: string | null
        }
        Relationships: []
      }
      view_admin_stripe_events: {
        Row: {
          affiliate_name: string | null
          cancellation_details: Json | null
          created_at: string | null
          email: string | null
          environment: string | null
          event_data: Json | null
          event_id: string | null
          event_type: string | null
          id: string | null
          plan_name: string | null
          processed: boolean | null
          product_name: string | null
          reason: string | null
          stripe_subscription_id: string | null
          user_email_profile: string | null
          user_name: string | null
        }
        Relationships: []
      }
      view_admin_users: {
        Row: {
          affiliate_code: string | null
          avatar_url: string | null
          birth_date: string | null
          blocked_at: string | null
          blocked_by: string | null
          blocked_message: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          facebook: string | null
          gender: string | null
          id: string | null
          instagram: string | null
          is_blocked: boolean | null
          name: string | null
          neighborhood: string | null
          number: string | null
          phone: string | null
          pix_key: string | null
          pix_type: string | null
          referrer_code: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          state: string | null
          street: string | null
          tiktok: string | null
          updated_at: string | null
          username: string | null
          withdrawal_day: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "profiles_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      view_affiliate_dashboard_stats: {
        Row: {
          affiliate_id: string | null
          comissao_7_dias: number | null
          comissao_disponivel: number | null
          comissao_hoje: number | null
          comissao_mes: number | null
          comissao_pendente: number | null
          total_indicacoes: number | null
          total_sacado: number | null
          total_sub_afiliados: number | null
        }
        Insert: {
          affiliate_id?: string | null
          comissao_7_dias?: never
          comissao_disponivel?: never
          comissao_hoje?: never
          comissao_mes?: never
          comissao_pendente?: never
          total_indicacoes?: never
          total_sacado?: never
          total_sub_afiliados?: never
        }
        Update: {
          affiliate_id?: string | null
          comissao_7_dias?: never
          comissao_disponivel?: never
          comissao_hoje?: never
          comissao_mes?: never
          comissao_pendente?: never
          total_indicacoes?: never
          total_sacado?: never
          total_sub_afiliados?: never
        }
        Relationships: []
      }
      view_affiliate_goals_progress: {
        Row: {
          affiliate_id: string | null
          created_at: string | null
          current_value: number | null
          days_remaining: number | null
          goal_type: string | null
          id: string | null
          is_active: boolean | null
          period_end: string | null
          period_start: string | null
          product_icon_dark: string | null
          product_icon_light: string | null
          product_id: string | null
          product_name: string | null
          progress_percentage: number | null
          status: string | null
          target_value: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "affiliate_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "affiliate_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      view_commissions_daily: {
        Row: {
          affiliate_id: string | null
          affiliate_name: string | null
          available_date: string | null
          billing_reason: string | null
          cliente: string | null
          cliente_email: string | null
          commission_type: string | null
          coupon_code: string | null
          coupon_name: string | null
          created_at: string | null
          data: string | null
          data_filtro: string | null
          id: string | null
          level: number | null
          percentual: number | null
          plan_id: string | null
          plano: string | null
          product_icon_dark: string | null
          product_icon_light: string | null
          product_id: string | null
          produto: string | null
          purchase_number: number | null
          status: Database["public"]["Enums"]["commission_status"] | null
          unified_payment_id: string | null
          unified_user_id: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "commissions_unified_payment_id_fkey"
            columns: ["unified_payment_id"]
            isOneToOne: false
            referencedRelation: "unified_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_unified_payment_id_fkey"
            columns: ["unified_payment_id"]
            isOneToOne: false
            referencedRelation: "view_admin_commission_processing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_unified_payment_id_fkey"
            columns: ["unified_payment_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["first_payment_id"]
          },
        ]
      }
      view_commissions_monthly: {
        Row: {
          affiliate_id: string | null
          affiliate_name: string | null
          canceladas: number | null
          disponiveis: number | null
          mes_referencia: string | null
          pendentes: number | null
          percentual_medio: number | null
          plan_id: string | null
          plano: string | null
          product_id: string | null
          produto: string | null
          quantidade_comissoes: number | null
          sacadas: number | null
          tipo_predominante: string | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      view_commissions_monthly_stats: {
        Row: {
          affiliate_id: string | null
          count_3_meses: number | null
          count_ano: number | null
          count_mes: number | null
          este_ano: number | null
          este_mes: number | null
          ultimos_3_meses: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      view_commissions_stats: {
        Row: {
          affiliate_id: string | null
          count_7_dias: number | null
          count_hoje: number | null
          count_mes: number | null
          este_mes: number | null
          hoje: number | null
          ultimos_7_dias: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      view_referrals: {
        Row: {
          affiliate_code: string | null
          affiliate_id: string | null
          avatar_url: string | null
          cancel_at_period_end: boolean | null
          coupon_code: string | null
          coupon_code_history: string | null
          coupon_was_edited: boolean | null
          cpf: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          email: string | null
          environment: string | null
          external_user_id: string | null
          first_payment_id: string | null
          id: string | null
          name: string | null
          phone: string | null
          plan_billing_period: string | null
          plan_id: string | null
          plan_name: string | null
          plan_price: number | null
          product_icon_dark: string | null
          product_icon_light: string | null
          product_id: string | null
          product_name: string | null
          referrer_id: string | null
          referrer_name: string | null
          status: string | null
          trial_end: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      view_referrals_stats: {
        Row: {
          active_subscriptions: number | null
          affiliate_id: string | null
          conversion_rate: number | null
          product_id: string | null
          product_name: string | null
          total_referrals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "unified_users_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      view_sub_affiliates: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          external_user_id: string | null
          id: string | null
          level: number | null
          my_commission_from_sub: number | null
          name: string | null
          parent_affiliate_id: string | null
          plan_id: string | null
          plan_name: string | null
          product_id: string | null
          referrals_count: number | null
          status: string | null
          total_commission: number | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "unified_users_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_commissions_monthly"
            referencedColumns: ["product_id"]
          },
        ]
      }
      view_sub_affiliates_stats: {
        Row: {
          parent_affiliate_id: string | null
          total_commission: number | null
          total_sub_affiliates: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "sub_affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      view_user_activities: {
        Row: {
          activity_type: string | null
          avatar_url: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
      view_withdrawals_stats: {
        Row: {
          total_approved: number | null
          total_awaiting_release: number | null
          total_paid: number | null
          total_pending: number | null
          total_rejected_count: number | null
        }
        Relationships: []
      }
      view_withdrawals_summary: {
        Row: {
          affiliate_id: string | null
          available: number | null
          cancelled: number | null
          pending: number | null
          requested: number | null
          withdrawn: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_affiliate_dashboard_stats"
            referencedColumns: ["affiliate_id"]
          },
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "view_referrals"
            referencedColumns: ["referrer_id"]
          },
        ]
      }
    }
    Functions: {
      admin_unblock_login_account: {
        Args: { p_email: string }
        Returns: boolean
      }
      calculate_lockout_duration: {
        Args: { p_failed_count: number }
        Returns: unknown
      }
      check_email_exists: { Args: { email_to_check: string }; Returns: boolean }
      check_login_allowed: { Args: { p_email: string }; Returns: Json }
      check_username_availability: {
        Args: { p_user_id: string; p_username: string }
        Returns: boolean
      }
      expire_old_checkouts: { Args: never; Returns: undefined }
      get_affiliate_dashboard_stats: {
        Args: { p_affiliate_id: string }
        Returns: {
          affiliate_id: string
          comissao_7_dias: number
          comissao_disponivel: number
          comissao_hoje: number
          comissao_mes: number
          comissao_pendente: number
          total_indicacoes: number
          total_sacado: number
          total_sub_afiliados: number
        }[]
      }
      get_available_coupons_for_affiliates: {
        Args: never
        Returns: {
          code: string
          created_at: string
          current_uses: number
          description: string
          id: string
          is_active: boolean
          is_primary: boolean
          max_uses: number
          name: string
          product_icone_dark: string
          product_icone_light: string
          product_id: string
          product_nome: string
          product_site_landingpage: string
          type: Database["public"]["Enums"]["coupon_type"]
          valid_until: string
          value: number
        }[]
      }
      get_commissions_monthly_total: {
        Args: {
          p_affiliate_id: string
          p_mes_fim?: string
          p_mes_inicio?: string
          p_plan_id?: string
          p_product_id?: string
        }
        Returns: number
      }
      get_commissions_total: {
        Args: {
          p_affiliate_id: string
          p_cliente?: string
          p_data_fim?: string
          p_data_inicio?: string
          p_plan_id?: string
          p_product_id?: string
          p_status?: Database["public"]["Enums"]["commission_status"]
        }
        Returns: number
      }
      get_next_test_number: { Args: never; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reconfigure_commission_cron: { Args: never; Returns: Json }
      record_failed_login: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: Json
      }
      reset_login_attempts: { Args: { p_email: string }; Returns: boolean }
      send_admin_notification: {
        Args: {
          p_action_url?: string
          p_body: string
          p_reference_id?: string
          p_reference_type?: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      send_admin_notification_with_product_filter: {
        Args: {
          p_action_url: string
          p_body: string
          p_product_id: string
          p_reference_id: string
          p_reference_type: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      send_push_notification: {
        Args: {
          p_action_url?: string
          p_body: string
          p_reference_id?: string
          p_reference_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      validate_coupon: {
        Args: { p_coupon_code: string; p_product_id: string }
        Returns: {
          affiliate_avatar_url: string
          affiliate_coupon_id: string
          affiliate_id: string
          affiliate_name: string
          affiliate_username: string
          code: string
          coupon_id: string
          custom_code: string
          description: string
          is_active: boolean
          name: string
          product_id: string
          type: Database["public"]["Enums"]["coupon_type"]
          valid_until: string
          value: number
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "afiliado"
      commission_status:
        | "pending"
        | "available"
        | "withdrawn"
        | "cancelled"
        | "paid"
        | "requested"
      coupon_type: "percentage" | "days" | "free_trial"
      ticket_priority: "baixa" | "normal" | "alta" | "urgente"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_user"
        | "resolved"
        | "closed"
      ticket_type:
        | "problema"
        | "sugestao"
        | "reclamacao"
        | "duvida"
        | "financeiro"
        | "tecnico"
        | "outro"
      withdrawal_status: "pending" | "approved" | "paid" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "afiliado"],
      commission_status: [
        "pending",
        "available",
        "withdrawn",
        "cancelled",
        "paid",
        "requested",
      ],
      coupon_type: ["percentage", "days", "free_trial"],
      ticket_priority: ["baixa", "normal", "alta", "urgente"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_user",
        "resolved",
        "closed",
      ],
      ticket_type: [
        "problema",
        "sugestao",
        "reclamacao",
        "duvida",
        "financeiro",
        "tecnico",
        "outro",
      ],
      withdrawal_status: ["pending", "approved", "paid", "rejected"],
    },
  },
} as const
