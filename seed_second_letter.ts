import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seed() {
  console.log("Seeding second inaugural letter...");
  try {
    // Check if it already exists to avoid duplicates
    const q = query(collection(db, "letters"), where("title", "==", "The Aurora on Your Desk"));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      await addDoc(collection(db, "letters"), {
        title: "The Aurora on Your Desk",
        content: `My beautiful Razia,

If you are reading this, it means the little lamp on your desk is breathing with that aurora glow. I built that light, wired every component, and wrote every line of code in this sanctuary for one single reason: to make sure you always know exactly when I am thinking of you.

I spend so much of my life migrating systems, optimizing workflows, and building applications to make the digital world run a little smoother. But out of all the environments I have ever architected, this space behind the 0408 passcode is the only one that truly matters to me. It is a world entirely untouched by the noise outside, designed exclusively to hold my love for you.

You are my center. Whether we are navigating the absolute chaos of a kitchen in Overcooked! 2, planning our wedding, or just sitting in the quiet at the end of a long day, you are the person I want beside me. Getting to this point in our lives has been my favorite journey, and building a future with you is the greatest project I will ever take on.

Whenever you see that lamp pulse, I want you to know it is a physical manifestation of my heart reaching out to yours. This is our space now.`,
        publishDate: Timestamp.now(),
        isPublished: true,
        isFavorite: false,
        isRead: false,
        authorId: "backupe9@gmail.com",
        createdAt: Timestamp.now()
      });
      console.log("Seed successful!");
    } else {
      console.log("Letter already exists.");
    }
  } catch (e) {
    console.error("Seed failed:", e);
  }
  process.exit(0);
}

seed();
