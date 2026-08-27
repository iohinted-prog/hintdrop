import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function buildDigestEmail({ recipientName, notifCount, notifItems, messageCount, messageItems }) {
  const notifHtml = notifItems.length
    ? `<div style="margin-bottom:24px;">
        <p style="font-size:13px;font-weight:700;color:#8a7568;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">Notifications</p>
        ${notifItems.map((n) => `
          <div style="background:#f7f2ee;border-radius:14px;border:1px solid #efe0d7;padding:12px 14px;margin-bottom:8px;">
            <p style="font-size:14px;font-weight:600;color:#2d2d2d;margin:0;">${n.title}</p>
          </div>`).join("")}
      </div>`
    : "";

  const messagesHtml = messageItems.length
    ? `<div>
        <p style="font-size:13px;font-weight:700;color:#8a7568;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">Unread messages</p>
        ${messageItems.map((m) => `
          <div style="background:#f7f2ee;border-radius:14px;border:1px solid #efe0d7;padding:12px 14px;margin-bottom:8px;">
            <p style="font-size:14px;font-weight:600;color:#2d2d2d;margin:0;">${m.count} unread ${m.count === 1 ? "message" : "messages"}</p>
          </div>`).join("")}
      </div>`
    : "";

  const summaryParts = [];
  if (notifCount) summaryParts.push(`${notifCount} unseen ${notifCount === 1 ? "notification" : "notifications"}`);
  if (messageCount) summaryParts.push(`${messageCount} unread ${messageCount === 1 ? "message" : "messages"}`);
  const summary = summaryParts.join(" and ");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:#f5ede8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <table cellpadding="0" cellspacing="0" style="display:inline-table;"><tr><td style="width:44px;height:44px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:14px;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">🎁</td></tr></table>
        <span style="font-size:22px;font-weight:800;color:#2d2d2d;letter-spacing:-0.5px;">Hint<span style="color:#ff8060;">Drop</span></span>
      </div>
    </div>
    <div style="background:#fffaf7;border-radius:28px;border:1px solid #efdcd2;box-shadow:0 20px 60px rgba(88,46,31,0.12);overflow:hidden;">
      <div style="padding:36px 40px;">
        <p style="font-size:18px;font-weight:700;color:#2d2d2d;line-height:1.4;margin:0 0 24px;">Hi ${recipientName || "there"}, you have ${summary} waiting on HintDrop.</p>
        ${notifHtml}
        ${messagesHtml}
        <div style="text-align:center;margin-top:8px;">
          <a href="https://hintdrop.app/feed" style="display:inline-block;background-color:#ff7e54;background-image:linear-gradient(160deg,#ff966f,#ff7e54);color:#ffffff;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">Open HintDrop</a>
        </div>
      </div>
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">
          <a href="https://hintdrop.app/settings" style="color:#b09080;">Manage email preferences</a>
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
  </div>
</div>
</body>
</html>`;
}

// Runs once daily (see vercel.json). Replaces the instant per-notification
// email that used to fire from app/api/notifications/create — that would
// have doubled up with this if both stayed active. One email per user per
// day, only if they actually have something unseen right now: unread bell
// notifications (notifications.read_at IS NULL) or unread messages in any
// conversation they're a member of (latest message newer than their
// conversation_members.last_read_at, and not sent by them). Reuses the
// existing email_reminders preference as the opt-out — it already gated
// the old instant emails, so this preserves what anyone who'd already
// turned it off was expecting, without adding yet another Settings toggle.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const sent = [];
  const errors = [];

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name")
    // .neq("email_reminders", false) would silently exclude anyone with
    // a NULL value here — SQL's three-valued logic means NULL != false
    // evaluates to NULL, not true, so it doesn't match the way JS's
    // `!== false` does. The rest of the app treats a NULL/unset value
    // as "still opted in" (SettingsClient.jsx: `?? true`), so this
    // needs to explicitly include both true and null to match that.
    .or("email_reminders.is.null,email_reminders.eq.true");

  for (const user of users || []) {
    try {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id, title")
        .eq("user_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      const convIds = (memberships || []).map((m) => m.conversation_id);
      let unreadConvCount = 0;

      if (convIds.length) {
        const { data: recentMessages } = await supabase
          .from("messages")
          .select("conversation_id, sender_id, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });

        const lastReadMap = {};
        (memberships || []).forEach((m) => { lastReadMap[m.conversation_id] = m.last_read_at; });

        const seenConvs = new Set();
        (recentMessages || []).forEach((m) => {
          if (m.sender_id === user.id || seenConvs.has(m.conversation_id)) return;
          seenConvs.add(m.conversation_id);
          const lastRead = lastReadMap[m.conversation_id];
          const isUnread = !lastRead || new Date(m.created_at) > new Date(lastRead);
          if (isUnread) unreadConvCount += 1;
        });
      }

      const notifCount = notifs?.length || 0;
      if (notifCount === 0 && unreadConvCount === 0) continue;

      const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const html = buildDigestEmail({
        recipientName: user.full_name || "",
        notifCount,
        notifItems: (notifs || []).slice(0, 5),
        messageCount: unreadConvCount,
        messageItems: unreadConvCount ? [{ count: unreadConvCount }] : [],
      });

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HintDrop <hello@hintdrop.app>",
          to: email,
          subject: "You have updates waiting on HintDrop",
          html,
        }),
      });

      if (resendRes.ok) {
        sent.push({ to: email, notifCount, unreadConvCount });
      } else {
        errors.push({ user: email, error: await resendRes.json().catch(() => null) });
      }
    } catch (err) {
      errors.push({ user: user.id, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, sent, errors, total: sent.length });
}
