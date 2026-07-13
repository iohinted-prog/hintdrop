import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildWelcomeEmail(name: string): string {
  const hi = name || 'there'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:#f5ede8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:44px;height:44px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;">🎁</div>
        <span style="font-size:22px;font-weight:800;color:#2d2d2d;letter-spacing:-0.5px;">Hint<span style="color:#ff8060;">Drop</span></span>
      </div>
    </div>
    <div style="background:#fffaf7;border-radius:28px;border:1px solid #efdcd2;box-shadow:0 20px 60px rgba(88,46,31,0.12);overflow:hidden;">
      <div style="background:linear-gradient(135deg,#ff9a7b,#ff7055);padding:36px 40px 32px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.75);margin:0 0 10px;">Welcome to HintDrop</p>
        <h1 style="font-size:26px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">You are all set, ${hi}!</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 24px;">HintDrop helps you stay thoughtful. Save gift ideas, share them with people who matter, and never miss an important date.</p>
        <div style="background:#fff4ee;border-radius:18px;border:1px solid #fde0d0;padding:22px 24px;margin-bottom:32px;">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#e08a67;margin:0 0 14px;">Three things to try first</p>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;align-items:flex-start;gap:12px;">
              <span style="font-size:18px;">🎁</span>
              <div>
                <p style="font-size:14px;font-weight:600;color:#2d2d2d;margin:0;">Add your first hint</p>
                <p style="font-size:13px;color:#a07060;margin:3px 0 0;">Paste a link to anything you want and we will pull in the details automatically.</p>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:12px;">
              <span style="font-size:18px;">👥</span>
              <div>
                <p style="font-size:14px;font-weight:600;color:#2d2d2d;margin:0;">Add a contact</p>
                <p style="font-size:13px;color:#a07060;margin:3px 0 0;">Invite someone you care about so you can see their hints and plan gifts together.</p>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:12px;">
              <span style="font-size:18px;">⭕</span>
              <div>
                <p style="font-size:14px;font-weight:600;color:#2d2d2d;margin:0;">Start a circle</p>
                <p style="font-size:13px;color:#a07060;margin:3px 0 0;">Pool together with friends or family to buy something special for someone.</p>
              </div>
            </div>
          </div>
        </div>
        <div style="text-align:center;">
          <a href="https://hintdrop.app/feed" style="display:inline-block;background:linear-gradient(160deg,#ff966f,#ff7e54);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">Go to your feed</a>
        </div>
      </div>
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">Questions? Reach us at <a href="mailto:hello@hintdrop.app" style="color:#ff8060;">hello@hintdrop.app</a></p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
  </div>
</div>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing auth header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid user' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
    const name = profile?.full_name || ''
    const email = user.email
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'No email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HintDrop <hello@hintdrop.app>',
        to: email,
        subject: `Welcome to HintDrop, ${name || 'there'}! 🎁`,
        html: buildWelcomeEmail(name),
      }),
    })
    const ok = resendRes.ok
    return new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
