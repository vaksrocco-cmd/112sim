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
// INIMLIK OPERAATOR: ta kinnitab ausalt („Abi on teel“, mitte saabumisaega ega head lõppu), tunnustab helistajat,
// selgitab, miks küsib, annab ühe juhise korraga ja kontrollib selle üle, võtab vaikuses ise jutujärje ning ei korda
// täitelauseid (kinnitused vahelduvad). Ainult kriitilist vastamata küsimust (aadress) korratakse järjekindlalt.
// Allikad: IAED „Repetitive Persistence“ ja „Setting the Tone“, NFCC „Effective communication: people at risk“.
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
/** Lühike kinnitus, mille telefon mängib KOHE, kui helistaja lõpetas pikema lause (kuni mudel seda mõistab). */
export const ACKS = ['Selge.', 'Sain aru.'] as const;
const L = {
  acks: ACKS,
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
  arms: 'Kas ta saab mõlemat kätt tõsta?',
  dispatched: 'Abi on välja saadetud.',
  thanks: 'Aitäh.',
  changeVague: 'Mis nüüd muutus?',
  changeNoted: 'Annan selle kohe kiirabile edasi.',
  calm: ['Ma aitan teid.', 'Ma saan aru, et see on hirmutav. Olen teiega.', 'Hingake korra sügavalt sisse. Ma aitan teid.'],
  good: 'Hästi.',
  whatToDoFirst: 'Ütlen kohe, mida teha. Enne on mul vaja teada, kuhu abi saata.',
  listening: 'Ma kuulan teid.',
  hear: 'Kas te kuulete mind?',
  firstPlace: 'Täpsustame kõigepealt koha, kuhu abi vajate.',
  firstWhat: 'Öelge kõigepealt, mis juhtus.',
  eta: 'Abi on teel. Täpset aega ma öelda ei saa.',
  etaNotYet: 'Saadan abi kohe, kui tean, kus te olete.',
  why: 'Küsin seda, et abi jõuaks õigesse kohta.',
  whyState: 'Küsin seda, et kiirabi teaks, milleks valmistuda.',
  tellChange: 'Öelge mulle kohe, kui midagi muutub.',
  // Kinnitused ja tunnustus: vahelduvad, sama lause ei tule kaks korda järjest. Ei luba saabumisaega ega head lõppu.
  reassure: [
    'Te saate hästi hakkama.',
    'Abi on teel.',
    'Hea, et kohe helistasite.',
    'Olen teiega liinil, kuni kiirabi jõuab.',
    'Te teete praegu õiget asja.',
    'Kiirabi sõidab teie poole.',
  ],
  // Kontrollküsimused juhiste vahel ja pärast neid.
  doorCheck: 'Kas saite ukse lahti?',
  howIs: ['Kuidas tal praegu on?', 'Mida te praegu näete?', 'Kas midagi on muutunud?'],
  stillConscious: ['Kas ta on endiselt teadvusel?', 'Kas ta reageerib teile endiselt?'],
  stillBreathing: ['Kas ta hingab endiselt normaalselt?', 'Kas ta hingab endiselt?'],
  closing: 'Kiirabi on kohal. Aitäh, et jäite liinile. Võime kõne lõpetada.',
  // Lühike demo (vt demoMove): viimane voor.
  demoWhere: 'Kus see toimub?',
  demoOnset: 'Millal see algas?',
  demoWait: ['Abi on teel.', 'Püsige tema juures, kuni kiirabi kohale jõuab.'],
} as const;

// Juhised, mida päästekorraldaja annab. KÕIK peavad olema stsenaariumi lubatud loendis (dispatcherWhitelist):
// kui lauset seal ei ole, jäetakse samm vahele. Allikad: Eesti esmaabijuhend ja Stroke Foundation (vt KNOWLEDGE.md).
const I = {
  stay: 'Jääge tema juurde, ärge jätke teda üksi.',
  noFood: 'Ärge andke talle süüa, juua ega ravimeid.',
  clothes: 'Tehke lahti pingul riided kaela ümbert.',
  door: 'Tehke välisuks lahti, et kiirabi saaks sisse.',
  arm: 'Toetage tema nõrka kätt, ärge sellest tõmmake.',
  onset: 'Jätke meelde, mis kell sümptomid algasid.',
  meds: 'Pange valmis tema ravimid ja isikut tõendav dokument.',
  side: 'Pange ta ettevaatlikult külili lamama.',
  watch: 'Jälgige tema hingamist ja öelge kohe, kui see muutub.',
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
 * @param idle       helistaja on vaikinud: päästekorraldaja võtab ise jutujärje (kontrollib, juhendab, kinnitab).
 * @param whitelist  stsenaariumi lubatud juhised (ainult neid tohib anda).
 */
export function nextMove(prev: CallState, u: Understanding, opts: { whitelist: string[]; cue?: boolean; idle?: boolean; short?: boolean }): Move {
  if (opts.short && !opts.cue) return demoMove(prev, u, opts);
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
  // Aadress sai just kinnitatud: täna (üks kord).
  if (s.addressConfirmed && !prev.addressConfirmed) parts.push(L.thanks);

  // 6. Muutus kõne ajal võetakse kohe arvesse.
  if (u.change === 'vague') {
    s.lastTopic = 'change';
    s.asked.change = (s.asked.change ?? 0) + 1;
    return finish(s, [...parts, L.changeVague], dispatch, 'kindel');
  }
  if (u.change === 'described') parts.push(L.changeNoted);

  // Helistaja küsimused ja kõrvalekalded: lühike vastus, siis tagasi vajaliku küsimuse juurde.
  if (u.intent === 'asks_eta') parts.push(s.dispatched ? L.eta : L.etaNotYet);
  else if (u.intent === 'agitated') {
    // Paanika: rahusta iga kord eri lausega, siis tagasi vajaliku küsimuse juurde.
    const n = s.asked.calm ?? 0;
    s.asked.calm = n + 1;
    parts.push(variant(L.calm, n));
  } else if (u.intent === 'asks_what_to_do' && !locationComplete(s)) parts.push(L.whatToDoFirst);
  // Hea uudis kontrollküsimusele (endiselt teadvusel, hingab): reageeri sellele, ära mine vaikides edasi.
  if (prev.lastTopic?.startsWith('recheck') && (u.conscious === 'yes' || u.breathing === 'yes') && !parts.length) parts.push(L.good);
  else if (u.intent === 'offtopic') parts.push(L.listening, !s.what ? L.firstWhat : !locationComplete(s) ? L.firstPlace : '');

  // Milline teema on järgmine?
  const topic = pickTopic(s, u, opts.whitelist);
  const repeats = s.asked[topic] ?? 0;
  const gathering = topic !== 'guide' && topic !== 'side' && topic !== 'watch';
  // Vaikus küsimuse järel: kontrolli kõigepealt, kas helistaja kuuleb (üks kord kahe vaikuse kohta).
  if (opts.idle && gathering) {
    const n = s.asked.idle ?? 0;
    s.asked.idle = n + 1;
    if (n % 2 === 0) parts.push(L.hear);
  }
  // Kui sama teemat küsitakse teist korda ja helistaja ei vastanud sellele, selgita lühidalt põhjust (üks kord).
  if (topic === prev.lastTopic && repeats === 1 && !opts.idle) {
    if (u.intent === 'only_help_request') parts.push(L.why);
    else if ((topic === 'conscious' || topic === 'breathing') && !s.asked.whyState) {
      s.asked.whyState = 1;
      parts.push(L.whyState);
    }
  }

  let line: string;
  let lastTopic: string = topic;
  if (topic === 'guide') {
    // „Mida ma tegema pean?“ – vasta juhisega, mitte kontrollküsimusega.
    const g = guideStep(s, opts.whitelist, prev.lastQuestion, u.intent === 'asks_what_to_do');
    // Kinnitus või tunnustus igal teisel juhendamisvoorul (ainult siis, kui abi on päriselt teel ja midagi muud ette ei tulnud).
    const turns = s.asked.guideTurns ?? 0;
    s.asked.guideTurns = turns + 1;
    if (s.dispatched && !parts.length && turns % 2 === 1) {
      const r = s.asked.reassure ?? 0;
      s.asked.reassure = r + 1;
      parts.push(variant(L.reassure, r));
    }
    line = g.say;
    lastTopic = g.topic;
    s.asked[g.key] = (s.asked[g.key] ?? 0) + 1;
  } else {
    let question = phrase(topic, s, u);
    if (question === prev.lastQuestion) {
      // Sama lause tuleks teist korda järjest (nt pärast kitsendamist jõuti sama küsimuseni): võta järgmine sõnastus.
      question = phrase(topic, { ...s, asked: { ...s.asked, [topic]: repeats + 1 } }, u);
    }
    line = question;
    s.asked[topic] = repeats + 1;
    if (topic === 'confirm') s.addressReadBack = true;
  }
  parts.push(line);
  s.lastQuestion = line;
  s.lastTopic = lastTopic;

  // Toon: kokkuvajumise järel kindel; sama küsimuse kolmas küsimine tungiv, teine kindel. Muidu rahulik.
  const critical = s.conscious === 'no' && (topic === 'breathing' || topic === 'side' || topic === 'watch');
  const emotion: Emotion = critical
    ? 'kindel'
    : gathering && topic !== 'confirm'
      ? repeats >= 2
        ? 'tungiv'
        : repeats === 1
          ? 'kindel'
          : 'rahulik'
      : 'rahulik';
  return finish(s, parts, dispatch, emotion);
}

function finish(state: CallState, parts: string[], dispatch: Move['dispatch'], emotion: Emotion): Move {
  return { say: parts.filter(Boolean).join(' '), emotion, dispatch, state };
}

/** Asukoha puhul loetakse kordusi puuduva osa kaupa: asula, tänava ja maja küsimine järjest ei ole kordamine. */
type Topic =
  | 'what' | 'location:all' | 'location:settlement' | 'location:street' | 'location:house' | 'confirm'
  | 'age' | 'conscious' | 'breathing' | 'onset' | 'arms' | 'side' | 'watch' | 'guide';

/** Mitu korda üht seisundiküsimust küsitakse, enne kui liigutakse edasi (demo ei jää kunagi kinni). */
const MAX_ASKS = 2;

/**
 * DEMO_SCRIPT: päästekorraldaja küsimuste kindel järjekord. Samm jäetakse vahele, kui vastus on juba teada
 * või kui seda on küsitud MAX_ASKS korda. Vanust ja algusaega ei salvestata: piisab, et helistaja vastas.
 * Kui abivajaja on teadvuseta ja hingab, tuleb kohe külili asendi juhis ja hingamise jälgimine.
 * Kui skript on läbi, algab juhendamine (guide): juhised ükshaaval, vahele kontrollküsimused ja kinnitused.
 */
const DEMO_SCRIPT: { topic: Topic; pending: (s: CallState, u: Understanding, w: string[]) => boolean }[] = [
  { topic: 'what', pending: (s) => !s.what && (s.asked.what ?? 0) < 3 },
  { topic: 'location:all', pending: (s) => !s.street && !s.house && !s.settlement },
  { topic: 'location:settlement', pending: (s) => !s.settlement },
  { topic: 'location:street', pending: (s) => !s.street },
  { topic: 'location:house', pending: (s) => !s.house },
  { topic: 'confirm', pending: (s, u) => !s.addressConfirmed && !(s.addressReadBack && u.confirmation === 'none' && (s.asked.confirm ?? 0) >= 2) },
  { topic: 'age', pending: (s) => (s.asked.age ?? 0) < 1 },
  { topic: 'conscious', pending: (s) => s.conscious === 'unknown' && (s.asked.conscious ?? 0) < MAX_ASKS },
  { topic: 'breathing', pending: (s) => s.breathing === 'unknown' && (s.asked.breathing ?? 0) < MAX_ASKS },
  { topic: 'side', pending: (s, _u, w) => s.conscious === 'no' && s.breathing === 'yes' && !s.asked.side && w.includes(I.side) },
  { topic: 'watch', pending: (s, _u, w) => s.conscious === 'no' && Boolean(s.asked.side) && !s.asked.watch && w.includes(I.watch) },
  { topic: 'onset', pending: (s) => (s.asked.onset ?? 0) < 1 },
  { topic: 'arms', pending: (s) => s.conscious !== 'no' && (s.asked.arms ?? 0) < 1 },
];

function pickTopic(s: CallState, u: Understanding, whitelist: string[] = []): Topic {
  return DEMO_SCRIPT.find((step) => step.pending(s, u, whitelist))?.topic ?? 'guide';
}

function phrase(topic: Exclude<Topic, 'guide'>, s: CallState, u: Understanding): string {
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
      // Teadvuseta inimese puhul küsi otse, kas ta hingab (mitte „normaalselt“).
      return s.conscious === 'no' && n === 0 ? L.breathing[2] : variant(L.breathing, n);
    case 'age':
      return variant(L.age, n);
    case 'onset':
      return variant(L.onset, n);
    case 'arms':
      return L.arms;
    case 'side':
      return I.side;
    case 'watch':
      return I.watch;
  }
}

/**
 * Juhendamise järgmine samm. Juhised (ainult lubatud loendist) ja kontrollküsimused vahelduvad kindlas järjekorras;
 * kui kõik on öeldud, jätkub seisundi jälgimine vahelduvate küsimustega. Sama lauset ei öelda kaks korda järjest.
 * `topic` läheb olekusse, et lühike vastus („jah“, „sain“) mõistetaks ilma mudelita.
 */
function guideStep(s: CallState, whitelist: string[], lastLine: string | null, wantsInstruction = false): { say: string; topic: string; key: string } {
  const awake = s.conscious !== 'no';
  const allowed = (line: string) => whitelist.includes(line);
  const plan: { key: string; say: string; topic: string; ok: boolean }[] = [
    { key: 'g:tell', say: L.tellChange, topic: 'guide', ok: true },
    { key: 'g:stay', say: I.stay, topic: 'guide', ok: allowed(I.stay) },
    { key: 'g:food', say: I.noFood, topic: 'guide', ok: allowed(I.noFood) },
    { key: 'g:clothes', say: I.clothes, topic: 'guide', ok: allowed(I.clothes) },
    { key: 'g:conscious', say: L.stillConscious[0], topic: 'recheck:conscious', ok: awake },
    { key: 'g:door', say: I.door, topic: 'guide', ok: allowed(I.door) },
    { key: 'g:doorCheck', say: L.doorCheck, topic: 'check', ok: allowed(I.door) },
    { key: 'g:arm', say: I.arm, topic: 'guide', ok: awake && allowed(I.arm) },
    { key: 'g:onset', say: I.onset, topic: 'guide', ok: allowed(I.onset) },
    { key: 'g:breathing', say: L.stillBreathing[0], topic: 'recheck:breathing', ok: true },
    { key: 'g:meds', say: I.meds, topic: 'guide', ok: allowed(I.meds) },
    { key: 'g:how', say: L.howIs[0], topic: 'howis', ok: true },
  ];
  const open = plan.filter((p) => p.ok && !s.asked[p.key]);
  const next = (wantsInstruction ? open.find((p) => p.topic === 'guide') : undefined) ?? open[0];
  if (next) return next;
  // Juhised on otsas, aga helistaja küsib, mida teha: korda kõige tähtsamat.
  if (wantsInstruction && lastLine !== L.tellChange) return { say: L.tellChange, topic: 'guide', key: 'g:loop' };
  // Kõik juhised on antud: jälgi seisundit, iga kord eri küsimusega.
  const loop = awake
    ? [
        { say: L.howIs[1], topic: 'howis' },
        { say: L.stillConscious[1], topic: 'recheck:conscious' },
        { say: L.stillBreathing[0], topic: 'recheck:breathing' },
        { say: L.howIs[2], topic: 'howis' },
        { say: L.stillConscious[0], topic: 'recheck:conscious' },
        { say: L.howIs[0], topic: 'howis' },
      ]
    : [
        { say: L.stillBreathing[1], topic: 'recheck:breathing' },
        { say: L.howIs[2], topic: 'howis' },
        { say: I.watch, topic: 'guide' },
        { say: L.howIs[0], topic: 'howis' },
      ].filter((x) => x.say !== I.watch || allowed(I.watch));
  const n = s.asked['g:loop'] ?? 0;
  let pick = loop[n % loop.length];
  if (pick.say === lastLine) pick = loop[(n + 1) % loop.length];
  return { ...pick, key: 'g:loop' };
}

/**
 * LÜHIKE DEMO (umbes 30 sekundit), kindel käik:
 *   1) mis juhtus  2) kus see toimub  3) millal see algas  4) mida teha ja oodata kiirabi saabumiseni -> kõne lõpeb.
 * Päästekorraldaja kuulab vastuseid päriselt: aadress, mille ta abi saates ütleb, on see, mille helistaja ütles, ja poolikut
 * aadressi küsib ta osade kaupa juurde. Juhised tulevad ainult stsenaariumi lubatud loendist.
 */
function demoMove(prev: CallState, u: Understanding, opts: { whitelist: string[]; idle?: boolean }): Move {
  const s = applyUnderstanding(prev, u);
  const parts: string[] = [];
  let dispatch: Move['dispatch'];
  const ask = (topic: string, list: readonly string[], emotion: Emotion = 'rahulik'): Move => {
    const n = s.asked[topic] ?? 0;
    let line = variant(list, n);
    if (line === prev.lastQuestion) line = variant(list, n + 1);
    if (opts.idle && n % 2 === 0) parts.push(L.hear);
    s.asked[topic] = n + 1;
    s.lastTopic = topic;
    s.lastQuestion = line;
    return finish(s, [...parts, line], dispatch, n >= 2 ? 'kindel' : emotion);
  };

  if (u.intent === 'agitated') parts.push(L.calm[0]);
  else if (u.intent === 'asks_eta' && !locationComplete(s)) parts.push(L.etaNotYet);

  // 1) Mis juhtus (kuni kaks korda; siis edasi, et demo ei jääks kinni).
  if (!s.what && (s.asked.what ?? 0) < 2) return ask('what', L.what);

  // 2) Kus see toimub: puuduvat osa küsitakse eraldi.
  if (!locationComplete(s)) {
    if (u.unheard !== 'none') {
      const line = L.unheard[u.unheard];
      s.lastTopic = `location:${u.unheard}`;
      s.lastQuestion = line;
      return finish(s, [...parts, line], dispatch, 'rahulik');
    }
    if (!s.street && !s.house && !s.settlement) return ask('location:all', [L.demoWhere, L.locationOpen, L.landmark]);
    if (!s.settlement) return ask('location:settlement', L.settlement);
    if (!s.street) return ask('location:street', L.street);
    return ask('location:house', L.house);
  }

  // Koht on teada: abi läheb kohe teele ja päästekorraldaja ütleb aadressi, mille ta kuulis.
  if (!s.dispatched) {
    s.dispatched = true;
    dispatch = { address: fullAddress(s), summary: s.what ?? 'juhtunu täpsustamata' };
    parts.push(`Saadan kiirabi aadressile ${fullAddress(s)}.`);
  }

  // 3) Millal see algas (üks kord).
  if ((s.asked.onset ?? 0) < 1) return ask('onset', [L.demoOnset]);

  // 4) Mida teha ja oodata kiirabi saabumiseni. Kõne lõpeb siin.
  const todo = [I.noFood, I.door].filter((line) => opts.whitelist.includes(line));
  s.lastTopic = 'closing';
  s.lastQuestion = null;
  return { ...finish(s, [...parts, ...todo, ...L.demoWait], dispatch, 'rahulik'), endCall: true };
}
