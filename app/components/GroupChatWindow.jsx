"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase/client";

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function GroupChatWindow({ thread, currentUserId, onClose }) {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!thread?.id) return;
    supabase.from("group_hint_messages")
      .select("id, body, created_at, sender_id, profiles(full_name, avatar_url)")
      .eq("group_hint_id", thread.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data || []));

    const channel = supabase.channel("group-chat-" + thread.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_hint_messages", filter: "group_hint_id=eq." + thread.id },
        payload => setMessages(prev => [...prev, payload.new])
      ).subscribe();

    return () => supabase.removeChannel(channel);
  }, [thread?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("group_hint_messages")
      .insert({ group_hint_id: thread.id, sender_id: currentUserId, body: body.trim() })
      .select("id, body, created_at, sender_id, profiles(full_name, avatar_url)")
      .maybeSingle();
    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setBody("");
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-[70] md:inset-auto md:bottom-4 md:right-4 md:w-[380px] md:h-[520px] flex flex-col bg-[#fffaf7] md:rounded-[22px] border border-[#efdcd2] shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0e4dd] shrink-0">
        {thread.hints?.image_url
          ? <img src={thread.hints.image_url} className="h-9 w-9 rounded-[10px] object-cover shrink-0" alt="" />
          : <div className="h-9 w-9 rounded-[10px] bg-[#fdf0ea] shrink-0 flex items-center justify-center">{"\U0001F381"}</div>
        }
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900 truncate">{thread.hints?.title || "Group gift"}</p>
          <p className="text-[11px] text-slate-400">{(thread.group_hint_members || []).length} people</p>
        </div>
        <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400 shrink-0">{"\u2715"}</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">No messages yet</p>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentUserId;
          const sp = msg.profiles;
          return (
            <div key={msg.id} className={"flex items-end gap-2 " + (isOwn ? "flex-row-reverse" : "")}>
              {!isOwn && (
                <div className="h-7 w-7 rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden">
                  {sp?.avatar_url ? <img src={sp.avatar_url} className="h-full w-full object-cover" alt="" /> : getInitials(sp?.full_name)}
                </div>
              )}
              <div className={"max-w-[70%] px-3 py-2 rounded-[16px] text-[13px] " + (isOwn ? "bg-[#ff875d] text-white rounded-br-[4px]" : "bg-white border border-[#f0dfd6] text-slate-800 rounded-bl-[4px]")}>
                {msg.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-[#f0e4dd] shrink-0 flex gap-2 items-center">
        <input
          type="text"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Message the group..."
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
