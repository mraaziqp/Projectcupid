import {
  MessageBoxItem,
  ReasonVaultItem,
  SafeSpaceItem,
  TimelineMoment,
  DreamBoardItem,
  DatePlan,
  MarriageTradition,
  LoveVoucher,
  DailyActOfLove,
  SurprisePoolItem
} from "../types";

export const INITIAL_MESSAGE_BOXES: Omit<MessageBoxItem, "id">[] = [
  {
    title: "A Gentle Reminder",
    content: "Just in case no one told you today: you are my absolute favourite person in the entire world. Thank you for choosing to do life with me.",
    authorId: "raaziq",
    authorName: "Raaziq",
    authorRole: "admin",
    category: "Love",
    isOpened: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    title: "Your Smile",
    content: "Whenever you smile properly — that real crinkly-eyed one — the whole room feels lighter. Never stop smiling like that.",
    authorId: "raaziq",
    authorName: "Raaziq",
    authorRole: "admin",
    category: "Compliments",
    isOpened: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    title: "Take a Deep Breath",
    content: "If today feels heavy or you have too much on your plate, pause. You don't have to carry the whole world today. Just take one small step at a time.",
    authorId: "raaziq",
    authorName: "Raaziq",
    authorRole: "admin",
    category: "Encouragement",
    isOpened: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    title: "Our Secret Joke",
    content: "Remember that time we made eye contact across the room and both burst out laughing without saying a single word? Best superpower ever.",
    authorId: "razia",
    authorName: "Razia",
    authorRole: "reader",
    category: "Inside jokes",
    isOpened: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    title: "Tonight's Challenge",
    content: "No scrolling on phones after 9pm tonight. Just you, me, a hot drink, and 30 minutes of proper conversation.",
    authorId: "raaziq",
    authorName: "Raaziq",
    authorRole: "admin",
    category: "Little challenges",
    isOpened: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    title: "Gratitude",
    content: "I was just thinking about how patient you are and how lucky I am to have you as my partner in this Dunya and in Jannah, Insha'Allah.",
    authorId: "razia",
    authorName: "Razia",
    authorRole: "reader",
    category: "Appreciation",
    isOpened: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    title: "Cape Town Sunset Date",
    content: "Let's grab warm takeout chips and watch the Atlantic sunset from Sea Point promenade this weekend.",
    authorId: "raaziq",
    authorName: "Raaziq",
    authorRole: "admin",
    category: "Date ideas",
    isOpened: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    title: "Random Question for You",
    content: "If we could travel anywhere next month with zero obligations for one week, what is the very first city you would pick?",
    authorId: "razia",
    authorName: "Razia",
    authorRole: "reader",
    category: "Questions",
    isOpened: false,
    isFavorite: false,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_365_REASONS: Omit<ReasonVaultItem, "id">[] = [
  { dayNumber: 1, text: "The way your eyes light up when you see something you love.", author: "Raaziq", authorId: "raaziq" },
  { dayNumber: 2, text: "How you always say Alhamdulillah, reminding our home of Allah's blessings.", author: "Raaziq", authorId: "raaziq" },
  { dayNumber: 3, text: "How safe and peaceful our home feels whenever you walk through the door.", author: "Razia", authorId: "razia" },
  { dayNumber: 4, text: "Your quiet resilience and inner strength when things get tough.", author: "Raaziq", authorId: "raaziq" },
  { dayNumber: 5, text: "The warm way you greet me after a long exhausting day.", author: "Raaziq", authorId: "raaziq" },
  { dayNumber: 6, text: "How you make the simplest cup of tea taste like comfort and care.", author: "Razia", authorId: "razia" },
  { dayNumber: 7, text: "Your sweet laughter that can turn around my worst mood in seconds.", author: "Raaziq", authorId: "raaziq" },
  { dayNumber: 8, text: "The way we can be in complete comfortable silence without any awkwardness.", author: "Raaziq", authorId: "raaziq" },
  { dayNumber: 9, text: "How deeply thoughtful you are about the people you love.", author: "Razia", authorId: "razia" },
  { dayNumber: 10, text: "The way our hands fit together like they were made for each other.", author: "Raaziq", authorId: "raaziq" },
  { dayNumber: 11, text: "Because you make ordinary everyday moments feel like a warm blessing.", author: "Raaziq", authorId: "raaziq" },
  { dayNumber: 12, text: "How you encourage my dreams and never let me doubt myself.", author: "Razia", authorId: "razia" }
];

export const INITIAL_SAFE_SPACE: SafeSpaceItem[] = [
  {
    id: "comfort",
    triggerKey: "comfort",
    label: "I need comfort",
    title: "You are held in love and safety",
    message: "Breathe in deeply, my love. Exhale slowly. Whatever feels heavy or confusing right now, remember that our home is your sanctuary. You do not have to carry everything alone. Let your shoulders drop, wrap yourself in warmth, and know that I am right beside you.",
    quote: "Verily, with hardship comes ease. — Surah Al-Inshirah 94:6",
    authorName: "Raaziq"
  },
  {
    id: "encouragement",
    triggerKey: "encouragement",
    label: "I need encouragement",
    title: "You are stronger than any moment of doubt",
    message: "Look at how much you have navigated with grace. You are capable, intelligent, and deeply resilient. Don't let one hard hour or tricky day convince you otherwise. I believe in you with every fiber of my being.",
    quote: "Allah does not burden a soul beyond that it can bear. — Surah Al-Baqarah 2:286",
    authorName: "Raaziq"
  },
  {
    id: "smile",
    triggerKey: "smile",
    label: "I need to smile",
    title: "A little burst of joy just for you",
    message: "Remember: you are officially married to a guy who thinks you are the most stunning woman on earth and who would happily fight a lion (or at least ask nicely) just to make you happy. You're stuck with me forever!",
    quote: "Laughter is an instant vacation for the heart.",
    authorName: "Raaziq"
  },
  {
    id: "appreciated",
    triggerKey: "appreciated",
    label: "I need to feel appreciated",
    title: "Everything you do is seen and treasured",
    message: "I see all the little things you do that no one else notices. The way you care for our space, your kindness, your thoughtful touches. You make my life a hundred times richer just by being in it.",
    quote: "He who does not thank people does not thank Allah. — Prophetic Hadith",
    authorName: "Raaziq"
  },
  {
    id: "miss_you",
    triggerKey: "miss_you",
    label: "I miss you",
    title: "Across any distance, my heart is right with you",
    message: "Even when work or errands keep us apart, my heart never leaves you. Counting down the minutes until I see your face, hug you, and hear about your day.",
    quote: "You have my whole heart, wherever we are.",
    authorName: "Raaziq"
  },
  {
    id: "reassurance",
    triggerKey: "reassurance",
    label: "I need reassurance",
    title: "We are an unbreakable team",
    message: "Nothing changes how much I love you. We are human, days get messy, emotions rise and fall, but our foundation is solid. I choose you yesterday, I choose you today, and I will choose you tomorrow. Always.",
    quote: "One shared marriage. Two individuals. A lifetime of memories.",
    authorName: "Raaziq"
  },
  {
    id: "voice",
    triggerKey: "voice",
    label: "I want to hear your voice",
    title: "Listen to my voice reminding you how loved you are",
    message: "Close your eyes. Imagine my hand in yours. Hear me saying: 'You are safe, you are cherished, and we will get through everything together.'",
    quote: "Peace comes when two hearts beat in remembrance of Allah.",
    authorName: "Raaziq"
  },
  {
    id: "closeness",
    triggerKey: "closeness",
    label: "I want to feel close to you",
    title: "Connected in heart and soul",
    message: "Let's pause right now. Send me a quick ping or come find me for a warm hug. Even 60 seconds of holding each other resets the whole world.",
    quote: "And He placed between you affection and mercy. — Surah Ar-Rum 30:21",
    authorName: "Raaziq"
  }
];

export const INITIAL_TIMELINE: TimelineMoment[] = [
  {
    id: "first_meeting",
    date: "The Beginning",
    title: "When Our Paths First Crossed",
    description: "The very first moment Allah decreed our paths would intersect. Looking back now, that single day set into motion the most blessed chapter of our lives.",
    category: "meeting",
    reflection: "SubhanAllah how destiny quietly brings two souls together."
  },
  {
    id: "first_date",
    date: "First Date",
    title: "Our First Real Conversation",
    description: "Nervous smiles, quiet laughter, and realizing within the first hour that there was something extraordinarily special and pure about this connection.",
    category: "first_date",
    reflection: "I knew right then that you were the one."
  },
  {
    id: "proposal",
    date: "The Promise",
    title: "The Proposal & Katb Al-Kitab",
    description: "Asking for your hand and promising before Allah and our families to cherish, protect, and love you through every season of life.",
    category: "proposal",
    reflection: "The easiest and most certain 'yes' of my life."
  },
  {
    id: "wedding",
    date: "Our Nikah & Wedding Day",
    title: "Mr & Mrs Parker — The Wedding Day",
    description: "Surrounded by our loved ones, making our covenant sacred under Allah's guidance. You looked breathtaking, radiant, and like an answered dua.",
    photoUrl: "/wedding.jpg",
    category: "wedding",
    reflection: "The most beautiful day of my existence."
  },
  {
    id: "cape_town_home",
    date: "Our Home",
    title: "Building Our Private World in Cape Town",
    description: "Setting up our home, learning each other's morning rhythms, laughing over cooking experiments, and creating a lifetime of private traditions.",
    category: "milestone",
    reflection: "Our little sanctuary against the world."
  }
];

export const INITIAL_DREAM_BOARD: DreamBoardItem[] = [
  {
    id: "dream_free_1",
    title: "Sunrise at Signal Hill with Warm Chai",
    description: "Wake up before dawn, wrap ourselves in one big cozy blanket, and watch the sun rise over Cape Town in quiet gratitude.",
    category: "Free",
    isCostNothing: true,
    progress: 75,
    isCompleted: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "dream_free_2",
    title: "Rainy Sunday Book Reading & Zero Screens",
    description: "A whole quiet Sunday listening to the rain on the roof, reading favorite books side by side with zero distractions.",
    category: "Free",
    isCostNothing: true,
    progress: 100,
    isCompleted: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "dream_free_3",
    title: "Annual Wedding Vows & Time Capsule Night",
    description: "Every single anniversary, sit down over dessert and read our letters to each other and seal our annual reflection answers.",
    category: "Free",
    isCostNothing: true,
    progress: 50,
    isCompleted: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "dream_hajj",
    title: "Perform Umrah & Hajj Hand in Hand",
    description: "Standing before the Ka'bah together, making tawaf hand in hand, and thanking Allah for bringing our souls together.",
    category: "Experiences",
    isCostNothing: false,
    progress: 40,
    isCompleted: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "dream_home",
    title: "Our Sunlit Sanctuary Home",
    description: "A peaceful private home with large windows, a warm kitchen for cooking together, and a cozy reading library.",
    category: "Home",
    isCostNothing: false,
    progress: 30,
    isCompleted: false,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_LOVE_VOUCHERS: LoveVoucher[] = [
  {
    id: "voucher_1",
    title: "Warm Breakfast in Bed",
    description: "Redeemable on any weekend morning. You don't leave the sheets until your favourite tea and breakfast are served on a tray.",
    creatorId: "raaziq",
    creatorName: "Raaziq",
    recipientRole: "reader",
    isRedeemed: false,
    category: "Pampering",
    iconName: "Coffee",
    createdAt: new Date().toISOString()
  },
  {
    id: "voucher_2",
    title: "Unconditional 30-Minute Massage",
    description: "Head, shoulders, or feet massage with calming oils and zero complaints or rushing.",
    creatorId: "raaziq",
    creatorName: "Raaziq",
    recipientRole: "reader",
    isRedeemed: false,
    category: "Care",
    iconName: "Sparkles",
    createdAt: new Date().toISOString()
  },
  {
    id: "voucher_3",
    title: "Movie & Snack Selector Immunity",
    description: "You choose the movie or series, no vetoes allowed, and the holder gets the best blanket and snacks.",
    creatorId: "razia",
    creatorName: "Razia",
    recipientRole: "admin",
    isRedeemed: false,
    category: "Entertainment",
    iconName: "Tv",
    createdAt: new Date().toISOString()
  },
  {
    id: "voucher_4",
    title: "Total Chore Pass for One Evening",
    description: "Dishes, kitchen cleanup, tidying up — all handled entirely by the issuer. Enjoy your peaceful rest.",
    creatorId: "raaziq",
    creatorName: "Raaziq",
    recipientRole: "reader",
    isRedeemed: false,
    category: "Service",
    iconName: "CheckCircle",
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_DATE_PLANS: DatePlan[] = [
  {
    id: "date_1",
    title: "Sunset Promenade Walk & Sea Point Ice Cream",
    description: "Stroll along the Atlantic coast, feel the fresh sea breeze, and talk about everything without looking at our phones.",
    category: "Free",
    isCompleted: true,
    costEstimate: "Free",
    createdAt: new Date().toISOString()
  },
  {
    id: "date_2",
    title: "Living Room Floor Picnic & Candlelight",
    description: "Move the coffee table aside, lay out plush pillows and blankets, and have our favorite dinner on the floor by candlelight.",
    category: "At-Home",
    isCompleted: false,
    costEstimate: "$",
    createdAt: new Date().toISOString()
  },
  {
    id: "date_3",
    title: "Kirstenbosch Gardens Botanical Escape",
    description: "Packs snacks, walk under the tree canopy walkway (Boomslang), and enjoy the serenity of Table Mountain slopes.",
    category: "Outdoor",
    isCompleted: false,
    costEstimate: "$",
    createdAt: new Date().toISOString()
  },
  {
    id: "date_4",
    title: "Cook a New Recipe From Scratch Challenge",
    description: "Pick an international dish we've never cooked before, put on acoustic music, and cook it together step by step.",
    category: "Creative",
    isCompleted: false,
    costEstimate: "$",
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_TRADITIONS: MarriageTradition[] = [
  {
    id: "trad_1",
    title: "Friday Evening Tea & Appreciation",
    frequency: "weekly",
    description: "After Jumu'ah and the week wraps up, sit with fresh tea and name 3 specific things we appreciated about each other this week."
  },
  {
    id: "trad_2",
    title: "Monthly Marriage Check-in & Dream Sync",
    frequency: "monthly",
    description: "A gentle, loving check-in: How are our emotional batteries? What was our favorite memory this month? What can we do better next month?"
  },
  {
    id: "trad_3",
    title: "Annual Anniversary Time Capsule",
    frequency: "annually",
    description: "Answer the 6 annual marriage questions together, seal the capsule, and unseal previous years to see how our love has deepened."
  }
];

export const INITIAL_DAILY_ACTS: DailyActOfLove[] = [
  { id: "act_1", idea: "Send an unexpected text message during work hours telling them one specific reason you adore them.", category: "words" },
  { id: "act_2", idea: "Prepare their favorite warm beverage and bring it to them without being asked.", category: "service" },
  { id: "act_3", idea: "Ask: 'How is your heart feeling today?' and really listen without trying to fix anything immediately.", category: "quality_time" },
  { id: "act_4", idea: "Leave a handwritten post-it note where they will stumble upon it during the day.", category: "words" },
  { id: "act_5", idea: "Take care of one task or errand they usually handle so they have one less thing to worry about.", category: "service" },
  { id: "act_6", idea: "Give them a long, uninterrupted 20-second hug before saying goodbye or hello.", category: "comfort" }
];

export const INITIAL_SURPRISE_POOL: SurprisePoolItem[] = [
  {
    id: "surp_1",
    type: "compliment",
    title: "A Sudden Realization",
    content: "You make life feel soft and safe. In a loud world, being with you feels like arriving home.",
    createdAt: new Date().toISOString()
  },
  {
    id: "surp_2",
    type: "memory",
    title: "A Treasured Memory",
    content: "Remember that rainy evening when we ordered takeout and watched the city lights through the window? Simple, perfect, and unforgettable.",
    createdAt: new Date().toISOString()
  },
  {
    id: "surp_3",
    type: "free_date",
    title: "Spontaneous Free Date",
    content: "Tonight: Put on comfy socks, make a cup of cocoa, and let's go on a virtual tour of scenic destinations or browse our wedding photos.",
    createdAt: new Date().toISOString()
  },
  {
    id: "surp_4",
    type: "challenge",
    title: "A Little Romance Challenge",
    content: "Tell each other 3 things you love about each other's personality before we go to sleep tonight.",
    createdAt: new Date().toISOString()
  }
];
