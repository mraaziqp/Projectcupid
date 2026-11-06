import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import GlassPanel from "../GlassPanel";

interface FeatureHeaderProps {
  title: string;
  badge?: string;
  subtitle: string;
  description: string;
  helpDetails?: {
    howItWorks: string;
    tips?: string[];
    privacyNote?: string;
  };
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export const FeatureHeader: React.FC<FeatureHeaderProps> = ({
  title,
  badge,
  subtitle,
  description,
  helpDetails,
  primaryAction
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-serif-title font-light text-white tracking-tight">
              {title}
            </h1>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {badge}
              </span>
            )}
            {helpDetails && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                aria-label="How this space works"
                className="p-1 rounded-full text-white/40 hover:text-white/80 hover:bg-white/5 transition"
                title="How this space works"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-rose-200/80 font-serif italic">
            {subtitle}
          </p>
          <p className="hidden sm:block text-xs text-white/60 mt-1 max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>

        {primaryAction && (
          <div className="flex-shrink-0">
            <button
              onClick={primaryAction.onClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-serif font-semibold tracking-wide shadow-md flex items-center gap-1.5 transition active:scale-95"
            >
              {primaryAction.icon || <Sparkles className="w-3.5 h-3.5" />}
              <span>{primaryAction.label}</span>
            </button>
          </div>
        )}
      </div>

      {/* Expandable Contextual Help Drawer */}
      {showHelp && helpDetails && (
        <GlassPanel className="p-4 sm:p-5 border-amber-300/30 bg-amber-950/20 space-y-3 animate-fadeIn text-xs">
          <div className="flex items-center justify-between text-amber-200 font-serif font-semibold text-sm">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              How this feature works
            </span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-white/40 hover:text-white"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <p className="text-stone-300 leading-relaxed font-sans">
            {helpDetails.howItWorks}
          </p>

          {helpDetails.tips && helpDetails.tips.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-mono uppercase text-amber-300/80 tracking-wider">
                Helpful Tips:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-stone-300">
                {helpDetails.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {helpDetails.privacyNote && (
            <div className="pt-2 border-t border-amber-400/20 text-[11px] text-amber-200/90 font-mono">
              🔒 Privacy: {helpDetails.privacyNote}
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
};
export default FeatureHeader;
