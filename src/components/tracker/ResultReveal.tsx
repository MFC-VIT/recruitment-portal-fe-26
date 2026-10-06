import { useEffect, useState } from "react";
import { fireFireworks, fireSuccessConfetti } from "../../hooks/useConfetti";
import { Domain } from "../../api/candidate";

const DOMAIN_NAME: Record<Domain, string> = {
  tech: "Tech",
  design: "Design",
  management: "Management",
};

interface Props {
  userId: string;
  domain: Domain;
  result: "selected" | "rejected" | null;
}

const seenKey = (userId: string, domain: Domain, result: string) =>
  `mfc_reveal_${userId}_${domain}_${result}`;

// The first time a final result shows up for a domain, play it as a moment:
// a tap-to-reveal card, fireworks for a selection, a kind note otherwise.
// Remembered per browser so it only plays once.
const ResultReveal = ({ userId, domain, result }: Props) => {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!result) return;
    try {
      if (!localStorage.getItem(seenKey(userId, domain, result))) setOpen(true);
    } catch {
      /* storage blocked: skip the ceremony */
    }
  }, [userId, domain, result]);

  if (!open || !result) return null;

  const reveal = () => {
    setRevealed(true);
    try {
      localStorage.setItem(seenKey(userId, domain, result), String(Date.now()));
    } catch {
      /* ignore */
    }
    if (result === "selected") {
      fireSuccessConfetti();
      setTimeout(fireFireworks, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="nes-container is-dark is-rounded max-w-md w-full text-center text-xs md:text-sm">
        {!revealed ? (
          <>
            <p className="text-prime mb-6">Your {DOMAIN_NAME[domain]} result is in.</p>
            <button type="button" className="nes-btn is-warning" onClick={reveal}>
              Reveal
            </button>
          </>
        ) : result === "selected" ? (
          <>
            <p className="text-green-400 text-base mb-4">You're in! 🦊</p>
            <p className="mb-6">
              Welcome to Mozilla Firefox Club, VIT ({DOMAIN_NAME[domain]}). Check your offer below to get
              onboarded.
            </p>
            <button type="button" className="nes-btn is-success" onClick={() => setOpen(false)}>
              Let's go
            </button>
          </>
        ) : (
          <>
            <p className="mb-4">Not this time for {DOMAIN_NAME[domain]}.</p>
            <p className="mb-6 text-gray-300">
              Thank you for the effort you put in. Our events are open to everyone, and we'd love to see you
              apply again next cycle.
            </p>
            <button type="button" className="nes-btn" onClick={() => setOpen(false)}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultReveal;
