import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api/client";

export type Answers = Record<string, string>;

interface DraftData {
  id: string;
  answers: Answers;
  subdomain: string[];
  updatedAt: number;
  version: number;
}

interface DraftSystemOptions {
  draftKey: string;
  userId: string | null;
  domain: "tech" | "design" | "management";
}

interface DraftSystemReturn {
  answers: Answers;
  subdomain: string[];
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  setSubdomain: React.Dispatch<React.SetStateAction<string[]>>;
  isDraftLoaded: boolean;
  isSubmitted: boolean;
  setIsSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  isSyncing: boolean;
  isOffline: boolean;
  lastSaved: number | null;
  clearDraft: () => void;
  showResumePrompt: boolean;
  pendingDraftSavedAt: number | undefined;
  resumeDraft: () => void;
  discardDraft: () => void;
}

const SYNC_DELAY = 2000;
const BROADCAST_CHANNEL_NAME = "mfc_draft_sync";

const hasContent = (d: { answers: Answers; subdomain: string[] }) =>
  Object.values(d.answers).some((v) => v.trim()) || d.subdomain.length > 0;

// Keeps a task draft in three places: localStorage (instant, survives
// refresh), other open tabs (BroadcastChannel) and the server (PATCH, debounced,
// queued while offline). Only the explicit submit ever POSTs.
export const useDraftSystem = ({
  draftKey,
  userId,
  domain,
}: DraftSystemOptions): DraftSystemReturn => {
  const [answers, setAnswers] = useState<Answers>({});
  const [subdomain, setSubdomain] = useState<string[]>([]);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);

  const syncTimerRef = useRef<number | null>(null);
  const queuedRef = useRef<DraftData | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const versionRef = useRef(0);
  const tabIdRef = useRef(Math.random().toString(36).slice(2));
  const serverCopyRef = useRef<{ answers: Answers; subdomain: string[] } | null>(null);

  const syncToServer = useCallback(
    async (draft: DraftData): Promise<boolean> => {
      if (!userId) return false;
      try {
        setIsSyncing(true);
        await api.patch(`/upload/${domain}/${userId}`, {
          subdomain: draft.subdomain,
          answers: draft.answers,
        });
        return true;
      } catch (err) {
        console.error("Draft sync failed:", err);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [userId, domain]
  );

  // Load: a local draft wins (ask first), otherwise take the server copy.
  useEffect(() => {
    if (!draftKey || !userId) return;
    let cancelled = false;

    (async () => {
      let local: DraftData | null = null;
      try {
        const raw = localStorage.getItem(draftKey);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.id === userId && parsed.answers) local = parsed;
      } catch {
        local = null;
      }

      let remote: { subdomain?: string[]; answers?: Answers; isDone?: boolean } | null = null;
      try {
        const res = await api.get(`/upload/${domain}/${userId}`);
        remote = res.data?.data ?? null;
      } catch (err) {
        console.error("Failed to fetch draft from backend:", err);
      }
      if (cancelled) return;

      if (remote?.isDone) {
        setIsSubmitted(true);
        localStorage.removeItem(draftKey);
        setIsDraftLoaded(true);
        return;
      }
      if (remote) {
        serverCopyRef.current = { answers: remote.answers ?? {}, subdomain: remote.subdomain ?? [] };
      }
      if (local && hasContent(local)) {
        setPendingDraft(local);
        return;
      }
      if (remote) {
        setAnswers(remote.answers ?? {});
        setSubdomain(remote.subdomain ?? []);
      }
      setIsDraftLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [draftKey, userId, domain]);

  // Every edit: save locally, tell other tabs, debounce a server sync.
  useEffect(() => {
    if (!isDraftLoaded || isSubmitted || !draftKey) return;

    const draft: DraftData = {
      id: userId || "",
      answers,
      subdomain,
      updatedAt: Date.now(),
      version: ++versionRef.current,
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSaved(draft.updatedAt);
    } catch (err) {
      console.error("Failed to save draft to localStorage:", err);
    }
    channelRef.current?.postMessage({ draftKey, draft, tabId: tabIdRef.current });

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(async () => {
      if (!navigator.onLine || !(await syncToServer(draft))) queuedRef.current = draft;
    }, SYNC_DELAY);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [answers, subdomain, isDraftLoaded, isSubmitted, draftKey, userId, syncToServer]);

  // Offline handling: only the latest queued draft matters.
  useEffect(() => {
    const onOnline = async () => {
      setIsOffline(false);
      const queued = queuedRef.current;
      if (queued && (await syncToServer(queued))) queuedRef.current = null;
    };
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncToServer]);

  // Cross-tab: take newer drafts typed in another tab of the same form.
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current.onmessage = (event) => {
        const { draftKey: key, draft, tabId } = event.data || {};
        if (key !== draftKey || tabId === tabIdRef.current) return;
        if (draft.version > versionRef.current) {
          versionRef.current = draft.version;
          setAnswers(draft.answers);
          setSubdomain(draft.subdomain);
        }
      };
    } catch (err) {
      console.warn("BroadcastChannel not supported:", err);
    }
    return () => channelRef.current?.close();
  }, [draftKey]);

  const resumeDraft = useCallback(() => {
    if (pendingDraft) {
      setAnswers(pendingDraft.answers);
      setSubdomain(pendingDraft.subdomain);
      versionRef.current = pendingDraft.version;
    }
    setPendingDraft(null);
    setIsDraftLoaded(true);
  }, [pendingDraft]);

  // Discarding the local draft falls back to whatever the server last saved.
  const discardDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    if (serverCopyRef.current) {
      setAnswers(serverCopyRef.current.answers);
      setSubdomain(serverCopyRef.current.subdomain);
    }
    setPendingDraft(null);
    setIsDraftLoaded(true);
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    queuedRef.current = null;
  }, [draftKey]);

  return {
    answers,
    subdomain,
    setAnswers,
    setSubdomain,
    isDraftLoaded,
    isSubmitted,
    setIsSubmitted,
    isSyncing,
    isOffline,
    lastSaved,
    clearDraft,
    showResumePrompt: pendingDraft !== null,
    pendingDraftSavedAt: pendingDraft?.updatedAt,
    resumeDraft,
    discardDraft,
  };
};

export const DraftResumeModal = ({
  show,
  onResume,
  onDiscard,
  lastSaved,
}: {
  show: boolean;
  onResume: () => void;
  onDiscard: () => void;
  lastSaved?: number;
}) => {
  if (!show) return null;

  const timeAgo = lastSaved 
    ? new Date(lastSaved).toLocaleString() 
    : "recently";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
      <div 
        className="nes-container is-dark is-rounded p-6 max-w-md mx-4"
        style={{ fontFamily: "'Press Start 2P', cursive" }}
      >
        <h3 className="text-prime text-sm mb-4">📝 Draft Found!</h3>
        <p className="text-white text-xs mb-2">
          You have an unsaved draft from:
        </p>
        <p className="text-gray-400 text-[10px] mb-4">{timeAgo}</p>
        <p className="text-white text-xs mb-6">
          Would you like to resume where you left off?
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onResume}
            className="nes-btn is-primary text-[10px]"
          >
            Resume
          </button>
          <button
            onClick={onDiscard}
            className="nes-btn is-error text-[10px]"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

export const DraftStatusIndicator = ({
  isSyncing,
  isOffline,
  lastSaved,
}: {
  isSyncing: boolean;
  isOffline: boolean;
  lastSaved: number | null;
}) => {
  if (isOffline) {
    return (
      <span className="text-yellow-500 text-[8px] flex items-center gap-1">
        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
        Offline - Saving locally
      </span>
    );
  }

  if (isSyncing) {
    return (
      <span className="text-blue-400 text-[8px] flex items-center gap-1">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        Syncing...
      </span>
    );
  }

  if (lastSaved) {
    return (
      <span className="text-green-500 text-[8px] flex items-center gap-1">
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        Saved
      </span>
    );
  }

  return null;
};

export default useDraftSystem;
