"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

const relationshipOptions = [
  "Partner", "Spouse", "Family", "Friend", "Parent", "Child",
  "Sibling", "Cousin", "Colleague", "Roommate", "Best friend", "Other",
];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

export default function AddContactModal({ open, onClose, onSave, modalKey }) {
  const supabase = createClient();
  const [contactSearch, setContactSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contactResults, setContactResults] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [contactsMessage, setContactsMessage] = useState("");
  const [selectedRelationships, setSelectedRelationships] = useState(["Friend"]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!open) {
      setContactSearch(""); setDebouncedSearch(""); setContactResults([]);
      setContactsMessage(""); setSelectedRelationships(["Friend"]);
      setForm({ name: "", email: "" }); setSaving(false); setSaveError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setDebouncedSearch(contactSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [contactSearch, open]);

  useEffect(() => {
    if (!open || !debouncedSearch) {
      setContactResults([]); setContactsMessage(""); setSearchingContacts(false); return;
    }
    let cancelled = false;
    async function runSearch() {
      setSearchingContacts(true); setContactsMessage("");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const providerToken = session?.provider_token;
        if (!providerToken) {
          if (!cancelled) { setContactResults([]); setContactsMessage("Sign out and sign back in to enable contact search."); }
          return;
        }
        const [savedRes, otherRes] = await Promise.all([
          fetch(`https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(debouncedSearch)}&pageSize=5&readMask=names,emailAddresses`, { headers: { Authorization: `Bearer ${providerToken}` } }),
          fetch(`https://people.googleapis.com/v1/otherContacts:search?query=${encodeURIComponent(debouncedSearch)}&pageSize=5&readMask=names,emailAddresses`, { headers: { Authorization: `Bearer ${providerToken}` } }),
        ]);
        const savedData = savedRes.ok ? await savedRes.json() : { results: [] };
        const otherData = otherRes.ok ? await otherRes.json() : { results: [] };
        function mapPeople(results) {
          return (Array.isArray(results) ? results : [])
            .map(item => item.person).filter(Boolean)
            .map((person, index) => ({
              id: person.resourceName || String(index),
              name: person.names?.[0]?.displayName || "",
              email: person.emailAddresses?.[0]?.value || "",
            }))
            .filter(p => p.name || p.email);
        }
        const seen = new Set();
        const combined = [...mapPeople(savedData.results), ...mapPeople(otherData.results)].filter(p => {
          const key = p.email || p.name; if (seen.has(key)) return false; seen.add(key); return true;
        });
        if (!cancelled) { setContactResults(combined); setContactsMessage(combined.length ? "" : "No matching contacts found."); }
      } catch (error) {
        if (!cancelled) { setContactResults([]); setContactsMessage(error?.message || "Could not search contacts."); }
      } finally {
        if (!cancelled) setSearchingContacts(false);
      }
    }
    runSearch();
    return () => { cancelled = true; };
  }, [debouncedSearch, open, modalKey]);

  function selectContact(contact) {
    setForm({ name: contact.name || "", email: contact.email || "" });
    setContactSearch(contact.name || contact.email || "");
    setContactResults([]); setContactsMessage(""); setSaveError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setSaveError("Contact name is required."); return; }
    const cleanedEmail = form.email.trim().toLowerCase();
    if (!cleanedEmail) { setSaveError("Email is required."); return; }
    if (!isValidEmail(cleanedEmail)) { setSaveError("Enter a valid email address."); return; }
    setSaving(true); setSaveError("");
    try {
      await onSave({ name: form.name.trim(), email: cleanedEmail, relationshipTypes: selectedRelationships });
      onClose();
    } catch (error) {
      setSaveError(error?.message || "Failed to save contact.");
    } finally { setSaving(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[760px] overflow-hidden rounded-[34px] border border-[#eddacf] bg-[#fffaf7] shadow-[0_24px_80px_rgba(88,46,31,0.22)] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#efe0d7]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">Contact</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">Add a contact</h2>
          </div>
          <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white text-slate-500 hover:bg-[#fff2eb]" type="button">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-[28px] border border-dashed border-[#e5d8cf] bg-[#fffdfa] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Search your email contacts</p>
            <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">Find someone quickly</h3>
            <div className="mt-5">
              <input type="text" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search by name or email"
                className="h-[46px] w-full rounded-full border border-[#ead8ce] bg-white px-5 text-sm text-slate-700 outline-none transition focus:border-[#f19b7e]" />
            </div>
            {searchingContacts && <p className="mt-3 text-xs text-slate-500">Searching...</p>}
            {contactResults.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-[20px] border border-[#efe1d9] bg-white">
                {contactResults.map((contact) => (
                  <button key={contact.id} type="button" onClick={() => selectContact(contact)}
                    className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{contact.name || "No name"}</p>
                      <p className="text-xs text-slate-500">{contact.email || "No email"}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#ea7451]">Use</span>
                  </button>
                ))}
              </div>
            )}
            {contactsMessage && <p className="mt-3 text-xs text-slate-500">{contactsMessage}</p>}
          </div>
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="block text-sm font-medium text-slate-900">Name</span>
              <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Maya" className="mt-2 h-[48px] w-full rounded-[18px] border border-[#d9dce3] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#f19b7e]" />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-900">Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="maya@example.com" className="mt-2 h-[48px] w-full rounded-[18px] border border-[#d9dce3] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#f19b7e]" />
            </label>
            <div>
              <span className="block text-sm font-medium text-slate-900">Relationship</span>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {relationshipOptions.map((r) => (
                  <button key={r} type="button" onClick={() => setSelectedRelationships([r])}
                    className={"rounded-full border px-4 py-2.5 text-sm font-medium transition " + (selectedRelationships.includes(r) ? "border-[#2f3b2d] bg-[#2f3b2d] text-white" : "border-[#d9dce3] bg-white text-slate-600 hover:bg-slate-50")}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {saveError && <div className="rounded-[18px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">{saveError}</div>}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="inline-flex h-[44px] items-center justify-center rounded-full border border-[#ead8ce] bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || !form.email.trim()}
              className={"inline-flex h-[44px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-lg " + (saving || !form.name.trim() || !form.email.trim() ? "cursor-not-allowed bg-[#e9a48d]" : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]")}>
              {saving ? "Saving..." : "Save contact"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
