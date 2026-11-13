'use client';
// Integraatori fail. Telefoni ja suure ekraani sünkroon: Supabase Realtime "broadcast" kanal toa koodi järgi.
// Andmebaasi ei kasutata: sõnumid liiguvad ainult ühendatud seadmete vahel ja neid ei salvestata.
// Võti on avalik (publishable) võti, mis ongi mõeldud brauserisse; salajasi võtmeid siin ei ole.
// Protokoll (Phoenix channels): https://supabase.com/docs/guides/realtime/protocol
import type { Outcome } from '../types';

export type RoomPhase = 'joined' | 'scene' | 'in_call' | 'ended' | 'report';

/** Telefoni saadetud hetkeseis. Telefon on tõe allikas; suur ekraan ainult näitab. */
export interface RoomState {
  phase: RoomPhase;
  scenarioId: string;
  stateId: string;
  callMs: number;
  /** Mida päästekorraldaja ja helistaja viimati ütlesid (subtiitrid saalile). */
  dispatcherLine?: string;
  callerLine?: string;
  dialed?: string;
  outcome?: Outcome | null;
  endingText?: string;
  reportId?: string;
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const roomsConfigured = () => Boolean(URL_BASE && KEY);

/** Loetav 5-kohaline kood ilma sarnaste märkideta (0/O, 1/I). */
export function newRoomCode(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => abc[b % abc.length]).join('');
}

export interface Room {
  send(state: RoomState): void;
  close(): void;
}

export function joinRoom(code: string, onState?: (s: RoomState) => void, onStatus?: (connected: boolean) => void): Room {
  const topic = `realtime:room-${code.toUpperCase()}`;
  let ws: WebSocket | null = null;
  let ref = 0;
  let joined = false;
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let last: RoomState | null = null;

  const push = (event: string, payload: unknown, t = topic) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ topic: t, event, payload, ref: String(++ref) }));
  const broadcast = (s: RoomState) => push('broadcast', { type: 'broadcast', event: 'state', payload: s });

  function connect() {
    if (closed || !roomsConfigured()) return;
    ws = new WebSocket(`${URL_BASE.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${KEY}&vsn=1.0.0`);
    ws.onopen = () => {
      push('phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: '' } } });
      heartbeat = setInterval(() => push('heartbeat', {}, 'phoenix'), 25000);
    };
    ws.onmessage = (e) => {
      let m: { event?: string; topic?: string; payload?: { status?: string; event?: string; payload?: RoomState } };
      try {
        m = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (m.topic !== topic) return;
      if (m.event === 'phx_reply' && m.payload?.status === 'ok' && !joined) {
        joined = true;
        onStatus?.(true);
        if (last) broadcast(last); // saada viimane seis kohe pärast (taas)ühendust
      } else if (m.event === 'broadcast' && m.payload?.event === 'state' && m.payload.payload) {
        onState?.(m.payload.payload);
      }
    };
    ws.onclose = () => {
      joined = false;
      onStatus?.(false);
      if (heartbeat) clearInterval(heartbeat);
      if (!closed) retry = setTimeout(connect, 1500);
    };
    ws.onerror = () => ws?.close();
  }
  connect();

  return {
    send(state) {
      last = state;
      if (joined) broadcast(state);
    },
    close() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (retry) clearTimeout(retry);
      ws?.close();
    },
  };
}
