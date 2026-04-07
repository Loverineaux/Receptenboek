import { supabaseAdmin } from '@/lib/supabase/admin';
import type { NotificationType } from '@/types';

interface CreateNotificationParams {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  message: string;
  link?: string;
}

/**
 * Create an in-app notification + send push if enabled.
 * Skips self-notifications and respects user preferences.
 */
export async function createNotification({
  recipientId,
  actorId,
  type,
  message,
  link,
}: CreateNotificationParams): Promise<void> {
  // Never notify yourself
  if (recipientId === actorId) return;

  try {
    // Check recipient preferences
    const { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', recipientId)
      .single();

    // If prefs exist and this type is disabled, skip
    if (prefs && prefs[type] === false) return;

    // Insert in-app notification
    await supabaseAdmin.from('notifications').insert({
      recipient_id: recipientId,
      actor_id: actorId,
      type,
      message,
      link: link || null,
    });

    // Send push notification if enabled
    if (!prefs || prefs.push_enabled !== false) {
      sendPushToUser(recipientId, 'Receptenboek', message, link).catch(() => {});
    }
  } catch (err) {
    console.error('[Notification] Error creating notification:', err);
  }
}

/**
 * Send notifications to multiple recipients (e.g., all commenters on a recipe).
 */
export async function createNotificationForMany(
  recipientIds: string[],
  actorId: string,
  type: NotificationType,
  message: string,
  link?: string,
): Promise<void> {
  const unique = Array.from(new Set(recipientIds));
  await Promise.allSettled(
    unique.map((recipientId) =>
      createNotification({ recipientId, actorId, type, message, link })
    )
  );
}

/**
 * Send a push notification to all devices of a user via FCM.
 */
async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  // Get all FCM tokens for this user
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, fcm_token')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return;

  try {
    const { messaging } = await import('@/lib/firebase/admin');

    const tokens = subs.map((s) => s.fcm_token);

    const response = await messaging.sendEachForMulticast({
      tokens,
      data: {
        title,
        body,
        link: link || '/meldingen',
      },
    });

    // Clean up invalid tokens
    const tokensToRemove: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(subs[idx].id);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', tokensToRemove);
    }
  } catch (err) {
    console.error('[Push] Error sending push:', err);
  }
}
