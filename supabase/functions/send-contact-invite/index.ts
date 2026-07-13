import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}


function buildContactInviteEmail(inviterName: string, recipientName: string, acceptUrl: string): string {
  const hi = recipientName ? ` ${recipientName}` : ''
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
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.75);margin:0 0 10px;">You've been invited</p>
        <h1 style="font-size:26px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">${inviterName} wants to connect with you on HintDrop</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 14px;">Hi${hi},</p>
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 28px;"><strong style="color:#2d2d2d;">${inviterName}</strong> has added you as a contact on HintDrop — the thoughtful way to share gift ideas, remember important dates, and plan presents together.</p>
        <div style="background:#fff4ee;border-radius:18px;border:1px solid #fde0d0;padding:22px 24px;margin-bottom:32px;">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#e08a67;margin:0 0 14px;">What you get</p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;"><span style="font-size:18px;">🎁</span><span style="font-size:14px;color:#5a4a42;">See their hint list and discover what they actually want</span></div>
            <div style="display:flex;align-items:center;gap:12px;"><span style="font-size:18px;">🔔</span><span style="font-size:14px;color:#5a4a42;">Get reminded before their birthday and key dates</span></div>
            <div style="display:flex;align-items:center;gap:12px;"><span style="font-size:18px;">🤝</span><span style="font-size:14px;color:#5a4a42;">Join shared circles and go in on gifts together</span></div>
          </div>
        </div>
        <div style="text-align:center;">
          <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(160deg,#ff966f,#ff7e54);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">Accept invite</a>
        </div>
        <p style="font-size:13px;color:#a08070;text-align:center;margin:18px 0 0;">This invite expires in 7 days.</p>
      </div>
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">You received this because ${inviterName} added your email on HintDrop.<br>If you don't know them, you can safely ignore this email.</p>
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
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)

    if (userError || !user) {
      console.log('Auth error:', userError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Fetch inviter name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
    const inviterName = inviterProfile?.full_name || 'Someone'

    const body = await req.json()
    let email = String(body?.email || '').trim()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const role = typeof body?.role === 'string' ? body.role.trim() : 'Friend'
    const targetUserId = typeof body?.target_user_id === 'string' ? body.target_user_id.trim() : null

    // If target_user_id provided, look up their email from auth.users
    if (targetUserId && !email) {
      const { data: targetUser } = await supabase.auth.admin.getUserById(targetUserId)
      if (targetUser?.user?.email) {
        email = targetUser.user.email
      }
    }

    if (!email) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = email.toLowerCase()
    console.log('Inviting:', normalizedEmail)

    if (user.email && normalizedEmail === user.email.trim().toLowerCase()) {
      return new Response(
        JSON.stringify({ ok: false, error: 'You cannot invite yourself as a contact' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Block if already an active linked contact
    const { data: existingLinkedContact, error: existingLinkedContactError } = await supabase
      .from('contacts')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('email', normalizedEmail)
      .not('profile_id', 'is', null)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (existingLinkedContactError) {
      console.log('Existing linked contact lookup error:', existingLinkedContactError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to check existing contact' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingLinkedContact) {
      return new Response(
        JSON.stringify({ ok: false, error: 'This person is already an active contact.', contact_id: existingLinkedContact.id }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Block if already a pending invite
    const { data: existingPendingInvite, error: existingInviteError } = await supabase
      .from('contact_invites')
      .select('id')
      .eq('inviter_user_id', user.id)
      .eq('invite_email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInviteError) {
      console.log('Existing invite lookup error:', existingInviteError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to check existing invite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingPendingInvite) {
      console.log('Pending invite already exists:', existingPendingInvite.id)
      return new Response(
        JSON.stringify({ ok: false, error: 'A pending invite already exists for this email address.', invite_id: existingPendingInvite.id }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find or create the placeholder contacts row so the invitee avatar
    // appears immediately in the inviter's contacts list after sending.
    const { data: existingEmailOnlyContact, error: existingEmailOnlyContactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', normalizedEmail)
      .is('profile_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingEmailOnlyContactError) {
      console.log('Existing email-only contact lookup error:', existingEmailOnlyContactError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to check existing saved contact' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let contactId = existingEmailOnlyContact?.id ?? null

    if (!contactId) {
      const { data: newContact, error: newContactError } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          name: name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          role: role,
          status: null,
        })
        .select('id')
        .single()

      if (newContactError) {
        console.log('Contact insert error:', newContactError)
        // Non-fatal: invite can still be sent even if placeholder contact fails
      } else {
        contactId = newContact.id
        console.log('Placeholder contact created:', contactId)
      }
    }

    // Look up whether this email belongs to a registered user so we can
    // stamp invited_user_id at send time for in-app invite matching
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email_normalized', normalizedEmail)
      .maybeSingle()

    if (existingProfileError) {
      console.log('Existing profile lookup error:', existingProfileError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to check existing profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = crypto.randomUUID()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: insertError } = await supabase
      .from('contact_invites')
      .insert({
        inviter_user_id: user.id,
        contact_id: contactId,
        invite_email: normalizedEmail,
        invite_name: name || null,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
        accepted_by_user_id: null,
        accepted_at: null,
        invited_user_id: existingProfile?.id ?? null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.log('Insert error:', insertError)
      return new Response(
        JSON.stringify({ ok: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Invite created:', invite.id)

    const acceptUrl = `https://www.hintdrop.app/invite/contact?token=${token}`
    console.log('Sending with from address: Hinted <hello@hintdrop.app>')

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HintDrop <hello@hintdrop.app>',
        to: normalizedEmail,
        subject: "You've been added as a contact on HintDrop",
        html: `
          <p>Hi${name ? ` ${name}` : ''},</p>
          <p>Someone has added you as a contact on HintDrop.</p>
          <p><a href="${acceptUrl}">Accept and view their profile</a></p>
          <p>This link expires in 7 days.</p>
        `,
      }),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.json()
      console.log('Resend error:', resendError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Email failed', detail: resendError, from: 'HintDrop <hello@hintdrop.app>' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendData = await resendRes.json()
    console.log('Email sent successfully:', resendData)

    return new Response(
      JSON.stringify({ ok: true, invite_id: invite.id, email_id: resendData?.id ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.log('Caught error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})