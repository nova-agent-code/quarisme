export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationSummary = {
  conversation_id: string;
  is_group: boolean;
  other_user_id: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  group_name: string | null;
  group_avatar_url: string | null;
  member_count: number;
  last_message_id: string | null;
  last_message_content: string | null;
  last_message_sender_id: string | null;
  last_message_created_at: string | null;
  unread_count: number;
};

export type GroupMember = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  recipient_id: string | null;
  recipient_name: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  content: string;
  reply_to_message_id: string | null;
  created_at: string;
  updated_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
};

export type UserSearchResult = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export type SessionUser = {
  id: string;
  displayName: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
};
