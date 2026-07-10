import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Hinted",
  description:
    "Read Hinted's Terms of Service, including account rules, acceptable use, content rights, and limitations.",
};

export default function TermsPage() {
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
              href="/privacy"
              className="rounded-full px-4 py-2 transition hover:bg-white/70 hover:text-slate-900"
            >
              Privacy
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
              Terms of Service
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
              The rules for using HintDrop
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Effective date: June 17, 2026
              <br />
              Last updated: June 17, 2026
            </p>
          </div>

          <div className="space-y-6 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="text-[17px] leading-8 text-slate-700">
              These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of HintDrop, including our website, applications, and
              related services (together, the &quot;Service&quot;). By accessing
              or using HintDrop, you agree to be bound by these Terms.
            </p>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                1. Eligibility and accounts
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                You must be at least 13 years old, or the minimum age required
                in your jurisdiction to use the Service lawfully, to create an
                account. If you create an account, you agree to provide
                accurate, complete information and keep it up to date.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                You are responsible for keeping your login credentials secure
                and for all activity that happens under your account. You may
                not share your account or impersonate another person or entity.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                2. Description of the Service
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop helps users organise gift ideas, reminders, important
                dates, social circles, and related planning tools. We may add,
                remove, improve, suspend, or change features at any time.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                3. Acceptable use
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                You agree not to misuse HintDrop. In particular, you agree not to:
              </p>
              <ul className="space-y-3 text-[17px] leading-8 text-slate-700">
                <li>
                  - Use the Service for unlawful, misleading, fraudulent, or
                  abusive purposes.
                </li>
                <li>
                  - Infringe the rights of others, including privacy,
                  intellectual property, or publicity rights.
                </li>
                <li>
                  - Upload malicious code, interfere with the Service, scrape
                  the platform without permission, or attempt to gain
                  unauthorised access.
                </li>
                <li>
                  - Harass, spam, exploit, or harm other users.
                </li>
                <li>
                  - Use HintDrop to collect or expose personal information
                  improperly.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                4. User content
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                You retain ownership of the content you submit to HintDrop,
                including profile information, hints, saved links, notes,
                messages, circle-related content, and other materials you create
                or upload.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                By submitting content to HintDrop, you grant us a non-exclusive,
                worldwide, royalty-free license to host, store, reproduce,
                adapt, and display that content as needed to operate, improve,
                and provide the Service.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                You are solely responsible for your content and for ensuring you
                have the rights needed to submit it.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                5. Privacy
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                Your use of HintDrop is also governed by our Privacy Policy, which
                explains how we collect, use, and share personal information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                6. Social sign-in
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                If you sign in using Google or another third-party provider,
                your use of that sign-in method may also be subject to the
                provider&apos;s own terms and privacy policies. We are not
                responsible for third-party services that we do not control.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                7. Paid features, billing, and refunds
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                Some features of HintDrop may be free, while others may require
                payment now or in the future. If you purchase a paid feature,
                subscription, contribution-related service, or other paid
                offering, you agree to pay any applicable fees, taxes, and
                charges disclosed at the time of purchase.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                Unless otherwise stated at the time of purchase, payments are
                non-refundable except where required by law. We may change
                pricing with reasonable notice, and failure to pay may result in
                suspension or loss of access to paid features.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                8. Termination and suspension
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                You may stop using HintDrop at any time. We may suspend or
                terminate your access to the Service at any time, with or
                without notice, if we reasonably believe you have violated these
                Terms, created risk for other users, or exposed HintDrop to legal
                or security issues.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                We may also suspend the Service temporarily for maintenance,
                upgrades, or operational reasons.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                9. Intellectual property
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                The Service, including its software, branding, designs, text,
                graphics, logos, and other content provided by HintDrop, is owned
                by or licensed to HintDrop and is protected by applicable
                intellectual property laws. Except as expressly allowed in these
                Terms, you may not copy, modify, distribute, sell, or reverse
                engineer any part of the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                10. Third-party links and services
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop may contain links to third-party websites, products, or
                services. We do not control and are not responsible for those
                third-party resources. If you use them, you do so at your own
                risk.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                11. Disclaimers
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop is provided on an &quot;as is&quot; and &quot;as
                available&quot; basis to the fullest extent permitted by law. We
                do not guarantee that the Service will always be uninterrupted,
                error-free, secure, or suitable for every purpose.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                12. Limitation of liability
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                To the fullest extent permitted by law, HintDrop and its
                affiliates, officers, employees, and service providers will not
                be liable for any indirect, incidental, special, consequential,
                exemplary, or punitive damages, or for any loss of profits,
                revenue, data, goodwill, or business opportunity arising out of
                or related to your use of the Service.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                If HintDrop is found liable for any claim arising out of or
                relating to the Service, our total liability will not exceed the
                greater of the amount you paid us in the 12 months before the
                claim arose or £100.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                13. Indemnity
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                You agree to defend, indemnify, and hold harmless HintDrop and its
                affiliates, officers, employees, and agents from and against
                claims, liabilities, damages, losses, and expenses arising out
                of or related to your content, your misuse of the Service, or
                your violation of these Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                14. Changes to these Terms
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We may update these Terms from time to time. If we make material
                changes, we will post the updated Terms here and revise the
                &quot;Last updated&quot; date above. By continuing to use HintDrop
                after those changes become effective, you agree to the updated
                Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                15. Governing law
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                These Terms are governed by the laws of England and Wales,
                without regard to conflict of law principles. Any disputes
                arising out of or relating to these Terms or the Service will be
                subject to the exclusive jurisdiction of the courts of England
                and Wales.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                16. Contact
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                If you have questions about these Terms, contact us at{" "}
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
