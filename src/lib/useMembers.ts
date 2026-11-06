/**
 * Who wrote what. Raaziq has more than one account, and older records use the
 * labels "raaziq" and "razia" instead of an account id, so authorship is
 * decided by which person an id belongs to rather than by exact account.
 */
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export type Person = "raaziq" | "razia";
export type Members = Record<string, Person>;

const LABELS: Record<string, Person> = { raaziq: "raaziq", razia: "razia", jarvis: "raaziq" };
export const PERSON_NAME: Record<Person, string> = { raaziq: "Raaziq", razia: "Razia" };

/** The person behind an author id, or null when it can't be known. Never a guess. */
export function personOf(authorId: string | null | undefined, members: Members): Person | null {
  if (!authorId) return null;
  return members[authorId] ?? LABELS[authorId] ?? null;
}

export function useMembers(): Members {
  const [members, setMembers] = useState<Members>({});
  useEffect(() => {
    let live = true;
    getDocs(collection(db, "users"))
      .then((snap) => {
        if (!live) return;
        const next: Members = {};
        snap.docs.forEach((d) => {
          const role = d.get("role");
          if (role === "admin") next[d.id] = "raaziq";
          else if (role === "sanctuary_owner" || role === "partner") next[d.id] = "razia";
        });
        setMembers(next);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return members;
}
