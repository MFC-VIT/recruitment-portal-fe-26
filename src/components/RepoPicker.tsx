import { useEffect, useMemo, useState } from "react";
import { getGithubMe, getMyRepos, Repo } from "../api/candidate";
import GithubConnect from "./GithubConnect";

// "Import from GitHub": pick one of your repos instead of pasting links.
const RepoPicker = ({ onPick }: { onPick: (repo: Repo) => void }) => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getGithubMe()
      .then((m) => setConnected(m.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (!open || repos) return;
    getMyRepos()
      .then(setRepos)
      .catch(() => setError("Couldn't load your repositories."));
  }, [open, repos]);

  const shown = useMemo(
    () =>
      (repos ?? []).filter((r) =>
        `${r.name} ${r.description ?? ""} ${r.language ?? ""}`.toLowerCase().includes(query.toLowerCase())
      ),
    [repos, query]
  );

  if (connected === null) return null;
  if (!connected) return <GithubConnect compact onConnected={() => setConnected(true)} />;

  return (
    <>
      <button type="button" className="nes-btn text-[10px]" onClick={() => setOpen(true)}>
        Import from GitHub
      </button>
      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="nes-container is-dark is-rounded w-full max-w-lg max-h-[80vh] flex flex-col text-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-prime">Your repositories</span>
              <button type="button" className="nes-btn is-error text-[10px]" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <input
              className="nes-input is-dark text-xs mb-3"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="overflow-y-auto flex-1">
              {error && <p className="text-red-400">{error}</p>}
              {!repos && !error && <p>Loading...</p>}
              {repos && shown.length === 0 && <p className="text-gray-400">No matching public repos.</p>}
              {shown.map((r) => (
                <button
                  key={r.fullName}
                  type="button"
                  className="w-full text-left p-2 mb-2 border border-gray-700 hover:border-[#fc7a00]"
                  onClick={() => {
                    onPick(r);
                    setOpen(false);
                  }}
                >
                  <div className="text-white">
                    {r.name} {r.fork && <span className="text-gray-500">(fork)</span>}
                  </div>
                  {r.description && <div className="text-gray-400 text-[10px] mt-1">{r.description}</div>}
                  <div className="text-gray-500 text-[10px] mt-1">
                    {[r.language, `★ ${r.stars}`, new Date(r.pushedAt).toLocaleDateString()].filter(Boolean).join(" · ")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RepoPicker;
