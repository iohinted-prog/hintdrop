import { createClient } from "@supabase/supabase-js";

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

async function sendEmail({ to, subject, html }) {
  if (!to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: "HintDrop <hello@hintdrop.app>", to, subject, html }),
  });
}

export async function POST(req) {
  const supabase = getSupabase();
  const { type, boardId, requesterId } = await req.json();

  if (type === "request") {
    const { data: board } = await supabase
      .from("hint_boards")
      .select("id, title, user_id")
      .eq("id", boardId)
      .maybeSingle();
    if (!board) return Response.json({ error: "Not found" }, { status: 404 });

    const { data: requesterProfile } = await supabase.from("profiles").select("full_name").eq("id", requesterId).maybeSingle();
    const requesterName = requesterProfile?.full_name || "Someone";

    const { data: ownerAuth } = await supabase.auth.admin.getUserById(board.user_id);
    const ownerEmail = ownerAuth?.user?.email;

    if (ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        subject: `${requesterName} wants to collaborate on "${board.title}"`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="text-align:center;margin-bottom:20px"><img src="https://hintdrop.app/illustrations/logo-coral-full.png" alt="HintDrop" height="36" style="display:inline-block;height:36px;width:auto" /></div>
          <h2 style="color:#df7b59">👥 New collaboration request</h2>
          <p><strong>${requesterName}</strong> would like to collaborate on your list <strong>"${board.title}"</strong>.</p>
          <a href="https://hintdrop.app/hints/${board.id}" style="display:inline-block;margin-top:20px;background:linear-gradient(to bottom,#ff966f,#ff7e54);color:white;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:bold">Review request</a>
        </div>`,
      });
    }

    // In-app bell notification. Deliberately a direct insert here
    // rather than going through the separate /api/notifications/create
    // path - that route consistently 500'd for this specific call
    // despite the exact same insert succeeding when run directly
    // against the database (confirmed both with matching and with the
    // real production ids), suggesting the failure is something in
    // that shared route's own execution (its push-notification side
    // effect is the most likely culprit) rather than the insert
    // itself. This route already reliably sends the email above using
    // the identical service-role pattern, so reusing it for the bell
    // row too avoids depending on a route that's demonstrably not
    // working for this case.
    const { data: requesterProfileFull } = await supabase.from("profiles").select("avatar_url, avatar_color").eq("id", requesterId).maybeSingle();
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: board.user_id,
      actor_user_id: requesterId,
      type: "collab_request",
      entity_id: boardId,
      title: `${requesterName} wants to collaborate`,
      body: `On "${board.title}"`,
      data: { actor_name: requesterName, actor_avatar_url: requesterProfileFull?.avatar_url || null, actor_avatar_color: requesterProfileFull?.avatar_color || null, board_id: boardId, url: `/hints/${boardId}` },
    });
    if (notifError) {
      console.error("collab_request notification insert failed:", notifError);
    }

    return Response.json({ ok: true, notifError: notifError?.message || null });
  }

  if (type === "accepted") {
    const { data: board } = await supabase
      .from("hint_boards")
      .select("id, title, user_id")
      .eq("id", boardId)
      .maybeSingle();
    if (!board) return Response.json({ error: "Not found" }, { status: 404 });

    const { data: ownerProfile } = await supabase.from("profiles").select("full_name, avatar_url, avatar_color").eq("id", board.user_id).maybeSingle();
    const ownerName = ownerProfile?.full_name || "Someone";

    const { data: requesterAuth } = await supabase.auth.admin.getUserById(requesterId);
    const requesterEmail = requesterAuth?.user?.email;

    if (requesterEmail) {
      await sendEmail({
        to: requesterEmail,
        subject: `${ownerName} accepted your collaboration request`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="text-align:center;margin-bottom:20px"><img src="https://hintdrop.app/illustrations/logo-coral-full.png" alt="HintDrop" height="36" style="display:inline-block;height:36px;width:auto" /></div>
          <h2 style="color:#2f8a5f">🎉 You're in!</h2>
          <p><strong>${ownerName}</strong> accepted your request to collaborate on <strong>"${board.title}"</strong>.</p>
          <a href="https://hintdrop.app/hints/${board.id}" style="display:inline-block;margin-top:20px;background:linear-gradient(to bottom,#ff966f,#ff7e54);color:white;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:bold">Start adding hints</a>
        </div>`,
      });
    }

    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: requesterId,
      actor_user_id: board.user_id,
      type: "collab_accepted",
      entity_id: boardId,
      title: `${ownerName} accepted your request`,
      body: `You can now collaborate on "${board.title}"`,
      data: { actor_name: ownerName, actor_avatar_url: ownerProfile?.avatar_url || null, actor_avatar_color: ownerProfile?.avatar_color || null, board_id: boardId, url: `/hints/${boardId}` },
    });
    if (notifError) {
      console.error("collab_accepted notification insert failed:", notifError);
    }

    return Response.json({ ok: true, notifError: notifError?.message || null });
  }

  return Response.json({ error: "Unknown type" }, { status: 400 });
}
