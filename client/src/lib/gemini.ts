import { AIResponse, TestResult } from "@shared/schema";
import { apiRequest } from "./queryClient";

export interface GenerateQuestionsResponse {
  questions: {
    id: number;
    sessionId: number;
    question: string;
    difficulty: string;
    createdAt: string;
  }[];
}

export interface EvaluateAnswerResponse {
  id: number;
  questionId: number;
  userAnswer: string;
  evaluation: {
    correctness: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
  };
  createdAt: string;
}

export type TestEvaluationResponse = TestResult;

export async function generateQuestions(topic: string, sessionId: number): Promise<GenerateQuestionsResponse> {
  const response = await apiRequest('POST', '/api/questions/generate', { topic, sessionId });
  return response.json();
}

export async function submitAnswer(questionId: number, userAnswer: string, deferEvaluation: boolean = false): Promise<EvaluateAnswerResponse> {
  const response = await apiRequest('POST', '/api/answers', { 
    questionId, 
    userAnswer,
    deferEvaluation // Tell the server to defer evaluation if needed
  });
  
  // If we get a 202 Accepted status, the server is processing the evaluation 
  // asynchronously and has sent back a temporary response
  if (response.status === 202) {
    // Return the temporary response with proper typing
    const tempResult = await response.json();
    return tempResult;
  }
  
  return response.json();
}

export interface BatchEvaluationResponse {
  success: boolean;
  message: string;
  evaluation?: {
    totalScore: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    recommendedAreas: string[];
  }
}

// Enhanced function to submit all answers for evaluation at once - now returns the evaluation data
export async function submitAllAnswers(sessionId: number): Promise<BatchEvaluationResponse> {
  try {
    const response = await apiRequest('POST', `/api/sessions/${sessionId}/evaluate-all-answers`, {});
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    
    // Parse the evaluation results
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in submitAllAnswers:", error);
    return {
      success: false,
      message: "We're having trouble evaluating your answers right now. Please try again later."
    };
  }
}

export async function getTeachingContent(topic: string, question: string): Promise<AIResponse> {
  try {
    const response = await apiRequest('POST', '/api/teaching', { topic, question });
    const data = await response.json();
    
    // Add error handling and validation
    if (!data || !data.text) {
      throw new Error('Invalid response format from teaching API');
    }
    
    return data;
  } catch (error) {
    console.error("Error in getTeachingContent:", error);
    // Return a fallback response that won't break the UI
    return {
      text: "I'm having trouble connecting to the teaching service right now. Please try again in a moment.",
      followUpQuestions: ["Would you like to try a different topic?"]
    };
  }
}

export async function generateStudyNotes(topic: string, weakAreas?: string[]): Promise<{ notes: string }> {
  try {
    const response = await apiRequest('POST', '/api/notes/generate', { topic, weakAreas });
    const data = await response.json();
    
    if (!data || !data.notes) {
      throw new Error('Invalid response format from notes generation API');
    }
    
    return data;
  } catch (error) {
    console.error("Error in generateStudyNotes:", error);
    // Return a fallback response
    return {
      notes: `Here are some study notes on ${topic}:\n\nI'm sorry, but I'm having trouble generating detailed study notes right now. Please try again in a moment.`
    };
  }
}

export async function evaluateTest(sessionId: number): Promise<TestEvaluationResponse> {
  try {
    const response = await apiRequest('POST', `/api/sessions/${sessionId}/evaluate`);
    
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in evaluateTest:", error);
    // Return a minimal valid TestResult structure that won't break the UI
    return {
      questionsAndAnswers: [],
      totalScore: 0,
      feedback: "We're having trouble evaluating your test results right now. Please try again later.",
      strengths: ["Your answers have been saved"],
      weaknesses: ["We couldn't complete the evaluation"],
      recommendedAreas: ["Try again later"]
    };
  }
}
