"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import BoardPreviewGrid from "../components/BoardPreviewGrid";

function errorToMessage(value) {
  if (!value) return "Something went wrong.";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || "Something went wrong.";
  if (typeof value === "object" && typeof value.message === "string") return value.message;
  return String(value);
}

function BoardCard({ board, onDelete }) {
  return (
    <Link
      href={`/hints/${board.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[26px] border border-[#f0dfd6] bg-white transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="bg-[#fdf5f0] p-0.5" style={{ aspectRatio: "16/9" }}>
        <BoardPreviewGrid previewHints={board.previewHints} />
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-900">
            {Boolean(board.is_private) && <span className="mr-1" title="Private">🔒</span>}
            {board.title}
          </p>
          <p className="mt-0.5 text-[12px] text-slate-400">
            {board.is_default ? "Personal" : "Hints for someone else"} · {board.hintCount} Hint{board.hintCount === 1 ? "" : "s"}
          </p>
        </div>
        <span className="shrink-0 text-slate-300 transition group-hover:text-[#df7b59]">→</span>
      </div>
      {/* The auto-created "My Hints" board can't be deleted - other
          parts of the app assume it always exists as the personal
          default, so removing that guarantee would break things
          elsewhere rather than just tidy up a list. */}
      {!board.is_default && onDelete && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(board); }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8ce] bg-white/90 text-slate-400 opacity-0 backdrop-blur transition hover:bg-[#fff0f0] hover:text-[#b14f43] group-hover:opacity-100"
          aria-label={`Delete ${board.title}`}
        >
          ✕
        </button>
      )}
    </Link>
  );
}

export default function HintsMenuClient() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardPrivate, setNewBoardPrivate] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSavingBoard, setIsSavingBoard] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setCurrentUser(user || null);

      if (!user) {
        setBoards([]);
        setIsLoading(false);
        return;
      }

      let { data: boardRows, error: boardsError } = await supabase
        .from("hint_boards")
        .select("id, title, is_default, is_private, created_at")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (boardsError) {
        setError(errorToMessage(boardsError));
        setIsLoading(false);
        return;
      }

      // First-ever visit for this account — give them a default board
      // rather than showing an empty menu with nothing to click into
      if (!boardRows || boardRows.length === 0) {
        const { data: created, error: createError } = await supabase
          .from("hint_boards")
          .insert({ user_id: user.id, title: "My Hints", is_default: true })
          .select("id, title, is_default, is_private, created_at")
          .single();
        if (cancelled) return;
        if (createError) {
          setError(errorToMessage(createError));
          setIsLoading(false);
          return;
        }
        boardRows = [created];
      }

      const boardsWithPreviews = await Promise.all(
        boardRows.map(async (board) => {
          const [{ count }, { data: previewHints }] = await Promise.all([
            supabase.from("hints").select("id", { count: "exact", head: true }).eq("board_id", board.id),
            supabase.from("hints").select("image_url").eq("board_id", board.id).order("position", { ascending: true }).limit(4),
          ]);
          return { ...board, hintCount: count || 0, previewHints: previewHints || [] };
        })
      );

      if (cancelled) return;
      setBoards(boardsWithPreviews);
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function handleCreateBoard(e) {
    e.preventDefault();
    const title = newBoardTitle.trim();
    if (!title || !currentUser?.id || isSavingBoard) return;

    setIsSavingBoard(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: createError } = await supabase
        .from("hint_boards")
        .insert({ user_id: currentUser.id, title, is_default: false, is_private: newBoardPrivate })
        .select("id")
        .single();
      if (createError) throw createError;

      // Public lists let your circle know, same as saving a hint does —
      // private ones stay quiet since nobody else can see them anyway
      if (!newBoardPrivate) {
        supabase.from("feed_items").insert({
          owner_user_id: currentUser.id,
          actor_user_id: currentUser.id,
          family: "hint",
          item_type: "board_created",
          headline: `${currentUser.user_metadata?.full_name || "Someone"} started a new Hints list: ${title}`,
          body: "",
          cta_label: "See the list",
          cta_href: `/hints/${data.id}`,
          visibility: "contacts",
          occurred_at: new Date().toISOString(),
          metadata: {
            actor_name: currentUser.user_metadata?.full_name || currentUser.email || "You",
            actor_avatar_url: currentUser.user_metadata?.avatar_url || null,
            board_title: title,
          },
        }).then(r => { if (r.error) console.error("feed insert error:", r.error.message); });
      }

      router.push(`/hints/${data.id}`);
    } catch (err) {
      setError(errorToMessage(err));
      setIsSavingBoard(false);
    }
  }

  async function handleDeleteBoard(board) {
    if (board.is_default) return;
    const confirmed = window.confirm(
      `Delete "${board.title}"? This removes the list and everything saved in it (${board.hintCount} hint${board.hintCount === 1 ? "" : "s"}). This can't be undone.`
    );
    if (!confirmed) return;

    setError("");
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("hint_boards").delete().eq("id", board.id);
      if (deleteError) throw deleteError;
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
    } catch (err) {
      setError(errorToMessage(err));
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1100px] px-5 py-10 md:px-8">
        <section className="text-center">
          <h1 className="text-[32px] font-extrabold tracking-[-0.06em] text-[#f19a78] sm:text-[44px]">
            Your Hints
          </h1>
          <p className="mx-auto mt-3 max-w-[52ch] text-[15px] leading-7 text-slate-500">
            Your personal Hints are just for you. Make more for other people — build a list and share it with anyone, for their birthday, Christmas, or anything else.
          </p>
        </section>

        {error ? (
          <div className="mt-6 rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
            {error}
          </div>
        ) : null}

        <div className="mt-10">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="overflow-hidden rounded-[26px] border border-[#f0dfd6] bg-[#f9f8f5]">
                  <div className="animate-pulse bg-[#f2ebe5]" style={{ aspectRatio: "16/9" }} />
                  <div className="p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-[#f2ebe5]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <BoardCard key={board.id} board={board} onDelete={handleDeleteBoard} />
              ))}

              {showCreateForm ? (
                <form
                  onSubmit={handleCreateBoard}
                  className="flex flex-col items-center justify-center gap-3 rounded-[26px] border-2 border-dashed border-[#f0a384] bg-[#fff7f2] p-6"
                  style={{ minHeight: "180px" }}
                >
                  <input
                    autoFocus
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    placeholder="e.g. Mum's Christmas List"
                    className="h-11 w-full rounded-full border border-[#ead8ce] bg-white px-4 text-center text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#f19a78]/50"
                  />
                  <div className="flex w-full gap-2">
                    <button
                      type="button"
                      onClick={() => setNewBoardPrivate(false)}
                      className={`flex-1 h-10 rounded-full text-[12px] font-semibold transition ${!newBoardPrivate ? "bg-[#e3f5ea] text-[#2f8a5f]" : "border border-[#ead8ce] bg-white text-slate-600"}`}
                    >
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBoardPrivate(true)}
                      className={`flex-1 h-10 rounded-full text-[12px] font-semibold transition ${newBoardPrivate ? "bg-[#e3f5ea] text-[#2f8a5f]" : "border border-[#ead8ce] bg-white text-slate-600"}`}
                    >
                      🔒 Private
                    </button>
                  </div>
                  <p className="text-[11px] leading-4 text-slate-400 text-center">
                    {newBoardPrivate
                      ? "Only you can see this. Anyone with a direct link can still view it."
                      : "Your circle will see you started this list."}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowCreateForm(false); setNewBoardTitle(""); setNewBoardPrivate(false); }}
                      className="h-10 rounded-full border border-[#ead8ce] bg-white px-4 text-[13px] font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newBoardTitle.trim() || isSavingBoard}
                      className="h-10 rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-5 text-[13px] font-semibold text-white shadow-md disabled:opacity-60"
                    >
                      {isSavingBoard ? "Creating..." : "Create Hints list"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="flex flex-col items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-[#ead8ce] bg-white text-slate-400 transition hover:border-[#f0a384] hover:text-[#df7b59]"
                  style={{ minHeight: "180px" }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-current text-[20px]">+</span>
                  <span className="text-[13px] font-semibold">New Hints list</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
