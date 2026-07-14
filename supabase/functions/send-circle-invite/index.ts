import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { circle_id, email, name, target_user_id } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Resolve email
    let resolvedEmail = email
    if (!resolvedEmail && target_user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(target_user_id)
      resolvedEmail = authUser?.user?.email || null
    }
    if (!resolvedEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'No email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get circle data
    const { data: circle } = await supabase
      .from('circles')
      .select('title, occasion_type, event_date, funding_mode, item_title, currency, item_target_amount, user_id')
      .eq('id', circle_id)
      .maybeSingle()

    // Get organiser name
    const { data: organiserProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', circle?.user_id)
      .maybeSingle()

    const inviterName = organiserProfile?.full_name || 'Someone'
    const circleTitle = circle?.title || 'a shared gift'
    const itemTitle = circle?.item_title || ''
    const fundingMode = circle?.funding_mode || 'flexible'
    const fundingLabel = fundingMode === 'all_or_nothing' ? 'All-or-nothing'
      : fundingMode === 'organiser_covers' ? 'Organiser covers gap'
      : 'Flexible pot'
    const fundingText = fundingMode === 'all_or_nothing'
      ? 'This circle only goes ahead if the full target is reached. If not, everyone is refunded.'
      : fundingMode === 'organiser_covers'
      ? 'The organiser covers any shortfall — the gift is happening regardless.'
      : 'Contribute what you want. Every bit counts towards the gift.'

    const price = circle?.item_target_amount
      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: circle.currency || 'GBP' }).format(circle.item_target_amount)
      : ''

    // Get invite token
    const { data: invite } = await supabase
      .from('circle_invites')
      .select('invite_token')
      .eq('circle_id', circle_id)
      .eq('invite_email_normalized', resolvedEmail.toLowerCase())
      .maybeSingle()

    const acceptUrl = invite?.invite_token
      ? `https://hintdrop.app/invite/circle?token=${invite.invite_token}`
      : 'https://hintdrop.app/circles'

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:#f5ede8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:44px;height:44px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;line-height:1;">🎁</div>
        <span style="font-size:22px;font-weight:800;color:#2d2d2d;letter-spacing:-0.5px;">Hint<span style="color:#ff8060;">Drop</span></span>
      </div>
    </div>
    <div style="background:#fffaf7;border-radius:28px;border:1px solid #efdcd2;box-shadow:0 20px 60px rgba(88,46,31,0.12);overflow:hidden;">
      <div style="background:linear-gradient(135deg,#2f3b2d,#3d4f3a);padding:36px 40px 32px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin:0 0 10px;">You have been invited</p>
        <h1 style="font-size:24px;font-weight:700;color:white;line-height:1.2;margin:0;">${inviterName} invited you to a circle</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 24px;">Hi ${name || 'there'}, <strong style="color:#2d2d2d;">${inviterName}</strong> has invited you to join a shared gift circle for <strong style="color:#2d2d2d;">${circleTitle}</strong>.</p>
        ${itemTitle ? `<div style="background:#f7f2ee;border-radius:18px;border:1px solid #efe0d7;padding:18px 20px;margin-bottom:20px;"><p style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#e08a67;margin:0 0 8px;">The gift</p><p style="font-size:15px;font-weight:700;color:#2d2d2d;margin:0;">${itemTitle}</p>${price ? `<p style="font-size:14px;font-weight:700;color:#ff8060;margin:4px 0 0;">${price}</p>` : ''}</div>` : ''}
        <div style="background:#fff4ee;border-radius:18px;border:1px solid #fde0d0;padding:14px 18px;margin-bottom:28px;">
          <p style="font-size:12px;font-weight:700;color:#e08a67;margin:0 0 4px;">${fundingLabel}</p>
          <p style="font-size:13px;color:#5a4a42;margin:0;">${fundingText}</p>
        </div>
        <div style="text-align:center;">
          <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(160deg,#3d4f3a,#2f3b2d);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">Join the circle</a>
        </div>
        <p style="font-size:13px;color:#a08070;text-align:center;margin:18px 0 0;">This invite expires in 7 days.</p>
      </div>
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">You received this because ${inviterName} invited you to a circle on HintDrop.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
  </div>
</div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HintDrop <hello@hintdrop.app>',
        to: resolvedEmail,
        subject: `${inviterName} invited you to join a circle on HintDrop`,
        html,
      }),
    })

    return new Response(JSON.stringify({ ok: resendRes.ok }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
