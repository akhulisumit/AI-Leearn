import React from "react";

interface WorkflowProgressProps {
  currentStage: "analysis" | "feedback" | "teaching" | "retest";
  sessionTime: number;
}

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ currentStage, sessionTime }) => {
  const stages = ["analysis", "feedback", "teaching", "retest"];
  const currentStageIndex = stages.indexOf(currentStage);
  
  // Calculate progress percentage
  const progressPercentage = Math.min(
    ((currentStageIndex + 1) / stages.length) * 100,
    100
  );
  
  // Format session time (seconds to MM:SS)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-xl text-neutral-900">Your Learning Path</h2>
        <div className="flex items-center text-neutral-600 text-sm">
          <svg 
            className="w-5 h-5 text-[#00BFA6] mr-1" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Session time: {formatTime(sessionTime)}</span>
        </div>
      </div>
      
      <div className="relative">
        <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-neutral-200">
          <div 
            style={{ width: `${progressPercentage}%` }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#00BFA6]"
          ></div>
        </div>
        <div className="flex justify-between text-xs text-neutral-500">
          {stages.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            
            let bgColor = "bg-neutral-300";
            if (isCompleted) bgColor = "bg-[#00BFA6]";
            if (isCurrent) bgColor = "bg-primary";
            
            let iconName = "";
            switch (stage) {
              case "analysis":
                iconName = isCompleted ? "check" : "quiz";
                break;
              case "feedback":
                iconName = isCompleted ? "check" : "assessment";
                break;
              case "teaching":
                iconName = isCompleted ? "check" : "school";
                break;
              case "retest":
                iconName = "psychology";
                break;
            }
            
            return (
              <div key={stage} className="flex flex-col items-center">
                <div className={`rounded-full ${bgColor} w-6 h-6 flex items-center justify-center text-white`}>
                  <svg 
                    className="w-4 h-4" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    {iconName === "check" && <polyline points="20 6 9 17 4 12"></polyline>}
                    {iconName === "quiz" && (
                      <>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </>
                    )}
                    {iconName === "assessment" && (
                      <>
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </>
                    )}
                    {iconName === "school" && (
                      <>
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
                      </>
                    )}
                    {iconName === "psychology" && (
                      <>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 18a6 6 0 0 0 0-12"></path>
                        <circle cx="12" cy="12" r="1"></circle>
                      </>
                    )}
                  </svg>
                </div>
                <span className={`mt-1 ${isCurrent ? "font-medium text-primary" : ""}`}>
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkflowProgress;
