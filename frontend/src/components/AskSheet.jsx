import { useEffect, useRef, useState } from 'react';
import { callChatbotAPI } from '../services/chatbot.js';

const GREETING =
  "Ganpati Bappa Morya! Ask me anything about Pune's Ganpatis, aarti timings, history, or help planning your darshan.";

// Chat bottom sheet opened from the "Ask" tab. Slides up above the bottom nav.
// ganpatiId carries the current Ganpati as context (null when opened from a
// page that is not a detail view). The conversation resets each time it opens.
export default function AskSheet({ onClose, ganpatiId }) {
  const [messages, setMessages] = useState([{ from: 'bot', text: GREETING }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [...prev, { from: 'user', text }]);
    const reply = await callChatbotAPI(text, ganpatiId);
    setMessages((prev) => [...prev, { from: 'bot', text: reply }]);
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

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-gutter-lg py-4">
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-card px-3.5 py-2.5 font-sans text-[14px] leading-[1.5] ${
                    m.from === 'user'
                      ? 'bg-maroon text-light'
                      : 'bg-surface text-maroon/80'
                  }`}
                >
                  {m.text}
                </div>
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
            onClick={send}
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
