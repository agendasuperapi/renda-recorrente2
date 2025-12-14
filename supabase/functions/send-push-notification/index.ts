import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
}

// Send push notification to a single subscription
async function sendPushToSubscription(
  subscription: {
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
  },
  payload: { title: string; body: string; icon?: string; action_url?: string; type?: string },
  vapidPublicKey: string,
  vapidSubject: string
): Promise<{ success: boolean; error?: string }> {
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
    
    // Simple VAPID authorization header
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9, k=${vapidPublicKey}`,
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: notificationPayload,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed for endpoint ${subscription.endpoint}: ${response.status} - ${errorText}`);
      return { success: false, error: `${response.status}: ${errorText}` };
    }
    
    return { success: true };
  } catch (err) {
    const error = err as Error;
    console.error('Error sending push:', error);
    return { success: false, error: error.message };
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
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;
    
    if (!vapidPublicKey || !vapidSubject) {
      throw new Error('VAPID keys not configured');
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
      skip_preference_check 
    } = payload;
    
    if (!title || !body || !type) {
      throw new Error('Missing required fields: title, body, type');
    }
    
    // Determine target users
    let targetUserIds: string[] = [];
    if (user_ids && user_ids.length > 0) {
      targetUserIds = user_ids;
    } else if (user_id) {
      targetUserIds = [user_id];
    } else {
      throw new Error('Either user_id or user_ids must be provided');
    }
    
    console.log(`Sending notification to ${targetUserIds.length} users: ${title}`);
    
    const results: { user_id: string; sent: number; failed: number; skipped: boolean }[] = [];
    
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
            results.push({ user_id: uid, sent: 0, failed: 0, skipped: true });
            continue;
          }
        }
      }
      
      // Save notification to inbox
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
      
      if (insertError) {
        console.error(`Error saving notification for user ${uid}:`, insertError);
      }
      
      // Get user's push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_key')
        .eq('user_id', uid);
      
      if (subError) {
        console.error(`Error fetching subscriptions for user ${uid}:`, subError);
        results.push({ user_id: uid, sent: 0, failed: 0, skipped: false });
        continue;
      }
      
      if (!subscriptions || subscriptions.length === 0) {
        console.log(`No push subscriptions for user ${uid}`);
        results.push({ user_id: uid, sent: 0, failed: 0, skipped: false });
        continue;
      }
      
      let sent = 0;
      let failed = 0;
      
      // Send to all user's devices
      for (const sub of subscriptions) {
        const result = await sendPushToSubscription(
          sub,
          { title, body, icon, action_url, type },
          vapidPublicKey,
          vapidSubject
        );
        
        if (result.success) {
          sent++;
        } else {
          failed++;
          // If subscription is invalid (410 Gone), remove it
          if (result.error?.startsWith('410')) {
            console.log(`Removing expired subscription: ${sub.endpoint}`);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
        }
      }
      
      results.push({ user_id: uid, sent, failed, skipped: false });
      console.log(`User ${uid}: sent ${sent}, failed ${failed}`);
    }
    
    const totalSent = results.reduce((acc, r) => acc + r.sent, 0);
    const totalFailed = results.reduce((acc, r) => acc + r.failed, 0);
    const totalSkipped = results.filter(r => r.skipped).length;
    
    console.log(`Total: sent ${totalSent}, failed ${totalFailed}, skipped ${totalSkipped}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total_users: targetUserIds.length,
          total_sent: totalSent,
          total_failed: totalFailed,
          total_skipped: totalSkipped,
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
