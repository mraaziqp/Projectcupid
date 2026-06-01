import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface NotificationLog {
  userId: string;
  title: string;
  body: string;
  fcmSuccess?: boolean;
  emailSuccess?: boolean;
  fcmError?: string;
  emailError?: string;
  timestamp: any;
}

/**
 * Log notification attempts for monitoring and debugging
 */
export async function logNotificationAttempt(log: Omit<NotificationLog, 'timestamp'>) {
  try {
    await addDoc(collection(db, "notificationLogs"), {
      ...log,
      timestamp: Timestamp.now()
    });
  } catch (err) {
    console.error("Failed to log notification attempt:", err);
  }
}
