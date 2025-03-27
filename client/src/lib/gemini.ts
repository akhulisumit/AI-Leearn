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

// New function to submit all answers for evaluation at once
export async function submitAllAnswers(sessionId: number): Promise<boolean> {
  const response = await apiRequest('POST', `/api/sessions/${sessionId}/evaluate-all-answers`, {});
  return response.status === 200;
}

export async function getTeachingContent(topic: string, question: string): Promise<AIResponse> {
  const response = await apiRequest('POST', '/api/teaching', { topic, question });
  return response.json();
}

export async function generateStudyNotes(topic: string, weakAreas?: string[]): Promise<{ notes: string }> {
  const response = await apiRequest('POST', '/api/notes/generate', { topic, weakAreas });
  return response.json();
}

export async function evaluateTest(sessionId: number): Promise<TestEvaluationResponse> {
  const response = await apiRequest('POST', `/api/sessions/${sessionId}/evaluate`);
  return response.json();
}
