/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from "react";
import { useAuth } from "./hooks/useAuth";
import Background from "./components/Background";
import { LogOut, Heart } from "lucide-react";
import { auth } from "./lib/firebase";
import { lazyWithRetry } from "./lib/utils";

const AuthScreen = lazyWithRetry(() => import("./components/AuthScreen"));
const Dashboard = lazyWithRetry(() => import("./components/Dashboard"));
const AdminDashboard = lazyWithRetry(() => import("./components/AdminDashboard"));
const PasswordGate = lazyWithRetry(() => import("./components/PasswordGate"));
const InstallPrompt = lazyWithRetry(() => import("./components/InstallPrompt"));
const NotificationManager = lazyWithRetry(() => import("./components/NotificationManager"));

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-950">
        <Background />
        <Heart className="w-12 h-12 text-rose-500 animate-pulse" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-neutral-950 text-white/60">Loading...</div>}>
      <PasswordGate>
        <div className="min-h-screen relative">
          <Background />
          <InstallPrompt />
          <NotificationManager profile={profile} />
        
          {!user ? (
            <AuthScreen />
          ) : (
          <>
            {/* Universal Nav - Mobile & Desktop */}
            <nav className="fixed top-6 left-6 right-6 z-40 max-w-6xl mx-auto">
              <div className="flex items-center justify-between h-12 md:h-16 px-4 md:px-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl transition-all">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg shadow-[0_0_15px_rgba(219,39,119,0.5)] flex items-center justify-center">
                    <Heart className="w-3 md:w-4 h-3 md:h-4 text-white fill-white" />
                  </div>
                  <span className="text-sm md:text-xl font-semibold tracking-tight uppercase hidden sm:block">Project Cupid</span>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1">
                    <p className="text-xs md:text-sm font-medium text-white/90">{profile?.displayName || user.email?.split('@')[0]}</p>
                  </div>

                  <button
                    onClick={() => auth.signOut()}
                    className="p-2 md:p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-white/40 hover:text-white"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 md:w-4 h-3.5 md:h-4" />
                  </button>
                </div>
              </div>
            </nav>

            <main className="pt-24 md:pt-32 min-h-screen pb-6">
              {profile?.role === "admin" ? (
                <AdminDashboard user={user} profile={profile} />
              ) : (
                <Dashboard user={user} profile={profile} />
              )}
            </main>

            {/* Aesthetic Footer */}
            <footer className="relative z-10 py-8 md:py-12 px-4 md:px-12 mt-6 flex flex-col md:flex-row justify-between items-center text-white/20 gap-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-center md:text-left">Designed with Love by Project Cupid</div>
              <div className="flex gap-3 md:gap-6 text-[10px] uppercase tracking-widest text-white/40">
                 <span className="hidden sm:inline">v2.4.0</span>
                 <span className="hidden sm:inline">Encrypted</span>
              </div>
            </footer>
          </>
          )}
        </div>
      </PasswordGate>
    </Suspense>
  );
}

