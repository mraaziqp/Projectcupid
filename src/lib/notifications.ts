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
  const partnerId = await getPartnerUserId(currentUserId);
  if (!partnerId) {
    return;
  }

  await addDoc(collection(db, "notifications"), {
    userId: partnerId,
    title,
    body,
    read: false,
    createdAt: Timestamp.now()
  });
}
