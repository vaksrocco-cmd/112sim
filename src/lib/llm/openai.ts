// Integraatori fail: OpenAI API (ainult serveris). KNOWLEDGE.md D-13.
// OpenAI teeb kõik OTSUSED: päästekorraldaja vastused, kohtuniku faktid, analüütiku tagasiside.
// Dokumentatsioon:
//   https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
//   https://developers.openai.com/api/docs/guides/structured-outputs
import { createChatClient } from './compat';

export const openai = createChatClient({
  name: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  keyEnv: 'OPENAI_API_KEY',
  // Kõik mudelid ei toeta kõiki väärtusi: saadame ainult siis, kui see on keskkonnamuutujaga sisse lülitatud.
  // OPENAI_FAST_REASONING_EFFORT kehtib ainult kiirele mudelile: tark mudel ei toeta väärtust 'none' ja vastas sellega 400.
  effort: (requested, model) => (model === openaiModels.fast() ? process.env.OPENAI_FAST_REASONING_EFFORT || undefined : requested),
  // gpt-6.1-terra: "Function tools with reasoning_effort are not supported ... set reasoning_effort to 'none'".
  // Päästekorraldaja (voog + tööriistad) käib seega ilma mõtlemiseta, mis on ka kõige kiirem.
  toolEffort: () => process.env.OPENAI_TOOLS_REASONING_EFFORT || 'none',
});

export const openaiModels = {
  /** Kiire: kohtunik ja päästekorraldaja. Odavam variant: gpt-6-luna. */
  fast: () => process.env.OPENAI_FAST_MODEL || 'gpt-6.1-terra',
  /** Tark: analüütik. */
  smart: () => process.env.OPENAI_SMART_MODEL || 'gpt-6.1-sol',
};
