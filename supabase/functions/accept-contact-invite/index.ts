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
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

type ContactRow = {
  id: string
  profile_id: string | null
  email: string | null
  created_at: string
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

    // IMPORTANT: this client uses the service role key with NO Authorization
    // header override. Previously the user's own JWT was passed as a global
    // header, which caused PostgREST/RLS to evaluate every query as that
    // user rather than as service role. Since contact_invites has RLS
    // restricting SELECT to "inviter_user_id = auth.uid()", that override
    // silently blocked the acceptor from ever seeing their own pending
    // invite, producing a false "Invite not found" on every accept attempt.
    // service-role clients bypass RLS entirely as long as no JWT override
    // is present, which is what this function needs since it must read and
    // write rows on the inviter's behalf, not just the signed-in user's own.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const jwt = authHeader.replace('Bearer ', '').trim()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt)

    if (userError || !user) {
      console.log('Auth error:', userError)
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Invalid user',
          detail: userError?.message ?? null,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const body = await req.json()
    const token = body?.token ?? null
    const inviteId = body?.invite_id ?? null

    if (!token && !inviteId) {
      return new Response(JSON.stringify({ ok: false, error: 'token or invite_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Two acceptance paths:
    // 1. token: emailed link path, hash the raw token and look up by token_hash.
    // 2. invite_id: in-app path for already-authenticated users, look up directly
    //    by id. Safe because the service-role client bypasses RLS and we verify
    //    the acceptor's identity via their JWT earlier in this function.
    let inviteQuery = supabase
      .from('contact_invites')
      .select('*')
      .eq('status', 'pending')

    if (token) {
      const tokenHash = await hashToken(token)
      inviteQuery = inviteQuery.eq('token_hash', tokenHash)
    } else {
      inviteQuery = inviteQuery.eq('id', inviteId)
    }

    const { data: invite, error: inviteError } = await inviteQuery.maybeSingle()

    if (inviteError || !invite) {
      console.log('Invite not found:', inviteError)
      return new Response(JSON.stringify({ ok: false, error: 'Invite not found or already used' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Guard: an inviter can never accept their own invite. This prevents the
    // self-referencing contact corruption (user_id === profile_id) seen when
    // a stale/duplicate invite gets actioned by the original sender's own session.
    if (invite.inviter_user_id === user.id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'You cannot accept your own invite' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (new Date(invite.expires_at) < new Date()) {
      const { error: deleteErr } = await supabase.from('contact_invites').delete().eq('id', invite.id)
      if (deleteErr) console.log('Failed to delete expired invite:', invite.id, deleteErr)
      else console.log('Deleted expired invite:', invite.id)
      return new Response(JSON.stringify({ ok: false, error: 'Invite has expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userEmail = String(user.email || '').trim().toLowerCase()
    const inviteEmail = String(invite.invite_email || '').trim().toLowerCase()

    if (inviteEmail && userEmail && inviteEmail !== userEmail) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invite email does not match signed-in user' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { data: acceptorProfile, error: acceptorProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, invite_name, birthday')
      .eq('id', user.id)
      .maybeSingle()

    if (acceptorProfileError) {
      console.log('Acceptor profile lookup error:', acceptorProfileError)
      return new Response(JSON.stringify({ ok: false, error: acceptorProfileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: inviterProfile, error: inviterProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, invite_name, birthday, email')
      .eq('id', invite.inviter_user_id)
      .maybeSingle()

    if (inviterProfileError) {
      console.log('Inviter profile lookup error:', inviterProfileError)
      return new Response(JSON.stringify({ ok: false, error: inviterProfileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const acceptorName =
      acceptorProfile?.full_name ||
      acceptorProfile?.invite_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      invite.invite_name ||
      user.email ||
      'New contact'

    // Get inviter email from auth.users since profiles.email is not populated
    const { data: inviterAuthUser } = await supabase.auth.admin.getUserById(invite.inviter_user_id)
    const inviterAuthEmail = inviterAuthUser?.user?.email || null

    const inviterName =
      inviterProfile?.full_name ||
      inviterProfile?.invite_name ||
      inviterAuthEmail ||
      'New contact'

    const normalizedUserEmail = userEmail || null
    const normalizedInviteEmail = inviteEmail || null
    const normalizedInviterEmail = String(inviterAuthEmail || inviterProfile?.email || '').trim().toLowerCase() || null

    // ---- Inviter-side canonical contact ----

    const inviterCandidates: ContactRow[] = []

    if (invite.contact_id) {
      const { data: contactIdMatch, error: contactIdMatchError } = await supabase
        .from('contacts')
        .select('id, profile_id, email, created_at')
        .eq('id', invite.contact_id)
        .eq('user_id', invite.inviter_user_id)
        .maybeSingle()

      if (contactIdMatchError) {
        console.log('Inviter contact_id lookup error:', contactIdMatchError)
        return new Response(JSON.stringify({ ok: false, error: contactIdMatchError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (contactIdMatch) {
        inviterCandidates.push(contactIdMatch)
      }
    }

    if (normalizedInviteEmail) {
      const { data: emailMatches, error: emailMatchesError } = await supabase
        .from('contacts')
        .select('id, profile_id, email, created_at')
        .eq('user_id', invite.inviter_user_id)
        .eq('email', normalizedInviteEmail)
        .order('created_at', { ascending: true })

      if (emailMatchesError) {
        console.log('Inviter email match lookup error:', emailMatchesError)
        return new Response(JSON.stringify({ ok: false, error: emailMatchesError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      for (const row of emailMatches || []) {
        if (!inviterCandidates.find((candidate) => candidate.id === row.id)) {
          inviterCandidates.push(row)
        }
      }
    }

    const { data: linkedMatch, error: linkedMatchError } = await supabase
      .from('contacts')
      .select('id, profile_id, email, created_at')
      .eq('user_id', invite.inviter_user_id)
      .eq('profile_id', user.id)
      .maybeSingle()

    if (linkedMatchError) {
      console.log('Inviter linked match lookup error:', linkedMatchError)
      return new Response(JSON.stringify({ ok: false, error: linkedMatchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (linkedMatch && !inviterCandidates.find((candidate) => candidate.id === linkedMatch.id)) {
      inviterCandidates.push(linkedMatch)
    }

    let canonicalInviterContactId: string | null = null

    const alreadyLinked = inviterCandidates.find((row) => row.profile_id === user.id)
    const emailOnly = inviterCandidates.find((row) => !row.profile_id)
    const fallback = inviterCandidates[0]

    if (alreadyLinked) {
      canonicalInviterContactId = alreadyLinked.id
    } else if (emailOnly) {
      canonicalInviterContactId = emailOnly.id
    } else if (fallback) {
      canonicalInviterContactId = fallback.id
    }

    if (canonicalInviterContactId) {
      const { error: canonicalUpdateError } = await supabase
        .from('contacts')
        .update({
          profile_id: user.id,
          name: acceptorName,
          email: normalizedUserEmail || normalizedInviteEmail,
          status: 'active',
          birthday: acceptorProfile?.birthday ?? null,
        })
        .eq('id', canonicalInviterContactId)

      if (canonicalUpdateError) {
        console.log('Canonical inviter contact update error:', canonicalUpdateError)
        return new Response(JSON.stringify({ ok: false, error: canonicalUpdateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      const { data: insertedInviterContact, error: inviterInsertError } = await supabase
        .from('contacts')
        .insert({
          user_id: invite.inviter_user_id,
          profile_id: user.id,
          name: acceptorName,
          email: normalizedUserEmail || normalizedInviteEmail,
          status: 'active',
          birthday: acceptorProfile?.birthday ?? null,
        })
        .select('id')
        .single()

      if (inviterInsertError || !insertedInviterContact) {
        console.log('Inviter contact insert error:', inviterInsertError)
        return new Response(
          JSON.stringify({
            ok: false,
            error: inviterInsertError?.message || 'Failed to insert inviter contact',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      canonicalInviterContactId = insertedInviterContact.id
    }

    const inviterDuplicateIds = inviterCandidates
      .map((row) => row.id)
      .filter((id) => id !== canonicalInviterContactId)

    if (inviterDuplicateIds.length > 0) {
      const { error: deleteDuplicateInviterContactsError } = await supabase
        .from('contacts')
        .delete()
        .in('id', inviterDuplicateIds)

      if (deleteDuplicateInviterContactsError) {
        console.log('Inviter duplicate delete error:', deleteDuplicateInviterContactsError)
        return new Response(JSON.stringify({ ok: false, error: deleteDuplicateInviterContactsError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ---- Acceptor-side canonical contact ----

    const { data: acceptorCandidates, error: acceptorCandidatesError } = await supabase
      .from('contacts')
      .select('id, profile_id, email, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (acceptorCandidatesError) {
      console.log('Acceptor-side contact lookup error:', acceptorCandidatesError)
      return new Response(JSON.stringify({ ok: false, error: acceptorCandidatesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const acceptorMatches = (acceptorCandidates || []).filter((row) => {
      const rowEmail = String(row.email || '').trim().toLowerCase() || null
      return (
        row.profile_id === invite.inviter_user_id ||
        (!!normalizedInviterEmail && rowEmail === normalizedInviterEmail) ||
        (!!normalizedInviteEmail && rowEmail === normalizedInviteEmail) ||
        (!!normalizedUserEmail && rowEmail === normalizedUserEmail)
      )
    })

    let canonicalAcceptorContactId: string | null = null

    const acceptorAlreadyLinked = acceptorMatches.find((row) => row.profile_id === invite.inviter_user_id)
    const acceptorEmailOnly = acceptorMatches.find((row) => !row.profile_id)
    const acceptorFallback = acceptorMatches[0]

    if (acceptorAlreadyLinked) {
      canonicalAcceptorContactId = acceptorAlreadyLinked.id
    } else if (acceptorEmailOnly) {
      canonicalAcceptorContactId = acceptorEmailOnly.id
    } else if (acceptorFallback) {
      canonicalAcceptorContactId = acceptorFallback.id
    }

    if (canonicalAcceptorContactId) {
      const { error: acceptorUpdateError } = await supabase
        .from('contacts')
        .update({
          profile_id: invite.inviter_user_id,
          name: inviterName,
          email: normalizedInviterEmail,
          status: 'active',
          birthday: inviterProfile?.birthday ?? null,
        })
        .eq('id', canonicalAcceptorContactId)

      if (acceptorUpdateError) {
        console.log('Acceptor-side contact update error:', acceptorUpdateError)
        return new Response(JSON.stringify({ ok: false, error: acceptorUpdateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      const { data: insertedAcceptorContact, error: acceptorInsertError } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          profile_id: invite.inviter_user_id,
          name: inviterName,
          email: normalizedInviterEmail,
          status: 'active',
          birthday: inviterProfile?.birthday ?? null,
        })
        .select('id')
        .single()

      if (acceptorInsertError || !insertedAcceptorContact) {
        console.log('Acceptor-side contact insert error:', acceptorInsertError)
        return new Response(
          JSON.stringify({
            ok: false,
            error: acceptorInsertError?.message || 'Failed to insert acceptor contact',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      canonicalAcceptorContactId = insertedAcceptorContact.id
    }

    const acceptorDuplicateIds = acceptorMatches
      .map((row) => row.id)
      .filter((id) => id !== canonicalAcceptorContactId)

    if (acceptorDuplicateIds.length > 0) {
      const { error: deleteDuplicateAcceptorContactsError } = await supabase
        .from('contacts')
        .delete()
        .in('id', acceptorDuplicateIds)

      if (deleteDuplicateAcceptorContactsError) {
        console.log('Acceptor duplicate delete error:', deleteDuplicateAcceptorContactsError)
        return new Response(JSON.stringify({ ok: false, error: deleteDuplicateAcceptorContactsError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { error: updateInviteError } = await supabase
      .from('contact_invites')
      .update({
        status: 'accepted',
        accepted_by_user_id: user.id,
        accepted_at: new Date().toISOString(),
        invited_user_id: user.id,
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.log('Invite update error:', updateInviteError)
      return new Response(JSON.stringify({ ok: false, error: updateInviteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ---- Auto-resolve any reverse-direction pending invite ----
    // If the acceptor had ALSO separately invited the inviter (both people
    // added each other before either accepted), that second invite would
    // otherwise sit pending forever even though the relationship is now
    // active on both sides. Find it by matching on emails in the reverse
    // direction and mark it accepted too, reusing the same canonical
    // contact rows we just resolved above rather than creating new ones.
    if (normalizedUserEmail) {
      const { data: reverseInvite, error: reverseInviteError } = await supabase
        .from('contact_invites')
        .select('id')
        .eq('inviter_user_id', user.id)
        .eq('status', 'pending')
        .eq('invite_email', normalizedInviterEmail || '')
        .maybeSingle()

      if (reverseInviteError) {
        console.log('Reverse invite lookup error:', reverseInviteError)
        // Non-fatal: don't block the main acceptance on this lookup failing.
      }

      if (reverseInvite) {
        const { error: reverseUpdateError } = await supabase
          .from('contact_invites')
          .update({
            status: 'accepted',
            accepted_by_user_id: invite.inviter_user_id,
            accepted_at: new Date().toISOString(),
            invited_user_id: invite.inviter_user_id,
          })
          .eq('id', reverseInvite.id)

        if (reverseUpdateError) {
          console.log('Reverse invite update error:', reverseUpdateError)
          // Non-fatal: the main acceptance already succeeded; surface this
          // only via logs rather than failing the whole request.
        }
      }
    }

    // ---- Sync birthdays to each user's calendar ----
    // Only insert when a birthday is actually set, and avoid duplicates if
    // this function somehow runs twice for the same pair (e.g. retries).
    async function addBirthdayEvent(forUserId: string, birthday: string | null, title: string) {
      if (!birthday) return
      const { data: existingEvent } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('user_id', forUserId)
        .eq('event_date', birthday)
        .eq('title', title)
        .eq('type', 'birthday')
        .maybeSingle()

      if (existingEvent) return

      const { error: calendarInsertError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: forUserId,
          title,
          event_date: birthday,
          type: 'birthday',
          source: 'contact_sync',
        })

      if (calendarInsertError) {
        console.log('Calendar event insert error:', calendarInsertError)
        // Non-fatal: don't block contact acceptance on calendar sync failing.
      }
    }

    await addBirthdayEvent(invite.inviter_user_id, acceptorProfile?.birthday ?? null, acceptorName)
    await addBirthdayEvent(user.id, inviterProfile?.birthday ?? null, inviterName)

    return new Response(
      JSON.stringify({
        ok: true,
        inviter_user_id: invite.inviter_user_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.log('Caught error:', error)
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})