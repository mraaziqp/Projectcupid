import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db, requestNotificationPermission, initMessaging } from "../lib/firebase";
import { UserProfile } from "../hooks/useAuth";

export default function NotificationManager({ profile }: { profile: UserProfile | null }) {
  useEffect(() => {
    if (!profile) return;

    // ... setupNotifications logic ...
    const setupNotifications = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token && token !== profile.fcmToken) {
          const userDoc = doc(db, "users", profile.uid);
          await updateDoc(userDoc, { fcmToken: token });
        }
      } catch (error) {
        console.error("Notification permission denied or failed.");
      }
    };
    setupNotifications();

    // Listen for Firestore-based "push" notifications
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", profile.uid),
      where("read", "==", false),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (Notification.permission === "granted") {
            new Notification(data.title, {
              body: data.body,
              icon: "/pwa-192x192.png"
            });
            // Mark as read immediately
            updateDoc(change.doc.ref, { read: true });
          }
        }
      });
    });

    return () => unsub();
  }, [profile]);

  return null;
}
