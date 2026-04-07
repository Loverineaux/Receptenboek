export type NotificationType =
  | 'comment'
  | 'reply'
  | 'favorite'
  | 'rating'
  | 'comment_like'
  | 'collection_follow'
  | 'collection_invite';

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  // Joined from profiles
  actor?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  // Admin log: joined recipient
  recipient?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface NotificationPreferences {
  user_id: string;
  comment: boolean;
  reply: boolean;
  favorite: boolean;
  rating: boolean;
  comment_like: boolean;
  collection_follow: boolean;
  collection_invite: boolean;
  push_enabled: boolean;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  fcm_token: string;
  device_name: string | null;
  created_at: string;
}
