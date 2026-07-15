"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import AddContactModal from "../components/AddContactModal";
import EditContactModal from "../components/EditContactModal";
import ContactCard from "../components/ContactCard";

function getInitials(name) {
  return String(name || "").trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
}
function getColors(role) {
  const r = String(role || "").toLowerCase();
  if (r === "partner" || r === "spouse") return "from-[#e8b9a7] to-[#bf755f]";
  if (r === "colleague") return "from-[#b7c8db] to-[#6b88a7]";
  return "from-[#efcdbf] to-[#bb8168]";
}
function buildContact(row) {
  const role = row?.role || "Friend";
  return {
    id: row.contact_id || row.id,
    name: row.name || row.email || "Unnamed",
    role,
    initials: getInitials(row.name || row.email || ""),
    colors: getColors(role),
    email: row.email || "",
    birthday: row.birthday || "",
    avatarUrl: row.avatar_url || null,
    profileId: row.profile_id || row.matched_profile_id || null,
    matchedProfileId: row.profile_id || row.matched_profile_id || null,
    note: Array.isArray(row.interests) && row.interests.length ? row.interests.slice(0, 3).join(" · ") : role,
    interests: Array.isArray(row.interests) ? row.interests : [],
    status: row.public_state || "contact",
    raw: row,
  };
}

function HintsPreview({ userId, supabase }) {
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;
    supabase.from("hints")
      .select("id, title, image_url, numeric_price, currency, retailer, url")
      .eq("user_id", userId).eq("is_private", false)
      .order("position", { ascending: true }).limit(20)
      .then(({ data }) => { setHints(data || []); setLoading(false); });
  }, [userId]);
  if (loading) return <div className="p-6 text-sm text-slate-400">Loading hints...</div>;
  if (!hints.length) return <div className="p-6 text-sm text-slate-400">No public hints yet.</div>;
  return (
    <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3">
      {hints.map(hint => (
        <a key={hint.id} href={hint.url} target="_blank" rel="noopener noreferrer" className="rounded-[18px] border border-[#f0dfd6] bg-white overflow-hidden">
          {hint.image_url
            ? <img src={hint.image_url} alt={hint.title} className="w-full aspect-square object-cover" />
            : <div className="w-full aspect-square bg-gradient-to-br from-[#ead8ca] to-[#c4a17f] flex items-center justify-center text-3xl">🎁</div>
          }
          <div className="p-2">
            <p className="text-[12px] font-semibold text-slate-900 truncate">{hint.title}</p>
            {hint.retailer && <p className="text-[11px] text-slate-400 truncate">{hint.retailer}</p>}
          </div>
        </a>
      ))}
    </div>
  );
}

export default function PeopleClient() {
  const supabase = createClient();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [editingContact, setEditingContact] = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [search, setSearch] = useState("");

  const [sessionUser, setSessionUser] = useState(null);

  async function loadContacts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSessionUser(user);
    const { data } = await supabase.from("contact_public_state").select("*")
      .eq("owner_user_id", user.id).order("name", { ascending: true });
    setContacts((data || []).map(buildContact));
    setLoading(false);
  }
  useEffect(() => { loadContacts(); }, []);

  async function handleSaveContact(payload) {
    if (!sessionUser?.id) throw new Error("You must be signed in.");
    const cleanedEmail = String(payload.email || "").trim().toLowerCase();
    if (!cleanedEmail) throw new Error("Email is required.");
    const { error } = await supabase.functions.invoke("send-contact-invite", {
      body: {
        email: cleanedEmail,
        name: payload.name,
        role: Array.isArray(payload.relationshipTypes) && payload.relationshipTypes.length
          ? payload.relationshipTypes[0] : "Friend",
      },
    });
    if (error) throw new Error("Failed to send contact invite.");
    await loadContacts();
  }

  async function handleDelete(contact) {
    if (!confirm(`Remove ${contact.name} from your contacts?`)) return;
    await supabase.from("contacts").delete().eq("id", contact.id);
    await loadContacts();
  }

  const filtered = contacts.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="min-h-screen bg-[#fffaf7]">
      <div className="px-4 pt-6 pb-32">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900">People</h1>
          <button type="button" onClick={() => { setAddKey(k => k + 1); setIsAddOpen(true); }}
            className="h-10 px-4 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-sm font-semibold text-white shadow-lg">Add</button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
          className="w-full h-11 rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e] mb-4" />
        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
        : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">No contacts yet</p>
            <button type="button" onClick={() => { setAddKey(k => k + 1); setIsAddOpen(true); }}
              className="mt-4 h-10 px-6 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-sm font-semibold text-white shadow-lg">Add your first contact</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(contact => (
              <ContactCard key={contact.id} contact={contact} onOpenProfile={setProfileModal}
                onEditClick={setEditingContact} onDeleteClick={handleDelete} />
            ))}
          </div>
        )}
      </div>
      <AddContactModal key={addKey} modalKey={addKey} open={isAddOpen} onClose={() => setIsAddOpen(false)}
        onSave={async (payload) => { await handleSaveContact(payload); setIsAddOpen(false); }} supabase={supabase} />
      {editingContact && (
        <EditContactModal contact={editingContact} onClose={() => setEditingContact(null)}
          onSave={async () => { await loadContacts(); setEditingContact(null); }} />
      )}
      {profileModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(33,24,20,0.42)] backdrop-blur-sm" onClick={() => setProfileModal(null)}>
          <div className="w-full max-w-[640px] rounded-t-[32px] border border-[#efdcd2] bg-white shadow-xl overflow-hidden max-h-[85dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de]">
              <p className="text-[17px] font-semibold text-slate-900">{profileModal.name}'s Hints</p>
              <button type="button" onClick={() => setProfileModal(null)} className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
            </div>
            <HintsPreview userId={profileModal.userId} supabase={supabase} />
          </div>
        </div>
      )}
    </main>
  );
}
