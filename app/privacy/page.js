import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | HintDrop",
  description:
    "Read HintDrop's Privacy Policy, including what information we collect, how we use it, and your choices.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-800">

      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">
              Privacy Policy
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
              How HintDrop handles your information
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Effective date: June 17, 2026
              <br />
              Last updated: July 14, 2026
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
                HintDrop.
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
                If you choose to sign in with Google, we receive basic account
                information such as your name, email address, and profile image.
                We use that information to authenticate your account, create or
                maintain your profile, and support the features you choose to
                use inside HintDrop.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                When you choose to search for contacts to add on HintDrop, we
                request read-only access to your Google Contacts
                (contacts.readonly and contacts.other.readonly scopes). This
                access is used solely to help you find and add people you already
                know — we display matching names and email addresses so you can
                send them a HintDrop invite. We do not store your Google Contacts
                data on our servers, sync your address book, or use your contacts
                for any purpose other than the search you initiate in that moment.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                We do not sell Google user data. We do not use Google user data
                for advertising, profiling, or any purpose other than providing
                and improving HintDrop. Our use of Google user data complies with
                the Google API Services User Data Policy, including the Limited
                Use requirements.
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
                5. Circles and payments
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop offers a group gifting feature called Circles, which allows users to pool contributions toward a shared gift. When you participate in a circle as an organiser or contributor, certain information is shared with other circle members, including your name, profile, and contribution status. Contribution amounts may be visible to the circle organiser.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                Payments made through circles are processed by Stripe, Inc., a third-party payment processor. When you make a contribution, your payment information is handled directly by Stripe and is subject to Stripe&apos;s own privacy policy and terms of service. HintDrop does not store your full payment card details.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                We retain transaction records, contribution amounts, and related circle data for legal, financial, and operational purposes, including dispute resolution and fraud prevention, for as long as required by applicable law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                6. Visibility and sharing choices
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
                7. Cookies and similar technologies
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
                8. Data retention
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
                9. Data security
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
                10. Your rights and choices
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
                  href="mailto:hello@hintdrop.app"
                  className="font-medium text-slate-900 underline decoration-[#d8b3a3] underline-offset-4"
                >
                  hello@hintdrop.app
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                11. Children&apos;s privacy
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
                12. International users
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
                13. Changes to this Privacy Policy
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We may update this Privacy Policy from time to time. If we make
                material changes, we will post the updated version here and
                update the &quot;Last updated&quot; date above. Your continued
                use of HintDrop after those changes become effective means you
                accept the updated policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                14. Contact us
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                If you have questions about this Privacy Policy or our privacy
                practices, contact us at{" "}
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
