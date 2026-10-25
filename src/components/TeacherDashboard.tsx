import React, { useState, useEffect, useId } from 'react';
import {
  Sparkles,
  BookOpen,
  PlusCircle,
  BarChart3,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Play,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Award,
  Users,
  Search,
  Filter,
  Check,
  X,
  FileUp,
  FileType,
  FileCheck,
  UploadCloud,
  FileCode,
  HelpCircle,
  CheckCircle2,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';
import { Exam, ExamSubmission, Question, QuestionType, StatementItem, UserProfile } from '../types.ts';
import { fetchExams, saveExam, removeExam, fetchSubmissions, saveAppLogo, resetAppLogo } from '../firebase/service.ts';
import { processLogoFile } from '../utils/imageUtils.ts';
import { SubmissionDetailModal } from './SubmissionDetailModal.tsx';

interface TeacherDashboardProps {
  currentUser: UserProfile;
  onPreviewExam: (exam: Exam) => void;
  logoUrl?: string | null;
  onOpenLogoManager?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  onPreviewExam,
  logoUrl,
  onOpenLogoManager,
}) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'create' | 'analytics' | 'branding' | 'guide'>('exams');
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingSubmission, setInspectingSubmission] = useState<ExamSubmission | null>(null);

  // Logo Branding Tab State
  const [brandingPreviewLogo, setBrandingPreviewLogo] = useState<string | null>(logoUrl ?? null);
  const [brandingFileName, setBrandingFileName] = useState('');
  const [isBrandingProcessing, setIsBrandingProcessing] = useState(false);
  const [isBrandingSaving, setIsBrandingSaving] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingSuccess, setBrandingSuccess] = useState<string | null>(null);
  const brandingFileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBrandingPreviewLogo(logoUrl ?? null);
  }, [logoUrl]);

  // Create / Edit Exam Form State
  const [examTitle, setExamTitle] = useState('');
  const [subject, setSubject] = useState('Công nghệ Công nghiệp');
  const [grade, setGrade] = useState('Lớp 12');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [examDescription, setExamDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Method selector: 'upload_file' (default) | 'ai_theory' | 'manual'
  const [creationMethod, setCreationMethod] = useState<'upload_file' | 'ai_theory' | 'manual'>('upload_file');

  // Word (.docx, .doc) / PDF file upload state
  const [selectedExamFile, setSelectedExamFile] = useState<File | null>(null);
  const [examFileBase64, setExamFileBase64] = useState<string | null>(null);
  const [fileProcessingMode, setFileProcessingMode] = useState<'extract_exam' | 'generate_from_theory'>('extract_exam');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileProcessStatus, setFileProcessStatus] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);

  // AI Generator state (Text mode)
  const [aiTheoryText, setAiTheoryText] = useState('');
  const [aiMcCount, setAiMcCount] = useState(6);
  const [aiTfCount, setAiTfCount] = useState(2);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const examList = await fetchExams();
      setExams(examList);
      const subList = await fetchSubmissions();
      setSubmissions(subList);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Word (.docx, .doc) or PDF file selection
  const handleExamFileChange = (file: File) => {
    setSelectedExamFile(file);
    setFileError(null);
    setFileProcessStatus('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64Index = dataUrl.indexOf(';base64,');
      if (base64Index !== -1) {
        setExamFileBase64(dataUrl.substring(base64Index + 8));
      } else {
        setExamFileBase64(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // Auto set title if empty
    if (!examTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setExamTitle(`Đề thi: ${nameWithoutExt}`);
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedExamFile(null);
    setExamFileBase64(null);
    setFileError(null);
    setFileProcessStatus('');
  };

  // Process Word/PDF via API
  const handleProcessExamFile = async () => {
    if (!selectedExamFile || !examFileBase64) {
      setFileError('Vui lòng chọn hoặc kéo thả tệp Word (.docx, .doc) hoặc PDF.');
      return;
    }

    setIsProcessingFile(true);
    setFileError(null);
    setFileProcessStatus('Đang đọc tệp và gửi đến AI Gemini 3.8 Flash bóc tách câu hỏi...');

    try {
      const res = await fetch('/api/ai/upload-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: examFileBase64,
          fileName: selectedExamFile.name,
          mimeType: selectedExamFile.type,
          mode: fileProcessingMode,
          subject: subject !== 'Chung' ? subject : undefined,
          grade,
          examTitle,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Lỗi khi xử lý file đề thi.');
      }

      const data = await res.json();
      if (data.title) setExamTitle(data.title);
      if (data.subject && data.subject !== 'Chung') setSubject(data.subject);
      if (data.grade) setGrade(data.grade);
      if (data.durationMinutes) setDurationMinutes(data.durationMinutes);
      if (data.description) setExamDescription(data.description);
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }
      setSaveSuccess(false);
      setFileProcessStatus(`Đã bóc tách thành công ${data.questions?.length || 0} câu hỏi! Bạn có thể kiểm tra và chỉnh sửa bên dưới.`);
    } catch (err: any) {
      console.error('File process error:', err);
      setFileError(err.message || 'Lỗi khi bóc tách tệp đề thi.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Quick sample exam generator for instant testing
  const handleLoadSampleExamFile = (sampleType: 'word_math' | 'pdf_bio') => {
    setIsProcessingFile(true);
    setFileError(null);
    setFileProcessStatus('Đang nạp đề thi mẫu chuẩn GDPT 2025...');

    setTimeout(() => {
      if (sampleType === 'word_math') {
        setExamTitle('Đề kiểm tra Toán 12 - Khảo sát hàm số & Tích phân');
        setSubject('Toán học');
        setGrade('Lớp 12');
        setDurationMinutes(50);
        setExamDescription('Đề thi trích xuất từ file Word "De_Kiem_Tra_Toan_12_GDPT2025.docx"');
        setQuestions([
          {
            id: 'sample_m1',
            type: 'multiple_choice',
            question: 'Cho hàm số y = f(x) có đạo hàm f\'(x) = x(x - 1)^2 (x + 2). Số điểm cực trị của hàm số đã cho là:',
            options: [
              { id: 'A', text: '1 điểm' },
              { id: 'B', text: '2 điểm' },
              { id: 'C', text: '3 điểm' },
              { id: 'D', text: '4 điểm' },
            ],
            correctAnswer: 'B',
            explanation: 'Đạo hàm f\'(x) đổi dấu khi qua các nghiệm đơn hoặc bội lẻ: x = 0 và x = -2. Nghiệm x = 1 là nghiệm kép nên không phải là điểm cực trị. Do đó hàm số có đúng 2 điểm cực trị.',
          },
          {
            id: 'sample_m2',
            type: 'multiple_choice',
            question: 'Biết tích phân từ 0 đến 1 của e^(2x) dx = (e^a - 1)/b với a, b là các số nguyên dương. Giá trị của biểu thức S = a + b là:',
            options: [
              { id: 'A', text: 'S = 3' },
              { id: 'B', text: 'S = 4' },
              { id: 'C', text: 'S = 5' },
              { id: 'D', text: 'S = 6' },
            ],
            correctAnswer: 'B',
            explanation: 'Nguyên hàm của e^(2x) là (1/2)e^(2x). Tích phân từ 0 đến 1 = (1/2)(e^2 - 1). Suy ra a = 2, b = 2, do đó S = 2 + 2 = 4.',
          },
          {
            id: 'sample_m3',
            type: 'true_false',
            context: 'Cho hàm số bậc ba y = f(x) = ax^3 + bx^2 + cx + d có đồ thị đạt cực đại tại x = -1 và đạt cực tiểu tại x = 1, đồ thị cắt trục tung tại điểm có tung độ bằng 2.',
            question: 'Dựa vào tính chất hàm số trên, hãy xác định tính Đúng/Sai của các mệnh đề sau:',
            statements: [
              {
                id: 'a',
                text: 'Hàm số đồng biến trên mỗi khoảng (-vô cùng; -1) và (1; +vô cùng).',
                isCorrect: true,
                explanation: 'Do hàm số đạt cực đại tại x = -1 và cực tiểu tại x = 1, nên hàm số đồng biến trên (-vô cùng; -1) và (1; +vô cùng).',
              },
              {
                id: 'b',
                text: 'Giá trị của hệ số tự do d = 2.',
                isCorrect: true,
                explanation: 'Đồ thị cắt trục Oy tại x = 0 suy ra y = d = 2.',
              },
              {
                id: 'c',
                text: 'Phương trình f\'(x) = 0 có nghiệm kép.',
                isCorrect: false,
                explanation: 'Sai vì hàm số bậc ba có 2 điểm cực trị nên f\'(x) = 0 phải có 2 nghiệm phân biệt x = -1 và x = 1.',
              },
              {
                id: 'd',
                text: 'Tâm đối xứng của đồ thị hàm số nằm trên trục tung Oy.',
                isCorrect: true,
                explanation: 'Điểm uốn I(x_0, y_0) có hoành độ x_0 = (-1 + 1)/2 = 0 nằm trên trục tung Oy.',
              },
            ],
          },
        ]);
      } else {
        setExamTitle('Đề kiểm tra Sinh học 12 - Công nghệ ADN & Di truyền phân tử');
        setSubject('Sinh học');
        setGrade('Lớp 12');
        setDurationMinutes(45);
        setExamDescription('Đề thi trích xuất từ file PDF "De_Khao_Sat_Sinh_12.pdf"');
        setQuestions([
          {
            id: 'sample_b1',
            type: 'multiple_choice',
            question: 'Trong kỹ thuật chuyển gen, thể truyền plasmid có đặc tính quan trọng nào sau đây?',
            options: [
              { id: 'A', text: 'Có khả năng tự nhân đôi độc lập với hệ gen của tế bào chủ' },
              { id: 'B', text: 'Luôn tồn tại dưới dạng phân tử ARN mạch thẳng' },
              { id: 'C', text: 'Không chứa bất kỳ gen đánh dấu nào' },
              { id: 'D', text: 'Chỉ có thể xâm nhập vào tế bào động vật bậc cao' },
            ],
            correctAnswer: 'A',
            explanation: 'Plasmid là phân tử ADN vòng nhỏ trong tế bào chất của vi khuẩn, mang điểm ori riêng nên nhân đôi độc lập.',
          },
          {
            id: 'sample_b2',
            type: 'true_false',
            context: 'Một phân tử mARN trưởng thành của sinh vật nhân thực có chiều dài 4080 Å được dịch mã bởi một nhóm 5 riboxom trượt qua một lần không lặp lại.',
            question: 'Dựa vào dữ liệu trên, hãy xác định tính Đúng/Sai của các nhận định sau:',
            statements: [
              {
                id: 'a',
                text: 'Số lượng bộ ba mã sao trên phân tử mARN này là 400 bộ ba.',
                isCorrect: true,
                explanation: 'Số ribonucleotit = 4080 / 3.4 = 1200 => Số bộ ba = 1200 / 3 = 400.',
              },
              {
                id: 'b',
                text: 'Quá trình dịch mã trên tạo ra 5 chuỗi polipeptit có cấu trúc axit amin hoàn toàn giống nhau.',
                isCorrect: true,
                explanation: 'Đúng vì các riboxom đều trượt trên cùng một khuôn mẫu mARN.',
              },
              {
                id: 'c',
                text: 'Mỗi chuỗi polipeptit hoàn chỉnh sau khi cắt bỏ axit amin mở đầu chứa đúng 399 axit amin.',
                isCorrect: false,
                explanation: 'Sai, chuỗi hoàn chỉnh = 400 - 1 (mã kết thúc) - 1 (axit amin mở đầu) = 398 axit amin.',
              },
              {
                id: 'd',
                text: 'Tổng số phân tử tARN được huy động để cung cấp axit amin cho 5 riboxom là 1995 phân tử.',
                isCorrect: true,
                explanation: 'Mỗi riboxom cần 399 lượt tARN x 5 = 1995 lượt tARN.',
              },
            ],
          },
        ]);
      }
      setIsProcessingFile(false);
      setFileProcessStatus('Đã nạp đề mẫu thành công! Tất cả câu hỏi đã được đưa vào trình biên soạn.');
    }, 600);
  };

  // Handle file upload for AI theory (TXT, MD, etc.)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setAiTheoryText(content);
        if (!examTitle) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setExamTitle(`Đề thi trắc nghiệm: ${nameWithoutExt}`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Generate with AI
  const handleGenerateAI = async () => {
    if (!aiTheoryText.trim()) {
      setAiError('Vui lòng nhập hoặc tải lên văn bản lý thuyết để AI phân tích.');
      return;
    }

    setAiError(null);
    setIsGeneratingAi(true);

    try {
      const res = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theoryText: aiTheoryText,
          examTitle: examTitle || `Đề kiểm tra ${subject} ${grade}`,
          subject,
          grade,
          mcCount: aiMcCount,
          tfCount: aiTfCount,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi khi gọi API AI tạo đề thi.');
      }

      const data = await res.json();
      if (data.title && !examTitle) {
        setExamTitle(data.title);
      }
      if (data.description && !examDescription) {
        setExamDescription(data.description);
      }
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }
      setSaveSuccess(false);
    } catch (err: any) {
      console.error('AI Generation Failed:', err);
      setAiError(err.message || 'Không thể tạo đề thi bằng AI. Vui lòng kiểm tra lại nội dung.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Add a manual multiple-choice question
  const handleAddMultipleChoice = () => {
    const newQ: Question = {
      id: `mc_${Date.now()}`,
      type: 'multiple_choice',
      question: 'Nhập nội dung câu hỏi trắc nghiệm...',
      options: [
        { id: 'A', text: 'Đáp án A' },
        { id: 'B', text: 'Đáp án B' },
        { id: 'C', text: 'Đáp án C' },
        { id: 'D', text: 'Đáp án D' },
      ],
      correctAnswer: 'A',
      explanation: 'Giải thích chi tiết vì sao đáp án này đúng...',
    };
    setQuestions([...questions, newQ]);
  };

  // Add a manual True/False cluster question
  const handleAddTrueFalse = () => {
    const newQ: Question = {
      id: `tf_${Date.now()}`,
      type: 'true_false',
      context: 'Đoạn thông tin/bối cảnh làm cơ sở đánh giá tính đúng sai...',
      question: 'Dựa vào thông tin trên, hãy xác định tính Đúng/Sai của các nhận định sau:',
      statements: [
        { id: 'a', text: 'Nhận định 1...', isCorrect: true, explanation: 'Lời giải cho nhận định 1' },
        { id: 'b', text: 'Nhận định 2...', isCorrect: false, explanation: 'Lời giải cho nhận định 2' },
        { id: 'c', text: 'Nhận định 3...', isCorrect: true, explanation: 'Lời giải cho nhận định 3' },
        { id: 'd', text: 'Nhận định 4...', isCorrect: false, explanation: 'Lời giải cho nhận định 4' },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  // Delete question
  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Save exam to Firestore
  const handleSaveExam = async () => {
    if (!examTitle.trim()) {
      alert('Vui lòng nhập Tiêu đề đề thi!');
      return;
    }
    if (questions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi!');
      return;
    }

    setIsSaving(true);
    try {
      const examToSave: Exam = {
        id: editingExamId || `exam_${Date.now()}`,
        title: examTitle.trim(),
        subject,
        grade,
        description: examDescription.trim(),
        durationMinutes: Number(durationMinutes) || 45,
        teacherId: currentUser.uid,
        teacherName: currentUser.fullName || 'Giáo viên',
        status: 'published',
        questions,
        createdAt: editingExamId
          ? exams.find((e) => e.id === editingExamId)?.createdAt || new Date().toISOString()
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveExam(examToSave);
      await loadData();
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('exams');
        resetForm();
      }, 1200);
    } catch (err: any) {
      alert('Lỗi lưu đề thi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    setExamTitle(exam.title);
    setSubject(exam.subject);
    setGrade(exam.grade);
    setDurationMinutes(exam.durationMinutes);
    setExamDescription(exam.description || '');
    setQuestions(exam.questions);
    setActiveTab('create');
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) return;
    try {
      await removeExam(examId);
      await loadData();
    } catch (err: any) {
      alert('Lỗi xóa đề thi: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingExamId(null);
    setExamTitle('');
    setExamDescription('');
    setQuestions([]);
    setAiTheoryText('');
    setSelectedExamFile(null);
    setExamFileBase64(null);
    setFileError(null);
    setFileProcessStatus('');
  };

  // Export Submissions to CSV / Excel (with UTF-8 BOM for perfect Vietnamese characters)
  const handleExportCSV = () => {
    const listToExport = selectedExamId === 'all'
      ? submissions
      : submissions.filter((s) => s.examId === selectedExamId);

    if (listToExport.length === 0) {
      alert('Chưa có bài thi nào để xuất bảng điểm.');
      return;
    }

    const headers = [
      'STT',
      'Họ và Tên Học Sinh',
      'Email',
      'Đề Thi',
      'Điểm Số (/10)',
      'Số Câu Đúng',
      'Tổng Số Câu',
      'Tỉ Lệ Chính Xác (%)',
      'Thời Gian Làm (Giây)',
      'Thời Điểm Nộp',
    ];

    const rows = listToExport.map((s, idx) => [
      idx + 1,
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.studentEmail}"`,
      `"${s.examTitle.replace(/"/g, '""')}"`,
      s.score.toFixed(2),
      s.correctCount,
      s.totalCount,
      `${s.accuracyRate}%`,
      s.durationSpentSeconds,
      `"${new Date(s.submittedAt).toLocaleString('vi-VN')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bang_Diem_SmartTest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered submissions
  const filteredSubmissions = selectedExamId === 'all'
    ? submissions
    : submissions.filter((s) => s.examId === selectedExamId);

  // Analytics: Calculation of statistics
  const totalSubmissions = filteredSubmissions.length;
  const avgScore = totalSubmissions > 0
    ? (filteredSubmissions.reduce((acc, s) => acc + s.score, 0) / totalSubmissions).toFixed(2)
    : '0.00';
  const highestScore = totalSubmissions > 0
    ? Math.max(...filteredSubmissions.map((s) => s.score)).toFixed(2)
    : '0.00';
  const lowestScore = totalSubmissions > 0
    ? Math.min(...filteredSubmissions.map((s) => s.score)).toFixed(2)
    : '0.00';
  const passRate = totalSubmissions > 0
    ? Math.round((filteredSubmissions.filter((s) => s.score >= 5.0).length / totalSubmissions) * 100)
    : 0;

  // Question difficulty analysis: "Câu hỏi học sinh hay làm sai nhất"
  const questionErrorStats: {
    questionId: string;
    questionText: string;
    type: QuestionType;
    totalAttempts: number;
    wrongAttempts: number;
    errorRate: number;
  }[] = [];

  if (filteredSubmissions.length > 0) {
    const errorMap: Record<string, { text: string; type: QuestionType; wrong: number; total: number }> = {};

    filteredSubmissions.forEach((sub) => {
      if (sub.details && Array.isArray(sub.details)) {
        sub.details.forEach((det) => {
          if (!errorMap[det.questionId]) {
            errorMap[det.questionId] = {
              text: det.question || `Câu hỏi ${det.questionId}`,
              type: det.type,
              wrong: 0,
              total: 0,
            };
          }
          errorMap[det.questionId].total += 1;
          if (!det.isCorrect) {
            errorMap[det.questionId].wrong += 1;
          }
        });
      }
    });

    Object.entries(errorMap).forEach(([qId, val]) => {
      if (val.total > 0) {
        questionErrorStats.push({
          questionId: qId,
          questionText: val.text,
          type: val.type,
          totalAttempts: val.total,
          wrongAttempts: val.wrong,
          errorRate: Math.round((val.wrong / val.total) * 100),
        });
      }
    });

    questionErrorStats.sort((a, b) => b.errorRate - a.errorRate);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md">
              Bảng điều khiển Giáo viên (Admin)
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200">
              Chấm điểm tự động GDPT 2025
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ÔN THI CÔNG NGHỆ CÔNG NGHIỆP
          </h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Mèo Nghiện Điện: Nền tảng biên soạn đề thi, bóc tách tệp Word/PDF và đánh giá năng lực môn Công Nghệ Công Nghiệp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenLogoManager || (() => setActiveTab('branding'))}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 backdrop-blur-md transition flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
            title="Tải ảnh lên để đổi Logo trang web / trường học"
          >
            {logoUrl ? (
              <div className="w-5 h-5 rounded-md overflow-hidden bg-white p-0.5 flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <span className="text-sm">🐱⚡</span>
            )}
            <span>Đổi Logo trường</span>
          </button>

          <button
            onClick={() => { resetForm(); setActiveTab('create'); }}
            className="px-5 py-3 bg-white text-indigo-700 hover:bg-purple-50 font-bold text-sm rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Tạo đề thi mới bằng AI</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-sm font-semibold">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'exams'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Ngân hàng đề thi ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{editingExamId ? 'Chỉnh sửa đề thi' : 'Tạo đề mới (AI & Thủ công)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Thống kê kết quả & Bảng điểm ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'branding'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Đổi Logo & Thương hiệu</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'guide'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Hướng dẫn Firebase & Phân quyền</span>
        </button>
      </div>

      {/* ================= TAB 1: DANH SÁCH ĐỀ THI ================= */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tiêu đề, môn học..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={() => { resetForm(); setActiveTab('create'); }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm đề thi mới</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Đang tải dữ liệu đề thi...</div>
          ) : exams.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Chưa có đề thi nào</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Bấm nút "Tạo đề mới" để dùng AI sinh tự động từ tài liệu lý thuyết hoặc biên soạn thủ công.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams
                .filter(
                  (e) =>
                    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.subject.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                          {exam.subject} • {exam.grade}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {exam.status === 'published' ? 'Đang mở thi' : 'Bản nháp'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base line-clamp-2 mb-1">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                          {exam.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-4 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{exam.durationMinutes} phút</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>{exam.questions?.length || 0} câu hỏi</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        onClick={() => onPreviewExam(exam)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold rounded-lg transition"
                      >
                        <Play className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Làm thử</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditExam(exam)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Chỉnh sửa đề thi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa đề thi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: TẠO ĐỀ THI MỚI (AI & THỦ CÔNG) ================= */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Đề thi đã được lưu thành công lên Firestore! Đang chuyển hướng...</span>
            </div>
          )}

          {/* Form Thông tin chung */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Thông tin cơ bản đề thi</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  Tiêu đề đề thi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Ví dụ: Kiểm tra 1 tiết Công Nghệ Công Nghiệp 12 - Mạch điện xoay chiều 3 pha"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Môn học</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-amber-900"
                >
                  <option value="Công Nghệ Công Nghiệp">Công Nghệ Công Nghiệp</option>
                  <option value="Công Nghệ Công Nghiệp - Điện & Điện tử">Công Nghệ Công Nghiệp - Điện & Điện tử</option>
                  <option value="Công Nghệ Công Nghiệp - Mạch điện xoay chiều">Công Nghệ Công Nghiệp - Mạch điện xoay chiều</option>
                  <option value="Công Nghệ Công Nghiệp - Cơ khí & Động lực">Công Nghệ Công Nghiệp - Cơ khí & Động lực</option>
                  <option value="Công Nghệ Công Nghiệp - Tự động hóa">Công Nghệ Công Nghiệp - Tự động hóa</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Thời gian làm bài (Phút)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">Mô tả hoặc Hướng dẫn thi</label>
              <input
                type="text"
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
                placeholder="Ví dụ: Học sinh không được sử dụng tài liệu, thời gian làm bài 45 phút..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
              />
            </div>
          </div>

          {/* Method Selection Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1.5 bg-slate-200/70 rounded-2xl">
            <button
              type="button"
              onClick={() => setCreationMethod('upload_file')}
              className={`p-3.5 rounded-xl text-left transition flex items-center gap-3 cursor-pointer ${
                creationMethod === 'upload_file'
                  ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  creationMethod === 'upload_file' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>Tải trực tiếp tệp Đề thi</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.2 rounded">
                    Word / PDF
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">Bóc tách file .docx, .doc, .pdf</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCreationMethod('ai_theory')}
              className={`p-3.5 rounded-xl text-left transition flex items-center gap-3 cursor-pointer ${
                creationMethod === 'ai_theory'
                  ? 'bg-white text-purple-900 shadow-sm ring-1 ring-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  creationMethod === 'ai_theory' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold">Dán lý thuyết để AI sinh đề</div>
                <div className="text-[11px] text-slate-500">Nhập văn bản bài học, đề cương</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCreationMethod('manual')}
              className={`p-3.5 rounded-xl text-left transition flex items-center gap-3 cursor-pointer ${
                creationMethod === 'manual'
                  ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  creationMethod === 'manual' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold">Tự biên soạn thủ công</div>
                <div className="text-[11px] text-slate-500">Thêm từng câu hỏi và phương án</div>
              </div>
            </button>
          </div>

          {/* ================= OPTION 1: TẢI TRỰC TIẾP FILE WORD / PDF ================= */}
          {creationMethod === 'upload_file' && (
            <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-slate-50 rounded-3xl p-6 border border-indigo-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <FileType className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Tải trực tiếp đề thi từ file Word (.docx, .doc) hoặc PDF
                    </h3>
                    <p className="text-xs text-slate-500">
                      AI Gemini 3.8 Flash đọc file, bóc tách đầy đủ câu hỏi 4 lựa chọn & Đúng/Sai, tự giải đáp án và viết lời giải chi tiết.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                    Word (.docx, .doc)
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                    PDF (.pdf)
                  </span>
                </div>
              </div>

              {/* Upload Dropzone */}
              {!selectedExamFile ? (
                <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white/70 hover:bg-white rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition text-center group">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Kéo thả hoặc bấm để chọn file Đề thi Word (.docx, .doc) hoặc PDF (.pdf)
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Hỗ trợ đề thi định dạng GDPT mới (Phần trắc nghiệm nhiều lựa chọn & Phần trắc nghiệm Đúng/Sai)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleExamFileChange(file);
                    }}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="bg-white border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        selectedExamFile.name.toLowerCase().endsWith('.pdf')
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {selectedExamFile.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX'}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                        {selectedExamFile.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Dung lượng: {(selectedExamFile.size / 1024).toFixed(1)} KB • Sẵn sàng xử lý
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <label className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl cursor-pointer transition">
                      <span>Đổi file khác</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleExamFileChange(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Xóa file đã chọn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Mode selector: Extract existing exam vs Generate from content */}
              <div className="p-4 bg-white/80 rounded-2xl border border-indigo-100 space-y-2">
                <span className="block text-xs font-bold text-slate-700">
                  Lựa chọn phương thức xử lý file:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      fileProcessingMode === 'extract_exam'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fileProcessingMode"
                      value="extract_exam"
                      checked={fileProcessingMode === 'extract_exam'}
                      onChange={() => setFileProcessingMode('extract_exam')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        Bóc tách câu hỏi từ đề thi có sẵn (Khuyên dùng)
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Nhận diện toàn bộ câu trắc nghiệm 4 lựa chọn và Đúng/Sai trong đề, tự động lấy đáp án hoặc giải đáp án đúng và viết lời giải.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      fileProcessingMode === 'generate_from_theory'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fileProcessingMode"
                      value="generate_from_theory"
                      checked={fileProcessingMode === 'generate_from_theory'}
                      onChange={() => setFileProcessingMode('generate_from_theory')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        Biên soạn đề mới từ tài liệu trong file
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Đọc hiểu bài giảng/lý thuyết trong file và tự động sáng tạo ra bộ đề thi trắc nghiệm theo chuẩn GDPT mới.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Instant Sample Exam Loader for zero-friction testing */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Chưa có file sẵn? Thử ngay:</span>
                  <button
                    type="button"
                    disabled={isProcessingFile}
                    onClick={() => handleLoadSampleExamFile('word_math')}
                    className="px-2.5 py-1 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold rounded-lg shadow-2xs transition"
                  >
                    Đề mẫu Word (.docx)
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingFile}
                    onClick={() => handleLoadSampleExamFile('pdf_bio')}
                    className="px-2.5 py-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold rounded-lg shadow-2xs transition"
                  >
                    Đề mẫu PDF (.pdf)
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isProcessingFile || !selectedExamFile}
                  onClick={handleProcessExamFile}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingFile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{fileProcessStatus || 'Đang bóc tách đề thi...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Phân tích & Trích xuất đề thi vào hệ thống</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status and Error banners */}
              {fileProcessStatus && !fileError && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{fileProcessStatus}</span>
                </div>
              )}

              {fileError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>
          )}

          {/* ================= OPTION 2: DÁN NỘI DUNG LÝ THUYẾT TEXTAREA ================= */}
          {creationMethod === 'ai_theory' && (
            <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-blue-50/60 rounded-3xl p-6 border border-indigo-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Tạo đề tự động từ văn bản lý thuyết (Gemini 3.8 Flash)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dán nội dung lý thuyết, bài học, tài liệu ôn tập để AI biên soạn bộ câu hỏi trắc nghiệm theo chuẩn GDPT mới.
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition">
                  <FileUp className="w-4 h-4" />
                  <span>Tải file văn bản (.txt / .md)</span>
                  <input
                    type="file"
                    accept=".txt,.md,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={5}
                value={aiTheoryText}
                onChange={(e) => setAiTheoryText(e.target.value)}
                placeholder="Dán nội dung lý thuyết, bài học, tài liệu ôn tập vào đây (ví dụ: Quy luật phân ly của Menđen, Quá trình phiên mã và dịch mã, Cách mạng tháng Tám 1945...)..."
                className="w-full p-3.5 bg-white border border-indigo-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed font-sans"
              />

              <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Trắc nghiệm 4 lựa chọn:</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={aiMcCount}
                      onChange={(e) => setAiMcCount(Number(e.target.value))}
                      className="w-16 p-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                    <span className="text-slate-500">câu</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Trắc nghiệm Đúng/Sai:</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={aiTfCount}
                      onChange={(e) => setAiTfCount(Number(e.target.value))}
                      className="w-16 p-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                    <span className="text-slate-500">câu (mỗi câu 4 nhận định)</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingAi || !aiTheoryText.trim()}
                  onClick={handleGenerateAI}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-200 transition duration-150 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingAi ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Gemini đang đọc hiểu & sinh câu hỏi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Bắt đầu sinh bộ câu hỏi bằng AI</span>
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
          )}

          {/* ================= OPTION 3: TỰ SOẠN THỦ CÔNG ================= */}
          {creationMethod === 'manual' && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Chế độ tự biên soạn: Bạn có thể bấm các nút bên dưới để thêm câu hỏi và nhập trực tiếp.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="px-3 py-1 bg-white text-emerald-700 font-bold border border-emerald-300 rounded-lg shadow-2xs"
                >
                  + Câu 4 lựa chọn
                </button>
                <button
                  type="button"
                  onClick={handleAddTrueFalse}
                  className="px-3 py-1 bg-white text-emerald-700 font-bold border border-emerald-300 rounded-lg shadow-2xs"
                >
                  + Câu Đúng/Sai
                </button>
              </div>
            </div>
          )}

          {/* Interactive Question Editor */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Danh sách câu hỏi trong đề ({questions.length} câu)
                </h3>
                <span className="text-xs text-slate-500">
                  (Giáo viên có thể trực tiếp chỉnh sửa câu hỏi, đáp án, lời giải)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ Trắc nghiệm 4 lựa chọn</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddTrueFalse}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-purple-600" />
                  <span>+ Trắc nghiệm Đúng/Sai</span>
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-xs text-slate-400">
                Chưa có câu hỏi nào. Hãy sử dụng form AI ở trên để sinh tự động hoặc bấm nút thêm câu hỏi thủ công.
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {q.type === 'multiple_choice' ? 'Trắc nghiệm 4 lựa chọn' : 'Trắc nghiệm Đúng/Sai'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Question Type: Multiple Choice */}
                    {q.type === 'multiple_choice' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Nội dung câu hỏi</label>
                          <textarea
                            rows={2}
                            value={q.question}
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[idx].question = e.target.value;
                              setQuestions(newQuestions);
                            }}
                            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        {/* Options A, B, C, D */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options?.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl border flex items-center gap-2 transition ${
                                q.correctAnswer === opt.id
                                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const newQuestions = [...questions];
                                  newQuestions[idx].correctAnswer = opt.id;
                                  setQuestions(newQuestions);
                                }}
                                className={`w-6 h-6 rounded-md font-bold text-xs shrink-0 transition ${
                                  q.correctAnswer === opt.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title="Bấm để chọn làm đáp án ĐÚNG"
                              >
                                {opt.id}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const newQuestions = [...questions];
                                  const targetOpt = newQuestions[idx].options?.find((o) => o.id === opt.id);
                                  if (targetOpt) targetOpt.text = e.target.value;
                                  setQuestions(newQuestions);
                                }}
                                className="w-full bg-transparent outline-none text-xs text-slate-800"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Lời giải chi tiết</label>
                          <input
                            type="text"
                            value={q.explanation || ''}
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[idx].explanation = e.target.value;
                              setQuestions(newQuestions);
                            }}
                            placeholder="Nhập lời giải chi tiết..."
                            className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Question Type: True / False */}
                    {q.type === 'true_false' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            Đoạn bối cảnh / Dữ liệu dùng chung
                          </label>
                          <textarea
                            rows={2}
                            value={q.context || ''}
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[idx].context = e.target.value;
                              setQuestions(newQuestions);
                            }}
                            placeholder="Nhập đoạn thông tin bối cảnh..."
                            className="w-full p-2 text-xs bg-purple-50/40 border border-purple-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Câu lệnh dẫn</label>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[idx].question = e.target.value;
                              setQuestions(newQuestions);
                            }}
                            className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        {/* 4 Statements (a, b, c, d) */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold text-slate-700">
                            4 Nhận định và đáp án Đúng / Sai:
                          </label>
                          {q.statements?.map((st, sIdx) => (
                            <div
                              key={st.id || sIdx}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {st.id})
                                </span>
                                <input
                                  type="text"
                                  value={st.text}
                                  onChange={(e) => {
                                    const newQuestions = [...questions];
                                    if (newQuestions[idx].statements) {
                                      newQuestions[idx].statements![sIdx].text = e.target.value;
                                      setQuestions(newQuestions);
                                    }
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newQuestions = [...questions];
                                      if (newQuestions[idx].statements) {
                                        newQuestions[idx].statements![sIdx].isCorrect = true;
                                        setQuestions(newQuestions);
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                      st.isCorrect
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    Đúng
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newQuestions = [...questions];
                                      if (newQuestions[idx].statements) {
                                        newQuestions[idx].statements![sIdx].isCorrect = false;
                                        setQuestions(newQuestions);
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                      !st.isCorrect
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    Sai
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setActiveTab('exams'); resetForm(); }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSaving || questions.length === 0}
                onClick={handleSaveExam}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Lưu Đề Thi lên Firestore (Collection: exams)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: THỐNG KÊ & BẢNG ĐIỂM ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Header controls & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Lọc theo đề thi:</span>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="all">Tất cả đề thi ({submissions.length} bài nộp)</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Bảng Điểm ra Excel / CSV</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng số bài nộp</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{totalSubmissions}</div>
              <p className="text-[11px] text-slate-400 mt-1">Học sinh đã hoàn thành</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Điểm trung bình</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">{avgScore}</div>
              <p className="text-[11px] text-slate-400 mt-1">Thang điểm 10.0</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Điểm cao nhất</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-600">{highestScore}</div>
              <p className="text-[11px] text-slate-400 mt-1">Thấp nhất: {lowestScore}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tỉ lệ đạt (&gt;= 5.0)</span>
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-blue-600">{passRate}%</div>
              <p className="text-[11px] text-slate-400 mt-1">Đạt chuẩn năng lực</p>
            </div>
          </div>

          {/* CÂU HỎI HỌC SINH HAY LÀM SAI NHẤT (Analysis) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Phân tích câu hỏi học sinh hay làm sai nhất
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống tự động thống kê tỉ lệ chọn sai để giáo viên trọng tâm chữa bài trên lớp.
                </p>
              </div>
            </div>

            {questionErrorStats.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                Chưa có dữ liệu bài làm chi tiết để phân tích câu sai.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {questionErrorStats.slice(0, 4).map((item, idx) => (
                  <div
                    key={item.questionId || idx}
                    className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                        Tỉ lệ sai: {item.errorRate}% ({item.wrongAttempts}/{item.totalAttempts} em)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.type === 'multiple_choice' ? 'Trắc nghiệm 4 lựa chọn' : 'Đúng/Sai'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {item.questionText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bảng chi tiết danh sách học sinh nộp bài */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">
                Danh sách học sinh đã nộp bài
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị {filteredSubmissions.length} lượt thi
              </span>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Chưa có học sinh nào nộp bài cho đề thi đã chọn.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Học sinh</th>
                      <th className="px-6 py-3.5">Đề thi</th>
                      <th className="px-6 py-3.5 text-center">Điểm số (/10)</th>
                      <th className="px-6 py-3.5 text-center">Đúng / Tổng</th>
                      <th className="px-6 py-3.5 text-center">Thời gian làm</th>
                      <th className="px-6 py-3.5">Thời điểm nộp</th>
                      <th className="px-6 py-3.5 text-center">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredSubmissions.map((sub) => {
                      const mins = Math.floor(sub.durationSpentSeconds / 60);
                      const secs = sub.durationSpentSeconds % 60;
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{sub.studentName}</div>
                            <div className="text-[11px] text-slate-400">{sub.studentEmail}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 max-w-xs truncate font-semibold">
                            {sub.examTitle}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-xl font-extrabold text-sm ${
                                sub.score >= 8.0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sub.score >= 5.0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {sub.score.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-600">
                            {sub.correctCount} / {sub.totalCount} ({sub.accuracyRate}%)
                          </td>
                          <td className="px-6 py-4 text-center text-slate-600 font-mono">
                            {mins}p {secs}s
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => setInspectingSubmission(sub)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 transition shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                              title="Xem chi tiết các câu học sinh làm sai"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem câu sai</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB: ĐỔI LOGO & THƯƠNG HIỆU ================= */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                  Cá nhân hóa trường học
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                  Tự động đồng bộ
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-500" />
                <span>Thay đổi Logo Trang web & Thương hiệu Trường</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tải tệp ảnh đại diện của trường học hoặc môn học để thay thế logo trên thanh điều hướng, màn hình đăng nhập và bảng điều khiển.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {brandingPreviewLogo && (
                <button
                  type="button"
                  onClick={async () => {
                    setBrandingPreviewLogo(null);
                    setBrandingFileName('');
                    if (brandingFileInputRef.current) brandingFileInputRef.current.value = '';
                    await resetAppLogo();
                    setBrandingSuccess('Đã khôi phục về logo gốc (Mèo Nghiện Điện 🐱⚡)!');
                    setTimeout(() => setBrandingSuccess(null), 3000);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Dùng logo gốc (🐱⚡)</span>
                </button>
              )}
              <button
                type="button"
                disabled={isBrandingSaving || isBrandingProcessing}
                onClick={async () => {
                  try {
                    setIsBrandingSaving(true);
                    setBrandingError(null);
                    if (!brandingPreviewLogo) {
                      await resetAppLogo();
                    } else {
                      await saveAppLogo(brandingPreviewLogo);
                    }
                    setBrandingSuccess('Đã lưu và áp dụng Logo mới thành công!');
                    setTimeout(() => setBrandingSuccess(null), 3000);
                  } catch (err: any) {
                    setBrandingError(err.message || 'Lỗi khi lưu logo.');
                  } finally {
                    setIsBrandingSaving(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-orange-100 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isBrandingSaving ? 'Đang lưu...' : 'Lưu & Áp dụng Logo'}</span>
              </button>
            </div>
          </div>

          {brandingError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{brandingError}</span>
            </div>
          )}

          {brandingSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{brandingSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Upload & Presets */}
            <div className="lg:col-span-7 space-y-6">
              {/* File Dropzone */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Tải tệp ảnh Logo từ máy tính</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Khuyên dùng tỷ lệ vuông (1:1)</span>
                </div>

                <div
                  onClick={() => brandingFileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 rounded-2xl p-6 text-center cursor-pointer transition group"
                >
                  <input
                    ref={brandingFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        setBrandingError('Vui lòng chỉ tải lên tệp hình ảnh (PNG, JPG, WEBP, SVG).');
                        return;
                      }
                      try {
                        setIsBrandingProcessing(true);
                        setBrandingError(null);
                        setBrandingFileName(file.name);
                        const dataUrl = await processLogoFile(file, 400);
                        setBrandingPreviewLogo(dataUrl);
                      } catch (err: any) {
                        setBrandingError(err.message || 'Không thể xử lý ảnh logo.');
                      } finally {
                        setIsBrandingProcessing(false);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {isBrandingProcessing ? 'Đang xử lý và tối ưu hóa tệp ảnh...' : 'Nhấp hoặc Kéo thả ảnh logo vào đây'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Định dạng hỗ trợ: PNG, JPG, JPEG, SVG, WEBP • Kích thước tự động tối ưu
                  </p>
                  {brandingFileName && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full text-xs font-semibold text-indigo-700 border border-indigo-200">
                      <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Đã chọn: {brandingFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Logos */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Hoặc chọn nhanh biểu trưng mẫu Công Nghệ Công Nghiệp
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBrandingPreviewLogo(null);
                      setBrandingFileName('Mèo Nghiện Điện (Mặc định)');
                    }}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                      !brandingPreviewLogo
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-lg shadow-xs">
                      🐱⚡
                    </div>
                    <span className="text-[11px] font-bold">Mèo Nghiện Điện</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const svg = `data:image/svg+xml;utf8,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
                              <stop offset="100%" style="stop-color:#ef4444;stop-opacity:1" />
                            </linearGradient>
                          </defs>
                          <rect width="100" height="100" rx="24" fill="url(#grad1)"/>
                          <path d="M52 16 L28 54 L48 54 L44 84 L72 46 L52 46 Z" fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
                        </svg>
                      `)}`;
                      setBrandingPreviewLogo(svg);
                      setBrandingFileName('Tia Sét Công Nghiệp');
                    }}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                      brandingPreviewLogo?.includes('grad1')
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white text-lg shadow-xs font-bold">
                      ⚡
                    </div>
                    <span className="text-[11px] font-bold">Tia Sét Điện</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const svg = `data:image/svg+xml;utf8,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                              <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
                            </linearGradient>
                          </defs>
                          <rect width="100" height="100" rx="24" fill="url(#grad2)"/>
                          <circle cx="50" cy="50" r="22" fill="none" stroke="#ffffff" stroke-width="7" stroke-dasharray="14 5"/>
                          <circle cx="50" cy="50" r="10" fill="#ffffff"/>
                          <polygon points="50,22 55,34 45,34" fill="#ffffff"/>
                          <polygon points="50,78 55,66 45,66" fill="#ffffff"/>
                        </svg>
                      `)}`;
                      setBrandingPreviewLogo(svg);
                      setBrandingFileName('Cơ Điện & Tự Động Hóa');
                    }}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                      brandingPreviewLogo?.includes('grad2')
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-xs font-bold">
                      ⚙️
                    </div>
                    <span className="text-[11px] font-bold">Cơ Điện Tử</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const svg = `data:image/svg+xml;utf8,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                              <stop offset="100%" style="stop-color:#9333ea;stop-opacity:1" />
                            </linearGradient>
                          </defs>
                          <rect width="100" height="100" rx="24" fill="url(#grad3)"/>
                          <path d="M50 20 L20 36 L50 52 L80 36 Z" fill="#ffffff"/>
                          <path d="M30 44 L30 65 Q50 78 70 65 L70 44" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
                          <path d="M78 38 L84 56 L76 56 Z" fill="#fef08a"/>
                        </svg>
                      `)}`;
                      setBrandingPreviewLogo(svg);
                      setBrandingFileName('Huy Hiệu THPT');
                    }}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                      brandingPreviewLogo?.includes('grad3')
                        ? 'border-purple-500 bg-purple-50/70 text-purple-900 ring-2 ring-purple-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg shadow-xs font-bold">
                      🏫
                    </div>
                    <span className="text-[11px] font-bold">Huy Hiệu THPT</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Context Previews */}
            <div className="lg:col-span-5 space-y-4">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Xem trước logo thực tế trên các giao diện
              </label>

              {/* Preview 1: Navbar */}
              <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  1. Trên thanh điều hướng (Navbar)
                </span>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200/80 flex items-center justify-center shadow-xs shrink-0 p-0.5">
                    {brandingPreviewLogo ? (
                      <img src={brandingPreviewLogo} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-white text-lg">
                        🐱⚡
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">Mèo Nghiện Điện</div>
                    <div className="text-[10px] text-amber-700 font-semibold">Công Nghệ Công Nghiệp</div>
                  </div>
                </div>
              </div>

              {/* Preview 2: Auth Card */}
              <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  2. Trên màn hình Đăng nhập & Đăng ký
                </span>
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs text-center space-y-1.5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-xs mx-auto flex items-center justify-center p-1">
                    {brandingPreviewLogo ? (
                      <img src={brandingPreviewLogo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-white text-2xl font-bold">
                        🐱⚡
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">Mèo Nghiện Điện</div>
                  <div className="text-[10px] text-slate-500">Ôn Thi & Kiểm Tra Công Nghệ Công Nghiệp</div>
                </div>
              </div>

              {/* Save Prompt */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-bold">Lưu ý sau khi chọn ảnh:</p>
                  <p className="mt-0.5">
                    Hãy bấm nút <strong>"Lưu & Áp dụng Logo"</strong> ở góc trên để cập nhật hình ảnh trên máy tính và cơ sở dữ liệu Firebase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: HƯỚNG DẪN FIREBASE & PHÂN QUYỀN ================= */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 text-xs text-slate-700">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Hướng dẫn triển khai Firebase & Cấp quyền Giáo viên (Admin)</span>
            </h2>
            <p className="text-slate-500 mt-1">
              Thực hiện theo tài liệu hướng dẫn để kết nối cơ sở dữ liệu Firestore và cài đặt phân quyền chuẩn xác.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>1. Cấu hình dịch vụ trên Firebase Console</span>
              </h3>
              <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                <li>Vào <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">console.firebase.google.com</code> và tạo dự án mới.</li>
                <li>Mục <strong>Authentication</strong>: Bấm <em>Get Started</em> &gt; chọn <strong>Email/Password</strong> &gt; Bật (Enable) &gt; Lưu.</li>
                <li>Mục <strong>Firestore Database</strong>: Bấm <em>Create Database</em> &gt; Chọn vị trí (ví dụ <code className="bg-slate-100 px-1 py-0.5 rounded">asia-southeast1</code> hoặc <code className="bg-slate-100 px-1 py-0.5 rounded">us-central</code>) &gt; Chọn <strong>Start in Test Mode</strong>.</li>
                <li>Vào <strong>Project Settings (Cài đặt dự án)</strong> &gt; mục <em>Your apps</em> &gt; Thêm Web App &gt; Copy khối mã <code className="bg-slate-100 px-1 py-0.5 rounded">firebaseConfig</code> dán vào nút <em>Cấu hình Firebase</em> trên thanh menu.</li>
              </ol>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>2. Cấp quyền Giáo viên (Admin Role)</span>
              </h3>
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                <p className="font-semibold text-purple-900">
                  Cách gán quyền Giáo viên qua UID:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-purple-800">
                  <li>Đăng ký tài khoản giáo viên lần đầu trên SmartTest Online.</li>
                  <li>Vào Firebase Console &gt; <strong>Authentication</strong> &gt; tìm tài khoản vừa tạo &gt; Copy <strong>User UID</strong>.</li>
                  <li>Vào <strong>Firestore Database</strong> &gt; Collection <code className="bg-purple-200/70 px-1 py-0.5 rounded">users</code> &gt; Document có ID trùng với UID đó &gt; Sửa trường <code className="bg-purple-200/70 px-1 py-0.5 rounded">role</code> thành <code className="bg-purple-200/70 px-1 py-0.5 rounded">"teacher"</code>.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission details and wrong answers analysis modal */}
      {inspectingSubmission && (
        <SubmissionDetailModal
          submission={inspectingSubmission}
          exams={exams}
          onClose={() => setInspectingSubmission(null)}
        />
      )}
    </div>
  );
};
