import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOGO = `<table cellpadding="0" cellspacing="0" style="display:inline-table;"><tr><td style="width:44px;height:44px;background:linear-gradient(160deg,#ffb899,#ff8f6b);border-radius:14px;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">🎁</td></tr></table>`

function birthdayEmailHtml(ownerName: string, recipientName: string, daysUntil: number, hints: any[], birthdayDate: string) {
  const dayLabel = daysUntil === 10 ? 'in 10 days' : 'in 3 days'
  const monthDay = new Date(birthdayDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const hintsHtml = hints.length ? `
    <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 16px;">Here's what they'd love:</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
      ${hints.slice(0, 4).map(h => `
        <a href="${h.url || 'https://hintdrop.app'}" style="text-decoration:none;display:block;border-radius:16px;overflow:hidden;border:1px solid #f0dfd6;">
          ${h.image_url ? `<img src="${h.image_url}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;" alt="${h.title}" />` : `<div style="width:100%;aspect-ratio:1;background:linear-gradient(135deg,#ead8ca,#c4a17f);display:flex;align-items:center;justify-content:center;font-size:32px;">🎁</div>`}
          <div style="padding:8px 10px;background:white;">
            <p style="font-size:12px;font-weight:600;color:#1e293b;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.title || 'Hint'}</p>
            ${h.retailer ? `<p style="font-size:11px;color:#94a3b8;margin:2px 0 0;">${h.retailer}</p>` : ''}
          </div>
        </a>
      `).join('')}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:#f5ede8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        ${LOGO}
        <span style="font-size:22px;font-weight:800;color:#2d2d2d;letter-spacing:-0.5px;">Hint<span style="color:#ff8060;">Drop</span></span>
      </div>
    </div>
    <div style="background:#fffaf7;border-radius:28px;border:1px solid #efdcd2;box-shadow:0 20px 60px rgba(88,46,31,0.12);overflow:hidden;">
      <div style="background:linear-gradient(135deg,#ff966f,#ff7e54);padding:36px 40px 32px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin:0 0 10px;">Birthday reminder</p>
        <h1 style="font-size:24px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">🎂 ${ownerName}'s birthday is ${dayLabel}</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 20px;">Hi ${recipientName}, just a heads up — <strong>${ownerName}</strong>'s birthday is on <strong>${monthDay}</strong>. Plenty of time to get something they'll love.</p>
        ${hintsHtml}
        <a href="https://hintdrop.app/feed" style="display:block;text-align:center;background:linear-gradient(160deg,#ff966f,#ff7e54);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">See their hints on HintDrop</a>
        <p style="font-size:13px;color:#a08070;text-align:center;margin:18px 0 0;">You're receiving this because ${ownerName} is in your HintDrop contacts.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
  </div>
</div>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const today = new Date()
    const results = { sent: 0, errors: [] as string[] }

    // Get all profiles with birthdays
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, birthday')
      .not('birthday', 'is', null)

    if (!profiles?.length) return new Response(JSON.stringify({ ok: true, ...results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    for (const profile of profiles) {
      if (!profile.birthday) continue

      // Calculate days until next birthday (date-only, no timezone drift)
      const bday = new Date(profile.birthday + 'T00:00:00')
      const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
      const nextBday = new Date(Date.UTC(todayDate.getUTCFullYear(), bday.getMonth(), bday.getDate()))
      if (nextBday <= todayDate) nextBday.setUTCFullYear(todayDate.getUTCFullYear() + 1)
      const daysUntil = Math.round((nextBday.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntil !== 10 && daysUntil !== 3) continue

      // Get all contacts who have this person in their contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('user_id, name')
        .eq('profile_id', profile.id)

      if (!contacts?.length) continue

      // Get birthday person's public hints
      const { data: hints } = await supabase
        .from('hints')
        .select('id, title, image_url, retailer, url')
        .eq('user_id', profile.id)
        .eq('is_private', false)
        .order('starred', { ascending: false })
        .limit(4)

      const ownerName = profile.full_name || 'Your contact'

      for (const contact of contacts) {
        try {
          // Get recipient email
          const { data: recipientAuth } = await supabase.auth.admin.getUserById(contact.user_id)
          const recipientEmail = recipientAuth?.user?.email
          if (!recipientEmail) continue

          const { data: recipientProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', contact.user_id)
            .maybeSingle()
          const recipientName = recipientProfile?.full_name || 'there'

          // Send email
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'HintDrop <hello@hintdrop.app>',
              to: recipientEmail,
              subject: `🎂 ${ownerName}'s birthday is ${daysUntil === 10 ? 'in 10 days' : 'in 3 days'}`,
              html: birthdayEmailHtml(ownerName, recipientName, daysUntil, hints || [], profile.birthday),
            }),
          })
          if (!emailRes.ok) results.errors.push(`Email failed for ${recipientEmail}`)

          // Insert feed item (hidden from birthday person)
          await supabase.from('feed_items').insert({
            owner_user_id: contact.user_id,
            actor_user_id: profile.id,
            family: 'reminder',
            item_type: 'event_reminder',
            headline: `${ownerName}'s birthday is ${daysUntil === 10 ? 'in 10 days' : 'in 3 days'} 🎂`,
            body: `${new Date(profile.birthday + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`,
            cta_label: 'See hints',
            cta_href: `/profile/${profile.id}`,
            visibility: 'private',
            occurred_at: new Date().toISOString(),
            metadata: {
              actor_name: ownerName,
              hide_from_user_id: profile.id,
              days_until: daysUntil,
              preview_hints: (hints || []).slice(0, 2).map(h => ({ id: h.id, title: h.title, image_url: h.image_url || '', retailer: h.retailer || '' })),
              hint_count: hints?.length || 0,
              social_enabled: false,
            },
          })

          // Bell notification
          await supabase.from('notifications').insert({
            user_id: contact.user_id,
            actor_user_id: profile.id,
            type: 'birthday_reminder',
            entity_id: profile.id,
            title: `🎂 ${ownerName}'s birthday is ${daysUntil === 10 ? 'in 10 days' : 'in 3 days'}`,
            body: new Date(profile.birthday + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
            data: { profile_id: profile.id, days_until: daysUntil, owner_name: ownerName },
          })

          results.sent++
        } catch (e) {
          results.errors.push(`Error for contact ${contact.user_id}: ${e}`)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
