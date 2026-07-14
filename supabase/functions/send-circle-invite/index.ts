import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function formatPrice(amount: number | null, currency: string | null): string {
  if (!amount) return ''
  const c = (currency || 'GBP').toUpperCase()
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fundingBlock(mode: string, inviterName: string, price: string, acceptedCount: number, invitedCount: number): string {
  const memberLine = invitedCount > 0
    ? `<p style="font-size:13px;color:#a07060;margin-top:10px;">${acceptedCount} of ${invitedCount} invited ${invitedCount === 1 ? 'person has' : 'people have'} already joined.</p>`
    : ''

  if (mode === 'all_or_nothing') {
    return `
      <div style="background:linear-gradient(135deg,#7a4a2a,#a0603a);padding:16px 24px;border-radius:14px 14px 0 0;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px;">All-or-nothing</p>
        <p style="font-size:17px;font-weight:700;color:white;">Only goes ahead if the full amount is raised</p>
      </div>
      <div style="background:#fff8f5;border:1px solid #fde0d0;border-radius:0 0 14px 14px;padding:18px 24px;">
        <p style="font-size:14px;color:#5a4a42;line-height:1.6;">This circle only pays out if everyone contributes enough to hit the full target. If it falls short, you'll be fully refunded — no risk.</p>
        <div style="margin-top:14px;background:#fffaf7;border-radius:12px;padding:14px 16px;border:1px solid #efe0d7;">
          <p style="font-size:12px;font-weight:700;color:#e08a67;margin-bottom:4px;">Target amount</p>
          <p style="font-size:20px;font-weight:800;color:#2d2d2d;">${price}</p>
          <p style="font-size:12px;color:#a07060;margin-top:2px;">You'll only be charged if the full amount is reached</p>
        </div>
        ${memberLine}
      </div>`
  }

  if (mode === 'organiser_covers') {
    return `
      <div style="background:linear-gradient(135deg,#3a4a7a,#4a5a9a);padding:16px 24px;border-radius:14px 14px 0 0;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px;">Organiser covers gap</p>
        <p style="font-size:17px;font-weight:700;color:white;">The gift is happening — join in if you can</p>
      </div>
      <div style="background:#f5f6ff;border:1px solid #dde0f5;border-radius:0 0 14px 14px;padding:18px 24px;">
        <p style="font-size:14px;color:#5a4a42;line-height:1.6;">${inviterName} is making this happen regardless. Contribute what you can and they'll cover anything left. No pressure — any amount is welcome.</p>
        <div style="margin-top:14px;background:#fffaf7;border-radius:12px;padding:14px 16px;border:1px solid #efe0d7;">
          <p style="font-size:12px;font-weight:700;color:#6070c0;margin-bottom:4px;">Target amount</p>
          <p style="font-size:20px;font-weight:800;color:#2d2d2d;">${price}</p>
          <p style="font-size:12px;color:#a07060;margin-top:2px;">Contribute any amount — organiser covers any shortfall</p>
        </div>
        ${memberLine}
      </div>`
  }

  // flexible (default)
  return `
    <div style="background:linear-gradient(135deg,#2f3b2d,#3d4f3a);padding:16px 24px;border-radius:14px 14px 0 0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px;">Flexible pot</p>
      <p style="font-size:17px;font-weight:700;color:white;">Contribute whatever feels right</p>
    </div>
    <div style="background:#f7f2ee;border:1px solid #efe0d7;border-radius:0 0 14px 14px;padding:18px 24px;">
      <p style="font-size:14px;color:#5a4a42;line-height:1.6;">There's no fixed amount — contribute as little or as much as you like. Every bit counts towards the gift.</p>
      <div style="margin-top:14px;background:#fffaf7;border-radius:12px;padding:14px 16px;border:1px solid #efe0d7;">
        <p style="font-size:12px;font-weight:700;color:#e08a67;margin-bottom:4px;">Target amount</p>
        <p style="font-size:20px;font-weight:800;color:#2d2d2d;">${price}</p>
        <p style="font-size:12px;color:#a07060;margin-top:2px;">Contribute any amount — no minimum</p>
      </div>
      ${memberLine}
    </div>`
}

function buildEmail(opts: {
  inviterName: string
  circleTitle: string
  eventDate: string
  occasionType: string
  itemTitle: string
  itemRetailer: string
  price: string
  fundingMode: string
  acceptedCount: number
  invitedCount: number
  acceptUrl: string
  recipientName: string
}): string {
  const ctaColor = opts.fundingMode === 'all_or_nothing'
    ? 'linear-gradient(160deg,#a0603a,#7a4a2a)'
    : opts.fundingMode === 'organiser_covers'
      ? 'linear-gradient(160deg,#4a5a9a,#3a4a7a)'
      : 'linear-gradient(160deg,#3d4f3a,#2f3b2d)'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:#f5ede8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:44px;height:44px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;">🎁</div>
        <span style="font-size:22px;font-weight:800;color:#2d2d2d;letter-spacing:-0.5px;">Hint<span style="color:#ff8060;">Drop</span></span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#fffaf7;border-radius:28px;border:1px solid #efdcd2;box-shadow:0 20px 60px rgba(88,46,31,0.12);overflow:hidden;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#2f3b2d,#3d4f3a);padding:36px 40px 32px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin:0 0 10px;">You're invited to a circle</p>
        <h1 style="font-size:26px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">${opts.inviterName} is organising a shared gift</h1>
      </div>

      <!-- Occasion pill -->
      <div style="padding:28px 40px 0;">
        <div style="display:inline-flex;align-items:center;gap:10px;background:#fff4ee;border:1px solid #fde0d0;border-radius:50px;padding:10px 18px;">
          <span style="font-size:18px;">🎉</span>
          <div>
            <p style="font-size:13px;font-weight:700;color:#2d2d2d;margin:0;">${opts.circleTitle}</p>
            ${opts.eventDate ? `<p style="font-size:12px;color:#a07060;margin:2px 0 0;">${opts.occasionType} · ${opts.eventDate}</p>` : ''}
          </div>
        </div>
      </div>

      <div style="padding:24px 40px 36px;">

        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 24px;"><strong style="color:#2d2d2d;">${opts.inviterName}</strong> has invited you to join a shared gift circle on HintDrop. Pool together with others, claim your contribution, and make it something special.</p>

        <!-- Gift -->
        ${opts.itemTitle ? `
        <div style="background:#f7f2ee;border-radius:18px;border:1px solid #efe0d7;padding:20px 22px;margin-bottom:24px;">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#e08a67;margin:0 0 14px;">The gift</p>
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:52px;height:52px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">🎁</div>
            <div>
              <p style="font-size:15px;font-weight:700;color:#2d2d2d;margin:0;">${opts.itemTitle}</p>
              ${opts.itemRetailer ? `<p style="font-size:13px;color:#a07060;margin:3px 0 0;">${opts.itemRetailer}</p>` : ''}
              ${opts.price ? `<p style="font-size:14px;font-weight:700;color:#ff8060;margin:4px 0 0;">${opts.price}</p>` : ''}
            </div>
          </div>
        </div>` : ''}

        <!-- Funding type block -->
        <div style="border-radius:14px;overflow:hidden;margin-bottom:28px;">
          ${fundingBlock(opts.fundingMode, opts.inviterName, opts.price, opts.acceptedCount, opts.invitedCount)}
        </div>

        <!-- CTA -->
        <div style="text-align:center;">
          <a href="${opts.acceptUrl}" style="display:inline-block;background:${ctaColor};color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;letter-spacing:-0.02em;">Join the circle</a>
        </div>
        <p style="font-size:13px;color:#a08070;text-align:center;margin:18px 0 0;">This invite expires in 7 days.</p>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">You received this because ${opts.inviterName} invited you to a circle on HintDrop.<br>If you don't know them, you can safely ignore this email.</p>
      </div>
    </div>

    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">© 2025 HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
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

    const { circle_id, email, name, target_user_id } = await req.json()
    if (!circle_id || (!email && !target_user_id)) {
      return new Response(JSON.stringify({ ok: false, error: 'circle_id and email or target_user_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch full circle data
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('id, title, occasion_type, event_date, funding_mode, item_title, item_url, item_image_url, currency, item_target_amount, recipient_contact_id')
      .eq('id', circle_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (circleError || !circle) {
      return new Response(JSON.stringify({ ok: false, error: 'Circle not found or not yours' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch organiser name
    const { data: organiserProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const inviterName = organiserProfile?.full_name || 'Someone'

    // Fetch member counts
    const { data: invites } = await supabase
      .from('circle_invites')
      .select('status')
      .eq('circle_id', circle_id)

    const invitedCount = invites?.length || 0
    const acceptedCount = invites?.filter(i => i.status === 'accepted').length || 0

    const normalizedEmail = email.toLowerCase().trim()

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email_normalized', normalizedEmail)
      .maybeSingle()

    const inviteToken = crypto.randomUUID()
    const inviteTokenHash = await hashToken(inviteToken)

    const { data: invite, error: insertError } = await supabase
      .from('circle_invites')
      .insert({
        circle_id,
        user_id: user.id,
        invite_email: normalizedEmail,
        invite_email_normalized: normalizedEmail,
        invite_name: name ?? null,
        invite_token: inviteToken,
        invite_token_hash: inviteTokenHash,
        invited_user_id: existingProfile?.id ?? null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const acceptUrl = `https://www.hintdrop.app/invite/circle?token=${inviteToken}`
    // Resolve email from target_user_id if not provided
    let resolvedEmail = email
    if (!resolvedEmail && target_user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(target_user_id)
      resolvedEmail = authUser?.user?.email || null
    }
    if (!resolvedEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'Could not resolve email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const price = formatPrice(circle.item_target_amount, circle.currency)
    const eventDate = formatDate(circle.event_date)

    const html = buildEmail({
      inviterName,
      circleTitle: circle.title || 'Shared gift',
      eventDate,
      occasionType: circle.occasion_type || 'Occasion',
      itemTitle: circle.item_title || '',
      itemRetailer: '',
      price,
      fundingMode: circle.funding_mode || 'flexible',
      acceptedCount,
      invitedCount,
      acceptUrl,
      recipientName: name || '',
    })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HintDrop <hello@hintdrop.app>',
        to: resolvedEmail || normalizedEmail,
        subject: `${inviterName} invited you to join a circle on HintDrop`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.json()
      return new Response(JSON.stringify({ ok: false, error: 'Email failed', detail: resendError }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, invite_id: invite.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
