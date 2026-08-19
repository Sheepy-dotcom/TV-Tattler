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
  {
    kind: 'trivia',
    slug: 'the-eastenders-quiz',
    title: 'The EastEnders quiz',
    standfirst: 'From the Queen Vic to Albert Square — how well do you know Walford? Six questions, no spoilers.',
    emoji: '🍺',
    accent: '#5c2d91',
    questions: [
      {
        q: 'Which pub is the beating heart of EastEnders?',
        options: ['The Rovers Return', 'The Woolpack', 'The Queen Victoria', 'The Dog in the Pond'],
        answer: 2,
      },
      {
        q: 'EastEnders is set in which fictional London borough?',
        options: ['Weatherfield', 'Walford', 'Chester', 'Beckindale'],
        answer: 1,
      },
      {
        q: 'Which family is Walford’s fearsome first family, headed by Phil?',
        options: ['The Slaters', 'The Beales', 'The Mitchells', 'The Carters'],
        answer: 2,
      },
      {
        q: 'Which actor has played hard man Phil Mitchell since 1990?',
        options: ['Steve McFadden', 'Ross Kemp', 'Danny Dyer', 'Adam Woodyatt'],
        answer: 0,
      },
      {
        q: 'The residents of EastEnders live around which famous square?',
        options: ['Albert Square', 'Weatherfield', 'Trafalgar Square', 'The Dales'],
        answer: 0,
      },
      {
        q: 'Long-running character Ian Beale belongs to which family?',
        options: ['The Brannings', 'The Beales', 'The Slaters', 'The Mitchells'],
        answer: 1,
      },
    ],
    bands: [
      { min: 6, title: 'Top of the Vic 👑', blurb: 'A true Walford local — nothing gets past you on the Square.' },
      { min: 4, title: 'Regular punter 🍺', blurb: 'You know your Beales from your Brannings. Solid.' },
      { min: 2, title: 'Occasional visitor 🚕', blurb: 'You pop in now and then — time for a proper catch-up.' },
      { min: 0, title: 'New in Walford 🧳', blurb: 'Fresh off the market. Have a wander round the Square!' },
    ],
  },
  {
    kind: 'trivia',
    slug: 'the-coronation-street-quiz',
    title: 'The Coronation Street quiz',
    standfirst: 'Sixty-plus years on the cobbles — how well do you know Weatherfield? Six questions to find out.',
    emoji: '🧱',
    accent: '#d81f2a',
    questions: [
      {
        q: 'Which pub do Weatherfield locals call their own?',
        options: ['The Queen Victoria', 'The Rovers Return', 'The Woolpack', 'The Bistro'],
        answer: 1,
      },
      {
        q: 'Coronation Street is set in which fictional area of Greater Manchester?',
        options: ['Walford', 'Weatherfield', 'Beckindale', 'Chester'],
        answer: 1,
      },
      {
        q: 'Which character has appeared since the very first episode in 1960?',
        options: ['Steve McDonald', 'Ken Barlow', 'Roy Cropper', 'Kevin Webster'],
        answer: 1,
      },
      {
        q: 'Which actor has played Ken Barlow since day one?',
        options: ['William Roache', 'David Neilson', 'Michael Le Vell', 'Simon Gregson'],
        answer: 0,
      },
      {
        q: 'The Street’s founding dynasty is which family?',
        options: ['The Platts', 'The Barlows', 'The Dingles', 'The Connors'],
        answer: 1,
      },
      {
        q: 'Gail — of endless-marriages fame — belongs to which family?',
        options: ['The Platts', 'The Websters', 'The Barlows', 'The Baldwins'],
        answer: 0,
      },
    ],
    bands: [
      { min: 6, title: 'Cobbles royalty 👑', blurb: 'You could run the Rovers single-handed. Faultless.' },
      { min: 4, title: 'Weatherfield regular ☕', blurb: 'A dependable fan — you rarely miss a Barlow bust-up.' },
      { min: 2, title: 'Bit rusty 🧱', blurb: 'You know the basics. A Corrie boxset weekend beckons.' },
      { min: 0, title: 'Just moved in 📦', blurb: 'Welcome to the Street! Plenty to catch up on.' },
    ],
  },
  {
    kind: 'trivia',
    slug: 'the-emmerdale-quiz',
    title: 'The Emmerdale quiz',
    standfirst: 'Down in the Dales with the Dingles and the Tates — how well do you know the village? Six questions.',
    emoji: '🚜',
    accent: '#00934b',
    questions: [
      {
        q: 'Which pub serves the village of Emmerdale?',
        options: ['The Rovers Return', 'The Woolpack', 'The Queen Victoria', 'Home Farm'],
        answer: 1,
      },
      {
        q: 'Emmerdale’s biggest, most chaotic family is the…',
        options: ['Tates', 'Sugdens', 'Dingles', 'Kings'],
        answer: 2,
      },
      {
        q: 'The show was originally broadcast under which title?',
        options: ['Emmerdale Farm', 'The Dales', 'Beckindale', 'Home Farm'],
        answer: 0,
      },
      {
        q: 'Which brooding Dingle mechanic is played by Jeff Hordley?',
        options: ['Marlon Dingle', 'Sam Dingle', 'Cain Dingle', 'Paddy Kirk'],
        answer: 2,
      },
      {
        q: 'Which scheming family is long associated with Home Farm?',
        options: ['The Tates', 'The Dingles', 'The Sugdens', 'The Bartons'],
        answer: 0,
      },
      {
        q: 'Emmerdale is set in which part of England?',
        options: ['The Lake District', 'The Yorkshire Dales', 'The Cotswolds', 'The Peak District'],
        answer: 1,
      },
    ],
    bands: [
      { min: 6, title: 'Dingle by heart 👑', blurb: 'You know every family feud in the village. Superb.' },
      { min: 4, title: 'Village regular 🐑', blurb: 'A steady hand at the Woolpack bar. Well done.' },
      { min: 2, title: 'Passing through 🚜', blurb: 'You catch the odd episode — worth a proper visit.' },
      { min: 0, title: 'City slicker 🏙️', blurb: 'New to the Dales! Pull up a stool and settle in.' },
    ],
  },
  {
    kind: 'trivia',
    slug: 'the-hollyoaks-quiz',
    title: 'The Hollyoaks quiz',
    standfirst: 'Chester’s liveliest village and its most dramatic family — how well do you know Hollyoaks? Six questions.',
    emoji: '🎓',
    accent: '#e6007e',
    questions: [
      {
        q: 'Hollyoaks is set in a fictional suburb near which city?',
        options: ['Manchester', 'Liverpool', 'Chester', 'Leeds'],
        answer: 2,
      },
      {
        q: 'Which big, brash family is central to Hollyoaks?',
        options: ['The Osbornes', 'The McQueens', 'The Nightingales', 'The Lomaxes'],
        answer: 1,
      },
      {
        q: 'In which decade did Hollyoaks first air?',
        options: ['1980s', '1990s', '2000s', '1970s'],
        answer: 1,
      },
      {
        q: 'Which channel is the home of Hollyoaks?',
        options: ['BBC One', 'ITV', 'Channel 4', 'Channel 5'],
        answer: 2,
      },
      {
        q: 'Bold and brassy Mercedes belongs to which family?',
        options: ['The McQueens', 'The Osbornes', 'The Blakes', 'The Nightingales'],
        answer: 0,
      },
      {
        q: 'Which of these soaps is best known for its younger, student-focused cast?',
        options: ['Coronation Street', 'Emmerdale', 'Hollyoaks', 'EastEnders'],
        answer: 2,
      },
    ],
    bands: [
      { min: 6, title: 'Village legend 👑', blurb: 'You know every McQueen and every scandal. Flawless.' },
      { min: 4, title: 'Regular viewer 🎬', blurb: 'A proper fan — you keep up with the drama.' },
      { min: 2, title: 'Dropping in 🎓', blurb: 'You catch the odd episode. Time for a binge?' },
      { min: 0, title: 'Fresher 📚', blurb: 'New to the village — welcome! Lots to discover.' },
    ],
  },
];

export const getQuiz = (slug: string) => quizzes.find((q) => q.slug === slug);
