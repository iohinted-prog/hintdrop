"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import BackButton from "../components/BackButton";

export default function AccountPageClient() {
  const fileInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  function handleChoosePhoto() {
    fileInputRef.current?.click();
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-6">
          <BackButton fallback="/" />
        </div>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#df7b59]">
            account
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">
            Personal details
          </h1>
          <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-slate-600">
            Keep your profile up to date so your circles know they have the right
            person, details, and photo when planning something thoughtful.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-[#eddacf] bg-white p-5 shadow-sm">
            <h2 className="text-[18px] font-semibold text-slate-900">Profile photo</h2>

            <div className="mt-5 flex flex-col items-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#efcdbf] to-[#bb8168] text-2xl font-bold text-white ring-4 ring-[#fff4ee]">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "CG"
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleChoosePhoto}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-5 text-sm font-semibold text-white hover:bg-[#253120]"
              >
                Upload photo
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-[#fff5f0]"
              >
                Remove
              </button>
            </div>

            <div className="mt-6 rounded-[22px] bg-[#fff7f2] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c97a5d]">
                Account
              </p>
              <p className="mt-2 text-sm text-slate-700">Member since June 2026</p>
            </div>
          </aside>

          <section className="rounded-[28px] border border-[#eddacf] bg-white p-6 shadow-sm">
            <form className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    defaultValue="Cian"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    defaultValue="G"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="displayName">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  defaultValue="Cian G"
                  className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  defaultValue="cian@example.com"
                  className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+44 7..."
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="birthday">
                    Your birthday
                  </label>
                  <input
                    id="birthday"
                    type="date"
                    className="mt-2 h-[54px] w-full rounded-[18px] border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="bio">
                  Short note
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  placeholder="Add a few words that help friends recognise you."
                  className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#f36f64]/50 focus:ring-4 focus:ring-[#f36f64]/10"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-gradient-to-b from-[#ff946d] to-[#f36f64] px-6 text-sm font-semibold text-white shadow-lg"
                >
                  Save changes
                </button>

                <Link
                  href="/"
                  className="inline-flex h-[52px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-[#faf6f3]"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
