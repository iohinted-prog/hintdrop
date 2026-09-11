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
  // Only asked when the hint has no price - the pot's target otherwise
  // comes straight from the hint itself, no separate step needed.
  const [manualTargetAmount, setManualTargetAmount] = useState("");
  // Organiser has to explicitly decide to start a pot (vs just cancelling
  // out of this modal) before anything else - not something that happens
  // silently just because they opened this modal.
  const [potConfirmed, setPotConfirmed] = useState(false);
  const [chatOnly, setChatOnly] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [recipientEvents, setRecipientEvents] = useState([]);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [wantsClaim, setWantsClaim] = useState(true);

  const hintHasPrice = hint.numeric_price > 0;

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
        setDeadlineDate(existing.deadline_date || "");
      }

      // Only the recipient's own shared events are readable here (RLS
      // gates on is_shared=true) - private ones are never visible to an
      // organiser, deliberately. A handful of quick-pick suggestions,
      // not a full calendar browse.
      const today = new Date().toISOString().slice(0, 10);
      const { data: events } = await supabase
        .from("calendar_events")
        .select("id, title, event_date")
        .eq("user_id", recipientUserId)
        .eq("is_shared", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(3);
      setRecipientEvents(events || []);

      const { data: claims } = await supabase
        .from("hint_claims")
        .select("id")
        .eq("hint_id", hint.id)
        .eq("claimed_by", currentUserId);
      setAlreadyClaimed((claims || []).length > 0);

      setLoading(false);
    }
    load();
  }, [hint.id, currentUserId, recipientUserId]);

  function toggleContact(profileId) {
    setSelected(prev => prev.includes(profileId)
      ? prev.filter(id => id !== profileId)
      : [...prev, profileId]);
  }

  async function handleSend() {
    if (!selected.length) return;
    if (!chatOnly && !groupHint && !hintHasPrice && !(Number(manualTargetAmount) > 0)) {
      setSendError("Enter a target amount for the pot first - this hint has no price to split automatically.");
      return;
    }
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
          .insert({
            hint_id: hint.id,
            organiser_id: user.id,
            recipient_user_id: recipientUserId,
            // A plain conversation carries no money tracking at all - no
            // target, no deadline, regardless of whether the hint itself
            // has a price.
            target_amount: chatOnly ? null : (hintHasPrice ? hint.numeric_price : Number(manualTargetAmount)),
            deadline_date: chatOnly ? null : (deadlineDate || null),
          })
          .select()
          .maybeSingle();
        if (ghErr || !newGh) {
          setSendError("Failed to create group: " + (ghErr?.message || "unknown error"));
          setSending(false);
          return;
        }
        gh = newGh;

        // The organiser is a real member of their own pot too - not a
        // special-cased non-member who merely "covers the rest". They
        // start "in" immediately (no accept step needed, they created
        // it) so the exact same contribute/tick/progress machinery
        // every other member uses just works for them as well.
        await supabase.from("group_hint_members").insert({ group_hint_id: gh.id, user_id: user.id, status: "in" });
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
      const inviteBody = chatOnly
        ? `${organiserName} started a conversation about ${hint.title || "a hint"} 🎁`
        : isNewConv
          ? `${organiserName} started a group gift for ${hint.title || "a hint"} 🎁`
          : newlyInvitedNames.length
            ? `${organiserName} invited ${newlyInvitedNames.join(", ")} to chip in on ${hint.title || "a hint"} 🎁`
            : `${organiserName} wants to chip in on ${hint.title || "a hint"} 🎁`;
      await supabase.from("messages").insert({ conversation_id: convId, sender_id: user.id, body: inviteBody, type: "system" });

      // Marking "I'm getting this" is a request, not silent - the
      // checkbox defaults on, but nothing happens here if the organiser
      // unchecked it or had already claimed it some other way.
      if (wantsClaim && !alreadyClaimed) {
        await supabase.from("hint_claims").insert({ hint_id: hint.id, claimed_by: user.id, claim_type: "group" });
      }

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
          ) : !groupHint && !potConfirmed && !chatOnly ? (
            <div className="py-4 text-center">
              <p className="text-[15px] font-semibold text-slate-900 mb-1.5">Get a group together for this gift?</p>
              <p className="text-[13px] text-slate-500 mb-6">
                Start a pot to track contributions toward {hint.title || "this hint"} for {recipientName}, or start a chat about it with no money tracking at all.
              </p>
              <div className="flex flex-col gap-2 items-stretch">
                <button type="button" onClick={() => setPotConfirmed(true)}
                  className="h-11 px-6 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-md">
                  Start a pot
                </button>
                <button type="button" onClick={() => setChatOnly(true)}
                  className="h-11 px-6 rounded-full border border-[#ead8ce] text-[13px] font-semibold text-slate-700">
                  Start a chat
                </button>
                <button type="button" onClick={onClose}
                  className="h-9 text-[12px] font-semibold text-slate-400">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {!groupHint && !chatOnly && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Deadline (optional)</p>
                  {recipientEvents.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {recipientEvents.map(ev => (
                        <button key={ev.id} type="button" onClick={() => setDeadlineDate(ev.event_date)}
                          className={"text-[12px] font-semibold px-3 py-1.5 rounded-full border " + (deadlineDate === ev.event_date ? "border-[#ff875d] bg-[#fff1ea] text-[#df7b59]" : "border-[#ead8ce] text-slate-500")}>
                          {ev.title} · {new Date(ev.event_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full h-11 rounded-full border border-[#ead8ce] px-4 text-sm text-slate-700 outline-none focus:border-[#ff875d]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Leave blank if there's no deadline - reminder emails only go out when there's a date to count down to.</p>
                </div>
              )}
              {!alreadyClaimed && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={wantsClaim} onChange={(e) => setWantsClaim(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#ff875d]" />
                  <span className="text-[12px] text-slate-500">
                    Mark <span className="font-semibold text-slate-700">"I'm getting this"</span> so it's clear to anyone else browsing {recipientName}'s hints that this one's already covered.
                  </span>
                </label>
              )}
              {!groupHint && !chatOnly && !hintHasPrice && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Pot target</p>
                  <p className="text-[12px] text-slate-400 mb-2">This hint has no price, so set what you're aiming to raise together.</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">£</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={manualTargetAmount}
                      onChange={(e) => setManualTargetAmount(e.target.value)}
                      placeholder="0"
                      className="w-full h-11 rounded-full border border-[#ead8ce] pl-8 pr-4 text-sm text-slate-700 outline-none focus:border-[#ff875d]"
                    />
                  </div>
                </div>
              )}
              {!chatOnly && (hintHasPrice || groupHint) && selected.length > 0 && (() => {
                const target = groupHint?.target_amount || hint.numeric_price;
                const totalPeople = 1 + members.length + selected.length; // organiser + already-invited + newly selected
                const share = target / totalPeople;
                return (
                  <p className="text-[12px] text-slate-500 -mt-1">
                    An even split across {totalPeople} people works out to about{" "}
                    <span className="font-semibold text-slate-700">
                      {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(share)}
                    </span>{" "}
                    each.
                  </p>
                );
              })()}
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
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{chatOnly ? "Invite to chat" : "Invite to chip in"}</p>
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
              {sending ? "Sending..." : `Invite ${selected.length} contact${selected.length > 1 ? "s" : ""} to ${chatOnly ? "chat" : "chip in"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
