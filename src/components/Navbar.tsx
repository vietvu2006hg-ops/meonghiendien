import React from 'react';
import {
  GraduationCap,
  Database,
  LogOut,
  User,
  ShieldCheck,
  BookOpen,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types.ts';
import { isFirebaseActive, activeProjectId } from '../firebase/config.ts';

interface NavbarProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenFirebaseModal: () => void;
  logoUrl?: string | null;
  onOpenLogoManager?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenFirebaseModal,
  logoUrl,
  onOpenLogoManager,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div
              onClick={user?.role === 'teacher' ? onOpenLogoManager : undefined}
              className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center transition ${
                user?.role === 'teacher' ? 'cursor-pointer hover:ring-2 hover:ring-orange-400 hover:scale-105' : ''
              } ${
                logoUrl
                  ? 'bg-white border border-slate-200/80 shadow-md shadow-orange-100 p-0.5'
                  : 'bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-white shadow-md shadow-orange-200'
              }`}
              title={user?.role === 'teacher' ? 'Bấm để đổi Logo hệ thống' : undefined}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
              ) : (
                <span className="text-xl">🐱⚡</span>
              )}
            </div>
            {user?.role === 'teacher' && onOpenLogoManager && (
              <button
                type="button"
                onClick={onOpenLogoManager}
                title="Thay đổi logo"
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 hover:scale-110 shadow-xs cursor-pointer text-[9px]"
              >
                ✏️
              </button>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Mèo Nghiện Điện
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                Công Nghệ Công Nghiệp
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Hệ thống ôn thi & kiểm tra Công nghệ Công nghiệp trực tuyến
            </p>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Firebase Connection Status - ONLY visible to teachers */}
          {user?.role === 'teacher' && (
            <button
              onClick={onOpenFirebaseModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isFirebaseActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title="Nhấp để cấu hình Firebase project"
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">
                {isFirebaseActive ? `Firebase: ${activeProjectId}` : 'Chế độ Demo/Local'}
              </span>
              <span className="md:hidden">
                {isFirebaseActive ? 'Firebase ON' : 'Demo'}
              </span>
            </button>
          )}

          {/* User profile info & logout */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                    user.role === 'teacher'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                  title={user.email}
                >
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[140px]">
                      {user.fullName || user.email}
                    </p>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                        user.role === 'teacher'
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {user.role === 'teacher' ? 'GV' : 'HS'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium">Chưa đăng nhập</span>
          )}
        </div>
      </div>
    </header>
  );
};
