import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { lazy, ComponentType } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile, UserRole } from "../hooks/useAuth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Failed to load component chunk, reloading page...", error);
      window.location.reload();
      return new Promise<{ default: T }>(() => {});
    }
  });
}

export async function getPartnerProfile(currentProfile: UserProfile | null): Promise<UserProfile | null> {
  if (!currentProfile) return null;

  const isAdmin = currentProfile.role === "admin";

  try {
    if (isAdmin) {
      // Find Razia (sanctuary_owner, partner, or reader)
      for (const targetRole of ["sanctuary_owner", "partner", "reader"] as UserRole[]) {
        const q = query(collection(db, "users"), where("role", "==", targetRole));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return snapshot.docs[0].data() as UserProfile;
        }
      }
    } else {
      // Find Raaziq (admin)
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as UserProfile;
      }
    }
  } catch (error) {
    console.error("Failed to get partner profile:", error);
  }

  // Fallback partner profile
  return {
    uid: isAdmin ? "partner-razia" : "partner-raaziq",
    email: isAdmin ? "raziashade4@gmail.com" : "mraaziqp@gmail.com",
    role: isAdmin ? "sanctuary_owner" : "admin",
    displayName: isAdmin ? "Razia" : "Raaziq"
  };
}

export function getSenderName(currentProfile: UserProfile | null, fallbackName?: string): string {
  if (!currentProfile) return fallbackName || "My love";

  if (currentProfile.displayName) {
    return currentProfile.displayName.split(" ")[0];
  }

  if (currentProfile.role === "admin") {
    return "Raaziq";
  }

  return "Razia";
}

export function getPartnerName(partnerProfile: UserProfile | null, currentProfile?: UserProfile | null): string {
  if (partnerProfile?.displayName) {
    return partnerProfile.displayName.split(" ")[0];
  }

  if (currentProfile?.role === "admin") {
    return "Razia";
  }

  return "Raaziq";
}
