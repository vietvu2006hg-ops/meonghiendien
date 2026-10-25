import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Filter,
  Check,
  HelpCircle,
  BookOpen,
  FileText,
  AlertCircle,
  Eye,
  ListChecks,
} from 'lucide-react';
import { Exam, ExamSubmission, QuestionResultDetail, QuestionType } from '../types.ts';

interface SubmissionDetailModalProps {
  submission: ExamSubmission;
  exams: Exam[];
  onClose: () => void;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  submission,
  exams,
  onClose,
}) => {
  // Reconstruct or extract details
  const details: QuestionResultDetail[] = React.useMemo(() => {
    if (submission.details && submission.details.length > 0) {
      return submission.details;
    }
    // Fallback: reconstruct from exam questions if details array wasn't stored
    const exam = exams.find((e) => e.id === submission.examId);
    if (!exam || !exam.questions) return [];

    return exam.questions.map((q) => {
      const userAns = submission.answers ? submission.answers[q.id] : undefined;
      if (q.type === 'multiple_choice') {
        const isCorrect = userAns === q.correctAnswer;
        return {
          questionId: q.id,
          type: q.type,
          question: q.question,
          context: q.context,
          options: q.options,
          userAnswer: userAns || null,
          correctAnswer: q.correctAnswer,
          isCorrect,
          scoreEarned: isCorrect ? 0.25 : 0,
          maxScore: 0.25,
          explanation: q.explanation,
        };
      } else {
        const statements = (q.statements || []).map((st) => {
          const uVal = userAns ? userAns[st.id] : null;
          const isStCorrect = uVal === st.isCorrect;
          return {
            id: st.id,
            text: st.text,
            userAnswer: uVal !== undefined ? uVal : null,
            correctAnswer: st.isCorrect,
            isCorrect: isStCorrect,
            explanation: st.explanation,
          };
        });
        const correctStatements = statements.filter((s) => s.isCorrect).length;
        return {
          questionId: q.id,
          type: q.type,
          question: q.question,
          context: q.context,
          statements,
          isCorrect: correctStatements === statements.length,
          correctStatementCount: correctStatements,
          totalStatements: statements.length,
          scoreEarned:
            correctStatements === 4
              ? 1.0
              : correctStatements === 3
              ? 0.5
              : correctStatements === 2
              ? 0.25
              : correctStatements === 1
              ? 0.1
              : 0,
          maxScore: 1.0,
          explanation: q.explanation,
        };
      }
    });
  }, [submission, exams]);

  const wrongQuestions = details.filter((d) => !d.isCorrect);
  const correctQuestions = details.filter((d) => d.isCorrect);

  const [activeFilter, setActiveFilter] = useState<'wrong_only' | 'all'>(
    wrongQuestions.length > 0 ? 'wrong_only' : 'all'
  );

  const displayedList = activeFilter === 'wrong_only' ? wrongQuestions : details;

  const mins = Math.floor(submission.durationSpentSeconds / 60);
  const secs = submission.durationSpentSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Chi tiết bài làm học sinh
                </span>
                <span className="text-xs text-slate-300">
                  Thời điểm nộp: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {submission.studentName}
              </h2>
              <p className="text-xs text-indigo-200 flex items-center gap-2">
                <span>{submission.studentEmail}</span>
                <span>•</span>
                <span className="font-semibold text-white">{submission.examTitle}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="text-[11px] text-slate-300 block">Điểm số</span>
              <span className="text-xl font-black text-amber-300">
                {submission.score.toFixed(2)}
                <span className="text-xs font-normal text-slate-300 ml-1">/ 10</span>
              </span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="text-[11px] text-slate-300 block">Số câu đúng</span>
              <span className="text-xl font-black text-emerald-300">
                {submission.correctCount}
                <span className="text-xs font-normal text-slate-300 ml-1">/ {submission.totalCount}</span>
              </span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="text-[11px] text-slate-300 block">Số câu làm sai</span>
              <span className="text-xl font-black text-rose-300">
                {wrongQuestions.length}
                <span className="text-xs font-normal text-slate-300 ml-1">câu</span>
              </span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="text-[11px] text-slate-300 block">Thời gian làm bài</span>
              <span className="text-xl font-black text-indigo-200 font-mono">
                {mins}p {secs}s
              </span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Chế độ xem:
            </span>
            <div className="flex p-0.5 bg-slate-200/70 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveFilter('wrong_only')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeFilter === 'wrong_only'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Chỉ xem câu làm sai</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeFilter === 'wrong_only'
                      ? 'bg-white/25 text-white'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {wrongQuestions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Xem tất cả câu hỏi</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeFilter === 'all'
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {details.length}
                </span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <span className="font-bold text-slate-800">{displayedList.length}</span> câu hỏi
          </div>
        </div>

        {/* Scrollable Question Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {displayedList.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shadow-sm">
                🎉
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Không có câu làm sai nào!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Học sinh này đã trả lời chính xác tất cả các câu hỏi trong bài kiểm tra.
              </p>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs border border-indigo-200 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                Xem toàn bộ bài làm
              </button>
            </div>
          ) : (
            displayedList.map((item, originalIdx) => {
              // Find index in overall exam
              const fullIdx = details.findIndex((d) => d.questionId === item.questionId);
              const displayNum = fullIdx !== -1 ? fullIdx + 1 : originalIdx + 1;

              return (
                <div
                  key={item.questionId || originalIdx}
                  className={`p-5 rounded-3xl border transition space-y-4 ${
                    item.isCorrect
                      ? 'border-emerald-200 bg-emerald-50/15'
                      : 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center text-white shrink-0 ${
                          item.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      >
                        {displayNum}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {item.type === 'multiple_choice'
                          ? 'Trắc nghiệm 4 lựa chọn (Phần I)'
                          : 'Trắc nghiệm Đúng/Sai (Phần II)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Làm đúng (+{item.scoreEarned.toFixed(2)}đ)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-100 border border-rose-300 px-3 py-1 rounded-full text-xs font-extrabold animate-pulse">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Làm sai (+{item.scoreEarned.toFixed(2)}đ)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Context for True/False */}
                  {item.context && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-950 font-serif leading-relaxed">
                      <strong className="block font-sans text-amber-800 text-[11px] uppercase mb-1">
                        Bối cảnh đề bài:
                      </strong>
                      {item.context}
                    </div>
                  )}

                  {/* Question text */}
                  <div className="text-sm font-bold text-slate-900 leading-relaxed">
                    {item.question}
                  </div>

                  {/* Question content: Multiple Choice */}
                  {item.type === 'multiple_choice' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {item.options?.map((opt) => {
                          const isUserSelected = item.userAnswer === opt.id;
                          const isOfficialKey = item.correctAnswer === opt.id;

                          let containerStyle = 'border-slate-200 bg-white text-slate-700';
                          if (isOfficialKey && isUserSelected) {
                            // User chose right!
                            containerStyle = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold ring-2 ring-emerald-400';
                          } else if (isOfficialKey && !isUserSelected) {
                            // Official key that student missed
                            containerStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold ring-2 ring-emerald-500';
                          } else if (isUserSelected && !isOfficialKey) {
                            // Student's wrong selection
                            containerStyle = 'border-rose-400 bg-rose-50 text-rose-950 font-semibold ring-2 ring-rose-400';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition ${containerStyle}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                    isOfficialKey
                                      ? 'bg-emerald-600 text-white'
                                      : isUserSelected
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {opt.id}
                                </div>
                                <span className="text-xs break-words">{opt.text}</span>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {isOfficialKey && (
                                  <span className="text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                                    Đáp án đúng
                                  </span>
                                )}
                                {isUserSelected && !isOfficialKey && (
                                  <span className="text-[10px] font-extrabold uppercase bg-rose-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                                    Học sinh chọn
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {!item.userAnswer && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Học sinh bỏ trống không chọn đáp án nào cho câu hỏi này.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question content: True / False */}
                  {item.type === 'true_false' && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Chi tiết từng ý con (a, b, c, d):
                      </div>
                      <div className="space-y-2">
                        {item.statements?.map((st) => {
                          const userVal = st.userAnswer;
                          const isStCorrect = userVal === st.correctAnswer;

                          return (
                            <div
                              key={st.id}
                              className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                                isStCorrect
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : 'bg-rose-50/50 border-rose-200'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 flex-1">
                                <span
                                  className={`w-5 h-5 rounded-md font-bold text-[11px] flex items-center justify-center shrink-0 uppercase ${
                                    isStCorrect
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {st.id}
                                </span>
                                <span className="font-medium text-slate-800 text-xs leading-snug">
                                  {st.text}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {/* Student answer */}
                                <div className="text-[11px] text-slate-500">
                                  Học sinh chọn:{' '}
                                  <span
                                    className={`font-bold px-1.5 py-0.5 rounded ${
                                      userVal === null || userVal === undefined
                                        ? 'bg-slate-200 text-slate-700'
                                        : userVal === st.correctAnswer
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {userVal === true
                                      ? 'ĐÚNG'
                                      : userVal === false
                                      ? 'SAI'
                                      : 'Bỏ trống'}
                                  </span>
                                </div>

                                {/* Answer key */}
                                <div className="text-[11px] text-slate-500">
                                  Đáp án:{' '}
                                  <span className="font-extrabold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                    {st.correctAnswer ? 'ĐÚNG' : 'SAI'}
                                  </span>
                                </div>

                                {isStCorrect ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Đúng
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <X className="w-3 h-3" /> Sai
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Explanation box */}
                  {item.explanation && (
                    <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span>Kiến thức cốt lõi & Hướng dẫn giải:</span>
                      </div>
                      <p className="leading-relaxed pl-5 text-blue-900/90 whitespace-pre-line">
                        {item.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-slate-800">{details.length}</strong> câu ({wrongQuestions.length} câu làm sai)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition shadow-xs"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
