"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import Link from "next/link";
import HintImage from "./HintImage";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ profile, size = "h-7 w-7" }) {
  return (
    <div className={`relative ${size} rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden`}>
      {profile?.avatar_url
        ? <HintImage src={profile.avatar_url} fill className="object-cover" sizes="40px" alt="" fallbackClassName="hidden" />
        : getInitials(profile?.full_name)}
    </div>
  );
}

export default function GroupChatWindow({ conversation, currentUserId, onClose, offsetIndex = 0, isTopmost = true }) {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [pinnedHints, setPinnedHints] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [pledgingId, setPledgingId] = useState(null);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const members = conversation?.conversation_members || [];
  const otherMembers = members.filter(m => m.user_id !== currentUserId);
  const firstName = n => n?.split(" ")[0] || "?";
  const title = otherMembers.length === 0
    ? "Just you"
    : otherMembers.length <= 2
      ? otherMembers.map(m => firstName(m.profiles?.full_name)).join(", ")
      : otherMembers.slice(0, 2).map(m => firstName(m.profiles?.full_name)).join(", ") + ` + ${otherMembers.length - 2} others`;

  useEffect(() => {
    if (!conversation?.id) return;

    supabase.from("profiles").select("full_name, avatar_url").eq("id", currentUserId).maybeSingle()
      .then(({ data }) => setMyProfile(data));

    supabase.from("messages")
      .select("id, body, type, created_at, sender_id, profiles(full_name, avatar_url)")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMessages(data || []));

    // Load pinned hints, including the current user's own status on each,
    // and everyone's status/profile for the "who's in" display
    supabase.from("conversation_hints")
      .select("id, group_hint_id, dismissed, group_hints(id, hint_id, organiser_id, recipient_user_id, target_amount, hints(title, image_url, numeric_price, currency, retailer), profiles!group_hints_organiser_id_fkey(full_name), group_hint_members(id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url)))")
      .eq("conversation_id", conversation.id)
      .eq("dismissed", false)
      .then(({ data }) => setPinnedHints(data || []));

    const channel = supabase.channel("conv-" + conversation.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversation.id },
        payload => setMessages(prev => [payload.new, ...prev]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" },
        payload => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_hints", filter: "conversation_id=eq." + conversation.id },
        () => {
          supabase.from("conversation_hints")
            .select("id, group_hint_id, dismissed, group_hints(id, hint_id, organiser_id, recipient_user_id, target_amount, hints(title, image_url, numeric_price, currency, retailer), profiles!group_hints_organiser_id_fkey(full_name), group_hint_members(id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url)))")
            .eq("conversation_id", conversation.id)
            .eq("dismissed", false)
            .then(({ data }) => setPinnedHints(data || []));
        })
      .subscribe();

    // Mark as read - get user from session to ensure we have the id
    supabase.auth.getUser().then(({ data: { user } }) => {
      const uid = user?.id || currentUserId;
      if (!uid) return;
      supabase.from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversation.id)
        .eq("user_id", uid)
        .then(() => {});
    });

    return () => supabase.removeChannel(channel);
  }, [conversation?.id]);

  // Newest messages render at the top now, so no auto-scroll needed.

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    const { data } = await supabase.from("messages")
      .insert({ conversation_id: conversation.id, sender_id: currentUserId, body: body.trim(), type: "text" })
      .select("id, body, type, created_at, sender_id, profiles(full_name, avatar_url)")
      .maybeSingle();
    if (data) {
      setMessages(prev => [data, ...prev]);
      setBody("");
      // Notification is now handled by a Postgres trigger (pg_net) on
      // messages insert, no client-side call needed.
    }
    setSending(false);
  }

  async function handleDeleteMessage(messageId) {
    if (!confirm("Delete this message? This can't be undone.")) return;
    // Remove locally right away rather than waiting on the realtime
    // echo back - the DELETE listener above will just no-op for other
    // clients since this id won't be in their state until it arrives.
    setMessages(prev => prev.filter(m => m.id !== messageId));
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) {
      console.error("Failed to delete message:", error.message);
      // Reload from the server rather than trying to reconstruct the
      // removed message locally - simplest correct recovery from a
      // failed delete.
      const { data } = await supabase.from("messages")
        .select("id, body, type, created_at, sender_id, profiles(full_name, avatar_url)")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false });
      setMessages(data || []);
    }
  }

  async function dismissHint(pinnedHintId) {
    await supabase.from("conversation_hints").update({ dismissed: true }).eq("id", pinnedHintId);
    setPinnedHints(prev => prev.filter(h => h.id !== pinnedHintId));
  }

  async function respondToGroupHint(ph, action, amount) {
    const gh = ph.group_hints;
    const myMember = (gh?.group_hint_members || []).find(m => m.user_id === currentUserId);
    if (!myMember) return;

    const status = action === "accept" ? "in" : "declined";
    const updatePayload = action === "accept" ? { status, pledged_amount: amount ?? null } : { status };
    await supabase.from("group_hint_members").update(updatePayload).eq("id", myMember.id);

    const myName = myProfile?.full_name || "Someone";
    const hintTitle = gh?.hints?.title || "a hint";
    const currency = gh?.hints?.currency || "GBP";
    const announceBody = action === "accept"
      ? (amount != null ? `${myName} pledged ${new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount)} 🎉` : `${myName} is in! 🎉`)
      : `${myName} declined`;

    if (action === "decline") {
      // Post the decline notice first, while they're still a member (RLS
      // requires the sender to be a member), then remove them from the chat.
      await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: currentUserId, body: announceBody, type: "system" });
      await supabase.from("conversation_members").delete().eq("conversation_id", conversation.id).eq("user_id", currentUserId);
      onClose();
      return;
    }

    await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: currentUserId, body: announceBody, type: "system" });

    setPinnedHints(prev => prev.map(p => p.id === ph.id
      ? { ...p, group_hints: { ...p.group_hints, group_hint_members: (p.group_hints.group_hint_members || []).map(m => m.user_id === currentUserId ? { ...m, status, pledged_amount: amount ?? m.pledged_amount } : m) } }
      : p
    ));

    // Email nudge to the organiser, same as before
    fetch("/api/group-hint-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "response", memberId: myMember.id, responderId: currentUserId, response: status, amount }),
    }).catch(console.error);
  }

  // Second, separate step from pledging - pledging is just a stated
  // intent to contribute a certain amount; marking as paid confirms
  // the money has actually changed hands (outside the app - HintDrop
  // never moves real money itself). Only the member themselves can
  // mark their own contribution as paid.
  async function markAsPaid(ph, amount) {
    const gh = ph.group_hints;
    const myMember = (gh?.group_hint_members || []).find(m => m.user_id === currentUserId);
    if (!myMember) return;

    await supabase.from("group_hint_members").update({ paid_amount: amount }).eq("id", myMember.id);

    const myName = myProfile?.full_name || "Someone";
    const currency = gh?.hints?.currency || "GBP";
    const announceBody = `${myName} marked ${new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount)} as paid ✅`;
    await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: currentUserId, body: announceBody, type: "system" });

    setPinnedHints(prev => prev.map(p => p.id === ph.id
      ? { ...p, group_hints: { ...p.group_hints, group_hint_members: (p.group_hints.group_hint_members || []).map(m => m.user_id === currentUserId ? { ...m, paid_amount: amount } : m) } }
      : p
    ));
  }

  // Each open window sits at its own horizontal offset on desktop, side by
  // side (window width + gap apart), like Messenger's stacked chat heads —
  // expressed as a CSS variable since Tailwind can't express an arbitrary
  // per-instance offset directly, only reference one. On mobile, where
  // there's no room for more than one at a time, only the most recently
  // opened window actually shows (full-screen, as before) — older ones
  // stay mounted (so their state/scroll position isn't lost) but hidden,
  // and reappear if the topmost one is closed.
  const desktopRightOffset = 16 + offsetIndex * 396;

  return (
    <div
      className={`${isTopmost ? "fixed inset-0 flex" : "hidden"} z-[110] lg:flex lg:inset-auto lg:bottom-4 lg:right-[var(--chat-right-offset)] lg:w-[380px] lg:h-[580px] flex-col bg-[#fffaf7] lg:rounded-[22px] border border-[#efdcd2] shadow-2xl overflow-hidden`}
      style={{ "--chat-right-offset": `${desktopRightOffset}px` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0e4dd] shrink-0">
        <div className="flex -space-x-2 shrink-0">
          {otherMembers.slice(0, 3).map(m => (
            <Avatar key={m.user_id} profile={m.profiles} size="h-9 w-9" />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900 truncate">{title}</p>
          <p className="text-[11px] text-slate-400">{members.length} people</p>
        </div>
        <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400 shrink-0 hover:bg-[#fff0f0]">&#x2715;</button>
      </div>

      {/* Pinned gifts */}
      {pinnedHints.length > 0 && (
        <div className="border-b border-[#f0e4dd] bg-[#fff8f5] px-3 py-2 space-y-2 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">📌 Group gifts</p>
          {pinnedHints.map(ph => {
            const hint = ph.group_hints?.hints;
            const organiser = ph.group_hints?.profiles;
            const myMember = (ph.group_hints?.group_hint_members || []).find(m => m.user_id === currentUserId);
            const isPending = myMember?.status === "invited";
            const price = hint?.numeric_price > 0
              ? new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)
              : null;
            return (
              <div key={ph.id} className="flex items-center gap-2 bg-white rounded-[14px] border border-[#f0dfd6] p-2">
                {hint?.image_url && (
                  <HintImage
                    src={hint.image_url}
                    width={40}
                    height={40}
                    className="rounded-[10px] object-cover shrink-0 cursor-pointer"
                    alt=""
                    onClick={() => { if (ph.group_hints?.organiser_id) { window.location.href = `/profile/${ph.group_hints.recipient_user_id || ph.group_hints.organiser_id}`; onClose(); } }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-slate-900 truncate">{hint?.title || "Group gift"}</p>
                  {price && <p className="text-[11px] text-[#df7b59] font-semibold">{price}</p>}
                  {organiser && <p className="text-[10px] text-slate-400">by {organiser.full_name?.split(" ")[0]}</p>}
                  {(() => {
                    const allMembers = ph.group_hints?.group_hint_members || [];
                    if (!allMembers.length) return null;
                    const inMembers = allMembers.filter(m => m.status === "in");
                    const pendingMembers = allMembers.filter(m => m.status === "invited");
                    const target = ph.group_hints?.target_amount;
                    const totalPeople = 1 + allMembers.length; // organiser + everyone invited
                    const share = target ? target / totalPeople : null;
                    const paidMembers = inMembers.filter(m => m.paid_amount != null);
                    // Real pledged amounts, not an assumed equal split - falls
                    // back to the theoretical share only for members who
                    // accepted before pledge amounts existed.
                    const raised = inMembers.length
                      ? inMembers.reduce((sum, m) => sum + (m.pledged_amount != null ? Number(m.pledged_amount) : (share || 0)), 0)
                      : null;
                    const pct = target && raised != null ? Math.min(100, Math.round((raised / target) * 100)) : null;
                    return (
                      <div className="mt-1">
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1.5">
                            {allMembers.slice(0, 4).map(m => (
                              <div key={m.id} className={"rounded-full ring-2 " + (m.paid_amount != null ? "ring-[#2f8a5f]" : m.status === "in" ? "ring-[#8fc98f]" : m.status === "declined" ? "ring-slate-200 opacity-40" : "ring-[#ffcaa8]")}>
                                <Avatar profile={m.profiles} size="h-4 w-4" />
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {inMembers.length} in{pendingMembers.length > 0 ? `, ${pendingMembers.length} pending` : ""}{paidMembers.length > 0 ? `, ${paidMembers.length} paid` : ""}
                          </span>
                        </div>
                        {pct != null && (
                          <div className="mt-1.5">
                            <div className="h-1.5 w-full rounded-full bg-[#f1e3db] overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#ff966f] to-[#ff7e54]" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint?.currency || "GBP" }).format(raised)} of {new Intl.NumberFormat("en-GB", { style: "currency", currency: hint?.currency || "GBP" }).format(target)} pledged
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {isPending ? (
                  pledgingId === ph.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number" step="0.01" min="0" autoFocus
                        value={pledgeAmount}
                        onChange={e => setPledgeAmount(e.target.value)}
                        className="w-16 h-7 rounded-full border border-[#ead8ce] px-2 text-[11px] text-slate-700 outline-none focus:border-[#f19b7e]"
                      />
                      <button type="button"
                        onClick={() => { respondToGroupHint(ph, "accept", parseFloat(pledgeAmount) || 0); setPledgingId(null); }}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-white">
                        Confirm
                      </button>
                      <button type="button" onClick={() => setPledgingId(null)}
                        className="text-[10px] font-semibold px-2 py-1 rounded-full border border-[#f0dfd6] text-slate-400 hover:bg-slate-50">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 shrink-0">
                      <button type="button"
                        onClick={() => {
                          const allMembers = ph.group_hints?.group_hint_members || [];
                          const target = ph.group_hints?.target_amount;
                          const totalPeople = 1 + allMembers.length;
                          const defaultShare = target ? target / totalPeople : 0;
                          setPledgeAmount(defaultShare ? defaultShare.toFixed(2) : "");
                          setPledgingId(ph.id);
                        }}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-white">
                        Pledge
                      </button>
                      <button type="button" onClick={() => respondToGroupHint(ph, "decline")}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#f0dfd6] text-slate-400 hover:bg-slate-50">
                        Decline
                      </button>
                    </div>
                  )
                ) : payingId === ph.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number" step="0.01" min="0" autoFocus
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      className="w-16 h-7 rounded-full border border-[#ead8ce] px-2 text-[11px] text-slate-700 outline-none focus:border-[#f19b7e]"
                    />
                    <button type="button"
                      onClick={() => { markAsPaid(ph, parseFloat(payAmount) || 0); setPayingId(null); }}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gradient-to-b from-[#8fc98f] to-[#5fae5f] text-white">
                      Confirm
                    </button>
                    <button type="button" onClick={() => setPayingId(null)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-full border border-[#f0dfd6] text-slate-400 hover:bg-slate-50">
                      ✕
                    </button>
                  </div>
                ) : myMember?.status === "in" && myMember.paid_amount == null ? (
                  <div className="flex gap-1 shrink-0">
                    <button type="button"
                      onClick={() => { setPayAmount(myMember.pledged_amount != null ? Number(myMember.pledged_amount).toFixed(2) : ""); setPayingId(ph.id); }}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gradient-to-b from-[#8fc98f] to-[#5fae5f] text-white">
                      Mark as paid
                    </button>
                  </div>
                ) : myMember?.status === "in" && myMember.paid_amount != null ? (
                  <div className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#e3f5ea] text-[#2f8a5f] shrink-0">
                    ✓ Paid
                  </div>
                ) : (
                  <div className="flex gap-1 shrink-0">
                    <button type="button"
                      onClick={() => { if (ph.group_hints?.organiser_id) { window.location.href = `/profile/${ph.group_hints.recipient_user_id || ph.group_hints.organiser_id}`; onClose(); } }}
                      className="text-[10px] font-semibold px-2 py-1 rounded-full border border-[#f0dfd6] text-[#df7b59] hover:bg-[#fff5f0]">
                      See hints
                    </button>
                    <button type="button" onClick={() => dismissHint(ph.id)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-full border border-[#f0dfd6] text-slate-400 hover:bg-slate-50">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">No messages yet</p>
        )}
        {messages.map(msg => {
          if (msg.type === "system") {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-[11px] text-slate-400 bg-[#f5f0ee] rounded-full px-3 py-1">{msg.body}</span>
              </div>
            );
          }
          const isOwn = msg.sender_id === currentUserId;
          const sp = isOwn ? myProfile : msg.profiles;
          return (
            <div key={msg.id} className={"group flex items-end gap-2 " + (isOwn ? "flex-row-reverse" : "")}>
              <Avatar profile={sp} size="h-7 w-7" />
              <div className="flex flex-col gap-0.5 max-w-[70%]" style={{ alignItems: isOwn ? "flex-end" : "flex-start" }}>
                {!isOwn && <span className="text-[10px] text-slate-400 px-1">{sp?.full_name?.split(" ")[0]}</span>}
                <div className="flex items-center gap-1">
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="Delete message"
                      className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-[#fff0f0] hover:text-[#b14f43] text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                  <div className={"px-3 py-2 rounded-[16px] text-[13px] " + (isOwn ? "bg-[#ff875d] text-white rounded-br-[4px]" : "bg-white border border-[#f0dfd6] text-slate-800 rounded-bl-[4px]")}>
                    {msg.body}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[#f0e4dd] shrink-0 flex gap-2 items-center">
        <input
          type="text"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 h-10 rounded-full border border-[#ead8ce] px-4 text-[13px] bg-white outline-none focus:border-[#ff875d]"
        />
        <button type="button" onClick={handleSend} disabled={!body.trim() || sending}
          className="h-10 w-10 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] flex items-center justify-center text-white disabled:opacity-40 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}
