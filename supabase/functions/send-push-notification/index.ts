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
  admin_only?: boolean;
}

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binaryString = atob(base64 + padding);
  return new Uint8Array([...binaryString].map(char => char.charCodeAt(0)));
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(data: Uint8Array | ArrayBuffer): string {
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Create VAPID JWT token
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  // Apple is strict - use shorter expiration (1 hour)
  const payload = {
    aud: audience,
    exp: now + 60 * 60, // 1 hour
    sub: subject,
  };

  console.log(`Creating JWT for audience: ${audience}, subject: ${subject}`);

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // The private key should be the raw 32-byte 'd' value
  // The public key should be 65 bytes (uncompressed P-256: 0x04 + 32 bytes x + 32 bytes y)
  // Normalize to strict base64url (no padding) to satisfy stricter push services (e.g., Apple)
  const normalizedPrivateKey = uint8ArrayToBase64Url(
    base64UrlToUint8Array(vapidPrivateKey.trim())
  );
  const normalizedPublicKey = uint8ArrayToBase64Url(
    base64UrlToUint8Array(vapidPublicKey.trim())
  );

  const privateKeyBytes = base64UrlToUint8Array(normalizedPrivateKey);
  const publicKeyBytes = base64UrlToUint8Array(normalizedPublicKey);

  console.log(`Private key length: ${privateKeyBytes.length}, Public key length: ${publicKeyBytes.length}`);

  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: ${privateKeyBytes.length}, expected 32`);
  }
  if (publicKeyBytes.length !== 65) {
    throw new Error(`Invalid public key length: ${publicKeyBytes.length}, expected 65`);
  }
  if (publicKeyBytes[0] !== 0x04) {
    throw new Error(`Invalid public key format: first byte is ${publicKeyBytes[0]}, expected 0x04`);
  }

  // Extract x and y from uncompressed public key
  const x = uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33));
  const y = uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65));
  const d = normalizedPrivateKey;

  try {
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: x,
      y: y,
      d: d,
    };

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    // Ensure signature is exactly 64 bytes (R: 32 bytes, S: 32 bytes)
    const signature = new Uint8Array(signatureBuffer);
    console.log(`Signature length: ${signature.length}`);
    
    if (signature.length !== 64) {
      console.error(`Unexpected signature length: ${signature.length}`);
    }

    const signatureB64 = uint8ArrayToBase64Url(signature);
    const jwt = `${unsignedToken}.${signatureB64}`;
    
    console.log(`JWT created successfully, length: ${jwt.length}`);
    return jwt;
  } catch (error) {
    console.error('Error creating VAPID JWT:', error);
    throw error;
  }
}

// Encrypt payload using AES-128-GCM for Web Push (RFC 8291)
async function encryptPayload(
  payloadText: string,
  p256dhKey: string,
  authKey: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  
  // Generate a random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key (65 bytes uncompressed)
  const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyBuffer);

  // Import the subscriber's public key (p256dh)
  const subscriberPublicKeyBytes = base64UrlToUint8Array(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret using ECDH
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBuffer);

  // Import auth key
  const authKeyBytes = base64UrlToUint8Array(authKey);

  // Create info for IKM derivation: "WebPush: info" || 0x00 || client_public || server_public
  const ikmInfo = new Uint8Array([
    ...encoder.encode('WebPush: info'),
    0,
    ...subscriberPublicKeyBytes,
    ...localPublicKey,
  ]);

  // Derive IKM using HKDF with auth as salt
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret.buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const ikmBuffer = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: authKeyBytes.buffer as ArrayBuffer,
      info: ikmInfo.buffer as ArrayBuffer,
      hash: 'SHA-256',
    },
    sharedSecretKey,
    256
  );
  const ikm = new Uint8Array(ikmBuffer);

  // Import IKM for further key derivation
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikm.buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive CEK (Content Encryption Key) - 16 bytes
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\x00');
  const cekBuffer = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: salt.buffer as ArrayBuffer,
      info: cekInfo.buffer as ArrayBuffer,
      hash: 'SHA-256',
    },
    ikmKey,
    128
  );

  // Derive nonce - 12 bytes
  const nonceInfo = encoder.encode('Content-Encoding: nonce\x00');
  const nonceBuffer = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: salt.buffer as ArrayBuffer,
      info: nonceInfo.buffer as ArrayBuffer,
      hash: 'SHA-256',
    },
    ikmKey,
    96
  );

  // Import CEK for AES-GCM
  const cek = await crypto.subtle.importKey(
    'raw',
    cekBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Add padding delimiter (0x02) to payload
  const payloadBytes = encoder.encode(payloadText);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Padding delimiter

  // Encrypt with AES-GCM
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBuffer, tagLength: 128 },
    cek,
    paddedPayload
  );
  const encrypted = new Uint8Array(encryptedBuffer);

  // Build the aes128gcm content-coding structure
  // Header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs, false);
  
  const result = new Uint8Array(16 + 4 + 1 + localPublicKey.length + encrypted.length);
  let offset = 0;
  
  result.set(salt, offset); offset += 16;
  result.set(rsBytes, offset); offset += 4;
  result[offset] = localPublicKey.length; offset += 1;
  result.set(localPublicKey, offset); offset += localPublicKey.length;
  result.set(encrypted, offset);

  return result;
}

// Send push notification using Web Push Protocol
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

    // Get the audience (origin) from the endpoint
    const endpointUrl = new URL(subscription.endpoint);
    const audience = endpointUrl.origin;

    // Normalize the public key for HTTP header usage (strict base64url, no padding)
    const normalizedVapidPublicKey = uint8ArrayToBase64Url(
      base64UrlToUint8Array(vapidPublicKey.trim())
    );

    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, vapidSubject.trim(), vapidPrivateKey, normalizedVapidPublicKey);
    // Space after comma is more interoperable (some services are strict)
    const authHeader = `vapid t=${jwt}, k=${normalizedVapidPublicKey}`;

    // Encrypt the payload
    const encrypted = await encryptPayload(
      notificationPayload,
      subscription.p256dh_key,
      subscription.auth_key
    );

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        // VAPID headers
        'Authorization': authHeader,
        // Apple Web Push is stricter; including p256ecdsa in Crypto-Key improves compatibility.
        'Crypto-Key': `p256ecdsa=${normalizedVapidPublicKey}`,

        // Web Push payload
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body: encrypted.buffer as ArrayBuffer,
    });

    console.log(`Push response status: ${response.status}`);

    if (response.ok || response.status === 201) {
      console.log(`Push sent successfully`);
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text();
    console.error(`Push failed: ${response.status} - ${errorText}`);
    return { 
      success: false, 
      error: errorText, 
      statusCode: response.status 
    };
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
      throw new Error('VAPID keys not configured');
    }

    console.log('VAPID config loaded');

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
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['super_admin', 'admin']);

      if (rolesError) {
        console.error('Error fetching admin roles:', rolesError);
        throw new Error('Failed to fetch admin users');
      }

      targetUserIds = (adminRoles || []).map(r => r.user_id);
      console.log(`Found ${targetUserIds.length} admin users`);
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

    console.log(`Sending to ${targetUserIds.length} users: ${title}`);

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

      const inboxSaved = !insertError;
      if (insertError) {
        console.error(`Error saving notification for ${uid}:`, insertError);
      }

      // Get user's push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_key')
        .eq('user_id', uid);

      if (subError || !subscriptions || subscriptions.length === 0) {
        results.push({ user_id: uid, sent: 0, failed: 0, skipped: false, inbox_saved: inboxSaved });
        continue;
      }

      let sent = 0;
      let failed = 0;

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
          // Remove invalid subscriptions (expired, not found, or bad JWT/keys)
          if (result.statusCode === 410 || result.statusCode === 404 || result.statusCode === 403) {
            console.log(`Removing invalid subscription (${result.statusCode}): ${sub.endpoint.substring(0, 50)}...`);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
        }
      }

      results.push({ user_id: uid, sent, failed, skipped: false, inbox_saved: inboxSaved });
      console.log(`User ${uid}: sent ${sent}, failed ${failed}`);
    }

    const totalSent = results.reduce((acc, r) => acc + r.sent, 0);
    const totalFailed = results.reduce((acc, r) => acc + r.failed, 0);
    const totalSkipped = results.filter(r => r.skipped).length;
    const totalInboxSaved = results.filter(r => r.inbox_saved).length;

    console.log(`Total: sent ${totalSent}, failed ${totalFailed}, skipped ${totalSkipped}, inbox ${totalInboxSaved}`);

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
