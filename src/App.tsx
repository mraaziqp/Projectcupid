/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from "react";
import { useAuth } from "./hooks/useAuth";
import Background from "./components/Background";
import { Heart } from "lucide-react";
import { lazyWithRetry } from "./lib/utils";

const AuthScreen = lazyWithRetry(() => import("./components/AuthScreen"));
const MainExperience = lazyWithRetry(() => import("./components/MainExperience"));
const PasswordGate = lazyWithRetry(() => import("./components/PasswordGate"));
const InstallPrompt = lazyWithRetry(() => import("./components/InstallPrompt"));
const NotificationManager = lazyWithRetry(() => import("./components/NotificationManager"));

export default function App() {
  const { user, profile, loading, denied } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#070609] space-y-3">
        <Background />
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 animate-pulse">
          <Heart className="w-6 h-6 text-white fill-white" />
        </div>
        <span className="text-xs uppercase tracking-widest text-white/50 font-mono">
          Project Cupid
        </span>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#070609] text-white/60 text-xs font-mono">
          Opening Our Little Universe...
        </div>
      }
    >
      <PasswordGate>
        <div className="min-h-screen relative text-white bg-[#070609] overflow-x-hidden selection:bg-rose-500/30">
          <Background />
          <InstallPrompt />
          <NotificationManager profile={profile} />

          {!user || !profile ? (
            <>
              {denied && (
                <div className="relative z-10 max-w-md mx-auto mt-6 px-4 text-center text-sm text-rose-200 bg-rose-950/40 border border-rose-500/30 rounded-xl p-3">
                  {denied}
                </div>
              )}
              <AuthScreen />
            </>
          ) : (
            <>
              {/* Universal Main Experience */}
              <MainExperience user={user} profile={profile as any} />

              {/* Aesthetic Footer */}
              <footer className="relative z-10 py-6 px-4 md:px-12 flex flex-col sm:flex-row justify-between items-center text-white/30 text-[11px] gap-2 border-t border-white/5 max-w-6xl mx-auto">
                <div className="uppercase tracking-[0.2em] font-serif-title">
                  Designed with Love for Raaziq & Razia
                </div>
                <div className="flex gap-4 font-mono text-[10px]">
                  <span>Project Cupid v5.0.0</span>
                  <span>•</span>
                  <span>Private & Encrypted</span>
                </div>
              </footer>
            </>
          )}
        </div>
      </PasswordGate>
    </Suspense>
  );
}
