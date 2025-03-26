import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { storage } from "./storage";
import {
  insertSessionSchema,
  insertQuestionSchema,
  insertAnswerSchema,
  insertKnowledgeAreaSchema,
} from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Google AI with the provided API key
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Session endpoints
  app.post('/api/sessions', async (req: Request, res: Response) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const newSession = await storage.createSession(sessionData);
      res.status(201).json(newSession);
    } catch (error) {
      res.status(400).json({ message: 'Invalid session data', error });
    }
  });

  app.get('/api/sessions/:id', async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    
    const session = await storage.getSessionWithKnowledgeAreas(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(session);
  });

  app.patch('/api/sessions/:id/stage', async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    
    const { stage } = req.body;
    if (!stage || typeof stage !== 'string') {
      return res.status(400).json({ message: 'Invalid stage' });
    }
    
    const updatedSession = await storage.updateSessionStage(sessionId, stage);
    if (!updatedSession) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(updatedSession);
  });

  // Question endpoints
  app.post('/api/questions/generate', async (req: Request, res: Response) => {
    try {
      const { topic, sessionId } = req.body;
      if (!topic || !sessionId) {
        return res.status(400).json({ message: 'Topic and sessionId are required' });
      }
      
      const prompt = `Generate a few easy-to-hard-level questions on ${topic} to test my knowledge. Format the response as a JSON array of objects, where each object has 'question' and 'difficulty' properties. Difficulty should be one of: 'easy', 'medium', or 'hard'. Give me 6 questions total: 2 easy, 2 medium, and 2 hard questions.`;
      
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the response and extract questions
        let questions = [];
        try {
          // Look for JSON-like structure in the text
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback: Parse from text if JSON structure not found
            const lines = text.split('\n');
            for (const line of lines) {
              if (line.includes('Question') && (line.includes('easy') || line.includes('medium') || line.includes('hard'))) {
                const difficulty = line.includes('easy') ? 'easy' : line.includes('medium') ? 'medium' : 'hard';
                const question = line.replace(/^.*?:\s*/, '');
                questions.push({ question, difficulty });
              }
            }
          }
        } catch (error) {
          console.error('Failed to parse questions from AI response:', error);
          return res.status(500).json({ message: 'Failed to parse questions from AI response' });
        }
        
        // Save questions to storage
        const savedQuestions = [];
        for (const q of questions) {
          const questionData = insertQuestionSchema.parse({
            sessionId,
            question: q.question,
            difficulty: q.difficulty
          });
          const savedQuestion = await storage.createQuestion(questionData);
          savedQuestions.push(savedQuestion);
        }
        
        res.json({ questions: savedQuestions });
      } catch (error) {
        console.error('Error generating content from AI:', error);
        return res.status(500).json({ message: 'Error generating content from AI', error });
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      res.status(500).json({ message: 'Failed to generate questions', error });
    }
  });

  app.get('/api/sessions/:sessionId/questions', async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    
    const questions = await storage.getSessionQuestions(sessionId);
    res.json({ questions });
  });

  app.get('/api/sessions/:sessionId/questions-with-answers', async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    
    const questionsWithAnswers = await storage.getSessionQuestionsWithAnswers(sessionId);
    res.json({ questionsWithAnswers });
  });

  // Answer endpoints
  app.post('/api/answers', async (req: Request, res: Response) => {
    try {
      const { questionId, userAnswer } = req.body;
      if (!questionId || !userAnswer) {
        return res.status(400).json({ message: 'Question ID and user answer are required' });
      }
      
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }
      
      // Evaluate the answer using AI
      const prompt = `Question: ${question.question}\nStudent's Answer: ${userAnswer}\n\nEvaluate this answer based on correctness, depth, and clarity. Provide a JSON object with the following structure:
      {
        "correctness": <number between 0-100>,
        "feedback": "<detailed feedback>",
        "strengths": ["<strength1>", "<strength2>", ...],
        "weaknesses": ["<weakness1>", "<weakness2>", ...]
      }`;
      
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the evaluation
        let evaluation;
        try {
          // Extract JSON from response
          const jsonMatch = text.match(/{[\s\S]*}/);
          if (jsonMatch) {
            evaluation = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in AI response');
          }
        } catch (error) {
          console.error('Failed to parse evaluation from AI response:', error);
          return res.status(500).json({ message: 'Failed to parse evaluation' });
        }
        
        // Save the answer and evaluation
        const answerData = insertAnswerSchema.parse({
          questionId,
          userAnswer,
          evaluation
        });
        
        const savedAnswer = await storage.createAnswer(answerData);
        res.status(201).json(savedAnswer);
      } catch (error) {
        console.error('Error generating content from AI:', error);
        return res.status(500).json({ message: 'Error generating content from AI', error });
      }
    } catch (error) {
      console.error('Error evaluating answer:', error);
      res.status(500).json({ message: 'Failed to evaluate answer', error });
    }
  });

  // Knowledge area endpoints
  app.post('/api/knowledge-areas', async (req: Request, res: Response) => {
    try {
      const areaData = insertKnowledgeAreaSchema.parse(req.body);
      const newArea = await storage.createKnowledgeArea(areaData);
      res.status(201).json(newArea);
    } catch (error) {
      res.status(400).json({ message: 'Invalid knowledge area data', error });
    }
  });

  app.patch('/api/knowledge-areas/:id', async (req: Request, res: Response) => {
    const areaId = parseInt(req.params.id);
    if (isNaN(areaId)) {
      return res.status(400).json({ message: 'Invalid area ID' });
    }
    
    const { proficiency } = req.body;
    if (proficiency === undefined || typeof proficiency !== 'number') {
      return res.status(400).json({ message: 'Invalid proficiency' });
    }
    
    const updatedArea = await storage.updateKnowledgeArea(areaId, proficiency);
    if (!updatedArea) {
      return res.status(404).json({ message: 'Knowledge area not found' });
    }
    
    res.json(updatedArea);
  });

  app.get('/api/sessions/:sessionId/knowledge-areas', async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    
    const areas = await storage.getSessionKnowledgeAreas(sessionId);
    res.json({ areas });
  });

  // AI teaching mode endpoint
  app.post('/api/teaching', async (req: Request, res: Response) => {
    try {
      const { topic, question } = req.body;
      if (!topic || !question) {
        return res.status(400).json({ message: 'Topic and question are required' });
      }
      
      const prompt = `Hey buddy, I am stuck on ${topic}, specifically on "${question}". Can you teach me in an engaging way? 
      Break down this topic using:
      1. Simple explanations
      2. Real-life examples or analogies
      3. Step-by-step learning
      
      After explaining, provide 1-2 follow-up questions to check my understanding.`;
      
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Extract follow-up questions
        const followUpQuestions = [];
        const lines = text.split('\n');
        let collectingQuestions = false;
        
        for (const line of lines) {
          if (line.includes('follow-up') || line.includes('understanding') || line.includes('check your')) {
            collectingQuestions = true;
            continue;
          }
          
          if (collectingQuestions && line.includes('?')) {
            followUpQuestions.push(line.trim());
          }
        }
        
        res.json({ 
          text, 
          followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined 
        });
      } catch (error) {
        console.error('Error generating content from AI:', error);
        return res.status(500).json({ message: 'Error generating content from AI', error });
      }
    } catch (error) {
      console.error('Error in teaching mode:', error);
      res.status(500).json({ message: 'Failed to generate teaching content', error });
    }
  });

  // Generate study notes endpoint
  app.post('/api/notes/generate', async (req: Request, res: Response) => {
    try {
      const { topic, weakAreas } = req.body;
      if (!topic) {
        return res.status(400).json({ message: 'Topic is required' });
      }
      
      const weakAreasText = weakAreas && weakAreas.length > 0
        ? `Focus particularly on these weak areas: ${weakAreas.join(', ')}.`
        : '';
      
      const prompt = `Generate comprehensive study notes on ${topic}. ${weakAreasText}
      Include:
      1. Key concepts and definitions
      2. Important principles
      3. Examples or applications
      4. Visual representations (described in text)
      5. Common misconceptions
      
      Format the notes in Markdown for easy reading and structure.`;
      
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ notes: text });
      } catch (error) {
        console.error('Error generating content from AI:', error);
        return res.status(500).json({ message: 'Error generating content from AI', error });
      }
    } catch (error) {
      console.error('Error generating notes:', error);
      res.status(500).json({ message: 'Failed to generate study notes', error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}