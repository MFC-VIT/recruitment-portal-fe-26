import { useEffect, useState } from "react";
import TaskModal from "../components/TaskModal";
import { getTasksForDomain, DBTask } from "../api/candidate";

interface Task {
  domain: string;
  subdomain: string;
  title: string;
  for: string;
  question: string;
}

interface Props {
  selectedSubDomain: string;
  setSelectedSubDomain: React.Dispatch<React.SetStateAction<string>>;
}

const ManagementTask = ({ selectedSubDomain, setSelectedSubDomain }: Props) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subdomains, setSubdomains] = useState<{ value: string; label: string }[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tasks from database/API
  useEffect(() => {
    let isMounted = true;
    getTasksForDomain("management")
      .then((res) => {
        if (!isMounted) return;
        if (res && res.questions) {
          const mappedTasks: Task[] = res.questions.map((q: DBTask) => ({
            domain: "management",
            subdomain: q.subdomainLabel || q.subdomain || "",
            title: q.title || q.prompt.substring(0, 30) + "...",
            for: q.audience === "senior" ? "senior" : q.audience === "all" ? "common" : "junior",
            question: q.prompt,
          }));
          setTasks(mappedTasks);
          if (res.subdomains && res.subdomains.length > 0) {
            setSubdomains(res.subdomains);
          }
        }
      })
      .catch((err) => console.error("Error loading management tasks:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSubDomain) return setFilteredTasks([]);

    const filtered = tasks.filter(
      (task) => task.subdomain.toLowerCase() === selectedSubDomain.toLowerCase()
    );

    setFilteredTasks(filtered);
  }, [selectedSubDomain, tasks]);

  const availableSubdomains =
    subdomains.length > 0
      ? subdomains.map((sd) => ({ key: sd.label, label: sd.label }))
      : [
          { key: "Outreach", label: "Outreach" },
          { key: "General Ops", label: "General Ops" },
          { key: "Publicity", label: "Publicity" },
          { key: "Events", label: "Events" },
        ];

  if (loading && tasks.length === 0) {
    return (
      <div className="w-full flex justify-center py-8">
        <p className="text-xs text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full overflow-y-hidden ${
        selectedSubDomain === "" ? "flex items-center" : ""
      }`}
    >
      {/* Subdomain buttons */}
      {selectedSubDomain === "" && (
        <div className="flex justify-center flex-wrap w-full gap-2 md:gap-3">
          {availableSubdomains.map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedSubDomain(item.key)}
              className="nes-btn is-error w-[47%] md:w-[22%] py-3 md:py-4 custom-nes-error text-xs hover:scale-105 transition-transform duration-200"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Task cards */}
      {selectedSubDomain !== "" && (
        <div className="task-list-container">
          <div className="task-list-header">
            <span className="task-list-count">{filteredTasks.length} Tasks Available</span>
          </div>

          <div className="task-list-grid">
            {filteredTasks.map((task, index) => (
              <div
                key={`mgmt-task-${index}`}
                className="task-item"
                onClick={() => {
                  setActiveTask(task);
                  setShowModal(true);
                }}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="task-item-header">
                  <span className="task-item-number">Task {index + 1}</span>
                  <span className="task-item-badge">{task.for === "senior" ? "SC" : task.for === "common" ? "All" : "Jr"}</span>
                </div>

                <h3 className="task-item-title">{task.title}</h3>

                <div className="task-item-footer">
                  <span className="task-item-cta">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && activeTask && (
        <TaskModal
          task={{
            title: activeTask.title,
            description: activeTask.question,
            resources: [],
            label: activeTask.subdomain,
            for: activeTask.for,
          }}
          onClose={() => {
            setShowModal(false);
            setActiveTask(null);
          }}
        />
      )}
    </div>
  );
};

export default ManagementTask;
