import { users, sessions, questions, answers, knowledgeAreas } from "@shared/schema";
import type { 
  User, InsertUser, 
  Session, InsertSession, 
  Question, InsertQuestion, 
  Answer, InsertAnswer, 
  KnowledgeArea, InsertKnowledgeArea,
  SessionWithKnowledgeAreas,
  QuestionWithAnswer
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getUserSessions(userId: number): Promise<Session[]>;
  updateSessionStage(id: number, stage: string): Promise<Session | undefined>;
  getSessionWithKnowledgeAreas(id: number): Promise<SessionWithKnowledgeAreas | undefined>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getSessionQuestions(sessionId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  
  // Answer operations
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getQuestionAnswer(questionId: number): Promise<Answer | undefined>;
  getSessionQuestionsWithAnswers(sessionId: number): Promise<QuestionWithAnswer[]>;
  
  // Knowledge area operations
  createKnowledgeArea(area: InsertKnowledgeArea): Promise<KnowledgeArea>;
  updateKnowledgeArea(id: number, proficiency: number): Promise<KnowledgeArea | undefined>;
  getSessionKnowledgeAreas(sessionId: number): Promise<KnowledgeArea[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<number, Session>;
  private questions: Map<number, Question>;
  private answers: Map<number, Answer>;
  private knowledgeAreas: Map<number, KnowledgeArea>;
  
  private userId: number;
  private sessionId: number;
  private questionId: number;
  private answerId: number;
  private knowledgeAreaId: number;
  
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.questions = new Map();
    this.answers = new Map();
    this.knowledgeAreas = new Map();
    
    this.userId = 1;
    this.sessionId = 1;
    this.questionId = 1;
    this.answerId = 1;
    this.knowledgeAreaId = 1;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Session operations
  async createSession(session: InsertSession): Promise<Session> {
    const id = this.sessionId++;
    const newSession = { 
      ...session, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.sessions.set(id, newSession);
    return newSession;
  }
  
  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }
  
  async getUserSessions(userId: number): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }
  
  async updateSessionStage(id: number, stage: string): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { 
      ...session, 
      stage, 
      updatedAt: new Date() 
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }
  
  async getSessionWithKnowledgeAreas(id: number): Promise<SessionWithKnowledgeAreas | undefined> {
    const session = await this.getSession(id);
    if (!session) return undefined;
    
    const knowledgeAreas = await this.getSessionKnowledgeAreas(id);
    return {
      ...session,
      knowledgeAreas
    };
  }
  
  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.questionId++;
    const newQuestion = { 
      ...question, 
      id,
      createdAt: new Date() 
    };
    this.questions.set(id, newQuestion);
    return newQuestion;
  }
  
  async getSessionQuestions(sessionId: number): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(question => question.sessionId === sessionId);
  }
  
  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  
  // Answer operations
  async createAnswer(answer: InsertAnswer): Promise<Answer> {
    const id = this.answerId++;
    
    // For existing questions, we'll update the answer rather than creating a new one
    const existingAnswer = await this.getQuestionAnswer(answer.questionId);
    
    if (existingAnswer) {
      // Update existing answer
      const updatedAnswer = { 
        ...existingAnswer,
        userAnswer: answer.userAnswer,
        evaluation: answer.evaluation,
        // Only include batchEvaluation if it exists in the input
        ...(answer.batchEvaluation ? { batchEvaluation: answer.batchEvaluation } : {})
      };
      this.answers.set(existingAnswer.id, updatedAnswer);
      return updatedAnswer;
    } else {
      // Create new answer
      const newAnswer = { 
        ...answer, 
        id,
        createdAt: new Date() 
      };
      this.answers.set(id, newAnswer);
      return newAnswer;
    }
  }
  
  async getQuestionAnswer(questionId: number): Promise<Answer | undefined> {
    return Array.from(this.answers.values()).find(answer => answer.questionId === questionId);
  }
  
  async getSessionQuestionsWithAnswers(sessionId: number): Promise<QuestionWithAnswer[]> {
    const questions = await this.getSessionQuestions(sessionId);
    return await Promise.all(questions.map(async (question) => {
      const answer = await this.getQuestionAnswer(question.id);
      return {
        ...question,
        answer
      };
    }));
  }
  
  // Knowledge area operations
  async createKnowledgeArea(area: InsertKnowledgeArea): Promise<KnowledgeArea> {
    const id = this.knowledgeAreaId++;
    const newArea = { 
      ...area, 
      id,
      updatedAt: new Date() 
    };
    this.knowledgeAreas.set(id, newArea);
    return newArea;
  }
  
  async updateKnowledgeArea(id: number, proficiency: number): Promise<KnowledgeArea | undefined> {
    const area = this.knowledgeAreas.get(id);
    if (!area) return undefined;
    
    const updatedArea = { 
      ...area, 
      proficiency,
      updatedAt: new Date() 
    };
    this.knowledgeAreas.set(id, updatedArea);
    return updatedArea;
  }
  
  async getSessionKnowledgeAreas(sessionId: number): Promise<KnowledgeArea[]> {
    return Array.from(this.knowledgeAreas.values()).filter(area => area.sessionId === sessionId);
  }
}

export const storage = new MemStorage();
