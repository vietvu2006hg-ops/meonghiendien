import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { ExamSubmission } from '../types.ts';

interface ExamResultViewProps {
  submission: ExamSubmission;
  onBackToDashboard: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  submission,
  onBackToDashboard,
}) => {
  const [showReview, setShowReview] = useState(true);

  const mins = Math.floor(submission.durationSpentSeconds / 60);
  const secs = submission.durationSpentSeconds % 60;

  // Grade classification
  let gradeBadge = { label: 'Cần cố gắng', color: 'bg-rose-100 text-rose-800 border-rose-200' };
  if (submission.score >= 9.0) {
    gradeBadge = { label: 'Xuất sắc', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  } else if (submission.score >= 8.0) {
    gradeBadge = { label: 'Giỏi', color: 'bg-teal-100 text-teal-800 border-teal-300' };
  } else if (submission.score >= 6.5) {
    gradeBadge = { label: 'Khá', color: 'bg-blue-100 text-blue-800 border-blue-300' };
  } else if (submission.score >= 5.0) {
    gradeBadge = { label: 'Trung bình', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* ================= BIG SCORE HERO BANNER ================= */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-8 sm:p-10 text-white text-center shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-indigo-200 border border-white/10">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Kết quả thi chính thức</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {submission.examTitle}
          </h1>

          <p className="text-xs text-indigo-200">
            Thí sinh: <strong>{submission.studentName}</strong> ({submission.studentEmail})
          </p>

          {/* GIANT SCORE DISPLAY */}
          <div className="py-4">
            <div className="inline-flex flex-col items-center">
              <span className="text-7xl sm:text-8xl font-black tracking-tight text-white drop-shadow-md">
                {submission.score.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest mt-1">
                Thang điểm 10.0
              </span>
            </div>
          </div>

          <div className="inline-block">
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${gradeBadge.color}`}>
              Xếp loại: {gradeBadge.label}
            </span>
          </div>

          {/* Summary metrics row */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-2xl p-3 backdrop-blur-sm">
              <div className="text-slate-400 text-[11px] mb-0.5">Số câu đúng</div>
              <div className="text-base font-extrabold text-white">
                {submission.correctCount} / {submission.totalCount}
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 backdrop-blur-sm">
              <div className="text-slate-400 text-[11px] mb-0.5">Độ chính xác</div>
              <div className="text-base font-extrabold text-emerald-400">
                {submission.accuracyRate}%
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 backdrop-blur-sm">
              <div className="text-slate-400 text-[11px] mb-0.5">Thời gian làm</div>
              <div className="text-base font-extrabold text-teal-300 font-mono">
                {mins}p {secs}s
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về danh sách đề thi</span>
            </button>
            <button
              onClick={() => setShowReview(!showReview)}
              className="px-6 py-2.5 bg-indigo-600/60 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>{showReview ? 'Ẩn lời giải chi tiết' : 'Xem lại bài làm & Lời giải'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= DETAILED QUESTION-BY-QUESTION REVIEW ================= */}
      {showReview && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Xem lại bài làm & Lời giải chi tiết
              </h2>
              <p className="text-xs text-slate-500">
                Đối chiếu câu trả lời của bạn với đáp án chuẩn và lời giải thích từ giáo viên.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {submission.details?.length || 0} câu hỏi
            </span>
          </div>

          <div className="space-y-4">
            {submission.details?.map((item, idx) => {
              return (
                <div
                  key={item.questionId || idx}
                  className={`bg-white rounded-3xl p-6 border shadow-xs space-y-4 transition ${
                    item.isCorrect
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : 'border-rose-200 bg-rose-50/10'
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center text-white ${
                          item.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {item.type === 'multiple_choice' ? 'Trắc nghiệm 4 lựa chọn' : 'Trắc nghiệm Đúng/Sai'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold">
                      {item.isCorrect ? (
                        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Chính xác (+{item.scoreEarned.toFixed(2)}đ)</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Chưa đạt (+{item.scoreEarned.toFixed(2)}đ)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Context if true/false */}
                  {item.context && (
                    <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl text-xs text-purple-950 font-serif leading-relaxed">
                      <strong className="block font-sans text-purple-800 text-[11px] uppercase mb-1">
                        Bối cảnh:
                      </strong>
                      {item.context}
                    </div>
                  )}

                  {/* Question text */}
                  <div className="text-sm font-bold text-slate-900 leading-relaxed">
                    {item.question}
                  </div>

                  {/* Review: Multiple Choice */}
                  {item.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {item.options?.map((opt) => {
                          const isUserAnswer = item.userAnswer === opt.id;
                          const isCorrectAnswer = item.correctAnswer === opt.id;

                          let badgeClass = 'border-slate-200 bg-white text-slate-700';
                          if (isCorrectAnswer) {
                            badgeClass = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-400';
                          } else if (isUserAnswer && !item.isCorrect) {
                            badgeClass = 'border-rose-400 bg-rose-50 text-rose-950 font-semibold ring-1 ring-rose-400';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-2xl border flex items-center gap-2.5 ${badgeClass}`}
                            >
                              <div
                                className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                  isCorrectAnswer
                                    ? 'bg-emerald-600 text-white'
                                    : isUserAnswer
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {opt.id}
                              </div>
                              <span className="flex-1 text-xs">{opt.text}</span>
                              {isCorrectAnswer && (
                                <span className="text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                  Đáp án đúng
                                </span>
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <span className="text-[10px] font-extrabold uppercase bg-rose-600 text-white px-1.5 py-0.5 rounded">
                                  Bạn đã chọn
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {item.explanation && (
                        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-blue-800">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Lời giải chi tiết:</span>
                          </div>
                          <p className="leading-relaxed">{item.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review: True / False */}
                  {item.type === 'true_false' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {item.statements?.map((st) => (
                          <div
                            key={st.id}
                            className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              st.isCorrect
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-rose-50/40 border-rose-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                                {st.id})
                              </span>
                              <span className="text-slate-800 font-medium">{st.text}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-bold">
                              <span className="text-[11px] text-slate-500">
                                Bạn chọn: <strong>{st.userAnswer === true ? 'ĐÚNG' : st.userAnswer === false ? 'SAI' : 'Chưa chọn'}</strong>
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="text-[11px] text-emerald-700">
                                Đáp án: <strong>{st.correctAnswer ? 'ĐÚNG' : 'SAI'}</strong>
                              </span>
                              {st.isCorrect ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <X className="w-4 h-4 text-rose-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* True/false score explanation */}
                      <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs text-purple-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-purple-800">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Quy chuẩn chấm điểm GDPT:</span>
                        </div>
                        <p className="leading-relaxed">
                          Đúng {item.correctStatementCount}/{item.totalStatements} ý. Điểm nhận được cho câu này: <strong>{item.scoreEarned} điểm</strong> (Chuẩn BGD&ĐT: 1 ý = 0.1đ; 2 ý = 0.25đ; 3 ý = 0.5đ; 4 ý = 1.0đ).
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
