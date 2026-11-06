import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

import type { UserProfile, UserRole } from "../types";
export type { UserProfile, UserRole };

/**
 * The only accounts that can create a member profile on first sign-in. The
 * Firestore rules enforce the same list; this copy just avoids a doomed write.
 */
const BOOTSTRAP: Record<string, { role: UserRole; displayName: string }> = {
  "mraaziqp@gmail.com": { role: "admin", displayName: "Raaziq" },
  "backupe9@gmail.com": { role: "admin", displayName: "Raaziq" },
  "raziashade4@gmail.com": { role: "sanctuary_owner", displayName: "Razia" },
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);

  useEffect(() => {
    let stopProfile: (() => void) | null = null;
    const stopAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      stopProfile?.();
      stopProfile = null;
      setDenied(null);
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const ref = doc(db, "users", firebaseUser.uid);
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const email = (firebaseUser.email || "").toLowerCase();
          const seed = BOOTSTRAP[email];
          if (!seed || !firebaseUser.emailVerified) {
            setDenied("This account isn't part of this private space.");
            setProfile(null);
            setLoading(false);
            await auth.signOut();
            return;
          }
          await setDoc(ref, { uid: firebaseUser.uid, email, role: seed.role, displayName: firebaseUser.displayName || seed.displayName });
        }
        stopProfile = onSnapshot(
          ref,
          (s) => {
            const data = s.data() as UserProfile | undefined;
            setProfile(data && ["admin", "sanctuary_owner", "partner"].includes(data.role) ? { ...data, uid: s.id } : null);
            if (data && !["admin", "sanctuary_owner", "partner"].includes(data.role)) setDenied("This account isn't part of this private space.");
            setLoading(false);
          },
          () => { setProfile(null); setLoading(false); },
        );
      } catch (error) {
        console.error("Could not load your profile:", error);
        setDenied("Couldn't load your profile. Check your connection and try again.");
        setProfile(null);
        setLoading(false);
      }
    });
    return () => { stopAuth(); stopProfile?.(); };
  }, []);

  return { user, profile, loading, denied };
}
