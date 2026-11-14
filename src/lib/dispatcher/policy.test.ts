import { describe, expect, it } from 'vitest';
import { emptyCallState, fixedLines, nextMove, NO_UNDERSTANDING, type CallState, type Move, type Understanding } from './policy';
import { demoQuick, parseAddress } from './quick';
import { fallbackUnderstanding, quickUnderstanding } from './understand';

const whitelist = [
  'Jääge tema juurde, ärge jätke teda üksi.',
  'Tehke välisuks lahti, et kiirabi saaks sisse.',
  'Öelge mulle kohe, kui midagi muutub.',
  'Pange ta ettevaatlikult külili lamama.',
  'Jälgige tema hingamist ja öelge kohe, kui see muutub.',
];
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
      {},
      { conscious: 'yes', breathing: 'yes' },
      {},
    ]);
    expect(m[0].say).toBe('Mis aadressil see toimub?');
    expect(m[0].dispatch).toBeUndefined();
    expect(m[1].dispatch).toEqual({ address: 'Männikäbi tee 14, Haabneeme', summary: 'vanaema räägib segaselt' });
    expect(m[1].say).toBe('Abi on välja saadetud. Kordan: Männikäbi tee 14, Haabneeme. Kas sain õigesti aru?');
    expect(m[2].say).toBe('Aitäh. Kui vana ta on?');
    expect(m[2].dispatch).toBeUndefined(); // abi saadetakse välja ainult üks kord
    expect(m[3].say).toBe('Kas ta on teadvusel?');
    expect(m[4].say).toBe('Millal see algas?');
    expect(m[5].say).toBe('Kas ta saab mõlemat kätt tõsta?');
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

  it('demo script: fixed order what -> where -> read-back -> age -> conscious -> breathing -> onset, never stuck on vitals', () => {
    const m = play([{ what: 'vanaema räägib segaselt' }, { street: 'Männikäbi tee', house: '14', settlement: 'Haabneeme' }, { confirmation: 'yes' }, {}, {}, {}, {}, {}, {}, {}]);
    expect(m.map((x) => x.say)).toEqual([
      'Mis aadressil see toimub?',
      'Abi on välja saadetud. Kordan: Männikäbi tee 14, Haabneeme. Kas sain õigesti aru?',
      'Aitäh. Kui vana ta on?',
      'Kas ta on teadvusel?',
      'Küsin seda, et kiirabi teaks, milleks valmistuda. Kas ta reageerib, kui te temaga räägite?',
      'Kas ta hingab normaalselt?',
      'Vaadake, kas ta rind liigub. Kas ta hingab?',
      'Millal see algas?',
      'Kas ta saab mõlemat kätt tõsta?',
      'Öelge mulle kohe, kui midagi muutub.',
    ]);
  });

  it('dispatches even if the incident was never described, once the address is known', () => {
    const m = play([{ intent: 'unclear' }, { intent: 'unclear' }, { intent: 'unclear' }, { street: 'A tee', house: '1', settlement: 'B' }]);
    expect(m[3].dispatch?.address).toBe('A tee 1, B');
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
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true, asked: { age: 1, onset: 1, arms: 1 } };
    const described = nextMove(known, u({ change: 'described' }), { whitelist });
    expect(described.say).toBe('Annan selle kohe kiirabile edasi. Kas ta on teadvusel?');
    const vague = nextMove(known, u({ change: 'vague' }), { whitelist });
    expect(vague.say).toBe('Mis nüüd muutus?');
  });

  it('never promises an arrival time', () => {
    const before = nextMove(emptyCallState(), u({ intent: 'asks_eta' }), { whitelist });
    expect(before.say).toBe('Saadan abi kohe, kui tean, kus te olete. Mis juhtus?');
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true, asked: { age: 1, onset: 1, arms: 1 } };
    expect(nextMove(known, u({ intent: 'asks_eta' }), { whitelist }).say).toMatch(/^Abi on teel\. Täpset aega ma öelda ei saa\./);
  });

  it('gives only whitelisted instructions, one per turn, and ends with a clear signal on the cue', () => {
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true, asked: { age: 1, onset: 1, arms: 1 } };
    const m = play([{}, {}, {}, {}], known);
    const allowed = new Set(fixedLines(whitelist));
    // Iga voor koosneb ainult kindlatest lausetest (juhis lubatud loendist, kontrollküsimus või kinnitus).
    const sentences = (say: string) => say.match(/[^.?!]+[.?!]+/g)?.map((x) => x.trim()) ?? [];
    for (const x of m) for (const part of sentences(x.say)) expect(allowed.has(part)).toBe(true);
    expect(m[0].say).toBe('Öelge mulle kohe, kui midagi muutub.');
    expect(new Set(m.slice(0, 3).map((x) => x.say)).size).toBe(3);
    // Juhist, mida stsenaarium ei luba, ei anta kunagi.
    const long = play(Array.from({ length: 30 }, () => ({})), known).map((x) => x.say).join(' ');
    expect(long).not.toMatch(/pingul riided|ravimid ja isikut|nõrka kätt/);
    const end = nextMove(known, NO_UNDERSTANDING, { whitelist, cue: true });
    expect(end).toMatchObject({ say: 'Kiirabi on kohal. Aitäh, et jäite liinile. Võime kõne lõpetada.', endCall: true });
  });

  it('keeps talking for a long call: reassures, checks back, never says the same turn twice in a row', () => {
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true, asked: { age: 1, onset: 1, arms: 1 } };
    const m: Move[] = [];
    let state = known;
    for (let i = 0; i < 40; i++) {
      const move = nextMove(state, i % 2 ? u({}) : NO_UNDERSTANDING, { whitelist, idle: i % 2 === 0 });
      m.push(move);
      state = move.state;
    }
    m.forEach((x, i) => {
      expect(x.say).not.toBe('');
      if (i > 0) expect(x.say).not.toBe(m[i - 1].say);
      expect(questions(x.say)).toBeLessThanOrEqual(1);
    });
    const all = m.map((x) => x.say).join(' ');
    expect(all).toMatch(/Te saate hästi hakkama\./);
    expect(all).toMatch(/Abi on teel\./);
    expect(all).toMatch(/Kas saite ukse lahti\?/);
  });

  it('collapse: passes it on, asks about breathing, gives the side position and keeps watching', () => {
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true, asked: { age: 1, onset: 1, arms: 1 } };
    const m = play([{ change: 'described', conscious: 'no' }, { breathing: 'yes' }, {}, {}], known);
    expect(m[0]).toMatchObject({ say: 'Annan selle kohe kiirabile edasi. Kas ta hingab?', emotion: 'kindel' });
    expect(m[1].say).toBe('Pange ta ettevaatlikult külili lamama.');
    expect(m[2].say).toBe('Jälgige tema hingamist ja öelge kohe, kui see muutub.');
    expect(m[3].say).not.toMatch(/teadvusel|nõrka kätt/);
    // „Kas ta on endiselt teadvusel?“ – „Ei“ käivitab sama käigu ilma mudelita.
    const quick = quickUnderstanding({ ...known, lastTopic: 'recheck:conscious' }, 'Ei, ei ole.');
    expect(quick).toMatchObject({ conscious: 'no', change: 'described' });
  });

  it('reacts to the caller: panic, "what do I do", good news on a check', () => {
    const known: CallState = { ...emptyCallState(), what: 'x', street: 'A tee', house: '1', settlement: 'B', addressReadBack: true, addressConfirmed: true, conscious: 'yes', breathing: 'yes', dispatched: true, asked: { age: 1, onset: 1, arms: 1 } };
    const panic = play([{ intent: 'agitated' }, { intent: 'agitated' }], known);
    expect(panic[0].say).toMatch(/^Ma aitan teid\. /);
    expect(panic[1].say).toMatch(/^Ma saan aru, et see on hirmutav\. Olen teiega\. /);
    // Kontrollküsimuse asemel juhis, kui helistaja küsib, mida teha.
    const atCheck: CallState = { ...known, asked: { ...known.asked, 'g:tell': 1, 'g:stay': 1 } };
    expect(nextMove(atCheck, u({ intent: 'asks_what_to_do' }), { whitelist }).say).toBe('Tehke välisuks lahti, et kiirabi saaks sisse.');
    expect(nextMove(emptyCallState(), u({ intent: 'asks_what_to_do', what: 'x' }), { whitelist }).say).toBe('Ütlen kohe, mida teha. Enne on mul vaja teada, kuhu abi saata. Mis aadressil see toimub?');
    const good = nextMove({ ...known, lastTopic: 'recheck:conscious' }, u({ conscious: 'yes' }), { whitelist });
    expect(good.say).toMatch(/^Hästi\. /);
  });

  it('silence while gathering: checks the line once, then asks again in other words', () => {
    const m: Move[] = [];
    let state = emptyCallState();
    for (let i = 0; i < 3; i++) {
      const move = nextMove(state, NO_UNDERSTANDING, { whitelist, idle: true });
      m.push(move);
      state = move.state;
    }
    expect(m[0].say).toBe('Kas te kuulete mind? Mis juhtus?');
    expect(m[1].say).toBe('Kirjeldage palun, mis praegu toimub.');
    expect(m[2].say).toMatch(/^Kas te kuulete mind\? /);
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

  it('short answers to the question just asked are understood without the model', () => {
    const at = (lastTopic: string) => ({ ...emptyCallState(), lastTopic });
    expect(quickUnderstanding(at('confirm'), 'Jah, õige.')?.confirmation).toBe('yes');
    expect(quickUnderstanding(at('confirm'), 'Ei.')?.confirmation).toBe('no');
    expect(quickUnderstanding(at('conscious'), 'Jah, on.')?.conscious).toBe('yes');
    expect(quickUnderstanding(at('breathing'), 'Ei hinga.')?.breathing).toBe('no');
    expect(quickUnderstanding(at('location:house'), 'Neliteist')).toBeNull(); // sõnadega number läheb mudelile
    expect(quickUnderstanding(at('location:house'), '14')?.house).toBe('14');
    expect(quickUnderstanding(at('location:settlement'), 'Haabneemes.')?.settlement).toBe('Haabneeme');
    expect(quickUnderstanding(at('location:settlement'), 'Tallinnas')?.settlement).toBe('Tallinn');
    // Pikem või muutust sisaldav lause jääb mudelile.
    expect(quickUnderstanding(at('conscious'), 'Jah, aga nüüd vajus ta kokku')).toBeNull();
    expect(quickUnderstanding(at('what'), 'Jah')).toBeNull();
    // Juhendamise ajal piisab vastusest; seisundi halvenemine läheb ikka mudelile.
    expect(quickUnderstanding(at('check'), 'Jah, sain ukse lahti ja tulin tagasi.')).not.toBeNull();
    expect(quickUnderstanding(at('howis'), 'Ta ei vasta mulle enam')).toBeNull();
    expect(quickUnderstanding(at('guide'), 'Mida ma veel tegema peaksin?')).toBeNull();
  });

  it('fallback understanding keeps the call moving without the model', () => {
    const f = fallbackUnderstanding('Vanaema räägib segaselt, olen Männikäbi tee 14');
    expect(f).toMatchObject({ street: 'Männikäbi tee', house: '14' });
    expect(f.what).not.toBeNull();
    expect(fallbackUnderstanding('Jah, õige.').confirmation).toBe('yes');
  });

  it('short demo: what -> where -> when -> what to do and wait, and the call stays open', () => {
    const wl = [...whitelist, 'Ärge andke talle süüa, juua ega ravimeid.'];
    const m: Move[] = [];
    let state = emptyCallState();
    for (const step of [{ what: 'vanaema räägib segaselt' }, { street: 'Männikäbi tee', house: '14', settlement: 'Haabneeme' }, {}] as Partial<Understanding>[]) {
      const move = nextMove(state, u(step), { whitelist: wl, short: true });
      m.push(move);
      state = move.state;
    }
    expect(m[0].say).toBe('Kus see toimub?');
    expect(m[1].dispatch?.address).toBe('Männikäbi tee 14, Haabneeme');
    expect(m[1].say).toBe('Saadan kiirabi aadressile Männikäbi tee 14, Haabneeme. Millal see algas?');
    expect(m[2].say).toBe('Ärge andke talle süüa, juua ega ravimeid. Tehke välisuks lahti, et kiirabi saaks sisse. Abi on teel. Püsige tema juures, kuni kiirabi kohale jõuab.');
    // Kõne jääb lahti: päästekorraldaja ei lõpeta seda ega alusta vaikuses ise juttu, aga vastab, kui helistaja räägib.
    expect(m[2].endCall).toBeUndefined();
    expect(nextMove(m[2].state, NO_UNDERSTANDING, { whitelist: wl, short: true, idle: true }).say).toBe('');
    const after = nextMove(m[2].state, u({}), { whitelist: wl, short: true });
    expect(after.say).toBe('Kui vana ta on?');
    expect(after.endCall).toBeUndefined();
    // Poolik aadress: küsib puuduva osa juurde, abi ei lähe enne teele.
    const part = nextMove(m[0].state, u({ street: 'Männikäbi tee', house: '14' }), { whitelist: wl, short: true });
    expect(part.say).toBe('Mis linnas või asulas see on?');
    expect(part.dispatch).toBeUndefined();
    // Kõik esimeses lauses: kohe abi teele ja järgmine küsimus.
    const all = nextMove(emptyCallState(), u({ what: 'x', street: 'A tee', house: '1', settlement: 'B' }), { whitelist: wl, short: true });
    expect(all.say).toBe('Saadan kiirabi aadressile A tee 1, B. Millal see algas?');
  });

  it('short demo answers the first sentence and a clear address without the model', () => {
    const first = demoQuick(emptyCallState(), 'Mu vanaema räägib äkki segaselt ja suunurk on viltu');
    expect(first?.what).toBe('Mu vanaema räägib äkki segaselt ja suunurk on viltu');
    expect(demoQuick(emptyCallState(), 'Appi!')).toBeNull();
    expect(demoQuick(emptyCallState(), 'Saatke kiirabi kiiresti')).toBeNull();
    // Aadressi moodi, aga poolik: jääb mudelile.
    expect(demoQuick(emptyCallState(), 'Vanaemal on halb, oleme Männikäbi teel')).toBeNull();
    const asked = { ...emptyCallState(), what: 'x', lastTopic: 'location:all' };
    expect(demoQuick(asked, 'Männikäbi tee neliteist, Haabneemes')).toMatchObject({ street: 'Männikäbi tee', house: '14', settlement: 'Haabneeme' });
    expect(demoQuick(asked, 'Männikäbi tee 14')).toBeNull(); // asula puudu: mudel kontrollib üle
    expect(demoQuick({ ...asked, street: 'Männikäbi tee', house: '14', lastTopic: 'location:settlement' }, 'Haabneemes')).toMatchObject({ settlement: 'Haabneeme' });
    expect(parseAddress('Pärna tänav kakskümmend kolm Tartus')).toMatchObject({ street: 'Pärna tänav', house: '23', settlement: 'Tartu' });
  });
});
