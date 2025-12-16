import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert ArrayBuffer to base64url string
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate a new ECDSA P-256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true, // extractable
      ["sign", "verify"]
    );

    // Export public key in raw format (65 bytes: 0x04 + 32 bytes X + 32 bytes Y)
    const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBase64Url = arrayBufferToBase64Url(publicKeyRaw);

    // Export private key in PKCS8 format, then extract the raw 32-byte scalar
    const privateKeyPkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBytes = new Uint8Array(privateKeyPkcs8);
    
    // PKCS8 for P-256 has the raw private key at the end (last 32 bytes before optional public key)
    // The structure is: SEQUENCE { version, algorithm, OCTET STRING { ECPrivateKey } }
    // ECPrivateKey contains the 32-byte private scalar
    // For P-256 PKCS8, the private key scalar is typically at offset 36 for 32 bytes
    const privateKeyRaw = privateKeyBytes.slice(-32);
    const privateKeyBase64Url = arrayBufferToBase64Url(privateKeyRaw.buffer);

    // Also export in JWK format for verification
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    console.log("Generated new VAPID key pair successfully");
    console.log("Public key length:", publicKeyBase64Url.length, "chars");
    console.log("Private key length:", privateKeyBase64Url.length, "chars");

    return new Response(
      JSON.stringify({
        success: true,
        publicKey: publicKeyBase64Url,
        privateKey: privateKeyBase64Url,
        // Also provide JWK 'd' parameter as alternative private key format
        privateKeyFromJwk: privateKeyJwk.d,
        instructions: [
          "1. Copy the publicKey and update VAPID_PUBLIC_KEY secret in Supabase",
          "2. Copy the privateKey (or privateKeyFromJwk) and update VAPID_PRIVATE_KEY secret in Supabase",
          "3. Also update the publicKey in src/hooks/usePushNotifications.ts getVapidPublicKey function fallback",
          "4. Delete all existing subscriptions from push_subscriptions table",
          "5. Have all users disable and re-enable notifications"
        ]
      }, null, 2),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating VAPID keys:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
