import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  AlertTriangle,
  User,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Exam, ExamSubmission, Question, UserProfile } from '../types.ts';
import { submitExamResult } from '../firebase/service.ts';
import { gradeExam } from '../utils/grading.ts';

interface ExamRunnerProps {
  exam: Exam;
  currentUser: UserProfile;
  onFinishExam: (submission: ExamSubmission) => void;
  onCancel: () => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  exam,
  currentUser,
  onFinishExam,
  onCancel,
}) => {
  // Randomize questions & option orders on start
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User answers map: questionId -> answer
  // For multiple_choice: answer is string ('A' | 'B' | 'C' | 'D')
  // For true_false: answer is Record<string, boolean> ({ a: true, b: false, ... })
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Countdown timer in seconds
  const initialDurationSeconds = exam.durationMinutes * 60;
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(initialDurationSeconds);
  const startTimeRef = useRef(Date.now());

  // Confirm early submit modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize randomized questions
  useEffect(() => {
    // Clone questions
    const qList = [...(exam.questions || [])];

    // Fisher-Yates shuffle
    for (let i = qList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qList[i], qList[j]] = [qList[j], qList[i]];
    }

    // For multiple choice questions, optionally shuffle options while preserving IDs
    const randomized = qList.map((q) => {
      if (q.type === 'multiple_choice' && q.options) {
        const opts = [...q.options];
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        return { ...q, options: opts };
      }
      return q;
    });

    setShuffledQuestions(randomized);
  }, [exam]);

  // Timer countdown
  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      handleForceSubmit('Hết giờ làm bài! Hệ thống tự động thu bài.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  // Check if a question has been answered
  const isQuestionAnswered = (q: Question) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.type === 'multiple_choice') {
      return typeof ans === 'string' && ans.length > 0;
    }
    if (q.type === 'true_false') {
      const stCount = q.statements?.length || 4;
      const answeredCount = Object.keys(ans).filter((k) => ans[k] !== undefined && ans[k] !== null).length;
      return answeredCount >= stCount;
    }
    return false;
  };

  // Count answered questions
  const totalQuestions = shuffledQuestions.length;
  const answeredCount = shuffledQuestions.filter(isQuestionAnswered).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Handle choice selection for multiple choice
  const handleSelectOption = (qId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: optionId,
    }));
  };

  // Handle statement true/false choice
  const handleSelectStatement = (qId: string, statementId: string, value: boolean) => {
    setAnswers((prev) => {
      const currentCluster = prev[qId] || {};
      return {
        ...prev,
        [qId]: {
          ...currentCluster,
          [statementId]: value,
        },
      };
    });
  };

  // Submit test
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const timeSpent = Math.min(
        initialDurationSeconds,
        Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
      );

      // Direct client-side standardized grading (supports static GitHub Pages)
      const gradeResult = gradeExam(exam.questions, answers, timeSpent);

      // Fire celebratory confetti for achievement
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      // Save submission to Firestore
      const newSubmission = await submitExamResult({
        examId: exam.id,
        examTitle: exam.title,
        studentId: currentUser.uid,
        studentName: currentUser.fullName || 'Học sinh',
        studentEmail: currentUser.email,
        score: gradeResult.score,
        earnedRawPoints: gradeResult.earnedRawPoints,
        totalMaxRawPoints: gradeResult.totalMaxRawPoints,
        correctCount: gradeResult.correctCount,
        totalCount: gradeResult.totalCount,
        accuracyRate: gradeResult.accuracyRate,
        durationSpentSeconds: timeSpent,
        answers,
        details: gradeResult.details || [],
        submittedAt: new Date().toISOString(),
      });

      onFinishExam(newSubmission);
    } catch (err: any) {
      console.error('Submit error:', err);
      alert('Lỗi nộp bài: ' + err.message);
      setIsSubmitting(false);
    }
  };

  const handleForceSubmit = (reason: string) => {
    alert(reason);
    handleFinalSubmit();
  };

  // Format countdown mm:ss
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const isUrgent = timeLeftSeconds <= 300; // Under 5 minutes -> Red alert

  const currentQuestion = shuffledQuestions[currentIndex];

  if (!currentQuestion) {
    return <div className="p-12 text-center text-slate-500">Đang chuẩn bị đề thi...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ================= FIXED HEADER ================= */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs h-16">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Student Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 line-clamp-1">
                <span>{currentUser.fullName}</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] bg-slate-100 text-slate-600 rounded">
                  Học sinh
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                {exam.title}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="hidden md:flex flex-col items-center min-w-[200px]">
            <div className="flex items-center justify-between w-full text-xs font-semibold mb-1">
              <span className="text-slate-500">Tiến độ bài làm:</span>
              <span className="text-indigo-600 font-bold">
                {answeredCount}/{totalQuestions} câu
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Countdown Timer & Submit Button */}
          <div className="flex items-center gap-3">
            {/* Timer Badge: turns bright red with pulse when under 5 mins */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold border transition ${
                isUrgent
                  ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-600' : 'text-slate-500'}`} />
              <span className="text-sm">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            {/* Prominent Submit Button */}
            <button
              onClick={() => {
                if (unansweredCount > 0) {
                  setShowConfirmModal(true);
                } else {
                  handleFinalSubmit();
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition duration-150 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp bài</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 pb-12 flex-1 flex flex-col lg:flex-row gap-6">
        {/* ================= LEFT / MAIN PANEL: CURRENT QUESTION ================= */}
        <div className="flex-1 flex flex-col space-y-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              {/* Question Header Badge */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                    {currentQuestion.type === 'multiple_choice'
                      ? 'Trắc nghiệm 4 lựa chọn (A, B, C, D)'
                      : 'Trắc nghiệm Đúng / Sai (Định dạng GDPT 2025)'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  Câu {currentIndex + 1} / {totalQuestions}
                </span>
              </div>

              {/* Multiple Choice Card */}
              {currentQuestion.type === 'multiple_choice' && (
                <div className="space-y-6">
                  <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                    {currentQuestion.question}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options?.map((option) => {
                      const isSelected = answers[currentQuestion.id] === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                          className={`w-full p-4 rounded-2xl border text-left transition-all duration-150 flex items-center gap-3.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/30 text-indigo-950 font-semibold shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {option.id}
                          </div>
                          <span className="text-sm leading-normal flex-1">{option.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* True / False Cluster Card */}
              {currentQuestion.type === 'true_false' && (
                <div className="space-y-5">
                  {/* Context Block */}
                  {currentQuestion.context && (
                    <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-xs sm:text-sm text-purple-950 leading-relaxed font-serif">
                      <span className="font-sans font-bold text-purple-800 uppercase text-[11px] block mb-1">
                        Đoạn thông tin bối cảnh:
                      </span>
                      {currentQuestion.context}
                    </div>
                  )}

                  <div className="text-sm sm:text-base font-bold text-slate-900">
                    {currentQuestion.question}
                  </div>

                  {/* 4 Statements with individual True / False toggles */}
                  <div className="space-y-3">
                    {currentQuestion.statements?.map((st) => {
                      const userChoice = answers[currentQuestion.id]?.[st.id];
                      return (
                        <div
                          key={st.id}
                          className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {st.id})
                            </span>
                            <span className="text-xs sm:text-sm text-slate-800 leading-normal">
                              {st.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleSelectStatement(currentQuestion.id, st.id, true)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                userChoice === true
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Đúng</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectStatement(currentQuestion.id, st.id, false)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                userChoice === false
                                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Sai</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Question Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-100">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              <button
                type="button"
                disabled={currentIndex === totalQuestions - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL: MATRIX QUESTION NAVIGATOR ================= */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
              <span>Bảng ma trận câu hỏi</span>
              <span className="text-xs font-semibold text-indigo-600">
                {answeredCount}/{totalQuestions} đã làm
              </span>
            </h3>

            {/* Question Squares Matrix Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2.5">
              {shuffledQuestions.map((q, idx) => {
                const isAnswered = isQuestionAnswered(q);
                const isCurrent = idx === currentIndex;

                // Color coding per requirement:
                // - Đã làm: Xanh lá (bg-emerald-500 text-white)
                // - Đang xem: Viền đậm (ring-2 ring-indigo-600 border-indigo-600)
                // - Chưa làm: Trắng (bg-white border-slate-200 text-slate-700)
                let colorClass = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';
                if (isAnswered) {
                  colorClass = 'bg-emerald-500 border-emerald-600 text-white font-bold shadow-xs';
                }
                if (isCurrent) {
                  colorClass += ' ring-2 ring-indigo-600 ring-offset-2 border-indigo-600 scale-105';
                }

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${colorClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
                <span>Đã làm ({answeredCount} câu)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-white border-2 border-indigo-600" />
                <span>Đang xem</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-white border border-slate-200" />
                <span>Chưa làm ({unansweredCount} câu)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Lưu ý khi làm bài:</p>
            <p>• Khi hết giờ làm bài, hệ thống sẽ tự động thu bài và chấm điểm.</p>
            <p>• Đừng bấm tải lại trình duyệt để tránh mất thời gian làm bài.</p>
          </div>
        </div>
      </div>

      {/* ================= CONFIRMATION MODAL ================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900">Xác nhận nộp bài thi</h3>
              <p className="text-xs text-slate-500">
                Bạn vẫn còn <strong className="text-rose-600 font-bold">{unansweredCount} câu</strong> chưa làm. Bạn có chắc chắn muốn nộp bài sớm không?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowConfirmModal(false);
                  handleFinalSubmit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition cursor-pointer"
              >
                {isSubmitting ? 'Đang nộp...' : 'Nộp bài ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
