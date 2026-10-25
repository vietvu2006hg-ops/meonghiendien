export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export type QuestionType = 'multiple_choice' | 'true_false';

export interface OptionChoice {
  id: 'A' | 'B' | 'C' | 'D' | string;
  text: string;
}

export interface StatementItem {
  id: 'a' | 'b' | 'c' | 'd' | string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  context?: string; // Bối cảnh cho câu hỏi Đúng/Sai
  options?: OptionChoice[]; // Dành cho câu hỏi trắc nghiệm 4 lựa chọn
  correctAnswer?: string; // Dành cho câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D)
  statements?: StatementItem[]; // Dành cho câu hỏi Đúng/Sai (a, b, c, d)
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  teacherId: string;
  teacherName: string;
  status: 'published' | 'draft' | 'closed';
  questions: Question[];
  createdAt: string;
  updatedAt?: string;
}

export interface StatementDetail {
  id: string;
  text: string;
  userAnswer: boolean | null;
  correctAnswer: boolean;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuestionResultDetail {
  questionId: string;
  type: QuestionType;
  question: string;
  context?: string;
  options?: OptionChoice[];
  userAnswer?: string | null;
  correctAnswer?: string;
  isCorrect: boolean;
  scoreEarned: number;
  maxScore: number;
  explanation?: string;
  statements?: StatementDetail[];
  correctStatementCount?: number;
  totalStatements?: number;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number; // Thang 10
  earnedRawPoints: number;
  totalMaxRawPoints: number;
  correctCount: number;
  totalCount: number;
  accuracyRate: number; // 0 - 100%
  durationSpentSeconds: number;
  answers: Record<string, any>; // questionId -> answer
  details: QuestionResultDetail[];
  submittedAt: string;
}

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}
