import { useEffect, useRef, useState } from 'react';
import { streamChatbotMessage } from '../services/chatbot.js';

const GREETING =
  "Ganpati Bappa Morya! Ask me anything about Pune's Ganpatis, aarti timings, history, or help planning your darshan.";

// Google Maps directions URL builder, same no-API-key scheme used
// elsewhere in the app (see pages/Detail.jsx and pages/Route.jsx). Origin
// is left unset so Maps starts from the user's current location.
function directionsUrl(stops) {
  const point = (s) => (s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : s.name);
  const destination = encodeURIComponent(point(stops[stops.length - 1]));
  const waypoints = stops
    .slice(0, -1)
    .map((s) => encodeURIComponent(point(s)))
    .join('|');
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

// Very small markdown-lite renderer for chat bubbles: preserves line
// breaks (the backend sends pointwise, emoji-prefixed lines — see
// chatbot/app/core/llm.py SYSTEM_PROMPT) and bolds **text**. Deliberately
// not a full markdown parser; the backend's formatting rules are simple
// by design, so this only needs to match them.
function renderMessageText(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
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

function ActionChip({ action, onTap }) {
  return (
    <button
      type="button"
      onClick={() => onTap(action.query)}
      className="flex-none cursor-pointer rounded-pill border border-maroon/15 bg-cream px-3 py-1.5 font-sans text-[12.5px] font-medium text-maroon hover:bg-maroon/5"
    >
      {action.emoji} {action.label}
    </button>
  );
}

function LocationCard({ location, ganpatis, onOpenGanpati }) {
  const match = ganpatis?.find((g) => g.name?.toLowerCase() === location.name?.toLowerCase());

  const openMap = () => {
    if (match && onOpenGanpati) {
      onOpenGanpati(match.id);
    } else if (location.maps_url) {
      window.open(location.maps_url, '_blank', 'noopener');
    }
  };

  const getDirections = () => {
    window.open(directionsUrl([location]), '_blank', 'noopener');
  };

  return (
    <div className="mt-1.5 max-w-[80%] rounded-card border border-maroon/[0.08] bg-cream px-3.5 py-3">
      {location.image_url && (
        <img
          src={location.image_url}
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
  const stops = [{ name: plan.start_name, lat: plan.start_lat, lng: plan.start_lng }, ...plan.stops];
  return (
    <button
      type="button"
      onClick={() => window.open(directionsUrl(stops), '_blank', 'noopener')}
      className="mt-1.5 max-w-[80%] cursor-pointer rounded-pill bg-gold px-4 py-2 text-center font-sans text-[13px] font-semibold text-maroon hover:bg-gold-dark"
    >
      🧭 Get Directions for this route
    </button>
  );
}

// Chat bottom sheet opened from the "Ask" tab. Slides up above the bottom nav.
// The conversation resets each time it opens. ganpatis + onOpenGanpati (both
// optional) let a "View on Map" tap jump straight to that pandal's in-app
// Detail page instead of always leaving the app for Google Maps.
export default function AskSheet({ onClose, ganpatis, onOpenGanpati }) {
  const [messages, setMessages] = useState([{ from: 'bot', text: GREETING }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { from: 'user', text }, { from: 'bot', text: '', pending: true }]);

    await streamChatbotMessage(
      text,
      (textSoFar) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], text: textSoFar, pending: false };
          return next;
        });
      },
      (meta) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], meta, pending: false };
          return next;
        });
        setSending(false);
      }
    );
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') send();
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
            <div className="mt-0.5 font-devanagari text-[13px] text-maroon/40">मंडपमॅप्सला विचारा</div>
          </div>
          <div
            className="-mr-1 cursor-pointer p-1 text-[22px] leading-none text-maroon/40 hover:text-maroon"
            onClick={onClose}
          >
            ✕
          </div>
        </div>

        {/* AI disclaimer */}
        <div className="px-gutter-lg pt-1.5 font-sans text-[11px] leading-snug text-maroon/40">
          Ekdanta is an AI assistant and can be wrong. Please confirm timings and addresses
          with the mandal.
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-gutter-lg py-4">
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.from === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-card px-3.5 py-2.5 font-sans text-[14px] leading-[1.5] ${
                    m.from === 'user'
                      ? 'bg-maroon text-light'
                      : 'bg-surface text-maroon/80'
                  }`}
                >
                  {m.pending && !m.text ? (
                    <span className="text-maroon/40">🤖 Thinking...</span>
                  ) : (
                    renderMessageText(m.text)
                  )}
                </div>

                {m.meta?.location && (
                  <LocationCard location={m.meta.location} ganpatis={ganpatis} onOpenGanpati={onOpenGanpati} />
                )}

                {m.meta?.plan && <PlanDirectionsButton plan={m.meta.plan} />}

                {!!m.meta?.suggested_actions?.length && (
                  <div className="mt-2 flex max-w-[85%] flex-wrap gap-1.5">
                    {m.meta.suggested_actions.map((a, j) => (
                      <ActionChip key={j} action={a} onTap={send} />
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
