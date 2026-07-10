"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

const relationshipOptions = [
  "Partner", "Spouse", "Family", "Friend", "Parent", "Child",
  "Sibling", "Cousin", "Colleague", "Roommate", "Best friend", "Other",
];

export default function EditContactModal({ contact, onClose, onSave }) {
  const supabase = createClient();
  const [form, setForm] = useState({ name: contact?.name || "", role: contact?.role || "Friend" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!contact) return null;

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase
        .from("contacts")
        .update({ name: form.name.trim(), role: form.role })
        .eq("id", contact.id);
      if (err) throw new Error(err.message);
      await onSave();
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,20,0.38)] px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-[28px] border border-[#eddacf] bg-[#fffaf7] p-6 shadow-[0_24px_80px_rgba(88,46,31,0.22)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-semibold text-slate-900">Edit contact</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full border border-[#ead8ce] text-slate-500 hover:bg-[#fff5f0]" type="button">x</button>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="mt-2 h-[46px] w-full rounded-[16px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]" />
          </label>
          <div>
            <span className="text-sm font-medium text-slate-700">Relationship</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {relationshipOptions.map(r => (
                <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))}
                  className={"rounded-full border px-3 py-1.5 text-xs font-medium transition " + (form.role === r ? "border-[#2f3b2d] bg-[#2f3b2d] text-white" : "border-[#d9dce3] bg-white text-slate-600 hover:bg-slate-50")}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-[#b14f43]">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-full border border-[#ead8ce] bg-white text-sm text-slate-600 hover:bg-[#fff5f0]">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || !form.name.trim()}
            className={"h-10 px-5 rounded-full text-sm font-semibold text-white " + (saving || !form.name.trim() ? "bg-[#e9a48d] cursor-not-allowed" : "bg-gradient-to-b from-[#ff946d] to-[#f36f64]")}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
