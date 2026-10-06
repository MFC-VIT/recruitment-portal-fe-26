import { useNavigate } from "react-router-dom";
import { Stage } from "../../api/candidate";

const ICON: Record<Stage["state"], string> = {
  done: "✓",
  current: "●",
  upcoming: "○",
  failed: "✗",
};

const COLOUR: Record<Stage["state"], string> = {
  done: "text-green-400 border-green-400",
  current: "text-prime border-[#fc7a00] animate-pulse",
  upcoming: "text-gray-500 border-gray-600",
  failed: "text-red-400 border-red-400",
};

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

// Vertical parcel-tracker: each stage with its state, time, and an action where
// the candidate has something to do (book an interview slot).
const StageList = ({ stages }: { stages: Stage[] }) => {
  const navigate = useNavigate();
  return (
    <ol className="relative text-left text-xs md:text-sm">
      {stages.map((s, i) => (
        <li key={s.key} className="flex gap-3 pb-5 relative">
          {i < stages.length - 1 && (
            <span
              className={`absolute left-[11px] top-6 bottom-0 w-[2px] ${
                s.state === "done" ? "bg-green-400" : "bg-gray-700"
              }`}
              aria-hidden
            />
          )}
          <span
            className={`w-6 h-6 shrink-0 border-2 flex items-center justify-center text-[10px] bg-black ${COLOUR[s.state]}`}
            aria-label={s.state}
          >
            {ICON[s.state]}
          </span>
          <div className="flex-1">
            <div className={s.state === "upcoming" ? "text-gray-500" : "text-white"}>{s.label}</div>
            {when(s.at) && <div className="text-gray-400 text-[10px] mt-1">{when(s.at)}</div>}
            {s.key === "interview" && s.detail === "book-a-slot" && (
              <button
                type="button"
                className="nes-btn is-warning text-[10px] mt-2"
                onClick={() => navigate("/meeting")}
              >
                Book your interview slot
              </button>
            )}
            {s.key === "interview" && s.detail === "booked" && s.state === "current" && (
              <button
                type="button"
                className="nes-btn text-[10px] mt-2"
                onClick={() => navigate("/meeting")}
              >
                View / reschedule
              </button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default StageList;
