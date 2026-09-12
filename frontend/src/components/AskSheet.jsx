import { useEffect, useRef, useState } from 'react';
import { streamChatbotMessage, resetSessionId } from '../services/chatbot.js';
import { directionsUrl, safeHttpUrl } from '../data/helpers.js';

const GREETING =
  "Ganpati Bappa Morya! Ask me anything about Pune's Ganpatis, aarti timings, history, or help planning your darshan.";

const MESSAGES_KEY = 'mm_chat_messages';
// Keep only the most recent messages on disk so the stored thread can't grow
// until it hits the storage quota.
const MAX_PERSISTED_MESSAGES = 50;

// Directions open in walking mode (suits the old-Pune peth circuit). A single
// stop has no origin, so Maps starts from the user's current location; a
// multi-stop plan passes its start point as an explicit origin, because Maps
// renders a blank screen for a waypoints URL with no origin.
const WALKING = { travelmode: 'walking' };

// Very small markdown-lite renderer for chat bubbles: preserves line
// breaks (the backend sends pointwise, emoji-prefixed lines, see
// chatbot/app/core/llm.py SYSTEM_PROMPT) and bolds **text**. Deliberately
// not a full markdown parser; the backend's formatting rules are simple
// by design, so this only needs to match them. Em-dashes (from the dataset or
// the model's own style) are swapped for commas so none reach the screen.
function renderMessageText(text) {
  const lines = text.replace(/\s*—\s*/g, ', ').split('\n');
  return lines.map((line, i) => {
    const parts = line
      .split(/(\*\*[^*]+\*\*)/g)
      .map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          part
        )
      );
    return (
      <span key={i}>
        {parts}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

// A follow-up chip. A `nav` action (e.g. "Explore Mandals") navigates in-app;
// every other chip prefills its question into the input instead of firing it,
// so nothing sends unexpectedly and the user can tweak it first (e.g. adding
// a start point or time budget to "Plan my darshan route").
function ActionChip({ action, onPrefill, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => (action.nav ? onNavigate(action.nav) : onPrefill(action.query))}
      className="flex-none cursor-pointer rounded-pill border border-maroon/15 bg-cream px-3 py-1.5 font-sans text-[12.5px] font-medium text-maroon hover:bg-maroon/5"
    >
      {action.emoji} {action.label}
    </button>
  );
}

function LocationCard({ location, ganpatis, onOpenGanpati }) {
  const match = ganpatis?.find((g) => g.name?.toLowerCase() === location.name?.toLowerCase());
  // URLs come from the API; only ever open or embed plain http(s) ones.
  const mapsUrl = safeHttpUrl(location.maps_url);
  const imageUrl = safeHttpUrl(location.image_url);

  const openMap = () => {
    if (match && onOpenGanpati) {
      onOpenGanpati(match.id);
    } else if (mapsUrl) {
      window.open(mapsUrl, '_blank', 'noopener');
    }
  };

  const getDirections = () => {
    window.open(directionsUrl([location], WALKING), '_blank', 'noopener');
  };

  return (
    <div className="mt-1.5 max-w-[80%] rounded-card border border-maroon/[0.08] bg-cream px-3.5 py-3">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={location.name}
          className="mb-2 h-32 w-full rounded-[10px] object-cover"
        />
      )}
      <div className="mb-2 font-serif text-[15px] text-maroon">🛕 {location.name}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openMap}
          className="flex-1 cursor-pointer rounded-pill bg-surface px-3 py-2 text-center font-sans text-[12.5px] font-semibold text-maroon hover:bg-maroon/5"
        >
          📍 View on Map
        </button>
        <button
          type="button"
          onClick={getDirections}
          className="flex-1 cursor-pointer rounded-pill bg-gold px-3 py-2 text-center font-sans text-[12.5px] font-semibold text-maroon hover:bg-gold-dark"
        >
          🧭 Get Directions
        </button>
      </div>
    </div>
  );
}

function PlanDirectionsButton({ plan }) {
  const stops = [
    { name: plan.start_name, lat: plan.start_lat, lng: plan.start_lng },
    ...plan.stops,
  ];
  return (
    <button
      type="button"
      onClick={() =>
        window.open(
          directionsUrl(stops, { ...WALKING, originFromFirst: true }),
          '_blank',
          'noopener'
        )
      }
      className="mt-1.5 max-w-[80%] cursor-pointer rounded-pill bg-gold px-4 py-2 text-center font-sans text-[13px] font-semibold text-maroon hover:bg-gold-dark"
    >
      🧭 Get Directions for this route
    </button>
  );
}

// A stored message is only restored if it has the shape the renderer needs,
// so a corrupt or hand-edited entry can't crash the sheet.
function isValidMessage(m) {
  return m && (m.from === 'user' || m.from === 'bot') && typeof m.text === 'string';
}

// Load the persisted thread, or fall back to a fresh greeting. Wrapped in a
// try/catch so a corrupt or blocked localStorage never stops the sheet opening.
function loadMessages() {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(isValidMessage).slice(-MAX_PERSISTED_MESSAGES);
      if (valid.length) return valid;
    }
  } catch {
    // ignore and fall through to the greeting
  }
  return [{ from: 'bot', text: GREETING }];
}

// Chat bottom sheet opened from the "Ask" tab. Slides up above the bottom nav.
// The conversation persists across close/reopen and page refresh via
// localStorage (see loadMessages / the persist effect); "Clear chat" resets it.
// ganpatis + onOpenGanpati (both optional) let a "View on Map" tap jump
// straight to that pandal's in-app Detail page instead of always leaving the
// app for Google Maps. onExplore navigates to the in-app Explore page.
export default function AskSheet({ onClose, ganpatis, onOpenGanpati, onExplore }) {
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // Controller for the in-flight answer, so closing the sheet or clearing the
  // chat cancels it instead of letting it write into the new thread.
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Lock the page behind the sheet while it's open, so scrolling inside the
  // chat can't bleed through and drag the Home page (and the sheet with it)
  // around underneath. Restored on close.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Persist the thread, minus any transient in-flight bot placeholder, so a
  // half-sent turn is never restored as an empty "Thinking..." bubble.
  useEffect(() => {
    try {
      const persistable = messages
        .filter((m) => !(m.pending && !m.text))
        .slice(-MAX_PERSISTED_MESSAGES)
        .map((m) => {
          const copy = { ...m };
          delete copy.pending;
          return copy;
        });
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(persistable));
    } catch {
      // storage full or unavailable; persistence is best-effort
    }
  }, [messages]);

  const prefill = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const navigate = (dest) => {
    if (dest === 'explore') onExplore?.();
  };

  const clearChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    resetSessionId();
    setInput('');
    setSending(false);
    setMessages([{ from: 'bot', text: GREETING }]);
  };

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { from: 'user', text },
      { from: 'bot', text: '', pending: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChatbotMessage(
      text,
      (textSoFar) => {
        if (controller.signal.aborted) return;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], text: textSoFar, pending: false };
          return next;
        });
      },
      (meta) => {
        if (controller.signal.aborted) return;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], meta, pending: false };
          return next;
        });
      },
      { signal: controller.signal }
    );

    // Only the still-current request may clear the busy flag (a cleared or
    // closed chat has already reset it).
    if (abortRef.current === controller) {
      abortRef.current = null;
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    // Marathi/Hindi keyboards compose words through an IME; Enter there
    // confirms the composition and must not send a half-typed message.
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
  };

  return (
    <div className="fixed inset-0 z-[95] flex" onClick={onClose}>
      <div className="absolute inset-0 bg-maroon/45" />
      <div
        className="absolute inset-x-0 top-[8vh] bottom-[calc(56px_+_env(safe-area-inset-bottom))] mx-auto flex w-full max-w-[480px] animate-slideUp flex-col rounded-t-sheet bg-cream"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mx-auto mt-3 h-1 w-10 flex-none rounded-[2px] bg-maroon/10" />

        {/* Header */}
        <div className="flex items-start justify-between px-gutter-lg pt-3">
          <div>
            <div className="font-serif text-xl text-maroon">Ask MandapMaps</div>
            <div className="mt-0.5 font-devanagari text-[13px] text-maroon/40">
              मंडपमॅप्सला विचारा
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={clearChat}
                className="cursor-pointer rounded-pill px-2 py-1 font-sans text-[12px] font-medium text-maroon/40 hover:bg-maroon/5 hover:text-maroon"
              >
                Clear chat
              </button>
            )}
            <div
              className="-mr-1 cursor-pointer p-1 text-[22px] leading-none text-maroon/40 hover:text-maroon"
              onClick={onClose}
            >
              ✕
            </div>
          </div>
        </div>

        {/* AI disclaimer */}
        <div className="px-gutter-lg pt-1.5 font-sans text-[11px] leading-snug text-maroon/40">
          Ekdanta is an AI assistant and can be wrong. Please confirm timings and addresses with the
          mandal.
        </div>

        {/* Chat area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-gutter-lg py-4"
        >
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.from === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-card px-3.5 py-2.5 font-sans text-[14px] leading-[1.5] ${
                    m.from === 'user' ? 'bg-maroon text-light' : 'bg-surface text-maroon/80'
                  }`}
                >
                  {m.pending && !m.text ? (
                    <span className="text-maroon/40">🤖 Thinking...</span>
                  ) : (
                    renderMessageText(m.text)
                  )}
                </div>

                {m.meta?.location && (
                  <LocationCard
                    location={m.meta.location}
                    ganpatis={ganpatis}
                    onOpenGanpati={onOpenGanpati}
                  />
                )}

                {m.meta?.plan && <PlanDirectionsButton plan={m.meta.plan} />}

                {!!m.meta?.suggested_actions?.length && (
                  <div className="mt-2 flex max-w-[85%] flex-wrap gap-1.5">
                    {m.meta.suggested_actions.map((a, j) => (
                      <ActionChip key={j} action={a} onPrefill={prefill} onNavigate={navigate} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="sticky bottom-0 flex flex-none items-center gap-2.5 border-t border-maroon/[0.08] bg-cream px-gutter py-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question..."
            className="min-w-0 flex-1 rounded-pill border-2 border-maroon/10 bg-surface px-4 py-2.5 font-sans text-[14px] text-maroon outline-none focus:border-gold"
          />
          <div
            className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full bg-gold hover:bg-gold-dark"
            onClick={() => send()}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 9L16 3L10 16L8.5 10.5L2 9Z"
                stroke="#6B1E2E"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
