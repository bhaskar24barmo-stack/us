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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      approved_users: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      call_participants: {
        Row: {
          call_id: string
          joined_at: string | null
          left_at: string | null
          user_id: string
        }
        Insert: {
          call_id: string
          joined_at?: string | null
          left_at?: string | null
          user_id: string
        }
        Update: {
          call_id?: string
          joined_at?: string | null
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          answered_at: string | null
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          kind: Database["public"]["Enums"]["call_kind"]
          status: Database["public"]["Enums"]["call_status"]
        }
        Insert: {
          answered_at?: string | null
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["call_kind"]
          status?: Database["public"]["Enums"]["call_status"]
        }
        Update: {
          answered_at?: string | null
          callee_id?: string
          caller_id?: string
          conversation_id?: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["call_kind"]
          status?: Database["public"]["Enums"]["call_status"]
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          disappearing_seconds: number | null
          id: string
        }
        Insert: {
          created_at?: string
          disappearing_seconds?: number | null
          id?: string
        }
        Update: {
          created_at?: string
          disappearing_seconds?: number | null
          id?: string
        }
        Relationships: []
      }
      couple_settings: {
        Row: {
          anniversary_date: string | null
          conversation_id: string
          daily_question_enabled: boolean
          streak_count: number
          streak_last_date: string | null
          updated_at: string
          wallpaper_path: string | null
        }
        Insert: {
          anniversary_date?: string | null
          conversation_id: string
          daily_question_enabled?: boolean
          streak_count?: number
          streak_last_date?: string | null
          updated_at?: string
          wallpaper_path?: string | null
        }
        Update: {
          anniversary_date?: string | null
          conversation_id?: string
          daily_question_enabled?: boolean
          streak_count?: number
          streak_last_date?: string | null
          updated_at?: string
          wallpaper_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couple_settings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_answers: {
        Row: {
          answer: string
          conversation_id: string
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer: string
          conversation_id: string
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer?: string
          conversation_id?: string
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_answers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "daily_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_questions: {
        Row: {
          active_date: string
          id: string
          prompt: string
        }
        Insert: {
          active_date?: string
          id?: string
          prompt: string
        }
        Update: {
          active_date?: string
          id?: string
          prompt?: string
        }
        Relationships: []
      }
      important_dates: {
        Row: {
          conversation_id: string
          created_at: string
          event_date: string
          id: string
          kind: string
          remind_days_before: number
          title: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          event_date: string
          id?: string
          kind?: string
          remind_days_before?: number
          title: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          event_date?: string
          id?: string
          kind?: string
          remind_days_before?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "important_dates_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_attachments: {
        Row: {
          bucket: string
          caption: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          expires_at: string | null
          height: number | null
          id: string
          in_gallery: boolean
          message_id: string | null
          mime_type: string
          owner_id: string
          size_bytes: number
          storage_path: string
          thumb_path: string | null
          width: number | null
        }
        Insert: {
          bucket?: string
          caption?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          expires_at?: string | null
          height?: number | null
          id?: string
          in_gallery?: boolean
          message_id?: string | null
          mime_type: string
          owner_id: string
          size_bytes: number
          storage_path: string
          thumb_path?: string | null
          width?: number | null
        }
        Update: {
          bucket?: string
          caption?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          expires_at?: string | null
          height?: number | null
          id?: string
          in_gallery?: boolean
          message_id?: string | null
          mime_type?: string
          owner_id?: string
          size_bytes?: number
          storage_path?: string
          thumb_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_albums: {
        Row: {
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          title: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by: string
          id?: string
          title: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_albums_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_expiration: {
        Row: {
          expires_at: string
          message_id: string
          purged_at: string | null
        }
        Insert: {
          expires_at: string
          message_id: string
          purged_at?: string | null
        }
        Update: {
          expires_at?: string
          message_id?: string
          purged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_expiration_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          client_id: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          edited_at: string | null
          expires_at: string | null
          forwarded_from_id: string | null
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          pinned_at: string | null
          pinned_by: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          client_id: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          expires_at?: string | null
          forwarded_from_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          pinned_at?: string | null
          pinned_by?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          client_id?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          expires_at?: string | null
          forwarded_from_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          pinned_at?: string | null
          pinned_by?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forwarded_from_id_fkey"
            columns: ["forwarded_from_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          calls: boolean
          hide_previews: boolean
          love_notes: boolean
          media: boolean
          messages: boolean
          muted_until: string | null
          quiet_end: string | null
          quiet_start: string | null
          reminders: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calls?: boolean
          hide_previews?: boolean
          love_notes?: boolean
          media?: boolean
          messages?: boolean
          muted_until?: string | null
          quiet_end?: string | null
          quiet_start?: string | null
          reminders?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calls?: boolean
          hide_previews?: boolean
          love_notes?: boolean
          media?: boolean
          messages?: boolean
          muted_until?: string | null
          quiet_end?: string | null
          quiet_start?: string | null
          reminders?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_route: string | null
          body: string
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          action_route?: string | null
          body: string
          created_at?: string
          id?: string
          kind: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          action_route?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string
          avatar_emoji: string | null
          avatar_path: string | null
          bio: string | null
          birthday: string | null
          created_at: string
          display_name: string
          id: string
          nickname: string | null
          status_text: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          avatar_emoji?: string | null
          avatar_path?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          display_name: string
          id: string
          nickname?: string | null
          status_text?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          avatar_emoji?: string | null
          avatar_path?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string
          id?: string
          nickname?: string | null
          status_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_id: string | null
          endpoint: string
          expired_at: string | null
          failed_count: number
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_id?: string | null
          endpoint: string
          expired_at?: string | null
          failed_count?: number
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_id?: string | null
          endpoint?: string
          expired_at?: string | null
          failed_count?: number
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_memories: {
        Row: {
          album_id: string | null
          author_id: string
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          is_favorite: boolean
          kind: string
          location: string | null
          media_id: string | null
          memory_date: string
          tags: string[]
          title: string
        }
        Insert: {
          album_id?: string | null
          author_id: string
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          kind?: string
          location?: string | null
          media_id?: string | null
          memory_date?: string
          tags?: string[]
          title: string
        }
        Update: {
          album_id?: string | null
          author_id?: string
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          kind?: string
          location?: string | null
          media_id?: string | null
          memory_date?: string
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_memories_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "memory_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_memories_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_memories_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_notes: {
        Row: {
          author_id: string
          body: string
          conversation_id: string
          created_at: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string
          id: string
          label: string
          last_seen_at: string
          platform: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          last_seen_at?: string
          platform?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_seen_at?: string
          platform?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          last_active_at: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          last_active_at?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          last_active_at?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_messages: {
        Row: {
          attachment_id: string
          duration_ms: number
          message_id: string
          waveform: number[]
        }
        Insert: {
          attachment_id: string
          duration_ms: number
          message_id: string
          waveform?: number[]
        }
        Update: {
          attachment_id?: string
          duration_ms?: number
          message_id?: string
          waveform?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "voice_messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "media_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_approved: { Args: never; Returns: boolean }
      is_device_active: { Args: { did: string }; Returns: boolean }
      is_member: { Args: { cid: string }; Returns: boolean }
      mark_messages_read: { Args: { cid: string }; Returns: number }
      toggle_message_pin: { Args: { mid: string }; Returns: string }
    }
    Enums: {
      call_kind: "voice" | "video"
      call_status:
        | "ringing"
        | "active"
        | "ended"
        | "missed"
        | "declined"
        | "failed"
      message_kind:
        | "text"
        | "image"
        | "video"
        | "voice"
        | "file"
        | "sticker"
        | "gif"
        | "love_note"
        | "system"
        | "poll"
        | "whisper"
        | "song"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      call_kind: ["voice", "video"],
      call_status: [
        "ringing",
        "active",
        "ended",
        "missed",
        "declined",
        "failed",
      ],
      message_kind: [
        "text",
        "image",
        "video",
        "voice",
        "file",
        "sticker",
        "gif",
        "love_note",
        "system",
        "poll",
        "whisper",
        "song",
      ],
    },
  },
} as const
