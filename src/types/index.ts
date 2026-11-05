export type UserRole = "admin" | "sanctuary_owner" | "partner" | "reader";

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  fcmToken?: string;
  photoURL?: string;
}

// ==========================================
// OUR LITTLE MESSAGE BOXES (Signature Feature)
// ==========================================
export type MessageCategory = 
  | "Love" 
  | "Compliments" 
  | "Encouragement" 
  | "Funny" 
  | "Inside jokes" 
  | "Memories" 
  | "Appreciation" 
  | "Questions" 
  | "Little challenges" 
  | "Date ideas" 
  | "Reassurance" 
  | "Random thoughts" 
  | "Future dreams"
  | string;

export interface MessageBoxItem {
  id: string;
  title?: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  isAnonymous?: boolean;
  isSecret?: boolean; // Hidden from partner until revealed
  category: MessageCategory;
  photoUrl?: string;
  voiceUrl?: string;
  scheduledDate?: string; // YYYY-MM-DD
  isOpened: boolean;
  openedAt?: any;
  openedDateStr?: string;
  isFavorite?: boolean;
  reactions?: Record<string, string>; // userId -> emoji
  cycleNumber?: number;
  createdAt: any;
}

export interface DailyBoxSelection {
  id: string; // YYYY-MM-DD
  date: string;
  messageId: string;
  secondMessageId?: string; // Special days / anniversary dual reveal
  selectedAt: any;
  isOpened: boolean;
  openedBy?: string[];
}

// ==========================================
// 365 REASONS VAULT & SAFE SPACE
// ==========================================
export interface ReasonVaultItem {
  id: string;
  dayNumber: number; // 1 to 365
  text: string;
  author: string;
  authorId: string;
  photoUrl?: string;
  isFavorite?: boolean;
  dateAdded?: any;
}

export interface SafeSpaceItem {
  id: string;
  triggerKey: 
    | "comfort" 
    | "encouragement" 
    | "smile" 
    | "appreciated" 
    | "miss_you" 
    | "reassurance" 
    | "voice" 
    | "closeness";
  label: string;
  title: string;
  message: string;
  photoUrl?: string;
  voiceUrl?: string;
  quote?: string;
  authorName?: string;
}

// ==========================================
// OUR STORY & MEMORIES
// ==========================================
export interface TimelineMoment {
  id: string;
  date: string;
  title: string;
  description: string;
  photoUrl?: string;
  category: "meeting" | "first_date" | "proposal" | "wedding" | "anniversary" | "adventure" | "challenge" | "milestone";
  tags?: string[];
  reflection?: string;
  createdAt?: any;
}

export interface SharedMoment {
  id: string;
  date: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  isPrivate: boolean;
  highlightType: "highlight" | "appreciation" | "funny" | "conversation" | "memory";
  photoUrl?: string;
  createdAt: any;
}

export interface AudioMemory {
  id: string;
  title: string;
  description?: string;
  type: "voice_note" | "song_link" | "recorded_love";
  url: string;
  authorId: string;
  authorName: string;
  isFavorite?: boolean;
  createdAt: any;
}

// ==========================================
// OUR FUTURE & TRADITIONS
// ==========================================
export interface DreamBoardItem {
  id: string;
  title: string;
  description: string;
  category: "Home" | "Travel" | "Experiences" | "Career" | "Family" | "Free" | "Adventure" | "Personal";
  isCostNothing: boolean;
  progress: number; // 0 - 100
  photoUrl?: string;
  isCompleted: boolean;
  targetYear?: string;
  notes?: string;
  createdAt: any;
}

export interface FutureLetter {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  releaseDate: string; // YYYY-MM-DD
  isOpened: boolean;
  openedAt?: any;
  createdAt: any;
}

export interface DatePlan {
  id: string;
  title: string;
  description: string;
  category: "Free" | "At-Home" | "Outdoor" | "Conversation" | "Creative" | "Special";
  isCompleted: boolean;
  scheduledDate?: string;
  notes?: string;
  costEstimate?: "Free" | "$" | "$$";
  createdAt: any;
}

export interface MarriageTradition {
  id: string;
  title: string;
  frequency: "weekly" | "monthly" | "annually" | "custom";
  description: string;
  lastCompleted?: string;
  notes?: string;
}

export interface AnniversaryAnswers {
  favoriteMemory: string;
  feltLoved: string;
  overcameTogether: string;
  gratefulFor: string;
  nextYearDreams: string;
  messageToMarriedSelf: string;
}

export interface TimeCapsule {
  id: string;
  yearNumber: number; // 1, 2, 3...
  title: string;
  anniversaryDate: string;
  isSealed: boolean;
  unlockDate: string;
  partner1Answers?: AnniversaryAnswers;
  partner2Answers?: AnniversaryAnswers;
  sealedAt?: any;
  createdAt: any;
}

// ==========================================
// LITTLE THINGS: VOUCHERS & SURPRISES
// ==========================================
export interface LoveVoucher {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  recipientRole: "all" | "admin" | "reader";
  isRedeemed: boolean;
  redeemedAt?: any;
  iconName?: string;
  category?: string;
  createdAt: any;
}

export interface SurprisePoolItem {
  id: string;
  type: "letter" | "photo" | "compliment" | "voice" | "memory" | "free_date" | "challenge" | "message_box";
  title: string;
  content: string;
  extraUrl?: string;
  addedBy?: string;
  createdAt: any;
}

export interface DailyActOfLove {
  id: string;
  idea: string;
  category: "words" | "service" | "quality_time" | "gifts" | "comfort";
  isCustom?: boolean;
}

// ==========================================
// HER WELLBEING SANCTUARY (Privacy-First)
// ==========================================
export type FlowIntensity = "light" | "medium" | "heavy" | "spotting";

export interface CycleRecord {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  duration?: number;  // Period bleeding length (days)
  cycleLength?: number; // Total cycle length (days)
  flowIntensity?: FlowIntensity;
  hadSpotting?: boolean;
  symptoms?: string[];
  notes?: string;
  updatedAt?: any;
}

export interface WellbeingSymptom {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: "physical" | "emotional";
  symptomName: string;
  severity: 1 | 2 | 3 | 4 | 5; // Mild to Severe
  notes?: string;
  cycleDay?: number;
  tags?: string[];
  createdAt: any;
}

export interface WellbeingMood {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  moodScore: number; // 1-5
  moodLabel: string;
  energyLevel: number; // 1-5
  stressLevel: number; // 1-5
  sleepQuality: number; // 1-5
  notes?: string;
  createdAt: any;
}

export interface WellbeingMedication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  timeOfDay?: string;
  frequency: "daily" | "as_needed" | "twice_daily" | "weekly" | string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: any;
}

export interface WellbeingAppointment {
  id: string;
  userId: string;
  appointmentDate: string; // YYYY-MM-DD
  time?: string;
  providerName: string;
  specialty: string;
  questionsToAsk: string[];
  symptomsToDiscuss: string[];
  postVisitNotes?: string;
  followUpDate?: string;
  createdAt: any;
}

export interface WellbeingJournalEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  content: string;
  tags?: string[];
  photoUrl?: string;
  createdAt: any;
}

export interface WellbeingSettings {
  userId: string;
  shareWithPartner: boolean; // Master toggle
  shareCyclePhase: boolean;  // E.g. share Hayd/Tuhr for Salah & gentle care
  shareCareCravings: boolean; // E.g. Love Nudges / Care Quests
  showFertilityEstimates: boolean;
  showPhaseEducation: boolean;
  hydrationTargetGlasses?: number;
  updatedAt?: any;
}
