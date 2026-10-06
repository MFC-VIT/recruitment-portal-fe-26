import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { connectGithub } from "../api/candidate";
import { consumeGithubState, consumeReturnPath, JUST_CONNECTED_KEY } from "../components/GithubConnect";

// Landing page for GitHub's OAuth redirect: verify state, hand the code to the
// backend, go back to where the applicant started.
const GithubCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connecting your GitHub account...");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double effect would reuse a one-time code
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || !consumeGithubState(params.get("state"))) {
      setMessage("That sign-in link was invalid or expired. Please try again from the dashboard.");
      return;
    }
    connectGithub(code)
      .then(() => {
        sessionStorage.setItem(JUST_CONNECTED_KEY, "1");
        navigate(consumeReturnPath(), { replace: true });
      })
      .catch((err) => {
        const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
        setMessage(msg || "Could not connect GitHub. Please try again.");
      });
  }, [navigate]);

  return (
    <div className="w-full h-screen flex items-center justify-center p-4">
      <div className="nes-container is-dark is-rounded text-xs text-center max-w-md">{message}</div>
    </div>
  );
};

export default GithubCallback;
