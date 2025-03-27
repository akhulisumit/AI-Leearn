import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface HistorySession {
  id: number;
  topic: string;
  date: string;
  score?: number;
  weaknesses?: string[];
}

const History: React.FC = () => {
  const [, navigate] = useLocation();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [activeTab, setActiveTab] = useState<string>("recent");
  
  useEffect(() => {
    // Load session history from localStorage
    const savedSessions = localStorage.getItem('eduSessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
      } catch (e) {
        console.error("Error loading session history from localStorage:", e);
      }
    }
  }, []);
  
  // Sort sessions by date (recent first)
  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  // Filter sessions by score range
  const highScoreSessions = sortedSessions.filter(session => (session.score || 0) >= 70);
  const mediumScoreSessions = sortedSessions.filter(session => {
    const score = session.score || 0;
    return score >= 40 && score < 70;
  });
  const lowScoreSessions = sortedSessions.filter(session => (session.score || 0) < 40);
  
  // Function to format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Function to get score color
  const getScoreColor = (score: number) => {
    if (score < 40) return "text-red-600";
    if (score < 70) return "text-yellow-600";
    return "text-green-600";
  };
  
  // Function to render a session card
  const renderSessionCard = (session: HistorySession) => (
    <Card key={session.id} className="shadow-sm mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{session.topic}</CardTitle>
        <CardDescription>{formatDate(session.date)}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {session.score !== undefined && (
          <div className="flex items-center mb-3">
            <span className="text-sm font-medium mr-2">Score:</span>
            <span className={`font-bold ${getScoreColor(session.score)}`}>{session.score}%</span>
          </div>
        )}
        
        {session.weaknesses && session.weaknesses.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-medium mb-1">Areas for improvement:</h4>
            <ul className="list-disc list-inside text-sm text-neutral-600">
              {session.weaknesses.slice(0, 3).map((weakness, index) => (
                <li key={index} className="truncate">{weakness}</li>
              ))}
              {session.weaknesses.length > 3 && (
                <li className="text-neutral-500">
                  +{session.weaknesses.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end pt-2">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/?topic=${encodeURIComponent(session.topic)}`)}
        >
          Retake Test
        </Button>
      </CardFooter>
    </Card>
  );
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center mb-6 justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Your Learning History</h1>
            <p className="text-neutral-500">Review your past sessions and track your progress</p>
          </div>
          <Button 
            onClick={() => navigate('/')}
            className="mt-3 md:mt-0"
          >
            Start New Session
          </Button>
        </div>
        
        <Tabs defaultValue="recent" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="high">High Scores</TabsTrigger>
            <TabsTrigger value="medium">Medium Scores</TabsTrigger>
            <TabsTrigger value="low">Low Scores</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent">
            {sortedSessions.length > 0 ? (
              <div className="space-y-4">
                {sortedSessions.map(renderSessionCard)}
              </div>
            ) : (
              <div className="text-center border rounded-lg p-8 bg-white">
                <svg 
                  className="w-12 h-12 mx-auto text-neutral-300 mb-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                <h2 className="text-xl font-semibold mb-2">No History Yet</h2>
                <p className="text-neutral-500 mb-6">
                  You haven't completed any learning sessions yet. Start one now!
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Learning Now
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="high">
            {highScoreSessions.length > 0 ? (
              <div className="space-y-4">
                {highScoreSessions.map(renderSessionCard)}
              </div>
            ) : (
              <div className="text-center border rounded-lg p-8 bg-white">
                <svg 
                  className="w-12 h-12 mx-auto text-neutral-300 mb-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <h2 className="text-xl font-semibold mb-2">No High Scores Yet</h2>
                <p className="text-neutral-500 mb-6">
                  Keep practicing to achieve high scores on your tests!
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Learning Now
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="medium">
            {mediumScoreSessions.length > 0 ? (
              <div className="space-y-4">
                {mediumScoreSessions.map(renderSessionCard)}
              </div>
            ) : (
              <div className="text-center border rounded-lg p-8 bg-white">
                <svg 
                  className="w-12 h-12 mx-auto text-neutral-300 mb-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                  <path d="M8 14h8"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <h2 className="text-xl font-semibold mb-2">No Medium Scores</h2>
                <p className="text-neutral-500 mb-6">
                  You don't have any tests with medium scores.
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Learning Now
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="low">
            {lowScoreSessions.length > 0 ? (
              <div className="space-y-4">
                {lowScoreSessions.map(renderSessionCard)}
              </div>
            ) : (
              <div className="text-center border rounded-lg p-8 bg-white">
                <svg 
                  className="w-12 h-12 mx-auto text-neutral-300 mb-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                  <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <h2 className="text-xl font-semibold mb-2">No Low Scores</h2>
                <p className="text-neutral-500 mb-6">
                  Good job! You don't have any tests with low scores.
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Learning Now
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default History;