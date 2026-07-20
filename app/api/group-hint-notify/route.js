import { sendEmail } from "../../lib/sendEmail";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { type, groupHintId, memberId, responderId, response } = await req.json();

  if (type === "invite") {
    // Get group hint details
    const { data: gh } = await supabase
      .from("group_hints")
      .select("*, hints(title, image_url, numeric_price, currency, retailer, url), profiles!group_hints_organiser_id_fkey(full_name, email:id)")
      .eq("id", groupHintId)
      .maybeSingle();

    if (!gh) return Response.json({ error: "Not found" }, { status: 404 });

    const { data: members } = await supabase
      .from("group_hint_members")
      .select("user_id, profiles(full_name, id)")
      .eq("group_hint_id", groupHintId)
      .eq("status", "invited");

    const hint = gh.hints;
    const organiserName = gh.profiles?.full_name || "Someone";
    const price = hint?.numeric_price > 0
      ? new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)
      : null;

    // Get recipient name
    const { data: recipient } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", gh.recipient_user_id)
      .maybeSingle();
    const recipientName = recipient?.full_name || "someone";

    for (const member of members || []) {
      const { data: userAuth } = await supabase.auth.admin.getUserById(member.user_id);
      const email = userAuth?.user?.email;
      if (!email) continue;

      await sendEmail({
        to: email,
        subject: `${organiserName} wants to chip in on a gift`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#df7b59">Get a group together 🎁</h2>
            <p><strong>${organiserName}</strong> is organising a group gift for <strong>${recipientName}</strong> and wants you to chip in.</p>
            ${hint?.image_url ? `<img src="${hint.image_url}" style="width:100%;border-radius:12px;margin:16px 0" />` : ""}
            <p style="font-size:18px;font-weight:bold;color:#333">${hint?.title || "A gift"}</p>
            ${price ? `<p style="font-size:16px;font-weight:bold;color:#df7b59">${price}</p>` : ""}
            ${hint?.retailer ? `<p style="color:#888">${hint.retailer}</p>` : ""}
            <a href="https://hintdrop.app/feed" style="display:inline-block;margin-top:20px;background:linear-gradient(to bottom,#ff966f,#ff7e54);color:white;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:bold">
              View in HintDrop
            </a>
            <p style="color:#aaa;font-size:12px;margin-top:24px">You can accept or decline in the HintDrop app.</p>
          </div>
        `,
      });
    }
    return Response.json({ ok: true });
  }

  if (type === "response") {
    // Get group hint and organiser email
    const { data: member } = await supabase
      .from("group_hint_members")
      .select("user_id, status, group_hints(organiser_id, hints(title), profiles!group_hints_organiser_id_fkey(full_name))")
      .eq("id", memberId)
      .maybeSingle();

    if (!member) return Response.json({ error: "Not found" }, { status: 404 });

    const { data: responderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", responderId)
      .maybeSingle();
    const responderName = responderProfile?.full_name || "Someone";

    const gh = member.group_hints;
    const { data: organiserAuth } = await supabase.auth.admin.getUserById(gh?.organiser_id);
    const organiserEmail = organiserAuth?.user?.email;

    if (organiserEmail) {
      const accepted = response === "in";
      await sendEmail({
        to: organiserEmail,
        subject: accepted ? `${responderName} is in!` : `${responderName} declined`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:${accepted ? "#4a7a3a" : "#b14f43"}">${accepted ? "🎉 They're in!" : "They declined"}</h2>
            <p><strong>${responderName}</strong> has ${accepted ? "accepted" : "declined"} your group gift invite for <strong>${gh?.hints?.title || "a hint"}</strong>.</p>
            <a href="https://hintdrop.app/feed" style="display:inline-block;margin-top:20px;background:linear-gradient(to bottom,#ff966f,#ff7e54);color:white;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:bold">
              View in HintDrop
            </a>
          </div>
        `,
      });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown type" }, { status: 400 });
}
