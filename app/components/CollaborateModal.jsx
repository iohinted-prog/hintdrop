"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import ShareButton from "./ShareButton";
import { resolveAvatarColor } from "../../lib/avatarColor";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

export default function CollaborateModal({ open, onClose, boardId, boardTitle, sharerName }) {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState("");
  const [circle, setCircle] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setInviteEmail("");
      setError("");
      return;
    }

    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || "");
      if (!user) { setLoading(false); return; }

      const [{ data: contactRows }, { data: collabRows }] = await Promise.all([
        supabase.from("contacts")
          .select("id, name, email, profile_id, profiles:profile_id(full_name, avatar_url, avatar_color)")
          .eq("user_id", user.id).eq("status", "active").not("profile_id", "is", null),
        supabase.from("board_collaborators")
          .select("id, user_id, invited_email, status, profiles:user_id(full_name, avatar_url, avatar_color)")
          .eq("board_id", boardId),
      ]);
      setCircle(contactRows || []);
      setCollaborators(collabRows || []);
      setLoading(false);
    }
    load();
  }, [open, boardId]);

  function isAlreadyCollaborator(profileId) {
    return collaborators.some((c) => c.user_id === profileId);
  }

  async function inviteCircleMember(contact) {
    if (!contact.profile_id || isAlreadyCollaborator(contact.profile_id)) return;
    setError("");
    const { data, error: insertError } = await supabase.from("board_collaborators").insert({
      board_id: boardId,
      user_id: contact.profile_id,
      invited_email: contact.email || null,
      status: "accepted",
      requested_by: currentUserId,
    }).select("id, user_id, invited_email, status, profiles:user_id(full_name, avatar_url, avatar_color)").single();
    if (insertError) { setError(insertError.message); return; }
    setCollaborators((prev) => [...prev, data]);
  }

  async function inviteByEmail() {
    const cleaned = inviteEmail.trim().toLowerCase();
    if (!isValidEmail(cleaned)) { setError("Enter a valid email address."); return; }
    setInviting(true); setError("");
    // If this email already belongs to a HintDrop user, link the invite
    // to their account directly so it shows up for them immediately,
    // rather than only being claimable later via an email-matched flow.
    let matchedProfileId = null;
    try {
      const { data: matches } = await supabase.rpc("get_profile_id_by_email", { target_email: cleaned });
      matchedProfileId = matches?.[0]?.id || null;
    } catch {
      // Lookup failing shouldn't block the email invite itself - it
      // just means the row won't be pre-linked to an account.
    }
    const { data, error: insertError } = await supabase.from("board_collaborators").insert({
      board_id: boardId,
      user_id: matchedProfileId,
      invited_email: cleaned,
      status: "accepted",
      requested_by: currentUserId,
    }).select("id, user_id, invited_email, status, profiles:user_id(full_name, avatar_url, avatar_color)").single();
    setInviting(false);
    if (insertError) { setError(insertError.message); return; }
    setCollaborators((prev) => [...prev, data]);
    setInviteEmail("");
  }

  async function approveRequest(collabId) {
    setError("");
    const { error: updateError } = await supabase.from("board_collaborators").update({ status: "accepted" }).eq("id", collabId);
    if (updateError) { setError(updateError.message); return; }
    setCollaborators((prev) => prev.map((c) => (c.id === collabId ? { ...c, status: "accepted" } : c)));
    const approved = collaborators.find((c) => c.id === collabId);
    if (approved?.user_id) {
      fetch("/api/collab-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "accepted", boardId, requesterId: approved.user_id }),
      }).catch(console.error);
    }
  }

  async function removeCollaborator(collabId) {
    setError("");
    const { error: deleteError } = await supabase.from("board_collaborators").delete().eq("id", collabId);
    if (deleteError) { setError(deleteError.message); return; }
    setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
  }

  if (!open) return null;

  const pendingRequests = collaborators.filter((c) => c.status === "pending");
  const accepted = collaborators.filter((c) => c.status === "accepted");
  const circleAvailable = circle.filter((c) => !isAlreadyCollaborator(c.profile_id));

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-[rgba(42,26,20,0.38)] px-4 py-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <div className="max-h-[92vh] w-full max-w-[760px] overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)] flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#efe0d7]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">Collaborate</p>
              <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                {boardTitle ? `Invite people to "${boardTitle}"` : "Invite people to collaborate"}
              </h2>
            </div>
            <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white text-slate-500 hover:bg-[#fff2eb]" type="button">✕</button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {currentUserId && (
              <div className="mb-5 rounded-[28px] border border-[#f0dfd6] bg-[#fff7f2] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">Fastest way</p>
                <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.02em] text-slate-900">Share an invite link</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-slate-500">
                  Anyone with this link can view the list and request to collaborate.
                </p>
                <div className="mt-4">
                  <ShareButton
                    supabase={supabase}
                    subjectType="board"
                    subjectId={boardId}
                    path={`/b/${boardId}`}
                    title={boardTitle}
                    text={`Collaborate on "${boardTitle}" Hints with me`}
                    currentUserId={currentUserId}
                    label="Share invite link"
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-5 text-[13px] font-semibold text-white shadow-md hover:brightness-105"
                  />
                </div>
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div className="mb-5 rounded-[28px] border border-[#ffd8c9] bg-[#fff2ea] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e27956]">
                  {pendingRequests.length} pending request{pendingRequests.length === 1 ? "" : "s"}
                </p>
                <div className="mt-3 space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-[18px] border border-[#ffe2d3] bg-white px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        {req.profiles?.full_name || req.invited_email || "Someone"}
                      </span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => approveRequest(req.id)}
                          className="rounded-full bg-[#2f8a5f] px-3.5 py-1.5 text-xs font-semibold text-white hover:brightness-105">Approve</button>
                        <button type="button" onClick={() => removeCollaborator(req.id)}
                          className="rounded-full border border-[#ead8ce] bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-[#fff5f0]">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-dashed border-[#e5d8cf] bg-[#fffdfa] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Your Circle</p>
              <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">Invite someone you already know</h3>

              {loading ? (
                <p className="mt-4 text-xs text-slate-500">Loading...</p>
              ) : circleAvailable.length > 0 ? (
                <div className="mt-4 max-h-[280px] overflow-y-auto overflow-x-hidden rounded-[20px] border border-[#efe1d9] bg-white">
                  {circleAvailable.map((contact) => (
                    <button key={contact.id} type="button" onClick={() => inviteCircleMember(contact)}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50">
                      {contact.profiles?.avatar_url ? (
                        <img src={contact.profiles.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover border border-[#f0dfd6]" />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: `linear-gradient(to bottom, ${resolveAvatarColor({ avatarColor: contact.profiles?.avatar_color, id: contact.profile_id }).from}, ${resolveAvatarColor({ avatarColor: contact.profiles?.avatar_color, id: contact.profile_id }).to})` }}>
                          {(contact.profiles?.full_name || contact.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{contact.profiles?.full_name || contact.name || "No name"}</p>
                        {contact.email && <p className="text-xs text-slate-500 truncate">{contact.email}</p>}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[#ea7451]">Invite</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  {circle.length ? "Everyone in your Circle is already invited." : "Nobody in your Circle is on HintDrop yet."}
                </p>
              )}

              <div className="mt-5">
                <span className="block text-sm font-medium text-slate-900">Or invite by email</span>
                <div className="mt-2 flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="someone@example.com"
                    name="collab-invite-email-field"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className="h-[46px] flex-1 rounded-full border border-[#ead8ce] bg-white px-5 text-sm text-slate-700 outline-none transition focus:border-[#f19b7e]" />
                  <button type="button" onClick={inviteByEmail} disabled={inviting || !inviteEmail.trim()}
                    className={"h-[46px] shrink-0 rounded-full px-5 text-sm font-semibold text-white " + (inviting || !inviteEmail.trim() ? "cursor-not-allowed bg-[#e9a48d]" : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]")}>
                    {inviting ? "Inviting..." : "Invite"}
                  </button>
                </div>
              </div>
            </div>

            {accepted.length > 0 && (
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Collaborating ({accepted.length})</p>
                <div className="mt-3 space-y-2">
                  {accepted.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-[18px] border border-[#efe0d7] bg-white px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        {c.profiles?.full_name || c.invited_email || "Someone"}
                      </span>
                      <button type="button" onClick={() => removeCollaborator(c.id)}
                        className="text-xs font-semibold text-[#c9633f] hover:underline">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="mt-5 rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
