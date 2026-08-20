import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Single place to create a notification, so the bell and email always stay
// in sync — previously, notifications were inserted directly from the
// browser (FeedClient's comment/reaction handlers), which is bell-only by
// construction, since the client can't hold a Resend API key to also send
// an email from there. Routing creation through here instead means every
// caller gets both for free, and any future notification type only needs
// wiring up once.
const TYPE_COPY = {
  comment: (actorName) => `${actorName} commented on your hint`,
  reaction: (actorName) => `${actorName} reacted to your hint`,
  birthday_reminder: (actorName) => `${actorName}'s birthday is coming up`,
};

function buildEmailHtml({ title, body, ctaUrl }) {
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
        <p style="font-size:18px;font-weight:700;color:#2d2d2d;line-height:1.4;margin:0 0 10px;">${title}</p>
        ${body ? `<p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 24px;">${body}</p>` : ""}
        <div style="text-align:center;margin-top:${body ? "0" : "24px"};">
          <a href="${ctaUrl}" style="display:inline-block;background-color:#ff7e54;background-image:linear-gradient(160deg,#ff966f,#ff7e54);color:#ffffff;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">Open HintDrop</a>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
  </div>
</div>
</body>
</html>`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, actor_user_id, type, entity_id, title, notifBody, data } = body;

    if (!user_id || !type || !title) {
      return NextResponse.json({ error: "user_id, type, and title are required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: insertError } = await supabase.from("notifications").insert({
      user_id,
      actor_user_id: actor_user_id || null,
      type,
      entity_id: entity_id || null,
      title,
      body: notifBody || null,
      data: data || {},
    });

    if (insertError) throw insertError;

    // Email is best-effort — the bell notification above is the important
    // part and has already succeeded, so a failure here shouldn't surface
    // as an error to the caller
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_reminders")
        .eq("id", user_id)
        .maybeSingle();

      if (profile?.email_reminders !== false) {
        const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
        const email = authUser?.user?.email;

        if (email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "HintDrop <hello@hintdrop.app>",
              to: email,
              subject: title,
              html: buildEmailHtml({ title, body: notifBody, ctaUrl: "https://hintdrop.app/feed" }),
            }),
          });
        }
      }
    } catch (emailError) {
      console.error("notification email failed:", emailError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("notification create error:", error);
    return NextResponse.json({ error: "Could not create notification" }, { status: 500 });
  }
}
