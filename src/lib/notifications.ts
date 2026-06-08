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
  senderName?: string,
  theme?: "nudge" | "feeling" | "general"
): Promise<void> {
  const usersSnap = await getDocs(collection(db, "users"));
  const meDoc = usersSnap.docs.find((u) => u.id === currentUserId);
  const partnerDoc = usersSnap.docs.find((u) => u.id !== currentUserId);
  if (!partnerDoc) return;

  const partnerId = partnerDoc.id;
  const partnerData = partnerDoc.data();
  const partnerFcmToken: string | undefined = partnerData?.fcmToken;

  const myData = meDoc?.data();
  const myEmail = myData?.email || "";

  // Determine partner email and name explicitly
  // Hardwired connection: if current user is Mohammed, partner is Razia (and vice versa)
  const isMeMohammed = 
    myEmail.toLowerCase() === "mraaziqp@gmail.com" || 
    myEmail.toLowerCase() === "backupe9@gmail.com" ||
    currentUserId === "mraaziqp" || 
    senderName === "Your Husband";

  const partnerEmail = isMeMohammed ? "raziashade4@gmail.com" : "mraaziqp@gmail.com";
  const partnerName = isMeMohammed ? "Razia" : "Mohammed";
  const actualSenderName = senderName || (isMeMohammed ? "Your Husband" : "Your Wife");

  // Always write to Firestore so the in-app listener picks it up too
  await addDoc(collection(db, "notifications"), {
    userId: partnerId,
    title,
    body,
    read: false,
    sentBy: actualSenderName,
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
          recipientName: partnerName,
          senderName: actualSenderName,
          theme: theme || "general"
        }),
      });
    } catch (err) {
      console.error("Notification delivery failed:", err);
      // Even if HTTP delivery fails, Firestore notification is stored
    }
  }
}
