import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  BookHeart,
  Gift,
  ShieldCheck,
  Compass,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Check
} from "lucide-react";
import GlassPanel from "../GlassPanel";

interface OnboardingModalProps {
  userId: string;
  onClose: () => void;
}

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "Welcome to Our Little Universe",
    subtitle: "A private enchanted world created exclusively for Raaziq & Razia",
    icon: Heart,
    color: "from-rose-500 to-amber-500",
    description:
      "Project Cupid is not a generic dashboard or clinical tool. It is our private digital world: a sacred home for our love letters, memories, everyday laughter, shared future, and her personal wellbeing."
  },
  {
    step: 2,
    title: "Our Love: Letters & Our Story",
    subtitle: "Preserving every milestone, emotion, and heartfelt appreciation",
    icon: BookHeart,
    color: "from-rose-600 to-rose-400",
    description:
      "Explore love letters written for every mood ('Open when you miss me'), the 365 Reasons Vault celebrating everyday gratitude, and Our Story—a chronological tapestry of our first meeting, engagement, and wedding day."
  },
  {
    step: 3,
    title: "Our Little Message Boxes",
    subtitle: "A daily randomized surprise waiting to be opened",
    icon: Gift,
    color: "from-amber-500 to-rose-500",
    description:
      "Tuck secret love notes, funny memories, compliments, inside jokes, or challenges into virtual boxes. Every morning, one unopened message is drawn for a magical reveal with sealed envelopes or keepsake boxes."
  },
  {
    step: 4,
    title: "Her Wellbeing: Private Sanctuary",
    subtitle: "Thoughtful cycle, symptom, and Islamic fiqh tracking with strict privacy",
    icon: ShieldCheck,
    color: "from-emerald-600 to-teal-500",
    description:
      "A completely private health companion. Track menstrual cycles, holistic symptoms, moods, medications, and Islamic purification phases (Hayd, Tuhr, and Istihadah). Her private data is strictly isolated and never accessed without consent."
  },
  {
    step: 5,
    title: "Our Future & Little Things",
    subtitle: "Dream board, love vouchers, and time capsules",
    icon: Compass,
    color: "from-purple-600 to-rose-500",
    description:
      "Plan shared dreams (including 'Dreams That Cost Nothing'), exchange digital love vouchers, spin the kindness wheel, and lock marriage time capsules that unlock on future anniversaries."
  },
  {
    step: 6,
    title: "Jarvis & Our Memory Book",
    subtitle: "Intelligent assistance with permanent privacy boundaries",
    icon: Sparkles,
    color: "from-amber-400 to-orange-500",
    description:
      "Jarvis Second Brain coordinates with authorized shared memories, dream ideas, and message boxes, while keeping private health data strictly walled off. Our Memory Book preserves your most treasured moments forever."
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  userId,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleFinish = () => {
    localStorage.setItem(`cupid_onboarding_completed_${userId}`, "true");
    onClose();
  };

  const current = ONBOARDING_STEPS[currentStep];
  const IconComponent = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <GlassPanel className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl border-rose-300/30 overflow-hidden shadow-2xl">
        {/* Top Progress & Skip */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 text-xs">
          <div className="flex items-center gap-1.5">
            {ONBOARDING_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-6 bg-rose-500"
                    : idx < currentStep
                    ? "w-2 bg-rose-300/50"
                    : "w-2 bg-white/20"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleFinish}
            className="text-stone-400 hover:text-white transition flex items-center gap-1 font-mono text-[11px]"
          >
            <span>Skip tour</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="my-6 space-y-4 text-center">
          <div
            className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr ${current.color} flex items-center justify-center shadow-lg shadow-rose-500/20`}
          >
            <IconComponent className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest uppercase text-rose-300">
              Step {current.step} of {ONBOARDING_STEPS.length}
            </span>
            <h3 className="text-xl sm:text-2xl font-serif text-white font-medium tracking-wide">
              {current.title}
            </h3>
            <p className="text-xs text-rose-200/80 font-serif italic">
              {current.subtitle}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-sans max-w-md mx-auto pt-2">
            {current.description}
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`px-3 py-1.5 rounded-xl text-xs font-serif transition flex items-center gap-1 ${
              currentStep === 0
                ? "opacity-30 cursor-not-allowed text-stone-500"
                : "text-stone-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStep < ONBOARDING_STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-serif font-semibold tracking-wide shadow-md flex items-center gap-1.5 transition hover:scale-105 active:scale-95"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-serif font-semibold tracking-wide shadow-md flex items-center gap-1.5 transition hover:scale-105 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Enter Project Cupid</span>
            </button>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};
export default OnboardingModal;
