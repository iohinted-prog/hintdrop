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

    const { token } = await req.json()
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tokenHash = await hashToken(token)
    console.log('Looking up token hash:', tokenHash)

    const { data: invite, error: inviteError } = await supabase
      .from('contact_invites')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('status', 'pending')
      .maybeSingle()

    if (inviteError || !invite) {
      console.log('Invite not found:', inviteError)
      return new Response(JSON.stringify({ ok: false, error: 'Invite not found or already used' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ ok: false, error: 'Invite has expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Invite found:', invite.id)

    const { data: acceptorProfile } = await supabase
      .from('profiles')
      .select('id, birthday')
      .eq('id', user.id)
      .maybeSingle()

    console.log('Acceptor profile:', acceptorProfile)

    const { error: contactError } = await supabase
      .from('contacts')
      .insert({
        user_id: invite.inviter_user_id,
        profile_id: user.id,
        name: invite.invite_name ?? null,
        email: invite.invite_email,
        status: 'active',
        birthday: acceptorProfile?.birthday ?? null,
      })

    if (contactError) {
      console.log('Contact insert error:', contactError)
      return new Response(JSON.stringify({ ok: false, error: contactError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Contact created')

    const { error: updateError } = await supabase
      .from('contact_invites')
      .update({
        status: 'accepted',
        accepted_by_user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      console.log('Invite update error:', updateError)
      return new Response(JSON.stringify({ ok: false, error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Invite marked accepted')

    return new Response(JSON.stringify({ ok: true, inviter_user_id: invite.inviter_user_id }), {
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
