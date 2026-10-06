import { useEffect, useState } from "react";
import { getGithubConfig, getGithubMe } from "../api/candidate";

const STATE_KEY = "mfc_github_oauth_state";
const RETURN_KEY = "mfc_github_return_to";
export const JUST_CONNECTED_KEY = "mfc_github_just_connected";

// Starts GitHub's OAuth web flow. The random `state` is checked on the way back
// in /github/callback so another site can't link its account to this applicant.
export const startGithubSignIn = (clientId: string) => {
  const state = crypto.getRandomValues(new Uint32Array(4)).join("-");
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(RETURN_KEY, window.location.pathname);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/github/callback`,
    scope: "read:user",
    state,
    allow_signup: "true",
  });
  window.location.assign(`https://github.com/login/oauth/authorize?${params}`);
};

export const consumeGithubState = (state: string | null) => {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return Boolean(state && expected && state === expected);
};

export const consumeReturnPath = () => {
  const to = sessionStorage.getItem(RETURN_KEY) || "/dashboard";
  sessionStorage.removeItem(RETURN_KEY);
  return to.startsWith("/") ? to : "/dashboard";
};

interface Props {
  onConnected?: () => void;
  compact?: boolean;
}

const GithubConnect = ({ onConnected, compact }: Props) => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [me, setMe] = useState<{ connected: boolean; login: string | null; avatarUrl: string | null } | null>(null);

  useEffect(() => {
    getGithubConfig()
      .then((c) => setClientId(c.enabled ? c.clientId : null))
      .catch(() => setClientId(null));
    getGithubMe()
      .then((m) => {
        setMe(m);
        if (m.connected && sessionStorage.getItem(JUST_CONNECTED_KEY)) {
          sessionStorage.removeItem(JUST_CONNECTED_KEY);
          onConnected?.();
        }
      })
      .catch(() => setMe(null));
  }, [onConnected]);

  if (me?.connected) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        {me.avatarUrl && <img src={me.avatarUrl} alt="" className="w-5 h-5" />}
        GitHub: <span className="text-prime">@{me.login}</span>
      </span>
    );
  }
  if (!clientId) return null;

  return (
    <button
      type="button"
      className={`nes-btn ${compact ? "text-[10px]" : "text-xs"}`}
      onClick={() => startGithubSignIn(clientId)}
    >
      Sign in with GitHub
    </button>
  );
};

export default GithubConnect;
