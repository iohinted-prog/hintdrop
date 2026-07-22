"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase/client";
import Link from "next/link";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ profile, size = "h-7 w-7" }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden`}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="" />
        : getInitials(profile?.full_name)}
    </div>
  );
}

export default function GroupChatWindow({ conversation, currentUserId, onClose }) {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [pinnedHints, setPinnedHints] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const bottomRef = useRef(null);

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
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data || []));

    // Load pinned hints
    supabase.from("conversation_hints")
      .select("id, group_hint_id, dismissed, group_hints(id, hint_id, organiser_id, recipient_user_id, hints(title, image_url, numeric_price, currency, retailer), profiles!group_hints_organiser_id_fkey(full_name))")
      .eq("conversation_id", conversation.id)
      .eq("dismissed", false)
      .then(({ data }) => setPinnedHints(data || []));

    const channel = supabase.channel("conv-" + conversation.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversation.id },
        payload => setMessages(prev => [...prev, payload.new]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_hints", filter: "conversation_id=eq." + conversation.id },
        () => {
          supabase.from("conversation_hints")
            .select("id, group_hint_id, dismissed, group_hints(id, hint_id, organiser_id, recipient_user_id, hints(title, image_url, numeric_price, currency, retailer), profiles!group_hints_organiser_id_fkey(full_name))")
            .eq("conversation_id", conversation.id)
            .eq("dismissed", false)
            .then(({ data }) => setPinnedHints(data || []));
        })
      .subscribe();

    supabase.from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .eq("user_id", currentUserId)
      .then(() => {});

    return () => supabase.removeChannel(channel);
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    const { data } = await supabase.from("messages")
      .insert({ conversation_id: conversation.id, sender_id: currentUserId, body: body.trim(), type: "text" })
      .select("id, body, type, created_at, sender_id, profiles(full_name, avatar_url)")
      .maybeSingle();
    if (data) {
      setMessages(prev => [...prev, data]);
      setBody("");
      // Notify other members
      fetch("https://egdghdutgjcdvhazmblw.supabase.co/functions/v1/notify-new-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGdoZHV0Z2pjZHZoYXptYmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcxMzQ0NCwiZXhwIjoyMDk3Mjg5NDQ0fQ.eNmDXF87_sP4U7cF3xwHDiXjH3pNQ5QNswTYkVpYqHM"
        },
        body: JSON.stringify({ record: data }),
      }).catch(console.error);
    }
    setSending(false);
  }

  async function dismissHint(pinnedHintId) {
    await supabase.from("conversation_hints").update({ dismissed: true }).eq("id", pinnedHintId);
    setPinnedHints(prev => prev.filter(h => h.id !== pinnedHintId));
  }

  return (
    <div className="fixed inset-0 z-[110] md:inset-auto md:bottom-4 md:right-4 md:w-[380px] md:h-[580px] flex flex-col bg-[#fffaf7] md:rounded-[22px] border border-[#efdcd2] shadow-2xl overflow-hidden">
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
            const price = hint?.numeric_price > 0
              ? new Intl.NumberFormat("en-GB", { style: "currency", currency: hint.currency || "GBP" }).format(hint.numeric_price)
              : null;
            return (
              <div key={ph.id} className="flex items-center gap-2 bg-white rounded-[14px] border border-[#f0dfd6] p-2">
                {hint?.image_url && (
                  <img
                    src={hint.image_url}
                    className="h-10 w-10 rounded-[10px] object-cover shrink-0 cursor-pointer"
                    alt=""
                    onClick={() => { if (ph.group_hints?.organiser_id) { window.location.href = `/profile/${ph.group_hints.recipient_user_id || ph.group_hints.organiser_id}`; onClose(); } }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-slate-900 truncate">{hint?.title || "Group gift"}</p>
                  {price && <p className="text-[11px] text-[#df7b59] font-semibold">{price}</p>}
                  {organiser && <p className="text-[10px] text-slate-400">by {organiser.full_name?.split(" ")[0]}</p>}
                </div>
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
            <div key={msg.id} className={"flex items-end gap-2 " + (isOwn ? "flex-row-reverse" : "")}>
              <Avatar profile={sp} size="h-7 w-7" />
              <div className="flex flex-col gap-0.5 max-w-[70%]" style={{ alignItems: isOwn ? "flex-end" : "flex-start" }}>
                {!isOwn && <span className="text-[10px] text-slate-400 px-1">{sp?.full_name?.split(" ")[0]}</span>}
                <div className={"px-3 py-2 rounded-[16px] text-[13px] " + (isOwn ? "bg-[#ff875d] text-white rounded-br-[4px]" : "bg-white border border-[#f0dfd6] text-slate-800 rounded-bl-[4px]")}>
                  {msg.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
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
