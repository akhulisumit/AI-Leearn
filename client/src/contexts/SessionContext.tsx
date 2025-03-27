import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, KnowledgeArea, Question, Answer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface SessionContextType {
  currentSession: Session | null;
  knowledgeAreas: KnowledgeArea[];
  questions: Question[];
  answers: Map<number, Answer>;
  sessionTime: number;
  
  // Session methods
  createSession: (userId: number, topic: string) => Promise<Session>;
  loadSession: (sessionId: number) => Promise<void>;
  updateSessionStage: (stage: string) => Promise<void>;
  
  // Knowledge area methods
  updateKnowledgeArea: (id: number, proficiency: number) => Promise<void>;
  
  // Utility methods
  resetSession: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [knowledgeAreas, setKnowledgeAreas] = useState<KnowledgeArea[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [sessionTime, setSessionTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);
  
  const createSession = async (userId: number, topic: string): Promise<Session> => {
    const response = await apiRequest("POST", "/api/sessions", {
      userId,
      topic,
      stage: "analysis"
    });
    
    const newSession = await response.json();
    setCurrentSession(newSession);
    return newSession;
  };
  
  const loadSession = async (sessionId: number): Promise<void> => {
    try {
      // Use Promise.all to make the requests concurrently for faster loading
      const [sessionResponse, questionsResponse] = await Promise.all([
        // Load session with knowledge areas
        apiRequest("GET", `/api/sessions/${sessionId}`),
        
        // Load questions with answers
        apiRequest("GET", `/api/sessions/${sessionId}/questions-with-answers`)
      ]);
      
      // Process the session data
      const sessionData = await sessionResponse.json();
      setCurrentSession(sessionData);
      setKnowledgeAreas(sessionData.knowledgeAreas || []);
      
      // Process the questions and answers data
      const { questionsWithAnswers } = await questionsResponse.json();
      
      // Extract questions and answers
      const loadedQuestions: Question[] = [];
      const loadedAnswers = new Map<number, Answer>();
      
      if (Array.isArray(questionsWithAnswers)) {
        questionsWithAnswers.forEach((qa: any) => {
          const { answer, ...question } = qa;
          loadedQuestions.push(question);
          
          if (answer) {
            loadedAnswers.set(question.id, answer);
          }
        });
      }
      
      setQuestions(loadedQuestions);
      setAnswers(loadedAnswers);
      
    } catch (error) {
      console.error("Error loading session:", error);
      throw error; // Propagate the error to allow proper handling in components
    }
  };
  
  const updateSessionStage = async (stage: string): Promise<void> => {
    if (!currentSession) return;
    
    try {
      const response = await apiRequest("PATCH", `/api/sessions/${currentSession.id}/stage`, { stage });
      const updatedSession = await response.json();
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error("Error updating session stage:", error);
    }
  };
  
  const updateKnowledgeArea = async (id: number, proficiency: number): Promise<void> => {
    try {
      const response = await apiRequest("PATCH", `/api/knowledge-areas/${id}`, { proficiency });
      const updatedArea = await response.json();
      
      setKnowledgeAreas(prev => 
        prev.map(area => area.id === id ? updatedArea : area)
      );
    } catch (error) {
      console.error("Error updating knowledge area:", error);
    }
  };
  
  const resetSession = () => {
    setCurrentSession(null);
    setKnowledgeAreas([]);
    setQuestions([]);
    setAnswers(new Map());
    resetTimer();
  };
  
  const startTimer = () => {
    if (timerInterval) return;
    
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    
    setTimerInterval(interval);
  };
  
  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };
  
  const resetTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setSessionTime(0);
  };
  
  const value = {
    currentSession,
    knowledgeAreas,
    questions,
    answers,
    sessionTime,
    createSession,
    loadSession,
    updateSessionStage,
    updateKnowledgeArea,
    resetSession,
    startTimer,
    pauseTimer,
    resetTimer
  };
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
