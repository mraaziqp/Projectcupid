import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seed() {
  console.log("Seeding inaugural letter...");
  try {
    await addDoc(collection(db, "letters"), {
      title: "The Architecture of Us",
      content: `I spend my days architecting systems, migrating environments, and writing endless lines of code to make digital worlds run smoothly. I can wire up microcontrollers, solder components, and build things from the ground up until they work perfectly. But stepping back and looking at everything I’ve ever designed, nothing compares to the life we are building together.

I created this private sanctuary, just for you and me, because you deserve a space completely untouched by the noise of the rest of the world. Think of this as our own digital time capsule. Every day, I want you to have a place to come to and be reminded of exactly how much you mean to me, how fiercely I protect what we have, and how unbelievably excited I am for our wedding and the future ahead of us.

Just like setting up a new server or dialing in a 3D print, getting to this point in our lives took patience, learning, and an unwavering commitment to getting it right. You are my absolute priority, my favorite person to come home to, and the very best part of my everyday reality.

This app, these letters, the glowing light on your desk—it's all just a small way to show you that my heart, my focus, and my future are entirely yours. I can't wait for everything that comes next.`,
      publishDate: Timestamp.now(),
      isPublished: true,
      isFavorite: false,
      isRead: false,
      authorId: "backupe9@gmail.com",
      createdAt: Timestamp.now()
    });
    console.log("Seed successful!");
  } catch (e) {
    console.error("Seed failed:", e);
  }
  process.exit(0);
}

seed();
