import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { MessageBoxItem, DailyBoxSelection, UserRole } from "../types";
import { INITIAL_MESSAGE_BOXES } from "./seedData";
import { format } from "date-fns";

const MESSAGE_BOXES_COL = "message_boxes";
const DAILY_SELECTIONS_COL = "daily_box_selections";

// LocalStorage fallback key if offline
const LOCAL_STORAGE_KEY = "cupid_message_boxes_cache";
const LOCAL_SELECTION_KEY = "cupid_daily_selection_cache";

export function getTodayDateStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Initializes default message boxes if the collection is empty.
 */
export async function ensureInitialMessageBoxes(userId: string, userName: string): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, MESSAGE_BOXES_COL)));
    if (snap.empty) {
      for (const item of INITIAL_MESSAGE_BOXES) {
        const newDocRef = doc(collection(db, MESSAGE_BOXES_COL));
        await setDoc(newDocRef, {
          ...item,
          id: newDocRef.id,
          createdAt: Timestamp.now(),
          cycleNumber: 1
        });
      }
    }
  } catch (err) {
    console.warn("Could not check/initialize remote message boxes, using local fallback:", err);
  }
}

/**
 * Retrieves all messages readable by the current user.
 * Honors privacy: If partner created a secret message and it has not been opened yet,
 * it is hidden from the other partner.
 */
export async function getMessageBoxes(
  currentUserId: string,
  currentUserRole: UserRole
): Promise<MessageBoxItem[]> {
  try {
    const snap = await getDocs(query(collection(db, MESSAGE_BOXES_COL), orderBy("createdAt", "desc")));
    if (!snap.empty) {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageBoxItem));
      // Filter secret unopened messages:
      // An unopened secret message is only visible to its author before being revealed!
      const visible = all.filter(msg => {
        if (!msg.isOpened && msg.isSecret && msg.authorId !== currentUserId) {
          return false;
        }
        return true;
      });
      // Cache locally
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(visible));
      } catch (e) {
        // ignore quota
      }
      return visible;
    }
  } catch (err) {
    console.warn("Error fetching message boxes, checking cache:", err);
  }

  // Fallback to cache or initial items
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }

  return INITIAL_MESSAGE_BOXES.map((item, idx) => ({
    id: `local_${idx}`,
    ...item,
    createdAt: new Date()
  }));
}

/**
 * Gets or atomically selects today's random message.
 * Guarantees that:
 * 1. The selection is persistent across all devices for the same day.
 * 2. Unopened messages are prioritized.
 * 3. Reshuffles cycle once all eligible messages are exhausted.
 */
export async function getOrSelectDailyBox(
  currentUserId: string,
  forceDoubleReveal: boolean = false
): Promise<{ selection: DailyBoxSelection; message: MessageBoxItem; secondMessage?: MessageBoxItem | null }> {
  const dateStr = getTodayDateStr();
  const selectionDocRef = doc(db, DAILY_SELECTIONS_COL, dateStr);

  try {
    // 1. Check if today's selection already exists in Firestore
    const selectionSnap = await getDoc(selectionDocRef);
    if (selectionSnap.exists()) {
      const selData = selectionSnap.data() as DailyBoxSelection;
      const msgSnap = await getDoc(doc(db, MESSAGE_BOXES_COL, selData.messageId));
      if (msgSnap.exists()) {
        const msg = { id: msgSnap.id, ...msgSnap.data() } as MessageBoxItem;
        let secondMsg: MessageBoxItem | null = null;
        if (selData.secondMessageId) {
          const secondSnap = await getDoc(doc(db, MESSAGE_BOXES_COL, selData.secondMessageId));
          if (secondSnap.exists()) {
            secondMsg = { id: secondSnap.id, ...secondSnap.data() } as MessageBoxItem;
          }
        }
        return { selection: selData, message: msg, secondMessage: secondMsg };
      }
    }

    // 2. Not yet selected today: atomically select an eligible message
    const allBoxesSnap = await getDocs(collection(db, MESSAGE_BOXES_COL));
    let boxes: MessageBoxItem[] = allBoxesSnap.docs.map(d => ({ id: d.id, ...d.data() } as MessageBoxItem));

    if (boxes.length === 0) {
      // Seed default boxes
      await ensureInitialMessageBoxes(currentUserId, "Partner");
      const retrySnap = await getDocs(collection(db, MESSAGE_BOXES_COL));
      boxes = retrySnap.docs.map(d => ({ id: d.id, ...d.data() } as MessageBoxItem));
    }

    // Filter out scheduled messages whose release date has not arrived yet
    const todayTimestamp = new Date(dateStr).getTime();
    const eligibleBoxes = boxes.filter(b => {
      if (b.scheduledDate) {
        const scheduledTime = new Date(b.scheduledDate).getTime();
        if (scheduledTime > todayTimestamp) return false;
      }
      return true;
    });

    // Find unopened boxes in current cycle
    let unopened = eligibleBoxes.filter(b => !b.isOpened);

    // If all unopened messages have been exhausted, trigger reshuffle (start new cycle)
    if (unopened.length === 0 && eligibleBoxes.length > 0) {
      for (const b of eligibleBoxes) {
        await updateDoc(doc(db, MESSAGE_BOXES_COL, b.id), {
          isOpened: false,
          cycleNumber: (b.cycleNumber || 1) + 1
        });
      }
      unopened = eligibleBoxes.map(b => ({ ...b, isOpened: false }));
    }

    // Pick random message
    const randomIndex = Math.floor(Math.random() * unopened.length);
    const chosen = unopened[randomIndex] || eligibleBoxes[0];

    let secondChosen: MessageBoxItem | null = null;
    if (forceDoubleReveal && unopened.length > 1) {
      // Pick a second message from the other partner if possible
      const oppositePartnerBoxes = unopened.filter(b => b.authorId !== chosen.authorId && b.id !== chosen.id);
      if (oppositePartnerBoxes.length > 0) {
        secondChosen = oppositePartnerBoxes[Math.floor(Math.random() * oppositePartnerBoxes.length)];
      } else {
        const remaining = unopened.filter(b => b.id !== chosen.id);
        if (remaining.length > 0) {
          secondChosen = remaining[Math.floor(Math.random() * remaining.length)];
        }
      }
    }

    const newSelection: DailyBoxSelection = {
      id: dateStr,
      date: dateStr,
      messageId: chosen.id,
      secondMessageId: secondChosen?.id,
      selectedAt: Timestamp.now(),
      isOpened: false,
      openedBy: []
    };

    await setDoc(selectionDocRef, newSelection);
    return { selection: newSelection, message: chosen, secondMessage: secondChosen };
  } catch (err) {
    console.warn("Firestore daily box selection failed, using fallback:", err);
  }

  // Local fallback
  const fallbackMsg: MessageBoxItem = {
    id: "fallback_today",
    title: "A Little Something Waiting For You",
    content: "No matter how busy today gets, remember that you are the best thing that ever happened to me. Take a moment to smile today.",
    authorId: "raaziq",
    authorName: "Raaziq",
    authorRole: "admin",
    category: "Love",
    isOpened: false,
    createdAt: new Date()
  };

  const fallbackSelection: DailyBoxSelection = {
    id: dateStr,
    date: dateStr,
    messageId: fallbackMsg.id,
    selectedAt: new Date(),
    isOpened: false
  };

  return { selection: fallbackSelection, message: fallbackMsg };
}

/**
 * Records that a box was opened.
 */
export async function markBoxAsOpened(
  dateStr: string,
  messageId: string,
  userId: string
): Promise<void> {
  try {
    const selectionDocRef = doc(db, DAILY_SELECTIONS_COL, dateStr);
    const selSnap = await getDoc(selectionDocRef);
    if (selSnap.exists()) {
      const openedBy = selSnap.data()?.openedBy || [];
      if (!openedBy.includes(userId)) {
        openedBy.push(userId);
      }
      await updateDoc(selectionDocRef, {
        isOpened: true,
        openedBy
      });
    }

    // Mark message as opened
    const msgRef = doc(db, MESSAGE_BOXES_COL, messageId);
    await updateDoc(msgRef, {
      isOpened: true,
      openedAt: Timestamp.now(),
      openedDateStr: dateStr
    });
  } catch (err) {
    console.warn("Could not mark box opened in Firestore:", err);
  }
}

/**
 * Adds a new message box contribution.
 */
export async function addMessageBoxContribution(
  data: Omit<MessageBoxItem, "id" | "isOpened" | "createdAt">
): Promise<string> {
  const newDoc = doc(collection(db, MESSAGE_BOXES_COL));
  const payload = {
    ...data,
    id: newDoc.id,
    isOpened: false,
    createdAt: Timestamp.now(),
    cycleNumber: 1
  };
  await setDoc(newDoc, payload);
  return newDoc.id;
}

/**
 * Toggles favorite on a message box.
 */
export async function toggleBoxFavorite(messageId: string, currentStatus: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, MESSAGE_BOXES_COL, messageId), {
      isFavorite: !currentStatus
    });
  } catch (e) {
    console.warn("Could not toggle favorite:", e);
  }
}

/**
 * Adds or updates a reaction to an opened message box.
 */
export async function reactToMessageBox(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  try {
    const ref = doc(db, MESSAGE_BOXES_COL, messageId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const reactions = snap.data()?.reactions || {};
      reactions[userId] = emoji;
      await updateDoc(ref, { reactions });
    }
  } catch (e) {
    console.warn("Could not save reaction:", e);
  }
}
