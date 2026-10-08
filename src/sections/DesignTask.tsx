import { useEffect, useLayoutEffect, useState } from "react";
import TaskModal from "../components/TaskModal";
import secureLocalStorage from "react-secure-storage";
import { getTasksForDomain, DBTask } from "../api/candidate";

interface Task {
  label: string;
  description: string;
  title: string;
  resources: string[];
  for: string;
}

interface Props {
  selectedSubDomain: string;
  setSelectedSubDomain: React.Dispatch<React.SetStateAction<string>>;
}

const DesignTask = ({ selectedSubDomain, setSelectedSubDomain }: Props) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subdomains, setSubdomains] = useState<{ value: string; label: string }[]>([]);
  const [filteredTasks, setFilteredTask] = useState<Task[]>([]);
  const [isSC, setIsSC] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tasks from database/API
  useEffect(() => {
    let isMounted = true;
    getTasksForDomain("design")
      .then((res) => {
        if (!isMounted) return;
        if (res && res.questions) {
          const mappedTasks: Task[] = res.questions.map((q: DBTask) => ({
            label: q.subdomain || "",
            title: q.title || q.prompt.substring(0, 40) + "...",
            description: q.prompt,
            for: q.audience === "senior" ? "senior" : q.audience === "all" ? "common" : "junior",
            resources: Array.isArray(q.resources) ? q.resources.filter(Boolean) : [],
          }));
          setTasks(mappedTasks);
          if (res.subdomains && res.subdomains.length > 0) {
            setSubdomains(res.subdomains);
          }
        }
      })
      .catch((err) => console.error("Error loading design tasks:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const filteredTask = tasks.filter((task) => task.label === selectedSubDomain);
    setFilteredTask(filteredTask);
  }, [selectedSubDomain, tasks, isSC]);

  useLayoutEffect(() => {
    try {
      const userDetailsstore = secureLocalStorage.getItem("userDetails");
      if (!userDetailsstore || typeof userDetailsstore !== "string") {
        setIsSC(false);
        return;
      }
      const userDetails = JSON.parse(userDetailsstore);
      setIsSC(Boolean(userDetails?.data?.isSC));
    } catch {
      setIsSC(false);
    }
  }, []);

  const availableSubdomains =
    subdomains.length > 0
      ? subdomains
      : [
          { value: "poster", label: "Graphic Design" },
          { value: "ui", label: "UI/UX" },
          { value: "video", label: "Video Editing" },
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
      className={`w-full h-full overflow-y-hidden -task-container ${
        selectedSubDomain === "" ? "flex items-center" : ""
      }`}
    >
      {selectedSubDomain === "" && (
        <div className="flex justify-center flex-wrap w-full gap-2 md:gap-3">
          {availableSubdomains.map((sd) => (
            <button
              key={sd.value}
              type="button"
              onClick={() => setSelectedSubDomain(sd.value)}
              className="nes-btn is-error w-[47%] md:w-[22%] py-3 md:py-4 custom-nes-error text-xs hover:scale-105 transition-transform duration-200"
            >
              {sd.label}
            </button>
          ))}
        </div>
      )}

      {selectedSubDomain !== "" && (
        <div className="task-list-container">
          <div className="task-list-header">
            <span className="task-list-count">{filteredTasks.length} Tasks Available</span>
          </div>
          <div className="task-list-grid">
            {filteredTasks.map((task, index) => (
              <div
                className="task-item"
                key={index}
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
                {task.resources && task.resources.length > 0 && (
                  <div className="task-item-resources">
                    📎 {task.resources.length} resource{task.resources.length > 1 ? "s" : ""}
                  </div>
                )}
                <div className="task-item-footer">
                  <span className="task-item-cta">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showModal && activeTask && (
        <TaskModal
          task={activeTask}
          onClose={() => {
            setShowModal(false);
            setActiveTask(null);
          }}
        />
      )}
    </div>
  );
};

export default DesignTask;
