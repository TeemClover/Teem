/* TeamBook V1.2 — compact visual persona registry for Ending Art.
   This is deliberately presentation-only. Runtime PET voice/behaviour still
   lives under api/_lib/pet/sauce and pets/personas. */

const FALLBACK = Object.freeze({
  id: 'neutral',
  label: 'NEUTRAL ANIMAL',
  bodyLanguage: ['natural animal posture', 'warm social presence'],
  energy: ['warm', 'grounded'],
  visualHumor: 'none',
  endingSignature: 'stay faithful to the real moment',
  avoid: ['generic mascot pose', 'invented achievement', 'human-like hierarchy'],
});

const PERSONAS = Object.freeze({
  pig: {
    id: 'pig', label: 'CONVERSATION SPARK',
    bodyLanguage: ['open to the group', 'curious head tilt', 'sharing gesture'],
    energy: ['warm', 'social', 'low pressure'],
    visualHumor: 'friendly social pass',
    endingSignature: 'small progress feels noticed by the group',
    avoid: ['gluttony', 'weight jokes', 'coach pose', 'victory pose'],
  },
  buffalo: {
    id: 'buffalo', label: 'BRUTE-FORCE DUMMY',
    bodyLanguage: ['sturdy', 'literal object interaction', 'lovable harmless confusion'],
    energy: ['warm', 'direct', 'grounded'],
    visualHumor: 'self-own only; never make a member look foolish',
    endingSignature: 'something real got done even through confusion',
    avoid: ['member humiliation', 'rage', 'violence', 'bodybuilder stereotype'],
  },
  dog: {
    id: 'dog', label: 'WELCOME-BACK HEART',
    bodyLanguage: ['welcoming', 'leaning toward friends', 'lively tail', 'warm attention'],
    energy: ['loyal', 'positive', 'nonjudgmental'],
    visualHumor: 'light joy',
    endingSignature: 'coming back still has a place here',
    avoid: ['generic cheerleading', 'guilt', 'forced happiness'],
  },
  white_pom: {
    id: 'dog', label: 'WELCOME-BACK HEART',
    bodyLanguage: ['welcoming', 'leaning toward friends', 'lively tail', 'warm attention'],
    energy: ['loyal', 'positive', 'nonjudgmental'],
    visualHumor: 'light joy',
    endingSignature: 'coming back still has a place here',
    avoid: ['generic cheerleading', 'guilt', 'forced happiness'],
  },
  unicorn: {
    id: 'unicorn', label: 'REALITY ENCHANTER',
    bodyLanguage: ['elegant', 'calm', 'quietly theatrical'],
    energy: ['magical', 'warm', 'surreal'],
    visualHumor: 'fantasy lore wrapped around real facts',
    endingSignature: 'the real action is the magic',
    avoid: ['fortune teller', 'generic rainbow pony', 'fake achievement', 'royal hierarchy'],
  },
  crow: {
    id: 'crow', label: 'THREAD KEEPER',
    bodyLanguage: ['still', 'observant', 'precise gaze toward a real detail'],
    energy: ['calm', 'continuous', 'quietly intelligent'],
    visualHumor: 'minimal dry humor',
    endingSignature: 'the path from an earlier thread to now stays visible',
    avoid: ['horror', 'death omen', 'detective cliché', 'dashboard'],
  },
  cat: {
    id: 'cat', label: 'SIDE-QUEST ARTIST',
    bodyLanguage: ['asymmetric pose', 'odd angle', 'playful interest in a real object'],
    energy: ['warm', 'weird', 'artistic'],
    visualHumor: 'cat logic',
    endingSignature: 'one odd real detail becomes memorable',
    avoid: ['obedient mascot', 'random chaos', 'meme face', 'invented prop'],
  },
  orange_cat: {
    id: 'cat', label: 'SIDE-QUEST ARTIST',
    bodyLanguage: ['asymmetric pose', 'odd angle', 'playful interest in a real object'],
    energy: ['warm', 'weird', 'artistic'],
    visualHumor: 'cat logic',
    endingSignature: 'one odd real detail becomes memorable',
    avoid: ['obedient mascot', 'random chaos', 'meme face', 'invented prop'],
  },
  chicken: {
    id: 'chicken', label: 'MICRO-STEP PECKER',
    bodyLanguage: ['focused small action', 'one object at a time', 'compact directional movement'],
    energy: ['practical', 'focused', 'grounded'],
    visualHumor: 'tiny-action logic',
    endingSignature: 'a large result is made from small real actions',
    avoid: ['manager pose', 'dashboard', 'giant roadmap', 'motivational coach'],
  },
  turtle: {
    id: 'turtle', label: 'STEADY WITNESS',
    bodyLanguage: ['calm forward motion', 'grounded', 'patient'],
    energy: ['quiet', 'persistent', 'safe'],
    visualHumor: 'light dry humor',
    endingSignature: 'distance matters more than speed',
    avoid: ['sad slow turtle', 'finish-line race cliché', 'clock mockery'],
  },
  white_cat: {
    id: 'white_cat', label: 'PATTERN CARETAKER',
    bodyLanguage: ['calm sitting', 'one paw near one real detail', 'quiet attentive gaze'],
    energy: ['precise', 'warm', 'restrained'],
    visualHumor: 'very light dry-cat humor',
    endingSignature: 'make one supported detail easier to notice without overclaiming a pattern',
    avoid: ['AI hologram', 'doctor pose', 'diagnostic dashboard', 'fake pattern'],
  },
  rabbit: {
    id: 'rabbit', label: 'KIND SPRINTER',
    bodyLanguage: ['ready to move', 'light-footed', 'relaxed when resting'],
    energy: ['quick', 'gentle', 'nonjudgmental'],
    visualHumor: 'small bursts of speed, never pressure',
    endingSignature: 'move quickly when ready and let rest remain valid',
    avoid: ['race podium', 'shaming rest', 'frantic panic'],
  },
  fox: {
    id: 'fox', label: 'PLAYFUL PLANNER',
    bodyLanguage: ['alert', 'adaptive', 'playful interaction with a real plan or object'],
    energy: ['clever', 'flexible', 'curious'],
    visualHumor: 'a smart detour around a real obstacle',
    endingSignature: 'the route may change while the real intention stays visible',
    avoid: ['scheming villain', 'dishonesty stereotype', 'invented master plan'],
  },
  owl: {
    id: 'owl', label: 'NIGHT LIBRARIAN',
    bodyLanguage: ['composed', 'careful object arrangement', 'quiet end-of-day gaze'],
    energy: ['reflective', 'orderly', 'calm'],
    visualHumor: 'minimal',
    endingSignature: 'put the day in its place, then let it rest',
    avoid: ['all-knowing oracle', 'lecture pose', 'mystic prophecy'],
  },
  monitor_lizard: {
    id: 'monitor_lizard', label: 'GREMLIN MAX',
    bodyLanguage: ['full-body monitor lizard posture', 'mischievous sideways glance', 'one claw near a real notebook detail'],
    energy: ['sharp', 'playfully confrontational', 'observant'],
    visualHumor: 'a cheeky self-aware reaction to a real receipt from the book; never random cruelty',
    endingSignature: 'one real contradiction or callback becomes the memorable final wink',
    avoid: ['generic gecko', 'dinosaur', 'dragon', 'extra tails', 'member humiliation', 'invented evidence'],
  },
  xvisor_white_cat_silver: {
    id: 'xvisor_white_cat_silver', label: 'PATTERN CARETAKER',
    bodyLanguage: ['calm sitting', 'one paw on one real detail', 'attention on the notebook rather than camera'],
    energy: ['precise', 'warm', 'restrained'],
    visualHumor: 'almost none',
    endingSignature: 'make the evidence easier to see without claiming more than it proves',
    avoid: ['AI hologram', 'doctor pose', 'diagnostic dashboard', 'fake pattern'],
  },
});

export function endingVisualPersonaFor(value) {
  const key = String(value || '');
  return PERSONAS[key] || FALLBACK;
}

export function endingPersonaPrompt(value) {
  const persona = endingVisualPersonaFor(value);
  return [
    `${persona.label}.`,
    `Body language: ${persona.bodyLanguage.join('; ')}.`,
    `Energy: ${persona.energy.join(', ')}.`,
    `Visual humor: ${persona.visualHumor}.`,
    `Ending signature: ${persona.endingSignature}.`,
    `Avoid: ${persona.avoid.join('; ')}.`,
  ].join(' ');
}

export const TEAMBOOK_ENDING_VISUAL_PERSONAS = PERSONAS;
