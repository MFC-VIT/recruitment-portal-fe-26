import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import secureLocalStorage from "react-secure-storage";
import api from "../api/client";
import { Repo } from "../api/candidate";
import RepoPicker from "../components/RepoPicker";
import { ToastContent } from "../components/CustomToast";
import {
  DraftResumeModal,
  DraftStatusIndicator,
  useDraftSystem,
} from "../hooks/useDraftSystem";

export type Domain = "tech" | "design" | "management";

interface Question {
  key: string;
  subdomain: string | null;
  kind: "long" | "portfolio";
  prompt: string;
  helper?: string;
  maxWords: number;
}

interface Subdomain {
  value: string;
  label: string;
}

interface Props {
  domain: Domain;
  setOpenToast: React.Dispatch<React.SetStateAction<boolean>>;
  setToastContent: React.Dispatch<React.SetStateAction<ToastContent>>;
}

const DOMAIN_LABEL: Record<Domain, string> = {
  tech: "Tech",
  design: "Design",
  management: "Management",
};

const wordCount = (text: string) => {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
};

// One form for every domain. Questions, subdomains and word limits come from
// GET /questions/:domain, so changing next year's questions needs no deploy.
const TaskForm = ({ domain, setOpenToast, setToastContent }: Props) => {
  const id = secureLocalStorage.getItem("id") as string | null;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const draft = useDraftSystem({
    draftKey: id ? `${domain}_draft_v2_${id}` : "",
    userId: id,
    domain,
  });
  const { answers, setAnswers, subdomain, setSubdomain } = draft;

  useEffect(() => {
    api
      .get(`/questions/${domain}`)
      .then((res) => {
        setQuestions(res.data?.data?.questions ?? []);
        setSubdomains(res.data?.data?.subdomains ?? []);
      })
      .catch(() => setLoadError("Could not load the questions. Refresh to try again."));
  }, [domain]);

  const visible = useMemo(
    () => questions.filter((q) => q.subdomain === null || subdomain.includes(q.subdomain)),
    [questions, subdomain]
  );
  const portfolio = visible.filter((q) => q.kind === "portfolio");
  const perSubdomain = visible.filter((q) => q.kind !== "portfolio");

  const toast = (message: string, type: ToastContent["type"]) => {
    setOpenToast(true);
    setToastContent({ message, type });
  };

  const toggleSubdomain = (value: string, checked: boolean) =>
    setSubdomain((prev) =>
      checked ? Array.from(new Set([...prev, value])) : prev.filter((s) => s !== value)
    );

  const setAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(({ [key]: _, ...rest }) => rest);
  };

  // Appends a repo in the "[Title] - [Github Link] - [Demo Link]" format the
  // portfolio question asks for.
  const importRepo = (key: string, repo: Repo) => {
    const line = [repo.name, repo.url, repo.homepage].filter(Boolean).join(" - ");
    const current = answers[key]?.trimEnd() ?? "";
    if (current.includes(repo.url)) return;
    setAnswer(key, current ? `${current}\n${line}` : line);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || !id) return;

    if (subdomain.length === 0) {
      toast("Please select at least one subdomain!", "warning");
      return;
    }
    const missing = visible.filter((q) => !answers[q.key]?.trim());
    if (missing.length > 0) {
      setFieldErrors(Object.fromEntries(missing.map((q) => [q.key, "This question needs an answer."])));
      toast("Please answer every question before submitting.", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/upload/${domain}/${id}`, { subdomain, answers }, { timeout: 20000 });
      draft.clearDraft();
      draft.setIsSubmitted(true);
      secureLocalStorage.setItem(`${DOMAIN_LABEL[domain]}Sub`, true);
      toast("Task Submitted Successfully!", "success");
    } catch (error) {
      const errors = axios.isAxiosError(error) ? error.response?.data?.data?.errors : null;
      if (Array.isArray(errors)) {
        setFieldErrors(Object.fromEntries(errors.map((er: { key: string; error: string }) => [er.key, er.error])));
      }
      const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
      toast(message || "Failed to submit task. Please try again or contact support.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (draft.isSubmitted) {
    return (
      <div className="p-4">
        You've successfully submitted the {DOMAIN_LABEL[domain]} Task. You can now track the
        status of your application in the designated "Application Status" tab.
      </div>
    );
  }

  if (loadError) return <div className="p-4 text-prime">{loadError}</div>;
  if (!draft.isDraftLoaded && !draft.showResumePrompt) return <div className="p-4">Loading...</div>;

  const renderQuestion = (q: Question, big: boolean) => {
    const value = answers[q.key] ?? "";
    const words = wordCount(value);
    return (
      <div
        key={q.key}
        style={{ backgroundColor: "rgba(0,0,0,0)", padding: big ? 0 : "1rem" }}
        className="nes-field is-inline flex flex-col mt-4"
      >
        {!big && (
          <label htmlFor={q.key} style={{ color: "#fff" }} className="w-full text-label text-xs mb-2">
            {q.prompt}
          </label>
        )}
        {q.kind === "portfolio" && domain === "tech" && (
          <div className="flex justify-end mb-2">
            <RepoPicker onPick={(repo) => importRepo(q.key, repo)} />
          </div>
        )}
        <textarea
          id={q.key}
          className={`nes-textarea is-dark ${big ? "min-h-[15rem]" : "min-h-[5rem]"}`}
          value={value}
          onChange={(e) => setAnswer(q.key, e.target.value)}
          placeholder="Write here..."
          aria-invalid={!!fieldErrors[q.key]}
        />
        <div className="flex justify-between text-xs mt-1">
          <span className="text-red-400">{fieldErrors[q.key] ?? ""}</span>
          <span className={words > q.maxWords ? "text-red-400" : "text-gray-400"}>
            {words}/{q.maxWords} words
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <DraftResumeModal
        show={draft.showResumePrompt}
        onResume={draft.resumeDraft}
        onDiscard={draft.discardDraft}
        lastSaved={draft.pendingDraftSavedAt}
      />
      <div className="flex justify-end mb-2">
        <DraftStatusIndicator
          isSyncing={draft.isSyncing}
          isOffline={draft.isOffline}
          lastSaved={draft.lastSaved}
        />
      </div>
      {portfolio.map((q) => (
        <section key={`${q.key}-helper`} className="mb-4 text-xs md:text-sm whitespace-pre-line">
          {q.helper?.split("\n").map((line, i) =>
            i === 0 ? (
              <span key={i}>{line}</span>
            ) : (
              <span key={i} className={`text-prime block ${i > 1 ? "hidden md:block" : ""}`}>
                {line}
              </span>
            )
          )}
        </section>
      ))}
      <form onSubmit={handleSubmit}>
        <h2>Choose a subdomain</h2>
        <div className="flex">
          <div className="flex flex-col md:flex-row md:gap-4 flex-wrap justify-center mb-4 md:mb-0">
            {subdomains.map((s) => (
              <label key={s.value}>
                <input
                  type="checkbox"
                  className="nes-checkbox is-dark"
                  value={s.value}
                  checked={subdomain.includes(s.value)}
                  onChange={(e) => toggleSubdomain(s.value, e.target.checked)}
                />
                <span className="text-xs md:text-xs">{s.label}</span>
              </label>
            ))}
          </div>
        </div>
        {fieldErrors.subdomain && <p className="text-red-400 text-xs">{fieldErrors.subdomain}</p>}

        {portfolio.map((q) => renderQuestion(q, true))}

        <section className="my-8 text-xs md:text-sm">
          <span className="text-prime">
            Answer some general questions: (Choose a subdomain in order to procure your questions)
          </span>
          {perSubdomain.map((q) => renderQuestion(q, false))}
        </section>

        <p className="text-prime text-xs md:text-sm mt-4 md:mt-0">
          Note: Once submitted, this cannot be undone.
        </p>
        <button
          type="submit"
          className="nes-btn is-error w-full text-xs md:text-sm"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </>
  );
};

export default TaskForm;
