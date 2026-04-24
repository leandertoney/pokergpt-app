// Supabase Edge Function: Send Push Notifications via Expo Push API
// Deploy with: supabase functions deploy send-push

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
  badge?: number;
}

interface PushTicket {
  id?: string;
  status: "ok" | "error";
  message?: string;
  details?: Record<string, unknown>;
}

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase credentials not configured");
  return createClient(url, key);
}

// Send push notifications to Expo Push API (batches of 100)
async function sendToExpo(messages: PushMessage[]): Promise<PushTicket[]> {
  const tickets: PushTicket[] = [];

  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Expo Push API error: ${error}`);
    }

    const result = await response.json();
    tickets.push(...(result.data || []));
  }

  return tickets;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, title, body, data, userIds, broadcast } = await req.json();

    if (action !== "send") {
      return new Response(JSON.stringify({ error: "Unknown action. Use action: 'send'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();

    // Build query to get push tokens
    let query = supabase
      .from("users")
      .select("id, expo_push_token")
      .not("expo_push_token", "is", null);

    // If specific userIds provided, filter to those users
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      query = query.in("id", userIds);
    }

    const { data: users, error: dbError } = await query;

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No users with push tokens found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build push messages
    const messages: PushMessage[] = users
      .filter((u) => u.expo_push_token?.startsWith("ExponentPushToken["))
      .map((u) => ({
        to: u.expo_push_token!,
        title,
        body,
        sound: "default",
        data: data || {},
      }));

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No valid Expo push tokens found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Expo Push API
    const tickets = await sendToExpo(messages);

    // Count successes and failures
    const succeeded = tickets.filter((t) => t.status === "ok").length;
    const failed = tickets.filter((t) => t.status === "error").length;

    return new Response(
      JSON.stringify({
        sent: succeeded,
        failed,
        total: messages.length,
        tickets,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
