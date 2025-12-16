import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 5_000_000; // 5MB safety limit

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic SSRF protection: allow only known avatar sources
    const isRandomUser = parsed.hostname === "randomuser.me";
    const isPravatar = parsed.hostname === "i.pravatar.cc";

    if (parsed.protocol !== "https:" || (!isRandomUser && !isPravatar)) {
      return new Response(JSON.stringify({ error: "URL not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isRandomUser && !parsed.pathname.startsWith("/api/portraits/")) {
      return new Response(JSON.stringify({ error: "Path not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const commonHeaders: HeadersInit = {
      // Some CDNs block "bot" user agents from server-side environments.
      // Pretend to be a regular browser.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    };

    const fetchImage = (url: string, referer: string) =>
      fetch(url, {
        headers: {
          ...commonHeaders,
          Referer: referer,
        },
      });

    let upstream = await fetchImage(
      parsed.toString(),
      isRandomUser ? "https://randomuser.me/" : "https://i.pravatar.cc/"
    );

    // randomuser.me is frequently blocked from server-side environments (403).
    // If that happens, fall back to another real-photo provider.
    if (!upstream.ok && isRandomUser) {
      const parts = parsed.pathname.split("/");
      const last = parts[parts.length - 1] ?? "";
      const n = Number.parseInt(last.replace(/\D/g, ""), 10);
      const img = Number.isFinite(n) ? ((n - 1) % 70) + 1 : Math.floor(Math.random() * 70) + 1;
      const fallbackUrl = `https://i.pravatar.cc/512?img=${img}`;

      console.warn(
        "[image-proxy] randomuser upstream blocked:",
        upstream.status,
        "fallback =>",
        fallbackUrl
      );

      upstream = await fetchImage(fallbackUrl, "https://i.pravatar.cc/");
    }

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await upstream.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Image too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error in image-proxy:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
