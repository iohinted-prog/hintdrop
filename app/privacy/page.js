import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Hinted",
  description:
    "Read Hinted's Privacy Policy, including what information we collect, how we use it, and your choices.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-800">
      <header className="border-b border-[#e8dfd4] bg-[#f7f4ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm font-semibold tracking-[-0.01em] text-slate-800"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f3cfc2] text-base font-semibold text-slate-900 shadow-sm">
              H
            </div>
            <span>HintDrop</span>
          </Link>

          <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <Link
              href="/terms"
              className="rounded-full px-4 py-2 transition hover:bg-white/70 hover:text-slate-900"
            >
              Terms
            </Link>
            <Link
              href="/feed"
              className="rounded-full border border-[#e7d8ca] bg-white/80 px-4 py-2 text-slate-900 transition hover:bg-white"
            >
              Back to app
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">
              Privacy Policy
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
              How Hinted handles your information
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Effective date: June 17, 2026
              <br />
              Last updated: June 17, 2026
            </p>
          </div>

          <div className="space-y-6 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="text-[17px] leading-8 text-slate-700">
              Hinted (&quot;HintDrop&quot;, &quot;we&quot;, &quot;our&quot;, or
              &quot;us&quot;) helps people organise gift ideas, reminders,
              circles, important dates, and related planning. This Privacy
              Policy explains what information we collect, how we use it, when
              we share it, and the choices you have in relation to your
              information.
            </p>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                1. Information we collect
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We may collect information you provide directly, information
                collected automatically when you use HintDrop, and information
                received from third parties where you choose to connect them to
                your account.
              </p>
              <ul className="space-y-3 text-[17px] leading-8 text-slate-700">
                <li>
                  - Account information such as your name, email address,
                  password, profile details, preferences, and login details.
                </li>
                <li>
                  - Information you add to HintDrop, including birthdays,
                  interests, relationships, reminders, gift ideas, saved links,
                  notes, circles, invite details, and contribution-related
                  information.
                </li>
                <li>
                  - Technical and usage information such as device type, browser
                  type, IP address, pages viewed, clicks, log events, access
                  times, and performance data.
                </li>
                <li>
                  - Information provided by third-party sign-in providers, such
                  as Google, if you choose to use social sign-in.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                2. How we use information
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We use information we collect to operate, improve, and secure
                Hinted.
              </p>
              <ul className="space-y-3 text-[17px] leading-8 text-slate-700">
                <li>- Create and manage your account.</li>
                <li>- Authenticate users and keep accounts secure.</li>
                <li>
                  - Provide core features such as hints, reminders, circles,
                  invite flows, gift planning, and saved content.
                </li>
                <li>
                  - Personalise your experience and show more relevant prompts,
                  reminders, and recommendations.
                </li>
                <li>
                  - Analyse usage, troubleshoot problems, improve performance,
                  and develop new features.
                </li>
                <li>
                  - Communicate with you about support, service changes,
                  security, or product updates.
                </li>
                <li>
                  - Send optional marketing or promotional messages where
                  permitted by law and where you have not opted out.
                </li>
                <li>
                  - Comply with legal obligations and enforce our terms.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                3. Social sign-in and Google data
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                If you choose to sign in with Google or another third-party
                provider, we may receive basic account information such as your
                name, email address, and profile image, depending on what that
                provider shares with us. We use that information to authenticate
                your account, help create or maintain your profile, and support
                the features you choose to use inside Hinted.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                We do not sell Google user data. We do not use Google user data
                for purposes other than providing and improving HintDrop, unless
                we clearly tell you otherwise and are permitted to do so.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                4. How we share information
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We may share information in the following situations:
              </p>
              <ul className="space-y-3 text-[17px] leading-8 text-slate-700">
                <li>
                  - With service providers who help us run HintDrop, such as
                  hosting, analytics, authentication, communications, and
                  customer support providers.
                </li>
                <li>
                  - With other users where this is part of the product
                  experience, such as accepted contacts, shared circles, or
                  group gifting and contribution flows that you choose to take
                  part in.
                </li>
                <li>
                  - If required by law, legal process, regulation, or
                  government request.
                </li>
                <li>
                  - To protect the rights, safety, security, and integrity of
                  HintDrop, our users, or the public.
                </li>
                <li>
                  - In connection with a merger, acquisition, financing,
                  restructuring, sale of assets, or similar transaction.
                </li>
              </ul>
              <p className="text-[17px] leading-8 text-slate-700">
                We do not sell your personal information in the ordinary meaning
                of that term.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                5. Visibility and sharing choices
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop is designed to help people coordinate around gifting and
                important moments. Some information may be visible to accepted
                contacts, members of a shared circle, or participants in a
                shared contribution flow, depending on how the feature works. We
                aim to make those sharing contexts clear in the product.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                6. Cookies and similar technologies
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We may use cookies and similar technologies to keep you signed
                in, remember preferences, understand usage, measure performance,
                and improve the service. You can usually control cookies through
                your browser settings, although some parts of HintDrop may not
                work properly if they are disabled.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                7. Data retention
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We keep personal information for as long as reasonably necessary
                to provide HintDrop, maintain records, resolve disputes, enforce
                our agreements, and comply with legal obligations. Some
                information may be retained after account closure where needed
                for legal, security, fraud prevention, or operational reasons.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                8. Data security
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We use reasonable technical and organisational measures designed
                to protect personal information against unauthorised access,
                loss, misuse, or alteration. However, no internet transmission
                or storage system is completely secure, so we cannot guarantee
                absolute security.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                9. Your rights and choices
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                Depending on where you live, you may have the right to access,
                correct, delete, restrict, or object to certain uses of your
                personal information, and to withdraw consent where processing
                depends on consent. You may also opt out of marketing
                communications at any time.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                To make a privacy-related request, contact us at{" "}
                <a
                  href="mailto:iohinted@gmail.com"
                  className="font-medium text-slate-900 underline decoration-[#d8b3a3] underline-offset-4"
                >
                  iohinted@gmail.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                10. Children&apos;s privacy
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop is not intended for children under the age of 13, or any
                higher minimum age required by local law to use the service
                independently. We do not knowingly collect personal information
                from children in violation of applicable law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                11. International users
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop may process and store information in countries other than
                the one where you live. By using the service, you understand
                that your information may be transferred to and processed in
                places where data protection laws may differ from those in your
                jurisdiction.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                12. Changes to this Privacy Policy
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We may update this Privacy Policy from time to time. If we make
                material changes, we will post the updated version here and
                update the &quot;Last updated&quot; date above. Your continued
                use of Hinted after those changes become effective means you
                accept the updated policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                13. Contact us
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                If you have questions about this Privacy Policy or our privacy
                practices, contact us at{" "}
                <a
                  href="mailto:iohinted@gmail.com"
                  className="font-medium text-slate-900 underline decoration-[#d8b3a3] underline-offset-4"
                >
                  iohinted@gmail.com
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
