import { addDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function getPartnerUserId(currentUserId: string): Promise<string | null> {
  const usersSnap = await getDocs(collection(db, "users"));
  const partner = usersSnap.docs.find((u) => u.id !== currentUserId);
  return partner ? partner.id : null;
}

/**
 * Bulletproof partner notification with dual delivery:
 * 1. Always stores in Firestore for in-app display
 * 2. Sends FCM push (works when app is closed/inactive)
 * 3. Falls back to email if FCM unavailable
 */
export async function notifyPartner(
  currentUserId: string,
  title: string,
  body: string,
  senderName?: string
): Promise<void> {
  const usersSnap = await getDocs(collection(db, "users"));
  const partnerDoc = usersSnap.docs.find((u) => u.id !== currentUserId);
  if (!partnerDoc) return;

  const partnerId = partnerDoc.id;
  const partnerData = partnerDoc.data();
  const partnerFcmToken: string | undefined = partnerData?.fcmToken;

  // Hardcoded emails
  const currentUserEmail = partnerData?.email === "raziashade4@gmail.com"
    ? "mraaziqp@gmail.com"
    : "raziashade4@gmail.com";
  const partnerEmail = partnerData?.email || currentUserEmail;
  const partnerName = currentUserEmail === "mraaziqp@gmail.com" ? "Razia" : "Mohammed";

  // Always write to Firestore so the in-app listener picks it up too
  await addDoc(collection(db, "notifications"), {
    userId: partnerId,
    title,
    body,
    read: false,
    sentBy: senderName || "Your love",
    createdAt: Timestamp.now()
  });

  // Send robust notification (FCM + email fallback)
  if (partnerFcmToken || partnerEmail) {
    try {
      await fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: partnerFcmToken,
          email: partnerEmail,
          title,
          body,
          recipientName: partnerName?.split(" ")[0] || "Love"
        }),
      });
    } catch (err) {
      console.error("Notification delivery failed:", err);
      // Even if delivery fails, Firestore notification was stored above
    }
  }
}
