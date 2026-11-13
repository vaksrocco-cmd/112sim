// Promptide laadimine serveris. Failid on samas kaustas.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'src/lib/agents/prompts');

export function loadPrompt(name: 'dispatcher' | 'extractor' | 'analyst', vars: Record<string, string> = {}): string {
  const raw = readFileSync(path.join(DIR, `${name}.et.md`), 'utf8').replace(/^<!--.*?-->\n/s, '');
  return raw.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
}
