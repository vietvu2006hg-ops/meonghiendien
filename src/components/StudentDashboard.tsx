import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  Layers,
  Play,
  Award,
  History,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Search,
} from 'lucide-react';
import { Exam, ExamSubmission, UserProfile } from '../types.ts';
import { fetchExams, fetchSubmissions } from '../firebase/service.ts';

interface StudentDashboardProps {
  currentUser: UserProfile;
  onStartExam: (exam: Exam) => void;
  onViewSubmissionDetail: (submission: ExamSubmission) => void;
  logoUrl?: string | null;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  onStartExam,
  onViewSubmissionDetail,
  logoUrl,
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [mySubmissions, setMySubmissions] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const examList = await fetchExams();
        // Only published exams
        setExams(examList.filter((e) => e.status === 'published'));

        const subList = await fetchSubmissions(undefined, currentUser.uid);
        setMySubmissions(subList);
      } catch (err) {
        console.error('Error loading student data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser.uid]);

  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {logoUrl ? (
            <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-lg shrink-0 overflow-hidden flex items-center justify-center">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-lg shrink-0">
              🐱⚡
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md">
                Mèo Nghiện Điện • Cổng Luyện Thi
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10">
                Công Nghệ Công Nghiệp
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ÔN THI CÔNG NGHỆ CÔNG NGHIỆP
            </h1>
            <p className="text-teal-100 text-sm mt-1 max-w-xl">
              Xin chào <strong>{currentUser.fullName || 'Học sinh'}</strong>! Chúc bạn ôn tập tốt với các đề thi Công nghệ Công nghiệp chuẩn GDPT mới nhất.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
          <div className="text-center">
            <div className="text-2xl font-extrabold">{exams.length}</div>
            <div className="text-[11px] text-teal-200 uppercase font-semibold">Đề thi mở</div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-2xl font-extrabold">{mySubmissions.length}</div>
            <div className="text-[11px] text-teal-200 uppercase font-semibold">Bài đã làm</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'available'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Đề thi đang mở ({exams.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử thi của tôi ({mySubmissions.length})</span>
          </button>
        </div>

        {activeTab === 'available' && (
          <div className="relative max-w-xs hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm môn học..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* TAB 1: AVAILABLE EXAMS */}
      {activeTab === 'available' && (
        <div>
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Đang tải danh sách đề thi...</div>
          ) : filteredExams.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Hiện chưa có đề thi nào đang mở</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Giáo viên sẽ cập nhật thêm các đề thi mới trong thời gian tới.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition p-6 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        {exam.subject} • {exam.grade}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        GV: {exam.teacherName || 'Bộ môn'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-emerald-700 transition line-clamp-2 mb-2">
                      {exam.title}
                    </h3>

                    {exam.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                        {exam.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-6 p-3 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>Thời gian: <strong>{exam.durationMinutes}p</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Số lượng: <strong>{exam.questions?.length || 0} câu</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onStartExam(exam)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-100 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Bắt đầu làm bài thi</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {mySubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Bạn chưa làm bài thi nào</h3>
              <p className="text-xs text-slate-500 mt-1">
                Hãy chuyển sang tab "Đề thi đang mở" và chọn một bài thi để rèn luyện nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mySubmissions.map((sub) => {
                const mins = Math.floor(sub.durationSpentSeconds / 60);
                const secs = sub.durationSpentSeconds % 60;
                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(sub.submittedAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base line-clamp-1">
                        {sub.examTitle}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Đúng <strong>{sub.correctCount}/{sub.totalCount}</strong> câu ({sub.accuracyRate}%) • Thời gian làm: {mins}p {secs}s
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div
                        className={`text-2xl font-black px-4 py-1.5 rounded-2xl ${
                          sub.score >= 8.0
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.score >= 5.0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sub.score.toFixed(2)}
                      </div>
                      <button
                        onClick={() => onViewSubmissionDetail(sub)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Xem chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
