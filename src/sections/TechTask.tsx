import { useEffect, useLayoutEffect, useState } from "react";
import TaskModal from "../components/TaskModal";
import secureLocalStorage from "react-secure-storage";
interface Task {
  label: string;
  description: string;
  title: string;
  resources?: string[];
  for: string;
}
interface Props {
  selectedSubDomain: string;
  setSelectedSubDomain: React.Dispatch<React.SetStateAction<string>>;
}
const TechTask = ({ selectedSubDomain, setSelectedSubDomain }: Props) => {
  const [filteredTasks, setFilteredTask] = useState<Task[]>([]);
  const [isSC, setIsSC] = useState(false);
  // const [showModal, setShowModal] = useState(false);
  // const [taskState, setTaskState] = useState("");
  useEffect(() => {
    // Based on the subdomain we are filtering the task
    const filteredTask = techTaskData.filter(
      (task) =>
        task.label === selectedSubDomain 
      //&&(isSC === true ? task.for === "senior" : task.for === "junior")
    );
    if (filteredTask) {
      setFilteredTask(filteredTask);
    }
  }, [selectedSubDomain, isSC]);

  // useEffect(() => {
  //   const isSenior = secureLocalStorage.getItem("isSC");
  //   setIsSC();
  // }, [isSC]);
  // useEffect(() => {
  //   const isSenior = secureLocalStorage.getItem("isSC");
  //   setIsSC();
  // }, [isSC]);

  useLayoutEffect(() => {
    const userDetailsstore = secureLocalStorage.getItem("userDetails");

    if (typeof userDetailsstore !== "string") {
      console.warn("userDetailsstore is not a string:", userDetailsstore);
      setIsSC(false); // Default to false if storage data is invalid
      return;
    }

    try {
      const userDetails = JSON.parse(userDetailsstore);
      // console.log("Parsed userDetails:", userDetails);

      if (typeof userDetails.data.isSC === "boolean") {
        setIsSC(userDetails.data.isSC);
        // console.log(userDetails.data.isSC);
      } else {
        console.warn("Invalid isSC value:", userDetails.isSC);
        setIsSC(false);
      }
    } catch (error) {
      console.error("Error parsing userDetails:", error);
      setIsSC(false);
    }
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const openTask = (task: Task) => {
    setActiveTask(task);
    setShowModal(true);
  };

  return (
    <div
      className={`w-full h-full overflow-y-hidden -task-container ${
        selectedSubDomain === "" ? "flex items-center" : ""
      }`}
    >
      {selectedSubDomain === "" && (
        <div className="flex justify-center flex-wrap w-full gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setSelectedSubDomain("frontend")}
            className="nes-btn is-error w-[47%] md:w-[30%] py-3 md:py-4 custom-nes-error text-xs hover:scale-105 transition-transform duration-200"
          >
            Frontend
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubDomain("backend")}
            className="nes-btn is-error w-[47%] md:w-[30%] py-3 md:py-4 custom-nes-error text-xs hover:scale-105 transition-transform duration-200"
          >
            Backend
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubDomain("cyber-sec")}
            className="nes-btn is-error w-[47%] md:w-[30%] py-3 md:py-4 custom-nes-error text-xs hover:scale-105 transition-transform duration-200"
          >
            Cyber Security
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubDomain("app")}
            className="nes-btn is-error w-[47%] md:w-[30%] py-3 md:py-4 custom-nes-error text-xs hover:scale-105 transition-transform duration-200"
          >
            App Dev
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubDomain("ml")}
            className="nes-btn is-error w-[47%] md:w-[30%] py-3 md:py-4 custom-nes-error text-xs hover:scale-105 transition-transform duration-200"
          >
            AI/ML
          </button>
          
          {!isSC && (
            <button
              type="button"
              onClick={() => setSelectedSubDomain("cp")}
              className="nes-btn is-error w-[47%] md:w-[30%] py-3 md:py-4 custom-nes-error text-xs hover:scale-105 transition-transform duration-200"
            >
              CP
            </button>
          )}
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
                key={`${task.label}-${task.title}-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => openTask(task)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && openTask(task)
                }
                className="task-item"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="task-item-header">
                  <span className="task-item-number">Task {index + 1}</span>
                  <span className="task-item-badge">{task.for === "senior" ? "SC" : "Jr"}</span>
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
      {showModal && activeTask && (
        <TaskModal task={activeTask} onClose={() => setShowModal(false)} />
      )}
      {/* {showModal && <Modal task={taskState} setShowModal={setShowModal} />} */}
    </div>
  );
};

export default TechTask;
// function Modal({
//   task,
//   setShowModal,
// }: {
//   task: string;
//   setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
// }) {
//   return (
//     <div
//       className="bg-black p-4 min-w-[40vw] min-h-[30vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 nes-container is-dark is-rounded --submit-container"
//       style={{ position: "absolute" }}
//     >
//       <form method="">
//         <p className="title text-xl">Submit Task</p>
//         <input
//           type="text"
//           id="dark_field"
//           className="nes-input is-dark"
//           placeholder="Github Repository Link"
//           name={`${task}-github`}
//           required
//         />
//         <input
//           type="text"
//           id="dark_field"
//           className="nes-input is-dark"
//           placeholder="Demo Link"
//           name={`${task}-demo`}
//         />
//         <menu className="dialog-menu mt-4">
//           <button
//             className="nes-btn"
//             type="button"
//             onClick={() => setShowModal(false)}
//           >
//             Cancel
//           </button>
//           <button className="nes-btn is-error" type="submit" onClick={() => {}}>
//             Submit
//           </button>
//         </menu>
//       </form>
//     </div>
//   );
// }
const techTaskData = [
  {
    label: "backend",
    title: "Candidate Recruitment API",
    description:
      "Build an API to manage a candidate's journey from application to hiring.\n\nBase Requirements : 1) Candidate Management: CRUD for candidates (Name, Email, Role, Resume text).\n2) Fixed Pipeline : Implement sequential stages: APPLIED ->SCREENING -> INTERVIEW -> HIRED/REJECTED.\n3) Basic RBAC: 'Candidate' role (view own status) and 'Recruiter' role (view all, move candidates to the next stage).\n\nDeliverables : 1) Documented Endpoints.\n2) Database schema diagram showing Candidate and User roles.",
    for: "junior",
  },
  {
    label: "backend",
    title: "Personal Locker API",
    description:
      "Create a secure backend for personal document storage. \n\nBase Requirements: 1) Authentication: Endpoints for user Registration and Login (JWT or Session-based).\n2) File Handling: Secure endpoints for uploading and downloading files (PDFs, Images), restricted to the file owner.\n3) Integrity: Error handling for empty files, unsupported formats, and unauthorized access attempts.\n4) Metadata: Store file name, upload timestamp, size, and User ID in the database.\n\nDeliverables: 1) Working API: Backend with local or cloud storage integration (e.g., AWS S3).\n2) README: Guide on handling multi-part form data and implementing secure authentication.",
    for: "junior",
  },
  {
    label: "backend",
    title: "Advanced Appointment and Scheduling System",
    description:
      "Advanced Appointment & Scheduling System An API for professionals (e.g., Doctors) to manage availability and bookings. \n\nBase Requirements: 1) Recurring Schedules: Logic to define availability every Monday-Friday in 30-minute blocks. \n2) Collision Engine: Prevent double-booking and block past-time reservations. \nBonus (OTP Auth): Implement Email/SMS OTP verification for login using a third-party service (e.g., Nodemailer/Twilio). \n\nDeliverables: 1) A robust 'Rescheduling' endpoint that handles availability checks atomically. \n2) Unified endpoint for a user's full schedule (bookings + available slots).",
    for: "senior",
  },
  {
    label: "backend",
    title: "Collaborative Group Study API",
    description:
      "A platform for hosts to create study sessions with real-time elements. \n\nBase Requirements: 1) Session Management: Host generates a unique code; others join via JWT-secured endpoints. \n2) Real-time Communication: Implement a chatting facility. \n3) Use WebSockets (Socket.io) for the chat and real-time 'Member Joined/Left' notifications. \n\nDeliverables: 1) WebSocket implementation for instant messaging. \n2) Logic for session persistence (what happens when the host leaves?).",
    for: "senior",
  },
  
  {
    label: "ml",
    title: "Rock Paper Scissors Image Classification",
    description:
      "Build a visual recognition system capable of identifying and classifying hand gestures representing Rock, Paper, and Scissors from image data.\n\n Base Requirements 1) Classification Engine: Develop a logic-based system to accurately differentiate between the three distinct hand gesture categories.\n2) Performance Validation: Test the system against unseen images to measure its reliability and error rate across all gesture classes.\n\n Deliverables: 1) Functional Classifier: A completed system ready to receive an image input and return the corresponding gesture label (Rock, Paper, or Scissors).\n2) Results Visualization: A detailed summary of the system’s performance, including success rates and a breakdown of classification accuracy for each gesture.",
    for: "junior",
    resources:["https://drive.google.com/file/d/1EyYTbAE4IQY4eA1dqOlnDCEUIdZsj0ey/view?usp=sharing"]
  },
  {
    label: "ml",
    title: "COVID-19 Sentiment Analysis Model",
    description:
      "Develop a system to analyze and categorize public sentiment expressed in pandemic-related text data to track social trends and concern levels.\n\n Base Requirements: 1) Text Preparation: Standardize raw text data from the dataset to ensure it is suitable for analysis across various sentiment categories.\n2) Sentiment Categorization: Establish a multi-class system to classify entries into distinct sentiment groups ( Positive, Neutral, Negative,).\n3) Evaluation Framework: Apply statistical measures to verify the accuracy and reliability of the classification results against known labels.\n\n Deliverables: 1) Analysis Pipeline: A complete workflow that takes raw COVID-19 text data and outputs structured sentiment insights.\n2) Data Insights Report: Visualizations showing the distribution of sentiments and identifying the most prominent themes within the dataset.",
    for: "senior",
    resources:["https://drive.google.com/file/d/14wabfRU3u41ir6TlFJvqiDDFETjg29Mv/view?usp=drive_link"]
  },
  
  {
    label: "frontend",
    title: "Event Registration Portal",
    description:
      "Develop a responsive, well-structured frontend portal for club event registrations that prioritizes clean UI and real-time user feedback.\n\n Base Requirements: 1) Core Structure: Include a header, navigation, footer, and dedicated sections for Event Details, Registration, and Contact Info.\n2) Design Consistency: Create a layout and flow inspired by the official club website while maintaining a beginner-friendly UI.\n3) Form Validation: Implement real-time input validation for all mandatory registration fields to ensure data integrity.\n\nDeliverables: 1) Responsive Frontend: A fully functional, mobile-friendly portal reflecting the club's branding.\n 2) Interactive Form: A validated registration form with success feedback (e.g., confirmation popup or message). \n3) Enhanced UX Features: Implementation of a form progress indicator or a dynamic event countdown timer.",
    for: "junior",
  },
  {
    label: "frontend",
    title: "Movie Search Engine (API Integration)",
    description:
      "Develop a responsive web application that fetches and displays movie data from the OMDB API using an intuitive, minimal interface.\n\n Base Requirements: 1) API Integration: Connect to the OMDB API to fetch real-time data (Title, Year, Poster, Rating) based on user queries.\n 2) Search Functionality: Implement a search bar with robust error handling for empty or invalid results.\n 3) Responsive UI: Create a clean, organized layout that adapts to different screen sizes and ensures smooth user interaction.\n\n Deliverables: 1) Functional Search Engine: A frontend application capable of dynamic content rendering from external API calls.\n2) Loading & Error States: Implementation of UI feedback such as loading indicators and user-friendly error messages.\n3) Enhanced Filtering: (Optional) Logic to filter results based on specific criteria, such as minimum IMDB ratings.",
    for: "junior",
  },
  {
    label: "frontend",
    title: "Gamified Application Journey",
    description:
      "Transform a standard four-step application process into an interactive, level-up experience using XP rewards, animated progress tracking, and persistent badge unlocks.\n\n Base Requirements: 1) Gamified Workflow: Implement a four-stage flow (Profile, Tasks, Submission, Status) guided by an animated horizontal stepper and a circular progress visual (SVG/Canvas).\n2) XP Engine: Build logic to award specific XP (20 for Profile, 10 per Task, 30 for Submission) and trigger badge unlocks at 50 and 100 XP thresholds.\n3) Data Persistence: Use localStorage to ensure XP totals, step progress, and earned badges remain saved across browser sessions.\n\n Deliverables 1) Interactive Dashboard: A frontend featuring smooth gradient transitions, a live XP counter, and an animated badge gallery.\n2) XP & Milestone Logic: A functional state management system that handles point accumulation and unlocks visual rewards.\n3) Enhanced UX Components: Implementation of 'pop-in' badge animations and optional features like a confetti burst or a social media 'snapshot' share tool.",
    for: "senior",
  },
  {
    label: "frontend",
    title: "The Minimalist Pokedex",
    description:
      "Build a premium, Apple-inspired web portal that integrates the PokeAPI to display Pokémon data through a lens of minimalism, high-quality typography, and fluid user interactions.\n\n Base Requirements: 1) Apple Aesthetic: Utilize 'San Francisco' style typography, generous white space, and a product-centric layout (e.g., clean lines and subtle gradients).\n2) Search & Fetch: Implement a search bar that queries the https://pokeapi.co/ database and renders data dynamically without full-page reloads.\n3) Interactive Stats: Display a 'Product Card' for each Pokémon featuring its official artwork, ID, and a beautifully visualized base stats section (HP, Attack, Defense, etc.).\n4) Robust Error Handling: Design graceful states for 'Not Found' queries or network issues using elegant UI notifications rather than browser alerts.\n\n Deliverables: 1) Refined Pokémon Interface: A single-page application (SPA) featuring a sleek search experience and a responsive detail view.\n2) Dynamic UI Components: Polished data visualization for stats and an 'Apple-style' loading state (e.g., a skeleton screen or a minimalist spinner).\n3) Creative Bonus Features: Implementation of a 'Shiny' toggle to switch sprite assets and a dynamic theme engine that adapts the site’s accent colors to the Pokémon’s type (e.g., Fire = Soft Red).",
    for: "senior",
  },
  {
    label: "cyber-sec",
    title: "Security Challenge: CTF",
    description:
      "Join the picoCTF classroom using the classroom code CRiNMALYr. Visit https://picoctf.org/, sign in, navigate to 'Classrooms' → 'Join Classroom', and enter this code to access and solve the assigned challenges.",
    for: "junior",
    resources:["https://play.picoctf.org/classrooms"]
  },
  {
    label: "cyber-sec",
    title: "Firewall Simulator",
    description:
      "Create a simple firewall simulator.\n\nBase Requirements: 1) Block traffic from specific IPs.\n2) Block/allow specific ports.\n3) Block traffic based on protocol or traffic type.\n4) Maintain a log of all blocked/allowed actions.\n5) Provide a CLI or UI interface to configure rules.\n\nDeliverables: 1) A working script/tool.\n2) A short explanation of firewall logic.\n3) Example test cases",
    for: "junior",
  },
  {
    label: "cyber-sec",
    title: "Web Pentesting Automation Tool",
    description:
      "Develop an automated web penetration testing tool to identify SQL Injection, XSS, insecure cookie configurations, and missing security headers within a fictional corporate web environment.\n\nBase Requirements: 1) Vulnerability Detection: Automated scanning for SQLi endpoints and XSS reflection points.\n2) Configuration Audit: Validation of cookie attributes (HttpOnly, Secure, SameSite) and critical security headers (CSP, HSTS, X-Frame-Options).\n3) Targeting Logic: Ability to crawl or receive specific endpoints from the provided fictional company scenario.\n\nDeliverables: 1) Source Code: A functional automation tool (Python, Go, or similar) implementing the detection logic.\n2) Documentation: A brief 'How-to' guide for running the tool against the target scenario.\n3) Pentest Report (Bonus): A structured summary detailing discovered vulnerabilities, severity levels, technical evidence, and remediation steps.",
    for: "senior",
  },
  {
    label: "cyber-sec",
    title: "SSH Honeypot and Telemetry Processing",
    description:
      "Build an SSH honeypot to capture attacker interactions and analyze session telemetry for behavioral patterns and bot detection.\n\nBase Requirements: 1) Logging: Record attacker IPs, timestamps, session summaries, and every executed command.\n2) Payload Capture: Extract attempted URLs and malicious scripts/commands.\n3) Telemetry Analysis: Produce insights on IP frequency, common commands, and distinguish between automated bots and human actors.\n\nDeliverables: 1) Source Code: A functional SSH listener and log processing system.\n2) Telemetry Report: A summary of malicious behavior patterns and IP analysis.\n3) Visualizations (Bonus): Charts or graphs representing attack trends and threat metrics.",
    for: "senior",
  },
  {
    label: "app",
    title: "Student Club Enrollment App",
    description:
      "Build a student-centric application to streamline club discovery and membership enrollment through a searchable directory and a validated application workflow.\n\n Base Requirements: 1) Dynamic Club Directory: Create a searchable list or grid view of active clubs, featuring logos, descriptions, and category-based filtering (e.g., Tech, Arts, Sports).\n2) Standardized Enrollment Form: An integrated data-entry interface to capture Student ID, Name, validated Email, and a brief Interest Statement.\n3) User Feedback System: Implementation of visual confirmation via success screens or toast notifications to acknowledge successful submissions.\n\n Deliverables: 1) Functional Application UI: A responsive mobile app optimized for browsing, searching, and seamless form entry.\n2) Enrollment Data Pipeline: A logic-driven backend or state management system to collect, validate, and store student application data.\n3) Extended Management Features (Optional): Implementation of a protected Admin Dashboard for club leads, unique QR code generation for student IDs, or a push notification system for application status updates. ",
    for: "junior",
  },
  {
    label: "app",
    title: "Growth and Mentorship Tracker App",
    description:
      "Develop a growth-centric tracking system that monitors skill acquisition and mentorship logic instead of simple attendance.\n\nBase Requirements: 1) Skill Management: Mechanism to add members and assign skills categorized by proficiency (Beginner, Intermediate, Advanced).\n2) Mentorship Logic: A system to pair members with mentors to guide their development path.\n3) Progress Visualization: A dynamic 'status ladder' or progress graph to track and display member growth over time.\n\nDeliverables: 1) Core Application: A functional platform (Web or Mobile) implementing member management and skill leveling.\n2) Visualization Module: A dashboard featuring the progress graph or status ladder UI.\n3) Workflow Documentation: A brief explanation of the 'learning vs. attendance' logic and how the growth system scales.",
    for: "senior",
  }

,
  {
    label: "cp",
    title: "HackerRank Competition",
    description:
      "A HackerRank Competition will be held from 9PM on 7th February to 9PM on 8th February. In the task submission page for the Competitive Programming round, please attach your name and a link to your Hackerrank profile. You may add other Competitive Programming User IDs as well.",
    for: "junior",
    resources:["https://www.hackerrank.com/foxs-algo-1770343833"]
  },

  {
    label: "cp",
    title:
      "HackerRank Competition",
    description:
      "A HackerRank Competition will be held from 9PM on 7th February to 9PM on 8th February. In the task submission page for the Competitive Programming round, please attach your name and a link to your Hackerrank profile. You may add other Competitive Programming User IDs as well.",
    for: "senior",
    resources:["https://www.hackerrank.com/foxs-algo-1770343833"]
  },
]