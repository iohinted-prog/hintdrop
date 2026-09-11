"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import HintImage from "./HintImage";
import ShareButton from "./ShareButton";

const POT_MEMBER_COLORS = ["#ff8060", "#4e9e6e", "#5b8dd9", "#c97ad4", "#e8a23a", "#e05c7a", "#4db8b0", "#9b7fd4"];

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// The one shared "view a group pot" modal - opened from the Circle page
// tile and reused as the logged-in-member view of the public /pot/[id]
// page, the same way HintDetailModal is the one shared "view a hint"
// modal. Organiser-only Edit (item/target/title/deadline), the
// pledge/mark-as-paid actions already built for the chat pinned card,
// and (for the organiser) an approve/decline queue for join requests
// all live here rather than being duplicated per call site.
export default function GroupHintDetailModal({ groupHintId, currentUserId, currentUserName, onClose }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [gh, setGh] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [recipientHints, setRecipientHints] = useState([]);
  const [editHintId, setEditHintId] = useState("");
  const [payingAmount, setPayingAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [pledging, setPledging] = useState(false);

  async function load() {
    const { data: ghData } = await supabase
      .from("group_hints")
      .select("*, hints(title, image_url, numeric_price, currency), profiles!group_hints_organiser_id_fkey(full_name)")
      .eq("id", groupHintId)
      .maybeSingle();
    if (!ghData) { setError("This pot couldn't be found."); setLoading(false); return; }
    setGh(ghData);
    const { data: memberData } = await supabase
      .from("group_hint_members")
      .select("id, user_id, status, pledged_amount, paid_amount, profiles(full_name, avatar_url)")
      .eq("group_hint_id", groupHintId);
    setMembers(memberData || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [groupHintId]);

  const isOrganiser = gh?.organiser_id === currentUserId;
  const myMember = members.find(m => m.user_id === currentUserId);
  const requested = members.filter(m => m.status === "requested");
  const activeMembers = members.filter(m => m.status !== "requested" && m.status !== "declined");
  const inMembers = members.filter(m => m.status === "in");
  const paidMembers = inMembers.filter(m => m.paid_amount != null);
  const target = gh?.target_amount;
  // The organiser is a real member row now (status "in" from the moment
  // they create the pot), so activeMembers already includes them - no
  // more manually adding 1 for them on top of it.
  const share = target && activeMembers.length ? target / activeMembers.length : 0;
  // Only real, actually-marked contributions count toward the pot - no
  // fallback to the theoretical share for members who are merely "in"
  // but haven't contributed yet.
  const raised = paidMembers.reduce((sum, m) => sum + Number(m.paid_amount), 0);
  const pct = target ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: gh?.hints?.currency || "GBP" }).format(n);
  const isPastDeadline = gh?.deadline_date && new Date(gh.deadline_date) < new Date(new Date().toDateString());

  async function respond(action) {
    if (!myMember) return;
    const status = action === "accept" ? "in" : "declined";
    await supabase.from("group_hint_members").update({ status }).eq("id", myMember.id);
    await load();
  }

  async function joinCommit() {
    // Approved-but-not-yet-confirmed ("joined") member saying "I'm in" -
    // same "in" status a direct invite's accept sets, just arriving via
    // the request-to-join path instead. No amount here either - that's
    // the separate "I've contributed" step below, once they're in.
    if (!myMember) return;
    await supabase.from("group_hint_members").update({ status: "in" }).eq("id", myMember.id);
    await load();
  }

  async function leavePot() {
    // Only available before committing - matches how this was actually
    // asked for. Once paid_amount or a real "in" commitment exists, this
    // button doesn't show at all (see render below).
    if (!myMember) return;
    await supabase.from("group_hint_members").delete().eq("id", myMember.id);
    onClose();
  }

  async function markPaid() {
    if (!myMember || paying) return;
    setPaying(true);
    await supabase.from("group_hint_members").update({ paid_amount: parseFloat(payingAmount) || 0 }).eq("id", myMember.id);
    await load();
    setPaying(false);
  }

  async function approveRequest(memberId) {
    await supabase.from("group_hint_members").update({ status: "joined" }).eq("id", memberId);
    await load();
  }

  async function declineRequest(memberId) {
    await supabase.from("group_hint_members").update({ status: "declined" }).eq("id", memberId);
    await load();
  }

  async function startEdit() {
    setEditTitle(gh.title || gh.hints?.title || "");
    setEditTarget(gh.target_amount || "");
    setEditDeadline(gh.deadline_date || "");
    setEditHintId(gh.hint_id);
    const { data } = await supabase.from("hints").select("id, title, image_url").eq("user_id", gh.recipient_user_id);
    setRecipientHints(data || []);
    setEditing(true);
  }

  async function saveEdit() {
    await supabase.from("group_hints").update({
      hint_id: editHintId,
      target_amount: Number(editTarget) || gh.target_amount,
      title: editTitle || null,
      deadline_date: editDeadline || null,
    }).eq("id", gh.id);
    setEditing(false);
    await load();
  }

  async function deletePot() {
    if (!confirm("Delete this pot? This can't be undone.")) return;
    await supabase.from("group_hint_members").delete().eq("group_hint_id", gh.id);
    await supabase.from("group_hints").delete().eq("id", gh.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 backdrop-blur-sm min-[480px]:items-center min-[480px]:px-4" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-[28px] min-[480px]:rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: "90dvh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2e5de] shrink-0">
          <p className="text-[16px] font-semibold text-slate-900">Group gift pot</p>
          <button type="button" onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-400">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {loading ? (
            <div className="text-center text-sm text-slate-400 py-8">Loading...</div>
          ) : error ? (
            <div className="text-center text-sm text-slate-400 py-8">{error}</div>
          ) : editing ? (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Which item</p>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {recipientHints.map(h => (
                  <div key={h.id} onClick={() => setEditHintId(h.id)}
                    className={"flex items-center gap-3 p-2 rounded-[14px] cursor-pointer border " + (editHintId === h.id ? "border-[#ff875d] bg-[#fff1ea]" : "border-transparent")}>
                    {h.image_url ? <HintImage src={h.image_url} width={40} height={40} className="rounded-[10px] object-cover" alt="" /> : <div className="h-10 w-10 rounded-[10px] bg-[#f1e3db]" />}
                    <p className="text-[13px] font-semibold text-slate-800 flex-1 truncate">{h.title}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Title</p>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder={gh.hints?.title}
                className="w-full h-11 rounded-full border border-[#ead8ce] px-4 text-sm text-slate-700 outline-none focus:border-[#ff875d]" />
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Target amount</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">£</span>
                <input type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)}
                  className="w-full h-11 rounded-full border border-[#ead8ce] pl-8 pr-4 text-sm text-slate-700 outline-none focus:border-[#ff875d]" />
              </div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Deadline</p>
              <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                className="w-full h-11 rounded-full border border-[#ead8ce] px-4 text-sm text-slate-700 outline-none focus:border-[#ff875d]" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditing(false)} className="h-11 flex-1 rounded-full border border-[#ead8ce] text-[13px] font-semibold text-slate-500">Cancel</button>
                <button type="button" onClick={saveEdit} className="h-11 flex-1 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white">Save changes</button>
              </div>
            </div>
          ) : (
            <>
              {isPastDeadline && (
                <div className="rounded-[14px] bg-[#f1ece7] px-4 py-3 text-[12px] font-semibold text-slate-500 text-center">
                  This pot's deadline has passed - no further pledges or payments.
                </div>
              )}
              <div className="flex items-center gap-3">
                {gh.hints?.image_url ? <HintImage src={gh.hints.image_url} width={56} height={56} className="rounded-[14px] object-cover" alt="" /> : null}
                <div className="min-w-0">
                  <p className="text-[16px] font-bold text-slate-900 truncate">{gh.title || gh.hints?.title}</p>
                  <p className="text-[12px] text-slate-400">Organised by {gh.profiles?.full_name}</p>
                </div>
              </div>
              <div>
                <div className="h-2 rounded-full bg-[#f1e3db] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ff966f] to-[#ff7e54]" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[12px] text-slate-500 mt-1.5">
                  {fmt(raised)} of {target ? fmt(target) : "—"} · {target ? fmt(target) : "—"} / {activeMembers.length || 1} people
                  {gh.deadline_date && ` · by ${new Date(gh.deadline_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Who's in</p>
                <div className="space-y-2">
                  {activeMembers.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 py-1">
                      {m.profiles?.avatar_url
                        ? <HintImage src={m.profiles.avatar_url} width={32} height={32} className={"rounded-full object-cover " + (m.paid_amount != null ? "ring-2 ring-[#2f8a5f]" : "")} alt="" />
                        : <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: POT_MEMBER_COLORS[i % POT_MEMBER_COLORS.length] }}>{getInitials(m.profiles?.full_name)}</div>
                      }
                      <p className="text-[13px] font-semibold text-slate-900 flex-1 truncate">{m.profiles?.full_name}{m.user_id === gh.organiser_id && <span className="text-slate-400 font-normal"> · Organiser</span>}</p>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {m.status === "in" ? "Contributed" : m.status === "joined" ? "Joined" : "Invited"}
                      </span>
                      <span className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold " + (m.paid_amount != null ? "bg-[#e3f5ea] text-[#2f8a5f]" : "border border-[#ead8ce] text-transparent")} title={m.paid_amount != null ? "Pledged" : "Not pledged yet"}>
                        ✓
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {isOrganiser && requested.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Requests to join</p>
                  <div className="space-y-2">
                    {requested.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-1">
                        <p className="text-[13px] font-semibold text-slate-900 flex-1 truncate">{m.profiles?.full_name}</p>
                        <button type="button" onClick={() => approveRequest(m.id)} className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-white">Approve</button>
                        <button type="button" onClick={() => declineRequest(m.id)} className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[#ead8ce] text-slate-400">Decline</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isPastDeadline && myMember?.status === "invited" && (
                <div className="flex gap-2">
                  <button type="button" disabled={pledging} onClick={async () => { setPledging(true); await respond("accept"); setPledging(false); }}
                    className="h-11 flex-1 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white">I'm in</button>
                  <button type="button" onClick={() => respond("decline")} className="h-11 rounded-full border border-[#ead8ce] px-4 text-[13px] font-semibold text-slate-400">Decline</button>
                </div>
              )}

              {!isPastDeadline && myMember?.status === "joined" && (
                <div className="flex gap-2">
                  <button type="button" disabled={pledging} onClick={async () => { setPledging(true); await joinCommit(); setPledging(false); }}
                    className="h-11 flex-1 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white">I'm in</button>
                  <button type="button" onClick={leavePot} className="h-11 rounded-full border border-[#ead8ce] px-4 text-[13px] font-semibold text-slate-400">Leave</button>
                </div>
              )}

              {!isPastDeadline && myMember?.status === "in" && target != null && myMember.paid_amount == null && (
                <div className="flex gap-2">
                  <input type="number" placeholder={share.toFixed(2)} value={payingAmount} onChange={e => setPayingAmount(e.target.value)}
                    className="w-24 h-11 rounded-full border border-[#ead8ce] px-3 text-sm text-slate-700 outline-none" />
                  <button type="button" disabled={paying} onClick={markPaid}
                    className="h-11 flex-1 rounded-full bg-gradient-to-b from-[#8fc98f] to-[#5fae5f] text-[13px] font-semibold text-white">Pledge</button>
                </div>
              )}
              {myMember?.status === "in" && target != null && myMember.paid_amount != null && (
                <div className="text-center text-[12px] font-semibold text-[#2f8a5f] bg-[#e3f5ea] rounded-full py-2">✓ You've pledged {fmt(myMember.paid_amount)}</div>
              )}
              {myMember?.status === "in" && target == null && (
                <div className="text-center text-[12px] font-semibold text-[#2f8a5f] bg-[#e3f5ea] rounded-full py-2">✓ You're in</div>
              )}

              <div className="flex gap-2 pt-1">
                <ShareButton
                  supabase={supabase}
                  subjectType="group_hint"
                  subjectId={gh.id}
                  currentUserId={currentUserId}
                  path={`/pot/${gh.id}`}
                  sharerName={currentUserName}
                  text={`Chip in on a group gift I'm organising on HintDrop`}
                  label="Share pot"
                  className="h-11 flex-[2] flex items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-md"
                />
                {isOrganiser && !isPastDeadline && (
                  <button type="button" onClick={startEdit} className="h-11 flex-1 rounded-full border border-[#ead8ce] text-[13px] font-semibold text-slate-700">Edit</button>
                )}
                {isOrganiser && isPastDeadline && (
                  <button type="button" onClick={deletePot} className="h-11 flex-1 rounded-full border border-[#f0c7bf] text-[13px] font-semibold text-[#b14f43]">Delete</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
