"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import AuthModal from "../../components/AuthModal";
import GroupHintDetailModal from "../../components/GroupHintDetailModal";
import AuthGatedShell from "../../components/AuthGatedShell";

// The landing page for a pot's share link. Deliberately a three-way split:
// signed out -> a generic teaser card asking them to sign up/in (no pot
// details at all, not even to a signed-out visitor); signed in and no
// existing relationship to the pot -> the same generic info (via
// get_pot_public_info, which never includes the underlying hint_id) plus
// a Request to join button; signed in and already organiser/joined/in ->
// hands off entirely to GroupHintDetailModal, which is where the real
// gift details live, gated by the ordinary member-based RLS on
// group_hints/hints once someone's actually allowed to see them.
export default function PotPageClient({ groupHintId }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user) {
      const { data, error } = await supabase.rpc("get_pot_public_info", { pot_id: groupHintId });
      if (error || !data?.length) {
        setNotFound(true);
      } else {
        setInfo(data[0]);
      }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [groupHintId]);

  async function requestToJoin() {
    if (!currentUser || requesting) return;
    setRequesting(true);
    const { data: newMember } = await supabase
      .from("group_hint_members")
      .insert({ group_hint_id: groupHintId, user_id: currentUser.id, status: "requested" })
      .select("id")
      .maybeSingle();
    // Surfaces to the organiser as a real, actionable notification
    // (approve/decline right there) rather than only being visible if
    // they happen to open the pot's own detail view - deliberately
    // generic wording, same non-spoiler reasoning as everywhere else
    // on this page (info.title exists but isn't used here on purpose).
    if (info?.organiser_id && newMember?.id) {
      const { data: requesterProfile } = await supabase.from("profiles").select("full_name, avatar_url, avatar_color").eq("id", currentUser.id).maybeSingle();
      const requesterName = requesterProfile?.full_name || "Someone";
      await supabase.from("notifications").insert({
        user_id: info.organiser_id,
        actor_user_id: currentUser.id,
        type: "group_hint_request",
        title: `${requesterName} wants to join your pot`,
        body: "Approve to let them see it and chip in.",
        data: {
          actor_name: requesterName,
          actor_avatar_url: requesterProfile?.avatar_url || null,
          actor_avatar_color: requesterProfile?.avatar_color || null,
          group_hint_id: groupHintId,
          member_id: newMember.id,
        },
      });
    }
    await load();
    setRequesting(false);
  }

  const hasFullAccess = info && (info.organiser_id === currentUser?.id || info.requester_status === "joined" || info.requester_status === "in");

  if (loading) {
    return null;
  }

  if (hasFullAccess) {
    return (
      <GroupHintDetailModal
        groupHintId={groupHintId}
        currentUserId={currentUser.id}
        currentUserName={currentUser?.user_metadata?.full_name}
        onClose={() => { window.location.href = "/feed"; }}
      />
    );
  }

  return (
    <AuthGatedShell checkedAuth={!loading} currentUser={currentUser}>
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-[420px] rounded-[28px] bg-[#fffaf7] border border-[#efdcd2] shadow-xl p-6 text-center">
          {!currentUser ? (
            <>
              <p className="text-[18px] font-bold text-slate-900 mb-2">You've been invited to chip in on a group gift</p>
              <p className="text-[13px] text-slate-500 mb-5">Sign up or sign in to HintDrop to see how it's going and join in.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAuthOpen(true)}
                  className="h-11 flex-1 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-md">
                  Sign up / Sign in
                </button>
              </div>
              <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); load(); }} initialMode="signup" />
            </>
          ) : notFound ? (
            <p className="text-[14px] text-slate-500">This pot doesn't exist, or has been removed.</p>
          ) : info.requester_status === "requested" ? (
            <>
              <p className="text-[18px] font-bold text-slate-900 mb-2">Request sent</p>
              <p className="text-[13px] text-slate-500">Waiting for {info.organiser_name} to approve you. You'll be able to see the full details and pledge once they do.</p>
            </>
          ) : info.requester_status === "declined" ? (
            <p className="text-[14px] text-slate-500">Your request to join this pot wasn't approved.</p>
          ) : (
            <>
              <p className="text-[18px] font-bold text-slate-900 mb-2">{info.organiser_name} is organising a group gift</p>
              <p className="text-[13px] text-slate-500 mb-4">
                {info.in_count} of {info.member_count} people have already pledged
                {info.target_amount ? ` toward a target of ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(info.target_amount)}` : ""}.
                {info.deadline_date ? ` The deadline is ${new Date(info.deadline_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.` : ""}
              </p>
              <button type="button" disabled={requesting} onClick={requestToJoin}
                className="h-11 w-full rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[13px] font-semibold text-white shadow-md">
                {requesting ? "Requesting..." : "Request to join"}
              </button>
            </>
          )}
        </div>
      </div>
    </AuthGatedShell>
  );
}
