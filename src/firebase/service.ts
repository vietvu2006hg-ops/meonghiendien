import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FbUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { auth, db, isFirebaseActive } from './config.ts';
import { Exam, ExamSubmission, UserProfile, UserRole } from '../types.ts';
import { SEED_EXAMS } from '../data/seedExams.ts';

// Local storage fallback keys
const LOCAL_USER_KEY = 'smarttest_local_current_user';
const LOCAL_EXAMS_KEY = 'smarttest_local_exams';
const LOCAL_SUBMISSIONS_KEY = 'smarttest_local_submissions';

// Initial local setup
function initLocalStore() {
  if (!localStorage.getItem(LOCAL_EXAMS_KEY)) {
    localStorage.setItem(LOCAL_EXAMS_KEY, JSON.stringify(SEED_EXAMS));
  }
  if (!localStorage.getItem(LOCAL_SUBMISSIONS_KEY)) {
    // Seed sample submissions for teacher analytics
    const sampleSubmissions: ExamSubmission[] = [
      {
        id: 'sub_sample_1',
        examId: 'exam_congnghe_01',
        examTitle: 'Đề ôn thi Công Nghệ Công Nghiệp 12 - Mạch điện xoay chiều 3 pha & Động cơ',
        studentId: 'std_01',
        studentName: 'Nguyễn Văn An',
        studentEmail: 'nguyenvanan@thpt.edu.vn',
        score: 9.0,
        earnedRawPoints: 5.4,
        totalMaxRawPoints: 6.0,
        correctCount: 5,
        totalCount: 6,
        accuracyRate: 90,
        durationSpentSeconds: 1680,
        answers: { cn1: 'A', cn2: 'A', cn3: 'A', cn4: 'A', cn5: { a: true, b: false, c: true, d: false } },
        details: [],
        submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'sub_sample_2',
        examId: 'exam_congnghe_01',
        examTitle: 'Đề ôn thi Công Nghệ Công Nghiệp 12 - Mạch điện xoay chiều 3 pha & Động cơ',
        studentId: 'std_02',
        studentName: 'Trần Thị Bích Ngọc',
        studentEmail: 'bichngoc@thpt.edu.vn',
        score: 8.25,
        earnedRawPoints: 4.95,
        totalMaxRawPoints: 6.0,
        correctCount: 5,
        totalCount: 6,
        accuracyRate: 83,
        durationSpentSeconds: 2100,
        answers: { cn1: 'A', cn2: 'B', cn3: 'A', cn4: 'A', cn5: { a: true, b: false, c: true, d: false } },
        details: [],
        submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'sub_sample_3',
        examId: 'exam_congnghe_01',
        examTitle: 'Đề ôn thi Công Nghệ Công Nghiệp 12 - Mạch điện xoay chiều 3 pha & Động cơ',
        studentId: 'std_03',
        studentName: 'Lê Hoàng Minh',
        studentEmail: 'hoangminh@thpt.edu.vn',
        score: 6.5,
        earnedRawPoints: 3.9,
        totalMaxRawPoints: 6.0,
        correctCount: 4,
        totalCount: 6,
        accuracyRate: 65,
        durationSpentSeconds: 2450,
        answers: { cn1: 'B', cn2: 'A', cn3: 'C', cn4: 'A' },
        details: [],
        submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ];
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(sampleSubmissions));
  }
}
initLocalStore();

// ================= AUTHENTICATION =================

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const fbAuth = auth;
  const firestore = db;
  if (isFirebaseActive && fbAuth && firestore) {
    const cred = await signInWithEmailAndPassword(fbAuth, email, password);
    const userDoc = await getDoc(doc(firestore, 'users', cred.user.uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    // If user profile doc is missing in Firestore, create default
    const fallbackProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      fullName: cred.user.displayName || email.split('@')[0],
      role: 'student',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(firestore, 'users', cred.user.uid), fallbackProfile);
    return fallbackProfile;
  } else {
    // Local fallback login
    const storedUser = localStorage.getItem(LOCAL_USER_KEY);
    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return u;
      }
    }
    // Demo accounts
    const role: UserRole = email.includes('teacher') || email.includes('admin') ? 'teacher' : 'student';
    const profile: UserProfile = {
      uid: 'user_' + btoa(email).replace(/=/g, '').slice(0, 8),
      email,
      fullName: email.split('@')[0].toUpperCase(),
      role,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    return profile;
  }
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
): Promise<UserProfile> {
  const fbAuth = auth;
  const firestore = db;
  if (isFirebaseActive && fbAuth && firestore) {
    const cred = await createUserWithEmailAndPassword(fbAuth, email, password);
    const profile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      fullName: fullName.trim(),
      role,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(firestore, 'users', cred.user.uid), profile);
    return profile;
  } else {
    const profile: UserProfile = {
      uid: 'local_uid_' + Date.now(),
      email,
      fullName: fullName.trim(),
      role,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    return profile;
  }
}

export async function logoutUser(): Promise<void> {
  const fbAuth = auth;
  if (isFirebaseActive && fbAuth) {
    await fbSignOut(fbAuth);
  }
  localStorage.removeItem(LOCAL_USER_KEY);
}

export function subscribeAuth(callback: (user: UserProfile | null) => void): () => void {
  const fbAuth = auth;
  const firestore = db;
  if (isFirebaseActive && fbAuth && firestore) {
    return onAuthStateChanged(fbAuth, async (fbUser: FbUser | null) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', fbUser.uid));
          if (userDoc.exists()) {
            callback(userDoc.data() as UserProfile);
            return;
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
        }
        callback({
          uid: fbUser.uid,
          email: fbUser.email || '',
          fullName: fbUser.displayName || 'Người dùng',
          role: 'student',
          createdAt: new Date().toISOString(),
        });
      } else {
        callback(null);
      }
    });
  } else {
    const stored = localStorage.getItem(LOCAL_USER_KEY);
    if (stored) {
      try {
        callback(JSON.parse(stored));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
    return () => {};
  }
}

// Quick demo login helper
export function loginQuickDemo(role: UserRole): UserProfile {
  const profile: UserProfile = role === 'teacher'
    ? {
        uid: 'teacher_demo_01',
        email: 'giaovien.admin@smarttest.edu.vn',
        fullName: 'Thầy Nguyễn Hoàng Nam (Giáo viên)',
        role: 'teacher',
        createdAt: new Date().toISOString(),
      }
    : {
        uid: 'student_demo_01',
        email: 'hocsinh.an@smarttest.edu.vn',
        fullName: 'Nguyễn Văn An (Học sinh 12A1)',
        role: 'student',
        createdAt: new Date().toISOString(),
      };

  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
  return profile;
}

// ================= EXAMS CRUD =================

export async function fetchExams(): Promise<Exam[]> {
  const firestore = db;
  if (isFirebaseActive && firestore) {
    try {
      const snap = await getDocs(collection(firestore, 'exams'));
      const list: Exam[] = [];
      snap.forEach((docItem) => {
        list.push({ id: docItem.id, ...(docItem.data() as any) });
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to fetch exams from Firestore, falling back to local:', error);
    }
  }

  // Local fallback
  const raw = localStorage.getItem(LOCAL_EXAMS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return SEED_EXAMS;
    }
  }
  return SEED_EXAMS;
}

export async function saveExam(exam: Exam): Promise<Exam> {
  const firestore = db;
  if (isFirebaseActive && firestore) {
    try {
      const examRef = exam.id ? doc(firestore, 'exams', exam.id) : doc(collection(firestore, 'exams'));
      const finalExam = { ...exam, id: examRef.id, updatedAt: new Date().toISOString() };
      await setDoc(examRef, finalExam);
      return finalExam;
    } catch (error) {
      console.error('Failed to save exam to Firestore:', error);
      throw error;
    }
  }

  // Local fallback
  const exams = await fetchExams();
  const existingIdx = exams.findIndex((e) => e.id === exam.id);
  const finalExam = {
    ...exam,
    id: exam.id || `exam_${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    exams[existingIdx] = finalExam;
  } else {
    exams.unshift(finalExam);
  }
  localStorage.setItem(LOCAL_EXAMS_KEY, JSON.stringify(exams));
  return finalExam;
}

export async function removeExam(examId: string): Promise<void> {
  const firestore = db;
  if (isFirebaseActive && firestore) {
    try {
      await deleteDoc(doc(firestore, 'exams', examId));
      return;
    } catch (error) {
      console.error('Failed to delete exam from Firestore:', error);
      throw error;
    }
  }

  // Local fallback
  const exams = await fetchExams();
  const filtered = exams.filter((e) => e.id !== examId);
  localStorage.setItem(LOCAL_EXAMS_KEY, JSON.stringify(filtered));
}

// ================= SUBMISSIONS =================

export async function submitExamResult(submission: Omit<ExamSubmission, 'id'>): Promise<ExamSubmission> {
  const newSubmission: ExamSubmission = {
    ...submission,
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  const firestore = db;
  if (isFirebaseActive && firestore) {
    try {
      const subRef = doc(collection(firestore, 'submissions'));
      newSubmission.id = subRef.id;
      await setDoc(subRef, newSubmission);
      return newSubmission;
    } catch (error) {
      console.error('Failed to save submission to Firestore, saving locally:', error);
    }
  }

  // Local fallback
  const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
  let list: ExamSubmission[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {}
  }
  list.unshift(newSubmission);
  localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(list));
  return newSubmission;
}

export async function fetchSubmissions(examId?: string, studentId?: string): Promise<ExamSubmission[]> {
  const firestore = db;
  if (isFirebaseActive && firestore) {
    try {
      const q = collection(firestore, 'submissions');
      const snap = await getDocs(q);
      let list: ExamSubmission[] = [];
      snap.forEach((docItem) => {
        list.push({ id: docItem.id, ...(docItem.data() as any) });
      });

      if (examId) {
        list = list.filter((s) => s.examId === examId);
      }
      if (studentId) {
        list = list.filter((s) => s.studentId === studentId);
      }
      return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    } catch (error) {
      console.error('Failed to fetch submissions from Firestore, falling back to local:', error);
    }
  }

  // Local fallback
  const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
  let list: ExamSubmission[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {}
  }
  if (examId) {
    list = list.filter((s) => s.examId === examId);
  }
  if (studentId) {
    list = list.filter((s) => s.studentId === studentId);
  }
  return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

// ================= APP LOGO MANAGEMENT =================
const LOCAL_LOGO_KEY = 'smarttest_custom_logo';

export function getInitialLogo(): string | null {
  try {
    return localStorage.getItem(LOCAL_LOGO_KEY);
  } catch {
    return null;
  }
}

export async function fetchAppLogo(): Promise<string | null> {
  const local = getInitialLogo();
  const firestore = db;
  if (isFirebaseActive && firestore) {
    try {
      const docRef = doc(firestore, 'settings', 'branding');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.logoUrl) {
          localStorage.setItem(LOCAL_LOGO_KEY, data.logoUrl);
          return data.logoUrl;
        } else if (data.logoUrl === null) {
          localStorage.removeItem(LOCAL_LOGO_KEY);
          return null;
        }
      }
    } catch (e) {
      console.warn('Could not fetch logo from Firestore:', e);
    }
  }
  return local;
}

export async function saveAppLogo(logoDataUrl: string): Promise<void> {
  try {
    localStorage.setItem(LOCAL_LOGO_KEY, logoDataUrl);
  } catch (e) {
    console.error('Failed to store logo in localStorage:', e);
  }
  window.dispatchEvent(new CustomEvent('smarttest_logo_changed', { detail: logoDataUrl }));

  const firestore = db;
  if (isFirebaseActive && firestore) {
    try {
      const docRef = doc(firestore, 'settings', 'branding');
      await setDoc(docRef, { logoUrl: logoDataUrl, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error('Failed to persist logo to Firestore:', e);
    }
  }
}

export async function resetAppLogo(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_LOGO_KEY);
  } catch (e) {
    console.error('Failed to remove logo from localStorage:', e);
  }
  window.dispatchEvent(new CustomEvent('smarttest_logo_changed', { detail: null }));

  const firestore = db;
  if (isFirebaseActive && firestore) {
    try {
      const docRef = doc(firestore, 'settings', 'branding');
      await setDoc(docRef, { logoUrl: null, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error('Failed to reset logo in Firestore:', e);
    }
  }
}

export function subscribeAppLogo(callback: (logoUrl: string | null) => void): () => void {
  // initial call
  callback(getInitialLogo());

  // check firestore asynchronously
  fetchAppLogo().then((logo) => {
    callback(logo);
  });

  const handler = (e: any) => {
    callback(e.detail ?? null);
  };

  window.addEventListener('smarttest_logo_changed', handler);
  return () => {
    window.removeEventListener('smarttest_logo_changed', handler);
  };
}
