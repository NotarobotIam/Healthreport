import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// -----------------------------------------------------------------------------
// LAUNCH CHECKLIST — these pages are a starting-point DRAFT, written to match what
// the software actually does. They have NOT been reviewed by a lawyer. A service
// that collects health information from the public has legal duties that depend on
// where you and your members are (for example GDPR in the EU/UK, US state health-
// privacy laws, the FTC Health Breach Notification Rule). Before opening to the
// public: fill in the placeholders below, have counsel review all three pages, then
// set LEGAL_REVIEWED to true to remove the draft banner.
// -----------------------------------------------------------------------------
const LEGAL_REVIEWED = false;
const OPERATOR = '[Operator name and address]';
const CONTACT = '[support email address]';
const UPDATED = 'September 2026';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-hud-bg px-4 py-8">
      <article className="mx-auto max-w-2xl rounded-lg bg-hud-panel p-6 shadow-sm sm:p-8">
        {!LEGAL_REVIEWED && (
          <p role="note" className="mb-5 rounded-md border border-hud-amber/60 bg-hud-amber/10 px-3 py-2 text-sm text-hud-text">
            <strong>Draft.</strong> This document has not yet been reviewed by a lawyer and must not be relied on until it has.
          </p>
        )}
        <h1 className="text-2xl font-semibold text-hud-text">{title}</h1>
        <p className="mb-6 mt-1 text-xs text-hud-muted">Last updated {UPDATED}</p>
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-hud-text [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
        <nav className="mt-8 flex flex-wrap gap-4 border-t border-hud-border pt-4 text-sm">
          <Link to="/terms" className="text-hud-cyan hover:underline">Terms</Link>
          <Link to="/privacy" className="text-hud-cyan hover:underline">Privacy Policy</Link>
          <Link to="/guidelines" className="text-hud-cyan hover:underline">Community Guidelines</Link>
          <Link to="/" className="ml-auto text-hud-muted hover:underline">Back to the app</Link>
        </nav>
      </article>
    </div>
  );
}

export function GuidelinesPage() {
  return (
    <LegalLayout title="Community Guidelines">
      <p>This is a place for people living with pain to share what they're going through and learn from each other. These guidelines keep it safe and kind.</p>

      <h2>Share experiences, not medical advice</h2>
      <ul>
        <li>Talk about what happened to <em>you</em>: what you felt, what you tried, what your clinician said.</li>
        <li>Don't diagnose other members, and don't tell anyone to start, stop or change a medication or dose.</li>
        <li>Don't present your experience as a cure or as something that will work for everyone.</li>
        <li>Nothing here replaces a doctor. If something feels seriously wrong, get medical care.</li>
      </ul>

      <h2>Be kind</h2>
      <ul>
        <li>Believe people about their own pain. No dismissing, mocking or blaming.</li>
        <li>No harassment, hate, or personal attacks. Disagree respectfully.</li>
      </ul>

      <h2>Protect privacy — yours and others'</h2>
      <ul>
        <li>Don't post names, phone numbers, email addresses, addresses, or links. Posts that include them are rejected.</li>
        <li>Don't try to work out who another member is, and never share what someone told you in a discussion elsewhere.</li>
        <li>Use your username, not your real name.</li>
      </ul>

      <h2>Friends and communities</h2>
      <ul>
        <li>Only send friend requests to people you'd genuinely like to connect with. A declined request is not announced, and repeatedly asking someone who has said no is harassment.</li>
        <li>What happens in a community is shared with all signed-in members. Don't share other people's stories without their permission.</li>
        <li>Studies shown on the site are from a public database and are not recommendations. Talk to your care team before acting on any research.</li>
      </ul>

      <h2>AI-assisted insights</h2>
      <ul>
        <li>Treat every AI suggestion as an idea to discuss with a clinician, never as a diagnosis or a reason to start, stop or change treatment.</li>
        <li>Don't rely on it in an emergency. If you have chest pain, trouble breathing, or sudden severe symptoms, call your local emergency number.</li>
      </ul>

      <h2>No spam or selling</h2>
      <ul>
        <li>No advertising, referral links, or promotion of products, supplements or services.</li>
      </ul>

      <h2>If you or someone else may be in danger</h2>
      <p>
        If you're thinking about harming yourself or someone else is in immediate danger, contact your local emergency number. In the US you can call or text
        <strong> 988</strong>. Elsewhere, <a href="https://findahelpline.com" target="_blank" rel="noreferrer noopener" className="text-hud-cyan underline">findahelpline.com</a> lists free,
        confidential helplines. Use <strong>Report</strong> on any post that worries you — moderators review these, though not around the clock.
      </p>

      <h2>Reporting and moderation</h2>
      <p>
        Any member can report a post. Moderators may hide or remove content and suspend accounts that break these guidelines. Every moderator action is logged. If you
        think a decision was wrong, contact {CONTACT}.
      </p>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>{OPERATOR} ("we") runs this service. Health information is sensitive; this page explains, in plain language, what we hold and who can see it.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, a password (stored only as a one-way hash), and optionally date of birth, gender and phone number.</li>
        <li><strong>Health information you enter:</strong> pain log entries (location on the body, type, severity, timing, triggers, notes) and any test reports you add.</li>
        <li><strong>Things you post:</strong> discussions, replies, your bio, and reactions.</li>
        <li><strong>Vital signs and exam results:</strong> readings you enter (blood pressure, heart rate and so on) and results from heart and physical exams, and gut and microbiome test results (stool, breath and sequencing tests). These are always private.</li>
        <li><strong>AI insights:</strong> if you opt in, the results of each AI-assisted look at your records.</li>
        <li><strong>Communities and friends:</strong> which health communities you join, and who you are friends with.</li>
        <li><strong>Technical data:</strong> your IP address is used for security and rate limiting. We record when you last signed in.</li>
      </ul>

      <h2>What other members can see</h2>
      <ul>
        <li><strong>Always private:</strong> your name, email, phone, date of birth, gender, test reports, and the notes on your pain entries.</li>
        <li><strong>Public to signed-in members:</strong> your username, your bio, and anything you post in discussions. You should assume posts can be read by all members.</li>
        <li><strong>Only if you opt in:</strong> a pain entry marked "share anonymously" lets other members find you as a match. They see your username, the body area, type of pain, severity, pattern, and a rough duration (like "a few weeks"). They do <em>not</em> see your notes, exact dates, the exact spot, name or email. Entries are private by default and you can stop sharing at any time.</li>
        <li><strong>Communities you join are private.</strong> Only you can see the list, and it never appears on your profile. Be aware that a discussion you post <em>in</em> a community is visible to all signed-in members and shows which community it belongs to, which can suggest you have an interest in that condition.</li>
        <li><strong>Friends</strong> are mutual and need your agreement. Friends can see your public posts in their feed — never your pain log, reports, or the communities you have joined.</li>
        <li>Counts such as "members with pain here" or "members of a community" are only shown when at least three members are included.</li>
      </ul>

      <h2>Who else can see it</h2>
      <ul>
        <li><strong>Moderators</strong> can see reported content and the username that posted it. They cannot see contact details.</li>
        <li><strong>Our team</strong> can access the database to run and secure the service.</li>
        <li>We do not sell your data or use it for advertising. [Add any service providers — hosting, email, backups — here.]</li>
      </ul>

      <h2>Insights and AI-assisted features</h2>
      <p>
        The <strong>free quick summary</strong> is produced by this site's own software from your records. It uses no AI service and nothing leaves this site.
      </p>
      <p>
        The <strong>optional</strong> AI features (a deeper look at your records, and questions you type) work differently. If you choose to turn them on, we send information to an AI service provided by <strong>Anthropic</strong> (the Claude models) and show you what it says.
        For a deeper look that is a summary of your pain log or physiology records; for a question it is the words of your question, plus a short de-identified summary of your pain log only if you tick that option. Please do not put names or contact details in a question; questions that contain them are refused.
        We send facts only: where it hurts, what it feels like, severity, timing as "days ago", pattern, and — for physiology — readings, exam results and a few cholesterol values.
        We do <strong>not</strong> send your name, email, phone number, username or date of birth. Your written notes and your age range are sent only if you tick "include more detail" for that request. Free text that contains contact details is left out.
        If what you have written suggests you are in distress, we show you support resources instead of sending it for analysis.
      </p>
      <p>
        Results are not a diagnosis. After each one you must choose to take it to your doctor or limit the suggestions. You can lower the number of suggestions, turn the feature off, withdraw your agreement,
        and delete your saved insights at any time; they are included when you download your data and erased when you delete your account. [Describe Anthropic's data-retention terms that apply to your account here.]
      </p>

      <h2>Research and news</h2>
      <p>
        The research and testing feeds list recent studies from PubMed, a public database run by the US National Library of Medicine. We fetch these by community topic on a schedule,
        for every community, whether or not anyone has joined. <strong>Nothing about you, or which communities you belong to, is sent to PubMed.</strong> Studies are published
        information, not advice from us, and may be early findings.
      </p>

      <h2>Finding a hospital near you</h2>
      <p>
        The hospital finder on your dashboard only works when you press <strong>Use my location</strong> (your browser will ask your permission) or type a city or postcode.
        Your position is rounded to about 1&nbsp;km in your browser before it is sent to us, is used for that one search, and is <strong>not stored</strong>, not linked to your account and not kept in your browser.
        To find places, our server asks OpenStreetMap services (Overpass and Nominatim) for hospitals in that area, so <strong>they receive the rounded area, but not your name or IP address</strong>.
        The map picture is loaded by your browser directly from a map tile server (OpenStreetMap by default), so that server can see your IP address and roughly which area you are looking at.
        Hospital details come from OpenStreetMap contributors and may be incomplete or out of date. [Update this section if you use a different map provider.]
      </p>

      <h2>Your choices</h2>
      <ul>
        <li><strong>Download</strong> everything we hold about you from Account &amp; privacy.</li>
        <li><strong>Delete</strong> your account from the same page. This erases your pain log and test reports, removes your discussions and replies, and anonymises the account record. Backups may keep data for up to [retention period].</li>
        <li><strong>Block</strong> members you don't want to see (this also ends any friendship). <strong>Stop sharing</strong> any entry at any time. <strong>Leave</strong> a community or <strong>remove</strong> a friend whenever you like.</li>
      </ul>

      <h2>Security</h2>
      <p>Passwords are hashed, sessions can be revoked, and access to health data is restricted to its owner. No system is perfectly secure; if there is a breach affecting you we will tell you as the law requires.</p>

      <h2>Contact</h2>
      <p>Questions or requests about your data: {CONTACT}.</p>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Use">
      <p>By creating an account you agree to these terms, our <Link to="/privacy" className="text-hud-cyan underline">Privacy Policy</Link> and the <Link to="/guidelines" className="text-hud-cyan underline">Community Guidelines</Link>.</p>

      <h2>Not medical advice</h2>
      <p>
        This service is for tracking your own symptoms and sharing experiences with other people. It does not diagnose, treat or provide medical advice, and members are
        not clinicians. Never ignore professional advice or delay seeking it because of something you read here. <strong>In an emergency, contact your local emergency number.</strong>
      </p>

      <h2>Who can use it</h2>
      <p>You must be 18 or older. Keep your password secret and tell us if you think your account has been misused.</p>

      <h2>Your content</h2>
      <ul>
        <li>You own what you post. You give us permission to store it and show it to other members as described in the Privacy Policy.</li>
        <li>You are responsible for what you post and must follow the Community Guidelines.</li>
        <li>You can delete your posts and your account at any time.</li>
      </ul>

      <h2>Moderation</h2>
      <p>We may hide or remove content, and suspend or close accounts, that break these terms or the guidelines, or that put people at risk.</p>

      <h2>No guarantees</h2>
      <p>The service is provided "as is". We work to keep it available and accurate but cannot guarantee it. The anatomy model is a general educational reference and does not represent every person. [Add limitation-of-liability and governing-law text as advised by counsel.]</p>

      <h2>Contact</h2>
      <p>{OPERATOR} · {CONTACT}</p>
    </LegalLayout>
  );
}
