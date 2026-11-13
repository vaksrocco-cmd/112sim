// AJU (Ats, feat/brain). KNOWLEDGE.md 9.3: lõputekstid mallidest, mitte LLM-ist.
import type { OutcomeReason, OutcomeResult } from './outcome';

const TEXT: Record<OutcomeReason, string> = {
  no_dispatch: 'Kõne katkes enne, kui abi jõuti välja saata.',
  location_incomplete: 'Kiirabi sõitis välja, aga otsis õiget maja 7 minutit, sest aadress jäi poolikuks.',
  change_unreported:
    'Kiirabi jõudis kohale, aga ei teadnud, et seisund vahepeal halvenes, ja valmistus kergemaks juhtumiks.',
  location_late: 'Abi jõudis kohale, aga aadressi selgitamisele kulus kaks minutit.',
};

/** Hea lõpu korral teksti ei ole: mängib END_GOOD klipp. */
export function buildEndingText(o: OutcomeResult): string {
  return o.reasons.length ? TEXT[o.reasons[0]] : '';
}
