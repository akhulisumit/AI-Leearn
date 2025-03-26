import React from "react";
import { useLocation } from "wouter";

const Footer: React.FC = () => {
  const [, navigate] = useLocation();
  
  return (
    <footer className="bg-white border-t border-neutral-200 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <span className="font-medium text-neutral-800">LearnAI</span>
            <span className="mx-2 text-neutral-300">|</span>
            <span className="text-sm text-neutral-500">Powered by Gemini AI</span>
          </div>
          <div className="flex space-x-6">
            <button 
              onClick={() => navigate("/privacy")} 
              className="text-sm text-neutral-600 hover:text-primary transition-colors"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => navigate("/terms")} 
              className="text-sm text-neutral-600 hover:text-primary transition-colors"
            >
              Terms of Service
            </button>
            <button 
              onClick={() => navigate("/help")} 
              className="text-sm text-neutral-600 hover:text-primary transition-colors"
            >
              Help Center
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
