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
        const continueUrl = `https://hintdrop.app/api/circles/joining-decision?action=continue&circle_id=${circleId}&token=${circle.user_id}`
        const closeUrl = `https://hintdrop.app/api/circles/joining-decision?action=close&circle_id=${circleId}&token=${circle.user_id}`
        const coverUrl = `https://hintdrop.app/api/circles/joining-decision?action=continue&circle_id=${circleId}&token=${circle.user_id}`
        const remainingCount = remaining?.length || 0
        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:#f5ede8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <table cellpadding="0" cellspacing="0" style="display:inline-table;"><tr><td style="width:44px;height:44px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:14px;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">🎁</td></tr></table>
        <span style="font-size:22px;font-weight:800;color:#2d2d2d;letter-spacing:-0.5px;">Hint<span style="color:#ff8060;">Drop</span></span>
      </div>
    </div>
    <div style="background:#fffaf7;border-radius:28px;border:1px solid #efdcd2;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7a4a2a,#a0603a);padding:32px 36px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin:0 0 8px;">Circle update</p>
        <h1 style="font-size:22px;font-weight:700;color:white;margin:0;">${invite.invite_name || 'Someone'} declined the updated share</h1>
      </div>
      <div style="padding:32px 36px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 16px;">${remainingCount} ${remainingCount === 1 ? 'person remains' : 'people remain'} in <strong>${circle.title}</strong>. What would you like to do?</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${remainingCount > 0 ? `<a href="${continueUrl}" style="display:block;text-align:center;background:linear-gradient(160deg,#3d4f3a,#2f3b2d);color:white;font-size:14px;font-weight:700;padding:14px;border-radius:50px;text-decoration:none;">Continue with ${remainingCount} ${remainingCount === 1 ? 'person' : 'people'}</a>` : ''}
          ${remainingCount > 0 ? `<a href="${coverUrl}" style="display:block;text-align:center;background:linear-gradient(160deg,#ff966f,#ff7e54);color:white;font-size:14px;font-weight:700;padding:14px;border-radius:50px;text-decoration:none;">I'll cover the gap myself</a>` : ''}
          <a href="${closeUrl}" style="display:block;text-align:center;background:white;border:2px solid #efc0ba;color:#b14f43;font-size:14px;font-weight:700;padding:12px;border-radius:50px;text-decoration:none;">Close the circle</a>
        </div>
      </div>
    </div>
  </div>
</div></body></html>`

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'HintDrop <hello@hintdrop.app>',
            to: organiserEmail,
            subject: `${invite.invite_name || 'Someone'} declined — ${remainingCount} ${remainingCount === 1 ? 'person remains' : 'people remain'} in ${circle.title}`,
            html,
          }),
        })
      }
    }

    return page('Noted', 'You\'ve been removed from this circle. If you\'ve already contributed, you\'ll be refunded.', '#b14f43')
  }

  return page('Unknown action', 'Something went wrong.', '#b14f43')
}
