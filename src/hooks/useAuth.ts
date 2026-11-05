import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export type UserRole = "admin" | "sanctuary_owner" | "partner" | "reader";

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  fcmToken?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Sync profile with Firestore
          const userDoc = doc(db, "users", firebaseUser.uid);
          let snap = await getDoc(userDoc);
          
          if (!snap.exists()) {
            // Identify Raaziq as admin, Razia as sanctuary_owner
            const email = (firebaseUser.email || "test-user@cupid.com").toLowerCase();
            const isAdmin = email === "mraaziqp@gmail.com" || email === "backupe9@gmail.com";
            const isRazia = email === "raziashade4@gmail.com";

            let assignedRole: UserRole = "reader";
            let defaultName = "Beloved Guest";

            if (isAdmin) {
              assignedRole = "admin";
              defaultName = "Raaziq";
            } else if (isRazia) {
              assignedRole = "sanctuary_owner";
              defaultName = "Razia";
            }

            const initialProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: email,
              role: assignedRole,
              displayName: firebaseUser.displayName || defaultName,
            };
            await setDoc(userDoc, initialProfile);
            setProfile(initialProfile);
          } else {
            setProfile(snap.data() as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser?.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  return { user, profile, loading };
}
