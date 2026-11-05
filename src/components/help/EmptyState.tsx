import React from "react";
import GlassPanel from "../GlassPanel";
import { Sparkles } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <GlassPanel className="p-8 sm:p-12 text-center rounded-2xl border-white/10 space-y-4 max-w-lg mx-auto my-6">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-center shadow-lg shadow-rose-500/10">
        {icon || <Sparkles className="w-6 h-6 text-rose-400" />}
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-serif text-white font-medium">{title}</h3>
        <p className="text-xs sm:text-sm text-stone-400 font-serif italic max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-serif font-medium shadow-md transition hover:scale-105 active:scale-95"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </GlassPanel>
  );
};
export default EmptyState;
