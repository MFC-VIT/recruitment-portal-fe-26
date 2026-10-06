import { useCallback, useEffect, useState } from "react";
import secureLocalStorage from "react-secure-storage";
import { DomainTimeline, getOffers, getTimeline, Offer, Timeline } from "../../api/candidate";
import { usePush } from "../../hooks/usePush";
import StageList from "./StageList";
import OfferCard from "./OfferCard";
import ResultReveal from "./ResultReveal";

const DOMAIN_TITLE = { tech: "Technical", design: "Design", management: "Management" } as const;
const REFRESH_MS = 60_000;

const PushBanner = () => {
  const { state, enable } = usePush();
  if (state !== "prompt" && state !== "on" && state !== "denied") return null;
  return (
    <div className="nes-container is-dark is-rounded text-[10px] md:text-xs mb-4 flex flex-wrap items-center justify-between gap-2">
      {state === "on" && <span>🔔 You'll get a notification when anything changes.</span>}
      {state === "denied" && <span>Notifications are blocked for this site in your browser settings.</span>}
      {state === "prompt" && (
        <>
          <span>Get notified the moment your status changes or an interview is near.</span>
          <button type="button" className="nes-btn is-primary text-[10px]" onClick={enable}>
            Turn on notifications
          </button>
        </>
      )}
    </div>
  );
};

const DomainCard = ({
  d,
  offer,
  userId,
  onOfferChange,
}: {
  d: DomainTimeline;
  offer?: Offer;
  userId: string;
  onOfferChange: (o: Offer) => void;
}) => (
  <div className="nes-container is-dark is-rounded with-title flex-1 min-w-[260px]">
    <p className="title">{DOMAIN_TITLE[d.domain]}</p>
    <StageList stages={d.stages} />
    {offer && <OfferCard offer={offer} onChange={onOfferChange} />}
    <ResultReveal userId={userId} domain={d.domain} result={d.result} />
  </div>
);

// Everything about "where am I in the process", polled every minute while open.
const ApplicationTracker = () => {
  const userId = secureLocalStorage.getItem("id") as string | null;
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [t, o] = await Promise.all([getTimeline(userId), getOffers()]);
      setTimeline(t);
      setOffers(o);
      setError("");
    } catch {
      setError("Couldn't load your application status. Retrying shortly.");
    }
  }, [userId]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const updateOffer = (next: Offer) => setOffers((prev) => prev.map((o) => (o._id === next._id ? next : o)));

  if (!userId) return <div className="text-xs p-4">Please log in again.</div>;
  if (!timeline) return <div className="text-xs p-4">{error || "Loading your application..."}</div>;
  if (timeline.domains.length === 0) {
    return <div className="text-xs p-4">Pick your domains in the Profile tab to start your application.</div>;
  }

  return (
    <div className="w-full">
      <PushBanner />
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <div className="flex flex-col lg:flex-row gap-4">
        {timeline.domains.map((d) => (
          <DomainCard
            key={d.domain}
            d={d}
            userId={userId}
            offer={offers.find((o) => o.domain === d.domain)}
            onOfferChange={updateOffer}
          />
        ))}
      </div>
    </div>
  );
};

export default ApplicationTracker;
