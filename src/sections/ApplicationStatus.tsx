import ApplicationTracker from "../components/tracker/ApplicationTracker";

// Status tab: the per-domain tracker replaces the old one-line status messages.
const ApplicationStatus = () => (
  <div className="w-full profile py-6">
    <div className="w-full bg-black h-full nes-container is-rounded is-dark status-box overflow-auto">
      <div className="h-auto mb-4 text-lg">Your application</div>
      <ApplicationTracker />
    </div>
  </div>
);

export default ApplicationStatus;
