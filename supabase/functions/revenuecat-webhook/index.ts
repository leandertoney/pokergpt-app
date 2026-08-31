// Supabase Edge Function: RevenueCat webhook receiver.
//
// Deploy with:
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// --no-verify-jwt is required. RevenueCat sends whatever Authorization value
// you configure in its dashboard, not a Supabase JWT, so leaving JWT
// verification on makes the gateway reject every delivery before this code
// runs. Authentication is the shared secret checked below instead.
//
// Why this exists: subscriptions live in RevenueCat and users.tier was written
// only by the device. A trial that converts while the app is closed -- which is
// every trial conversion -- never reached Postgres. The first paying customer
// converted on 2026-08-31 and the database still read "free" for everyone.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Entitlement-granting events.
 *
 * CANCELLATION is deliberately absent: it means auto-renew was switched off,
 * not that access ended. The subscriber keeps the entitlement until EXPIRATION,
 * and downgrading them on cancel would lock a paying customer out of what they
 * already bought.
 */
const GRANTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
]);

/** Events that end access. */
const REVOKES = new Set(["EXPIRATION"]);

function getClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase credentials not configured");
  return createClient(url, key);
}

/**
 * Resolve the RevenueCat customer to a row in public.users.
 *
 * Three strategies, widest first:
 *  1. app_user_id (or an alias) is the user id -- true for anyone whose session
 *     ran identifyUser, which the app only began doing on 2026-08-31.
 *  2. the device_id subscriber attribute, joined through onboarding_events.
 *  3. give up. Every customer who purchased before the identify fix is a
 *     permanent anonymous id; the event is still worth storing.
 */
async function resolveUserId(
  supabase: ReturnType<typeof createClient>,
  event: Record<string, any>
): Promise<string | null> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const candidates: string[] = [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
  ].filter((v): v is string => typeof v === "string" && uuid.test(v));

  for (const id of candidates) {
    const { data } = await supabase.from("users").select("id").eq("id", id).maybeSingle();
    if (data?.id) return data.id;
  }

  const deviceId = event.subscriber_attributes?.device_id?.value;
  if (typeof deviceId === "string" && deviceId) {
    const { data } = await supabase
      .from("onboarding_events")
      .select("user_id")
      .eq("device_id", deviceId)
      .not("user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Shared-secret auth. Set with:
  //   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<value>
  // and paste the same value into RevenueCat's Authorization header field.
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!expected) {
    console.error("[rc-webhook] REVENUECAT_WEBHOOK_SECRET is not set");
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.headers.get("Authorization") !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = body?.event ?? {};
  const type: string = event.type ?? "UNKNOWN";

  try {
    const supabase = getClient();
    const userId = await resolveUserId(supabase, event);

    // Store first, map second. The raw payload is the record of what actually
    // arrived, so a mapping bug can be re-derived rather than lost.
    //
    // ignoreDuplicates: RevenueCat retries on any non-2xx, and a retry of an
    // event we already handled must not be processed twice.
    const { error: insertError } = await supabase
      .from("revenuecat_events")
      .upsert(
        {
          event_id: String(event.id ?? `${type}-${event.event_timestamp_ms ?? Date.now()}`),
          event_type: type,
          app_user_id: event.app_user_id ?? null,
          user_id: userId,
          environment: event.environment ?? null,
          event_at: event.event_timestamp_ms
            ? new Date(event.event_timestamp_ms).toISOString()
            : null,
          payload: body,
        },
        { onConflict: "event_id", ignoreDuplicates: true }
      );

    if (insertError) {
      // Fail loudly: a non-2xx makes RevenueCat retry, which is what we want
      // when the write itself failed.
      console.error("[rc-webhook] insert failed:", insertError.message);
      return new Response(JSON.stringify({ error: "insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sandbox purchases are real events but not real customers. Record them,
    // never let a TestFlight run mark a row paid.
    const isSandbox = event.environment === "SANDBOX";

    let tierWritten: string | null = null;
    if (userId && !isSandbox) {
      if (GRANTS.has(type)) tierWritten = "paid";
      else if (REVOKES.has(type)) tierWritten = "free";

      if (tierWritten) {
        const { error } = await supabase
          .from("users")
          .update({ tier: tierWritten })
          .eq("id", userId);
        if (error) console.error("[rc-webhook] tier update failed:", error.message);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, type, user_id: userId, tier: tierWritten, sandbox: isSandbox }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[rc-webhook] failed:", e?.message);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
