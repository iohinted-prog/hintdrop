import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";

export const alt = "HintDrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Screenshotting a real page (cold Chromium launch + navigation +
// image loads) is slower than either the direct-fetch or Satori
// approaches already tried - needs real headroom, not the default
// function timeout.
export const maxDuration = 30;

// Genuinely different approach from everything tried before: rather
// than this server fetching each retailer image itself (confirmed via
// real Vercel logs to hang/abort regardless of timeout, across
// multiple unrelated retailers - a pattern matching bot-protection
// treating datacenter IPs differently than a real browser), this
// launches an actual headless Chromium, navigates to a dedicated
// minimal page (preview-render), and screenshots what a REAL BROWSER
// rendered - the same mechanism that already makes the "My Hints"
// grid work fine on the site itself, now reused for the OG image.
export default async function Image({ params }) {
  const { boardId } = await params;
  let browser = null;

  try {
    const executablePath = await chromium.executablePath();
    browser = await playwright.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.goto(`https://hintdrop.app/b/${boardId}/preview-render`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    // networkidle alone isn't a reliable signal that every <img> has
    // actually finished rendering (only that network activity quieted
    // down) - explicitly wait until every image on the page reports
    // complete=true via the native browser Image API. A given image
    // can still fail to load (blocked, 404, timeout on the retailer's
    // end) - that's fine, this just waits for the browser to have
    // finished trying on all of them rather than racing the
    // screenshot against images still mid-flight.
    await page.waitForFunction(
      () => Array.from(document.images).every((img) => img.complete),
      { timeout: 15000 }
    ).catch(() => {}); // don't fail the whole screenshot if one image genuinely never resolves
    const screenshot = await page.screenshot({ type: "png" });
    await browser.close();

    return new Response(screenshot, {
      headers: { "Content-Type": "image/png" },
    });
  } catch (err) {
    console.error("board screenshot failed:", err?.name, err?.message || err);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    // Redirect to the static branded fallback rather than trying to
    // build a second image-generation path here - keeps this route's
    // only job as "screenshot or bail cleanly."
    return Response.redirect("https://hintdrop.app/og-default-v2.png", 302);
  }
}
