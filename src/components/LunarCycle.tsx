import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, Sparkles, Heart, Calendar, Utensils, CheckCircle, BookOpen, AlertTriangle } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, Timestamp, updateDoc, doc, getDocs } from "firebase/firestore";
import { notifyPartner } from "../lib/notifications";
import { differenceInDays, format, startOfDay, addMonths } from "date-fns";
import { cn } from "../lib/utils";

interface CycleData {
  id: string;
  startDate: any; // Timestamp
  duration: number;
}

interface CareQuest {
  id: string;
  userId: string;
  craving: string;
  status: 'pending' | 'fulfilled';
  createdAt: any;
}

type Phase = "Hayd" | "Follicular" | "Ovulatory" | "Luteal";

interface PhaseDetails {
  name: string;
  arabicName: string;
  range: [number, number];
  color: string;
  advice: string;
  partner: string;
  salahStatus: string;
  fastingStatus: string;
  duas: string[];
  dhikr: string[];
}

const PHASES: Record<Phase, PhaseDetails> = {
  Hayd: {
    name: "Menstrual (Hayd)",
    arabicName: "حيض",
    range: [1, 6],
    color: "from-rose-500 to-pink-600",
    advice: "Your body is resting and clearing. Focus on hydration, warmth, and gentle movement. Remember, your exemption from prayer is a mercy from Allah. Use this time to connect through Dhikr and listening to the Quran.",
    partner: "Razia is in her Hayd phase. She is resting and exempt from Salah. Great time to bring her warm herbal tea, make a heating pad ready, and take care of daily chores. Be gentle and loving—as the Prophet (PBUH) was.",
    salahStatus: "Exempt (Spiritual Rest)",
    fastingStatus: "Exempt (Make up later)",
    duas: [
      "Allahumma Rabba-n-nas, adhhibil-ba's, ashfi Antash-Shafi, la shifa'a illa shifa'uk. (O Allah, Lord of mankind, remove the harm, heal, You are the Healer.)",
      "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Adheem. (Sufficient is Allah for me...)"
    ],
    dhikr: [
      "Astaghfirullah (Seeking forgiveness)",
      "SubhanAllah wal-Hamdulillah wa la ilaha illallah Wallahu Akbar (Glorifying Allah)",
      "Salawat (Sending blessings upon the Prophet)"
    ]
  },
  Follicular: {
    name: "Follicular (Tuhr / Rise)",
    arabicName: "طهر",
    range: [7, 11],
    color: "from-emerald-400 to-teal-500",
    advice: "Energy levels are rising! Great time to resume full daily prayers with energy, plan voluntary Sunnah fasts, and dive into creative or active projects.",
    partner: "Razia is in her Follicular phase. Energy is returning. It's a wonderful time to go for a outdoor walk in Cape Town or plan a voluntary Monday/Thursday fast together!",
    salahStatus: "Active (Prayers obligatory)",
    fastingStatus: "Active (Fasting permitted)",
    duas: [
      "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar. (O Allah, grant us goodness in this world and the next.)"
    ],
    dhikr: [
      "Alhamdulillah (Praising Allah for restored energy)",
      "La hawla wa la quwwata illa billah (There is no power except with Allah)"
    ]
  },
  Ovulatory: {
    name: "Ovulatory (Tuhr / Peak)",
    arabicName: "طهر",
    range: [12, 16],
    color: "from-blue-400 to-indigo-500",
    advice: "Spiritual, social, and emotional energy are at their peak. It is the perfect time for deep Wudu, extra voluntary prayers (Tahajjud/Duha), and family gatherings.",
    partner: "Razia is in her Ovulatory phase. Energy and battery are high! Perfect night to plan a date out or cook a special dinner together.",
    salahStatus: "Active (Prayers obligatory)",
    fastingStatus: "Active (Fasting permitted)",
    duas: [
      "Rabbi hab lee min ladunka dhurriyyatan tayyibatan innaka samee'ud-du'aa'. (My Lord, grant me a righteous offspring.)"
    ],
    dhikr: [
      "SubhanAllahi wa bihamdihi, SubhanAllahil-Adheem (Glory and praise be to Allah)"
    ]
  },
  Luteal: {
    name: "Luteal (Tuhr / Reflection)",
    arabicName: "طهر",
    range: [17, 28],
    color: "from-purple-500 to-indigo-600",
    advice: "Vibes are turning cozy and nesting. Slow down, focus on reflective Wudu, warm reading, and gentle, slower prayer rhythms.",
    partner: "Razia is in her Luteal phase. She may be feeling more reflective or sensitive. Plan a quiet evening with parallel reading, dim lights, and low-key comfort.",
    salahStatus: "Active (Prayers obligatory)",
    fastingStatus: "Active (Fasting permitted)",
    duas: [
      "Ya Hayyu Ya Qayyum, bi-rahmatika astagheeth. (O Ever-Living, O Self-Sustaining, in Your mercy I seek relief.)"
    ],
    dhikr: [
      "La ilaha illa Anta subhanaka inni kuntu minaz-zhalimeen (Dua of Yunus for distress)"
    ]
  }
};

const DHIKR_COMFORTS = [
  { text: "Verily, in the remembrance of Allah do hearts find rest.", source: "Surah Ar-Ra'd 13:28", benefit: "For peace and calming anxiety." },
  { text: "Allah does not burden a soul beyond that it can bear.", source: "Surah Al-Baqarah 2:286", benefit: "For physical comfort and endurance." },
  { text: "And He is with you wherever you are.", source: "Surah Al-Hadid 57:4", benefit: "For feeling Allah's warm presence." },
  { text: "Indeed, with hardship comes ease.", source: "Surah Al-Inshirah 94:6", benefit: "For patience during pain." },
  { text: "SubhanAllahi wa bihamdihi (Glory be to Allah and His praise)", source: "Prophetic Hadith", benefit: "Sins forgiven, light on tongue." },
  { text: "La hawla wa la quwwata illa billah (No power except with Allah)", source: "Prophetic Treasure", benefit: "A cure for ninety-nine illnesses." }
];

function MoonShape({ day, className, size = 12 }: { day: number; className?: string; size?: number }) {
  if (day >= 12 && day <= 16) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <circle cx="8" cy="8" r="6" fill="currentColor" className="drop-shadow-[0_0_2px_currentColor]" />
      </svg>
    );
  }
  if (day >= 1 && day <= 6) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" />
        <path d="M 8 2 A 6 6 0 0 1 12 8 A 6 6 0 0 0 8 2" fill="currentColor" />
      </svg>
    );
  }
  if (day >= 7 && day <= 11) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" />
        <path d="M 8 2 A 6 6 0 0 1 14 8 A 6 6 0 0 1 8 14 A 2.5 6 0 0 0 8 2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <path d="M 8 2 A 2.5 6 0 0 0 8 14 A 6 6 0 0 0 14 8 A 6 6 0 0 0 8 2" fill="currentColor" />
    </svg>
  );
}

function CentralGlowMoon({ day, size = 64 }: { day: number; size?: number }) {
  const isHayd = day >= 1 && day <= 6;
  const isFollicular = day >= 7 && day <= 11;
  const isOvulatory = day >= 12 && day <= 16;
  
  const glowColor = isHayd
    ? "rgba(244, 63, 94, 0.4)"
    : isFollicular
    ? "rgba(52, 211, 153, 0.4)"
    : isOvulatory
    ? "rgba(96, 165, 250, 0.5)"
    : "rgba(167, 139, 250, 0.4)";

  let shadowPath = "";
  if (isOvulatory) {
    shadowPath = "";
  } else if (isHayd) {
    shadowPath = "M 24,2 A 22,22 0 1,1 24,46 A 19,22 0 1,1 24,2 Z";
  } else if (isFollicular) {
    shadowPath = "M 24,2 A 22,22 0 0,0 24,46 A 6,22 0 0,1 24,2 Z";
  } else {
    shadowPath = "M 24,2 A 6,22 0 0,1 24,46 A 22,22 0 0,0 24,2 Z";
  }

  return (
    <div className="relative flex items-center justify-center select-none">
      <svg width={size} height={size} viewBox="0 0 48 48" className="drop-shadow-[0_0_12px_var(--glow)] transition-all duration-700" style={{ "--glow": glowColor } as any}>
        <defs>
          <radialGradient id="moonBody" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>
          <radialGradient id="haydBody" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="60%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
          </radialGradient>
        </defs>

        <circle cx="24" cy="24" r="22" fill={isHayd ? "url(#haydBody)" : "url(#moonBody)"} />
        <circle cx="16" cy="18" r="3" fill="#64748b" opacity="0.12" />
        <circle cx="28" cy="16" r="2" fill="#64748b" opacity="0.1" />
        <circle cx="20" cy="30" r="3.5" fill="#64748b" opacity="0.12" />
        <circle cx="32" cy="28" r="2.5" fill="#64748b" opacity="0.08" />

        {shadowPath && (
          <path d={shadowPath} fill="#09090b" opacity="0.85" className="transition-all duration-500" />
        )}

        <circle cx="24" cy="24" r="22" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />
      </svg>
    </div>
  );
}

export default function LunarCycle({ 
  userId, 
  userEmail, 
  isAdmin 
}: { 
  userId: string; 
  userEmail: string; 
  isAdmin: boolean 
}) {
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [craving, setCraving] = useState("");
  const [activeQuests, setActiveQuests] = useState<CareQuest[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [ghuslLogged, setGhuslLogged] = useState(false);
  
  // Custom states
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeSymptoms, setActiveSymptoms] = useState<Record<string, string>>({});
  const [symptomSaving, setSymptomSaving] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  
  // Polaroid Dhikr states
  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [showDhikrCard, setShowDhikrCard] = useState(false);

  // Qada Tracker State
  const [qadaMissed, setQadaMissed] = useState(0);
  const [qadaCompleted, setQadaCompleted] = useState(0);
  const [partnerProfileName, setPartnerProfileName] = useState("Razia");

  const today = new Date();
  const hijriDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(today);
    } catch (e) {
      return "Islamic Moon Syncing...";
    }
  }, [today]);

  useEffect(() => {
    // 1. Cycle Log Listener
    const cycleQ = query(
      collection(db, "cycle_logs"),
      ...(isAdmin ? [] : [where("userId", "==", userId)]),
      orderBy("startDate", "desc"),
      limit(1)
    );

    const unsubCycle = onSnapshot(cycleQ, (snapshot) => {
      if (!snapshot.empty) {
        setCycle({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CycleData);
      }
      setLoading(false);
    });

    // 2. Care Quests Listener
    const questQ = query(
      collection(db, "care_quests"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubQuests = onSnapshot(questQ, (snapshot) => {
      setActiveQuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CareQuest)));
    });

    // 3. User Profile / Qada Fasts Listener
    let unsubUser = () => {};
    const setupUserData = async () => {
      let targetUserId = userId;
      if (isAdmin) {
        try {
          const usersSnap = await getDocs(collection(db, "users"));
          const partner = usersSnap.docs.find((u) => u.id !== userId);
          if (partner) {
            targetUserId = partner.id;
          }
        } catch (err) {
          console.error("Error fetching partner user:", err);
        }
      }

      const userRef = doc(db, "users", targetUserId);
      unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setQadaMissed(data.qadaMissed || 0);
          setQadaCompleted(data.qadaCompleted || 0);
          setPartnerProfileName(data.displayName || (isAdmin ? "Razia" : "Mohammed"));
          setActiveSymptoms(data.activeSymptoms || {});
        }
      });
    };
    setupUserData();

    return () => {
      unsubCycle();
      unsubQuests();
      unsubUser();
    };
  }, [userId, isAdmin]);

  const logCycleStart = async () => {
    try {
      await addDoc(collection(db, "cycle_logs"), {
        userId,
        startDate: Timestamp.now(),
        duration: 28,
        updatedAt: Timestamp.now()
      });
      setGhuslLogged(false);

      const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
      const senderName = isMohammed ? "Your Husband" : "Your Wife";
      await notifyPartner(
        userId,
        "Period Started (Hayd Active) 🌹",
        `${senderName} has logged the start of her period cycle. Keep her comfortable and supported!`,
        senderName,
        "general"
      );

      // Trigger Resend email
      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "Period Cycle Logged 🌹",
          body: `${senderName} has logged the start of her cycle. Be gentle, warm, and loving today!`,
          senderName,
          theme: "general"
        })
      }).catch(err => console.error("Email warning:", err));

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "cycle_logs");
    }
  };

  const handleLogGhusl = async () => {
    if (ghuslLogged || !cycle) return;
    try {
      setGhuslLogged(true);

      const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
      const senderName = isMohammed ? "Your Husband" : "Your Wife";
      
      await notifyPartner(
        userId,
        "Ghusl Completed (Taharah Restored) 🌸",
        `${senderName} has completed her Ghusl and entered the state of purity (Taharah). She is ready to resume prayers!`,
        senderName,
        "feeling"
      );

      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "Ghusl Completed (Purity Restored) 🌸",
          body: `${senderName} is entering pure status (Taharah) and resuming daily prayers.`,
          senderName,
          theme: "feeling"
        })
      }).catch(err => console.error("Email warning:", err));

    } catch (e) {
      console.error("Ghusl notification failed:", e);
    }
  };

  const updateQadaFasts = async (missedDiff: number, completedDiff: number) => {
    try {
      let targetUserId = userId;
      if (isAdmin) {
        const usersSnap = await getDocs(collection(db, "users"));
        const partner = usersSnap.docs.find((u) => u.id !== userId);
        if (partner) targetUserId = partner.id;
      }

      const nextMissed = Math.max(0, qadaMissed + missedDiff);
      const nextCompleted = Math.max(0, Math.min(nextMissed, qadaCompleted + completedDiff));

      if (completedDiff > 0 && nextCompleted > qadaCompleted) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }

      const userRef = doc(db, "users", targetUserId);
      await updateDoc(userRef, {
        qadaMissed: nextMissed,
        qadaCompleted: nextCompleted
      });
    } catch (e) {
      console.error("Failed to update Qada fasts in database:", e);
    }
  };

  const submitQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!craving.trim()) return;
    try {
      await addDoc(collection(db, "care_quests"), {
        userId,
        craving: craving.trim(),
        status: "pending",
        createdAt: Timestamp.now()
      });

      const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
      const senderName = isMohammed ? "Your Husband" : "Your Wife";
      await notifyPartner(
        userId,
        "New Craving Quest! 🍫",
        `${senderName} is craving: "${craving.trim()}". Can you procure it for her? 🥺`,
        senderName,
        "nudge"
      );

      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "New Care Side-Quest! 🍫",
          body: `${senderName} is craving: "${craving.trim()}". See if you can procure it!`,
          senderName,
          theme: "nudge"
        })
      }).catch(err => console.error("Email warning:", err));

      setCraving("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "care_quests");
    }
  };

  const fulfillQuest = async (id: string, questUserId: string, cravingName: string) => {
    try {
      await updateDoc(doc(db, "care_quests", id), { status: "fulfilled" });

      const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
      const senderName = isMohammed ? "Your Husband" : "Your Wife";
      
      await notifyPartner(
        userId, 
        "Side Quest Fulfilled! 💓", 
        `${senderName} has procured your craving: "${cravingName}"! 🥰`,
        senderName,
        "nudge"
      );

      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "Quest Fulfilled! 💓",
          body: `${senderName} has fulfilled your craving: "${cravingName}"! 🥰`,
          senderName,
          theme: "nudge"
        })
      }).catch(err => console.error("Email warning:", err));

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "care_quests");
    }
  };

  const saveSymptoms = async (newSymptoms: Record<string, string>) => {
    setSymptomSaving(true);
    try {
      let targetUserId = userId;
      const userRef = doc(db, "users", targetUserId);
      await updateDoc(userRef, {
        activeSymptoms: newSymptoms,
        symptomsTimestamp: Timestamp.now()
      });

      const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
      const senderName = isMohammed ? "Your Husband" : "Your Wife";
      
      const loggedList = Object.entries(newSymptoms)
        .filter(([_, level]) => level !== "none")
        .map(([name, level]) => `${name.toUpperCase()}: ${level}`)
        .join(", ");
      
      if (loggedList) {
        await notifyPartner(
          userId,
          "Symptoms Updated 🌡",
          `${senderName} updated her symptoms: ${loggedList}. Check the Support Radar.`,
          senderName,
          "feeling"
        );
      }
    } catch (e) {
      console.error("Failed to save symptoms:", e);
    } finally {
      setSymptomSaving(false);
    }
  };

  const triggerSOS = async () => {
    setSosSending(true);
    try {
      const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
      const senderName = isMohammed ? "Your Husband" : "Your Wife";
      
      await notifyPartner(
        userId,
        "🚨 URGENT: SOS Sanctuary Alert!",
        `${senderName} is experiencing severe menstrual discomfort right now and needs your direct support, tea, or comfort. 🥺`,
        senderName,
        "nudge"
      );

      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "🚨 URGENT: SOS Menstrual Comfort Alert!",
          body: `${senderName} is experiencing severe menstrual pain/discomfort right now and needs your direct care. Please prepare tea, heating pad, or show loving comfort.`,
          senderName,
          theme: "nudge"
        })
      }).catch(err => console.error("Email warning:", err));

      setShowSOSModal(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSosSending(false);
    }
  };

  const generateDhikr = () => {
    const nextIdx = Math.floor(Math.random() * DHIKR_COMFORTS.length);
    setDhikrIndex(nextIdx);
    setShowDhikrCard(true);
  };

  const start = cycle ? cycle.startDate.toDate() : null;
  const currentDayOfCycle = start ? (differenceInDays(startOfDay(today), startOfDay(start)) % 28) + 1 : 1;

  const getPhaseInfo = (): (PhaseDetails & { dayOfCycle: number; phase: Phase }) | null => {
    if (!cycle) return null;
    const dayOfCycle = selectedDay !== null ? selectedDay : currentDayOfCycle;
    
    let currentPhase: Phase = "Hayd";
    for (const [phase, info] of Object.entries(PHASES)) {
      if (dayOfCycle >= info.range[0] && dayOfCycle <= info.range[1]) {
        currentPhase = phase as Phase;
        break;
      }
    }
    
    return { dayOfCycle, phase: currentPhase, ...PHASES[currentPhase] };
  };

  const info = getPhaseInfo();

  // Days left & percentage calculation inside phase
  const getPhaseCountdown = () => {
    if (!info) return { daysLeft: 0, pct: 0 };
    const [startPhaseDay, endPhaseDay] = info.range;
    const totalDays = endPhaseDay - startPhaseDay + 1;
    const currentPhaseDay = info.dayOfCycle - startPhaseDay + 1;
    const daysLeft = endPhaseDay - info.dayOfCycle;
    const pct = Math.max(0, Math.min(1, currentPhaseDay / totalDays));
    return { daysLeft, pct };
  };

  const { daysLeft, pct: phasePct } = getPhaseCountdown();

  // Draw 28 moon dots in a circle
  const radius = 78;
  const svgCenter = 96;
  const moonDots = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const angle = (i * 2 * Math.PI) / 28 - Math.PI / 2;
      const x = svgCenter + radius * Math.cos(angle);
      const y = svgCenter + radius * Math.sin(angle);
      const day = i + 1;
      
      let colorClass = "text-rose-500/20";
      if (day >= 1 && day <= 6) colorClass = "text-rose-500";
      else if (day >= 7 && day <= 11) colorClass = "text-emerald-400";
      else if (day >= 12 && day <= 16) colorClass = "text-blue-400";
      else colorClass = "text-purple-400";
      
      return { x, y, day, colorClass };
    });
  }, [radius, svgCenter]);

  // Compute Hormones (Estrogen, Progesterone, LH) mathematically
  const getHormoneValues = (d: number) => {
    let estrogen = 10;
    if (d <= 14) {
      estrogen = 10 + 75 * Math.exp(-Math.pow((d - 12.5) / 3.5, 2));
    } else {
      estrogen = 10 + 40 * Math.exp(-Math.pow((d - 21) / 4.0, 2));
    }

    let progesterone = 5;
    if (d > 14) {
      progesterone = 5 + 80 * Math.exp(-Math.pow((d - 21.5) / 4.0, 2));
    }

    const lh = 5 + 90 * Math.exp(-Math.pow((d - 13.8) / 1.2, 2));

    return { estrogen, progesterone, lh };
  };

  const { estrogenPath, progesteronePath, lhPath } = useMemo(() => {
    let est = "M 0 90";
    let prog = "M 0 95";
    let lh = "M 0 95";

    for (let d = 1; d <= 28; d++) {
      const x = (d - 1) * 10;
      const values = getHormoneValues(d);
      
      const yEst = 100 - values.estrogen;
      const yProg = 100 - values.progesterone;
      const yLh = 100 - values.lh;

      if (d === 1) {
        est = `M ${x} ${yEst}`;
        prog = `M ${x} ${yProg}`;
        lh = `M ${x} ${yLh}`;
      } else {
        est += ` L ${x} ${yEst}`;
        prog += ` L ${x} ${yProg}`;
        lh += ` L ${x} ${yLh}`;
      }
    }

    return { estrogenPath: est, progesteronePath: prog, lhPath: lh };
  }, []);

  if (loading) return <div className="h-48 animate-pulse bg-white/5 rounded-3xl" />;

  return (
    <GlassPanel className="p-8 relative overflow-hidden group">
      {/* Background glow syncing with selected phase */}
      <div className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 blur-[130px] opacity-15 transition-all duration-1000",
        info ? `bg-gradient-to-br ${info.color}` : "bg-white/5"
      )} />

      {/* Styled Animations */}
      <style>{`
        @keyframes rotatingOrbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes twinklestar {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.85; transform: scale(1.2); }
        }
        .anim-orbit {
          transform-origin: 96px 96px;
          animation: rotatingOrbit 180s linear infinite;
        }
        .twinkle-s1 { animation: twinklestar 4s ease-in-out infinite; }
        .twinkle-s2 { animation: twinklestar 5.5s ease-in-out infinite; animation-delay: -1s; }
        .twinkle-s3 { animation: twinklestar 3.5s ease-in-out infinite; animation-delay: -2s; }
      `}</style>

      <div className="relative z-10 space-y-8">
        
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-pink-500 font-bold">
              {isAdmin ? "Support Radar" : "Islamic Lunar Tracker"}
            </p>
            <h2 className="text-3xl font-light italic font-serif text-white">
              {isAdmin ? `${partnerProfileName}'s Rhythm` : "Your Rhythm"}
            </h2>
            <div className="text-[10px] font-semibold text-white/50 tracking-wide bg-white/5 border border-white/10 px-3 py-1 rounded-full inline-block mt-1">
               Hijri: {hijriDate}
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isAdmin && info && info.phase === "Hayd" && (
              <button 
                onClick={triggerSOS}
                disabled={sosSending}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.4)] active:scale-95 animate-pulse"
              >
                🚨 SOS Sanctuary
              </button>
            )}
            {!isAdmin && (
              <button 
                onClick={logCycleStart}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500/20 to-pink-500/20 hover:from-rose-500/30 hover:to-pink-500/30 border border-pink-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-pink-300 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <Calendar size={14} />
                Log Period Start
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          
          {/* Dial Column */}
          <div className="relative w-56 h-56 flex flex-col items-center justify-center select-none bg-neutral-950/70 rounded-full border border-white/10 shadow-2xl p-4 overflow-hidden">
            
            {/* Constellations overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <span className="absolute left-[35px] top-[45px] text-white/30 text-[9px] twinkle-s1">✦</span>
              <span className="absolute right-[45px] top-[55px] text-white/20 text-[7px] twinkle-s2">✦</span>
              <span className="absolute left-[55px] bottom-[35px] text-white/30 text-[8px] twinkle-s3">✦</span>
              <span className="absolute right-[40px] bottom-[45px] text-white/40 text-[9px] twinkle-s1">✦</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-full h-full select-none" viewBox="0 0 192 192">
                {/* Slow Rotating Orbit guidelines */}
                <circle
                  cx="96" cy="96" r="86"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="0.75"
                  strokeDasharray="4,6"
                  className="anim-orbit"
                />
                <circle
                  cx="96" cy="96" r="78"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.02)"
                  strokeWidth="0.5"
                />

                {/* Main Dial center moon progress countdown ring */}
                {info && (
                  <>
                    <circle
                      cx="96" cy="96" r="30"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 96 66 A 30 30 0 1 1 95.99 66"
                      fill="none"
                      stroke={
                        info.phase === "Hayd" ? "#f43f5e" :
                        info.phase === "Follicular" ? "#14b8a6" :
                        info.phase === "Ovulatory" ? "#60a5fa" : "#8b5cf6"
                      }
                      strokeWidth="2.5"
                      strokeDasharray={2 * Math.PI * 30}
                      strokeDashoffset={2 * Math.PI * 30 * (1 - phasePct)}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </>
                )}

                {/* Star backdrop cluster */}
                <g opacity="0.2">
                  <circle cx="45" cy="50" r="0.8" fill="white" />
                  <circle cx="140" cy="35" r="0.5" fill="white" />
                  <circle cx="85" cy="150" r="0.7" fill="white" />
                  <circle cx="160" cy="110" r="0.6" fill="white" />
                  <circle cx="30" cy="120" r="0.5" fill="white" />
                </g>

                {/* Interactive dots circular rendering */}
                {moonDots.map((dot) => {
                  const isCurrentDay = currentDayOfCycle === dot.day;
                  const isSelected = selectedDay === dot.day || (selectedDay === null && isCurrentDay);
                  
                  return (
                    <g 
                      key={dot.day} 
                      onClick={() => setSelectedDay(dot.day)}
                      className="cursor-pointer group/dot"
                    >
                      <circle cx={dot.x} cy={dot.y} r="12" fill="transparent" />
                      
                      {isSelected && (
                        <circle
                          cx={dot.x} cy={dot.y} r="10"
                          className={cn("fill-none stroke-current opacity-70 stroke-1 animate-pulse", dot.colorClass)}
                        />
                      )}

                      {isCurrentDay && (
                        <circle
                          cx={dot.x} cy={dot.y} r="13"
                          className={cn("fill-current opacity-15 animate-ping", dot.colorClass)}
                        />
                      )}
                      
                      <g transform={`translate(${dot.x - 6}, ${dot.y - 6})`} className="transition-transform duration-200 group-hover/dot:scale-130">
                        <MoonShape 
                          day={dot.day} 
                          size={12}
                          className={cn(
                            "transition-all duration-300",
                            isSelected ? dot.colorClass :
                            dot.day < currentDayOfCycle ? `${dot.colorClass} opacity-50` : "text-white/10 group-hover/dot:text-white/60"
                          )}
                        />
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Central HUD Panel display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={info?.dayOfCycle || "empty"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="space-y-1.5 flex flex-col items-center justify-center"
                >
                  {info ? (
                    <>
                      <div className="mb-0.5 scale-90">
                        <CentralGlowMoon day={info.dayOfCycle} size={36} />
                      </div>
                      
                      <div className="text-[8px] uppercase tracking-widest text-white/30 font-bold leading-none">Day</div>
                      <div className="text-2xl font-serif font-light text-white leading-none">
                        {info.dayOfCycle}
                      </div>
                      <div className="text-[8px] uppercase tracking-wider font-bold text-white/50 leading-none">
                        {daysLeft === 0 ? "Final Day" : `${daysLeft}d left`}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-white/30 italic">Log start</div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Reset day selection to today */}
            {selectedDay !== null && selectedDay !== currentDayOfCycle && (
              <button
                onClick={() => setSelectedDay(null)}
                className="absolute bottom-3 px-3 py-1 bg-white text-black text-[8px] font-bold uppercase tracking-widest rounded-full shadow-lg border border-white/20 cursor-pointer hover:bg-pink-100 active:scale-95 transition-all z-20"
              >
                Reset to Today
              </button>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-6 w-full relative">
            
            {/* Sparkle Exploding particles */}
            <AnimatePresence>
              {showCelebration && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                  <div className="relative w-full h-full">
                    {Array.from({ length: 15 }).map((_, idx) => {
                      const angle = (idx * 2 * Math.PI) / 15;
                      const dist = 50 + Math.random() * 40;
                      const x = dist * Math.cos(angle);
                      const y = dist * Math.sin(angle);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                          animate={{ scale: [1, 1.6, 0], x: x, y: y, opacity: [1, 1, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-400 text-lg font-bold"
                        >
                          ✦
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </AnimatePresence>

            {info ? (
              <motion.div
                key={info.dayOfCycle}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Header status bar */}
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className={cn(
                    "inline-flex items-center gap-3 px-4 py-2 rounded-2xl border text-[10px] font-bold uppercase tracking-widest shadow-lg",
                    `bg-gradient-to-r ${info.color} border-white/20 text-white`
                  )}>
                    <Sparkles size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                    {info.name} ({info.arabicName})
                  </div>
                  <button 
                    onClick={() => setShowPredictions(!showPredictions)}
                    className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPredictions ? "Hide Forecast" : "3-Month Forecast"}
                  </button>
                </div>

                {/* Symptom Monitor Card for Husband / Support Mode */}
                {isAdmin && Object.values(activeSymptoms).some(level => level !== "none" && level !== undefined) && (
                  <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-4 shadow-xl">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      <p className="text-[10px] text-rose-300 uppercase tracking-widest font-bold">Active Symptoms Monitor</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {Object.entries(activeSymptoms).map(([symName, level]) => {
                        if (level === "none" || !level) return null;
                        
                        const symLabels = {
                          cramps: "Cramps 😣",
                          bloating: "Bloating 🎈",
                          backache: "Backache 🪨",
                          fatigue: "Fatigue 😴"
                        };
                        
                        const supportAdvice = {
                          cramps: "Brew chamomile tea and prep a heating pad 🍵",
                          bloating: "Bring warm water, discourage salt 💧",
                          backache: "Take over chore list, offer light massage 💆‍♂️",
                          fatigue: "Protect her space for quiet silent rest 😴"
                        };

                        const badgeColors = {
                          mild: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                          medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          severe: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse font-bold"
                        };

                        return (
                          <div key={symName} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/95 font-medium">{symLabels[symName as keyof typeof symLabels]}</span>
                              <span className={cn("text-[9px] uppercase px-2.5 py-0.5 rounded-full border tracking-wider", badgeColors[level as keyof typeof badgeColors])}>
                                {level}
                              </span>
                            </div>
                            {(level === "severe" || level === "medium") && (
                              <span className="text-[11px] text-rose-300/80 italic font-sans">{supportAdvice[symName as keyof typeof supportAdvice]}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tri-Hormone Curves Card */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Hormone Cycle Waveform</p>
                      <p className="text-[9px] text-white/20 uppercase tracking-wider">Estimated for Day {info.dayOfCycle}</p>
                    </div>
                    <div className="flex gap-3 text-[9px] font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-teal-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> Estrogen
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Progesterone
                      </span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> LH
                      </span>
                    </div>
                  </div>

                  <div className="relative h-28 w-full overflow-hidden bg-neutral-950/70 rounded-2xl border border-white/5 p-2 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 270 100" preserveAspectRatio="none">
                      <line x1="0" y1="25" x2="270" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2="270" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="75" x2="270" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

                      {(() => {
                        const xInd = (info.dayOfCycle - 1) * 10;
                        return (
                          <>
                            <line x1={xInd} y1="0" x2={xInd} y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2,2" />
                            
                            {(() => {
                              const values = getHormoneValues(info.dayOfCycle);
                              return (
                                <>
                                  <circle cx={xInd} cy={100 - values.estrogen} r="3.5" className="fill-teal-400 stroke-neutral-950 stroke-[1] shadow-lg" />
                                  <circle cx={xInd} cy={100 - values.progesterone} r="3.5" className="fill-rose-400 stroke-neutral-950 stroke-[1] shadow-lg" />
                                  <circle cx={xInd} cy={100 - values.lh} r="3.5" className="fill-purple-400 stroke-neutral-950 stroke-[1] shadow-lg" />
                                </>
                              );
                            })()}
                          </>
                        );
                      })()}

                      <path d={estrogenPath} fill="none" stroke="#2dd4bf" strokeWidth="1.5" className="opacity-80" />
                      <path d={progesteronePath} fill="none" stroke="#fb7185" strokeWidth="1.5" className="opacity-80" />
                      <path d={lhPath} fill="none" stroke="#c084fc" strokeWidth="1.5" className="opacity-80" />
                    </svg>
                  </div>

                  {(() => {
                    const values = getHormoneValues(info.dayOfCycle);
                    return (
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-white/3 p-2 rounded-lg border border-white/5">
                          <p className="text-white/30 text-[9px] uppercase tracking-wider">Estrogen</p>
                          <p className="font-semibold text-teal-300">{Math.round(values.estrogen)}%</p>
                        </div>
                        <div className="bg-white/3 p-2 rounded-lg border border-white/5">
                          <p className="text-white/30 text-[9px] uppercase tracking-wider">Progesterone</p>
                          <p className="font-semibold text-rose-300">{Math.round(values.progesterone)}%</p>
                        </div>
                        <div className="bg-white/3 p-2 rounded-lg border border-white/5">
                          <p className="text-white/30 text-[9px] uppercase tracking-wider">Luteinizing (LH)</p>
                          <p className="font-semibold text-purple-300">{Math.round(values.lh)}%</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Exemption status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-pink-500/5 rounded-bl-3xl pointer-events-none" />
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold block">Salah (Prayer)</span>
                    <span className="text-sm font-semibold text-white/85 flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", info.phase === "Hayd" ? "bg-pink-400 animate-pulse" : "bg-emerald-400")} />
                      {info.salahStatus}
                    </span>
                  </div>
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/5 rounded-bl-3xl pointer-events-none" />
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold block">Sawm (Fasting)</span>
                    <span className="text-sm font-semibold text-white/85 flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", info.phase === "Hayd" ? "bg-pink-400 animate-pulse" : "bg-emerald-400")} />
                      {info.fastingStatus}
                    </span>
                  </div>
                </div>

                {/* Ghusl Action for Razia */}
                {!isAdmin && info.phase === "Hayd" && (
                  <GlassPanel className="p-4 border-pink-500/20 bg-pink-500/5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(219,39,119,0.05)]">
                    <div className="space-y-1 text-center sm:text-left">
                       <p className="text-xs font-bold uppercase tracking-wider text-pink-400">Hayd Rest & Restoration</p>
                       <p className="text-[11px] text-white/50">Log complete purification so your partner gets notified.</p>
                    </div>
                    <button
                      onClick={handleLogGhusl}
                      disabled={ghuslLogged}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer active:scale-95 duration-200",
                        ghuslLogged 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold"
                          : "bg-white text-black hover:bg-pink-100 shadow-[0_4px_15px_rgba(255,255,255,0.15)]"
                      )}
                    >
                      {ghuslLogged ? "✓ Ghusl Logged" : "Log Ghusl Completed"}
                    </button>
                  </GlassPanel>
                )}

                {/* Symptoms Selector Log for Razia */}
                {!isAdmin && (
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Physical Self-Care (Symptom Log)</p>
                       <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Auto-syncs to partner</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {([
                        { key: "cramps", label: "Cramps 😣" },
                        { key: "bloating", label: "Bloating 🎈" },
                        { key: "backache", label: "Backache 🪨" },
                        { key: "fatigue", label: "Fatigue 😴" }
                      ] as const).map((sym) => {
                        const currentLevel = activeSymptoms[sym.key] || "none";
                        const levels = ["none", "mild", "medium", "severe"] as const;
                        
                        const nextLevel = () => {
                          const idx = levels.indexOf(currentLevel as any);
                          const next = levels[(idx + 1) % levels.length];
                          const updated = { ...activeSymptoms, [sym.key]: next };
                          setActiveSymptoms(updated);
                          saveSymptoms(updated);
                        };

                        const levelColors = {
                          none: "bg-white/3 text-white/40 border-white/5 hover:bg-white/5 hover:text-white/60",
                          mild: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                          medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          severe: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse font-bold"
                        };

                        return (
                          <button
                            key={sym.key}
                            type="button"
                            onClick={nextLevel}
                            className={cn(
                              "p-3 rounded-xl border flex flex-col justify-between h-16 transition-all text-left cursor-pointer active:scale-95",
                              levelColors[currentLevel as keyof typeof levelColors]
                            )}
                          >
                            <span className="text-[9px] uppercase tracking-wider font-bold opacity-60">
                              {sym.label}
                            </span>
                            <span className="text-xs font-semibold capitalize">
                              {currentLevel === "none" ? "Tap to Log" : currentLevel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Qada Counter widget */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 shadow-xl">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Ramadan Qada Fasts</p>
                     <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-3 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                       {qadaMissed - qadaCompleted} Fasts Remaining
                     </span>
                   </div>
                   <div className="flex items-center justify-between gap-4">
                     <div className="space-y-0.5">
                       <p className="text-xs text-white/60">Fasts missed: <strong className="text-white font-semibold">{qadaMissed}</strong></p>
                       <p className="text-xs text-white/60">Fasts completed: <strong className="text-white font-semibold">{qadaCompleted}</strong></p>
                     </div>
                     <div className="flex gap-2">
                       <div className="flex flex-col items-center gap-1">
                         <span className="text-[8px] text-white/30 uppercase font-bold">Missed</span>
                         <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
                           <button type="button" onClick={() => updateQadaFasts(-1, 0)} className="px-2 py-1 hover:bg-white/5 rounded text-white text-xs cursor-pointer active:scale-90 transition-all">-</button>
                           <button type="button" onClick={() => updateQadaFasts(1, 0)} className="px-2 py-1 hover:bg-white/5 rounded text-white text-xs cursor-pointer active:scale-90 transition-all">+</button>
                         </div>
                       </div>
                       <div className="flex flex-col items-center gap-1">
                         <span className="text-[8px] text-white/30 uppercase font-bold">Makeup</span>
                         <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
                           <button type="button" onClick={() => updateQadaFasts(0, -1)} className="px-2 py-1 hover:bg-white/5 rounded text-white text-xs cursor-pointer active:scale-90 transition-all">-</button>
                           <button type="button" onClick={() => updateQadaFasts(0, 1)} className="px-2 py-1 hover:bg-white/5 rounded text-white text-xs cursor-pointer active:scale-90 transition-all">+</button>
                         </div>
                       </div>
                     </div>
                   </div>
                   {qadaMissed > 0 && (
                     <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                       <div className="bg-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${(qadaCompleted / qadaMissed) * 100}%` }} />
                     </div>
                   )}
                </div>

                {/* Predictions and forecaster lists */}
                {showPredictions ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white/3 border border-white/5 rounded-2xl space-y-3"
                  >
                     <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 flex items-center gap-2">
                       <Calendar size={12} /> Hijri & Gregorian Forecast
                     </p>
                     <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map(m => {
                          const date = addMonths(startOfDay(cycle.startDate.toDate()), m);
                          return (
                            <div key={m} className="p-3 bg-white/5 rounded-lg border border-white/5 text-center shadow-md">
                              <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">{format(date, 'MMM')}</p>
                              <p className="text-sm font-bold text-white">{format(date, 'd')}</p>
                              <p className="text-[8px] text-white/30 block truncate mt-1">Est. Start</p>
                            </div>
                          );
                        })}
                     </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {/* Advice note */}
                    <div className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl shadow-inner hover:border-white/20 transition-all duration-300">
                      <div className="mt-1 text-pink-500">
                        <Heart size={18} fill="currentColor" className="animate-pulse" />
                      </div>
                      <p className="text-sm leading-relaxed text-white/70 italic">
                        {isAdmin ? `"${info.partner}"` : `"${info.advice}"`}
                      </p>
                    </div>

                    {/* Spiritual support formulas */}
                    <div className="p-5 bg-white/3 border border-white/5 rounded-2xl space-y-3 shadow-md">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <BookOpen size={13} className="text-rose-400" />
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Spiritual Comforts & Duas</p>
                        
                        <button
                          type="button"
                          onClick={generateDhikr}
                          className="ml-auto text-[8px] bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                        >
                          Generate Dhikr Card
                        </button>
                      </div>
                      <div className="space-y-3 text-xs">
                        {info.duas.map((dua, idx) => (
                          <div key={idx} className="p-3 bg-white/3 rounded-xl border border-white/5 leading-relaxed text-white/80 select-all font-mono text-[11px] hover:border-white/10 transition-colors">
                            {dua}
                          </div>
                        ))}
                        <div className="p-4 bg-white/3 rounded-xl border border-white/5 space-y-1">
                          <p className="text-[9px] uppercase tracking-widest text-pink-400 font-bold">Recommended Dhikr</p>
                          <ul className="list-disc list-inside text-white/60 space-y-1 text-[11px]">
                            {info.dhikr.map((dh, idx) => (
                              <li key={idx}>{dh}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quests logic */}
                {isAdmin ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <Utensils size={14} className="text-pink-500 animate-bounce" />
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Active Side Quests</h3>
                    </div>
                    {activeQuests.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeQuests.map((quest) => (
                          <GlassPanel key={quest.id} className="p-5 border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 transition-all flex items-center justify-between group">
                            <div className="space-y-1">
                              <p className="text-[10px] text-pink-400/60 uppercase tracking-widest font-bold font-mono">Quest: Procure {quest.craving}</p>
                              <p className="text-lg font-serif italic text-white flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                Razia wants {quest.craving}
                              </p>
                            </div>
                            <button 
                              onClick={() => fulfillQuest(quest.id, quest.userId, quest.craving)}
                              className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-lg cursor-pointer"
                              title="Mark as Fulfilled"
                            >
                              <CheckCircle size={18} />
                            </button>
                          </GlassPanel>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/20 italic pl-1">No active side-quests at the moment. She is at peace! 🌸</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <Utensils size={13} className="text-pink-500" />
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Ask for Care (Cravings & Help)</p>
                    </div>
                    <form onSubmit={submitQuest} className="relative group">
                       <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-pink-500 transition-colors" />
                       <input 
                         type="text"
                         value={craving}
                         onChange={(e) => setCraving(e.target.value)}
                         placeholder="I'm craving... (e.g. Chocolate, a hug, heating pad)"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-pink-500/30 transition-all shadow-md"
                       />
                    </form>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="py-12 text-center text-white/20 space-y-4">
                 <Moon size={48} className="mx-auto opacity-10" />
                 <p className="text-sm italic">
                   {isAdmin 
                     ? `Waiting for ${partnerProfileName} to sync her cycle logs...`
                     : "Log your menstrual cycle to start tracking your Hijri rhythm and sync predictions."
                   }
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SOS Modal Dialog Overlay */}
      <AnimatePresence>
        {showSOSModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-[100] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-neutral-900 border border-rose-500/30 rounded-[32px] p-8 space-y-6 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl pointer-events-none" />
              
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto text-3xl animate-bounce">
                🌸
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-serif italic text-white">Your Sanctuary is Alerted</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  We have transmitted an urgent Sanctuary notification and email directly to Mohammed. 
                  He has been requested to assist with tea, heating pads, and sweet support.
                </p>
              </div>

              <div className="p-4 bg-white/3 border border-white/5 rounded-2xl space-y-2">
                <p className="text-[9px] uppercase tracking-widest text-pink-400 font-bold">Menstrual Comfort Step</p>
                <p className="text-sm italic text-pink-200/80">"Close your eyes. Breathe in for 4 seconds, hold for 4, and release slowly. Your body is doing sacred work."</p>
              </div>

              <button
                onClick={() => setShowSOSModal(false)}
                className="w-full py-3 bg-white text-black hover:bg-pink-100 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-md"
              >
                Return to Sanctuary
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dhikr Comfort Polaroid Card Modal */}
      <AnimatePresence>
        {showDhikrCard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-[90] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: 50, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: 50, rotate: 2 }}
              className="w-full max-w-sm bg-gradient-to-br from-neutral-900 via-neutral-900 to-purple-950/20 border border-purple-500/20 rounded-[32px] p-6 shadow-2xl space-y-5 text-center relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <button 
                  onClick={() => setShowDhikrCard(false)}
                  className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/55 text-xs cursor-pointer active:scale-90 transition-all"
                >
                  ×
                </button>
              </div>

              <span className="text-3xl">📖</span>
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Menstrual Dhikr Comfort</h4>
                <span className="text-[9px] text-white/30 block">{DHIKR_COMFORTS[dhikrIndex].source}</span>
              </div>

              <p className="text-base font-serif italic text-purple-100 leading-relaxed font-light px-2">
                "{DHIKR_COMFORTS[dhikrIndex].text}"
              </p>

              <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-xl text-[10px] text-purple-300 font-semibold tracking-wide uppercase">
                Benefit: {DHIKR_COMFORTS[dhikrIndex].benefit}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}
