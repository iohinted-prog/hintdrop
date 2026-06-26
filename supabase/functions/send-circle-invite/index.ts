import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { circle_id, email, name } = await req.json()
    if (!circle_id || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'circle_id and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('id, title')
      .eq('id', circle_id)
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('Circle found:', circle, 'Circle error:', circleError)

    if (circleError || !circle) {
      return new Response(JSON.stringify({ ok: false, error: 'Circle not found or not yours' }), {
        status: 403,
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

    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: insertError } = await supabase
      .from('circle_invites')
      .insert({
        circle_id,
        user_id: user.id,
        invite_email: normalizedEmail,
        invite_email_normalized: normalizedEmail,
        invite_name: name ?? null,
        invite_token: inviteToken,
        invited_user_id: existingProfile?.id ?? null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      console.log('Circle insert error:', insertError)
      return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Invite created:', invite.id)

    const acceptUrl = `https://www.hinted.io/invite/circle?token=${inviteToken}`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hinted <onboarding@resend.dev>',
        to: normalizedEmail,
        subject: "You've been invited to join a pot on Hinted",
        html: `
          <p>Hi${name ? ` ${name}` : ''},</p>
          <p>You have been invited to join a group pot: <strong>${circle.title}</strong>.</p>
          <p><a href="${acceptUrl}">View and join the pot</a></p>
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
