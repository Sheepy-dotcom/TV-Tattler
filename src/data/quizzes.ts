// -----------------------------------------------------------------------------
// Quiz data. Two kinds:
//   • trivia      — score-based, one correct answer per question
//   • personality — each answer adds to result "buckets"; highest bucket wins
//
// Kept deliberately evergreen and fact-safe: trivia answers are well-known,
// stable facts (settings, pubs, defining families), never invented spoilers or
// unverifiable dates. Personality quizzes carry no factual claims at all.
//
// Pages read this at build time and serialise it into the quiz runner. Add a
// quiz by adding an entry — the index and pages pick it up automatically.
// -----------------------------------------------------------------------------

export interface TriviaQuestion {
  q: string;
  options: string[];
  /** index into options of the correct answer */
  answer: number;
}

export interface TriviaBand {
  /** minimum correct answers (inclusive) for this result */
  min: number;
  title: string;
  blurb: string;
}

export interface PersonalityAnswer {
  text: string;
  /** result key → points added */
  scores: Record<string, number>;
}

export interface PersonalityQuestion {
  q: string;
  options: PersonalityAnswer[];
}

export interface PersonalityResult {
  key: string;
  title: string;
  blurb: string;
}

interface QuizBase {
  slug: string;
  title: string;
  standfirst: string;
  emoji: string;
  accent: string;
}

export interface TriviaQuiz extends QuizBase {
  kind: 'trivia';
  questions: TriviaQuestion[];
  bands: TriviaBand[];
}

export interface PersonalityQuiz extends QuizBase {
  kind: 'personality';
  questions: PersonalityQuestion[];
  results: PersonalityResult[];
}

export type Quiz = TriviaQuiz | PersonalityQuiz;

export const quizzes: Quiz[] = [
  {
    kind: 'trivia',
    slug: 'the-big-soap-quiz',
    title: 'The big British soap quiz',
    standfirst:
      'Ten questions on the nation’s favourite soaps. No spoilers — just how well do you really know the shows?',
    emoji: '📺',
    accent: '#7b2ff7',
    questions: [
      {
        q: 'Which soap is set in the fictional London borough of Walford?',
        options: ['Coronation Street', 'EastEnders', 'Emmerdale', 'Hollyoaks'],
        answer: 1,
      },
      {
        q: 'The Rovers Return is the pub at the heart of which soap?',
        options: ['EastEnders', 'Emmerdale', 'Coronation Street', 'Hollyoaks'],
        answer: 2,
      },
      {
        q: 'The Woolpack serves the villagers of which show?',
        options: ['Emmerdale', 'Coronation Street', 'EastEnders', 'Hollyoaks'],
        answer: 0,
      },
      {
        q: 'Coronation Street is set in which fictional area of Greater Manchester?',
        options: ['Walford', 'Weatherfield', 'Hollyoaks', 'Chester'],
        answer: 1,
      },
      {
        q: 'Which pub is run, famously, by the Carters and others in EastEnders?',
        options: ['The Rovers Return', 'The Woolpack', 'The Queen Victoria', 'The Dog in the Pond'],
        answer: 2,
      },
      {
        q: 'The Dingles are the defining family of which soap?',
        options: ['Hollyoaks', 'Emmerdale', 'EastEnders', 'Coronation Street'],
        answer: 1,
      },
      {
        q: 'Which long-running character has appeared in Coronation Street since its very first episode in 1960?',
        options: ['Ken Barlow', 'Steve McDonald', 'Roy Cropper', 'Kevin Webster'],
        answer: 0,
      },
      {
        q: 'The McQueens are a big, brash family in which soap?',
        options: ['EastEnders', 'Emmerdale', 'Hollyoaks', 'Coronation Street'],
        answer: 2,
      },
      {
        q: 'Which soap centres on the residents of Albert Square?',
        options: ['EastEnders', 'Coronation Street', 'Hollyoaks', 'Emmerdale'],
        answer: 0,
      },
      {
        q: 'Hollyoaks is set in a fictional suburb near which city?',
        options: ['Manchester', 'Liverpool', 'Chester', 'Leeds'],
        answer: 2,
      },
    ],
    bands: [
      { min: 9, title: 'Soap superfan 👑', blurb: 'Practically a resident. You know these streets, squares and villages inside out.' },
      { min: 6, title: 'Regular viewer 📺', blurb: 'A solid, dependable fan — you rarely miss the big episodes.' },
      { min: 3, title: 'Casual watcher 🍵', blurb: 'You catch the odd omnibus. Time for a proper catch-up?' },
      { min: 0, title: 'Just passing through 🚪', blurb: 'No shame in it — everyone starts somewhere. Have a browse of the shows!' },
    ],
  },
  {
    kind: 'personality',
    slug: 'which-soap-family-are-you',
    title: 'Which soap family do you belong to?',
    standfirst:
      'Loyal Dingle? Fearsome Mitchell? Take the quiz and find out which of the great soap dynasties you’d fit right into.',
    emoji: '👪',
    accent: '#E8134B',
    results: [
      { key: 'mitchell', title: 'You’re a Mitchell 💪', blurb: 'Fierce, family-first and not to be crossed — you protect your own above all else, whatever it takes.' },
      { key: 'dingle', title: 'You’re a Dingle 🌾', blurb: 'Loud, loyal and always ready for a scrap or a knees-up. Blood is everything, and the door’s always open.' },
      { key: 'platt', title: 'You’re a Platt 🏠', blurb: 'Drama seems to find you — but underneath the chaos you’re resilient, sharp and endlessly forgiving.' },
      { key: 'mcqueen', title: 'You’re a McQueen 💅', blurb: 'Bold, brassy and impossible to ignore. You bring the glamour, the gossip and the fun wherever you go.' },
    ],
    questions: [
      {
        q: 'A family row kicks off. You’re the one who…',
        options: [
          { text: 'Ends it — firmly.', scores: { mitchell: 2 } },
          { text: 'Piles in loudly, then hugs it out.', scores: { dingle: 2 } },
          { text: 'Was somehow at the centre of it.', scores: { platt: 2 } },
          { text: 'Turns it into a story for the group chat.', scores: { mcqueen: 2 } },
        ],
      },
      {
        q: 'Your ideal night out is…',
        options: [
          { text: 'A quiet pint where everyone knows not to bother you.', scores: { mitchell: 2 } },
          { text: 'A big boozy family do at the local.', scores: { dingle: 2 } },
          { text: 'Whatever’s going — you’ll end up in the thick of it.', scores: { platt: 2 } },
          { text: 'Glammed up, front of the queue, first on the dancefloor.', scores: { mcqueen: 2 } },
        ],
      },
      {
        q: 'Someone crosses a person you love. You…',
        options: [
          { text: 'Make sure it never happens again.', scores: { mitchell: 2 } },
          { text: 'Rally the whole family to sort it.', scores: { dingle: 2 } },
          { text: 'Forgive, eventually — you always do.', scores: { platt: 2 } },
          { text: 'Get even with style and a smile.', scores: { mcqueen: 2 } },
        ],
      },
      {
        q: 'Your friends would describe you as…',
        options: [
          { text: 'Tough but fair.', scores: { mitchell: 2 } },
          { text: 'The heart of the group.', scores: { dingle: 2 } },
          { text: 'A survivor.', scores: { platt: 2 } },
          { text: 'The life and soul.', scores: { mcqueen: 2 } },
        ],
      },
      {
        q: 'What matters most to you?',
        options: [
          { text: 'Respect.', scores: { mitchell: 2 } },
          { text: 'Family.', scores: { dingle: 2 } },
          { text: 'Home.', scores: { platt: 2 } },
          { text: 'Having a laugh.', scores: { mcqueen: 2 } },
        ],
      },
    ],
  },
  {
    kind: 'personality',
    slug: 'which-soap-legend-are-you',
    title: 'Which soap legend are you?',
    standfirst:
      'Are you a brooding hard man, a scheming matriarch or the heart of the street? Find your soap-icon match.',
    emoji: '⭐',
    accent: '#00934b',
    results: [
      { key: 'phil', title: 'You’re Phil Mitchell 💪', blurb: 'Walford’s hard man. Gruff, formidable and fiercely loyal to family — nobody messes with you twice.' },
      { key: 'cain', title: 'You’re Cain Dingle 🔧', blurb: 'The antihero everyone roots for. Tough exterior, big heart, and always there when it counts.' },
      { key: 'gail', title: 'You’re Gail Platt 🏠', blurb: 'You’ve seen it all and survived every bit of it. Endlessly resilient and devoted to your family.' },
      { key: 'mercedes', title: 'You’re Mercedes McQueen 💋', blurb: 'Bold, glamorous and never dull. You live loudly, love hard and light up every room.' },
    ],
    questions: [
      {
        q: 'Pick a look:',
        options: [
          { text: 'Leather jacket, no nonsense.', scores: { phil: 2 } },
          { text: 'Overalls and a scowl.', scores: { cain: 2 } },
          { text: 'Sensible and smart.', scores: { gail: 2 } },
          { text: 'Bold, bright, unmissable.', scores: { mercedes: 2 } },
        ],
      },
      {
        q: 'Your catchphrase energy is…',
        options: [
          { text: '“Sort it.”', scores: { phil: 2 } },
          { text: 'A knowing silence.', scores: { cain: 2 } },
          { text: '“After everything I’ve been through…”', scores: { gail: 2 } },
          { text: '“Go on then!”', scores: { mercedes: 2 } },
        ],
      },
      {
        q: 'In a crisis you…',
        options: [
          { text: 'Take charge and handle it.', scores: { phil: 2 } },
          { text: 'Quietly fix it for the person you love.', scores: { cain: 2 } },
          { text: 'Hold the family together.', scores: { gail: 2 } },
          { text: 'Turn the drama up to eleven.', scores: { mercedes: 2 } },
        ],
      },
      {
        q: 'People underestimate you at their…',
        options: [
          { text: 'Peril.', scores: { phil: 2 } },
          { text: 'Cost.', scores: { cain: 2 } },
          { text: 'Surprise — you always bounce back.', scores: { gail: 2 } },
          { text: 'Entertainment.', scores: { mercedes: 2 } },
        ],
      },
      {
        q: 'Your love life is best described as…',
        options: [
          { text: 'Complicated but loyal.', scores: { phil: 2 } },
          { text: 'One true love, deep down.', scores: { cain: 2 } },
          { text: 'A long, eventful history.', scores: { gail: 2 } },
          { text: 'Never, ever boring.', scores: { mercedes: 2 } },
        ],
      },
    ],
  },
];

export const getQuiz = (slug: string) => quizzes.find((q) => q.slug === slug);
