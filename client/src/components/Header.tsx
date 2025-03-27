import React from "react";
import { Link, useLocation } from "wouter";
import { useSession } from "@/contexts/SessionContext";
import StudyBreakModal from "@/components/StudyBreakModal";

const Header: React.FC = () => {
  const [location] = useLocation();
  const { currentSession, sessionTime } = useSession();

  // Determine if we're in a valid study session that can use study breaks
  const isInStudySession = Boolean(
    currentSession && 
    (location.startsWith('/analysis') || location.startsWith('/teaching') || location.startsWith('/feedback'))
  );

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <svg 
              className="w-8 h-8 text-primary mr-2" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"></path>
              <path d="M12 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
              <path d="M12 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
              <path d="M18 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
              <path d="M6 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
              <path d="M14 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
              <path d="M10 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
            </svg>
            <h1 className="font-semibold text-2xl text-primary-dark">LearnAI</h1>
          </div>
        </Link>
        <div className="flex items-center space-x-4">
          {isInStudySession && currentSession && (
            <div className="mr-2">
              <StudyBreakModal 
                sessionTime={sessionTime} 
                topic={currentSession.topic} 
              />
            </div>
          )}
          <Link href="/history">
            <button className="hidden md:flex items-center text-neutral-700 hover:text-primary-dark transition-colors">
              <svg 
                className="w-5 h-5 mr-1" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 8v4l3 3"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
              <span>History</span>
            </button>
          </Link>
          <Link href="/progress">
            <button className="hidden md:flex items-center text-neutral-700 hover:text-primary-dark transition-colors">
              <svg 
                className="w-5 h-5 mr-1" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Progress</span>
            </button>
          </Link>
          <Link href="/profile">
            <button className="flex items-center text-neutral-700 hover:text-primary-dark transition-colors">
              <svg 
                className="w-5 h-5 mr-1" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span className="hidden md:inline">Profile</span>
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
