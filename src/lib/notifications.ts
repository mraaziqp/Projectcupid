import { addDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function getPartnerUserId(currentUserId: string): Promise<string | null> {
  const usersSnap = await getDocs(collection(db, "users"));
  const partner = usersSnap.docs.find((u) => u.id !== currentUserId);
  return partner ? partner.id : null;
}

export async function notifyPartner(
  currentUserId: string,
  title: string,
  body: string
): Promise<void> {
  const usersSnap = await getDocs(collection(db, "users"));
  const partnerDoc = usersSnap.docs.find((u) => u.id !== currentUserId);
  if (!partnerDoc) return;

  const partnerId = partnerDoc.id;
  const partnerFcmToken: string | undefined = partnerDoc.data()?.fcmToken;

  // Always write to Firestore so the in-app listener picks it up too
  await addDoc(collection(db, "notifications"), {
    userId: partnerId,
    title,
    body,
    read: false,
    createdAt: Timestamp.now()
  });

  // Send a real FCM push so she gets it even when the app is closed
  if (partnerFcmToken) {
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: partnerFcmToken, title, body }),
      });
    } catch (err) {
      console.error("FCM push failed:", err);
    }
  }
}
