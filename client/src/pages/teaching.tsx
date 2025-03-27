import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WorkflowProgress from "@/components/WorkflowProgress";
import SidePanel from "@/components/SidePanel";
import { useSession } from "@/contexts/SessionContext";
import { getTeachingContent, generateStudyNotes } from "@/lib/gemini";
import { useToast } from "@/hooks/use-toast";
import { KnowledgeArea } from "@shared/schema";
import ReactMarkdown from "react-markdown";

// Define markdown components outside of the component render function
const markdownComponentsNotes = {
  p: ({node, ...props}: any) => <p className="my-2" {...props} />,
  h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-6 my-3" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 my-3" {...props} />,
  li: ({node, ...props}: any) => <li className="my-1" {...props} />,
  code: ({node, ...props}: any) => <code className="bg-neutral-100 px-1 py-0.5 rounded text-sm" {...props} />,
  pre: ({node, ...props}: any) => <pre className="bg-neutral-100 p-3 rounded my-3 overflow-x-auto" {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-primary/30 pl-4 italic my-3" {...props} />,
};

const markdownComponentsMessage = {
  p: ({node, ...props}: any) => <p className="my-2" {...props} />,
  h1: ({node, ...props}: any) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-base font-bold mt-2 mb-1" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-5 my-2" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 my-2" {...props} />,
  li: ({node, ...props}: any) => <li className="my-1" {...props} />,
  code: ({node, ...props}: any) => <code className="bg-neutral-100 px-1 py-0.5 rounded text-sm" {...props} />,
  pre: ({node, ...props}: any) => <pre className="bg-neutral-100 p-2 rounded my-2 overflow-x-auto text-sm" {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-primary/30 pl-3 italic my-2" {...props} />,
};

interface AIMessage {
  role: 'user' | 'ai';
  content: string;
  followUpQuestions?: string[];
}

const Teaching: React.FC = () => {
  const [, params] = useRoute("/teaching");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const sessionId = params ? parseInt(new URLSearchParams(window.location.search).get("sessionId") || "0") : 0;
  const action = params ? new URLSearchParams(window.location.search).get("action") || null : null;
  
  const { 
    currentSession, 
    loadSession, 
    knowledgeAreas, 
    sessionTime,
    updateSessionStage
  } = useSession();
  
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [studyNotes, setStudyNotes] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Load session data
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);
  
  // Use a ref to track if we've already initiated actions
  const actionsInitiated = useRef(false);
  
  // Initialize teaching mode or handle notes generation
  useEffect(() => {
    if (currentSession && !actionsInitiated.current && !isLoading) {
      // Mark as initiated to prevent further calls
      actionsInitiated.current = true;
      
      if (action === 'notes') {
        // Handle notes generation
        setTimeout(() => {
          handleGenerateNotes();
        }, 100);
      } else if (messages.length === 0) {
        // Handle teaching content
        const initialQuery = `Hey buddy, I am stuck on ${currentSession.topic}, can you teach me in an engaging way?`;
        
        // Set the initial message immediately
        setMessages([
          {
            role: 'user',
            content: initialQuery
          }
        ]);
        
        // Use setTimeout to make sure UI updates before the API call
        setTimeout(() => {
          fetchTeachingContent(initialQuery);
        }, 200);
      }
    }
    
    // Reset the initiated flag when key dependencies change
    return () => {
      if (!currentSession) {
        actionsInitiated.current = false;
      }
    };
  }, [currentSession, isLoading, action]);
  
  const fetchTeachingContent = async (query: string) => {
    if (!currentSession) return;
    
    setIsLoading(true);
    toast({
      title: "Generating teaching content...",
      description: "Please wait while we prepare your learning materials.",
      duration: 3000,
    });
    
    try {
      const topicQuery = query.includes(currentSession.topic) 
        ? query 
        : `${query} (regarding ${currentSession.topic})`;
      
      const response = await getTeachingContent(currentSession.topic, topicQuery);
      
      if (!response || !response.text) {
        throw new Error("Received empty response from teaching API");
      }
      
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: response.text,
          followUpQuestions: response.followUpQuestions
        }
      ]);
      
      // Show quiz after the AI response 
      if (response.followUpQuestions && response.followUpQuestions.length > 0) {
        setSelectedQuestion("");
        setShowQuiz(true);
      }
      
      // Success toast notification
      toast({
        title: "Content ready!",
        description: "Your learning content has been generated successfully.",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to get teaching content:", error);
      
      // Add a fallback AI message if the API call fails
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: "I'm sorry, I had trouble generating content about this topic. Please try rephrasing your question or try a different topic.",
          followUpQuestions: ["Could you try asking a more specific question?"]
        }
      ]);
      
      toast({
        title: "Error",
        description: "Failed to generate teaching content. Please try again with a different query.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!currentQuery.trim() || isLoading) return;
    
    // Add user message to chat
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: currentQuery
      }
    ]);
    
    const query = currentQuery;
    setCurrentQuery("");
    await fetchTeachingContent(query);
  };
  
  // Use a ref to track if notes generation is in progress to prevent multiple calls
  const notesGenerationInProgress = useRef(false);
  
  const handleGenerateNotes = async () => {
    // Prevent multiple calls or generating notes if they already exist
    if (!currentSession || studyNotes || notesGenerationInProgress.current || generatingNotes) {
      return;
    }
    
    // Set both state and ref to indicate generation is in progress
    setGeneratingNotes(true);
    notesGenerationInProgress.current = true;
    
    toast({
      title: "Generating study notes...",
      description: "Please wait while we prepare your personalized notes.",
      duration: 3000,
    });
    
    try {
      // Get weak areas from knowledge areas with low proficiency 
      const weakAreas = knowledgeAreas
        .filter(area => area.proficiency < 50)
        .map(area => area.name);
      
      // Generate notes with the main topic and optional weak areas
      const response = await generateStudyNotes(
        currentSession.topic,
        weakAreas.length > 0 ? weakAreas : undefined
      );
      
      if (response && response.notes) {
        setStudyNotes(response.notes);
        toast({
          title: "Notes ready!",
          description: "Your study notes have been generated successfully.",
          duration: 2000,
        });
      } else {
        throw new Error("Failed to generate notes - empty response");
      }
    } catch (error) {
      console.error("Failed to generate study notes:", error);
      toast({
        title: "Error",
        description: "Failed to generate study notes. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Set a fallback note so the UI doesn't break
      setStudyNotes(`# Study Notes for ${currentSession.topic}\n\nI'm sorry, but I'm having trouble generating detailed study notes right now. Please try again in a moment.`);
    } finally {
      setGeneratingNotes(false);
      // Don't reset the ref - notes have been generated or failed to generate
      // We only want to reset this if the user actively restarts the experience
    }
  };
  
  const handleModeChange = async (mode: "analysis" | "feedback" | "teaching" | "retest") => {
    if (mode === "analysis") {
      await updateSessionStage("analysis");
      navigate(`/analysis?sessionId=${sessionId}`);
    } else if (mode === "feedback") {
      await updateSessionStage("feedback");
      navigate(`/feedback?sessionId=${sessionId}`);
    } else if (mode === "retest") {
      await updateSessionStage("retest");
      navigate(`/analysis?sessionId=${sessionId}`);
    }
  };
  
  const handleQuizAnswer = () => {
    setShowQuiz(false);
    toast({
      title: "Answer Reviewed",
      description: "Great job! Let's continue with our learning session.",
    });
  };
  
  const handleRestart = () => {
    setMessages([]);
    setStudyNotes(null);
    // Reset all the relevant flags to allow for new content
    actionsInitiated.current = false;
    notesGenerationInProgress.current = false;
    
    // Small delay to ensure state is updated before potentially triggering new fetches
    setTimeout(() => {
      if (currentSession && messages.length === 0 && !studyNotes) {
        // Trigger the initial message for teaching mode
        const initialQuery = `Let's learn about ${currentSession.topic}. Can you introduce this topic?`;
        setMessages([
          {
            role: 'user',
            content: initialQuery
          }
        ]);
        
        fetchTeachingContent(initialQuery);
      }
    }, 300);
  };
  
  if (!currentSession) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-center items-center h-[60vh]">
              <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <WorkflowProgress 
            currentStage="teaching" 
            sessionTime={sessionTime}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <SidePanel 
                topic={currentSession.topic}
                mode="teaching"
                knowledgeAreas={knowledgeAreas}
                onModeChange={handleModeChange}
                onGenerateNotes={handleGenerateNotes}
                onGenerateQuestions={() => handleModeChange("analysis")}
              />
            </div>
            
            <div className="lg:col-span-3">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {studyNotes ? "Study Notes: " : "Teaching Mode: "}
                      <span className="text-primary">{currentSession.topic}</span>
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      onClick={handleRestart}
                      className="flex items-center text-neutral-600 hover:text-primary transition-colors text-sm"
                    >
                      <svg 
                        className="w-4 h-4 mr-1" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M3 2v6h6"></path>
                        <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
                      </svg>
                      Restart
                    </Button>
                  </div>
                  <CardDescription>
                    {studyNotes 
                      ? "Personalized notes created for your learning" 
                      : "Interactive learning with AI-powered explanations"
                    }
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {studyNotes ? (
                    // Study Notes View
                    <div className="prose prose-sm max-w-none">
                      {generatingNotes ? (
                        <div className="space-y-4">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-6 w-1/2" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ) : (
                        <ReactMarkdown
                          components={markdownComponentsNotes}
                        >
                          {studyNotes || ""}
                        </ReactMarkdown>
                      )}
                    </div>
                  ) : (
                    // Teaching Mode View
                    <div>
                      {messages.length > 0 && (
                        <div className="mb-6 space-y-4">
                          {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
                              {msg.role === 'ai' && (
                                <div className="flex-shrink-0 mr-3">
                                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                                    <svg 
                                      className="w-6 h-6" 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <path d="M12 16v-4"></path>
                                      <path d="M12 8h.01"></path>
                                    </svg>
                                  </div>
                                </div>
                              )}
                              
                              {msg.role === 'user' ? (
                                <div className="bg-neutral-100 p-4 rounded-lg text-neutral-600 max-w-[80%]">
                                  <p>{msg.content}</p>
                                </div>
                              ) : (
                                <div className="space-y-3 max-w-[90%]">
                                  <div className="prose prose-sm p-4 rounded-lg bg-primary/5 border border-primary/10">
                                    {isLoading && index === messages.length - 1 ? (
                                      <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                      </div>
                                    ) : (
                                      <ReactMarkdown
                                        components={markdownComponentsMessage}
                                      >
                                        {msg.content}
                                      </ReactMarkdown>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                      
                      {showQuiz && messages.length > 0 && messages[messages.length - 1].followUpQuestions && (
                        <div className="border-t border-neutral-200 pt-4 mt-6">
                          <h3 className="font-medium mb-3">Let's check your understanding:</h3>
                          <div className="p-4 rounded-lg bg-primary bg-opacity-5 border border-primary-light">
                            <p className="mb-4">{messages[messages.length - 1].followUpQuestions?.[0]}</p>
                            
                            <RadioGroup value={selectedQuestion} onValueChange={setSelectedQuestion} className="space-y-2 mt-4">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="option1" id="option1" />
                                <Label htmlFor="option1">It remains in its current state</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="option2" id="option2" />
                                <Label htmlFor="option2">It changes to the opposite state</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="option3" id="option3" />
                                <Label htmlFor="option3">It enters a superposition state</Label>
                              </div>
                            </RadioGroup>
                            
                            <Button 
                              className="mt-4 bg-primary text-white"
                              onClick={handleQuizAnswer}
                              disabled={!selectedQuestion}
                            >
                              Check Answer
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* User Chat Interface */}
                      <div className="mt-8">
                        <div className="border rounded-lg">
                          <div className="flex items-center p-2 border-b">
                            <button className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors">
                              <svg 
                                className="w-5 h-5" 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                              </svg>
                            </button>
                            <button className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors">
                              <svg 
                                className="w-5 h-5" 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                              </svg>
                            </button>
                            <button className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors">
                              <svg 
                                className="w-5 h-5" 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                              </svg>
                            </button>
                            <button className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors">
                              <svg 
                                className="w-5 h-5" 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                                <line x1="9" y1="20" x2="15" y2="20"></line>
                                <line x1="12" y1="4" x2="12" y2="20"></line>
                              </svg>
                            </button>
                          </div>
                          <Textarea 
                            className="w-full p-3 outline-none resize-none border-none"
                            rows={3} 
                            placeholder="Ask a follow-up question or tell me which part you'd like me to explain more..." 
                            value={currentQuery}
                            onChange={(e) => setCurrentQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="flex justify-between mt-3">
                          <button className="flex items-center text-neutral-600 hover:text-primary-dark transition-colors">
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
                              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                              <line x1="12" y1="19" x2="12" y2="22"></line>
                            </svg>
                            <span>Voice</span>
                          </button>
                          <div>
                            <Button 
                              variant="outline"
                              className="mr-2"
                              onClick={handleGenerateNotes}
                            >
                              Generate Notes
                            </Button>
                            <Button 
                              className="bg-primary text-white"
                              onClick={handleSendMessage}
                              disabled={!currentQuery.trim() || isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <svg 
                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    fill="none" 
                                    viewBox="0 0 24 24"
                                  >
                                    <circle 
                                      className="opacity-25" 
                                      cx="12" 
                                      cy="12" 
                                      r="10" 
                                      stroke="currentColor" 
                                      strokeWidth="4"
                                    ></circle>
                                    <path 
                                      className="opacity-75" 
                                      fill="currentColor" 
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : "Send"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Teaching;
