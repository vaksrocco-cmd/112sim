import { describe, expect, it } from 'vitest';
import { emptyCallState, fixedLines, nextMove, NO_UNDERSTANDING, type CallState, type Move, type Understanding } from './policy';
import { fallbackUnderstanding } from './understand';

const whitelist = ['Jääge tema juurde, ärge jätke teda üksi.', 'Tehke välisuks lahti, et kiirabi saaks sisse.', 'Öelge mulle kohe, kui midagi muutub.'];
const u = (p: Partial<Understanding>): Understanding => ({ ...NO_UNDERSTANDING, intent: 'info', ...p });

/** Mängib kõne läbi: iga samm on see, mida mudel helistaja lausest aru sai. */
function play(steps: Partial<Understanding>[], start: CallState = emptyCallState()): Move[] {
  const moves: Move[] = [];
  let state = start;
  for (const step of steps) {
    const m = nextMove(state, u(step), { whitelist });
    moves.push(m);
    state = m.state;
  }
  return moves;
}
const questions = (say: string) => (say.match(/\?/g) ?? []).length;

describe('dispatcher policy', () => {
  it('good call: asks where, dispatches as soon as incident and place are known, then confirms the address', () => {
    const m = play([
      { what: 'vanaema räägib segaselt' },
      { street: 'Männikäbi tee', house: '14', settlement: 'Haabneeme' },
      { confirmation: 'yes' },
      { conscious: 'yes', breathing: 'yes' },
    ]);
    expect(m[0].say).toBe('Mis aadressil see toimub?');
    expect(m[0].dispatch).toBeUndefined();
    expect(m[1].dispatch).toEqual({ address: 'Männikäbi tee 14, Haabneeme', summary: 'vanaema räägib segaselt' });
    expect(m[1].say).toBe('Abi on välja saadetud. Kordan: Männikäbi tee 14, Haabneeme. Kas sain õigesti aru?');
    expect(m[2].say).toBe('Kas ta on teadvusel?');
    expect(m[2].dispatch).toBeUndefined(); // abi saadetakse välja ainult üks kord
    expect(m[3].say).toBe('Öelge mulle kohe, kui midagi muutub.');
  });

  it('everything in the first sentence: dispatches at once', () => {
    const [m] = play([{ what: 'vanaema sai insuldi', street: 'Männikäbi tee', house: '14', settlement: 'Haabneeme', conscious: 'yes', breathing: 'yes' }]);
    expect(m.dispatch?.address).toBe('Männikäbi tee 14, Haabneeme');
    expect(m.say.startsWith('Abi on välja saadetud.')).toBe(true);
  });

  it('street without settlement: asks exactly for the missing part and never says help is on the way before dispatch', () => {
    const m = play([{ what: 'vanaema räägib segaselt', street: 'Männikäbi tee', house: '14' }, { intent: 'unclear' }, { settlement: 'Haabneeme' }]);
    expect(m[0].say).toBe('Mis linnas või asulas see on?');
    expect(m[0].dispatch).toBeUndefined();
    expect(m[0].say).not.toMatch(/välja saadetud|teel/);
    expect(m[1].say).toBe('Mis on linna või küla nimi?'); // ümber sõnastatud, mitte sama lause
    expect(m[1].emotion).toBe('kindel');
    expect(m[2].dispatch?.address).toBe('Männikäbi tee 14, Haabneeme');
  });

  it('vague location: narrows step by step instead of repeating the same request', () => {
    const m = play([{ what: 'mees kukkus' }, { intent: 'unclear' }, { intent: 'unclear' }, { intent: 'unclear' }]);
    const said = m.map((x) => x.say);
    expect(said).toEqual(['Mis aadressil see toimub?', 'Mis linnas või asulas see on?', 'Mis on tänava nimi?', 'Millist silti või maamärki te näete?']);
    expect(new Set(said).size).toBe(said.length);
  });

  it('only "send an ambulance": asks about the event, does not assume the content', () => {
    const m = play([{ intent: 'only_help_request' }]);
    expect(m[0].say).toBe('Kirjeldage palun, mis praegu toimub.');
  });

  it('agitated or off-topic caller: one calm line, then back to the needed question', () => {
    const m = play([{ what: 'vanaema räägib segaselt' }, { intent: 'agitated' }, { intent: 'offtopic' }]);
    expect(m[1].say).toBe('Ma aitan teid. Mis linnas või asulas see on?');
    expect(m[2].say).toBe('Ma kuulan teid. Täpsustame kõigepealt koha, kuhu abi vajate. Mis on tänava nimi?');
  });

  it('unheard part of the address is asked again neutrally and specifically', () => {
    const m = play([{ what: 'vanaema räägib segaselt', street: 'Männikäbi tee', settlement: 'Haabneeme', unheard: 'house' }]);
    expect(m[0].say).toBe('Ma ei kuulnud maja numbrit. Palun öelge see uuesti.');
  });

  it('wrong address on read-back: asks again from the start', () => {
    const m = play([{ what: 'x', street: 'Männi tee', house: '14', settlement: 'Haabneeme' }, { confirmation: 'no' }]);
    expect(m[1].state.street).toBeNull();
    expect(m[1].say).toBe('Mis aadressil see toimub?');
  });

  it('change during the call: acknowledged, passed on, vitals re-checked; a vague change is clarified', () => {
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true };
    const described = nextMove(known, u({ change: 'described' }), { whitelist });
    expect(described.say).toBe('Selge, annan selle kiirabile edasi. Kas ta on teadvusel?');
    const vague = nextMove(known, u({ change: 'vague' }), { whitelist });
    expect(vague.say).toBe('Mis nüüd muutus?');
  });

  it('never promises an arrival time', () => {
    const before = nextMove(emptyCallState(), u({ intent: 'asks_eta' }), { whitelist });
    expect(before.say).toBe('Saadan abi kohe, kui tean, kus te olete. Mis juhtus?');
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true };
    expect(nextMove(known, u({ intent: 'asks_eta' }), { whitelist }).say).toMatch(/^Abi on teel\. Täpset aega ma öelda ei saa\./);
  });

  it('gives only whitelisted instructions, one per turn, and ends with a clear signal on the cue', () => {
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true };
    const m = play([{}, {}, {}, {}], known);
    const allowed = new Set(fixedLines(whitelist));
    for (const x of m) expect(allowed.has(x.say)).toBe(true);
    expect(m[0].say).toBe('Öelge mulle kohe, kui midagi muutub.');
    expect(new Set(m.slice(0, 3).map((x) => x.say)).size).toBe(3);
    const end = nextMove(known, NO_UNDERSTANDING, { whitelist, cue: true });
    expect(end).toMatchObject({ say: 'Kiirabi on kohal. Võime kõne lõpetada.', endCall: true });
  });

  it('asks at most one question per turn and never repeats the previous line', () => {
    const scripts: Partial<Understanding>[][] = [
      [{ what: 'a' }, {}, {}, { settlement: 'B' }, {}, { street: 'A tee' }, { house: '1' }, {}, {}, { conscious: 'yes' }, {}, {}],
      [{ intent: 'agitated' }, { intent: 'offtopic' }, { what: 'a' }, { intent: 'asks_eta' }, { street: 'A tee', house: '1', settlement: 'B' }, { confirmation: 'yes' }, { change: 'described' }, {}],
    ];
    for (const script of scripts) {
      const m = play(script);
      m.forEach((x, i) => {
        expect(questions(x.say)).toBeLessThanOrEqual(1);
        if (i > 0) expect(x.say).not.toBe(m[i - 1].say);
      });
    }
  });

  it('fallback understanding keeps the call moving without the model', () => {
    const f = fallbackUnderstanding('Vanaema räägib segaselt, olen Männikäbi tee 14');
    expect(f).toMatchObject({ street: 'Männikäbi tee', house: '14' });
    expect(f.what).not.toBeNull();
    expect(fallbackUnderstanding('Jah, õige.').confirmation).toBe('yes');
  });
});
