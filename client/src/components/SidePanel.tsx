import React from "react";
import { KnowledgeArea } from "@shared/schema";
import { useSession } from "@/contexts/SessionContext";

interface SidePanelProps {
  topic: string;
  mode: "analysis" | "feedback" | "teaching" | "retest";
  knowledgeAreas: KnowledgeArea[];
  onModeChange: (mode: "analysis" | "feedback" | "teaching" | "retest") => void;
  onGenerateNotes: () => void;
  onGenerateQuestions: () => void;
  onChangeTopic?: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({
  topic,
  mode,
  knowledgeAreas,
  onModeChange,
  onGenerateNotes,
  onGenerateQuestions,
  onChangeTopic
}) => {
  // Get proficiency color based on score
  const getProficiencyColor = (proficiency: number) => {
    if (proficiency < 40) return "bg-[#F44336]"; // error
    if (proficiency < 70) return "bg-[#FFC107]"; // warning
    return "bg-[#4CAF50]"; // success
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <h3 className="font-semibold text-lg mb-4 text-neutral-800">Current Session</h3>
      
      <div className="mb-6">
        <p className="text-sm text-neutral-600 mb-1">Selected Topic:</p>
        <button 
          className="w-full flex items-center bg-neutral-100 rounded-lg p-2 hover:bg-neutral-200 transition-colors"
          onClick={onChangeTopic}
        >
          <svg 
            className="w-5 h-5 text-primary mr-2" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
          </svg>
          <span className="font-medium text-left flex-1">{topic}</span>
          <svg 
            className="w-4 h-4 text-neutral-400" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </button>
      </div>
      
      <div className="mb-6">
        <p className="text-sm text-neutral-600 mb-1">Mode:</p>
        <div className="grid grid-cols-2 gap-2">
          <button 
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 
              ${mode === "analysis" && window.location.pathname === "/analysis"
                ? "border-primary bg-blue-50" 
                : "border-transparent bg-neutral-100 hover:border-primary-light"} 
              transition-colors`}
            onClick={() => onModeChange("analysis")}
          >
            <svg 
              className={`w-5 h-5 ${mode === "analysis" && window.location.pathname === "/analysis" ? "text-primary" : "text-neutral-700"}`} 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span className={`text-xs mt-1 ${mode === "analysis" && window.location.pathname === "/analysis" ? "text-primary font-medium" : "text-neutral-700"}`}>
              Analysis
            </span>
          </button>
          <button 
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 
              ${mode === "teaching" && window.location.pathname === "/teaching"
                ? "border-primary bg-blue-50" 
                : "border-transparent bg-neutral-100 hover:border-primary-light"} 
              transition-colors`}
            onClick={() => onModeChange("teaching")}
          >
            <svg 
              className={`w-5 h-5 ${mode === "teaching" && window.location.pathname === "/teaching" ? "text-primary" : "text-neutral-700"}`} 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
            </svg>
            <span className={`text-xs mt-1 ${mode === "teaching" && window.location.pathname === "/teaching" ? "text-primary font-medium" : "text-neutral-700"}`}>
              Teaching
            </span>
          </button>
        </div>
      </div>
      
      {knowledgeAreas.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-neutral-600 mb-2">Knowledge Areas:</p>
          <div className="space-y-2">
            {knowledgeAreas.map((area) => (
              <div key={area.id} className="flex items-center justify-between text-sm">
                <span>{area.name}</span>
                <div className="w-24 bg-neutral-200 rounded-full h-2">
                  <div 
                    className={`${getProficiencyColor(area.proficiency)} rounded-full h-2`} 
                    style={{ width: `${area.proficiency}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <p className="text-sm text-neutral-600 mb-2">Actions:</p>
        <div className="space-y-2">
          <button 
            className="w-full flex items-center justify-between p-2 text-left rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
            onClick={onGenerateNotes}
          >
            <div className="flex items-center">
              <svg 
                className="w-5 h-5 text-neutral-600 mr-2" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span className="text-sm">Generate Notes</span>
            </div>
            <svg 
              className="w-5 h-5 text-neutral-400" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <button 
            className="w-full flex items-center justify-between p-2 text-left rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
            onClick={onGenerateQuestions}
          >
            <div className="flex items-center">
              <svg 
                className="w-5 h-5 text-neutral-600 mr-2" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span className="text-sm">More Questions</span>
            </div>
            <svg 
              className="w-5 h-5 text-neutral-400" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <button 
            className={`w-full flex items-center justify-between p-2 text-left rounded-lg border 
              ${mode === "teaching" && window.location.pathname === "/teaching"
                ? "border-primary bg-blue-50" 
                : "border-neutral-200 hover:bg-neutral-50"} 
              transition-colors`}
            onClick={() => onModeChange("teaching")}
          >
            <div className="flex items-center">
              <svg 
                className={`w-5 h-5 ${mode === "teaching" && window.location.pathname === "/teaching" ? "text-primary" : "text-neutral-600"} mr-2`} 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 18a6 6 0 0 0 0-12"></path>
                <circle cx="12" cy="12" r="1"></circle>
              </svg>
              <span className={`text-sm ${mode === "teaching" && window.location.pathname === "/teaching" ? "font-medium text-primary" : ""}`}>
                Teaching Mode
              </span>
            </div>
            <svg 
              className={`w-5 h-5 ${mode === "teaching" && window.location.pathname === "/teaching" ? "text-primary" : "text-neutral-400"}`} 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
