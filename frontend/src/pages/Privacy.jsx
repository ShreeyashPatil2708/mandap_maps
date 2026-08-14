// Plain-language privacy policy. Reached from the home footer and the menu drawer.
export default function Privacy({ onBack }) {
  const heading = 'mb-1 font-sans text-[13px] font-semibold text-maroon';

  return (
    <div className="animate-fadeIn px-gutter-lg pb-nav-safe pt-6">
      <div
        className="cursor-pointer font-sans text-[13px] font-medium text-gold"
        onClick={onBack}
      >
        ← Back
      </div>

      <h1 className="mt-4 font-serif text-[26px] text-maroon">Privacy</h1>
      <div className="mt-1 font-devanagari text-[13px] text-maroon/40">गोपनीयता</div>

      <div className="mt-6 flex flex-col gap-5 font-sans text-[13px] leading-[1.7] text-maroon/70">
        <p>
          MandapMaps is a free companion for Pune&apos;s Ganeshotsav. We try to collect as
          little as possible. There are no accounts and no login.
        </p>

        <div>
          <div className={heading}>What we collect</div>
          <ul className="list-disc pl-5">
            <li>The questions you type into the Ask chat.</li>
            <li>
              Your approximate location, only if you use &quot;near me&quot;, to find nearby
              pandals. It is used for that request and not tied to any profile.
            </li>
            <li>
              A random id saved in your browser so the chat can remember the last few messages
              in a conversation.
            </li>
          </ul>
        </div>

        <div>
          <div className={heading}>What we do not collect</div>
          <p>
            No name, email, phone number, or payment details. Donations happen directly through
            your own UPI app.
          </p>
        </div>

        <div>
          <div className={heading}>AI answers</div>
          <p>
            The Ask chat is powered by AI and can be wrong. Please confirm timings, addresses,
            and directions with the mandal or official sources before relying on them.
          </p>
        </div>

        <div>
          <div className={heading}>Third parties</div>
          <p>
            To answer your questions, the text you send to the chat is processed by our AI
            provider (Groq). The app is served through standard web hosting and a content
            delivery network.
          </p>
        </div>

        <div>
          <div className={heading}>Keeping and deleting data</div>
          <p>
            Chat memory is short-lived and clears on its own. You can clear it anytime by
            ending the conversation.
          </p>
        </div>

        <p className="text-maroon/50">
          This page will be updated as the app grows.
        </p>
      </div>
    </div>
  );
}
