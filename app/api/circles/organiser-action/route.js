import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const circle_id = searchParams.get("circle_id");
  const token = searchParams.get("token");

  if (!action || !circle_id || !token) {
    return NextResponse.redirect(new URL("/circles?error=invalid_link", request.url));
  }

  const supabase = getSupabaseAdmin();

  // Verify token matches circle organiser
  const { data: circle } = await supabase
    .from("circles")
    .select("id, user_id, status")
    .eq("id", circle_id)
    .maybeSingle();

  if (!circle || circle.user_id !== token) {
    return new Response("This link is no longer valid or has already been used.", { status: 200, headers: { "Content-Type": "text/html" } });
  }

  if (action === "continue") {
    // Mark the circle_notification as acted on
    await supabase.from("circle_notifications")
      .update({ acted_on: true })
      .eq("circle_id", circle_id)
      .eq("type", "invite_declined");
    return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#fffaf7">
      <div style="max-width:400px;margin:0 auto">
        <div style="font-size:48px">🎁</div>
        <h1 style="color:#2d2d2d;margin-top:16px">Circle continues!</h1>
        <p style="color:#666;margin-top:8px">Your circle is still going. Head back to HintDrop to manage it.</p>
        <a href="https://hintdrop.app/circles" style="display:inline-block;margin-top:24px;background:linear-gradient(160deg,#ff966f,#ff7e54);color:white;font-weight:700;padding:14px 32px;border-radius:50px;text-decoration:none;">Go to Circles</a>
      </div>
    </body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });
  }

  if (action === "cancel") {
    await supabase.from("circles").update({ status: "cancelled" }).eq("id", circle_id);
    await supabase.from("circle_notifications").update({ acted_on: true }).eq("circle_id", circle_id);
    return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#fffaf7">
      <div style="max-width:400px;margin:0 auto">
        <div style="font-size:48px">⭕</div>
        <h1 style="color:#2d2d2d;margin-top:16px">Circle cancelled</h1>
        <p style="color:#666;margin-top:8px">The circle has been cancelled. Members will no longer be able to join.</p>
        <a href="https://hintdrop.app/circles" style="display:inline-block;margin-top:24px;background:#fff;border:2px solid #efc0ba;color:#b14f43;font-weight:700;padding:12px 32px;border-radius:50px;text-decoration:none;">Go to Circles</a>
      </div>
    </body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });
  }

  return NextResponse.redirect(new URL("/circles", request.url));
}
