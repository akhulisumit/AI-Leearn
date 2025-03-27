import React, { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WorkflowProgress from "@/components/WorkflowProgress";
import SidePanel from "@/components/SidePanel";
import { useSession } from "@/contexts/SessionContext";
import { apiRequest } from "@/lib/queryClient";
import { evaluateTest } from "@/lib/gemini";
import { useToast } from "@/hooks/use-toast";

const Feedback: React.FC = () => {
  const [, params] = useRoute("/feedback");
  const [, navigate] = useLocation();
  const sessionId = params ? parseInt(new URLSearchParams(window.location.search).get("sessionId") || "0") : 0;
  
  const { 
    currentSession, 
    loadSession, 
    knowledgeAreas, 
    questions, 
    answers,
    sessionTime,
    updateSessionStage
  } = useSession();
  const { toast } = useToast();
  
  const [answeredQuestions, setAnsweredQuestions] = useState<any[]>([]);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [strengthsAndWeaknesses, setStrengthsAndWeaknesses] = useState<{
    strengths: string[];
    weaknesses: string[];
    recommendedAreas?: string[];
  }>({
    strengths: [],
    weaknesses: [],
    recommendedAreas: []
  });
  
  // Load session data
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);
  
  // Process answered questions
  useEffect(() => {
    if (questions.length > 0 && answers.size > 0) {
      const answered = questions
        .filter(q => answers.has(q.id))
        .map(q => ({
          ...q,
          answer: answers.get(q.id)
        }));
      
      setAnsweredQuestions(answered);
      
      // Calculate overall score
      let totalCorrectness = 0;
      const allStrengths: string[] = [];
      const allWeaknesses: string[] = [];
      
      answered.forEach(q => {
        const answer = answers.get(q.id);
        if (answer && typeof answer.evaluation === 'object' && answer.evaluation) {
          const evaluation = answer.evaluation as { 
            correctness: number; 
            feedback: string;
            strengths?: string[];
            weaknesses?: string[];
          };
          
          totalCorrectness += evaluation.correctness;
          
          // Collect strengths and weaknesses
          if (evaluation.strengths && Array.isArray(evaluation.strengths)) {
            allStrengths.push(...evaluation.strengths);
          }
          if (evaluation.weaknesses && Array.isArray(evaluation.weaknesses)) {
            allWeaknesses.push(...evaluation.weaknesses);
          }
        }
      });
      
      const avgScore = answered.length > 0 ? totalCorrectness / answered.length : 0;
      setOverallScore(Math.round(avgScore));
      
      // Deduplicate strengths and weaknesses
      const uniqueStrengths = Array.from(new Set(allStrengths));
      const uniqueWeaknesses = Array.from(new Set(allWeaknesses));
      
      setStrengthsAndWeaknesses({
        strengths: uniqueStrengths.slice(0, 5), // Limit to top 5
        weaknesses: uniqueWeaknesses.slice(0, 5) // Limit to top 5
      });
    }
  }, [questions, answers]);
  
  const handleModeChange = async (mode: "analysis" | "feedback" | "teaching" | "retest") => {
    if (mode === "teaching") {
      await updateSessionStage("teaching");
      navigate(`/teaching?sessionId=${sessionId}`);
    } else if (mode === "analysis") {
      navigate(`/analysis?sessionId=${sessionId}`);
    }
  };
  
  const handleGenerateNotes = () => {
    navigate(`/teaching?sessionId=${sessionId}&action=notes`);
  };
  
  const handleGenerateQuestions = () => {
    navigate(`/analysis?sessionId=${sessionId}`);
  };
  
  const handleGetAIEvaluation = async () => {
    if (!sessionId || isEvaluating) return;
    
    setIsEvaluating(true);
    toast({
      title: "Evaluating your test...",
      description: "Please wait while our AI analyzes your answers.",
      duration: 3000,
    });
    
    try {
      const result = await evaluateTest(sessionId);
      
      if (result) {
        // Update the score and feedback with the AI evaluation
        setOverallScore(result.totalScore);
        setStrengthsAndWeaknesses({
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          recommendedAreas: result.recommendedAreas || []
        });
        
        toast({
          title: "Evaluation complete!",
          description: "Your test has been analyzed by our AI.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Failed to get AI evaluation:", error);
      toast({
        title: "Evaluation failed",
        description: "We couldn't complete the AI evaluation. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsEvaluating(false);
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score < 40) return "text-[#F44336]";
    if (score < 70) return "text-[#FFC107]";
    return "text-[#4CAF50]";
  };
  
  const getScoreBackground = (score: number) => {
    if (score < 40) return "bg-[#F44336]";
    if (score < 70) return "bg-[#FFC107]";
    return "bg-[#4CAF50]";
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
            currentStage="feedback" 
            sessionTime={sessionTime}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <SidePanel 
                topic={currentSession.topic}
                mode="feedback"
                knowledgeAreas={knowledgeAreas}
                onModeChange={handleModeChange}
                onGenerateNotes={handleGenerateNotes}
                onGenerateQuestions={handleGenerateQuestions}
              />
            </div>
            
            <div className="lg:col-span-3">
              <Card className="shadow-md mb-6">
                <CardHeader>
                  <CardTitle>Knowledge Assessment Results</CardTitle>
                  <CardDescription>
                    Your performance on {currentSession.topic}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="text-center p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Overall Score</h3>
                    <div className="flex items-center justify-center">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center ${getScoreBackground(overallScore)} bg-opacity-10 border-4 ${getScoreBackground(overallScore)} border-opacity-50`}>
                        <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}%</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleGetAIEvaluation}
                      disabled={isEvaluating}
                      variant="outline"
                      className="mt-4"
                    >
                      {isEvaluating ? "Evaluating..." : "Get AI-Powered Evaluation"}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3">Strengths</h3>
                      {strengthsAndWeaknesses.strengths.length > 0 ? (
                        <ul className="space-y-2">
                          {strengthsAndWeaknesses.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start">
                              <svg 
                                className="w-5 h-5 text-[#4CAF50] mr-2 flex-shrink-0 mt-0.5" 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-neutral-500">No strengths identified yet.</p>
                      )}
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3">Areas to Improve</h3>
                      {strengthsAndWeaknesses.weaknesses.length > 0 ? (
                        <ul className="space-y-2">
                          {strengthsAndWeaknesses.weaknesses.map((weakness, index) => (
                            <li key={index} className="flex items-start">
                              <svg 
                                className="w-5 h-5 text-[#F44336] mr-2 flex-shrink-0 mt-0.5" 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-neutral-500">No areas for improvement identified yet.</p>
                      )}
                    </div>
                  </div>
                  
                  {strengthsAndWeaknesses.recommendedAreas && strengthsAndWeaknesses.recommendedAreas.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3">Recommended Focus Areas</h3>
                      <ul className="space-y-2">
                        {strengthsAndWeaknesses.recommendedAreas.map((area, index) => (
                          <li key={index} className="flex items-start">
                            <svg 
                              className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="16"></line>
                              <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {knowledgeAreas.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3">Knowledge Areas</h3>
                      <div className="space-y-4">
                        {knowledgeAreas.map((area) => (
                          <div key={area.id}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{area.name}</span>
                              <span className={`text-sm ${getScoreColor(area.proficiency)}`}>
                                {area.proficiency}%
                              </span>
                            </div>
                            <Progress value={area.proficiency} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter>
                  <div className="w-full flex flex-col sm:flex-row justify-between gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => handleModeChange("analysis")}
                    >
                      Take More Questions
                    </Button>
                    <Button 
                      className="bg-primary hover:bg-primary-dark"
                      onClick={() => handleModeChange("teaching")}
                    >
                      Start Teaching Mode
                    </Button>
                  </div>
                </CardFooter>
              </Card>
              
              {answeredQuestions.length > 0 && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle>Detailed Feedback</CardTitle>
                    <CardDescription>
                      Review your answers and AI feedback
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-6">
                      {answeredQuestions.map((qa) => {
                        const answer = answers.get(qa.id);
                        if (!answer) return null;
                        
                        // Type assertion for evaluation
                        const evaluation = typeof answer.evaluation === 'object' && answer.evaluation ? 
                          (answer.evaluation as { 
                            correctness: number; 
                            feedback: string;
                            strengths?: string[];
                            weaknesses?: string[];
                          }) : 
                          { correctness: 0, feedback: "No evaluation available" };
                        
                        return (
                          <div key={qa.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">{qa.question}</h3>
                              <span className={`text-sm ${getDifficultyColor(qa.difficulty)}`}>
                                {qa.difficulty}
                              </span>
                            </div>
                            
                            <div className="bg-neutral-50 p-3 rounded-md mb-3">
                              <h4 className="text-sm font-medium mb-1">Your Answer:</h4>
                              <p className="text-neutral-700">{answer.userAnswer}</p>
                            </div>
                            
                            <div className="mb-3">
                              <div className="flex justify-between mb-1">
                                <h4 className="text-sm font-medium">Correctness:</h4>
                                <span className={`text-sm ${getScoreColor(evaluation.correctness)}`}>
                                  {evaluation.correctness}%
                                </span>
                              </div>
                              <Progress value={evaluation.correctness} className="h-2" />
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-1">Feedback:</h4>
                              <p className="text-neutral-700 text-sm">{evaluation.feedback}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Feedback;
