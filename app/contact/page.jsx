"use client";

import { useState } from "react";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }

      setStatus("success");
      setForm(initialForm);
    } catch (err) {
      setStatus("error");
      setError(err.message || "Something went wrong.");
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[980px] px-5 py-8 md:px-8 md:py-10">
        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.10)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-6 sm:p-8">
            <div className="max-w-[720px]">
              <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#df7b59]">
                Contact
              </div>

              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[40px]">
                Get in touch with HintDrop
              </h1>

              <p className="mt-3 max-w-[60ch] text-[15px] leading-7 text-slate-600">
                Use the form below for support, partnerships, brand enquiries, or general questions.
                Your message will be sent privately without showing the email address on the page.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <form
                onSubmit={handleSubmit}
                className="rounded-[26px] border border-[#f0dfd6] bg-[#fffdfa] p-5 shadow-sm"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="subject"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Subject
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="h-12 w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="message"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={7}
                    className="w-full rounded-[18px] border border-[#ead8ce] bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none focus:border-[#f19b7e]"
                  />
                </div>

                {status === "error" ? (
                  <div className="mt-4 rounded-[22px] border border-[#efc0ba] bg-[#fff4f2] px-4 py-3 text-sm text-[#b14f43]">
                    {error}
                  </div>
                ) : null}

                {status === "success" ? (
                  <div className="mt-4 rounded-[22px] border border-[#d8e8d3] bg-[#f3fbf1] px-4 py-3 text-sm text-[#4a7a3a]">
                    Thanks — your message has been sent.
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#243022] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {status === "loading" ? "Sending..." : "Send message"}
                  </button>

                  <p className="text-xs leading-5 text-slate-500">
                    We’ll use your details only to reply to this message.
                  </p>
                </div>
              </form>

              <aside className="rounded-[26px] border border-[#f0dfd6] bg-[#fffdfa] p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  What to use this for
                </p>

                <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                  Support, brands, or general questions
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#fff4ee] px-2.5 py-1 text-[11px] font-semibold text-[#df7b59]">
                      Support
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Problems with reminders, hints, circles, or shopping flows.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold text-[#5676b3]">
                      Brand enquiry
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Retail, brand, and partnership conversations can start here.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#edf6eb] px-2.5 py-1 text-[11px] font-semibold text-[#4a7a3a]">
                      General
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Questions, feedback, or anything else you want to send privately.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
