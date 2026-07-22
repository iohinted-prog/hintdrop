"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import AddContactModal from "../components/AddContactModal";
import EditContactModal from "../components/EditContactModal";
import ContactCard from "../components/ContactCard";
import GroupChatWindow from "../components/GroupChatWindow";
import UserProfileModal from "../components/UserProfileModal";

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

const GRADIENTS = [
  "from-[#d9dfcf] via-[#b9c7aa] to-[#90a27e]",
  "from-[#ead8ca] via-[#dbc0a8] to-[#c4a17f]",
  "from-[#efe5de] via-[#e5d2c8] to-[#d1b2a4]",
  "from-[#d5dbee] via-[#b3c0df] to-[#8f9fc9]",
  "from-[#eadce8] via-[#d8bfd1] to-[#bb9ab6]",
];
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
      {hints.map((hint, i) => (
        <a key={hint.id} href={hint.url} target="_blank" rel="noopener noreferrer"
          className="relative overflow-hidden rounded-[22px] border border-[rgba(255,255,255,0.14)] bg-white shadow-sm"
          style={{ aspectRatio: "3/4", minHeight: "200px" }}>
          {hint.image_url
            ? <img src={hint.image_url} alt={hint.title} className="absolute inset-0 h-full w-full object-cover" />
            : <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-4xl opacity-80`}>🎁</div>
          }
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,12,10,0.84)_0%,rgba(16,12,10,0.42)_30%,rgba(255,255,255,0)_60%)]" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2">{hint.title || "Hint"}</p>
            {hint.retailer && <p className="text-[10px] text-white/60 mt-0.5 truncate">{hint.retailer}</p>}
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

  const [contactHints, setContactHints] = useState({});
  const [activeChat, setActiveChat] = useState(null);

  async function handleMessageContact(contact) {
    if (!sessionUser || !contact.profileId) return;
    // Find or create direct conversation between sessionUser and contact.profileId
    const { data: myMemberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", sessionUser.id);
    const { data: theirMemberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", contact.profileId);
    const myIds = new Set((myMemberships || []).map(m => m.conversation_id));
    const sharedId = (theirMemberships || []).map(m => m.conversation_id).find(id => myIds.has(id));

    let convId = sharedId;
    if (!convId) {
      const newId = crypto.randomUUID();
      await supabase.from("conversations").insert({ id: newId, type: "direct" });
      await supabase.from("conversation_members").insert([
        { conversation_id: newId, user_id: sessionUser.id },
        { conversation_id: newId, user_id: contact.profileId },
      ]);
      convId = newId;
    }

    // Load full conversation for GroupChatWindow
    const { data: convsData } = await supabase.from("conversations").select("id, type").eq("id", convId).maybeSingle();
    const { data: members } = await supabase.from("conversation_members").select("user_id, profiles(full_name, avatar_url)").eq("conversation_id", convId);
    setActiveChat({ ...convsData, conversation_members: members || [], group_hints: null });
  }

  async function loadContacts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSessionUser(user);
    const { data } = await supabase.from("contact_public_state").select("*")
      .eq("owner_user_id", user.id).order("name", { ascending: true });
    const mapped = (data || []).map(buildContact);
    setContacts(mapped);
    setLoading(false);
    // Fetch hints for contacts with HintDrop accounts
    const withAccounts = mapped.filter(c => c.profileId);
    if (!withAccounts.length) return;
    const { data: hintsData } = await supabase.from("hints")
      .select("id, title, image_url, user_id")
      .in("user_id", withAccounts.map(c => c.profileId))
      .eq("is_private", false)
      .order("starred", { ascending: false })
      .limit(100);
    if (!hintsData) return;
    const byUser = {};
    for (const h of hintsData) {
      if (!byUser[h.user_id]) byUser[h.user_id] = [];
      byUser[h.user_id].push(h);
    }
    setContactHints(byUser);
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
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900">Your Circle</h1>
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
          <div className="space-y-2 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
            {filtered.map(contact => (
              <ContactCard key={contact.id} contact={contact} onOpenProfile={setProfileModal}
                onEditClick={setEditingContact} onDeleteClick={handleDelete}
                onMessageClick={handleMessageContact}
                previewHints={contactHints[contact.profileId] || []} />
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
        <UserProfileModal
          userId={profileModal.userId}
          name={profileModal.name}
          avatarUrl={profileModal.avatarUrl}
          initials={profileModal.initials}
          onClose={() => setProfileModal(null)}
          currentUserId={sessionUser?.id}
          isContact={contacts.some(c => c.profileId === profileModal.userId)}
          onAddContact={async () => {
            await handleSaveContact({ name: profileModal.name, email: "" });
            setProfileModal(null);
          }}
        />
      )}
      {activeChat && (
        <GroupChatWindow
          conversation={activeChat}
          currentUserId={sessionUser?.id}
          onClose={() => setActiveChat(null)}
        />
      )}
    </main>
  );
}
