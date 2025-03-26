import React, { useEffect, useState, useRef } from "react";
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
import { Markdown } from "react-markdown/lib/react-markdown";

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
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
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
  
  // Initialize teaching mode or handle notes generation
  useEffect(() => {
    if (currentSession && knowledgeAreas.length > 0 && messages.length === 0 && !isLoading) {
      if (action === 'notes') {
        handleGenerateNotes();
      } else {
        // Get weak areas for focused teaching
        const weakAreas = knowledgeAreas
          .filter(area => area.proficiency < 70)
          .map(area => area.name);
        
        const weakAreaName = weakAreas.length > 0 ? weakAreas[0] : currentSession.topic;
        
        // Initialize with user query
        const initialQuery = `Hey buddy, I am stuck on ${weakAreaName}, can you teach me in an engaging way?`;
        setMessages([
          {
            role: 'user',
            content: initialQuery
          }
        ]);
        
        // Fetch initial teaching content
        fetchTeachingContent(initialQuery);
      }
    }
  }, [currentSession, knowledgeAreas, messages.length, isLoading, action]);
  
  const fetchTeachingContent = async (query: string) => {
    if (!currentSession) return;
    
    setIsLoading(true);
    try {
      const topicQuery = query.includes(currentSession.topic) 
        ? query 
        : `${query} (regarding ${currentSession.topic})`;
      
      const response = await getTeachingContent(currentSession.topic, topicQuery);
      
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
        setSelectedQuestion(null);
        setShowQuiz(true);
      }
    } catch (error) {
      console.error("Failed to get teaching content:", error);
      toast({
        title: "Error",
        description: "Failed to generate teaching content. Please try again.",
        variant: "destructive",
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
  
  const handleGenerateNotes = async () => {
    if (!currentSession) return;
    
    setGeneratingNotes(true);
    try {
      // Get weak areas for focused notes
      const weakAreas = knowledgeAreas
        .filter(area => area.proficiency < 70)
        .map(area => area.name);
      
      const response = await generateStudyNotes(currentSession.topic, weakAreas);
      setStudyNotes(response.notes);
    } catch (error) {
      console.error("Failed to generate study notes:", error);
      toast({
        title: "Error",
        description: "Failed to generate study notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingNotes(false);
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
                      {/* Use a markdown renderer here if needed */}
                      <div dangerouslySetInnerHTML={{ __html: studyNotes.replace(/\n/g, '<br>') }} />
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
                                  <div className="prose prose-sm">
                                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br>') }} />
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
