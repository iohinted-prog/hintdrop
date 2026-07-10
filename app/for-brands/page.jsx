import Link from "next/link";

export const metadata = {
  title: "For Brands | HintDrop",
  description:
    "Partner with HintDrop to place thoughtful products into gifting, reminder, and shared planning moments.",
};

export default function ForBrandsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        <section className="rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.10)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-6 sm:p-8 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#df7b59]">
                  For brands
                </div>

                <h1 className="mt-3 max-w-[12ch] text-[34px] font-semibold tracking-[-0.06em] text-slate-900 sm:text-[42px]">
                  Meet people while they are choosing thoughtfully.
                </h1>

                <p className="mt-4 max-w-[60ch] text-[15px] leading-7 text-slate-600">
                  HintDrop sits closer to gifting intent than a traditional marketplace.
                  People come here to remember milestones, save better ideas, plan shared
                  presents, and browse curated options when the timing is right.
                </p>

                <p className="mt-3 max-w-[60ch] text-[15px] leading-7 text-slate-600">
                  For brands, that creates a calmer and more considered path to discovery —
                  one that feels useful to the user first, and commercial second.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/contact"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#243022]"
                  >
                    Start a conversation
                  </Link>

                  <Link
                    href="/shop"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-[#fff5f0]"
                  >
                    View shop direction
                  </Link>
                </div>
              </div>

              <aside className="rounded-[26px] border border-[#f0dfd6] bg-[#fffdfa] p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Why it fits
                </p>

                <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">
                  Discovery inside real gifting behaviour
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#fff4ee] px-2.5 py-1 text-[11px] font-semibold text-[#df7b59]">
                      Intent-led
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Users are not endlessly browsing. They are usually solving a real
                      gifting moment, milestone, or reminder.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold text-[#5676b3]">
                      Curated
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Products appear as considered recommendations, not as noisy catalogue
                      inventory.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#faf7f4] p-4">
                    <span className="inline-flex rounded-full bg-[#edf6eb] px-2.5 py-1 text-[11px] font-semibold text-[#4a7a3a]">
                      Shareable
                    </span>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600">
                      Good ideas can move into hints and circles, which helps products stay
                      present across personal and group gifting flows.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="rounded-[30px] border border-[#efdcd2] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b28672]">
              Placement
            </p>
            <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
              Show up in curated edits
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We are interested in thoughtful products that deserve context: birthday edits,
              occasion-led selections, interest-led picks, and premium ideas worth saving for later.
            </p>
          </article>

          <article className="rounded-[30px] border border-[#efdcd2] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f9a78]">
              Relevance
            </p>
            <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
              Match products to moments
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              HintDrop is built around occasions, interests, reminders, and relationships,
              which creates room for products to appear when they make sense rather than at random.
            </p>
          </article>

          <article className="rounded-[30px] border border-[#efdcd2] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d27a58]">
              Quality
            </p>
            <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
              Keep the experience tasteful
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We care about fit, quality, and presentation. The aim is not to flood the app
              with products, but to make the right products feel genuinely helpful.
            </p>
          </article>
        </section>

        <section className="mt-10 rounded-[36px] border border-[#efe0d7] bg-[#fffdfb] p-5 shadow-[0_12px_32px_rgba(176,118,86,0.08)] sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="inline-flex rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#df7b59]">
                Suitable partners
              </div>
              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[36px]">
                Best suited to brands people are happy to save
              </h2>
              <p className="mt-4 max-w-[58ch] text-[15px] leading-7 text-slate-600">
                HintDrop is likely to work best for brands with products that feel giftable,
                recommendable, or worth returning to for a milestone.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[#f1e4dc] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Home and lifestyle</p>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  Decorative, useful, or design-led pieces people save for birthdays, weddings, and housewarmings.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#f1e4dc] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Beauty and wellness</p>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  Products that feel elevated, personal, and suitable for thoughtful gifting.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#f1e4dc] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Experiences</p>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  Stays, classes, dining, culture, and memorable experiences people want to share or fund together.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#f1e4dc] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Premium everyday products</p>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  The kind of item someone might not buy immediately, but will save, revisit, and send to others.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[34px] border border-[#eeddd3] bg-[#fff7f2] p-4 shadow-[0_18px_60px_rgba(173,101,72,0.08)] sm:p-5">
          <div className="rounded-[28px] border border-[#f1dfd6] bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[720px]">
                <div className="inline-flex rounded-full bg-[#edf6eb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4a7a3a]">
                  Partnerships
                </div>

                <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[36px]">
                  Interested in partnering with HintDrop?
                </h2>

                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  We are open to conversations with brands, retailers, and curated partners
                  that fit the product and the tone of the platform.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f3b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#243022]"
                >
                  Contact HintDrop
                </Link>

                <Link
                  href="/privacy"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-[#fff5f0]"
                >
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
