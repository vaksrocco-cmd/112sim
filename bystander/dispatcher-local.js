// Scripted dispatcher. Same contract as /api/dispatcher, used when the Grok
// endpoint is missing or fails, so the demo always runs.

import { CPR_INSTRUCTION } from './scenarios.js';

const WHAT = /collaps|fell|fall|faint|passed out|heart|unconscious|on the ground|dropped|not moving|chest|lying/;
const UNCONSCIOUS =
  /unconscious|unrespons|not respon|no respon|isn'?t respon|not awake|isn'?t awake|not conscious|doesn'?t (react|respond|wake)|won'?t wake|no reaction|not reacting|passed out|not moving/;
const NOT_BREATHING =
  /not breathing|isn'?t breathing|no breath|gasp|not normal|abnormal|snor|irregular|barely|doesn'?t breathe|stopped breathing|can'?t tell|chest (isn'?t|is not|barely) mov/;
const BREATHING = /\b(is|he'?s|still) breathing\b|breathing (fine|normally|ok)|\bbreathes\b/;
const NO = /^\s*(no|nope|nah|not really|negative|i don'?t think so)\b/;
const YES = /^\s*(yes|yeah|yep|yup|i think so|he is|he does)\b/;

export function localDispatcher({ messages, facts, lastAsked, scenario }) {
  const text = (messages.filter((m) => m.role === 'caller').at(-1)?.text || '').toLowerCase();
  const f = { ...facts };
  const place = scenario.location;

  if (WHAT.test(text) || (lastAsked === 'what' && text.length > 8)) f.what = true;

  if (place.keywords.some((k) => text.includes(k)) || (lastAsked === 'location' && text.length > 5)) {
    f.location = true;
  }

  if (UNCONSCIOUS.test(text) || (lastAsked === 'conscious' && NO.test(text))) f.conscious = 'no';
  else if (lastAsked === 'conscious' && YES.test(text)) f.conscious = 'yes';

  let insisted = false;
  if (NOT_BREATHING.test(text) || (lastAsked === 'breathing' && NO.test(text))) {
    f.breathing = 'abnormal';
  } else if (BREATHING.test(text) || (lastAsked === 'breathing' && YES.test(text))) {
    insisted = f.breathing === 'normal';
    f.breathing = 'normal';
  }

  if (!f.what) return reply(f, 'what', 'Tell me exactly what happened.');
  if (!f.location) return reply(f, 'location', 'Okay. Where exactly are you? Give me the address or a landmark.');
  if (f.conscious === 'unknown') {
    return reply(f, 'conscious', 'Help is being sent. Is he awake? Does he react when you shake his shoulders and talk to him?');
  }
  if (f.breathing === 'unknown') {
    return reply(f, 'breathing', 'Is he breathing normally? Tilt his head back and watch his chest for ten seconds.');
  }
  if (f.breathing === 'normal' && !insisted) {
    return reply(f, 'breathing', 'Look closely. Is his chest rising regularly, or is it only an occasional gasp or snoring sound?');
  }
  const lead =
    f.breathing === 'normal'
      ? 'Listen to me. Occasional gasps are not normal breathing. '
      : 'An ambulance is on its way to you. ';
  return { say: lead + CPR_INSTRUCTION, facts: f, asked: null, action: 'start_cpr' };
}

function reply(facts, asked, say) {
  return { say, facts, asked, action: 'none' };
}
