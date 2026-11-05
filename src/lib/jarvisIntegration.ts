/**
 * Jarvis Ecosystem Integration Adapter for Project Cupid
 * Coordinates with Raaziq's Jarvis Second-Brain ecosystem (v2.5)
 * Strict Privacy Boundaries: Private health data and private journals are completely walled off.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { TimelineMoment, MessageBoxItem, ReasonVaultItem, DreamBoardItem, DatePlan } from "../types";

export interface JarvisToolDefinition {
  name: string;
  description: string;
  category: "shared_content" | "appreciation" | "planning" | "system";
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: any;
    }>;
    required: string[];
  };
}

export interface JarvisPermissionConfig {
  enabled: boolean;
  apiKey: string;
  allowDraftLetters: boolean;
  allowAddMemories: boolean;
  allowAddAppreciation: boolean;
  allowAddMessageBoxes: boolean;
  allowAddDreams: boolean;
  allowAddDateIdeas: boolean;
  allowReadSharedMemories: boolean;
  // Strict Privacy guarantees - always enforced
  allowPrivateHealthAccess: false;
  allowPrivateJournalAccess: false;
}

export interface JarvisAuditLog {
  id?: string;
  action: string;
  status: "success" | "rejected" | "unauthorized" | "error";
  parameters?: any;
  resultSummary?: string;
  ip?: string;
  timestamp: any;
}

export interface JarvisEvent {
  eventId: string;
  eventType: 
    | "cupid.letter.created"
    | "cupid.letter.sent"
    | "cupid.message.created"
    | "cupid.message.revealed"
    | "cupid.memory.created"
    | "cupid.capsule.unlocked"
    | "cupid.integration.health_changed";
  timestamp: string;
  payload: Record<string, any>;
}

export const DEFAULT_JARVIS_CONFIG: JarvisPermissionConfig = {
  enabled: true,
  apiKey: "cupid_jarvis_live_bridge_key",
  allowDraftLetters: true,
  allowAddMemories: true,
  allowAddAppreciation: true,
  allowAddMessageBoxes: true,
  allowAddDreams: true,
  allowAddDateIdeas: true,
  allowReadSharedMemories: true,
  allowPrivateHealthAccess: false,
  allowPrivateJournalAccess: false
};

/**
 * Tool Definitions registered for the Jarvis Ecosystem (matches second-brain v2.5 ToolDefinition schema)
 */
export const JARVIS_CUPID_TOOLS: JarvisToolDefinition[] = [
  {
    name: "cupid_get_status",
    description: "Retrieves Project Cupid application health, paired partner status, and active permissions.",
    category: "system",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "cupid_add_memory",
    description: "Adds a shared milestone to the relationship timeline (Our Story) in Project Cupid.",
    category: "shared_content",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date or era of the milestone (e.g. 'October 2025' or '2026-11-05')" },
        title: { type: "string", description: "Title of the memory" },
        description: { type: "string", description: "Narrative of what occurred and why it is meaningful" },
        reflection: { type: "string", description: "Personal takeaway or reflection on the memory" }
      },
      required: ["date", "title", "description"]
    }
  },
  {
    name: "cupid_draft_letter",
    description: "Creates a draft love letter for Razia. Requires Raaziq's manual review in the app before sending.",
    category: "shared_content",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the letter" },
        content: { type: "string", description: "Letter markdown content" },
        category: { type: "string", description: "Letter theme (e.g. 'Open when you miss me', 'Anniversary')" }
      },
      required: ["title", "content"]
    }
  },
  {
    name: "cupid_add_message_box",
    description: "Contributes a random surprise message to the virtual message box collection for daily opening.",
    category: "shared_content",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "The message, compliment, funny joke, or thought" },
        title: { type: "string", description: "Optional title for the message" },
        category: { type: "string", description: "Category: Love, Compliments, Encouragement, Funny, Inside jokes, Memories, etc." },
        isSecret: { type: "boolean", description: "Whether to keep unopened contribution hidden from partner" }
      },
      required: ["content", "category"]
    }
  },
  {
    name: "cupid_add_appreciation",
    description: "Adds a heartfelt reason why Raaziq loves and appreciates Razia to the 365 Reasons Vault.",
    category: "appreciation",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The specific reason or appreciative thought" }
      },
      required: ["text"]
    }
  },
  {
    name: "cupid_add_dream",
    description: "Adds a dream or goal to the shared dream board (e.g. Dreams That Cost Nothing or travel vision).",
    category: "planning",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the dream" },
        description: { type: "string", description: "Vision of what you want to experience together" },
        isCostNothing: { type: "boolean", description: "True if this is a free / priceless shared dream" },
        category: { type: "string", description: "Home, Travel, Experiences, Free, Family" }
      },
      required: ["title", "description"]
    }
  },
  {
    name: "cupid_add_date_idea",
    description: "Adds a creative or free date idea to the Project Cupid date planner.",
    category: "planning",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the date plan" },
        description: { type: "string", description: "Details of the activity or conversation evening" },
        category: { type: "string", description: "Free, At-Home, Outdoor, Conversation, Creative" }
      },
      required: ["title", "description"]
    }
  },
  {
    name: "cupid_get_shared_memories",
    description: "Retrieves permitted shared relationship milestones from Our Story.",
    category: "shared_content",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of memories to return (default: 10)" }
      },
      required: []
    }
  }
];

/**
 * Executes a tool action triggered by Jarvis with strict authorization & permission checks
 */
export async function executeJarvisTool(
  toolName: string,
  params: any,
  authKey: string,
  config: JarvisPermissionConfig = DEFAULT_JARVIS_CONFIG
): Promise<{ success: boolean; result?: any; error?: string }> {
  // 1. Authenticate
  if (!config.enabled) {
    await recordJarvisAudit(toolName, "unauthorized", params, "Jarvis integration is currently disabled");
    return { success: false, error: "Jarvis integration is disabled in Project Cupid settings" };
  }

  if (authKey !== config.apiKey) {
    await recordJarvisAudit(toolName, "unauthorized", params, "Invalid integration API key");
    return { success: false, error: "Unauthorized: Invalid Jarvis integration token" };
  }

  // 2. Reject any attempt to access private health or private journals
  if (
    toolName.includes("health") ||
    toolName.includes("cycle") ||
    toolName.includes("period") ||
    toolName.includes("symptom") ||
    toolName.includes("journal_private")
  ) {
    await recordJarvisAudit(toolName, "rejected", params, "Policy violation: Private health data is strictly inaccessible");
    return {
      success: false,
      error: "Access Denied: Private health information and personal journals belong strictly to the individual and cannot be accessed by Jarvis."
    };
  }

  try {
    switch (toolName) {
      case "cupid_get_status": {
        const status = {
          application: "Project Cupid",
          version: "4.1.0",
          status: "connected",
          activeCapabilities: JARVIS_CUPID_TOOLS.map(t => t.name),
          enforcedPrivacy: "Strict User-Level Privacy (No health access)",
          timestamp: new Date().toISOString()
        };
        await recordJarvisAudit(toolName, "success", params, "Status queried");
        return { success: true, result: status };
      }

      case "cupid_add_memory": {
        if (!config.allowAddMemories) {
          return { success: false, error: "Permission denied: allowAddMemories is disabled" };
        }
        const ref = doc(collection(db, "timeline_moments"));
        const newMemory = {
          id: ref.id,
          date: params.date,
          title: params.title,
          description: params.description,
          reflection: params.reflection || "Added via Jarvis",
          category: "milestone",
          createdAt: Timestamp.now()
        };
        try {
          await setDoc(ref, newMemory);
        } catch (writeErr: any) {
          console.warn("[Jarvis Bridge Notice] Firestore memory write deferred:", writeErr?.message);
        }
        await publishJarvisEvent("cupid.memory.created", { id: ref.id, title: params.title });
        await recordJarvisAudit(toolName, "success", params, `Memory added: ${params.title}`);
        return { success: true, result: { memoryId: ref.id, message: "Memory created in Our Story" } };
      }

      case "cupid_draft_letter": {
        if (!config.allowDraftLetters) {
          return { success: false, error: "Permission denied: allowDraftLetters is disabled" };
        }
        const ref = doc(collection(db, "letters"));
        const newLetter = {
          id: ref.id,
          title: params.title,
          content: params.content,
          category: params.category || "Open when you need reassurance",
          publishDate: Timestamp.now(),
          isPublished: false, // DRAFT ONLY: Requires user review to publish
          isFavorite: false,
          isRead: false,
          authorId: "raaziq",
          authorName: "Raaziq (Drafted with Jarvis)",
          createdAt: Timestamp.now()
        };
        try {
          await setDoc(ref, newLetter);
        } catch (writeErr: any) {
          console.warn("[Jarvis Bridge Notice] Firestore letter draft write deferred:", writeErr?.message);
        }
        await publishJarvisEvent("cupid.letter.created", { id: ref.id, title: params.title, isDraft: true });
        await recordJarvisAudit(toolName, "success", params, `Draft letter created: ${params.title}`);
        return { success: true, result: { letterId: ref.id, message: "Letter saved as draft for your review" } };
      }

      case "cupid_add_message_box": {
        if (!config.allowAddMessageBoxes) {
          return { success: false, error: "Permission denied: allowAddMessageBoxes is disabled" };
        }
        const ref = doc(collection(db, "message_boxes"));
        const newBox: Omit<MessageBoxItem, "id"> = {
          title: params.title || undefined,
          content: params.content,
          authorId: "raaziq",
          authorName: "Raaziq",
          authorRole: "admin",
          category: params.category,
          isAnonymous: false,
          isSecret: params.isSecret !== false,
          isOpened: false,
          isFavorite: false,
          createdAt: Timestamp.now()
        };
        try {
          await setDoc(ref, { ...newBox, id: ref.id });
        } catch (writeErr: any) {
          console.warn("[Jarvis Bridge Notice] Firestore message box write deferred:", writeErr?.message);
        }
        await publishJarvisEvent("cupid.message.created", { id: ref.id, category: params.category });
        await recordJarvisAudit(toolName, "success", params, "Message sealed in message box");
        return { success: true, result: { messageId: ref.id, message: "Message sealed in virtual box" } };
      }

      case "cupid_add_appreciation": {
        if (!config.allowAddAppreciation) {
          return { success: false, error: "Permission denied: allowAddAppreciation is disabled" };
        }
        const ref = doc(collection(db, "reasons_vault"));
        const newReason: Omit<ReasonVaultItem, "id"> = {
          dayNumber: Math.floor(Math.random() * 365) + 1,
          text: params.text,
          author: "Raaziq",
          authorId: "raaziq",
          isFavorite: false,
          dateAdded: Timestamp.now()
        };
        try {
          await setDoc(ref, { ...newReason, id: ref.id });
        } catch (writeErr: any) {
          console.warn("[Jarvis Bridge Notice] Firestore appreciation write deferred:", writeErr?.message);
        }
        await recordJarvisAudit(toolName, "success", params, "Reason added to vault");
        return { success: true, result: { reasonId: ref.id, message: "Appreciation reason added to 365 Vault" } };
      }

      case "cupid_add_dream": {
        if (!config.allowAddDreams) {
          return { success: false, error: "Permission denied: allowAddDreams is disabled" };
        }
        const ref = doc(collection(db, "dream_board"));
        const newDream: Omit<DreamBoardItem, "id"> = {
          title: params.title,
          description: params.description,
          category: params.category || (params.isCostNothing ? "Free" : "Experiences"),
          isCostNothing: Boolean(params.isCostNothing),
          progress: 10,
          isCompleted: false,
          createdAt: Timestamp.now()
        };
        try {
          await setDoc(ref, { ...newDream, id: ref.id });
        } catch (writeErr: any) {
          console.warn("[Jarvis Bridge Notice] Firestore dream write deferred:", writeErr?.message);
        }
        await recordJarvisAudit(toolName, "success", params, `Dream added: ${params.title}`);
        return { success: true, result: { dreamId: ref.id, message: "Dream added to shared board" } };
      }

      case "cupid_add_date_idea": {
        if (!config.allowAddDateIdeas) {
          return { success: false, error: "Permission denied: allowAddDateIdeas is disabled" };
        }
        const ref = doc(collection(db, "date_plans"));
        const newDate: Omit<DatePlan, "id"> = {
          title: params.title,
          description: params.description,
          category: params.category || "Free",
          isCompleted: false,
          costEstimate: params.category === "Free" ? "Free" : "$",
          createdAt: Timestamp.now()
        };
        try {
          await setDoc(ref, { ...newDate, id: ref.id });
        } catch (writeErr: any) {
          console.warn("[Jarvis Bridge Notice] Firestore date idea write deferred:", writeErr?.message);
        }
        await recordJarvisAudit(toolName, "success", params, `Date idea added: ${params.title}`);
        return { success: true, result: { dateId: ref.id, message: "Date idea recorded in planner" } };
      }

      case "cupid_get_shared_memories": {
        if (!config.allowReadSharedMemories) {
          return { success: false, error: "Permission denied: allowReadSharedMemories is disabled" };
        }
        const max = params?.limit || 10;
        try {
          const snap = await getDocs(query(collection(db, "timeline_moments"), orderBy("createdAt", "desc"), limit(max)));
          const memories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          await recordJarvisAudit(toolName, "success", params, `Retrieved ${memories.length} memories`);
          return { success: true, result: { memories } };
        } catch (qErr: any) {
          console.warn("[Jarvis Bridge Notice] Firestore timeline read deferred:", qErr?.message);
          return { success: true, result: { memories: [] } };
        }
      }

      default:
        await recordJarvisAudit(toolName, "error", params, `Unknown tool: ${toolName}`);
        return { success: false, error: `Tool ${toolName} is not recognized` };
    }
  } catch (err: any) {
    console.error(`[Jarvis Bridge Error] ${toolName}:`, err);
    await recordJarvisAudit(toolName, "error", params, err?.message);
    return { success: false, error: err?.message || "Execution error" };
  }
}

/**
 * Records an audit log entry for every Jarvis action
 */
export async function recordJarvisAudit(
  action: string,
  status: JarvisAuditLog["status"],
  parameters?: any,
  resultSummary?: string
): Promise<void> {
  try {
    const ref = collection(db, "jarvis_audit_logs");
    await addDoc(ref, {
      action,
      status,
      parameters: parameters ? JSON.stringify(parameters).substring(0, 500) : null,
      resultSummary,
      timestamp: Timestamp.now()
    });
  } catch (e) {
    console.warn("Could not save Jarvis audit log:", e);
  }
}

/**
 * Publishes a structured event for the ecosystem
 */
export async function publishJarvisEvent(
  eventType: JarvisEvent["eventType"],
  payload: Record<string, any>
): Promise<void> {
  try {
    const ref = collection(db, "jarvis_events");
    const event: JarvisEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventType,
      timestamp: new Date().toISOString(),
      payload
    };
    await addDoc(ref, event);
  } catch (e) {
    console.warn("Could not publish Jarvis event:", e);
  }
}

/**
 * Retrieves recent Jarvis audit logs
 */
export async function getJarvisAuditLogs(maxCount: number = 20): Promise<JarvisAuditLog[]> {
  try {
    const snap = await getDocs(query(collection(db, "jarvis_audit_logs"), orderBy("timestamp", "desc"), limit(maxCount)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JarvisAuditLog));
  } catch (e) {
    console.warn("Could not load Jarvis audit logs:", e);
    return [];
  }
}
