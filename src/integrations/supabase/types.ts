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
      account_members: {
        Row: {
          account_id: string
          created_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["account_member_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["account_member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["account_member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          currency: string
          default_split: Json | null
          deleted_at: string | null
          id: string
          is_shared: boolean
          name: string
          owner_id: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          default_split?: Json | null
          deleted_at?: string | null
          id?: string
          is_shared?: boolean
          name: string
          owner_id: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          default_split?: Json | null
          deleted_at?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string
          id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id: string
          id?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          account_id: string
          amount_planned: number
          category_id: string
          created_at: string
          id: string
          period: string
        }
        Insert: {
          account_id: string
          amount_planned: number
          category_id: string
          created_at?: string
          id?: string
          period: string
        }
        Update: {
          account_id?: string
          amount_planned?: number
          category_id?: string
          created_at?: string
          id?: string
          period?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          account_id: string
          color: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["category_type"]
        }
        Insert: {
          account_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["category_type"]
        }
        Update: {
          account_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["category_type"]
        }
        Relationships: [
          {
            foreignKeyName: "categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          account_id: string
          created_at: string
          current_amount: number
          deadline: string | null
          id: string
          name: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          name: string
          target_amount: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          name?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_assets: {
        Row: {
          account_id: string
          balance: number
          created_at: string
          fees: number
          id: string
          monthly_rate: number
          name: string
          type: Database["public"]["Enums"]["investment_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          balance?: number
          created_at?: string
          fees?: number
          id?: string
          monthly_rate?: number
          name: string
          type: Database["public"]["Enums"]["investment_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          balance?: number
          created_at?: string
          fees?: number
          id?: string
          monthly_rate?: number
          name?: string
          type?: Database["public"]["Enums"]["investment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_assets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_monthly_returns: {
        Row: {
          actual_return: number
          balance_after: number
          contribution: number
          created_at: string
          id: string
          inflation_rate: number
          investment_id: string
          month: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          actual_return?: number
          balance_after?: number
          contribution?: number
          created_at?: string
          id?: string
          inflation_rate?: number
          investment_id: string
          month: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          actual_return?: number
          balance_after?: number
          contribution?: number
          created_at?: string
          id?: string
          inflation_rate?: number
          investment_id?: string
          month?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_monthly_returns_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investment_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          type?: Database["public"]["Enums"]["notification_type"]
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string
          created_at: string
          created_by: string
          date: string
          description: string
          id: string
          is_recurring: boolean
          split_override: Json | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id: string
          created_at?: string
          created_by: string
          date: string
          description: string
          id?: string
          is_recurring?: boolean
          split_override?: Json | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          id?: string
          is_recurring?: boolean
          split_override?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
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
      cleanup_deleted_accounts: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          _message: string
          _metadata?: Json
          _type: Database["public"]["Enums"]["notification_type"]
          _user_id: string
        }
        Returns: undefined
      }
      restore_account: { Args: { account_id: string }; Returns: undefined }
      user_has_account_access: {
        Args: { account_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_has_plan: {
        Args: {
          _required_plan: Database["public"]["Enums"]["subscription_plan"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_member_role: "owner" | "editor" | "viewer"
      account_type: "pessoal" | "casa" | "empresa" | "conjugal" | "outro"
      audit_action: "create" | "update" | "delete"
      billing_cycle: "monthly" | "annual"
      category_type: "despesa" | "receita"
      investment_type: "renda_fixa" | "fundo" | "acao" | "outro"
      member_status: "pending" | "accepted" | "rejected"
      notification_type:
        | "invite"
        | "transaction"
        | "goal"
        | "budget_alert"
        | "system"
      subscription_plan: "free" | "plus" | "pro"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "expired"
        | "incomplete"
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
      account_member_role: ["owner", "editor", "viewer"],
      account_type: ["pessoal", "casa", "empresa", "conjugal", "outro"],
      audit_action: ["create", "update", "delete"],
      billing_cycle: ["monthly", "annual"],
      category_type: ["despesa", "receita"],
      investment_type: ["renda_fixa", "fundo", "acao", "outro"],
      member_status: ["pending", "accepted", "rejected"],
      notification_type: [
        "invite",
        "transaction",
        "goal",
        "budget_alert",
        "system",
      ],
      subscription_plan: ["free", "plus", "pro"],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "expired",
        "incomplete",
      ],
    },
  },
} as const
