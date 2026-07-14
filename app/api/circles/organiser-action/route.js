import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const circleId = searchParams.get('circle_id')
  const token = searchParams.get('token')

  if (!action || !circleId || !token) {
    return new Response('<h1>Invalid link</h1>', { status: 400, headers: { 'Content-Type': 'text/html' } })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Verify the token matches the circle organiser
  const { data: circle } = await supabase
    .from('circles')
    .select('id, title, user_id')
    .eq('id', circleId)
    .eq('user_id', token)
    .maybeSingle()

  if (!circle) {
    return new Response('<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#fffaf7"><div style="max-width:480px;margin:80px auto;font-family:sans-serif"><h2 style="color:#b14f43">Invalid or expired link</h2><p style="color:#5a4a42">This link is no longer valid.</p><a href="https://hintdrop.app/circles" style="display:inline-block;margin-top:20px;background:#ff7e54;color:white;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700">Go to HintDrop</a></div></body></html>', { status: 403, headers: { 'Content-Type': 'text/html' } })
  }

  // Check if already acted on via bell
  const { data: notif } = await supabase
    .from('circle_notifications')
    .select('acted_on')
    .eq('circle_id', circleId)
    .eq('organiser_id', token)
    .eq('type', 'invite_declined')
    .eq('acted_on', true)
    .maybeSingle()

  if (notif) {
    return new Response('<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#fffaf7"><div style="max-width:480px;margin:80px auto"><h2 style="color:#4e684d">Already handled</h2><p style="color:#5a4a42">You already responded to this notification in HintDrop.</p><a href="https://hintdrop.app/circles" style="display:inline-block;margin-top:20px;background:#ff7e54;color:white;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700">Go to HintDrop</a></div></body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  if (action === 'cancel') {
    await supabase.from('circles').update({ status: 'cancelled' }).eq('id', circleId)
    return new Response(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#fff7f2"><div style="max-width:480px;margin:0 auto"><h2 style="color:#b14f43">Circle cancelled</h2><p style="color:#5a4a42">${circle.title} has been cancelled. All members will be notified.</p><a href="https://hintdrop.app/circles" style="display:inline-block;margin-top:20px;background:#ff7e54;color:white;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700">Back to HintDrop</a></div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  if (action === 'continue') {
    return new Response(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#f7fbf5"><div style="max-width:480px;margin:0 auto"><h2 style="color:#4a7a3a">Circle is continuing</h2><p style="color:#5a4a42">${circle.title} is still active. You can invite more people from HintDrop.</p><a href="https://hintdrop.app/circles" style="display:inline-block;margin-top:20px;background:#ff7e54;color:white;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700">Back to HintDrop</a></div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  return new Response('<h1>Unknown action</h1>', { status: 400, headers: { 'Content-Type': 'text/html' } })
}
