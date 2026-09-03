"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import HintImage from "./HintImage";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Finds an existing conversation whose member set exactly matches
// participantIds, or creates a new one if none matches. Matching is
// by exact set regardless of who organised it, so the same group of
// people always ends up in the same thread.
async function findOrCreateGroupConversation(supabase, currentUserId, participantIds) {
  const target = [...new Set(participantIds)].sort();

  const { data: myMemberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", currentUserId);
  const candidateIds = (myMemberships || []).map(m => m.conversation_id);

  if (candidateIds.length) {
    const { data: allMembers } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", candidateIds);

    const byConv = {};
    (allMembers || []).forEach(m => {
      if (!byConv[m.conversation_id]) byConv[m.conversation_id] = [];
      byConv[m.conversation_id].push(m.user_id);
    });

    for (const [convId, memberIds] of Object.entries(byConv)) {
      const sorted = [...new Set(memberIds)].sort();
      if (sorted.length === target.length && sorted.every((v, i) => v === target[i])) {
        return { id: convId, isNew: false };
      }
    }
  }

  const newId = crypto.randomUUID();
  const { error: convErr } = await supabase
    .from("conversations")
    .insert({ id: newId, type: target.length > 2 ? "group" : "direct" });
  if (convErr) throw convErr;

  const { error: memErr } = await supabase
    .from("conversation_members")
    .insert(target.map(uid => ({ conversation_id: newId, user_id: uid })));
  if (memErr) throw memErr;

  return { id: newId, isNew: true };
}

export default function GroupHintModal({ hint, recipientUserId, recipientName, currentUserId, onClose, onSent }) {
  const supabase = createClient();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupHint, setGroupHint] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setSendError("Not logged in"); setSending(false); return; }
      setSendError("");

      // Reuse existing group hint or create new one
      let gh = groupHint;
      if (!gh) {
        const { data: newGh, error: ghErr } = await supabase
          .from("group_hints")
          .insert({ hint_id: hint.id, organiser_id: user.id, recipient_user_id: recipientUserId })
          .select()
          .maybeSingle();
        if (ghErr || !newGh) {
          setSendError("Failed to create group: " + (ghErr?.message || "unknown error"));
          setSending(false);
          return;
        }
        gh = newGh;
      }

      // Insert members
      const { error: memErr } = await supabase
        .from("group_hint_members")
        .insert(selected.map(uid => ({ group_hint_id: gh.id, user_id: uid, status: "invited" })));

      if (memErr) console.error("members error:", memErr?.message);

      // Get organiser name
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      const organiserName = profile?.full_name || "Someone";

      // Reload members (includes previously-existing + newly invited)
      const { data: newMembers } = await supabase
        .from("group_hint_members")
        .select("id, user_id, status, profiles(full_name, avatar_url)")
        .eq("group_hint_id", gh.id);

      // Find or create the conversation for this exact group of people
      // (organiser + every invited member, regardless of who's organising).
      // Recipient of the gift is never part of this conversation.
      const participantIds = [user.id, ...(newMembers || []).map(m => m.user_id)];
      const { id: convId, isNew: isNewConv } = await findOrCreateGroupConversation(supabase, user.id, participantIds);

      // Pin this hint into the conversation
      await supabase.from("conversation_hints").upsert(
        { conversation_id: convId, group_hint_id: gh.id },
        { onConflict: "conversation_id,group_hint_id" }
      );

      // Announce the new invitees in the conversation itself — this is
      // the only place invitees are notified now, replacing the old
      // separate feed notification.
      const newlyInvitedNames = selected
        .map(uid => contacts.find(c => c.profile_id === uid)?.name)
        .filter(Boolean);
      const inviteBody = isNewConv
        ? `${organiserName} started a group gift for ${hint.title || "a hint"} 🎁`
        : newlyInvitedNames.length
          ? `${organiserName} invited ${newlyInvitedNames.join(", ")} to chip in on ${hint.title || "a hint"} 🎁`
          : `${organiserName} wants to chip in on ${hint.title || "a hint"} 🎁`;
      await supabase.from("messages").insert({ conversation_id: convId, sender_id: user.id, body: inviteBody, type: "system" });

      setGroupHint(gh);
      setMembers(newMembers || []);
      const invitedCount = selected.length;
      setSelected([]);
      // Send invite emails (kept as an out-of-band nudge alongside the in-chat invite)
      fetch("/api/group-hint-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invite", groupHintId: gh?.id }),
      }).catch(console.error);
      // Close the modal and let the parent show a proper confirmation,
      // rather than leaving this modal open with just an inline banner.
      onSent && onSent(invitedCount);
      onClose();
    } catch (e) {
      console.error("handleSend error:", e);
    } finally {
      setSending(false);
    }
  }

  const existingMemberIds = members.map(m => m.user_id);
  const availableContacts = contacts.filter(c => !existingMemberIds.includes(c.profile_id));

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-[28px] min-[480px]:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: "88dvh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de] shrink-0">
          <div>
            <p className="text-[16px] font-semibold text-slate-900">Get a group together</p>
            <p className="text-[12px] text-slate-400 mt-0.5 truncate">For {recipientName}</p>
            {members.length > 0 && <p className="text-[11px] text-[#df7b59] mt-0.5">{members.length} person{members.length > 1 ? "s" : ""} invited</p>}
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
                          ? <HintImage src={m.profiles.avatar_url} width={36} height={36} className="rounded-full object-cover" alt="" />
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
                          ? <HintImage src={c.avatar_url} width={36} height={36} className="rounded-full object-cover" alt="" />
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

              {sendError && (
                <div className="rounded-[14px] bg-[#fde8e8] px-4 py-3 text-[13px] font-semibold text-[#b14f43]">{sendError}</div>
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
