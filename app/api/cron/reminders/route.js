import { createClient as createServerClient } from '../../../../lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
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


function buildCircleReminderEmail({ recipientName, circleTitle, daysUntil, organiserName, itemTitle, price, acceptUrl }) {
  const urgency = daysUntil <= 1 ? 'Last chance' : daysUntil <= 3 ? 'Almost time' : 'Coming up'
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
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin:0 0 10px;">${urgency} — ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} left</p>
        <h1 style="font-size:26px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">Don't miss the ${circleTitle} circle</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 6px;">Hi ${recipientName || 'there'},</p>
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 24px;">The <strong style="color:#2d2d2d;">${circleTitle}</strong> circle organised by <strong style="color:#2d2d2d;">${organiserName}</strong> closes in <strong style="color:#2d2d2d;">${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}</strong>. You haven't contributed yet — don't let the group down!</p>
        ${itemTitle ? `
        <div style="background:#f7f2ee;border-radius:18px;border:1px solid #efe0d7;padding:20px 22px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:52px;height:52px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">🎁</div>
            <div>
              <p style="font-size:15px;font-weight:700;color:#2d2d2d;margin:0;">${itemTitle}</p>
              ${price ? `<p style="font-size:14px;font-weight:700;color:#ff8060;margin:4px 0 0;">${price}</p>` : ''}
            </div>
          </div>
        </div>` : ''}
        <div style="text-align:center;">
          <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(160deg,#3d4f3a,#2f3b2d);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">Contribute now</a>
        </div>
        <p style="font-size:13px;color:#a08070;text-align:center;margin:18px 0 0;">The circle closes in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}.</p>
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

function buildOrganizerSummaryEmail({ organiserName, circleTitle, daysUntil, unpaidCount, totalCount, circleUrl }) {
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
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin:0 0 10px;">Circle update</p>
        <h1 style="font-size:26px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">${circleTitle} closes in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 24px;">Hi ${organiserName || 'there'},</p>
        <div style="background:#fff4ee;border-radius:18px;border:1px solid #fde0d0;padding:22px 24px;margin-bottom:28px;">
          <p style="font-size:14px;color:#5a4a42;margin:0;"><strong style="color:#2d2d2d;">${unpaidCount} of ${totalCount}</strong> ${totalCount === 1 ? 'person hasn't' : 'people haven't'} contributed yet. We've sent them a reminder.</p>
        </div>
        <div style="text-align:center;">
          <a href="${circleUrl}" style="display:inline-block;background:linear-gradient(160deg,#3d4f3a,#2f3b2d);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">View circle</a>
        </div>
      </div>
      <div style="border-top:1px solid #f2e5de;padding:22px 40px;background:#fffaf7;">
        <p style="font-size:12px;color:#b09080;text-align:center;line-height:1.6;margin:0;">
          <a href="https://hintdrop.app/settings" style="color:#b09080;">Manage your reminder preferences</a>
        </p>
      </div>
    </div>
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

    // Circle deadline reminders
    const { data: activeCircles } = await supabase
      .from('circles')
      .select('id, title, user_id, deadline_at, item_title, item_target_amount, currency, funding_mode')
      .eq('status', 'active')
      .not('deadline_at', 'is', null)

    for (const circle of activeCircles || []) {
      const deadline = new Date(circle.deadline_at)
      const daysUntil = Math.round((deadline - today) / (1000 * 60 * 60 * 24))
      if (![1, 3, 7].includes(daysUntil)) continue

      const price = circle.item_target_amount
        ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: circle.currency || 'GBP' }).format(circle.item_target_amount)
        : ''

      // Get organiser profile
      const { data: organiser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', circle.user_id)
        .maybeSingle()
      const organiserName = organiser?.full_name || 'the organiser'

      // Find unpaid invites
      const { data: invites } = await supabase
        .from('circle_invites')
        .select('id, invite_email, invite_name, invited_user_id, paid_at, status')
        .eq('circle_id', circle.id)
        .eq('status', 'accepted')
        .is('paid_at', null)

      const unpaidInvites = invites || []

      for (const invite of unpaidInvites) {
        try {
          // Get recipient email
          let recipientEmail = invite.invite_email
          let recipientName = invite.invite_name || ''

          if (invite.invited_user_id) {
            const { data: inviteProfile } = await supabase
              .from('profiles')
              .select('full_name, circle_reminders')
              .eq('id', invite.invited_user_id)
              .maybeSingle()

            if (inviteProfile?.circle_reminders === false) continue
            if (inviteProfile?.full_name) recipientName = inviteProfile.full_name

            const { data: inviteAuth } = await supabase.auth.admin.getUserById(invite.invited_user_id)
            if (inviteAuth?.user?.email) recipientEmail = inviteAuth.user.email
          }

          if (!recipientEmail) continue

          const html = buildCircleReminderEmail({
            recipientName,
            circleTitle: circle.title,
            daysUntil,
            organiserName,
            itemTitle: circle.item_title || '',
            price,
            acceptUrl: `https://hintdrop.app/circles`,
          })

          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'HintDrop <hello@hintdrop.app>',
              to: recipientEmail,
              subject: `Reminder: ${circle.title} circle closes in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`,
              html,
            }),
          })

          if (resendRes.ok) {
            // Update reminder count
            await supabase.from('circle_invites').update({
              reminder_count: (invite.reminder_count || 0) + 1,
              last_reminded_at: new Date().toISOString(),
            }).eq('id', invite.id)
            sent.push({ circle: circle.title, to: recipientEmail, daysUntil })
          } else {
            const err = await resendRes.json()
            errors.push({ circle: circle.title, error: err })
          }
        } catch (err) {
          errors.push({ circle: circle.title, error: err.message })
        }
      }

      // Email organiser summary if there are unpaid members
      if (unpaidInvites.length > 0) {
        try {
          const { data: organiserAuth } = await supabase.auth.admin.getUserById(circle.user_id)
          const organiserEmail = organiserAuth?.user?.email
          const { data: organiserPrefs } = await supabase.from('profiles').select('circle_reminders').eq('id', circle.user_id).maybeSingle()

          if (organiserEmail && organiserPrefs?.circle_reminders !== false) {
            const { data: allInvites } = await supabase.from('circle_invites').select('id').eq('circle_id', circle.id).eq('status', 'accepted')
            const html = buildOrganizerSummaryEmail({
              organiserName,
              circleTitle: circle.title,
              daysUntil,
              unpaidCount: unpaidInvites.length,
              totalCount: allInvites?.length || unpaidInvites.length,
              circleUrl: 'https://hintdrop.app/circles',
            })

            const resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'HintDrop <hello@hintdrop.app>',
                to: organiserEmail,
                subject: `${unpaidInvites.length} ${unpaidInvites.length === 1 ? 'person hasn\'t' : 'people haven\'t'} contributed to ${circle.title} yet`,
                html,
              }),
            })

            if (resendRes.ok) sent.push({ circle: circle.title, organiser: true, to: organiserEmail })
          }
        } catch (err) {
          errors.push({ circle: circle.title, organiser: true, error: err.message })
        }
      }
    }

    return NextResponse.json({ ok: true, sent, errors, total: sent.length })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
