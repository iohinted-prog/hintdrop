"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function GroupHintModal({ hint, recipientUserId, recipientName, currentUserId, onClose }) {
  const supabase = createClient();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupHint, setGroupHint] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: contactsData } = await supabase
        .from("contact_public_state")
        .select("*")
        .eq("owner_user_id", currentUserId);
      setContacts((contactsData || []).filter(c => c.profile_id && c.profile_id !== recipientUserId));

      const { data: existing } = await supabase
        .from("group_hints")
        .select("*, group_hint_members(id, user_id, status, profiles(full_name, avatar_url))")
        .eq("hint_id", hint.id)
        .eq("organiser_id", currentUserId)
        .maybeSingle();

      if (existing) {
        setGroupHint(existing);
        setMembers(existing.group_hint_members || []);
      }
      setLoading(false);
    }
    load();
  }, [hint.id, currentUserId]);

  function toggleContact(profileId) {
    setSelected(prev => prev.includes(profileId)
      ? prev.filter(id => id !== profileId)
      : [...prev, profileId]);
  }

  async function handleSend() {
    if (!selected.length) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    const organiserId = user?.id;
    if (!organiserId) { setSending(false); return; }

    let ghId = groupHint?.id;
    if (!ghId) {
      const { data: gh, error: ghError } = await supabase.from("group_hints").insert({
        hint_id: hint.id,
        organiser_id: organiserId,
        recipient_user_id: recipientUserId,
      }).select().maybeSingle();
      if (ghError) { console.error("group_hints insert error:", ghError.message); setSending(false); return; }
      ghId = gh?.id;
      setGroupHint(gh);
    }

    // Get organiser name for notification
    const { data: organiserProfile } = await supabase
      .from("profiles").select("full_name").eq("id", currentUserId).maybeSingle();
    const organiserName = organiserProfile?.full_name || "Someone";

    await supabase.from("group_hint_members").insert(
      selected.map(userId => ({ group_hint_id: ghId, user_id: userId, status: "invited" }))
    );

    // Send feed notification to each invited contact
    for (const userId of selected) {
      await supabase.from("feed_items").insert({
        owner_user_id: userId,
        actor_user_id: currentUserId,
        family: "group",
        item_type: "group_hint_invite",
        headline: "wants to get a group gift together",
        body: hint.title || "a hint",
        cta_label: "I'm in",
        cta_href: "/feed",
        visibility: "private",
        occurred_at: new Date().toISOString(),
        metadata: {
          actor_name: organiserName,
          actor_avatar_url: null,
          hint_id: hint.id,
          hint_title: hint.title,
          hint_image: hint.image_url || "",
          hint_retailer: hint.retailer || "",
          recipient_name: recipientName,
          group_hint_id: ghId,
          hide_from_user_id: recipientUserId,
          social_enabled: false,
        },
      });
    }

    const { data: newMembers } = await supabase
      .from("group_hint_members")
      .select("id, user_id, status, profiles(full_name, avatar_url)")
      .eq("group_hint_id", ghId);
    setMembers(newMembers || []);
    setSelected([]);
    setSending(false);
    setDone(true);
  }

  const existingMemberIds = members.map(m => m.user_id);
  const availableContacts = contacts.filter(c => !existingMemberIds.includes(c.profile_id));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-[28px] sm:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: "88dvh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de] shrink-0">
          <div>
            <p className="text-[16px] font-semibold text-slate-900">Get a group together</p>
            <p className="text-[12px] text-slate-400 mt-0.5 truncate">{hint.title} → {recipientName}</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {loading ? (
            <div className="text-center text-sm text-slate-400 py-8">Loading...</div>
          ) : (
            <>
              {members.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Already invited</p>
                  <div className="space-y-2">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-1">
                        {m.profiles?.avatar_url
                          ? <img src={m.profiles.avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
                          : <div className="h-9 w-9 rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[11px] font-bold text-white">{getInitials(m.profiles?.full_name)}</div>
                        }
                        <p className="text-[13px] font-semibold text-slate-900 flex-1">{m.profiles?.full_name}</p>
                        <span className={"text-[11px] font-semibold rounded-full px-2.5 py-0.5 " + (m.status === "in" ? "bg-[#edf6eb] text-[#4a7a3a]" : "bg-[#fff4ee] text-[#df7b59]")}>
                          {m.status === "in" ? "✓ In" : "Invited"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableContacts.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Invite to chip in</p>
                  <div className="space-y-2">
                    {availableContacts.map(c => (
                      <div key={c.profile_id} className="flex items-center gap-3 py-1 cursor-pointer" onClick={() => toggleContact(c.profile_id)}>
                        {c.avatar_url
                          ? <img src={c.avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
                          : <div className="h-9 w-9 rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[11px] font-bold text-white">{getInitials(c.name)}</div>
                        }
                        <p className="text-[13px] font-semibold text-slate-900 flex-1">{c.name}</p>
                        <div className={"h-5 w-5 rounded-full border-2 flex items-center justify-center transition " + (selected.includes(c.profile_id) ? "border-[#ff875d] bg-[#ff875d]" : "border-slate-300")}>
                          {selected.includes(c.profile_id) && <span className="text-white text-[10px]">✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableContacts.length === 0 && members.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-8">No contacts to invite yet.</div>
              )}

              {done && (
                <div className="rounded-[14px] bg-[#edf6eb] px-4 py-3 text-[13px] font-semibold text-[#4a7a3a]">
                  ✓ Invites sent — they'll see it in their feed
                </div>
              )}
            </>
          )}
        </div>

        {selected.length > 0 && (
          <div className="px-4 pb-5 pt-2 border-t border-[#f2e5de] shrink-0">
            <button type="button" disabled={sending} onClick={handleSend}
              className="w-full h-11 flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-lg">
              {sending ? "Sending..." : `Invite ${selected.length} contact${selected.length > 1 ? "s" : ""} to chip in`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
