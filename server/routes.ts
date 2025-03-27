import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { storage } from "./storage";
import {
  insertSessionSchema,
  insertQuestionSchema,
  insertAnswerSchema,
  insertKnowledgeAreaSchema,
  EvaluationResult,
  TestResult,
  Question,
  Answer,
  QuestionWithAnswer,
  BatchEvaluationResult
} from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Google AI with the provided API key
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY environment variable is not set!");
    throw new Error("GEMINI_API_KEY is required to use AI features");
  }
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
      
      // Get existing questions to check for duplicates
      const existingQuestions = await storage.getSessionQuestions(sessionId);
      const existingQuestionsText = existingQuestions.map(q => q.question.toLowerCase());
      
      // Extract education and difficulty levels from topic if present
      // Format: "TOPIC [Education: LEVEL, Difficulty: LEVEL]"
      let educationLevel = "Class 9-10"; // Default
      let difficultyLevel = "Standard"; // Default
      let pureTopic = topic;
      
      const metadataMatch = topic.match(/\[(.*?)\]/);
      if (metadataMatch) {
        pureTopic = topic.replace(/\s*\[.*?\]$/, "").trim();
        
        const metadata = metadataMatch[1];
        const educationMatch = metadata.match(/Education:\s*(.*?)(?:,|$)/);
        if (educationMatch) {
          educationLevel = educationMatch[1].trim();
        }
        
        const difficultyMatch = metadata.match(/Difficulty:\s*(.*?)(?:,|$)/);
        if (difficultyMatch) {
          difficultyLevel = difficultyMatch[1].trim();
        }
      }
      
      // Map difficulty level to AI-generated question difficulty
      let easyCount = 2;
      let mediumCount = 2;
      let hardCount = 2;
      
      // Adjust difficulty distribution based on selected level
      if (difficultyLevel === "Beginner") {
        easyCount = 4;
        mediumCount = 2;
        hardCount = 0;
      } else if (difficultyLevel === "Advanced") {
        easyCount = 0;
        mediumCount = 2;
        hardCount = 4;
      }
      
      // Add context to make generated questions more unique
      let contextPrompt = "";
      if (existingQuestionsText.length > 0) {
        contextPrompt = `I already have the following questions in my test (DO NOT repeat these or create similar questions):\n${existingQuestionsText.join('\n')}\n\n`;
      }
      
      const prompt = `${contextPrompt}Generate UNIQUE and diverse questions on ${pureTopic} to test my knowledge.
      
      The student is at education level: ${educationLevel}.
      The desired difficulty level is: ${difficultyLevel}.
      
      IMPORTANT: Each question must test a different concept within ${pureTopic}. Do not create questions that are similar to each other.
      Tailor the questions to be appropriate for someone at the ${educationLevel} education level.
      
      Format the response as a JSON array of objects, where each object has 'question' and 'difficulty' properties. Difficulty should be one of: 'easy', 'medium', or 'hard'.
      
      Give me 6 questions total: ${easyCount} easy, ${mediumCount} medium, and ${hardCount} hard questions.
      
      Make sure every question is testing a completely different aspect of ${pureTopic}.`;
      
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
  
  // Endpoint to get correct answers for all questions in a session
  app.get('/api/sessions/:sessionId/correct-answers', async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID', success: false });
    }
    
    try {
      // Get all questions for the session
      const questions = await storage.getSessionQuestions(sessionId);
      if (!questions || questions.length === 0) {
        return res.status(404).json({ 
          message: 'No questions found for this session', 
          success: false,
          answers: []
        });
      }
      
      // Generate correct answers using AI
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ 
          message: 'Session not found', 
          success: false,
          answers: []
        });
      }
      
      const topic = session.topic;
      const answers = [];
      
      for (const question of questions) {
        try {
          // Generate the correct answer using Gemini
          const prompt = `
            You are an expert educational assistant. Please provide a correct answer to 
            the following question on the topic of ${topic}:
            
            Question: ${question.question}
            
            Provide a clear, accurate, and concise answer.
          `;
          
          const result = await model.generateContent(prompt);
          const response = result.response;
          const correctAnswer = response.text().trim();
          
          answers.push({
            questionId: question.id,
            correctAnswer
          });
        } catch (error) {
          console.error(`Error generating correct answer for question ${question.id}:`, error);
          // Include a placeholder error message instead of failing the entire request
          answers.push({
            questionId: question.id,
            correctAnswer: "Sorry, we couldn't generate the correct answer for this question."
          });
        }
      }
      
      res.json({
        success: true,
        message: "Correct answers generated successfully",
        answers
      });
    } catch (error) {
      console.error("Error generating correct answers:", error);
      res.status(500).json({ 
        message: "Failed to generate correct answers", 
        success: false,
        answers: []
      });
    }
  });

  // Answer endpoints
  app.post('/api/answers', async (req: Request, res: Response) => {
    try {
      const { questionId, userAnswer, deferEvaluation } = req.body;
      if (!questionId || !userAnswer) {
        return res.status(400).json({ message: 'Question ID and user answer are required' });
      }
      
      // Get the question details - this can be done in parallel with further processing
      const questionPromise = storage.getQuestion(questionId);
      
      // Create a temporary record with minimal data to respond quickly to the client
      // This allows the client to move on to the next question while evaluation happens
      // Convert the object to something we can send over JSON
      // The actual Answer type requires createdAt to be a Date object
      // but for the response we can use a modified version
      const tempAnswer = {
        id: -1, // Will be replaced by actual ID
        questionId,
        userAnswer,
        evaluation: {
          correctness: 0,
          feedback: deferEvaluation ? "Evaluation deferred until test completion" : "Evaluating your answer...",
          strengths: [],
          weaknesses: []
        },
        createdAt: new Date().toISOString()
      };
      
      // If deferEvaluation is true, we'll save the answer without evaluating it
      if (deferEvaluation) {
        const answerData = insertAnswerSchema.parse({
          questionId,
          userAnswer,
          evaluation: {
            correctness: 0,
            feedback: "Pending evaluation at test completion",
            strengths: [],
            weaknesses: []
          }
        });
        
        const savedAnswer = await storage.createAnswer(answerData);
        return res.status(200).json(savedAnswer);
      }
      
      // Send a quick initial response so the client can proceed
      // This is a performance optimization - the client doesn't need to wait for AI evaluation
      res.status(202).json(tempAnswer);
      
      // Now continue with the actual evaluation asynchronously
      const question = await questionPromise;
      if (!question) {
        console.error(`Question with ID ${questionId} not found`);
        return; // The client already received a response, so just log the error
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
          // Continue with default evaluation since we already sent a response
          evaluation = {
            correctness: 50,
            feedback: "We had trouble evaluating your answer automatically.",
            strengths: ["Submission received"],
            weaknesses: ["Evaluation process encountered an error"]
          };
        }
        
        // Save the answer and complete evaluation to the database
        const answerData = insertAnswerSchema.parse({
          questionId,
          userAnswer,
          evaluation
        });
        
        await storage.createAnswer(answerData);
        // We don't need to send a response here since we already sent one
      } catch (error) {
        console.error('Error generating content from AI:', error);
        // We already sent a response to client, so just log the error
      }
    } catch (error) {
      console.error('Error in answer submission process:', error);
      // If we haven't sent a response yet, send an error
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to process answer submission', error });
      }
    }
  });
  
  // Simplified endpoint to evaluate all answers at once and provide overall evaluation
  app.post('/api/sessions/:sessionId/evaluate-all-answers', async (req: Request, res: Response) => {
    try {
      console.log("Starting batch evaluation process");
      
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }
      
      // Get the session with knowledge areas
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Get all questions with answers for this session
      const answeredQuestions = await storage.getSessionQuestionsWithAnswers(sessionId);
      console.log(`Found ${answeredQuestions.length} questions for session ${sessionId}`);
      
      // Only evaluate if there are answered questions
      if (answeredQuestions.length === 0 || answeredQuestions.every(q => !q.answer)) {
        return res.status(400).json({ 
          message: 'No answered questions found for this session',
          success: false
        });
      }
      
      // Simplified direct approach: directly call the Gemini API
      try {
        // Prepare the batch evaluation prompt
        let promptText = `I've completed a test on ${session.topic}. Please evaluate my performance:

Questions and My Answers:
`;
        
        // Add each question and answer to the prompt
        answeredQuestions.forEach((qa: QuestionWithAnswer, index: number) => {
          promptText += `\nQuestion ${index + 1}: ${qa.question}\n`;
          promptText += `My Answer: ${qa.answer?.userAnswer || "No answer provided"}\n`;
        });
        
        promptText += `
Based on my answers, provide:
1. An overall score (0-100) for my test
2. 2-3 clear strengths in my understanding
3. 2-3 areas where I need improvement
4. 2-3 specific topics I should study more

Format your response ONLY as a JSON object like this:
{
  "totalScore": 75,
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendedAreas": ["area1", "area2"]
}

IMPORTANT: DO NOT include any text outside of this JSON object.`;
        
        console.log("Sending evaluation request to Gemini API");
        
        // Direct call to Gemini with timeout handling
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI request timed out")), 15000)
        );
        
        const responsePromise = model.generateContent(promptText);
        const result = await Promise.race([responsePromise, timeoutPromise]) as any;
        const response = await result.response;
        const text = response.text();
        
        console.log("Received response from Gemini API");
        
        // Extract and parse the JSON
        let evaluation;
        try {
          // More robust JSON extraction with fallback
          const jsonMatch = text.match(/{[\s\S]*}/);
          if (!jsonMatch) {
            console.error("No valid JSON found in response");
            console.log("Raw response:", text);
            throw new Error('No valid JSON found in response');
          }
          
          evaluation = JSON.parse(jsonMatch[0]);
          
          // Validate required fields
          if (typeof evaluation.totalScore !== 'number' || 
              !Array.isArray(evaluation.strengths) || 
              !Array.isArray(evaluation.weaknesses)) {
            throw new Error('Missing required fields in evaluation');
          }
          
          console.log("Successfully parsed evaluation:", evaluation);
        } catch (parseError) {
          console.error("Error parsing evaluation JSON:", parseError);
          
          // Calculate an average score based on previous individual evaluations if available
          let averageScore = 70; // Default fallback
          const scoresFromPreviousEvals = answeredQuestions
            .filter(qa => qa.answer && qa.answer.evaluation && typeof qa.answer.evaluation === 'object' && 'correctness' in qa.answer.evaluation)
            .map(qa => {
              const evaluation = qa.answer?.evaluation as { correctness: number };
              return evaluation.correctness;
            });
          
          if (scoresFromPreviousEvals.length > 0) {
            averageScore = Math.round(scoresFromPreviousEvals.reduce((a, b) => a + b, 0) / scoresFromPreviousEvals.length);
          }
          
          // Provide a more helpful fallback evaluation
          evaluation = {
            totalScore: averageScore,
            strengths: [
              "You attempted to answer the questions", 
              "Your responses show engagement with the material"
            ],
            weaknesses: [
              "Some concepts need deeper understanding", 
              "More detailed examples would improve your answers"
            ],
            recommendedAreas: [
              `Review core concepts of ${session.topic}`,
              "Practice applying concepts to specific scenarios"
            ]
          };
        }
        
        // Create a batch evaluation record
        const batchEvaluationData = {
          totalScore: evaluation.totalScore,
          feedback: "Your test has been evaluated based on your answers.",
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          recommendedAreas: evaluation.recommendedAreas
        };
        
        console.log("Saving evaluation to storage...");
        
        // Store the evaluation in the first answer only for simplicity
        if (answeredQuestions.length > 0 && answeredQuestions[0].answer) {
          const firstAnswer = answeredQuestions[0];
          
          // Double-check that we still have an answer (TypeScript safety)
          if (firstAnswer.answer) {
            try {
              const answerData = insertAnswerSchema.parse({
                questionId: firstAnswer.id,
                userAnswer: firstAnswer.answer.userAnswer,
                evaluation: {
                  correctness: evaluation.totalScore,
                  feedback: "See overall evaluation for details",
                  strengths: evaluation.strengths || [],
                  weaknesses: evaluation.weaknesses || []
                },
                batchEvaluation: batchEvaluationData
              });
            
              await storage.createAnswer(answerData);
              console.log("Successfully stored batch evaluation in first answer");
            } catch (validationError) {
              console.error("Error validating answer data:", validationError);
              // Continue with the response even if storage fails
            }
          }
        }
        
        // Return success with evaluation summary
        res.json({ 
          message: 'Evaluation completed successfully', 
          success: true,
          evaluation: batchEvaluationData
        });
      } catch (error) {
        console.error('Error during batch evaluation:', error);
        
        // Return a more informative error message
        res.status(500).json({ 
          message: 'Error during evaluation. Please try again.',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error('Unexpected error in evaluate-all-answers:', error);
      res.status(500).json({ 
        message: 'Unexpected error during batch evaluation',
        success: false
      });
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

  // Enhanced in-memory cache for AI responses with improved key generation
  const aiResponseCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 1000 * 60 * 60; // 60 minutes cache lifetime for better performance
  
  // Helper function to get cached data or fetch from AI
  async function getCachedOrFetchFromAI(cacheKey: string, promptFn: () => string, processFn: (text: string) => any) {
    // Check if we have a valid cache entry
    const cached = aiResponseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`Using cached AI response for: ${cacheKey}`);
      return cached.data;
    }
    
    // Generate the prompt and fetch from AI
    const prompt = promptFn();
    
    try {
      // Use a timeout promise to ensure we don't wait too long
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI request timed out")), 15000)
      );
      
      const responsePromise = model.generateContent(prompt);
      const result = await Promise.race([responsePromise, timeoutPromise]) as any;
      const response = await result.response;
      const text = response.text();
      
      // Process the text according to the provided function
      const processedData = processFn(text);
      
      // Cache the result
      aiResponseCache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now()
      });
      
      return processedData;
    } catch (error) {
      console.error('Error fetching from AI:', error);
      throw error;
    }
  }
  
  // AI teaching mode endpoint
  app.post('/api/teaching', async (req: Request, res: Response) => {
    try {
      const { topic, question } = req.body;
      if (!topic || !question) {
        return res.status(400).json({ message: 'Topic and question are required' });
      }
      
      const cacheKey = `teaching:${topic}:${question}`;
      
      try {
        const data = await getCachedOrFetchFromAI(
          cacheKey,
          () => `Hey buddy, I am stuck on ${topic}, specifically on "${question}". Can you teach me in an engaging way? 
            Break down this topic using:
            1. Simple explanations
            2. Real-life examples or analogies
            3. Step-by-step learning
            
            After explaining, provide 1-2 follow-up questions to check my understanding.
            Keep your response concise and focused.`,
          (text) => {
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
            
            return { 
              text, 
              followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined 
            };
          }
        );
        
        res.json(data);
      } catch (error) {
        console.error('Error generating content from AI:', error);
        // Return a fallback response that won't break the UI
        return res.json({ 
          text: "I'm having trouble connecting to the teaching service right now. Please try again in a moment.",
          followUpQuestions: ["Would you like to try a different topic?"] 
        });
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
      
      // Create a unique cache key based on the topic and weak areas
      const weakAreasKey = weakAreas ? weakAreas.sort().join(',') : 'none';
      const cacheKey = `notes:${topic}:${weakAreasKey}`;
      
      try {
        const notes = await getCachedOrFetchFromAI(
          cacheKey,
          () => {
            const weakAreasText = weakAreas && weakAreas.length > 0
              ? `Focus particularly on these weak areas: ${weakAreas.join(', ')}.`
              : '';
              
            return `Generate comprehensive study notes on ${topic}. ${weakAreasText}
              Include:
              1. Key concepts and definitions
              2. Important principles
              3. Examples or applications
              4. Visual representations (described in text)
              5. Common misconceptions
              
              Format the notes in Markdown for easy reading and structure.
              Keep the notes concise and focused on the most important information.`;
          },
          (text) => {
            // Simply return the notes text
            return { notes: text };
          }
        );
        
        res.json(notes);
      } catch (error) {
        console.error('Error generating content from AI:', error);
        // Return a fallback response with basic notes
        return res.json({ 
          notes: `# ${topic} - Study Notes\n\nI apologize, but I'm currently experiencing technical difficulties generating detailed notes. Here are some basic points to get you started:\n\n## Key Concepts\n- Study the fundamentals of ${topic}\n- Focus on understanding core principles\n- Practice with examples\n\nPlease try again in a few moments for more detailed notes.` 
        });
      }
    } catch (error) {
      console.error('Error generating notes:', error);
      res.status(500).json({ message: 'Failed to generate study notes', error });
    }
  });
  
  // Evaluate entire test endpoint
  app.post('/api/sessions/:sessionId/evaluate', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }
      
      // Get the session details
      const session = await storage.getSessionWithKnowledgeAreas(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Get all questions and answers for this session
      const questionsWithAnswers = await storage.getSessionQuestionsWithAnswers(sessionId);
      if (questionsWithAnswers.length === 0) {
        return res.status(400).json({ message: 'No questions and answers found for this session' });
      }
      
      // Filter out questions without answers
      const completedQuestionsWithAnswers = questionsWithAnswers.filter(qa => qa.answer);
      if (completedQuestionsWithAnswers.length === 0) {
        return res.status(400).json({ message: 'No answered questions found for this session' });
      }
      
      // Create a unique cache key based on the session ID and answers
      // We use a hash of the answers' content to ensure uniqueness while keeping the key short
      const answersHash = completedQuestionsWithAnswers
        .map(qa => `${qa.id}-${qa.answer?.userAnswer.substring(0, 10)}`)
        .join('|');
      const cacheKey = `evaluate:${sessionId}:${answersHash.length}`;
      
      try {
        const evaluationResult = await getCachedOrFetchFromAI(
          cacheKey,
          () => {
            // Prepare the prompt for AI evaluation
            let promptText = `I've completed a test on ${session.topic}. Please evaluate my overall performance based on the following questions and answers:\n\n`;
            
            completedQuestionsWithAnswers.forEach((qa: QuestionWithAnswer, index: number) => {
              promptText += `Question ${index + 1} (${qa.difficulty}): ${qa.question}\n`;
              promptText += `My Answer: ${qa.answer?.userAnswer}\n`;
              if (qa.answer?.evaluation) {
                const evaluation = qa.answer.evaluation as EvaluationResult;
                promptText += `Individual Score: ${evaluation.correctness}/100\n\n`;
              } else {
                promptText += `\n`;
              }
            });
            
            promptText += `Based on my answers above, please provide:
            1. An overall score out of 100
            2. General feedback on my performance (be concise)
            3. A list of my strengths (max 3 points)
            4. A list of areas that need improvement (max 3 points)
            5. Recommended knowledge areas to focus on for further study (max 3 areas)
            
            Format your response as a JSON object with the following structure:
            {
              "totalScore": <number between 0-100>,
              "feedback": "<general feedback>",
              "strengths": ["<strength1>", "<strength2>", ...],
              "weaknesses": ["<weakness1>", "<weakness2>", ...],
              "recommendedAreas": ["<area1>", "<area2>", ...]
            }`;
            
            return promptText;
          },
          (text) => {
            try {
              // Extract JSON from response
              const jsonMatch = text.match(/{[\s\S]*}/);
              if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
              }
              
              const testResult = JSON.parse(jsonMatch[0]);
              
              // Create full test result with questions and answers
              return {
                questionsAndAnswers: completedQuestionsWithAnswers.map(qa => ({
                  question: {
                    id: qa.id,
                    sessionId: qa.sessionId,
                    question: qa.question,
                    difficulty: qa.difficulty,
                    createdAt: qa.createdAt
                  },
                  answer: qa.answer!
                })),
                totalScore: testResult.totalScore || 0,
                feedback: testResult.feedback || "Your performance was evaluated.",
                strengths: testResult.strengths || [],
                weaknesses: testResult.weaknesses || [],
                recommendedAreas: testResult.recommendedAreas || []
              };
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              throw new Error(`Failed to parse test evaluation: ${errorMessage}`);
            }
          }
        );
        
        res.json(evaluationResult);
      } catch (error) {
        console.error('Error generating or parsing evaluation:', error);
        
        // Return a fallback response that won't break the UI
        const fallbackResult: TestResult = {
          questionsAndAnswers: completedQuestionsWithAnswers.map(qa => ({
            question: {
              id: qa.id,
              sessionId: qa.sessionId,
              question: qa.question,
              difficulty: qa.difficulty,
              createdAt: qa.createdAt
            },
            answer: qa.answer!
          })),
          totalScore: 50, // Midpoint score as fallback
          feedback: "I'm having trouble generating a detailed evaluation right now. Here's a basic assessment of your answers.",
          strengths: ["Your answers show an understanding of the concepts"],
          weaknesses: ["Some areas might need more clarity or detail"],
          recommendedAreas: ["Review the core concepts of " + session.topic]
        };
        
        res.json(fallbackResult);
      }
    } catch (error) {
      console.error('Error evaluating test:', error);
      res.status(500).json({ message: 'Failed to evaluate test', error });
    }
  });

  // Study Break Recommendation API
  app.post('/api/study-break', async (req: Request, res: Response) => {
    try {
      const { sessionTime, topic, lastBreakType } = req.body;
      
      if (!sessionTime || !topic) {
        return res.status(400).json({
          success: false,
          message: "Session time and topic are required"
        });
      }
      
      // Convert session time from seconds to minutes for more readable prompt
      const sessionTimeMinutes = Math.round(sessionTime / 60);
      
      // Construct the prompt for the AI
      let prompt = `
        You are an educational expert specializing in study optimization and cognitive science.
        I need a personalized study break recommendation that will help with learning efficiency and focus.
        
        Current study session:
        - Session duration so far: ${sessionTimeMinutes} minutes
        - Topic being studied: ${topic}
        ${lastBreakType ? `- Last break type: ${lastBreakType}` : ''}
        
        Please provide a specific break activity recommendation with:
        1. Type of activity (e.g., physical exercise, mindfulness, creative activity, etc.)
        2. Duration (between 3-15 minutes depending on how long they've been studying)
        3. Brief description of what to do
        4. Expected benefits related to learning
        5. Simple step-by-step instructions if applicable
        
        Format your response as a JSON object with the following structure:
        {
          "activityType": "string",
          "duration": number,
          "description": "string",
          "benefits": ["string"],
          "steps": ["string"]
        }
        
        Make sure the recommendation is different from the last break type if provided.
        Base the duration on how long they've studied - longer sessions need longer breaks, but keep it under 15 minutes.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Extract the JSON from the response
      let jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                      text.match(/```\n([\s\S]*?)\n```/) || 
                      text.match(/\{[\s\S]*\}/);
                      
      let recommendation;
      
      if (jsonMatch) {
        try {
          // Use the first match if available, otherwise use the whole text
          const jsonText = jsonMatch[1] || jsonMatch[0];
          recommendation = JSON.parse(jsonText);
        } catch (error) {
          console.error("Error parsing AI response as JSON:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to parse AI response"
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          message: "AI didn't generate a properly formatted response"
        });
      }
      
      return res.json({
        success: true,
        message: "Study break recommendation generated successfully",
        recommendation
      });
    } catch (error) {
      console.error("Error generating study break recommendation:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate study break recommendation"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}