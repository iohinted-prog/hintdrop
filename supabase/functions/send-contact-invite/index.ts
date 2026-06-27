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
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) {
      console.log('Auth error:', userError)
      return new Response(JSON.stringify({ ok: false, error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('User authenticated:', user.id)

    const { email, name } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log('Inviting:', normalizedEmail)

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email_normalized', normalizedEmail)
      .maybeSingle()

    const token = crypto.randomUUID()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: insertError } = await supabase
      .from('contact_invites')
      .insert({
        inviter_user_id: user.id,
        invite_email: normalizedEmail,
        invite_name: name ?? null,
        token_hash: tokenHash,
        expires_at: expiresAt,
        accepted_by_user_id: existingProfile?.id ?? null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.log('Insert error:', insertError)
      return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Invite created:', invite.id)

    const acceptUrl = `https://www.hinted.io/invite/contact?token=${token}`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hinted <onboarding@resend.dev>',
        to: normalizedEmail,
        subject: "You've been added as a contact on Hinted",
        html: `
          <p>Hi${name ? ` ${name}` : ''},</p>
          <p>Someone has added you as a contact on Hinted.</p>
          <p><a href="${acceptUrl}">Accept and view their profile</a></p>
          <p>This link expires in 7 days.</p>
        `,
      }),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.json()
      console.log('Resend error:', resendError)
      return new Response(JSON.stringify({ ok: false, error: 'Email failed', detail: resendError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Email sent successfully')

    return new Response(JSON.stringify({ ok: true, invite_id: invite.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.log('Caught error:', error)
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
