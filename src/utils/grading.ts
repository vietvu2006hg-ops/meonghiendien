import { Question } from '../types.ts';

export interface GradeResult {
  score: number;
  maxScore: number;
  earnedRawPoints: number;
  totalMaxRawPoints: number;
  correctCount: number;
  totalCount: number;
  accuracyRate: number;
  durationSpentSeconds: number;
  details: any[];
}

/**
 * Thuật toán chấm điểm bài thi trắc nghiệm theo chuẩn Quy chế GDPT của Bộ GD&ĐT Việt Nam
 * - Dạng trắc nghiệm nhiều lựa chọn: 1.0 điểm / câu
 * - Dạng trắc nghiệm Đúng/Sai (chùm 4 nhận định):
 *     + Đúng 1 ý: 0.1 điểm
 *     + Đúng 2 ý: 0.25 điểm
 *     + Đúng 3 ý: 0.5 điểm
 *     + Đúng 4 ý: 1.0 điểm
 * - Quy đổi về thang điểm 10 chuẩn.
 */
export function gradeExam(
  questions: Question[],
  userAnswers: Record<string, any>,
  durationSpentSeconds: number = 0
): GradeResult {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return {
      score: 0,
      maxScore: 10.0,
      earnedRawPoints: 0,
      totalMaxRawPoints: 0,
      correctCount: 0,
      totalCount: 0,
      accuracyRate: 0,
      durationSpentSeconds,
      details: [],
    };
  }

  const answers = userAnswers || {};
  let earnedRawPoints = 0;
  let totalMaxRawPoints = 0;
  let fullyCorrectQuestions = 0;

  const details = questions.map((q: Question, idx: number) => {
    const qId = q.id || `q_${idx}`;

    if (q.type === 'multiple_choice') {
      totalMaxRawPoints += 1.0;
      const studentAns = answers[qId];
      const isCorrect = studentAns === q.correctAnswer;
      const scoreEarned = isCorrect ? 1.0 : 0.0;
      earnedRawPoints += scoreEarned;
      if (isCorrect) fullyCorrectQuestions += 1;

      return {
        questionId: qId,
        type: 'multiple_choice',
        question: q.question,
        options: q.options,
        userAnswer: studentAns || null,
        correctAnswer: q.correctAnswer,
        isCorrect,
        scoreEarned,
        maxScore: 1.0,
        explanation: q.explanation || 'Không có lời giải chi tiết.',
      };
    } else if (q.type === 'true_false') {
      // True/False 4 statements cluster
      totalMaxRawPoints += 1.0;
      const statements = q.statements || [];
      const studentCluster = answers[qId] || {};
      let correctStatementCount = 0;

      const statementDetails = statements.map((st: any) => {
        const userVal = studentCluster[st.id]; // true | false | undefined
        const isStCorrect = userVal === st.isCorrect;
        if (isStCorrect) correctStatementCount += 1;
        return {
          id: st.id,
          text: st.text,
          userAnswer: userVal !== undefined ? userVal : null,
          correctAnswer: st.isCorrect,
          isCorrect: isStCorrect,
          explanation: st.explanation,
        };
      });

      // Công thức tính điểm Đúng/Sai chuẩn GDPT
      let scoreEarned = 0;
      if (correctStatementCount === 1) scoreEarned = 0.1;
      else if (correctStatementCount === 2) scoreEarned = 0.25;
      else if (correctStatementCount === 3) scoreEarned = 0.5;
      else if (correctStatementCount === 4) scoreEarned = 1.0;

      earnedRawPoints += scoreEarned;
      if (correctStatementCount === statements.length && statements.length > 0) {
        fullyCorrectQuestions += 1;
      }

      return {
        questionId: qId,
        type: 'true_false',
        context: q.context,
        question: q.question,
        statements: statementDetails,
        correctStatementCount,
        totalStatements: statements.length,
        isCorrect: correctStatementCount === statements.length,
        scoreEarned,
        maxScore: 1.0,
      };
    }
    return null;
  }).filter(Boolean);

  // Quy về thang điểm 10
  let finalScore = 0;
  if (totalMaxRawPoints > 0) {
    finalScore = (earnedRawPoints / totalMaxRawPoints) * 10;
    finalScore = Math.round(finalScore * 100) / 100; // Làm tròn 2 chữ số thập phân
  }

  const accuracyRate = totalMaxRawPoints > 0
    ? Math.round((earnedRawPoints / totalMaxRawPoints) * 100)
    : 0;

  return {
    score: finalScore,
    maxScore: 10.0,
    earnedRawPoints: Math.round(earnedRawPoints * 100) / 100,
    totalMaxRawPoints,
    correctCount: fullyCorrectQuestions,
    totalCount: questions.length,
    accuracyRate,
    durationSpentSeconds,
    details,
  };
}
