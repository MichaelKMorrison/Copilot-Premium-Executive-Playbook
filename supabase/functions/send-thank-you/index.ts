import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("THANK_YOU_FROM_EMAIL") || "onboarding@resend.dev";
const TOTAL_MODULES = 11;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const user = userData.user;

    const { data: row } = await supabase
      .from("progress")
      .select("thanked_at, completed_modules")
      .eq("user_id", user.id)
      .single();

    if (row?.thanked_at) {
      return new Response(JSON.stringify({ status: "already_thanked" }), { status: 200 });
    }

    const completed = row?.completed_modules || [];
    if (completed.length < TOTAL_MODULES) {
      return new Response(JSON.stringify({ status: "not_complete" }), { status: 200 });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: user.email,
        subject: "You finished the Copilot Briefing",
        html: `<p>Nice work — you completed all eleven briefings in <strong>The Copilot Briefing</strong> course. Thanks for going through it.</p><p>Fifteen minutes a day turns this into a habit. Good luck putting it to work.</p>`,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      return new Response(JSON.stringify({ status: "email_failed", detail }), { status: 502 });
    }

    await supabase
      .from("progress")
      .update({ thanked_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ status: "sent" }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
