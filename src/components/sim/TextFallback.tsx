'use client';
// Varuplaan laval: kui mikrofon ei tööta, saab helistaja lauseid trükkida.
import { useState } from 'react';
import { Button, Stack } from '@/components/ui';

export function TextFallback({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
      }}
    >
      <Stack direction="row" gap={2}>
        <input
          className="flex-1 rounded-card border border-border bg-surface-2 px-3 py-2 text-fg"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Trüki, kui mikrofon ei tööta"
          disabled={disabled}
        />
        <Button type="submit" variant="secondary" disabled={disabled}>
          Saada
        </Button>
      </Stack>
    </form>
  );
}
