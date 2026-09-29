
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "event_legal_holds": {
                  Row: {
                    "event_id": string,"reason": string,"set_at": string,"set_by": string | null
                  }
                  Insert: {
                    "event_id": string,"reason": string,"set_at"?: string,"set_by"?: string | null
                  }
                  Update: {
                    "event_id"?: string,"reason"?: string,"set_at"?: string,"set_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_legal_holds_event_id_fkey"
      columns: ["event_id"]
isOneToOne: true
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_legal_holds_set_by_fkey"
      columns: ["set_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "cancelled_at": string | null,"capacity": number,"console_count": number,"created_at": string,"description": string,"ends_at": string,"hidden_at": string | null,"hidden_reason": string | null,"id": string,"min_age": number,"organizer_id": string,"platforms": (Database["public"]['Enums']["platform"])[],"published_at": string | null,"rsvp_count": number,"starts_at": string,"status": Database["public"]['Enums']["event_status"],"title": string,"updated_at": string,"venue_id": string
                  }
                  Insert: {
                    "cancelled_at"?: string | null,"capacity": number,"console_count": number,"created_at"?: string,"description"?: string,"ends_at": string,"hidden_at"?: string | null,"hidden_reason"?: string | null,"id"?: string,"min_age": number,"organizer_id": string,"platforms": (Database["public"]['Enums']["platform"])[],"published_at"?: string | null,"rsvp_count"?: number,"starts_at": string,"status"?: Database["public"]['Enums']["event_status"],"title": string,"updated_at"?: string,"venue_id": string
                  }
                  Update: {
                    "cancelled_at"?: string | null,"capacity"?: number,"console_count"?: number,"created_at"?: string,"description"?: string,"ends_at"?: string,"hidden_at"?: string | null,"hidden_reason"?: string | null,"id"?: string,"min_age"?: number,"organizer_id"?: string,"platforms"?: (Database["public"]['Enums']["platform"])[],"published_at"?: string | null,"rsvp_count"?: number,"starts_at"?: string,"status"?: Database["public"]['Enums']["event_status"],"title"?: string,"updated_at"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "organizers"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "events_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"group_posts": {
                  Row: {
                    "created_at": string,"discord_handle": string | null,"display_name": string,"event_id": string,"hidden_at": string | null,"hidden_reason": string | null,"id": string,"note": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"discord_handle"?: string | null,"display_name"?: string,"event_id": string,"hidden_at"?: string | null,"hidden_reason"?: string | null,"id"?: string,"note": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"discord_handle"?: string | null,"display_name"?: string,"event_id"?: string,"hidden_at"?: string | null,"hidden_reason"?: string | null,"id"?: string,"note"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_posts_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_posts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_actions": {
                  Row: {
                    "action": Database["public"]['Enums']["moderation_action_type"],"admin_id": string | null,"created_at": string,"id": string,"reason": string,"target_id": string,"target_type": string,"target_user_id": string | null
                  }
                  Insert: {
                    "action": Database["public"]['Enums']["moderation_action_type"],"admin_id"?: string | null,"created_at"?: string,"id"?: string,"reason": string,"target_id": string,"target_type": string,"target_user_id"?: string | null
                  }
                  Update: {
                    "action"?: Database["public"]['Enums']["moderation_action_type"],"admin_id"?: string | null,"created_at"?: string,"id"?: string,"reason"?: string,"target_id"?: string,"target_type"?: string,"target_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_actions_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_actions_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizer_applications": {
                  Row: {
                    "created_at": string,"id": string,"message": string | null,"org_name": string,"review_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"social_url": string,"status": Database["public"]['Enums']["application_status"],"user_id": string,"venue_address": string,"venue_kind": Database["public"]['Enums']["venue_kind"],"venue_name": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"message"?: string | null,"org_name": string,"review_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"social_url": string,"status"?: Database["public"]['Enums']["application_status"],"user_id": string,"venue_address": string,"venue_kind": Database["public"]['Enums']["venue_kind"],"venue_name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"message"?: string | null,"org_name"?: string,"review_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"social_url"?: string,"status"?: Database["public"]['Enums']["application_status"],"user_id"?: string,"venue_address"?: string,"venue_kind"?: Database["public"]['Enums']["venue_kind"],"venue_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organizer_applications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organizer_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizers": {
                  Row: {
                    "approved_at": string,"approved_by": string | null,"org_name": string,"social_url": string | null,"user_id": string
                  }
                  Insert: {
                    "approved_at"?: string,"approved_by"?: string | null,"org_name": string,"social_url"?: string | null,"user_id": string
                  }
                  Update: {
                    "approved_at"?: string,"approved_by"?: string | null,"org_name"?: string,"social_url"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organizers_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organizers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "ban_reason": string | null,"banned_at": string | null,"created_at": string,"date_of_birth": string,"display_name": string,"id": string,"locale": string,"role": Database["public"]['Enums']["user_role"],"rules_accepted_at": string | null,"rules_version": string | null,"social_url": string | null,"updated_at": string
                  }
                  Insert: {
                    "ban_reason"?: string | null,"banned_at"?: string | null,"created_at"?: string,"date_of_birth": string,"display_name": string,"id": string,"locale"?: string,"role"?: Database["public"]['Enums']["user_role"],"rules_accepted_at"?: string | null,"rules_version"?: string | null,"social_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "ban_reason"?: string | null,"banned_at"?: string | null,"created_at"?: string,"date_of_birth"?: string,"display_name"?: string,"id"?: string,"locale"?: string,"role"?: Database["public"]['Enums']["user_role"],"rules_accepted_at"?: string | null,"rules_version"?: string | null,"social_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "bucket": string,"hits": number,"window_start": string
                  }
                  Insert: {
                    "bucket": string,"hits"?: number,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"hits"?: number,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "category": Database["public"]['Enums']["report_category"],"created_at": string,"details": string | null,"event_id": string,"group_post_id": string | null,"id": string,"reporter_id": string | null,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["report_status"],"target_snapshot": Json | null,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  Insert: {
                    "category": Database["public"]['Enums']["report_category"],"created_at"?: string,"details"?: string | null,"event_id": string,"group_post_id"?: string | null,"id"?: string,"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_snapshot"?: Json | null,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["report_category"],"created_at"?: string,"details"?: string | null,"event_id"?: string,"group_post_id"?: string | null,"id"?: string,"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_snapshot"?: Json | null,"target_type"?: Database["public"]['Enums']["report_target"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_group_post_id_fkey"
      columns: ["group_post_id"]
isOneToOne: false
      referencedRelation: "group_posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rsvps": {
                  Row: {
                    "created_at": string,"event_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"event_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rsvps_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rsvps_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"venues": {
                  Row: {
                    "address": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["venue_kind"],"lat": number,"lng": number,"name": string,"organizer_id": string,"updated_at": string,"verified_at": string | null,"verified_by": string | null
                  }
                  Insert: {
                    "address": string,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["venue_kind"],"lat": number,"lng": number,"name": string,"organizer_id": string,"updated_at"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["venue_kind"],"lat"?: number,"lng"?: number,"name"?: string,"organizer_id"?: string,"updated_at"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "venues_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "organizers"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "venues_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_community_rules":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"admin_find_users":
{ Args: { "p_query": string }; Returns: {
              "ban_reason": string,"banned_at": string,"created_at": string,"display_name": string,"email": string,"id": string,"role": Database["public"]['Enums']["user_role"]
            }[]
                           },
"admin_moderate_group_post":
{ Args: { "p_action": string,"p_post_id": string,"p_reason": string }; Returns: string
                           },
"admin_resolve_report":
{ Args: { "p_outcome": string,"p_reason": string,"p_report_id": string }; Returns: Json
                           },
"admin_review_application":
{ Args: { "p_application_id": string,"p_approve": boolean,"p_reason": string }; Returns: string
                           },
"admin_review_event":
{ Args: { "p_action": string,"p_event_id": string,"p_reason": string }; Returns: string
                           },
"admin_set_ban":
{ Args: { "p_banned": boolean,"p_reason": string,"p_user_id": string }; Returns: string
                           },
"admin_set_legal_hold":
{ Args: { "p_event_id": string,"p_hold": boolean,"p_reason": string }; Returns: string
                           },
"admin_set_venue_verified":
{ Args: { "p_reason": string,"p_venue_id": string,"p_verified": boolean }; Returns: string
                           },
"age_on":
{ Args: { "p_date_of_birth": string,"p_on": string }; Returns: number
                           },
"brussels_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"can_post_on_board":
{ Args: { "p_event_id": string }; Returns: boolean
                           },
"cancel_event":
{ Args: { "p_event_id": string }; Returns: string
                           },
"cancel_rsvp":
{ Args: { "p_event_id": string }; Returns: boolean
                           },
"check_rate_limit":
{ Args: { "p_bucket": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"current_rules_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"has_rsvp":
{ Args: { "p_event_id": string }; Returns: boolean
                           },
"hit_rate_limit":
{ Args: { "p_bucket": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"in_antwerp_area":
{ Args: { "p_lat": number,"p_lng": number }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_valid_https_url":
{ Args: { "p_url": string }; Returns: boolean
                           },
"log_moderation_action":
{ Args: { "p_action": Database["public"]['Enums']["moderation_action_type"],"p_reason": string,"p_target_id": string,"p_target_type": string,"p_target_user_id": string }; Returns: string
                           },
"purge_expired_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"require_active_user":
{ Args: Record<PropertyKey, never>; Returns: {
              "ban_reason": string | null,
"banned_at": string | null,
"created_at": string,
"date_of_birth": string,
"display_name": string,
"id": string,
"locale": string,
"role": Database["public"]['Enums']["user_role"],
"rules_accepted_at": string | null,
"rules_version": string | null,
"social_url": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"require_admin":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"require_organizer":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"rsvp_event":
{ Args: { "p_event_id": string }; Returns: string
                           },
"save_event":
{ Args: { "p_capacity": number,"p_console_count": number,"p_description": string,"p_ends_at": string,"p_event_id"?: string,"p_min_age": number,"p_platforms": (Database["public"]['Enums']["platform"])[],"p_starts_at": string,"p_title": string,"p_venue_id": string }; Returns: string
                           },
"save_venue":
{ Args: { "p_address": string,"p_kind": Database["public"]['Enums']["venue_kind"],"p_lat": number,"p_lng": number,"p_name": string,"p_venue_id"?: string }; Returns: string
                           },
"submit_organizer_application":
{ Args: { "p_message": string,"p_org_name": string,"p_social_url": string,"p_user_id": string,"p_venue_address": string,"p_venue_kind": Database["public"]['Enums']["venue_kind"],"p_venue_name": string }; Returns: string
                           },
"submit_report":
{ Args: { "p_category": Database["public"]['Enums']["report_category"],"p_details": string,"p_reporter_id": string,"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: Json
                           }
          }
          Enums: {
            "application_status": "pending"|"approved"|"rejected","event_status": "pending"|"published"|"rejected"|"cancelled"|"removed","moderation_action_type": "application_approved"|"application_rejected"|"event_published"|"event_rejected"|"event_removed"|"event_hidden"|"event_restored"|"group_post_removed"|"group_post_hidden"|"group_post_restored"|"report_dismissed"|"report_actioned"|"user_banned"|"user_unbanned"|"legal_hold_set"|"legal_hold_released"|"venue_verified"|"venue_unverified","platform": "ps5"|"xbox","report_category": "safety"|"spam"|"wrong_info"|"other","report_status": "open"|"actioned"|"dismissed","report_target": "event"|"group_post","user_role": "user"|"organizer"|"admin","venue_kind": "bar"|"gaming_cafe"|"student_association"|"other_public"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "application_status": ["pending", "approved", "rejected"],"event_status": ["pending", "published", "rejected", "cancelled", "removed"],"moderation_action_type": ["application_approved", "application_rejected", "event_published", "event_rejected", "event_removed", "event_hidden", "event_restored", "group_post_removed", "group_post_hidden", "group_post_restored", "report_dismissed", "report_actioned", "user_banned", "user_unbanned", "legal_hold_set", "legal_hold_released", "venue_verified", "venue_unverified"],"platform": ["ps5", "xbox"],"report_category": ["safety", "spam", "wrong_info", "other"],"report_status": ["open", "actioned", "dismissed"],"report_target": ["event", "group_post"],"user_role": ["user", "organizer", "admin"],"venue_kind": ["bar", "gaming_cafe", "student_association", "other_public"]
          }
        }
} as const

