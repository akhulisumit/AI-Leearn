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

interface WeaknessData {
  topic: string;
  area: string;
  count: number;
  lastSeen: string;
}

interface StrengthData {
  topic: string;
  area: string;
  count: number;
  lastSeen: string;
}

const Progress: React.FC = () => {
  const [, navigate] = useLocation();
  const [weaknesses, setWeaknesses] = useState<WeaknessData[]>([]);
  const [strengths, setStrengths] = useState<StrengthData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("weaknesses");
  
  useEffect(() => {
    // Load weaknesses from localStorage
    const savedWeaknesses = localStorage.getItem('eduWeaknesses');
    if (savedWeaknesses) {
      try {
        setWeaknesses(JSON.parse(savedWeaknesses));
      } catch (e) {
        console.error("Error loading weaknesses from localStorage:", e);
      }
    }
    
    // Load strengths from localStorage
    const savedStrengths = localStorage.getItem('eduStrengths');
    if (savedStrengths) {
      try {
        setStrengths(JSON.parse(savedStrengths));
      } catch (e) {
        console.error("Error loading strengths from localStorage:", e);
      }
    }
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center mb-6 justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Your Learning Progress</h1>
            <p className="text-neutral-500">Track your strengths and areas for improvement</p>
          </div>
          <Button 
            onClick={() => navigate('/')}
            className="mt-3 md:mt-0"
          >
            Start New Session
          </Button>
        </div>
        
        <Tabs defaultValue="weaknesses" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="weaknesses">Areas to Improve</TabsTrigger>
            <TabsTrigger value="strengths">Strengths</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weaknesses">
            {weaknesses.length > 0 ? (
              <div className="space-y-4">
                {weaknesses.map((weakness, index) => (
                  <Card key={index} className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{weakness.area}</CardTitle>
                      <CardDescription>Topic: {weakness.topic}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500">
                          Identified {weakness.count} {weakness.count === 1 ? 'time' : 'times'}
                        </span>
                        <span className="text-neutral-500">
                          Last seen: {new Date(weakness.lastSeen).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/?topic=${encodeURIComponent(weakness.topic)}`)}
                      >
                        Practice This Topic
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
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
                <h2 className="text-xl font-semibold mb-2">No Areas for Improvement Yet</h2>
                <p className="text-neutral-500 mb-6">
                  Complete more learning sessions to identify areas where you can improve
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Learning Now
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="strengths">
            {strengths.length > 0 ? (
              <div className="space-y-4">
                {strengths.map((strength, index) => (
                  <Card key={index} className="shadow-sm border-green-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-green-700">{strength.area}</CardTitle>
                      <CardDescription>Topic: {strength.topic}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500">
                          Identified {strength.count} {strength.count === 1 ? 'time' : 'times'}
                        </span>
                        <span className="text-neutral-500">
                          Last seen: {new Date(strength.lastSeen).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button 
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50"
                        onClick={() => navigate(`/?topic=${encodeURIComponent(strength.topic)}`)}
                      >
                        Enhance This Skill
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
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
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <h2 className="text-xl font-semibold mb-2">No Strengths Identified Yet</h2>
                <p className="text-neutral-500 mb-6">
                  Complete more learning sessions to identify your academic strengths
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

export default Progress;