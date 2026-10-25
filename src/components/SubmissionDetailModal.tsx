import React, { useState, useEffect, useMemo } from 'react';
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
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
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
  // Fullscreen state - Default true as requested by user
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Expanded options state for individual questions (default false: only show student answer & correct answer)
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Reconstruct or extract details
  const details: QuestionResultDetail[] = useMemo(() => {
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

  // Default to 'wrong_only' as teacher clicked "Xem câu sai"
  const [activeFilter, setActiveFilter] = useState<'wrong_only' | 'all'>(
    wrongQuestions.length > 0 ? 'wrong_only' : 'all'
  );

  const displayedList = activeFilter === 'wrong_only' ? wrongQuestions : details;

  const mins = Math.floor(submission.durationSpentSeconds / 60);
  const secs = submission.durationSpentSeconds % 60;

  const toggleExpandOptions = (qid: string) => {
    setExpandedOptions((prev) => ({
      ...prev,
      [qid]: !prev[qid],
    }));
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-slate-900/95 backdrop-blur-sm flex flex-col ${
        isFullscreen ? 'w-screen h-screen p-0' : 'p-2 sm:p-4 lg:p-6 items-center justify-center'
      } animate-in fade-in duration-150`}
    >
      <div
        className={`bg-slate-100 flex flex-col overflow-hidden shadow-2xl transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-6xl max-h-[94vh] rounded-3xl border border-slate-300'
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative flex-shrink-0 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-xs">
                  Chi tiết bài làm học sinh
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Thời điểm nộp: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                {submission.studentName}
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200 flex flex-wrap items-center gap-2">
                <span className="font-mono text-slate-300">{submission.studentEmail}</span>
                <span>•</span>
                <span className="font-semibold text-white">{submission.examTitle}</span>
              </p>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2.5 text-slate-300 hover:text-white hover:bg-white/15 rounded-xl transition"
                title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 text-slate-300 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl transition"
                title="Đóng cửa sổ (ESC)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs border border-white/5">
              <span className="text-[11px] text-slate-300 block font-medium">Điểm số</span>
              <span className="text-2xl font-black text-amber-300">
                {submission.score.toFixed(2)}
                <span className="text-xs font-normal text-slate-300 ml-1">/ 10</span>
              </span>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs border border-white/5">
              <span className="text-[11px] text-slate-300 block font-medium">Số câu đúng</span>
              <span className="text-2xl font-black text-emerald-300">
                {submission.correctCount}
                <span className="text-xs font-normal text-slate-300 ml-1">/ {submission.totalCount}</span>
              </span>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs border border-white/5">
              <span className="text-[11px] text-slate-300 block font-medium">Số câu làm sai</span>
              <span className="text-2xl font-black text-rose-300">
                {wrongQuestions.length}
                <span className="text-xs font-normal text-slate-300 ml-1">câu</span>
              </span>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs border border-white/5">
              <span className="text-[11px] text-slate-300 block font-medium">Thời gian làm bài</span>
              <span className="text-2xl font-black text-indigo-200 font-mono">
                {mins}p {secs}s
              </span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-3 sm:px-8 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-500" />
              Chế độ xem:
            </span>
            <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveFilter('wrong_only')}
                className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === 'wrong_only'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Chỉ xem câu làm sai</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
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
                className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListChecks className="w-4 h-4" />
                <span>Xem tất cả câu hỏi</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeFilter === 'all'
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {details.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span>
              Đang hiển thị <strong className="text-slate-900 font-black">{displayedList.length}</strong> câu
            </span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:inline text-slate-500">
              Nhấn <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[11px] text-slate-700">ESC</kbd> để đóng
            </span>
          </div>
        </div>

        {/* Scrollable Question Content */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-slate-100/70">
          {displayedList.length === 0 ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-sm">
                🎉
              </div>
              <h3 className="font-black text-slate-900 text-lg">
                Không có câu làm sai nào!
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Học sinh <strong className="text-slate-800">{submission.studentName}</strong> đã hoàn thành xuất sắc và trả lời chính xác tất cả các câu hỏi trong bài kiểm tra này.
              </p>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs transition shadow-xs cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Xem toàn bộ đề thi & bài làm</span>
              </button>
            </div>
          ) : (
            displayedList.map((item, originalIdx) => {
              // Find index in overall exam
              const fullIdx = details.findIndex((d) => d.questionId === item.questionId);
              const displayNum = fullIdx !== -1 ? fullIdx + 1 : originalIdx + 1;
              const isOptionExpanded = !!expandedOptions[item.questionId];

              // Find option texts for multiple choice
              const userOpt = item.options?.find((o) => o.id === item.userAnswer);
              const correctOpt = item.options?.find((o) => o.id === item.correctAnswer);

              return (
                <div
                  key={item.questionId || originalIdx}
                  className={`p-5 sm:p-6 rounded-3xl border-2 transition space-y-5 bg-white shadow-xs ${
                    item.isCorrect
                      ? 'border-emerald-300/80 ring-1 ring-emerald-200'
                      : 'border-rose-400/90 ring-2 ring-rose-200/70'
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-9 h-9 rounded-2xl font-black text-sm flex items-center justify-center text-white shrink-0 shadow-sm ${
                          item.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      >
                        {displayNum}
                      </span>
                      <div>
                        <span className="text-sm font-extrabold text-slate-800">
                          {item.type === 'multiple_choice'
                            ? 'Trắc nghiệm 4 lựa chọn (Phần I)'
                            : 'Trắc nghiệm Đúng / Sai (Phần II)'}
                        </span>
                        <div className="text-xs text-slate-500 font-medium">
                          Điểm đạt:{' '}
                          <span className={item.isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            +{item.scoreEarned.toFixed(2)}đ
                          </span>{' '}
                          / {item.maxScore.toFixed(2)}đ
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isCorrect ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-black shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Học sinh làm đúng (+{item.scoreEarned.toFixed(2)}đ)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-rose-800 bg-rose-100 border border-rose-300 px-3.5 py-1.5 rounded-full text-xs font-black shadow-2xs">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Học sinh làm sai (+{item.scoreEarned.toFixed(2)}đ)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Context for True/False */}
                  {item.context && (
                    <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-950 font-serif leading-relaxed">
                      <strong className="block font-sans text-amber-900 text-xs font-bold uppercase tracking-wider mb-1">
                        Bối cảnh đề bài:
                      </strong>
                      {item.context}
                    </div>
                  )}

                  {/* Question text */}
                  <div className="text-base sm:text-lg font-black text-slate-900 leading-relaxed bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200">
                    {item.question}
                  </div>

                  {/* ================= MULTIPLE CHOICE: ONLY SHOW USER ANSWER & CORRECT ANSWER ================= */}
                  {item.type === 'multiple_choice' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Đáp án học sinh chọn */}
                        <div
                          className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition ${
                            item.isCorrect
                              ? 'bg-emerald-50/60 border-emerald-400 text-emerald-950'
                              : !item.userAnswer
                              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                              : 'bg-rose-50/70 border-rose-400 text-rose-950'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-current/15">
                              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                {item.isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-rose-600" />
                                )}
                                Đáp án học sinh chọn
                              </span>
                              <span
                                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                  item.isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : !item.userAnswer
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-rose-600 text-white'
                                }`}
                              >
                                {item.isCorrect
                                  ? 'CHÍNH XÁC'
                                  : !item.userAnswer
                                  ? 'BỎ TRỐNG'
                                  : 'LÀM SAI'}
                              </span>
                            </div>

                            {item.userAnswer ? (
                              <div className="flex items-start gap-3.5 pt-1">
                                <span
                                  className={`w-9 h-9 rounded-xl font-black text-base flex items-center justify-center shrink-0 shadow-xs ${
                                    item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                  }`}
                                >
                                  {item.userAnswer}
                                </span>
                                <div className="text-sm sm:text-base font-bold leading-relaxed pt-1 text-slate-900">
                                  {userOpt?.text || item.userAnswer}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs sm:text-sm font-semibold text-amber-900 italic pt-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Học sinh bỏ trống, không chọn đáp án nào cho câu hỏi này.</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Đáp án đúng của đề thi */}
                        <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 text-emerald-950 flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-emerald-200">
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                                Đáp án đúng chính xác
                              </span>
                              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                                ĐÁP ÁN CHUẨN
                              </span>
                            </div>

                            <div className="flex items-start gap-3.5 pt-1">
                              <span className="w-9 h-9 rounded-xl font-black text-base flex items-center justify-center shrink-0 bg-emerald-600 text-white shadow-xs">
                                {item.correctAnswer || 'A'}
                              </span>
                              <div className="text-sm sm:text-base font-black text-slate-900 leading-relaxed pt-1">
                                {correctOpt?.text || item.correctAnswer}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Optional Expandable: View full 4 options if teacher wants */}
                      {item.options && item.options.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => toggleExpandOptions(item.questionId)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                          >
                            {isOptionExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>Ẩn bớt danh sách 4 phương án</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>Xem toàn bộ 4 phương án đề bài (A, B, C, D)</span>
                              </>
                            )}
                          </button>

                          {isOptionExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs animate-in fade-in duration-150">
                              {item.options.map((opt) => {
                                const isOfficial = opt.id === item.correctAnswer;
                                const isChosen = opt.id === item.userAnswer;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                      isOfficial
                                        ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950'
                                        : isChosen
                                        ? 'bg-rose-50 border-rose-300 font-semibold text-rose-950'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className={`w-5 h-5 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${
                                          isOfficial
                                            ? 'bg-emerald-600 text-white'
                                            : isChosen
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {opt.id}
                                      </span>
                                      <span className="truncate">{opt.text}</span>
                                    </div>
                                    <div className="shrink-0 text-[10px] font-bold">
                                      {isOfficial && <span className="text-emerald-700">Đáp án đúng</span>}
                                      {isChosen && !isOfficial && <span className="text-rose-700">Học sinh chọn</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ================= TRUE / FALSE: CLEAR STATEMENT COMPARISON ================= */}
                  {item.type === 'true_false' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-600">
                        <span>Chi tiết từng nhận định Đúng / Sai:</span>
                        <span className="text-slate-500 font-medium">
                          Học sinh đúng {item.correctStatementCount || 0} / {(item.statements || []).length} nhận định
                        </span>
                      </div>

                      <div className="space-y-3">
                        {item.statements?.map((st) => {
                          const userVal = st.userAnswer;
                          const isStCorrect = userVal === st.correctAnswer;

                          return (
                            <div
                              key={st.id}
                              className={`p-4 rounded-2xl border-2 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm ${
                                isStCorrect
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : 'bg-rose-50/60 border-rose-300 shadow-2xs ring-1 ring-rose-200'
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <span
                                  className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-xs ${
                                    isStCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-rose-600 text-white'
                                  }`}
                                >
                                  {st.id}
                                </span>
                                <div className="space-y-1">
                                  <div className="font-bold text-slate-900 leading-snug">
                                    {st.text}
                                  </div>
                                  {st.explanation && (
                                    <p className="text-xs text-slate-600 italic">
                                      {st.explanation}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-end md:self-center bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                                {/* Student choice */}
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-slate-500 font-medium">Học sinh chọn:</span>
                                  <span
                                    className={`font-black px-2.5 py-1 rounded-lg text-xs ${
                                      userVal === null || userVal === undefined
                                        ? 'bg-amber-100 text-amber-800'
                                        : isStCorrect
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {userVal === true
                                      ? 'ĐÚNG'
                                      : userVal === false
                                      ? 'SAI'
                                      : 'BỎ TRỐNG'}
                                  </span>
                                </div>

                                <span className="text-slate-300">•</span>

                                {/* Correct key */}
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-slate-500 font-medium">Đáp án đúng:</span>
                                  <span className="font-black px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs">
                                    {st.correctAnswer ? 'ĐÚNG' : 'SAI'}
                                  </span>
                                </div>

                                {isStCorrect ? (
                                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Đúng
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-1 rounded-md flex items-center gap-1">
                                    <X className="w-3.5 h-3.5 stroke-[3]" /> Sai
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
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs sm:text-sm text-indigo-950 space-y-1.5">
                      <div className="flex items-center gap-2 font-black text-indigo-900">
                        <HelpCircle className="w-4 h-4 text-indigo-600" />
                        <span>Kiến thức cốt lõi & Hướng dẫn giải chi tiết:</span>
                      </div>
                      <p className="leading-relaxed pl-6 text-indigo-900/90 whitespace-pre-line">
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
        <div className="px-5 py-4 sm:px-8 bg-white border-t border-slate-200 flex items-center justify-between gap-4 flex-shrink-0 shadow-md">
          <div className="text-xs sm:text-sm text-slate-600 font-medium">
            Tổng cộng: <strong className="text-slate-900 font-black">{details.length}</strong> câu (
            <span className="text-rose-600 font-bold">{wrongQuestions.length} câu làm sai</span>,{' '}
            <span className="text-emerald-600 font-bold">{correctQuestions.length} câu làm đúng</span>)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm transition shadow-sm cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
