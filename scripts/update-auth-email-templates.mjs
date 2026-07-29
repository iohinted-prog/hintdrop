// One-off script to set branded HTML for Supabase's built-in auth emails
// (Reset Password, Confirm Signup) via the Supabase Management API.
//
// Auth email templates aren't stored in a Postgres table — they're config
// on the Auth service itself, so this has to go through the Management API
// rather than SQL.
//
// Usage:
//   1. Generate a personal access token: Supabase dashboard → your account
//      (top right avatar) → Access Tokens → Generate new token.
//   2. Run:
//      SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=egdghdutgjcdvhazmblw node scripts/update-auth-email-templates.mjs

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "egdghdutgjcdvhazmblw";

if (!ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Generate one at Supabase → Account → Access Tokens.");
  process.exit(1);
}

function brandedEmail({ eyebrow, heading, body, buttonLabel, footer }) {
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
      <div style="background:linear-gradient(135deg,#ff9a7b,#ff7055);padding:36px 40px 32px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.75);margin:0 0 10px;">${eyebrow}</p>
        <h1 style="font-size:26px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">${heading}</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 28px;">${body}</p>
        <div style="text-align:center;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(160deg,#ff966f,#ff7e54);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">${buttonLabel}</a>
        </div>
      </div>
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">${footer}</p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">© 2026 HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
  </div>
</div>
</body>
</html>`;
}

const recoveryHtml = brandedEmail({
  eyebrow: "Password reset",
  heading: "Reset your HintDrop password",
  body: "We got a request to reset the password on your HintDrop account. Tap the button below to choose a new one. This link expires in 1 hour.",
  buttonLabel: "Reset password",
  footer: "If you didn't request this, you can safely ignore this email — your password won't change.",
});

const confirmationHtml = brandedEmail({
  eyebrow: "Welcome",
  heading: "Confirm your HintDrop account",
  body: "You're almost set. Confirm your email to start saving hints, remembering dates, and planning gifts with the people who matter.",
  buttonLabel: "Confirm email",
  footer: "If you didn't create a HintDrop account, you can safely ignore this email.",
});

async function main() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mailer_subjects_recovery: "Reset your HintDrop password",
      mailer_templates_recovery_content: recoveryHtml,
      mailer_subjects_confirmation: "Confirm your HintDrop account",
      mailer_templates_confirmation_content: confirmationHtml,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`Failed (${res.status}):`, text);
    process.exit(1);
  }

  console.log("Auth email templates updated successfully.");
}

main();
