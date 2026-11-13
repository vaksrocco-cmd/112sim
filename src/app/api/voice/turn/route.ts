// HÄÄL (Sander, feat/voice). KNOWLEDGE.md 9.1: päästekorraldaja üks vastus Claude'ilt voona.
// Päästekorraldaja EI tea tõde: kasutame ainult avalikku stsenaariumi ja dispatcherWhitelist'i.
//
// Päring:  POST { scenarioId, messages: [{ role: 'user' | 'assistant', content }] }
//          (helistaja laused = user, päästekorraldaja = assistant, süsteemi märguanne = user "[SÜSTEEM] ...")
// Vastus:  NDJSON voog, üks JSON rea kohta:
//          {"type":"text","delta":"..."}  |  {"type":"tool","name":"dispatch_ambulance","input":{...}}
//          {"type":"done"}  |  {"type":"error","message":"..."}
import { z } from 'zod';
import { loadPrompt } from '@/lib/agents/prompts';
import { claudeStream, models } from '@/lib/llm/claude';
import { getPublicScenario } from '@/lib/scenarios';

export const maxDuration = 30;

const Body = z.object({
  scenarioId: z.string(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) })).min(1),
});

const TOOLS = [
  {
    name: 'dispatch_ambulance',
    description: 'Saada kiirabi. Kutsu kohe, kui tead, mis juhtus ja kus.',
    input_schema: {
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
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('bad_request', { status: 400 });
  const scenario = getPublicScenario(parsed.data.scenarioId);
  if (!scenario) return new Response('unknown_scenario', { status: 400 });

  const system = loadPrompt('dispatcher', {
    dispatcherWhitelist: scenario.dispatcherWhitelist.map((l) => `- ${l}`).join('\n'),
  });

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      try {
        for await (const delta of claudeStream({
          model: models.fast(),
          system,
          messages: parsed.data.messages,
          maxTokens: 300,
          tools: TOOLS,
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
