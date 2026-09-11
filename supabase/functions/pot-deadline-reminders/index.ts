// Daily cron (see the pot-deadline-reminders-daily pg_cron job, same
// pattern as birthday-reminders-daily) - sends 10/7/3-day-out reminders
// to anyone in a pot who hasn't committed yet, and a final wrap-up
// email on the deadline day itself to everyone who was in the pot
// (organiser included), worded as a success or a shortfall depending
// on whether the target was actually reached. The recipient of the
// gift is never a target of any of this - only group_hints.organiser_id
// and group_hint_members rows, never recipient_user_id.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LOGO_URL = "https://hintdrop.app/illustrations/logo-full-wordmark.png"

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(amount)
}

function wrapHtml(headline: string, bodyHtml: string, color: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:#f5ede8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:28px;">
      <img src="${LOGO_URL}" alt="HintDrop" height="40" style="display:inline-block;height:40px;width:auto;" />
    </div>
    <div style="background:#fffaf7;border-radius:28px;border:1px solid #efdcd2;box-shadow:0 20px 60px rgba(88,46,31,0.12);overflow:hidden;">
      <div style="background:linear-gradient(135deg,${color === "coral" ? "#ff966f,#ff7e54" : color === "green" ? "#8fc98f,#5fae5f" : "#c9633f,#a34f35"});padding:36px 40px 32px;">
        <h1 style="margin:0;color:white;font-size:22px;font-weight:700;">${headline}</h1>
      </div>
      <div style="padding:32px 40px 36px;color:#3f2f28;font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </div>
    </div>
  </div>
</div>
</body>
</html>`
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const results = { reminders: 0, finals: 0, errors: [] as string[] }
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: pots } = await supabase
    .from('group_hints')
    .select('id, organiser_id, target_amount, deadline_date, title, hints(title, currency), group_hint_members(id, user_id, status, pledged_amount)')
    .not('deadline_date', 'is', null)

  for (const pot of pots || []) {
    const deadline = new Date(pot.deadline_date + 'T00:00:00')
    const daysUntil = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const members = pot.group_hint_members || []
    const currency = pot.hints?.currency || 'GBP'
    const title = pot.title || pot.hints?.title || 'a group gift'
    const target = pot.target_amount

    if (daysUntil === 10 || daysUntil === 7 || daysUntil === 3) {
      const notYetCommitted = members.filter((m: any) => m.status === 'invited' || m.status === 'joined')
      for (const member of notYetCommitted) {
        try {
          const { data: auth } = await supabase.auth.admin.getUserById(member.user_id)
          const email = auth?.user?.email
          if (!email) continue
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', member.user_id).maybeSingle()
          const name = profile?.full_name?.split(' ')[0] || 'there'

          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'HintDrop <hello@hintdrop.app>',
              to: email,
              subject: `${daysUntil} day${daysUntil === 1 ? '' : 's'} left to chip in on "${title}"`,
              html: wrapHtml(
                `${daysUntil} days to go`,
                `<p>Hi ${name},</p><p>There ${daysUntil === 1 ? 'is' : 'are'} <strong>${daysUntil} day${daysUntil === 1 ? '' : 's'}</strong> left to pledge toward <strong>${title}</strong>${target ? ` (target: ${fmt(target, currency)})` : ''}. No pressure either way - just a nudge in case you meant to.</p><a href="https://hintdrop.app/pot/${pot.id}" style="display:inline-block;margin-top:16px;background:linear-gradient(to bottom,#ff966f,#ff7e54);color:white;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:bold">View the pot</a>`,
                'coral'
              ),
            }),
          })
          if (!emailRes.ok) results.errors.push(`Reminder failed for ${email}`)
          else results.reminders++
        } catch (e) {
          results.errors.push(`Reminder error: ${e}`)
        }
      }
    }

    if (daysUntil === 0) {
      const inMembers = members.filter((m: any) => m.status === 'in')
      const share = target ? target / (1 + members.filter((m: any) => m.status !== 'declined' && m.status !== 'requested').length) : 0
      const raised = inMembers.reduce((sum: number, m: any) => sum + (m.pledged_amount != null ? Number(m.pledged_amount) : share), 0)
      const success = target ? raised >= target : true
      const recipients = new Set<string>([pot.organiser_id, ...inMembers.map((m: any) => m.user_id)])

      for (const userId of recipients) {
        try {
          const { data: auth } = await supabase.auth.admin.getUserById(userId)
          const email = auth?.user?.email
          if (!email) continue
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle()
          const name = profile?.full_name?.split(' ')[0] || 'there'

          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'HintDrop <hello@hintdrop.app>',
              to: email,
              subject: success ? `🎉 "${title}" is fully funded!` : `"${title}" - we're still short`,
              html: wrapHtml(
                success ? "You did it! 🎉" : "We're still short",
                success
                  ? `<p>Hi ${name},</p><p>The pot for <strong>${title}</strong> hit its target of ${fmt(target, currency)} - nice work. Time to go get the gift!</p>`
                  : `<p>Hi ${name},</p><p>Today's the deadline for <strong>${title}</strong>, and the pot is at ${fmt(raised, currency)} of ${target ? fmt(target, currency) : 'its target'}. If you're the organiser, you'll likely need to cover the rest - worth a quick nudge to anyone who hasn't paid yet.</p>`,
                success ? 'green' : 'rust'
              ),
            }),
          })
          if (!emailRes.ok) results.errors.push(`Final email failed for ${email}`)
          else results.finals++
        } catch (e) {
          results.errors.push(`Final email error: ${e}`)
        }
      }
    }
  }

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } })
})
