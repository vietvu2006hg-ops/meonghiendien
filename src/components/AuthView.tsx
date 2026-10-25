import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  Lock,
  Mail,
  User,
  ShieldAlert,
  ArrowRight,
  School,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { UserRole } from '../types.ts';
import { loginUser, registerUser, loginQuickDemo } from '../firebase/service.ts';
import { isFirebaseActive } from '../firebase/config.ts';

interface AuthViewProps {
  onAuthSuccess: () => void;
  onOpenFirebaseModal: () => void;
  logoUrl?: string | null;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onOpenFirebaseModal, logoUrl }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        if (!email.trim() || !password.trim()) {
          throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu.');
        }
        await loginUser(email.trim(), password);
      } else {
        if (!fullName.trim()) {
          throw new Error('Vui lòng nhập Họ và Tên thật để lưu vào hồ sơ trường.');
        }
        if (!email.trim() || !password.trim()) {
          throw new Error('Vui lòng nhập Email và Mật khẩu.');
        }
        if (password.length < 6) {
          throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');
        }
        await registerUser(email.trim(), password, fullName.trim(), role);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Đã có lỗi xảy ra trong quá trình xác thực.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        msg = 'Email hoặc mật khẩu không chính xác.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'Email này đã được đăng ký. Vui lòng chuyển sang Đăng nhập.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Mật khẩu quá yếu, cần ít nhất 6 ký tự.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (quickRole: UserRole) => {
    loginQuickDemo(quickRole);
    onAuthSuccess();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100">
      <div className="max-w-md w-full space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          {logoUrl ? (
            <div className="inline-flex w-16 h-16 p-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-lg shadow-orange-100 overflow-hidden items-center justify-center">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
          ) : (
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-200 text-3xl">
              🐱⚡
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Mèo Nghiện Điện
          </h2>
          <p className="text-sm font-semibold text-amber-700">
            Ôn Thi & Kiểm Tra Công Nghệ Công Nghiệp
          </p>
          <p className="text-xs text-slate-500">
            Đề thi trắc nghiệm & Đúng/Sai chuẩn GDPT mới nhất
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden">
          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 border-b border-slate-200 text-sm font-semibold">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`py-2.5 rounded-xl transition ${
                isLogin
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`py-2.5 rounded-xl transition ${
                !isLogin
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* If Register: Full name and Role selection */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Họ và Tên thật <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tên thật sẽ được lưu vào hệ thống để ghi nhận kết quả và xuất bảng điểm.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Vai trò trong trường <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        role === 'student'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <School className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Học sinh</div>
                        <div className="text-[10px] text-slate-500">Làm bài & xem điểm</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        role === 'teacher'
                          ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-1 ring-purple-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Giáo viên (Admin)</div>
                        <div className="text-[10px] text-slate-500">Tạo đề thi & xem điểm</div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email trường học <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="giaovien@school.edu.vn hoặc hocsinh@thpt.edu.vn"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Đăng nhập vào hệ thống' : 'Đăng ký tài khoản mới'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Section for Fast Evaluation */}
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Truy cập nhanh (Chế độ dùng thử)
              </span>
              <button
                type="button"
                onClick={onOpenFirebaseModal}
                className="text-[11px] text-indigo-600 hover:underline font-semibold"
              >
                Cấu hình Firebase
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('teacher')}
                className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vào vai Giáo viên (Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('student')}
                className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <School className="w-3.5 h-3.5" />
                <span>Vào vai Học sinh (User)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
