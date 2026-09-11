"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import AddContactModal from "../components/AddContactModal";
import ContactCard from "../components/ContactCard";
import GroupHintDetailModal from "../components/GroupHintDetailModal";
import UserProfileModal from "../components/UserProfileModal";
import { useChatWindows } from "../components/ChatWindowsProvider";
import HintImage from "../components/HintImage";
import { resolveAvatarColor, NON_USER_AVATAR_COLOR } from "../../lib/avatarColor";

function getInitials(name) {
  return String(name || "").trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
}
const POT_MEMBER_COLORS = ["#ff8060", "#4e9e6e", "#5b8dd9", "#c97ad4", "#e8a23a", "#e05c7a", "#4db8b0", "#9b7fd4"];

// Same multi-segment SVG donut design as the old circles-legacy page's
// ContributionChart - reused because it was a genuinely good, already-
// designed visual, not rebuilt from scratch. Adapted for the simpler
// even-split pledge model though (no per-person custom amounts - an
// accepted member's share is just target/totalPeople), so segments are
// one color per accepted member at an equal size, not variable sizes
// per a stored contribution amount. No real payment happens here -
// this is a coordination number only, same as the plain "I'm in"
// status it's built on top of.
function GroupGiftPotCard({ groupGift, currentUserId, onContributed }) {
  const supabase = createClient();
  const [payingAmount, setPayingAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const hint = groupGift.hints;
  const organiser = groupGift.profiles;
  const members = groupGift.group_hint_members || [];
  const inMembers = members.filter((m) => m.status === "in");
  const paidMembers = inMembers.filter((m) => m.paid_amount != null);
  const target = groupGift.target_amount;
  // The organiser is a real member row now - members already includes
  // them, no manual +1 needed.
  const totalPeople = members.length || 1;
  const share = target ? target / totalPeople : 0;
  // Only real, actually-marked contributions count toward the pot - no
  // fallback to the theoretical share for members who are merely "in"
  // but haven't contributed yet (and the organiser was never a real
  // contributor here at all), which used to make an empty pot look
  // already 30-50% full.
  const raised = paidMembers.reduce((sum, m) => sum + Number(m.paid_amount), 0);
  const pct = target ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const isOrganiser = groupGift.organiser_id === currentUserId;
  const formatCurrency = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: hint?.currency || "GBP" }).format(n);
  const isPastDeadline = groupGift.deadline_date && new Date(groupGift.deadline_date) < new Date(new Date().toDateString());
  const myMember = members.find((m) => m.user_id === currentUserId);

  async function markPaid(e) {
    e.stopPropagation();
    if (!myMember || paying) return;
    setPaying(true);
    await supabase.from("group_hint_members").update({ paid_amount: parseFloat(payingAmount) || 0 }).eq("id", myMember.id);
    setPaying(false);
    setPayingAmount("");
    onContributed?.();
  }

  // Donut segments - one per actual contribution, sized to what was
  // really paid. No organiser segment (they never "contribute" in
  // this model, they cover whatever's left) and no segment at all for
  // an "in" member who hasn't paid yet.
  const segments = paidMembers.map((m) => ({ name: m.user_id === currentUserId ? "You" : m.profiles?.full_name?.split(" ")[0] || "Someone", amount: Number(m.paid_amount), paid: true }));
  const cx = 44, cy = 44, r = 36, stroke = 13;
  const circ = 2 * Math.PI * r;

  return (
    <div className={"rounded-[22px] border border-[#f0dfd6] bg-white p-4 flex items-center gap-4" + (isPastDeadline ? " opacity-55" : "")}>
      <div className="shrink-0 relative" style={{ width: 88, height: 88 }}>
        <svg viewBox="0 0 88 88" width="88" height="88" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1e3db" strokeWidth={stroke} />
          {segments.map((seg, i) => {
            const segPct = target ? (seg.amount / target) * 100 : 0;
            const dash = (segPct / 100) * circ;
            const segOffset = segments.slice(0, i).reduce((a, s) => a + ((target ? (s.amount / target) * 100 : 0) / 100) * circ, 0);
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={POT_MEMBER_COLORS[i % POT_MEMBER_COLORS.length]}
                strokeWidth={stroke} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-segOffset} strokeLinecap="butt" />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[15px] font-bold text-slate-800">{pct}%</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {hint?.image_url ? (
          <div className="flex items-center gap-2.5 mb-1.5">
            <HintImage src={hint.image_url} width={52} height={52} className="rounded-[12px] object-cover shrink-0" alt="" />
            <p className="text-[14px] font-semibold text-slate-900 line-clamp-2">{hint?.title || "Group gift"}</p>
          </div>
        ) : (
          <p className="text-[13px] font-semibold text-slate-900 truncate mb-1.5">{hint?.title || "Group gift"}</p>
        )}
        <p className="text-[12px] text-slate-500">
          {formatCurrency(raised)} of {target ? formatCurrency(target) : "—"} · {formatCurrency(share)} each
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="flex -space-x-1.5">
            {segments.map((seg, i) => (
              <div key={i} className={"h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white " + (seg.paid ? "ring-2 ring-[#2f8a5f]" : "ring-2 ring-white")} style={{ background: POT_MEMBER_COLORS[i % POT_MEMBER_COLORS.length] }}>
                {seg.name[0]?.toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-slate-400">
            {inMembers.length} of {members.length} in{paidMembers.length > 0 ? `, ${paidMembers.length} contributed` : ""}{isPastDeadline ? " · Closed" : ""}
          </span>
        </div>
        {!isPastDeadline && myMember?.status === "in" && myMember.paid_amount == null && (
          <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
            <input type="number" placeholder={share.toFixed(2)} value={payingAmount} onChange={(e) => setPayingAmount(e.target.value)}
              className="w-16 h-8 rounded-full border border-[#ead8ce] px-2 text-[11px] text-slate-700 outline-none" />
            <button type="button" disabled={paying} onClick={markPaid}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-gradient-to-b from-[#8fc98f] to-[#5fae5f] text-white">
              I've contributed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function daysUntilBirthday(birthday) {
  if (!birthday) return null;
  const bday = new Date(birthday + "T00:00:00");
  if (isNaN(bday.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}
function buildContact(row) {
  const role = row?.role || "Friend";
  const matchedProfileId = row.profile_id || row.matched_profile_id || null;
  // Color now reflects whether this is a real HintDrop account or
  // just a saved contact who hasn't joined - was previously colored
  // by relationship role (partner/colleague/other), which didn't
  // distinguish a registered person from a non-user at all. A
  // registered person without their own avatar photo gets a real,
  // consistent color; a non-user (no matched account) keeps the sand
  // gradient.
  const colors = matchedProfileId ? resolveAvatarColor({ avatarColor: row.avatar_color, id: matchedProfileId }) : NON_USER_AVATAR_COLOR;
  return {
    id: row.contact_id || row.id,
    name: row.name || row.email || "Unnamed",
    role,
    initials: getInitials(row.name || row.email || ""),
    avatarColorFrom: colors.from,
    avatarColorTo: colors.to,
    email: row.email || "",
    birthday: row.birthday || "",
    avatarUrl: row.avatar_url || null,
    profileId: matchedProfileId,
    matchedProfileId,
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
      .select("id, title, image_url, numeric_price, currency, retailer, url, size, size_type, colour")
      .eq("user_id", userId).or("is_private.is.null,is_private.eq.false")
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
            ? <HintImage src={hint.image_url} alt={hint.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 300px" fallbackClassName="hidden" />
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
  const [search, setSearch] = useState("");

  const [sessionUser, setSessionUser] = useState(null);
  const [openPotId, setOpenPotId] = useState(null);
  const [previewUserId, setPreviewUserId] = useState(null);

  const [contactHints, setContactHints] = useState({});
  const [groupGifts, setGroupGifts] = useState([]);
  const { openThread } = useChatWindows();

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

    // Load full conversation to open via the shared chat windows system
    const { data: convsData } = await supabase.from("conversations").select("id, type").eq("id", convId).maybeSingle();
    const { data: members } = await supabase.from("conversation_members").select("user_id, profiles(full_name, avatar_url)").eq("conversation_id", convId);
    openThread({ ...convsData, conversation_members: members || [], group_hints: null });
  }

  // Every group gift the user is either organising or has been invited
  // into - two queries since Supabase can't OR across the join in one
  // call (organiser_id is a plain column on group_hints, membership is
  // a separate table), then merged.
  async function loadGroupGifts(userId) {
    const [{ data: organising }, { data: memberRows }] = await Promise.all([
      supabase.from("group_hints").select("id, hint_id, organiser_id, recipient_user_id, target_amount, created_at, hints(title, image_url, numeric_price, currency), profiles!group_hints_organiser_id_fkey(full_name), group_hint_members(id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url))").eq("organiser_id", userId),
      supabase.from("group_hint_members").select("group_hint_id").eq("user_id", userId),
    ]);
    const memberGroupHintIds = (memberRows || []).map((r) => r.group_hint_id);
    const { data: invitedInto } = memberGroupHintIds.length
      ? await supabase.from("group_hints").select("id, hint_id, organiser_id, recipient_user_id, target_amount, created_at, hints(title, image_url, numeric_price, currency), profiles!group_hints_organiser_id_fkey(full_name), group_hint_members(id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url))").in("id", memberGroupHintIds)
      : { data: [] };
    const merged = [...(organising || []), ...(invitedInto || [])].filter(
      (gh, i, self) => self.findIndex((g) => g.id === gh.id) === i
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setGroupGifts(merged);
  }

  async function loadContacts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSessionUser(user);
    loadGroupGifts(user.id);
    const { data } = await supabase.from("contact_public_state").select("*")
      .eq("owner_user_id", user.id).order("name", { ascending: true });
    const mapped = (data || []).map(buildContact);
    setContacts(mapped);
    setLoading(false);
    // Fetch each contact's public Hints lists (folders), not individual
    // hints — the circle page shows what lists someone has, same as their
    // profile menu, rather than a flat pile of their top items
    const withAccounts = mapped.filter(c => c.profileId);
    if (!withAccounts.length) return;
    const { data: boardsData } = await supabase.from("hint_boards")
      .select("id, title, user_id, is_default")
      .in("user_id", withAccounts.map(c => c.profileId))
      .or("is_private.is.null,is_private.eq.false")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (!boardsData || !boardsData.length) return;

    const boardsWithPreviews = await Promise.all(
      boardsData.map(async (board) => {
        const [{ count }, { data: previewHints }] = await Promise.all([
          supabase.from("hints").select("id", { count: "exact", head: true }).eq("board_id", board.id),
          supabase.from("hints").select("image_url").eq("board_id", board.id).order("position", { ascending: true }).limit(1),
        ]);
        return { ...board, hintCount: count || 0, previewImage: previewHints?.[0]?.image_url || null };
      })
    );

    const byUser = {};
    for (const b of boardsWithPreviews) {
      if (!byUser[b.user_id]) byUser[b.user_id] = [];
      byUser[b.user_id].push(b);
    }
    setContactHints(byUser);
  }
  useEffect(() => { loadContacts(); }, []);

  // Live-update: a friend request being accepted (by either side), a new
  // contact being added, or an existing one changing now refreshes the
  // list immediately - previously needed a manual page reload to see any
  // of this. Re-running loadContacts() on any relevant change rather than
  // trying to patch local state directly, since accepting a request can
  // affect the contact's public_state/profile link in ways that are
  // simpler to just re-fetch than reconstruct piecemeal.
  useEffect(() => {
    if (!sessionUser?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`circle-live-${sessionUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts", filter: `user_id=eq.${sessionUser.id}` },
        () => loadContacts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "circle_invites" },
        () => loadContacts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionUser?.id]);

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
    if (sessionUser?.id && contact.name) {
      await supabase.from("calendar_events").delete()
        .eq("user_id", sessionUser.id)
        .eq("type", "birthday")
        .eq("source", "contact_sync")
        .eq("title", contact.name);
    }
    await loadContacts();
  }

  const filtered = contacts.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));
  const withDaysUntil = filtered.map(c => ({ ...c, daysUntilBirthday: daysUntilBirthday(c.birthday) }));
  const upcomingBirthdays = withDaysUntil
    .filter(c => c.daysUntilBirthday != null && c.daysUntilBirthday <= 30)
    .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  const upcomingIds = new Set(upcomingBirthdays.map(c => c.id));
  const everyoneElse = withDaysUntil.filter(c => !upcomingIds.has(c.id));

  return (
    <main className="min-h-screen bg-[#fffaf7]">
      <div className="px-4 pt-6 pb-32 md:px-8 md:max-w-[1380px] md:mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold tracking-[-0.04em] text-slate-900">Your Circle</h1>
          <button type="button" onClick={() => { setAddKey(k => k + 1); setIsAddOpen(true); }}
            className="h-10 px-4 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-sm font-semibold text-white shadow-lg">Add</button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
          className="w-full h-11 rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e] mb-4" />
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-[22px] border border-[#f0dfd6] bg-white p-4 animate-pulse">
                <div className="h-11 w-11 shrink-0 rounded-full bg-[#f0e4dd]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded-full bg-[#f0e4dd]" />
                  <div className="h-3 w-20 rounded-full bg-[#f5ede8]" />
                </div>
              </div>
            ))}
          </div>
        )
        : filtered.length === 0 ? (
          <div className="text-center py-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/illustrations/hero-character.png" alt="" className="mx-auto w-40 mb-4 opacity-90" />
            <p className="text-slate-500 text-sm font-medium">No contacts yet</p>
            <p className="text-slate-400 text-[13px] mt-1">Add the people you&apos;d like to remember birthdays and gift ideas for.</p>
            <button type="button" onClick={() => { setAddKey(k => k + 1); setIsAddOpen(true); }}
              className="mt-4 h-10 px-6 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-sm font-semibold text-white shadow-lg">Add your first contact</button>
          </div>
        ) : (
          <div className="space-y-5">
            {upcomingBirthdays.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/illustrations/birthday-cake.svg" alt="" className="h-5 w-5" />
                  <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Upcoming birthdays</p>
                </div>
                <div className="space-y-3">
                  {upcomingBirthdays.map(contact => (
                    <ContactCard key={contact.id} contact={contact} onOpenProfile={(p) => setPreviewUserId(p.userId)}
                      onDeleteClick={handleDelete}
                      onMessageClick={handleMessageContact}
                      previewBoards={contactHints[contact.profileId] || []} />
                  ))}
                </div>
              </div>
            )}
            {everyoneElse.length > 0 && (
              <div>
                {upcomingBirthdays.length > 0 && (
                  <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Everyone else</p>
                )}
                <div className="space-y-3">
                  {everyoneElse.map(contact => (
                    <ContactCard key={contact.id} contact={contact} onOpenProfile={(p) => setPreviewUserId(p.userId)}
                      onDeleteClick={handleDelete}
                      onMessageClick={handleMessageContact}
                      previewBoards={contactHints[contact.profileId] || []} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {groupGifts.length > 0 && (
          <div className="mt-6">
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Group gifts</p>
            <div className="space-y-3">
              {groupGifts.map((gg) => (
                <div key={gg.id} onClick={() => setOpenPotId(gg.id)} className="cursor-pointer">
                  <GroupGiftPotCard groupGift={gg} currentUserId={sessionUser?.id} onContributed={() => sessionUser?.id && loadGroupGifts(sessionUser.id)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <AddContactModal key={addKey} modalKey={addKey} open={isAddOpen} onClose={() => setIsAddOpen(false)}
        onSave={async (payload) => { await handleSaveContact(payload); setIsAddOpen(false); }} supabase={supabase} />
      {openPotId && (
        <GroupHintDetailModal
          groupHintId={openPotId}
          currentUserId={sessionUser?.id}
          currentUserName={sessionUser?.user_metadata?.full_name}
          onClose={() => { setOpenPotId(null); if (sessionUser?.id) loadGroupGifts(sessionUser.id); }}
        />
      )}
      {previewUserId && (
        <UserProfileModal
          userId={previewUserId}
          currentUserId={sessionUser?.id}
          isContact
          onClose={() => setPreviewUserId(null)}
        />
      )}
    </main>
  );
}
