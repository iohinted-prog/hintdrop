"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase/client";
import EditContactModal from "./EditContactModal";

export default function ContactsManagerModal({ open, onClose, contacts, onAdd, onRefresh, onDelete, onOpenProfile }) {
  const [editingContact, setEditingContact] = useState(null);
  const [resending, setResending] = useState(null);
  const [resendDone, setResendDone] = useState({});
  const supabase = createClient();

  async function handleResend(contact) {
    setResending(contact.id);
    try {
      await supabase.functions.invoke("send-contact-invite", {
        body: { target_user_id: contact.profileId, email: contact.email, name: contact.name, role: contact.role || "Friend" },
      });
      setResendDone(prev => ({ ...prev, [contact.id]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setResending(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[560px] rounded-[32px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#efe0d7] shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">Contacts</p>
            <h2 className="mt-1 text-[22px] font-semibold text-slate-900">Your contacts</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff5f0]" type="button">x</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {contacts.filter(c => !c.isDemo).length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No contacts yet.</p>
          ) : (
            contacts.filter(c => !c.isDemo).map(contact => (
              <div key={contact.id} className={"flex items-center gap-3 rounded-[18px] border border-[#f0dfd6] bg-white px-4 py-3 transition " + (contact.profileId ? "cursor-pointer hover:border-[#e8c9bc] hover:shadow-sm" : "")} onClick={() => { if (contact.profileId && onOpenProfile) onOpenProfile({ userId: contact.profileId, name: contact.name, avatarUrl: contact.avatarUrl, initials: contact.initials }); }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[12px] font-bold text-white overflow-hidden">
                  {contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt={contact.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{contact.initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{contact.name}</p>
                  <p className="text-xs text-slate-500 truncate">{contact.role || "Friend"}{contact.note ? ` · ${contact.note}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {contact.contactState === "invitee" && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleResend(contact); }} disabled={resending === contact.id || resendDone[contact.id]}
                      className="h-8 px-3 rounded-full border border-[#f0d0c8] bg-[#fff4ee] text-[11px] font-semibold text-[#df7b59] hover:bg-[#ffe9e0] disabled:opacity-50">
                      {resendDone[contact.id] ? "Sent!" : resending === contact.id ? "Sending..." : "Resend"}
                    </button>
                  )}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditingContact(contact); }}
                    className="h-8 px-3 rounded-full border border-[#ead8ce] bg-white text-[11px] font-semibold text-slate-600 hover:bg-[#f8f5f2]">
                    Edit
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(contact); }}
                    className="h-8 px-3 rounded-full border border-[#efc0ba] bg-[#fff4f2] text-[11px] font-semibold text-[#b14f43] hover:bg-[#ffe9e5]">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="shrink-0 border-t border-[#efe0d7] px-6 py-4">
          <button type="button" onClick={onAdd}
            className="w-full h-11 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-sm font-semibold text-white shadow-lg">
            Add new contact
          </button>
        </div>
      </div>
      {editingContact && (
        <EditContactModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSave={async () => { await onRefresh(); setEditingContact(null); }}
        />
      )}
    </div>
  );
}
