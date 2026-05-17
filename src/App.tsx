/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from "react";
import { useAuth } from "./hooks/useAuth";
import Background from "./components/Background";
import { LogOut, Heart } from "lucide-react";
import { auth } from "./lib/firebase";

const AuthScreen = lazy(() => import("./components/AuthScreen"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));
const PasswordGate = lazy(() => import("./components/PasswordGate"));
const InstallPrompt = lazy(() => import("./components/InstallPrompt"));
const NotificationManager = lazy(() => import("./components/NotificationManager"));

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
            {/* Universal Nav */}
            <nav className="fixed top-6 left-6 right-6 z-40">
              <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg shadow-[0_0_15px_rgba(219,39,119,0.5)] flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                  <span className="text-xl font-semibold tracking-tight uppercase hidden sm:block">Project Cupid</span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-[10px] uppercase tracking-widest text-green-400 font-bold">Lamp Online</span>
                  </div>
                  
                  <div className="hidden lg:flex flex-col items-end">
                    <p className="text-sm font-medium text-white/90">{profile?.displayName || user.email}</p>
                    <p className="text-[10px] uppercase font-bold text-pink-500 tracking-widest">
                      {profile?.role === 'admin' ? 'Curator' : 'Beloved'}
                    </p>
                  </div>

                  <button 
                    onClick={() => auth.signOut()}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-white/40 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </nav>

            <main className="pt-32 min-h-screen">
              {profile?.role === "admin" ? (
                <AdminDashboard user={user} profile={profile} />
              ) : (
                <Dashboard user={user} profile={profile} />
              )}
            </main>

            {/* Aesthetic Footer */}
            <footer className="relative z-10 py-12 px-12 mt-6 flex justify-between items-center text-white/20">
              <div className="text-[10px] uppercase tracking-[0.3em]">Designed with Love by Project Cupid</div>
              <div className="flex gap-6 text-[10px] uppercase tracking-widest text-white/40">
                 <span className="hidden sm:inline">Version 2.4.0-Beta</span>
                 <span className="hidden sm:inline">Secure P2P Encrypted</span>
              </div>
            </footer>
          </>
          )}
        </div>
      </PasswordGate>
    </Suspense>
  );
}

