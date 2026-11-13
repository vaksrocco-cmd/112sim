// HÄÄL (Sander, feat/voice). KNOWLEDGE.md 9.1: päästekorraldaja üks vastus voona (OpenAI) (kaskaadhääle ja tekstirežiimi jaoks).
// Päästekorraldaja EI tea tõde: kasutame ainult avalikku stsenaariumi ja dispatcherWhitelist'i.
//
// Päring:  POST { scenarioId, messages: [{ role: 'user' | 'assistant', content }] }
//          (helistaja laused = user, päästekorraldaja = assistant, süsteemi märguanne = user "[SÜSTEEM] ...")
// Vastus:  NDJSON voog, üks JSON rea kohta:
//          {"type":"text","delta":"..."}  |  {"type":"tool","name":"dispatch_ambulance","input":{...}}
//          {"type":"done"}  |  {"type":"error","message":"..."}
import { z } from 'zod';
import { loadPrompt } from '@/lib/agents/prompts';
import { llmStream, type LlmMessage, type LlmTool } from '@/lib/llm';
import { getPublicScenario } from '@/lib/scenarios';

export const maxDuration = 30;

const Body = z.object({
  scenarioId: z.string(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) })).min(1),
  /** Kas kiirabi on selles kõnes juba välja saadetud (klient jätab meelde; ajalugu on ainult tekst). */
  dispatched: z.boolean().optional(),
});

const TOOLS: LlmTool[] = [
  {
    name: 'dispatch_ambulance',
    description: 'Saada kiirabi. Kutsu kohe, kui tead, mis juhtus ja kus.',
    parameters: {
      type: 'object',
      properties: {
        priority: { type: 'string', enum: ['A', 'B', 'C'] },
        address: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['priority', 'address', 'summary'],
      additionalProperties: false,
    },
  },
  {
    name: 'end_call',
    description: 'Lõpeta kõne. Kutsu ainult pärast süsteemi märguannet, et abi on kohal.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
];

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('bad_request', { status: 400 });
  const scenario = getPublicScenario(parsed.data.scenarioId);
  if (!scenario) return new Response('unknown_scenario', { status: 400 });

  const { dispatched } = parsed.data;
  const system =
    loadPrompt('dispatcher', {
      dispatcherWhitelist: scenario.dispatcherWhitelist.map((l) => `- ${l}`).join('\n'),
    }) + (dispatched ? '\n\nOLEK: kiirabi on JUBA välja saadetud. Ära saada seda uuesti; anna juhiseid ja jää liinile.' : '');
  // Kõne algab päästekorraldaja tervitusega; anna mudelile ette, et helistaja on liinil.
  const messages: LlmMessage[] =
    parsed.data.messages[0].role === 'assistant'
      ? [{ role: 'user', content: '(Helistaja valis 112. Kõne algab.)' }, ...parsed.data.messages]
      : parsed.data.messages;
  const tools = dispatched ? TOOLS.filter((t) => t.name !== 'dispatch_ambulance') : TOOLS;

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      try {
        for await (const delta of llmStream({
          tier: 'fast',
          system,
          messages,
          effort: 'low',
          maxTokens: 1024,
          tools,
          signal: req.signal,
          onToolUse: (name, input) => send({ type: 'tool', name, input }),
        })) {
          send({ type: 'text', delta });
        }
        send({ type: 'done' });
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}
