import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { AuthView } from './components/AuthView.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { ExamRunner } from './components/ExamRunner.tsx';
import { ExamResultView } from './components/ExamResultView.tsx';
import { FirebaseModal } from './components/FirebaseModal.tsx';
import { LogoManagerModal } from './components/LogoManagerModal.tsx';
import { UserProfile, UserRole, Exam, ExamSubmission } from './types.ts';
import { subscribeAuth, logoutUser, loginQuickDemo, subscribeAppLogo } from './firebase/service.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [appLogo, setAppLogo] = useState<string | null>(null);

  // Screen state
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'exam_runner' | 'exam_result'>('dashboard');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<ExamSubmission | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuth((user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    const unsubLogo = subscribeAppLogo((logo) => {
      setAppLogo(logo);
    });
    return () => {
      unsubscribe();
      unsubLogo();
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setCurrentScreen('dashboard');
    setActiveExam(null);
    setCurrentSubmission(null);
  };

  const handleStartExam = (exam: Exam) => {
    setActiveExam(exam);
    setCurrentScreen('exam_runner');
  };

  const handleFinishExam = (submission: ExamSubmission) => {
    setCurrentSubmission(submission);
    setCurrentScreen('exam_result');
  };

  const handleViewSubmissionDetail = (submission: ExamSubmission) => {
    setCurrentSubmission(submission);
    setCurrentScreen('exam_result');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setActiveExam(null);
    setCurrentSubmission(null);
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Đang khởi tạo Mèo Nghiện Điện (Ôn thi Công Nghệ Công Nghiệp)...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar is only hidden during actual exam taking to provide distraction-free focus */}
      {currentScreen !== 'exam_runner' && (
        <Navbar
          user={currentUser}
          onLogout={handleLogout}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          logoUrl={appLogo}
          onOpenLogoManager={() => setIsLogoModalOpen(true)}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1 flex flex-col">
        {!currentUser ? (
          <AuthView
            onAuthSuccess={() => setCurrentScreen('dashboard')}
            onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
            logoUrl={appLogo}
          />
        ) : currentScreen === 'exam_runner' && activeExam ? (
          <ExamRunner
            exam={activeExam}
            currentUser={currentUser}
            onFinishExam={handleFinishExam}
            onCancel={handleBackToDashboard}
          />
        ) : currentScreen === 'exam_result' && currentSubmission ? (
          <ExamResultView
            submission={currentSubmission}
            onBackToDashboard={handleBackToDashboard}
          />
        ) : currentUser.role === 'teacher' ? (
          <TeacherDashboard
            currentUser={currentUser}
            onPreviewExam={handleStartExam}
            logoUrl={appLogo}
            onOpenLogoManager={() => setIsLogoModalOpen(true)}
          />
        ) : (
          <StudentDashboard
            currentUser={currentUser}
            onStartExam={handleStartExam}
            onViewSubmissionDetail={handleViewSubmissionDetail}
            logoUrl={appLogo}
          />
        )}
      </main>

      {/* Firebase configuration modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />

      {/* Logo Manager modal for Teacher */}
      <LogoManagerModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        currentLogo={appLogo}
      />
    </div>
  );
}
