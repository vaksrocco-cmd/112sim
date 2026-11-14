// Integraatori fail. Päästekorraldaja KÕNE KÄIK koodina (puhas funktsioon: ei võrku, ei kella, ei juhuslikkust).
//
// Mudel (LLM) ainult MÕISTAB helistaja lauset (vt understand.ts); mida päästekorraldaja järgmiseks ütleb, otsustab see fail.
// Nii ei saa ta sama küsimust kaks korda küsida, asukohta lõppu jätta ega juhiseid välja mõelda.
//
// Alus: „Kuidas Häirekeskuse kõnevastuvõtja kõnet juhib. Praktiline kõnejuhis avalike allikate põhjal“ (14.11.2026).
// See on õppematerjal, mitte Häirekeskuse kinnitatud tööalgoritm.
//   1. ava kõne ühe küsimusega            5. kinnita oluline info ja vahenda edasi
//   2. juhtunu ja sündmuskoht kohe          6. juhenda ja jälgi muutusi
//   3.–4. vastusest lähtuvad täpsustused   7. selgita edasist ja lõpeta selge märguandega
//
// DEMO-STSENAARIUM (kindel küsimuste järjekord, vt DEMO_SCRIPT): Eesti avalikud juhised kirjeldavad kõnet nii:
// mis juhtus -> kus (aadress) -> kes ja mitu abivajajat -> seisund -> jääge liinile. Häirekeskuse küsimustik põhineb
// Taani mudelil (Dansk Indeks), mis küsib tüüpiliselt pärast aadressi vanust, teadvust, normaalset hingamist ja millal see algas.
// Seisundiküsimusi küsitakse kuni kaks korda (teine kord teise sõnastusega), siis liigutakse edasi; ainult aadressi
// kitsendatakse seni, kuni see on teada (ilma selleta ei saa abi saata).
// Päästekorraldaja ütleb ainult siin failis kirjas olevaid lauseid (pluss aadressi ülekordus); vaba LLM-teksti ei ole.
// Põhimõtted: üks küsimus korraga; asukohta kitsendatakse (asula -> tänav -> maja), mitte ei korrata sama palvet;
// kuulmata osa küsitakse neutraalselt üle; abi saadetakse välja kohe, kui juhtum ja koht on teada, ja lisaküsimused
// jätkuvad samal ajal; „abi on välja saadetud“ öeldakse ainult siis, kui see on päriselt tehtud; saabumisaega ei lubata.

export type Tri = 'yes' | 'no' | 'unknown';
export type Emotion = 'rahulik' | 'kindel' | 'tungiv';

/** Mida päästekorraldaja kõnest seni teab. Hoitakse kliendis ja saadetakse iga vooruga kaasa (server on olekuta). */
export interface CallState {
  what: string | null;
  settlement: string | null;
  street: string | null;
  house: string | null;
  /** Kas aadress on üle korratud ja kas helistaja kinnitas seda. */
  addressReadBack: boolean;
  addressConfirmed: boolean;
  conscious: Tri;
  breathing: Tri;
  dispatched: boolean;
  /** Mitu juhist lubatud loendist on juba antud. */
  instructionsGiven: number;
  /** Mitu korda iga teemat on küsitud (sõnastuse kitsendamiseks ja tooni jaoks). */
  asked: Record<string, number>;
  /** Viimane küsitud teema: sellele vastamata jätmine tähendab ümbersõnastamist. */
  lastTopic: string | null;
  /** Viimane esitatud küsimus sõna-sõnalt: sama lauset ei öelda kaks korda järjest. */
  lastQuestion: string | null;
}

export function emptyCallState(): CallState {
  return {
    what: null,
    settlement: null,
    street: null,
    house: null,
    addressReadBack: false,
    addressConfirmed: false,
    conscious: 'unknown',
    breathing: 'unknown',
    dispatched: false,
    instructionsGiven: 0,
    asked: {},
    lastTopic: null,
    lastQuestion: null,
  };
}

/** Mida mudel helistaja VIIMASEST lausest aru sai. Kõik väljad on selle lause kohta, mitte kogu kõne kohta. */
export interface Understanding {
  what: string | null;
  settlement: string | null;
  street: string | null;
  house: string | null;
  /** Vastus aadressi ülekordamisele. */
  confirmation: 'yes' | 'no' | 'none';
  conscious: Tri;
  breathing: Tri;
  /** Helistaja teatab, et abivajaja seisund MUUTUS: 'vague' = ütles ainult, et midagi muutus. */
  change: 'none' | 'vague' | 'described';
  intent: 'info' | 'only_help_request' | 'offtopic' | 'agitated' | 'asks_eta' | 'asks_what_to_do' | 'unclear';
  /** Osa aadressist, mis jäi arusaamatuks (helistaja ütles midagi, aga see ei olnud selge). */
  unheard: 'none' | 'settlement' | 'street' | 'house';
}

export const NO_UNDERSTANDING: Understanding = {
  what: null,
  settlement: null,
  street: null,
  house: null,
  confirmation: 'none',
  conscious: 'unknown',
  breathing: 'unknown',
  change: 'none',
  intent: 'unclear',
  unheard: 'none',
};

export interface Move {
  say: string;
  emotion: Emotion;
  /** Kas kood saadab selle vooruga abi välja. */
  dispatch?: { address: string; summary: string };
  endCall?: boolean;
  state: CallState;
}

const clean = (s: string | null | undefined) => {
  const t = (s ?? '').trim();
  return t ? t : null;
};

export const fullAddress = (s: CallState) => [[s.street, s.house].filter(Boolean).join(' '), s.settlement].filter(Boolean).join(', ');
const locationComplete = (s: CallState) => Boolean(s.street && s.house && s.settlement);

/** Lisab uue arusaamise olemasolevale seisule. Kord teada saadud info ei kao; uus täpsem info asendab vana. */
export function applyUnderstanding(prev: CallState, u: Understanding): CallState {
  const s: CallState = { ...prev, asked: { ...prev.asked } };
  const before = fullAddress(s);
  s.what = clean(u.what) ?? s.what;
  s.settlement = clean(u.settlement) ?? s.settlement;
  s.street = clean(u.street) ?? s.street;
  s.house = clean(u.house) ?? s.house;
  if (u.conscious !== 'unknown') s.conscious = u.conscious;
  if (u.breathing !== 'unknown') s.breathing = u.breathing;

  if (fullAddress(s) !== before) {
    // Aadress muutus: varasem kinnitus enam ei kehti.
    s.addressReadBack = false;
    s.addressConfirmed = false;
  } else if (s.addressReadBack && u.confirmation === 'yes') {
    s.addressConfirmed = true;
  } else if (s.addressReadBack && u.confirmation === 'no') {
    // Helistaja ütles, et aadress on vale, aga ei andnud uut: küsi otsast.
    s.street = null;
    s.house = null;
    s.settlement = null;
    s.addressReadBack = false;
    s.addressConfirmed = false;
    for (const k of Object.keys(s.asked)) if (k.startsWith('location') || k === 'confirm') delete s.asked[k];
  }
  // Muutus seisundis: teadvust ja hingamist tuleb uuesti küsida, kui helistaja neid ise ei öelnud.
  if (u.change !== 'none') {
    if (u.conscious === 'unknown') s.conscious = 'unknown';
    if (u.breathing === 'unknown') s.breathing = 'unknown';
    s.asked.conscious = 0;
    s.asked.breathing = 0;
  }
  return s;
}

// ───────── Kindlad laused ─────────
// Kõik laused, mida päästekorraldaja saab öelda ilma muutuva osata. Neist tehakse heli ette valmis (kohe mängitav).
export const GREETING = 'Häirekeskus, tere. Mis juhtus?';
const L = {
  what: ['Mis juhtus?', 'Kirjeldage palun, mis praegu toimub.', 'Mida te praegu näete?'],
  locationOpen: 'Mis aadressil see toimub?',
  settlement: ['Mis linnas või asulas see on?', 'Mis on linna või küla nimi?', 'Mis vallas või linnas te olete?'],
  street: ['Mis on tänava nimi?', 'Mis tänaval te olete?', 'Öelge palun tänava nimi.'],
  house: ['Mis on maja number?', 'Öelge palun maja number.', 'Mis number on maja peal?'],
  landmark: 'Millist silti või maamärki te näete?',
  unheard: {
    settlement: 'Ma ei kuulnud asula nime. Palun öelge see uuesti.',
    street: 'Ma ei kuulnud tänava nime. Palun öelge see uuesti.',
    house: 'Ma ei kuulnud maja numbrit. Palun öelge see uuesti.',
  },
  confirmTail: 'Kas sain õigesti aru?',
  conscious: ['Kas ta on teadvusel?', 'Kas ta reageerib, kui te temaga räägite?', 'Kas ta vastab teile?'],
  breathing: ['Kas ta hingab normaalselt?', 'Vaadake, kas ta rind liigub. Kas ta hingab?', 'Kas ta hingab?'],
  age: ['Kui vana ta on?', 'Umbes kui vana ta on?'],
  onset: ['Millal see algas?', 'Mitu minutit tagasi see algas?'],
  dispatched: 'Abi on välja saadetud.',
  changeVague: 'Mis nüüd muutus?',
  changeNoted: 'Selge, annan selle kiirabile edasi.',
  calm: 'Ma aitan teid.',
  listening: 'Ma kuulan teid.',
  firstPlace: 'Täpsustame kõigepealt koha, kuhu abi vajate.',
  firstWhat: 'Öelge kõigepealt, mis juhtus.',
  eta: 'Abi on teel. Täpset aega ma öelda ei saa.',
  etaNotYet: 'Saadan abi kohe, kui tean, kus te olete.',
  why: 'Küsin seda, et abi jõuaks õigesse kohta.',
  tellChange: 'Öelge mulle kohe, kui midagi muutub.',
  stay: 'Jään teiega liinile.',
  closing: 'Kiirabi on kohal. Võime kõne lõpetada.',
} as const;

/** Kõik muutumatud laused (heli ettevalmistamiseks). Stsenaariumi lubatud juhised lisab kutsuja. */
export function fixedLines(whitelist: string[]): string[] {
  const out = new Set<string>([GREETING]);
  const add = (v: unknown) => {
    if (typeof v === 'string') out.add(v);
    else if (Array.isArray(v)) v.forEach(add);
    else if (v && typeof v === 'object') Object.values(v).forEach(add);
  };
  add(L);
  whitelist.forEach((w) => out.add(w));
  return [...out];
}

/** Valib sõnastuse selle järgi, mitu korda teemat on juba küsitud (ei korda sama lauset järjest). */
function variant(list: readonly string[], n: number): string {
  return list[n % list.length];
}

/**
 * Otsustab, mida päästekorraldaja järgmiseks ütleb.
 * @param cue        süsteemi märguanne (kiirabi jõudis kohale): kõne lõpetatakse.
 * @param whitelist  stsenaariumi lubatud juhised (ainult neid tohib anda).
 */
export function nextMove(prev: CallState, u: Understanding, opts: { whitelist: string[]; cue?: boolean }): Move {
  // 7. Lõpetamine: selge märguanne.
  if (opts.cue) {
    return { say: L.closing, emotion: 'rahulik', endCall: true, state: { ...prev, lastTopic: 'closing' } };
  }

  const s = applyUnderstanding(prev, u);
  const parts: string[] = [];
  let dispatch: Move['dispatch'];

  // Abi läheb teele kohe, kui juhtum ja koht on teada. Lisaküsimused jätkuvad samal ajal.
  if (!s.dispatched && (s.what || (s.asked.what ?? 0) >= 3) && locationComplete(s)) {
    s.dispatched = true;
    dispatch = { address: fullAddress(s), summary: s.what ?? 'juhtunu täpsustamata' };
    parts.push(L.dispatched);
  }

  // 6. Muutus kõne ajal võetakse kohe arvesse.
  if (u.change === 'vague') {
    s.lastTopic = 'change';
    s.asked.change = (s.asked.change ?? 0) + 1;
    return finish(s, [...parts, L.changeVague], dispatch, 'rahulik');
  }
  if (u.change === 'described') parts.push(L.changeNoted);

  // Helistaja küsimused ja kõrvalekalded: lühike vastus, siis tagasi vajaliku küsimuse juurde.
  if (u.intent === 'asks_eta') parts.push(s.dispatched ? L.eta : L.etaNotYet);
  else if (u.intent === 'agitated') parts.push(L.calm);
  else if (u.intent === 'offtopic') parts.push(L.listening, !s.what ? L.firstWhat : !locationComplete(s) ? L.firstPlace : '');

  // Milline teema on järgmine?
  const topic = pickTopic(s, u);
  const repeats = topic ? (s.asked[topic] ?? 0) : 0;
  // Kui sama teemat küsitakse teist korda ja helistaja ei vastanud sellele, selgita lühidalt põhjust (üks kord).
  if (topic && topic === prev.lastTopic && repeats === 1 && u.intent === 'only_help_request') parts.push(L.why);

  let question = topic ? phrase(topic, s, u, opts.whitelist) : null;
  if (topic && question && question === prev.lastQuestion) {
    // Sama lause tuleks teist korda järjest (nt pärast kitsendamist jõuti sama küsimuseni): võta järgmine sõnastus.
    question = phrase(topic, { ...s, asked: { ...s.asked, [topic]: repeats + 1 } }, u, opts.whitelist);
  }
  if (question) {
    parts.push(question);
    s.lastQuestion = question;
  }
  if (topic) {
    s.asked[topic] = repeats + 1;
    s.lastTopic = topic;
    if (topic === 'confirm') s.addressReadBack = true;
    if (topic === 'instruction') s.instructionsGiven += 1;
  }
  if (!parts.filter(Boolean).length) parts.push(L.stay);

  // Toon: sama teema kolmas küsimine on tungiv, teine kindel. Muidu rahulik.
  const emotion: Emotion = topic && topic !== 'instruction' && topic !== 'confirm' ? (repeats >= 2 ? 'tungiv' : repeats === 1 ? 'kindel' : 'rahulik') : 'rahulik';
  return finish(s, parts, dispatch, emotion);
}

function finish(state: CallState, parts: string[], dispatch: Move['dispatch'], emotion: Emotion): Move {
  return { say: parts.filter(Boolean).join(' '), emotion, dispatch, state };
}

/** Asukoha puhul loetakse kordusi puuduva osa kaupa: asula, tänava ja maja küsimine järjest ei ole kordamine. */
type Topic = 'what' | 'location:all' | 'location:settlement' | 'location:street' | 'location:house' | 'confirm' | 'age' | 'conscious' | 'breathing' | 'onset' | 'instruction';

/** Mitu korda üht seisundiküsimust küsitakse, enne kui liigutakse edasi (demo ei jää kunagi kinni). */
const MAX_ASKS = 2;

/**
 * DEMO_SCRIPT: päästekorraldaja küsimuste kindel järjekord. Samm jäetakse vahele, kui vastus on juba teada
 * või kui seda on küsitud MAX_ASKS korda. Vanust ja algusaega ei salvestata: piisab, et helistaja vastas.
 */
const DEMO_SCRIPT: { topic: Topic; pending: (s: CallState, u: Understanding) => boolean }[] = [
  { topic: 'what', pending: (s) => !s.what && (s.asked.what ?? 0) < 3 },
  { topic: 'location:all', pending: (s) => !s.street && !s.house && !s.settlement },
  { topic: 'location:settlement', pending: (s) => !s.settlement },
  { topic: 'location:street', pending: (s) => !s.street },
  { topic: 'location:house', pending: (s) => !s.house },
  { topic: 'confirm', pending: (s, u) => !s.addressConfirmed && !(s.addressReadBack && u.confirmation === 'none' && (s.asked.confirm ?? 0) >= 2) },
  { topic: 'age', pending: (s) => (s.asked.age ?? 0) < 1 },
  { topic: 'conscious', pending: (s) => s.conscious === 'unknown' && (s.asked.conscious ?? 0) < MAX_ASKS },
  { topic: 'breathing', pending: (s) => s.breathing === 'unknown' && (s.asked.breathing ?? 0) < MAX_ASKS },
  { topic: 'onset', pending: (s) => (s.asked.onset ?? 0) < 1 },
];

function pickTopic(s: CallState, u: Understanding): Topic | null {
  return DEMO_SCRIPT.find((step) => step.pending(s, u))?.topic ?? 'instruction';
}

function phrase(topic: Topic, s: CallState, u: Understanding, whitelist: string[]): string | null {
  const n = s.asked[topic] ?? 0;
  switch (topic) {
    case 'what':
      // Kui helistaja ütles ainult „saatke kiirabi“, küsi sündmuse kohta (ära eelda, et sisu on teada).
      return u.intent === 'only_help_request' && n === 0 ? L.what[1] : variant(L.what, n);
    case 'location:all':
      if (u.unheard !== 'none') return L.unheard[u.unheard];
      // Kitsenda: ära korda sama üldist palvet, vaid küsi järjest väiksemat osa.
      return n === 0 ? L.locationOpen : n === 1 ? L.settlement[0] : n === 2 ? L.street[0] : L.landmark;
    case 'location:settlement':
      return u.unheard === 'settlement' && n === 0 ? L.unheard.settlement : variant(L.settlement, n);
    case 'location:street':
      return u.unheard === 'street' && n === 0 ? L.unheard.street : variant(L.street, n);
    case 'location:house':
      return u.unheard === 'house' && n === 0 ? L.unheard.house : variant(L.house, n);
    case 'confirm':
      return s.addressReadBack && u.confirmation === 'none' ? `Kas ${fullAddress(s)} on õige?` : `Kordan: ${fullAddress(s)}. ${L.confirmTail}`;
    case 'conscious':
      return variant(L.conscious, n);
    case 'breathing':
      return variant(L.breathing, n);
    case 'age':
      return variant(L.age, n);
    case 'onset':
      return variant(L.onset, n);
    case 'instruction': {
      // Juhised ainult stsenaariumi lubatud loendist, ükshaaval. „Öelge kohe, kui midagi muutub“ tuleb esimesena.
      const ordered = [L.tellChange, ...whitelist.filter((w) => w !== L.tellChange && !/hingab\?|rind liigub/i.test(w))];
      return s.instructionsGiven < ordered.length ? ordered[s.instructionsGiven] : L.stay;
    }
  }
}
