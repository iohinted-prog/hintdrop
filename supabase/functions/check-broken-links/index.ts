import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Checks whether stored outbound/affiliate URLs on hints and
// shop_products are still actually live - built specifically because
// a stale product *image* was being mistaken for a smaller problem
// than it might be: the real business risk is a dead *affiliate*
// link, which loses real revenue silently, not just a missing photo.
// Runs daily via pg_cron, checking a rotating batch rather than the
// whole catalog every time (925 URLs combined at time of writing -
// checking all of them every run in one edge function invocation
// isn't a good idea, both for the function's own time budget and for
// not hammering a few hundred different retailer sites with a big
// burst of traffic at once). Oldest-checked-first means the full
// catalog cycles through roughly every 12 days at this batch size.
//
// A single HEAD request is used first (cheap, no body download) - if
// that comes back anything other than success, only THEN is it
// retried with a real GET before being marked broken, since some
// servers implement HEAD poorly or block it outright even when the
// real page loads fine via GET. This costs an extra request only for
// the minority of URLs that fail the cheap check, not every URL.
const BATCH_SIZE_PER_TABLE = 40
const REQUEST_TIMEOUT_MS = 8000
const CONCURRENCY = 12
// Major retailers commonly run bot-detection (Cloudflare, Akamai,
// PerimeterX) that blocks plain server-to-server requests with no
// browser fingerprint at all, regardless of whether the actual page
// works fine for a real visitor - confirmed directly: the first test
// run flagged Harrods, Free People, H&M, and Fender links as
// "broken", all major retailers, all with long Google Ads tracking
// parameters in the URL, which reads much more like a bot check than
// five simultaneously dead product pages. A real browser User-Agent
// won't defeat sophisticated bot detection, but it clears the
// simplest, most common tier of it and meaningfully cuts down false
// positives from the previous run's plain fetch with no headers.
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

async function checkUrl(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, headers: FETCH_HEADERS })
    clearTimeout(timeout)
    if (res.ok) return 'ok'
  } catch {
    clearTimeout(timeout)
  }
  // HEAD failed or wasn't OK - confirm with a real GET before
  // concluding it's actually broken, not just a HEAD quirk.
  const controller2 = new AbortController()
  const timeout2 = setTimeout(() => controller2.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res2 = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller2.signal, headers: FETCH_HEADERS })
    clearTimeout(timeout2)
    return res2.ok ? 'ok' : 'broken'
  } catch {
    clearTimeout(timeout2)
    // A timeout/network error isn't necessarily "broken" - could be a
    // transient blip on the retailer's end. Left as 'unknown' rather
    // than flagged, so it's simply re-checked next run instead of
    // reported as a false alarm.
    return 'unknown'
  }
}

async function checkBatch(rows, urlField) {
  const results = []
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const slice = rows.slice(i, i + CONCURRENCY)
    const statuses = await Promise.all(slice.map((row) => checkUrl(row[urlField])))
    slice.forEach((row, j) => results.push({ id: row.id, title: row.title, url: row[urlField], status: statuses[j] }))
  }
  return results
}

function buildReportEmail(brokenHints, brokenProducts) {
  const row = (label, items) => items.length
    ? `<p style="font-size:13px;font-weight:700;color:#2d2d2d;margin:20px 0 8px;">${label} (${items.length})</p>` +
      items.map((it) => `<div style="padding:10px 0;border-bottom:1px solid #f2e5de;"><a href="${it.url}" style="color:#df7b59;font-size:13px;font-weight:600;text-decoration:none;">${it.title || 'Untitled'}</a><div style="font-size:11px;color:#a08070;word-break:break-all;">${it.url}</div></div>`).join('')
    : ''
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:#f5ede8;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:28px;">
      <img src="https://hintdrop.app/illustrations/logo-coral-full.png" alt="HintDrop" height="64" style="display:inline-block;height:64px;width:auto" />
    </div>
    <div style="background:#fffaf7;border-radius:28px;border:1px solid #efdcd2;box-shadow:0 20px 60px rgba(88,46,31,0.12);overflow:hidden;padding:32px 36px;">
      <p style="font-size:18px;font-weight:700;color:#2d2d2d;margin:0 0 8px;">Broken link report</p>
      <p style="font-size:13px;color:#a08070;margin:0 0 8px;">${brokenHints.length + brokenProducts.length} link${brokenHints.length + brokenProducts.length === 1 ? '' : 's'} confirmed broken (checked via HEAD, then a real GET before being flagged - not a false alarm from a slow response).</p>
      <p style="font-size:12px;color:#c0a090;margin:0 0 8px;">Worth a quick manual check before removing anything - large retailers sometimes block automated requests outright even when the page works fine for a real visitor, which can look identical to a genuinely dead link here.</p>
      ${row('Hints', brokenHints)}
      ${row('Shop products', brokenProducts)}
    </div>
  </div>
</div>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: hintRows } = await supabase
      .from('hints')
      .select('id, title, url')
      .not('url', 'is', null)
      .neq('url', '')
      .order('url_checked_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE_PER_TABLE)

    const { data: productRows } = await supabase
      .from('shop_products')
      .select('id, title, product_url, affiliate_url')
      .eq('is_active', true)
      .order('url_checked_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE_PER_TABLE)

    const productRowsWithUrl = (productRows || [])
      .map((r) => ({ ...r, url: r.affiliate_url || r.product_url }))
      .filter((r) => r.url)

    const hintResults = await checkBatch(hintRows || [], 'url')
    const productResults = await checkBatch(productRowsWithUrl, 'url')

    const now = new Date().toISOString()
    await Promise.all(
      hintResults.map((r) =>
        supabase.from('hints').update({ url_status: r.status, url_checked_at: now }).eq('id', r.id)
      )
    )
    await Promise.all(
      productResults.map((r) =>
        supabase.from('shop_products').update({ url_status: r.status, url_checked_at: now }).eq('id', r.id)
      )
    )

    const brokenHints = hintResults.filter((r) => r.status === 'broken')
    const brokenProducts = productResults.filter((r) => r.status === 'broken')

    if (brokenHints.length || brokenProducts.length) {
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'HintDrop <notifications@hintdrop.app>',
            to: ['hello@hintdrop.app'],
            subject: `${brokenHints.length + brokenProducts.length} broken link${brokenHints.length + brokenProducts.length === 1 ? '' : 's'} found`,
            html: buildReportEmail(brokenHints, brokenProducts),
          }),
        }).catch(console.error)
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        checked: hintResults.length + productResults.length,
        broken: brokenHints.length + brokenProducts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('check-broken-links error:', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
