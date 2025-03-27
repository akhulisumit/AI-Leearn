import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WorkflowProgress from "@/components/WorkflowProgress";
import SidePanel from "@/components/SidePanel";
import { useSession } from "@/contexts/SessionContext";
import { generateQuestions, submitAnswer, submitAllAnswers } from "@/lib/gemini";
import { Question, KnowledgeArea } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const Analysis: React.FC = () => {
  const [, params] = useRoute("/analysis");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const sessionId = params ? parseInt(new URLSearchParams(window.location.search).get("sessionId") || "0") : 0;
  
  const { 
    currentSession, 
    loadSession, 
    knowledgeAreas, 
    questions, 
    answers,
    sessionTime,
    startTimer,
    updateSessionStage
  } = useSession();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Load session data
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId).then(() => {
        startTimer();
      });
    }
  }, [sessionId, loadSession, startTimer]);
  
  // Generate questions if there are none
  useEffect(() => {
    if (currentSession && questions.length === 0 && !isGeneratingQuestions) {
      generateInitialQuestions();
    }
  }, [currentSession, questions]);
  
  // Set the first unanswered question as current
  useEffect(() => {
    if (questions.length > 0 && !currentQuestion) {
      const unansweredQuestion = questions.find(q => !answers.has(q.id));
      setCurrentQuestion(unansweredQuestion || questions[0]);
    }
  }, [questions, answers, currentQuestion]);
  
  const generateInitialQuestions = async () => {
    if (!currentSession) return;
    
    setIsGeneratingQuestions(true);
    try {
      await generateQuestions(currentSession.topic, currentSession.id);
      await loadSession(currentSession.id);
    } catch (error) {
      console.error("Failed to generate questions:", error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };
  
  const handleAnswerChange = (questionId: number, answer: string) => {
    setUserAnswers(prev => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionId, answer);
      return newAnswers;
    });
  };
  
  // Pre-fetch the next question for faster transitions
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null);
  
  // Find and prepare the next question in advance
  useEffect(() => {
    if (questions.length > 0 && currentQuestion) {
      const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
      const unansweredQuestions = questions.filter(q => !answers.has(q.id) && q.id !== currentQuestion.id);
      
      if (unansweredQuestions.length > 0) {
        // Prioritize the next sequential question if it's unanswered
        const nextSequentialQuestion = currentIndex < questions.length - 1 ? questions[currentIndex + 1] : null;
        if (nextSequentialQuestion && !answers.has(nextSequentialQuestion.id)) {
          setNextQuestion(nextSequentialQuestion);
        } else {
          // Otherwise use any unanswered question
          setNextQuestion(unansweredQuestions[0]);
        }
      } else {
        setNextQuestion(null);
      }
    }
  }, [questions, currentQuestion, answers]);

  const [testComplete, setTestComplete] = useState(false);
  
  // Store answers temporarily in local state
  const [pendingAnswers, setPendingAnswers] = useState<Map<number, string>>(new Map());
  
  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    
    const answer = userAnswers.get(currentQuestion.id);
    if (!answer) {
      toast({
        title: "Warning",
        description: "Please provide an answer before submitting.",
        variant: "default",
      });
      return;
    }
    
    setIsEvaluating(true);
    
    try {
      // Just store the answer locally, don't send to server yet
      setPendingAnswers(prev => {
        const newPending = new Map(prev);
        newPending.set(currentQuestion.id, answer);
        return newPending;
      });
      
      // If we have a pre-fetched next question, immediately show it
      // This makes the UI feel more responsive
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
        setNextQuestion(null);
      }
      
      // Check if all questions are answered locally
      const allQuestionsAnswered = questions.every(q => 
        userAnswers.has(q.id)
      );
      
      if (allQuestionsAnswered || (nextQuestion === null && currentQuestion.id === questions[questions.length - 1].id)) {
        // Show a message that we're submitting all answers
        toast({
          title: "Test Complete!",
          description: "Submitting and evaluating all your answers...",
          duration: 3000,
        });
        
        setTestComplete(true);
        
        // Submit all answers to the server
        const answerSubmissionPromises = Array.from(pendingAnswers.entries()).map(([questionId, userAnswer]) => 
          submitAnswer(questionId, userAnswer, true)
        );
        
        // Wait for all submissions to complete
        await Promise.all(answerSubmissionPromises);
        
        // Now evaluate all answers at once
        await submitAllAnswers(sessionId);
        
        // Refresh session data
        await loadSession(sessionId);
        
        // Create knowledge areas based on question topics if not already existing
        if (knowledgeAreas.length === 0) {
          const topics = new Set<string>();
          questions.forEach(q => {
            // Extract topic from question (this is a simple approach - in a real app we might use NLP)
            const questionText = q.question.toLowerCase();
            
            // Try to extract topic from question based on keywords
            const possibleTopics = [
              "algebra", "calculus", "statistics", 
              "quantum", "physics", "mechanics", 
              "algorithms", "data structures", "machine learning"
            ];
            
            for (const topic of possibleTopics) {
              if (questionText.includes(topic)) {
                topics.add(topic.charAt(0).toUpperCase() + topic.slice(1));
                break;
              }
            }
          });
          
          // If no specific topics found, use a generic one
          if (topics.size === 0 && currentSession) {
            topics.add(currentSession.topic);
          }
          
          // Create knowledge areas
          const createAreaPromises = Array.from(topics).map(topic => 
            apiRequest("POST", "/api/knowledge-areas", {
              sessionId,
              name: topic,
              proficiency: Math.floor(Math.random() * 100) // Mock for demo, would be calculated based on answer correctness
            }).catch(error => console.error(`Failed to create knowledge area for ${topic}:`, error))
          );
          
          // Wait for all knowledge areas to be created
          await Promise.allSettled(createAreaPromises);
        }
        
        // Update session stage and redirect to feedback
        await updateSessionStage("feedback");
        navigate(`/feedback?sessionId=${sessionId}`);
      } else if (!nextQuestion) {
        // Only if we didn't already set the next question, find one now
        const nextUnansweredQuestion = questions.find(q => !userAnswers.has(q.id));
        if (nextUnansweredQuestion) {
          setCurrentQuestion(nextUnansweredQuestion);
        }
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };
  
  const handleModeChange = async (mode: "analysis" | "feedback" | "teaching" | "retest") => {
    if (mode === "teaching") {
      await updateSessionStage("teaching");
      navigate(`/teaching?sessionId=${sessionId}`);
    }
  };
  
  const handleGenerateNotes = () => {
    // Navigate to teaching mode where notes can be generated
    navigate(`/teaching?sessionId=${sessionId}&action=notes`);
  };
  
  const handleGenerateQuestions = () => {
    // Generate more questions for the same topic
    generateInitialQuestions();
  };
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-[#4CAF50]';
      case 'medium': return 'text-[#FFC107]';
      case 'hard': return 'text-[#F44336]';
      default: return 'text-neutral-700';
    }
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
            currentStage="analysis" 
            sessionTime={sessionTime}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <SidePanel 
                topic={currentSession.topic}
                mode="analysis"
                knowledgeAreas={knowledgeAreas}
                onModeChange={handleModeChange}
                onGenerateNotes={handleGenerateNotes}
                onGenerateQuestions={handleGenerateQuestions}
              />
            </div>
            
            <div className="lg:col-span-3">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Self-Analysis: Test Your Knowledge</CardTitle>
                  <CardDescription>
                    Answer the questions below to assess your understanding of {currentSession.topic}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {isGeneratingQuestions ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-24 w-full" />
                      <div className="flex justify-end">
                        <Skeleton className="h-10 w-24" />
                      </div>
                    </div>
                  ) : currentQuestion ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Question {questions.indexOf(currentQuestion) + 1} of {questions.length}</h3>
                        <span className={`text-sm font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
                          {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
                        </span>
                      </div>
                      
                      <div className="p-4 bg-neutral-50 rounded-md">
                        <p className="text-neutral-800">{currentQuestion.question}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Your Answer:</label>
                        <Textarea 
                          placeholder="Type your answer here..."
                          value={userAnswers.get(currentQuestion.id) || ""}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          rows={6}
                          disabled={isEvaluating}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          className="bg-primary hover:bg-primary-dark"
                          onClick={handleSubmitAnswer}
                          disabled={isEvaluating}
                        >
                          {isEvaluating ? (
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
                              Evaluating...
                            </>
                          ) : "Submit Answer"}
                        </Button>
                      </div>
                      
                      <div className="text-sm text-neutral-500 mt-2">
                        <p>Question Progress: {questions.filter(q => answers.has(q.id)).length} of {questions.length} completed</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-neutral-600">No questions available. Please try generating questions.</p>
                      <Button 
                        className="mt-4 bg-primary hover:bg-primary-dark"
                        onClick={generateInitialQuestions}
                      >
                        Generate Questions
                      </Button>
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

export default Analysis;
