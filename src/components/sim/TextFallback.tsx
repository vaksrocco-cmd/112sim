'use client';
// Tekstirežiim: kui mikrofon ei tööta (või laval on liiga lärmakas), saab laused trükkida.
import { useState } from 'react';

export function TextFallback({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState('');
  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
      }}
    >
      <input
        className="h-12 min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-4 text-base text-fg placeholder:text-subtle"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Või kirjuta siia"
        aria-label="Kirjuta oma lause"
        enterKeyHint="send"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label="Saada"
        className="gr-motion flex size-12 flex-none items-center justify-center rounded-full bg-surface-2 text-fg hover:bg-border disabled:pointer-events-none disabled:opacity-45"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
