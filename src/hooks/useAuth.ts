import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export type UserRole = "admin" | "reader";

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
            // New user - default to reader, unless it's the creator's email
            // Use the email from the auth token directly for reliability
            const email = firebaseUser.email || "";
            const isAdmin = email === "backupe9@gmail.com"; 
            const initialProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: email,
              role: isAdmin ? "admin" : "reader",
              displayName: firebaseUser.displayName,
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
