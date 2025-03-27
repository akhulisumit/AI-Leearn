import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudyBreakRecommendation } from '@/lib/gemini';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, BrainCircuit, Activity, Award, ListOrdered } from 'lucide-react';

interface StudyBreakModalProps {
  sessionTime: number;
  topic: string;
}

// Store the last break type in localStorage
const getLastBreakType = () => {
  return localStorage.getItem('lastBreakType') || undefined;
}

const saveLastBreakType = (type: string) => {
  localStorage.setItem('lastBreakType', type);
}

const StudyBreakModal: React.FC<StudyBreakModalProps> = ({ sessionTime, topic }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [breakInProgress, setBreakInProgress] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Get the last break type
  const lastBreakType = getLastBreakType();

  // Fetch break recommendation when modal opens
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['studyBreak', sessionTime, topic, lastBreakType],
    queryFn: () => getStudyBreakRecommendation(sessionTime, topic, lastBreakType),
    enabled: isOpen, // Only fetch when modal is open
    refetchOnWindowFocus: false
  });

  const startBreak = () => {
    if (!data?.recommendation) return;
    
    // Store this break type for next time
    saveLastBreakType(data.recommendation.activityType);
    
    // Convert duration from minutes to seconds
    const durationInSeconds = data.recommendation.duration * 60;
    setBreakTimeLeft(durationInSeconds);
    setBreakInProgress(true);
    
    // Start countdown timer
    const interval = setInterval(() => {
      setBreakTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer completed
          clearInterval(interval);
          setBreakInProgress(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
  };

  const endBreak = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    setBreakInProgress(false);
    setIsOpen(false);
  };

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!data?.recommendation) return 0;
    const totalSeconds = data.recommendation.duration * 60;
    const progress = ((totalSeconds - breakTimeLeft) / totalSeconds) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white border-0"
          onClick={() => setIsOpen(true)}
        >
          <BrainCircuit className="h-4 w-4" />
          <span>Study Break</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {breakInProgress 
              ? 'Break in Progress' 
              : 'AI-Powered Study Break'}
          </DialogTitle>
          <DialogDescription>
            {breakInProgress 
              ? `Take a moment to refresh your mind. Your study will be more effective afterward.` 
              : `Based on your ${Math.round(sessionTime/60)} minute study session on "${topic}"`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-6">
            Sorry, we couldn't generate a break recommendation. Please try again.
          </div>
        ) : data?.recommendation && !breakInProgress ? (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">{data.recommendation.activityType}</h3>
              <Badge variant="outline" className="ml-auto">
                {data.recommendation.duration} min
              </Badge>
            </div>
            
            <p className="text-sm mb-4">{data.recommendation.description}</p>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" /> Benefits
              </h4>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {data.recommendation.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>
            
            {data.recommendation.steps && data.recommendation.steps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" /> How to do it
                </h4>
                <ol className="list-decimal pl-5 text-sm space-y-1">
                  {data.recommendation.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
        ) : breakInProgress ? (
          <div className="py-4 flex flex-col items-center">
            <div className="text-3xl font-bold mb-4">{formatTime(breakTimeLeft)}</div>
            <Progress value={calculateProgress()} className="w-full h-2 mb-6" />
            
            {data?.recommendation && (
              <div className="w-full mt-2">
                <h4 className="text-sm font-semibold mb-2">Currently doing:</h4>
                <p className="text-sm">{data.recommendation.activityType}</p>
                
                {data.recommendation.steps && data.recommendation.steps.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-1">Remember to:</h4>
                    <ul className="list-disc pl-5 text-sm">
                      {data.recommendation.steps.slice(0, 2).map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {breakInProgress ? (
            <Button variant="destructive" onClick={endBreak}>
              End Break Early
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Maybe Later
              </Button>
              <Button 
                onClick={startBreak} 
                disabled={!data?.recommendation || isLoading}
                className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
              >
                Start {data?.recommendation?.duration}min Break
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudyBreakModal;