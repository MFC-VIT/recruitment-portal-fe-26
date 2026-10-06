import { useState } from "react";
import { Offer, respondToOffer, retryGithubInvite } from "../../api/candidate";
import GithubConnect from "../GithubConnect";

const LINK_LABEL: Record<string, string> = {
  whatsapp: "Join the WhatsApp group",
  discord: "Join the Discord",
  notion: "Open the onboarding page",
  calendar: "Add the club calendar",
  other: "Next steps",
};

const GITHUB_TEXT: Record<string, string> = {
  invited: "Check your email or github.com/notifications to accept the org invite.",
  "already-member": "You're already in the GitHub org.",
  "needs-github": "Connect GitHub to get your invite to the club's org.",
  failed: "The GitHub invite didn't go through. Try again, or ping the team.",
  disabled: "",
  "not-started": "",
};

// Accept/decline, then everything needed on day one in one place.
const OfferCard = ({ offer, onChange }: { offer: Offer; onChange: (o: Offer) => void }) => {
  const [busy, setBusy] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [error, setError] = useState("");

  const act = async (fn: () => Promise<Offer>) => {
    setBusy(true);
    setError("");
    try {
      onChange(await fn());
    } catch {
      setError("Something went wrong, please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (offer.status === "declined") {
    return <p className="text-gray-400 text-xs mt-4">You declined this offer. Thanks for applying!</p>;
  }

  if (offer.status === "pending") {
    return (
      <div className="nes-container is-dark is-rounded mt-4 text-left text-xs">
        <p className="text-prime mb-3">🎉 You have an offer to join MFC!</p>
        <p className="mb-4">Accept it to get your onboarding links and GitHub org invite.</p>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            className="nes-btn is-success text-[10px]"
            disabled={busy}
            onClick={() => act(() => respondToOffer(offer._id, true))}
          >
            Accept offer
          </button>
          {confirmDecline ? (
            <button
              type="button"
              className="nes-btn is-error text-[10px]"
              disabled={busy}
              onClick={() => act(() => respondToOffer(offer._id, false))}
            >
              Yes, decline
            </button>
          ) : (
            <button type="button" className="nes-btn text-[10px]" onClick={() => setConfirmDecline(true)}>
              Decline
            </button>
          )}
        </div>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>
    );
  }

  const github = offer.onboarding?.github?.status ?? "not-started";
  return (
    <div className="nes-container is-dark is-rounded mt-4 text-left text-xs">
      <p className="text-green-400 mb-3">Welcome to MFC! Here's everything for day one:</p>
      <ul className="flex flex-col gap-2 mb-4">
        {Object.entries(offer.links ?? {})
          .filter(([, url]) => /^https?:\/\//.test(url))
          .map(([key, url]) => (
            <li key={key}>
              <a href={url} target="_blank" rel="noreferrer" className="text-prime underline">
                → {LINK_LABEL[key] ?? key}
              </a>
            </li>
          ))}
      </ul>
      {GITHUB_TEXT[github] && <p className="mb-2">{GITHUB_TEXT[github]}</p>}
      {github === "needs-github" && (
        <GithubConnect onConnected={() => act(() => retryGithubInvite(offer._id))} />
      )}
      {github === "failed" && (
        <button
          type="button"
          className="nes-btn text-[10px]"
          disabled={busy}
          onClick={() => act(() => retryGithubInvite(offer._id))}
        >
          Retry GitHub invite
        </button>
      )}
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  );
};

export default OfferCard;
