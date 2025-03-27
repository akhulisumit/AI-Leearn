import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Session schema
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  topic: text("topic").notNull(),
  stage: text("stage").notNull(), // "analysis", "feedback", "teaching", "retest"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  topic: true,
  stage: true,
});

// Question schema
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  question: text("question").notNull(),
  difficulty: text("difficulty").notNull(), // "easy", "medium", "hard"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  sessionId: true,
  question: true,
  difficulty: true,
});

// Answer schema
export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  userAnswer: text("user_answer").notNull(),
  evaluation: json("evaluation").notNull(), // Contains correctness, feedback, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnswerSchema = createInsertSchema(answers).pick({
  questionId: true,
  userAnswer: true,
  evaluation: true,
});

// KnowledgeArea schema
export const knowledgeAreas = pgTable("knowledge_areas", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  name: text("name").notNull(),
  proficiency: integer("proficiency").notNull(), // 0-100 score
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKnowledgeAreaSchema = createInsertSchema(knowledgeAreas).pick({
  sessionId: true,
  name: true,
  proficiency: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

export type KnowledgeArea = typeof knowledgeAreas.$inferSelect;
export type InsertKnowledgeArea = z.infer<typeof insertKnowledgeAreaSchema>;

// Frontend types
export interface SessionWithKnowledgeAreas extends Session {
  knowledgeAreas: KnowledgeArea[];
}

export interface QuestionWithAnswer extends Question {
  answer?: Answer;
}

export interface TestResult {
  questionsAndAnswers: {
    question: Question;
    answer: Answer;
  }[];
  totalScore: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendedAreas: string[];
}

export interface EvaluationResult {
  correctness: number; // 0-100 score
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

export interface BatchEvaluationResult {
  totalScore: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendedAreas: string[];
}

export interface AIResponse {
  text: string;
  followUpQuestions?: string[];
}
