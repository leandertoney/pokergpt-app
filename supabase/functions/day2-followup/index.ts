// Supabase Edge Function: day-two follow-up, server side.
// Deploy with: supabase functions deploy day2-followup
// Intended to run on a daily schedule (pg_cron or an external scheduler).
//
// This is the FALLBACK. The primary follow-up is scheduled on the device the
// moment a hand is saved (services/handFollowup.ts) — that one is personalised
// from local data and fires without the app being reopened.
//
// This function covers the gap the device cannot: people who granted
// notification permission during onboarding and then never entered a hand at
// all. The device has nothing to schedule for them, so nothing would ever be
// sent. Those are exactly the trials that lapse in silence.
//
// Rules it must not break:
//  - Never double-send with the device notification. Anyone whose hand exists
//    already has a local follow-up pending, so they are excluded here.
//  - One message per user, ever, for this campaign.
//  - Name the spot or the next step, never an outcome or an amount. This app
//    is gambling-adjacent and has been rejected once on paywall grounds.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

function getClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase credentials not configured");
  return createClient(url, key);
}

async function sendToExpo(messages: PushMessage[]) {
  const tickets: { status: string; message?: string }[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Expo Push API error: ${await res.text()}`);
    const json = await res.json();
    tickets.push(...(json.data || []));
  }
  return tickets;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    const supabase = getClient();

    // Candidates: got a token roughly a day ago, still have no hand, and have
    // not already been sent this campaign.
    const { data: candidates, error } = await supabase
      .from("users")
      .select("id, expo_push_token, push_token_updated_at, day2_sent_at")
      .not("expo_push_token", "is", null)
      .is("day2_sent_at", null)
      .lt("push_token_updated_at", new Date(Date.now() - 20 * 3600 * 1000).toISOString())
      .gt("push_token_updated_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());

    if (error) throw new Error(`Database error: ${error.message}`);
    if (!candidates?.length) {
      return json({ sent: 0, reason: "no candidates" });
    }

    // Exclude anyone who has entered a hand: the device already scheduled a
    // better, personalised follow-up for them and this would duplicate it.
    const ids = candidates.map((c) => c.id);
    const { data: withHands } = await supabase
      .from("hands")
      .select("user_id")
      .in("user_id", ids);

    const hasHand = new Set((withHands ?? []).map((h) => h.user_id));

    const targets = candidates.filter(
      (c) =>
        !hasHand.has(c.id) &&
        typeof c.expo_push_token === "string" &&
        c.expo_push_token.startsWith("ExponentPushToken["),
    );

    if (!targets.length) {
      return json({ sent: 0, reason: "all candidates already have hands" });
    }

    const messages: PushMessage[] = targets.map((t) => ({
      to: t.expo_push_token as string,
      title: "One hand is all it takes",
      body: "Bring a spot you are still unsure about and get the read in about a minute.",
      sound: "default",
      data: { type: "day2_fallback", screen: "/voice" },
    }));

    if (dryRun) {
      return json({ wouldSend: messages.length, dryRun: true });
    }

    const tickets = await sendToExpo(messages);

    // Mark them so this campaign never repeats for the same user.
    await supabase
      .from("users")
      .update({ day2_sent_at: new Date().toISOString() })
      .in("id", targets.map((t) => t.id));

    return json({
      sent: tickets.filter((t) => t.status === "ok").length,
      failed: tickets.filter((t) => t.status !== "ok").length,
      total: messages.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
