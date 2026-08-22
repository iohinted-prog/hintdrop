"use client";
import { useEffect, useState } from "react";
import PublicShell from "../../components/PublicShell";
import AuthModal from "../../components/AuthModal";
import HintImage from "../../components/HintImage";
import { createClient } from "../../../lib/supabase/client";
import { recordShareContext } from "../../../lib/share";

function getInitials(name) {
  return (name || "").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "?";
}

export default function JoinCircleClient({ ownerId }) {
  const supabase = createClient();
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [contactState, setContactState] = useState("none"); // "none" | "pending" | "active"
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState("");
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");

  useEffect(() => {
    async function load() {
      recordShareContext("profile", ownerId, ownerId);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: rpcRows, error: rpcError } = await supabase.rpc("get_public_profile", { target_id: ownerId });
      let ownerData = rpcRows?.[0] || null;
      if (!ownerData && rpcError) {
        const { data: fallback } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("id", ownerId).maybeSingle();
        ownerData = fallback;
      }
      setOwner(ownerData);

      if (user && user.id !== ownerId) {
        const { data: contactData } = await supabase.from("contacts")
          .select("id, status").eq("user_id", user.id).eq("profile_id", ownerId).maybeSingle();
        setContactState(contactData ? (contactData.status === "active" ? "active" : "pending") : "none");
      }

      setLoading(false);
    }
    load();
  }, [ownerId]);

  async function handleAddToCircle() {
    if (!currentUser) return;
    setAddingContact(true);
    setAddContactError("");
    const { error } = await supabase.functions.invoke("send-contact-invite", {
      body: { target_user_id: ownerId, name: owner?.full_name || "" },
    });
    if (error) {
      setAddContactError("Could not send the request. Try again.");
    } else {
      setContactState("pending");
    }
    setAddingContact(false);
  }

  const ownerName = owner?.full_name || "Someone";
  const isOwnLink = currentUser?.id === ownerId;

  return (
    <PublicShell>
      <div className="mx-auto flex min-h-[70vh] max-w-[480px] flex-col items-center justify-center px-5 py-16 text-center">
        {loading ? (
          <div className="h-20 w-20 rounded-full bg-[#f0e4dd] animate-pulse" />
        ) : (
          <>
            <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden border-2 border-[#f0dfd6]">
              {owner?.avatar_url ? (
                <HintImage src={owner.avatar_url} alt={ownerName} fill sizes="80px" className="object-cover" fallbackClassName="hidden" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-[24px] font-bold text-white">
                  {getInitials(ownerName)}
                </div>
              )}
            </div>

            <div className="mt-3 inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e37b57]">
              You're invited
            </div>

            <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
              Join {ownerName}'s Circle
            </h1>

            <p className="mx-auto mt-3 max-w-[38ch] text-[15px] leading-7 text-slate-500">
              You'll be able to see each other's Hints, and {isOwnLink ? "your" : `${ownerName.split(" ")[0]}'s`} birthday will be added to your calendar automatically — no more guessing what to get them.
            </p>

            <div className="mt-8 w-full">
              {isOwnLink ? (
                <p className="text-[13px] text-slate-400">This is your own invite link — share it with someone else to add them to your Circle.</p>
              ) : currentUser ? (
                <button
                  type="button"
                  onClick={contactState === "none" ? handleAddToCircle : undefined}
                  disabled={addingContact || contactState !== "none"}
                  className={`h-12 w-full rounded-full text-[15px] font-semibold transition ${
                    contactState === "active" ? "border border-[#c3e0c3] bg-[#f0faf0] text-[#3a7a3a]"
                    : contactState === "pending" ? "border border-[#f0dfc9] bg-[#fff8ee] text-[#a87d3a]"
                    : "bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-white shadow-md hover:brightness-105"
                  }`}
                >
                  {contactState === "active" ? "✓ You're already connected" : contactState === "pending" ? "Request sent — awaiting acceptance" : addingContact ? "Sending..." : `Join ${ownerName.split(" ")[0]}'s Circle`}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setAuthMode("signup"); setSignUpOpen(true); }}
                    className="h-12 w-full rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] text-[15px] font-semibold text-white shadow-md hover:brightness-105"
                  >
                    Sign up to join
                  </button>
                  <p className="mt-3 text-[13px] text-slate-400">
                    Already have an account?{" "}
                    <button type="button" onClick={() => { setAuthMode("signin"); setSignUpOpen(true); }} className="font-semibold text-[#df7b59] underline underline-offset-2">
                      Sign in
                    </button>
                  </p>
                </>
              )}
              {addContactError && <p className="mt-2 text-[12px] text-[#b14f43]">{addContactError}</p>}
            </div>
          </>
        )}
      </div>
      <AuthModal key={authMode} open={signUpOpen} onClose={() => setSignUpOpen(false)} initialMode={authMode} />
    </PublicShell>
  );
}
