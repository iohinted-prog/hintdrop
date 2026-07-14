import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function page(title, body, color = '#4e684d') {
  return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#fffaf7"><div style="max-width:480px;margin:80px auto"><h2 style="color:${color}">${title}</h2><p style="color:#5a4a42">${body}</p><a href="https://hintdrop.app/circles" style="display:inline-block;margin-top:20px;background:#ff7e54;color:white;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700">Back to HintDrop</a></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const circleId = searchParams.get('circle_id')
  const inviteId = searchParams.get('invite_id')

  if (!action || !circleId || !inviteId) return page('Invalid link', 'This link is missing required parameters.', '#b14f43')

  const { data: invite } = await supabase
    .from('circle_invites')
    .select('id, invite_name, status, circle_id')
    .eq('id', inviteId)
    .eq('circle_id', circleId)
    .maybeSingle()

  if (!invite) return page('Invalid link', 'This invite could not be found.', '#b14f43')

  if (action === 'accept') {
    await supabase.from('circle_invites').update({ status: 'accepted_gap' }).eq('id', inviteId)
    return page('You\'re in', 'Great — you\'ll be charged the updated amount when you contribute in HintDrop.', '#4e684d')
  }

  if (action === 'decline') {
    await supabase.from('circle_invites').update({ status: 'declined' }).eq('id', inviteId)

    // Check if all accepted members have now declined the gap
    const { data: remaining } = await supabase
      .from('circle_invites')
      .select('id, status')
      .eq('circle_id', circleId)
      .in('status', ['accepted', 'accepted_gap'])

    // Notify organiser
    const { data: circle } = await supabase.from('circles').select('title, user_id').eq('id', circleId).maybeSingle()
    if (circle) {
      const { data: organiserAuth } = await supabase.auth.admin.getUserById(circle.user_id)
      const organiserEmail = organiserAuth?.user?.email
      if (organiserEmail) {
        const closeUrl = `https://hintdrop.app/api/circles/joining-decision?action=close&circle_id=${circleId}&token=${circle.user_id}`
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'HintDrop <hello@hintdrop.app>',
            to: organiserEmail,
            subject: `${invite.invite_name || 'Someone'} declined the updated share for ${circle.title}`,
            html: `<p>${invite.invite_name || 'A member'} declined the updated share. ${remaining?.length || 0} members remain. <a href="${closeUrl}">Close the circle</a> if needed.</p>`,
          }),
        })
      }
    }

    return page('Noted', 'You\'ve been removed from this circle. If you\'ve already contributed, you\'ll be refunded.', '#b14f43')
  }

  return page('Unknown action', 'Something went wrong.', '#b14f43')
}
