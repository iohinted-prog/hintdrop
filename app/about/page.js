import Link from "next/link";

export const metadata = {
  title: "About | Hinted",
  description:
    "Learn about HintDrop, the relationship-aware gifting and reminder app designed to help people stay thoughtful.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-800">
        <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">
              About HintDrop
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
              Thoughtful gifting starts with knowing people better
            </h1>
            <p className="mt-4 text-[17px] leading-8 text-slate-600">
              HintDrop is designed to help you remember important dates, discover
              better gift ideas, and keep track of the people, moments, and
              details that make giving more personal.
            </p>
          </div>

          <div className="space-y-6 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                Why HintDrop exists
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                Giving thoughtful gifts should feel exciting, not stressful.
                HintDrop was created to make it easier to stay on top of
                birthdays, celebrations, and meaningful moments without relying
                on scattered notes, forgotten tabs, or last-minute scrambling.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                The goal is simple: help people become more intentional in their
                relationships by making reminders, gift discovery, and planning
                feel beautifully organised in one place.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                What you can do with HintDrop
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop combines reminder tools with gift exploration and
                relationship context, so you can keep track of who matters to
                you and what might make them feel genuinely seen.
              </p>
              <ul className="space-y-3 text-[17px] leading-8 text-slate-700">
                <li>
                  - Save gift ideas and organise them around real people and
                  occasions.
                </li>
                <li>
                  - Keep track of birthdays, celebrations, and important
                  reminders.
                </li>
                <li>
                  - Build circles and social contexts around friends, family,
                  and shared moments.
                </li>
                <li>
                  - Explore curated gifting inspiration before and after signing
                  in.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                How the experience works
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop has two connected layers. The public side introduces the
                product, the idea behind it, and a preview of gifting content
                for new visitors. The signed-in experience becomes more personal,
                with features such as onboarding, saved ideas, reminders, and
                account-based planning.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                This structure allows HintDrop to feel approachable at first
                glance while still supporting a richer product experience for
                returning users.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                Our approach
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We believe the best gifting tools should be useful, calm, and
                personal. HintDrop is being built to reduce friction around
                remembering, planning, and discovering, while keeping the focus
                on real relationships rather than generic shopping.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                As HintDrop grows, the aim is to keep improving how people
                organise their ideas, manage important moments, and give with
                more confidence and thought.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                Contact
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                Questions, feedback, or partnership enquiries can be sent to{" "}
                <a
                  href="mailto:hello@hintdrop.app"
                  className="font-medium text-slate-900 underline decoration-[#d8b3a3] underline-offset-4"
                >
                  hello@hintdrop.app
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
