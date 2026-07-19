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

  const partnerRole: UserRole = currentProfile.role === "admin" ? "reader" : "admin";

  try {
    const q = query(collection(db, "users"), where("role", "==", partnerRole));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserProfile;
    }
  } catch (error) {
    console.error("Failed to get partner profile:", error);
  }

  return null;
}

export function getSenderName(currentProfile: UserProfile | null, partnerName?: string): string {
  if (!currentProfile) return "My love";

  if (currentProfile.role === "admin") {
    return currentProfile.displayName?.split(" ")[0] || "I";
  } else {
    return partnerName?.split(" ")[0] || "My love";
  }
}

export function getPartnerName(partnerProfile: UserProfile | null): string {
  if (!partnerProfile) return "Love";
  return partnerProfile.displayName || "Love";
}
