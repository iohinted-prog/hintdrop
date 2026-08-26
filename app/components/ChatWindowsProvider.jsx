"use client";
import { createContext, useContext } from "react";

// Deliberately a thin context, not a stateful provider component — the
// state (activeThreads, openThread, closeThread) is owned by AppShell,
// since AppShell also needs to use it directly for its own Messages
// dropdown, and a component can't consume a context it renders itself.
// This just lets any descendant page (like PeopleClient's own "message"
// button) reach the same shared state AppShell already owns, rather than
// each entry point managing its own independent single-chat state that
// would fight with whatever's already open elsewhere for the same screen
// position.
export const ChatWindowsContext = createContext(null);

export function useChatWindows() {
  const ctx = useContext(ChatWindowsContext);
  if (!ctx) {
    throw new Error("useChatWindows must be used within AppShell's ChatWindowsContext.Provider");
  }
  return ctx;
}
