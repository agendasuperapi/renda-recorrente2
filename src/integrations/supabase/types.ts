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
        ]
      }
      activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
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
        ]
      }
      affiliate_coupons: {
        Row: {
          affiliate_id: string
          coupon_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          affiliate_id: string
          coupon_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          affiliate_id?: string
          coupon_id?: string
          created_at?: string | null
          id?: string
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
            foreignKeyName: "affiliate_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
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
      commissions: {
        Row: {
          affiliate_id: string
          amount: number
          available_date: string | null
          commission_type: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          percentage: number
          reference_month: string | null
          status: Database["public"]["Enums"]["commission_status"]
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          available_date?: string | null
          commission_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          percentage: number
          reference_month?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          available_date?: string | null
          commission_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          percentage?: number
          reference_month?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          subscription_id?: string | null
          updated_at?: string | null
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
            foreignKeyName: "commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
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
          max_uses: number | null
          name: string
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
          max_uses?: number | null
          name: string
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
          max_uses?: number | null
          name?: string
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
        ]
      }
      plans: {
        Row: {
          billing_period: string
          commission_percentage: number
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
          commission_percentage?: number
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
          commission_percentage?: number
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
            foreignKeyName: "plans_test_account_id_fkey"
            columns: ["test_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
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
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string | null
          facebook: string | null
          gender: string | null
          has_seen_welcome_dashboard: boolean | null
          id: string
          instagram: string | null
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
          updated_at: string | null
          username: string | null
        }
        Insert: {
          affiliate_code?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string | null
          facebook?: string | null
          gender?: string | null
          has_seen_welcome_dashboard?: boolean | null
          id: string
          instagram?: string | null
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
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          affiliate_code?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string | null
          facebook?: string | null
          gender?: string | null
          has_seen_welcome_dashboard?: boolean | null
          id?: string
          instagram?: string | null
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
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
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
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          cancellation_comment: string | null
          cancellation_reason: string | null
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
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          cancellation_comment?: string | null
          cancellation_reason?: string | null
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
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          cancellation_comment?: string | null
          cancellation_reason?: string | null
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
            foreignKeyName: "fk_stripe_events_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stripe_events_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "sub_affiliates_sub_affiliate_id_fkey"
            columns: ["sub_affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancellation_comment: string | null
          cancellation_reason: string | null
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
          cancel_at?: string | null
          cancellation_comment?: string | null
          cancellation_reason?: string | null
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
          cancel_at?: string | null
          cancellation_comment?: string | null
          cancellation_reason?: string | null
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
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "withdrawals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role: "super_admin" | "afiliado"
      commission_status: "pending" | "available" | "withdrawn" | "cancelled"
      coupon_type: "percentage" | "days" | "free_trial"
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
      commission_status: ["pending", "available", "withdrawn", "cancelled"],
      coupon_type: ["percentage", "days", "free_trial"],
      withdrawal_status: ["pending", "approved", "paid", "rejected"],
    },
  },
} as const
