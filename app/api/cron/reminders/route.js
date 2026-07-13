import { createClient } from '../../../../lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildReminderEmail({ recipientName, contactName, eventType, eventDate, daysUntil, hints }) {
  const hasHints = hints && hints.length > 0
  const urgency = daysUntil <= 3 ? 'Coming up very soon' : daysUntil <= 7 ? 'Coming up this week' : 'Coming up soon'
  const ctaUrl = hasHints ? 'https://hintdrop.app/feed' : 'https://hintdrop.app/gift-shop'
  const ctaText = hasHints ? 'See all their hints' : 'Browse the gift shop'
  const hintsHtml = hasHints ? hints.slice(0, 3).map(h => `
    <a href="${h.url || 'https://hintdrop.app'}" style="display:flex;align-items:center;gap:12px;background:#f7f2ee;border-radius:14px;border:1px solid #efe0d7;padding:12px 14px;text-decoration:none;margin-bottom:10px;">
      ${h.image_url
        ? `<img src="${h.image_url}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;" />`
        : `<div style="width:44px;height:44px;border-radius:8px;background:linear-gradient(160deg,#ffb899,#ff8f6b);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🎁</div>`}
      <div>
        <p style="font-size:14px;font-weight:600;color:#2d2d2d;margin:0;">${h.title}</p>
        ${h.price_text ? `<p style="font-size:13px;color:#ff8060;font-weight:700;margin:3px 0 0;">${h.price_text}</p>` : ''}
      </div>
    </a>`).join('') : ''

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
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.75);margin:0 0 10px;">${urgency}</p>
        <h1 style="font-size:26px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">${contactName}'s ${eventType} is in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 6px;">Hi ${recipientName || 'there'},</p>
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 24px;">Just a heads up — <strong style="color:#2d2d2d;">${contactName}'s ${eventType}</strong> is on <strong style="color:#2d2d2d;">${eventDate}</strong>. Plenty of time to make it special.</p>
        ${hasHints ? `<p style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#e08a67;margin:0 0 14px;">What they want</p>${hintsHtml}` : ''}
        <div style="text-align:center;margin-top:24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(160deg,#ff966f,#ff7e54);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">${ctaText}</a>
        </div>
        <p style="font-size:13px;color:#a08070;text-align:center;margin:18px 0 0;">You're receiving this because you added ${contactName} as a contact.</p>
      </div>
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">
          <a href="https://hintdrop.app/settings" style="color:#b09080;">Manage your reminder preferences</a>
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
  const cronSecret = process.env.CRON_SECRET
  console.log('CRON_SECRET set:', !!cronSecret, 'header:', authHeader?.slice(0, 20))
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized', secretSet: !!cronSecret }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date()
  const sent = []
  const errors = []

  try {
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name, birthday, user_id, profile_id')
      .not('birthday', 'is', null)

    if (contactsError) throw contactsError

    for (const contact of contacts || []) {
      try {
        const { data: owner } = await supabase
          .from('profiles')
          .select('id, full_name, email_reminders, default_reminder_days')
          .eq('id', contact.user_id)
          .maybeSingle()

        if (!owner || !owner.email_reminders) continue

        const { data: authUser } = await supabase.auth.admin.getUserById(owner.id)
        const ownerEmail = authUser?.user?.email
        if (!ownerEmail) continue

        const bday = new Date(contact.birthday)
        const thisYear = today.getFullYear()
        let nextBday = new Date(Date.UTC(thisYear, bday.getMonth(), bday.getDate()))
        if (nextBday < today) nextBday = new Date(Date.UTC(thisYear + 1, bday.getMonth(), bday.getDate()))

        const daysUntil = Math.round((nextBday - today) / (1000 * 60 * 60 * 24))
        const reminderDays = owner.default_reminder_days || 7

        if (daysUntil !== reminderDays && daysUntil !== 3 && daysUntil !== 1) continue

        let hints = []
        if (contact.profile_id) {
          const { data: hintsData } = await supabase
            .from('hints')
            .select('id, title, url, image_url, price_text')
            .eq('user_id', contact.profile_id)
            .eq('is_private', false)
            .order('position', { ascending: true })
            .limit(3)
          hints = hintsData || []
        }

        const html = buildReminderEmail({
          recipientName: owner.full_name || '',
          contactName: contact.name,
          eventType: 'Birthday',
          eventDate: formatDate(nextBday.toISOString()),
          daysUntil,
          hints,
        })

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'HintDrop <hello@hintdrop.app>',
            to: ownerEmail,
            subject: `${contact.name}'s birthday is in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} 🎁`,
            html,
          }),
        })

        if (resendRes.ok) {
          sent.push({ contact: contact.name, to: ownerEmail, daysUntil })
        } else {
          const err = await resendRes.json()
          errors.push({ contact: contact.name, error: err })
        }
      } catch (err) {
        errors.push({ contact: contact.name, error: err.message })
      }
    }

    // Generic recurring events
    const genericEvents = [
      { title: 'Christmas', month: 12, day: 25, type: 'Christmas', shopCta: true },
      { title: "Valentine's Day", month: 2, day: 14, type: "Valentine's Day", shopCta: true },
      { title: "Mother's Day", month: 3, day: 30, type: "Mother's Day", shopCta: true },
      { title: "Father's Day", month: 6, day: 21, type: "Father's Day", shopCta: true },
      { title: 'Halloween', month: 10, day: 31, type: 'Halloween', shopCta: true },
    ]

    // Get all users who have email reminders on
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, full_name, email_reminders, default_reminder_days')
      .eq('email_reminders', true)

    for (const event of genericEvents) {
      const thisYear = today.getFullYear()
      let eventDate = new Date(Date.UTC(thisYear, event.month - 1, event.day))
      if (eventDate < today) eventDate = new Date(Date.UTC(thisYear + 1, event.month - 1, event.day))
      const daysUntil = Math.round((eventDate - today) / (1000 * 60 * 60 * 24))

      for (const owner of allUsers || []) {
        const reminderDays = owner.default_reminder_days || 7
        if (daysUntil !== reminderDays && daysUntil !== 14 && daysUntil !== 3) continue

        const { data: authUser } = await supabase.auth.admin.getUserById(owner.id)
        const ownerEmail = authUser?.user?.email
        if (!ownerEmail) continue

        const html = buildReminderEmail({
          recipientName: owner.full_name || '',
          contactName: event.title,
          eventType: event.type,
          eventDate: formatDate(eventDate.toISOString()),
          daysUntil,
          hints: [],
        })

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'HintDrop <hello@hintdrop.app>',
            to: ownerEmail,
            subject: `${event.title} is in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} 🎁`,
            html,
          }),
        })

        if (resendRes.ok) {
          sent.push({ event: event.title, to: ownerEmail, daysUntil })
        } else {
          const err = await resendRes.json()
          errors.push({ event: event.title, error: err })
        }
      }
    }

    return NextResponse.json({ ok: true, sent, errors, total: sent.length })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
