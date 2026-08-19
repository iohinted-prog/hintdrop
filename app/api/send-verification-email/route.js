import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
  try {
    const supabase = getSupabase();
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const { data: userRes } = await supabase.auth.admin.getUserById(userId);
    const email = userRes?.user?.email;
    if (!email) return NextResponse.json({ error: "No email found for this user" }, { status: 404 });

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    const firstName = profile?.full_name?.split(" ")[0] || "there";

    const token = crypto.randomUUID();
    await supabase.from("email_verification_tokens").insert({ token, user_id: userId });

    const verifyUrl = `https://hintdrop.app/verify-email?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Confirm your HintDrop email",
      html: `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="background:#f5ede8;padding:40px 20px;">
            <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;">
              <p style="font-size:32px;text-align:center;margin:0 0 16px;">🎁</p>
              <h1 style="font-size:20px;color:#2d2d2d;text-align:center;margin:0 0 12px;">Hi ${firstName},</h1>
              <p style="font-size:15px;color:#5a4a42;text-align:center;line-height:1.6;margin:0 0 24px;">
                Just confirming this is really your email address, so we can make sure you never miss a reminder or a shared gift idea.
              </p>
              <div style="text-align:center;">
                <a href="${verifyUrl}" style="display:inline-block;background-color:#ff8a5c;color:#ffffff;font-weight:600;font-size:14px;padding:14px 32px;border-radius:999px;text-decoration:none;-webkit-text-size-adjust:none;">
                  Confirm my email
                </a>
              </div>
              <p style="font-size:12px;color:#9b8b82;text-align:center;margin:20px 0 0;word-break:break-all;">
                Or paste this link into your browser:<br />
                <a href="${verifyUrl}" style="color:#c9633f;">${verifyUrl}</a>
              </p>
              <p style="font-size:12px;color:#9b8b82;text-align:center;margin:24px 0 0;">
                If you didn't sign up for HintDrop, you can ignore this email.
              </p>
            </div>
          </div>
        </body></html>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("send-verification-email error:", error);
    return NextResponse.json({ error: "Could not send verification email" }, { status: 500 });
  }
}
