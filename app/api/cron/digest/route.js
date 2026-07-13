import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildDigestEmail({ recipientName, items }) {
  const itemsHtml = items.map(({ contactName, hints }) => `
    <div style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:36px;height:36px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🎁</div>
        <p style="font-size:15px;font-weight:700;color:#2d2d2d;margin:0;">${contactName} added ${hints.length} new ${hints.length === 1 ? 'hint' : 'hints'}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${hints.slice(0, 3).map(h => `
          <a href="${h.url || 'https://hintdrop.app/feed'}" style="display:flex;align-items:center;gap:12px;background:#f7f2ee;border-radius:14px;border:1px solid #efe0d7;padding:12px 14px;text-decoration:none;">
            ${h.image_url
              ? `<img src="${h.image_url}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;" />`
              : `<div style="width:44px;height:44px;border-radius:8px;background:linear-gradient(160deg,#ffb899,#ff8f6b);display:inline-flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🎁</div>`}
            <div>
              <p style="font-size:14px;font-weight:600;color:#2d2d2d;margin:0;">${h.title}</p>
              ${h.price_text ? `<p style="font-size:13px;color:#ff8060;font-weight:700;margin:3px 0 0;">${h.price_text}</p>` : ''}
              ${h.retailer ? `<p style="font-size:12px;color:#a07060;margin:2px 0 0;">${h.retailer}</p>` : ''}
            </div>
          </a>`).join('')}
      </div>
    </div>`).join('')

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
      <div style="background:linear-gradient(135deg,#2f3b2d,#3d4f3a);padding:36px 40px 32px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin:0 0 10px;">Your weekly digest</p>
        <h1 style="font-size:26px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">New hints from your contacts this week</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 28px;">Hi ${recipientName || 'there'}, here is what your contacts have been hinting at this week.</p>
        ${itemsHtml}
        <div style="text-align:center;margin-top:8px;">
          <a href="https://hintdrop.app/feed" style="display:inline-block;background:linear-gradient(160deg,#3d4f3a,#2f3b2d);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">View your feed</a>
        </div>
      </div>
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">
          <a href="https://hintdrop.app/settings" style="color:#b09080;">Manage digest preferences</a>
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
  </div>
</div>
</body>
</html>`
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const sent = []
  const errors = []
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Get all users with weekly digest on
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, weekly_digest')
      .eq('weekly_digest', true)

    for (const user of users || []) {
      try {
        // Get their contacts with profile_ids
        const { data: contacts } = await supabase
          .from('contacts')
          .select('profile_id, name')
          .eq('user_id', user.id)
          .not('profile_id', 'is', null)

        if (!contacts || contacts.length === 0) continue

        const contactProfileIds = contacts.map(c => c.profile_id)

        // Get feed items from contacts in last 7 days
        const { data: feedItems } = await supabase
          .from('feed_items')
          .select('actor_user_id, metadata')
          .eq('family', 'hint')
          .eq('item_type', 'hint_save_session')
          .in('actor_user_id', contactProfileIds)
          .gte('occurred_at', sevenDaysAgo)

        if (!feedItems || feedItems.length === 0) continue

        // Group by contact
        const byContact = {}
        for (const item of feedItems) {
          const contact = contacts.find(c => c.profile_id === item.actor_user_id)
          if (!contact) continue
          if (!byContact[item.actor_user_id]) {
            byContact[item.actor_user_id] = { contactName: contact.name, hints: [] }
          }
          const hints = item.metadata?.hints || []
          byContact[item.actor_user_id].hints.push(...hints)
        }

        const items = Object.values(byContact).filter(c => c.hints.length > 0)
        if (items.length === 0) continue

        const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
        const email = authUser?.user?.email
        if (!email) continue

        const html = buildDigestEmail({ recipientName: user.full_name || '', items })

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'HintDrop <hello@hintdrop.app>',
            to: email,
            subject: 'Your weekly HintDrop digest 🎁',
            html,
          }),
        })

        if (resendRes.ok) {
          sent.push({ to: email, contacts: items.length })
        } else {
          const err = await resendRes.json()
          errors.push({ user: email, error: err })
        }
      } catch (err) {
        errors.push({ user: user.id, error: err.message })
      }
    }

    return NextResponse.json({ ok: true, sent, errors, total: sent.length })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
