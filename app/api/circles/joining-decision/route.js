import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
  const token = searchParams.get('token')

  if (!action || !circleId || !token) return page('Invalid link', 'This link is missing required parameters.', '#b14f43')

  // Verify organiser
  const { data: circle } = await supabase
    .from('circles')
    .select('id, title, user_id, locked_share_amount, currency, joining_status')
    .eq('id', circleId)
    .eq('user_id', token)
    .maybeSingle()

  if (!circle) return page('Invalid link', 'This link is no longer valid.', '#b14f43')
  if (circle.joining_status === 'decided') return page('Already handled', 'You already responded to this notification in HintDrop.', '#4e684d')

  const { data: invites } = await supabase
    .from('circle_invites')
    .select('id, invite_name, invite_email_normalized, status, locked_share_amount')
    .eq('circle_id', circleId)

  const accepted = invites?.filter(i => i.status === 'accepted') || []

  if (action === 'close') {
    await supabase.from('circles').update({ status: 'cancelled', joining_status: 'decided' }).eq('id', circleId)
    return page('Circle closed', `${circle.title} has been cancelled. Anyone who already paid will be refunded.`, '#b14f43')
  }

  if (action === 'continue') {
    await supabase.from('circles').update({ status: 'active', joining_status: 'decided' }).eq('id', circleId)
    return page('Circle continuing', `${circle.title} is continuing with ${accepted.length} ${accepted.length === 1 ? 'person' : 'people'}. Their shares remain as set.`, '#4e684d')
  }

  if (action === 'ask_members') {
    // Recalculate share for accepted members only
    const newShare = circle.locked_share_amount
      ? Math.ceil(((circle.locked_share_amount * (invites?.length || 1)) / Math.max(accepted.length, 1)) * 100) / 100
      : null

    await supabase.from('circles').update({ joining_status: 'decided', status: 'active' }).eq('id', circleId)

    // Email each accepted member asking if they'll cover
    const { data: organiserProfile } = await supabase.from('profiles').select('full_name').eq('id', circle.user_id).maybeSingle()
    const organiserName = organiserProfile?.full_name || 'The organiser'

    for (const member of accepted) {
      try {
        const acceptUrl = `https://hintdrop.app/api/circles/member-gap-decision?action=accept&circle_id=${circleId}&invite_id=${member.id}`
        const declineUrl = `https://hintdrop.app/api/circles/member-gap-decision?action=decline&circle_id=${circleId}&invite_id=${member.id}`

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
        <h1 style="font-size:22px;font-weight:700;color:white;margin:0;">Your share for ${circle.title} has changed</h1>
      </div>
      <div style="padding:32px 36px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 16px;">Hi ${member.invite_name || 'there'}, not everyone joined the circle. ${organiserName} is asking if you're happy to cover the gap.</p>
        ${newShare ? `<div style="background:#fff4ee;border-radius:16px;padding:16px 20px;margin-bottom:20px;text-align:center;"><p style="font-size:13px;color:#e08a67;margin:0 0 4px;font-weight:700;">New share</p><p style="font-size:28px;font-weight:800;color:#2d2d2d;margin:0;">${new Intl.NumberFormat('en-GB', { style: 'currency', currency: circle.currency || 'GBP' }).format(newShare)}</p><p style="font-size:12px;color:#a08070;margin:4px 0 0;">+ Stripe processing fee at payment</p></div>` : ''}
        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="${acceptUrl}" style="display:block;text-align:center;background:linear-gradient(160deg,#3d4f3a,#2f3b2d);color:white;font-size:14px;font-weight:700;padding:14px;border-radius:50px;text-decoration:none;">Yes, I'll cover it</a>
          <a href="${declineUrl}" style="display:block;text-align:center;background:white;border:2px solid #efc0ba;color:#b14f43;font-size:14px;font-weight:700;padding:12px;border-radius:50px;text-decoration:none;">No, refund me</a>
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
            to: member.invite_email_normalized,
            subject: `Your share for ${circle.title} has changed`,
            html,
          }),
        })
      } catch (e) {
        console.error('Member gap email failed:', e)
      }
    }

    return page('Members notified', `We've emailed the ${accepted.length} members who joined to ask if they'll cover the gap.`, '#4e684d')
  }

  return page('Unknown action', 'Something went wrong.', '#b14f43')
}
