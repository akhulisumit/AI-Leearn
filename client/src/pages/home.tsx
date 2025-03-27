import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TopicSelectionModal from "@/components/TopicSelectionModal";
import { useSession } from "@/contexts/SessionContext";

// Import the types needed for education and difficulty levels
type EducationLevel = "Class 1-5" | "Class 6-8" | "Class 9-10" | "Class 11-12" | "Bachelors" | "Masters" | "PhD";
type DifficultyLevel = "Beginner" | "Standard" | "Advanced";

const Home: React.FC = () => {
  const [, navigate] = useLocation();
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const { createSession } = useSession();
  
  const handleStartSession = async (
    topic: string, 
    educationLevel: EducationLevel, 
    difficultyLevel: DifficultyLevel
  ) => {
    try {
      // For this demo, we'll use a fixed user ID of 1
      const userId = 1;
      
      // Create the session with the topic, education level, and difficulty level
      // For now, we'll store the education and difficulty levels in the topic string
      // Format: "TOPIC [Education: LEVEL, Difficulty: LEVEL]"
      const formattedTopic = `${topic} [Education: ${educationLevel}, Difficulty: ${difficultyLevel}]`;
      
      const session = await createSession(userId, formattedTopic);
      navigate(`/analysis?sessionId=${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Learn Smarter with 
              <span className="bg-gradient-to-r from-primary to-[#00BFA6] bg-clip-text text-transparent ml-2">
                AI-Powered Education
              </span>
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-8">
              Experience the "Analyze, Learn, and Repeat" approach for personalized learning that adapts to your strengths and weaknesses.
            </p>
            
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary-dark text-white text-lg px-8 py-6"
              onClick={() => setIsTopicModalOpen(true)}
            >
              Start Learning
            </Button>
          </section>
          
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 rounded-full bg-primary-50 w-12 h-12 flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-primary" 
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
                </div>
                <h3 className="text-lg font-semibold mb-2">Self-Analysis</h3>
                <p className="text-neutral-600">
                  Test your knowledge with AI-generated questions of varying difficulty levels and receive personalized feedback.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 rounded-full bg-primary-50 w-12 h-12 flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-primary" 
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
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Teaching Mode</h3>
                <p className="text-neutral-600">
                  Get interactive explanations from AI tailored to your learning style with examples, analogies, and step-by-step guidance.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 rounded-full bg-primary-50 w-12 h-12 flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-primary" 
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
                </div>
                <h3 className="text-lg font-semibold mb-2">Personalized Content</h3>
                <p className="text-neutral-600">
                  Generate study notes, practice questions, and learning materials that focus on your weak areas for targeted improvement.
                </p>
              </CardContent>
            </Card>
          </section>
          
          <section className="bg-neutral-50 p-6 md:p-8 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">How it Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="rounded-full bg-primary-50 w-10 h-10 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">1</span>
                </div>
                <h3 className="font-medium mb-1">Select a Topic</h3>
                <p className="text-sm text-neutral-600">Choose any subject you want to learn</p>
              </div>
              
              <div>
                <div className="rounded-full bg-primary-50 w-10 h-10 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">2</span>
                </div>
                <h3 className="font-medium mb-1">Test Your Knowledge</h3>
                <p className="text-sm text-neutral-600">Answer AI-generated questions</p>
              </div>
              
              <div>
                <div className="rounded-full bg-primary-50 w-10 h-10 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">3</span>
                </div>
                <h3 className="font-medium mb-1">Get Personalized Feedback</h3>
                <p className="text-sm text-neutral-600">AI evaluates your strengths and weaknesses</p>
              </div>
              
              <div>
                <div className="rounded-full bg-primary-50 w-10 h-10 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">4</span>
                </div>
                <h3 className="font-medium mb-1">Learn Interactively</h3>
                <p className="text-sm text-neutral-600">Use AI teaching mode to fill knowledge gaps</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <Footer />
      
      <TopicSelectionModal
        open={isTopicModalOpen}
        onOpenChange={setIsTopicModalOpen}
        onSelectTopic={handleStartSession}
      />
    </div>
  );
};

export default Home;
