import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - web-push types
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  type: string;
  reference_id?: string;
  reference_type?: string;
  action_url?: string;
  icon?: string;
  skip_preference_check?: boolean;
  admin_only?: boolean;
}

// Send push notification using web-push library
async function sendWebPush(
  subscription: {
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
  },
  payload: { title: string; body: string; icon?: string; action_url?: string; type?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/app-icon.png',
      badge: '/app-icon.png',
      data: {
        url: payload.action_url || '/',
        type: payload.type,
      },
    });

    console.log(`Sending push to: ${subscription.endpoint}`);

    // Configure VAPID details
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Create subscription object in web-push format
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    };

    // Send notification
    const result = await webpush.sendNotification(pushSubscription, notificationPayload);
    
    console.log(`Push sent successfully with status ${result.statusCode}`);
    return { success: true, statusCode: result.statusCode };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    console.error('Error sending push:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error', 
      statusCode: error.statusCode 
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error('VAPID keys not configured. Required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const {
      user_id,
      user_ids,
      title,
      body,
      type,
      reference_id,
      reference_type,
      action_url,
      icon,
      skip_preference_check,
      admin_only,
    } = payload;

    if (!title || !body || !type) {
      throw new Error('Missing required fields: title, body, type');
    }

    // Determine target users
    let targetUserIds: string[] = [];

    if (admin_only) {
      // Get all admin users from user_roles table
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['super_admin', 'admin']);

      if (rolesError) {
        console.error('Error fetching admin roles:', rolesError);
        throw new Error('Failed to fetch admin users');
      }

      targetUserIds = (adminRoles || []).map(r => r.user_id);
      console.log(`Found ${targetUserIds.length} admin users for notification`);
    } else if (user_ids && user_ids.length > 0) {
      targetUserIds = user_ids;
    } else if (user_id) {
      targetUserIds = [user_id];
    } else {
      throw new Error('Either user_id, user_ids, or admin_only must be provided');
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No target users found',
          results: [],
          summary: { total_users: 0, total_sent: 0, total_failed: 0, total_skipped: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending notification to ${targetUserIds.length} users: ${title}`);

    const results: { user_id: string; sent: number; failed: number; skipped: boolean; inbox_saved: boolean }[] = [];

    for (const uid of targetUserIds) {
      // Check user preferences if not skipping
      if (!skip_preference_check) {
        const preferenceField = type.replace(/-/g, '_');
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', uid)
          .single();

        if (prefs) {
          const prefValue = (prefs as Record<string, unknown>)[preferenceField];
          if (prefValue === false) {
            console.log(`User ${uid} has disabled ${type} notifications`);
            results.push({ user_id: uid, sent: 0, failed: 0, skipped: true, inbox_saved: false });
            continue;
          }
        }
      }

      // Save notification to inbox (this always works, independent of push)
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: uid,
          title,
          body,
          type,
          reference_id,
          reference_type,
          action_url,
          icon,
        });

      const inboxSaved = !insertError;
      if (insertError) {
        console.error(`Error saving notification for user ${uid}:`, insertError);
      } else {
        console.log(`Notification saved to inbox for user ${uid}`);
      }

      // Get user's push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_key')
        .eq('user_id', uid);

      if (subError) {
        console.error(`Error fetching subscriptions for user ${uid}:`, subError);
        results.push({ user_id: uid, sent: 0, failed: 0, skipped: false, inbox_saved: inboxSaved });
        continue;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`No push subscriptions for user ${uid}, notification saved to inbox only`);
        results.push({ user_id: uid, sent: 0, failed: 0, skipped: false, inbox_saved: inboxSaved });
        continue;
      }

      let sent = 0;
      let failed = 0;

      // Send to all user's devices
      for (const sub of subscriptions) {
        const result = await sendWebPush(
          sub,
          { title, body, icon, action_url, type },
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );

        if (result.success) {
          sent++;
        } else {
          failed++;
          // If subscription is invalid (410 Gone or 404), remove it
          if (result.statusCode === 410 || result.statusCode === 404) {
            console.log(`Removing expired subscription: ${sub.endpoint}`);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
        }
      }

      results.push({ user_id: uid, sent, failed, skipped: false, inbox_saved: inboxSaved });
      console.log(`User ${uid}: sent ${sent} push, failed ${failed}, inbox saved: ${inboxSaved}`);
    }

    const totalSent = results.reduce((acc, r) => acc + r.sent, 0);
    const totalFailed = results.reduce((acc, r) => acc + r.failed, 0);
    const totalSkipped = results.filter(r => r.skipped).length;
    const totalInboxSaved = results.filter(r => r.inbox_saved).length;

    console.log(`Total: sent ${totalSent}, failed ${totalFailed}, skipped ${totalSkipped}, inbox saved ${totalInboxSaved}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total_users: targetUserIds.length,
          total_sent: totalSent,
          total_failed: totalFailed,
          total_skipped: totalSkipped,
          total_inbox_saved: totalInboxSaved,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
