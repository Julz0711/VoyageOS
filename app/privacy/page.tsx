import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy · VoyageOS',
  description: 'How VoyageOS collects, stores, and protects your personal data.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-ink text-lg font-semibold">{title}</h2>
      <div className="text-muted space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-accent mt-0.5 shrink-0">·</span>
      <span>{children}</span>
    </li>
  );
}

const LAST_UPDATED = '12 June 2026';
const CONTACT_EMAIL = 'gtkncht.business@gmail.com';
const CONTROLLER = 'VoyageOS';

export default function PrivacyPage() {
  return (
    <div className="bg-canvas min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="eyebrow text-muted hover:text-ink mb-6 block transition-colors">
            ← VoyageOS
          </Link>
          <p className="eyebrow text-muted mb-2">Legal</p>
          <h1 className="font-display text-ink mb-3 text-4xl font-semibold">Privacy Policy</h1>
          <p className="text-muted text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10">
          <Section title="1. Who we are">
            <p>
              {CONTROLLER} operates the VoyageOS travel planning application available at
              voyageos.vercel.app. We are the data controller responsible for your personal data.
            </p>
            <p>
              For any privacy-related questions or requests, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. What data we collect">
            <p>We collect only what is necessary to provide the service:</p>
            <ul className="space-y-1.5">
              <Li>
                <strong className="text-ink">Account data</strong> — your email address, display
                name, and profile picture when you sign in via Google or Discord.
              </Li>
              <Li>
                <strong className="text-ink">Trip content</strong> — destinations, itinerary
                entries, packing lists, checklists, budget entries, and roadtrips you create.
              </Li>
              <Li>
                <strong className="text-ink">Photos and documents</strong> — files you explicitly
                upload. These are stored privately and never shared.
              </Li>
              <Li>
                <strong className="text-ink">AI assistant data</strong> — if you use the AI chat
                feature, your messages and trip context are sent to your chosen AI provider to
                generate a response. If you bring your own API key (BYOK), it is stored encrypted
                and never logged.
              </Li>
            </ul>
            <p>We do not use cookies for tracking or advertising. We do not sell your data.</p>
          </Section>

          <Section title="3. How we use your data">
            <p>Your data is used solely to:</p>
            <ul className="space-y-1.5">
              <Li>Provide and personalise the VoyageOS service</Li>
              <Li>Store and retrieve your trip content across devices</Li>
              <Li>Generate AI-assisted suggestions when you request them</Li>
              <Li>Send service-related communications (e.g. security alerts)</Li>
            </ul>
            <p>
              The legal basis for processing is <strong className="text-ink">contract</strong> (Art.
              6(1)(b) GDPR) — processing is necessary to deliver the service you signed up for. For
              BYOK key storage the basis is your explicit consent (Art. 6(1)(a) GDPR).
            </p>
          </Section>

          <Section title="4. Where your data is stored">
            <p>
              Your data is processed and stored using the following sub-processors, all operating
              under their own GDPR-compliant terms:
            </p>
            <div className="border-border bg-surface rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted px-4 py-2.5 text-left font-medium">Processor</th>
                    <th className="text-muted px-4 py-2.5 text-left font-medium">Purpose</th>
                    <th className="text-muted px-4 py-2.5 text-left font-medium">Region</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  <tr>
                    <td className="text-ink px-4 py-2.5 font-medium">MongoDB Atlas</td>
                    <td className="px-4 py-2.5">Trip content, account data</td>
                    <td className="px-4 py-2.5">EU (Frankfurt)</td>
                  </tr>
                  <tr>
                    <td className="text-ink px-4 py-2.5 font-medium">Supabase Storage</td>
                    <td className="px-4 py-2.5">Photos, documents</td>
                    <td className="px-4 py-2.5">EU (Stockholm)</td>
                  </tr>
                  <tr>
                    <td className="text-ink px-4 py-2.5 font-medium">Google / Discord</td>
                    <td className="px-4 py-2.5">Authentication (optional)</td>
                    <td className="px-4 py-2.5">EU/US (OAuth only)</td>
                  </tr>
                  <tr>
                    <td className="text-ink px-4 py-2.5 font-medium">Your AI provider</td>
                    <td className="px-4 py-2.5">AI chat responses (BYOK)</td>
                    <td className="px-4 py-2.5">Depends on provider</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              All data in transit is encrypted via TLS. All data at rest is encrypted using AES-256.
              Files are stored in private buckets — they are never accessible via a public URL.
            </p>
          </Section>

          <Section title="5. Your rights under GDPR">
            <p>As a data subject under GDPR (Art. 15–22), you have the right to:</p>
            <ul className="space-y-1.5">
              <Li>
                <strong className="text-ink">Access</strong> — request a copy of all personal data
                we hold about you.
              </Li>
              <Li>
                <strong className="text-ink">Rectification</strong> — correct inaccurate or
                incomplete data.
              </Li>
              <Li>
                <strong className="text-ink">Erasure</strong> — permanently delete your account and
                all associated data. You can do this instantly in{' '}
                <Link href="/settings" className="text-ink underline underline-offset-2">
                  Settings → Delete account
                </Link>
                . All files are removed from storage and all records deleted within the same
                request.
              </Li>
              <Li>
                <strong className="text-ink">Portability</strong> — receive your data in a
                machine-readable format. Contact us and we will prepare an export.
              </Li>
              <Li>
                <strong className="text-ink">Object / restrict processing</strong> — you may object
                to or ask us to restrict processing at any time.
              </Li>
              <Li>
                <strong className="text-ink">Withdraw consent</strong> — where processing is based
                on consent (e.g. BYOK key storage), you can withdraw it at any time via Settings.
              </Li>
            </ul>
            <p>
              To exercise any of these rights, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days. You also have the right to lodge a complaint with
              your national supervisory authority (e.g. the BfDI in Germany).
            </p>
          </Section>

          <Section title="6. Data retention">
            <p>
              We retain your data for as long as your account is active. When you delete your
              account, all personal data is deleted immediately and permanently — including files
              from storage, trip content, and your account record.
            </p>
            <p>We do not retain backups containing personal data beyond 30 days after deletion.</p>
          </Section>

          <Section title="7. AI chat and third-party providers">
            <p>
              The AI assistant feature sends your messages and relevant trip context (destination,
              itinerary, places) to the AI provider you configure. If you use a provider's free
              tier, their data retention policies apply — check your provider's privacy policy. Your
              API key is stored encrypted using AES-256 and is only ever used server-side to call
              your provider.
            </p>
            <p>VoyageOS staff cannot read your messages or your API key.</p>
          </Section>

          <Section title="8. Children">
            <p>
              VoyageOS is not directed at children under the age of 16. We do not knowingly collect
              personal data from children. If you believe a child has provided us with personal
              data, please contact us and we will delete it promptly.
            </p>
          </Section>

          <Section title="9. Changes to this policy">
            <p>
              We may update this policy as the service evolves. We will notify you of material
              changes by email or via an in-app notice at least 14 days before they take effect. The
              "Last updated" date at the top of this page reflects the most recent revision.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>For any privacy questions, data requests, or to report a concern:</p>
            <div className="border-border bg-surface rounded-lg border p-4">
              <p className="text-ink font-medium">{CONTROLLER}</p>
              <p className="mt-0.5">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-ink underline underline-offset-2"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </Section>
        </div>

        <div className="border-border mt-16 border-t pt-8">
          <Link href="/" className="text-muted hover:text-ink text-sm transition-colors">
            ← Back to VoyageOS
          </Link>
        </div>
      </div>
    </div>
  );
}
