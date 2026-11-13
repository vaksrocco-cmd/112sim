// Scenario data, shared by the browser and the /api/dispatcher function.
// A scenario is the opening situation; a variant is what it turns into.
// One variant is picked at random per run. Add variants to grow the demo.

export const SCENARIOS = [
  {
    id: 'collapse',
    title: 'Collapse at the bus stop',
    location: {
      label: 'Hobujaama bus stop, Narva mnt 7, Tallinn',
      short: 'Hobujaama bus stop · Narva mnt 7',
      keywords: ['hobujaama', 'narva'],
    },
    intro:
      'You are waiting for the bus. The man next to you, around 60, grabs his chest, sways and drops to the pavement.',
    variants: [
      {
        id: 'agonal',
        name: 'Cardiac arrest with gasping',
        // What is really going on. The dispatcher knows this, the player has to find out.
        truth:
          'Adult man, about 60, collapsed after clutching his chest. He is unconscious and does not respond to voice or touch. He is NOT breathing normally: he takes a slow, noisy gasp every several seconds (agonal breathing). No visible bleeding. This is a cardiac arrest.',
        responseCheck:
          'You shake his shoulders and shout "Can you hear me?". Nothing. His eyes stay closed and he does not react.',
        breathingCheck:
          'You tilt his head back and watch his chest for ten seconds. It barely moves. Every few seconds he makes a slow, snoring gasp. This is not normal breathing.',
        lesson:
          'Occasional gasps after a collapse are not breathing. They are a sign of cardiac arrest. If someone is unresponsive and not breathing normally, call 112 and start chest compressions straight away.',
      },
    ],
  },
];

export function pickScenario() {
  const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  const variant = scenario.variants[Math.floor(Math.random() * scenario.variants.length)];
  return { scenario, variant };
}

export function findScenario(scenarioId, variantId) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const variant = scenario && scenario.variants.find((v) => v.id === variantId);
  return scenario && variant ? { scenario, variant } : null;
}

export const OPENING_LINE = '112, emergency line. What has happened?';

export const CPR_INSTRUCTION =
  'He is in cardiac arrest and needs chest compressions now. Put the phone on speaker. Kneel beside him, put the heel of one hand on the centre of his chest and your other hand on top. Push hard and fast, five to six centimetres deep, and do not stop. If anyone is nearby, send them to fetch a defibrillator.';
