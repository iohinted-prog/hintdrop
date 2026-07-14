import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { invite_id } = await req.json()
    if (!invite_id) return new Response(JSON.stringify({ ok: false, error: 'Missing invite_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Get invite and circle details
    const { data: invite } = await supabase
      .from('circle_invites')
      .select('*, circles(id, title, user_id, total_target_amount, currency, deadline_at)')
      .eq('id', invite_id)
      .maybeSingle()

    if (!invite) return new Response(JSON.stringify({ ok: false, error: 'Invite not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const circle = invite.circles
    if (!circle) return new Response(JSON.stringify({ ok: false, error: 'Circle not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Get organiser email
    const { data: organiserAuth } = await supabase.auth.admin.getUserById(circle.user_id)
    const organiserEmail = organiserAuth?.user?.email
    if (!organiserEmail) return new Response(JSON.stringify({ ok: false, error: 'No organiser email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: organiserProfile } = await supabase.from('profiles').select('full_name').eq('id', circle.user_id).maybeSingle()
    const organiserName = organiserProfile?.full_name || 'there'
    const declinerName = invite.invite_name || invite.invite_email || 'Someone'

    const continueUrl = `https://hintdrop.app/api/circles/organiser-action?action=continue&circle_id=${circle.id}&token=${circle.user_id}`
    const cancelUrl = `https://hintdrop.app/api/circles/organiser-action?action=cancel&circle_id=${circle.id}&token=${circle.user_id}`

    const html = `<!DOCTYPE html>
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
      <div style="background:linear-gradient(135deg,#b14f43,#8a3a30);padding:36px 40px 32px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin:0 0 10px;">Circle update</p>
        <h1 style="font-size:24px;font-weight:700;color:white;line-height:1.2;letter-spacing:-0.04em;margin:0;">${declinerName} declined your circle invite</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:15px;line-height:1.7;color:#5a4a42;margin:0 0 24px;">Hi ${organiserName}, <strong>${declinerName}</strong> has declined their invite to <strong>${circle.title}</strong>. What would you like to do?</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <a href="${continueUrl}" style="display:block;text-align:center;background:linear-gradient(160deg,#ff966f,#ff7e54);color:white;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">Keep the circle going</a>
          <a href="${cancelUrl}" style="display:block;text-align:center;background:white;border:2px solid #efc0ba;color:#b14f43;font-size:15px;font-weight:700;padding:14px 40px;border-radius:50px;text-decoration:none;">Cancel the circle</a>
        </div>
        <p style="font-size:13px;color:#a08070;text-align:center;margin:18px 0 0;">You can also manage this circle directly in HintDrop.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#c0a090;margin-top:24px;">HintDrop · <a href="https://hintdrop.app" style="color:#c0a090;">hintdrop.app</a></p>
  </div>
</div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HintDrop <hello@hintdrop.app>',
        to: organiserEmail,
        subject: `${declinerName} declined your circle invite`,
        html,
      }),
    })

    return new Response(JSON.stringify({ ok: resendRes.ok }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
