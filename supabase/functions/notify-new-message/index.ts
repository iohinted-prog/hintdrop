import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const record = payload.record;
    if (!record || record.type === "system") return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    const ACTIVE_THRESHOLD_MS = 30 * 60 * 1000;

    const { data: sender } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", record.sender_id).maybeSingle();
    const senderName = sender?.full_name || "Someone";

    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id, last_read_at")
      .eq("conversation_id", record.conversation_id)
      .neq("user_id", record.sender_id);

    if (!members?.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders });

    let sent = 0;
    for (const member of members) {
      await supabase.from("notifications").insert({
        user_id: member.user_id,
        actor_user_id: record.sender_id,
        type: "new_message",
        title: `${senderName} sent you a message`,
        body: record.body.slice(0, 100),
        data: { actor_name: senderName, actor_avatar_url: sender?.avatar_url || null, conversation_id: record.conversation_id },
        created_at: new Date().toISOString(),
      });

      const lastRead = member.last_read_at ? new Date(member.last_read_at).getTime() : 0;
      const isActive = Date.now() - lastRead < ACTIVE_THRESHOLD_MS;
      if (isActive) continue;

      const { data: userAuth } = await supabase.auth.admin.getUserById(member.user_id);
      const email = userAuth?.user?.email;
      if (!email) continue;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: "HintDrop <hello@hintdrop.app>",
          to: email,
          subject: `${senderName} sent you a message`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px"><div style="text-align:center;margin-bottom:20px"><img src="https://hintdrop.app/illustrations/logo-coral-full.png" alt="HintDrop" height="64" style="display:inline-block;height:64px;width:auto" /></div><h2 style="color:#df7b59">New message</h2><p><strong>${senderName}</strong> sent you a message on HintDrop:</p><p style="background:#f5f0ee;border-radius:12px;padding:16px;font-size:15px">${record.body}</p><a href="https://hintdrop.app/feed" style="display:inline-block;margin-top:20px;background:linear-gradient(to bottom,#ff966f,#ff7e54);color:white;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:bold">Open HintDrop</a></div>`,
        }),
      });
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
