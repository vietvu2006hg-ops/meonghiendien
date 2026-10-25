import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import { Question } from '../types.ts';

// Get Gemini API Key from Vite environment variable or localStorage for GitHub Pages
export const getGeminiApiKey = (): string => {
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  const localKey =
    localStorage.getItem('VITE_GEMINI_API_KEY') ||
    localStorage.getItem('GEMINI_API_KEY') ||
    '';
  return localKey.trim();
};

export const setCustomGeminiApiKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem('VITE_GEMINI_API_KEY', key.trim());
  } else {
    localStorage.removeItem('VITE_GEMINI_API_KEY');
    localStorage.removeItem('GEMINI_API_KEY');
  }
};

const getAiClient = (): GoogleGenAI | null => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export interface GenerateExamParams {
  theoryText: string;
  examTitle?: string;
  subject?: string;
  grade?: string;
  mcCount?: number;
  tfCount?: number;
}

export interface ExamGenerationResult {
  title: string;
  description?: string;
  subject?: string;
  grade?: string;
  durationMinutes?: number;
  questions: Question[];
}

/**
 * Sinh đề thi trắc nghiệm từ văn bản lý thuyết trực tiếp trên Frontend bằng @google/genai (gemini-1.5-flash)
 */
export async function generateExamFromTheory(
  params: GenerateExamParams
): Promise<ExamGenerationResult> {
  const {
    theoryText,
    examTitle = 'Đề ôn thi Công Nghệ Công Nghiệp',
    subject = 'Công Nghệ Công Nghiệp',
    grade = '12',
    mcCount = 8,
    tfCount = 2,
  } = params;

  if (!theoryText || theoryText.trim().length < 10) {
    throw new Error('Vui lòng cung cấp nội dung lý thuyết hoặc tài liệu tối thiểu 10 ký tự.');
  }

  const aiClient = getAiClient();
  if (aiClient) {
    const prompt = `Bạn là chuyên gia giáo dục và biên soạn đề thi trắc nghiệm theo chuẩn chương trình GDPT mới nhất của Bộ Giáo dục & Đào tạo Việt Nam.
Nhiệm vụ: Đọc kỹ tài liệu lý thuyết sau đây và biên soạn một bộ đề thi trắc nghiệm chất lượng cao gồm:
- ${mcCount} câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D)
- ${tfCount} câu hỏi trắc nghiệm Đúng/Sai (Định dạng mới: mỗi câu có 1 bối cảnh/đoạn trích thông tin chung và đúng 4 nhận định a, b, c, d với đáp án Đúng hoặc Sai)

Môn học: ${subject}
Khối lớp: ${grade}
Tiêu đề dự kiến: ${examTitle}

Nội dung lý thuyết cung cấp:
"""
${theoryText.slice(0, 15000)}
"""

Yêu cầu BẮT BUỘC về kết quả:
Trả về DUY NHẤT một đối tượng JSON hợp lệ (không kèm markdown backticks, không kèm text ngoài JSON) theo cấu trúc sau:
{
  "title": "${examTitle}",
  "description": "Đề thi kiểm tra kiến thức về ${subject}",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Nội dung câu hỏi trắc nghiệm 4 lựa chọn...",
      "options": [
        {"id": "A", "text": "Lựa chọn A"},
        {"id": "B", "text": "Lựa chọn B"},
        {"id": "C", "text": "Lựa chọn C"},
        {"id": "D", "text": "Lựa chọn D"}
      ],
      "correctAnswer": "A",
      "explanation": "Lời giải thích chi tiết tại sao A đúng và các đáp án khác sai."
    },
    {
      "id": "q2",
      "type": "true_false",
      "context": "Đoạn văn bản bối cảnh hoặc đoạn trích dữ liệu làm cơ sở cho 4 nhận định...",
      "question": "Dựa vào thông tin trên, hãy xác định tính Đúng/Sai của mỗi nhận định sau:",
      "statements": [
        {"id": "a", "text": "Nhận định thứ nhất...", "isCorrect": true, "explanation": "Giải thích chi tiết nhận định a..."},
        {"id": "b", "text": "Nhận định thứ hai...", "isCorrect": false, "explanation": "Giải thích chi tiết nhận định b..."},
        {"id": "c", "text": "Nhận định thứ ba...", "isCorrect": true, "explanation": "Giải thích chi tiết nhận định c..."},
        {"id": "d", "text": "Nhận định thứ tư...", "isCorrect": false, "explanation": "Giải thích chi tiết nhận định d..."}
      ]
    }
  ]
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const responseText = response.text || '';
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        parsed.questions = parsed.questions.map((q: any, i: number) => ({
          ...q,
          id: q.id || `q_${Date.now()}_${i + 1}`,
        }));
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse AI response:', e, responseText);
      throw new Error('Dữ liệu từ Gemini AI không thể đọc được dưới dạng JSON. Vui lòng thử lại.');
    }
  } else {
    // Fallback template when no API key configured
    return generateFallbackExam(theoryText, examTitle, subject, grade, mcCount, tfCount);
  }
}

/**
 * Trích xuất đề thi từ file Word (.docx, .doc), PDF hoặc TXT trực tiếp trên Frontend bằng gemini-1.5-flash
 */
export async function extractExamFromFile(
  file: File,
  options: {
    mode?: 'extract_exam' | 'generate_from_theory';
    subject?: string;
    grade?: string;
    examTitle?: string;
  } = {}
): Promise<ExamGenerationResult> {
  const {
    mode = 'extract_exam',
    subject = 'Công Nghệ Công Nghiệp',
    grade = '12',
    examTitle = '',
  } = options;

  const fileName = file.name;
  const lowerFileName = fileName.toLowerCase();
  const isPdf = lowerFileName.endsWith('.pdf') || file.type.includes('pdf');
  const isDocx =
    lowerFileName.endsWith('.docx') ||
    lowerFileName.endsWith('.doc') ||
    file.type.includes('word') ||
    file.type.includes('officedocument');

  const promptInstructions = `Bạn là chuyên gia giáo dục và khảo thí hàng đầu tại Việt Nam, am hiểu sâu sắc quy chuẩn đề thi trắc nghiệm theo Chương trình GDPT mới nhất của Bộ Giáo dục & Đào tạo.

NHIỆM VỤ CỦA BẠN:
Đọc và phân tích file đề thi/tài liệu đính kèm (Tên file: "${fileName}").
Chế độ xử lý: "${mode === 'extract_exam' ? 'BÓC TÁCH VÀ CHUYỂN ĐỔI ĐỀ THI CÓ SẴN' : 'TẠO BỘ ĐỀ THI MỚI TỪ TÀI LIỆU'}".

YÊU CẦU CHI TIẾT:
1. Nhận diện và trích xuất TOÀN BỘ các câu hỏi trắc nghiệm có trong file:
   - Dạng 1: Trắc nghiệm 4 lựa chọn (A, B, C, D)
   - Dạng 2: Trắc nghiệm Đúng / Sai (Gồm 1 đoạn bối cảnh/dữ liệu chung và đúng 4 nhận định a, b, c, d với tính Đúng/Sai)
2. Xác định Đáp án chuẩn và Lời giải:
   - Nếu trong file đề đã có sẵn đáp án (được in đậm, gạch chân, hoặc có bảng đáp án ở cuối đề thi), hãy lấy chính xác đáp án đó.
   - Nếu đề thi CHƯA có đáp án hoặc chưa có lời giải, chuyên gia AI hãy giải chính xác 100% để gán đáp án đúng cho từng câu, đồng thời viết "Lời giải chi tiết" (explanation) rõ ràng để học sinh đối chiếu sau khi nộp bài.
3. Trích xuất hoặc suy luận:
   - Tiêu đề đề thi (title): lấy theo tiêu đề trong file hoặc gợi ý theo môn học
   - Môn học (subject): ví dụ Toán, Sinh học, Lịch sử, Hóa học, Vật lí, Địa lý, Tiếng Anh, GD Kinh tế & Pháp luật, Công Nghệ Công Nghiệp...
   - Khối lớp (grade): ví dụ Lớp 10, Lớp 11, Lớp 12
   - Thời gian làm bài (durationMinutes): nếu trong file có ghi thời gian (ví dụ 45 phút, 50 phút, 90 phút) hãy lấy đúng số phút đó, nếu không ghi thì mặc định 45 phút.

YÊU CẦU ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm backticks markdown, không kèm văn bản ngoài JSON) theo cấu trúc:
{
  "title": "${examTitle || 'Đề kiểm tra trắc nghiệm'}",
  "subject": "${subject || 'Chung'}",
  "grade": "${grade || 'Lớp 12'}",
  "durationMinutes": 45,
  "description": "Đề thi được trích xuất trực tiếp từ file ${fileName}",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Nội dung câu hỏi trắc nghiệm 4 lựa chọn...",
      "options": [
        {"id": "A", "text": "Nội dung lựa chọn A"},
        {"id": "B", "text": "Nội dung lựa chọn B"},
        {"id": "C", "text": "Nội dung lựa chọn C"},
        {"id": "D", "text": "Nội dung lựa chọn D"}
      ],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết..."
    },
    {
      "id": "q2",
      "type": "true_false",
      "context": "Đoạn thông tin bối cảnh hoặc bảng dữ liệu chung...",
      "question": "Dựa vào thông tin trên, hãy xác định tính Đúng/Sai của mỗi nhận định sau:",
      "statements": [
        {"id": "a", "text": "Nhận định a", "isCorrect": true, "explanation": "Giải thích chi tiết nhận định a..."},
        {"id": "b", "text": "Nhận định b", "isCorrect": false, "explanation": "Giải thích chi tiết nhận định b..."},
        {"id": "c", "text": "Nhận định c", "isCorrect": true, "explanation": "Giải thích chi tiết nhận định c..."},
        {"id": "d", "text": "Nhận định d", "isCorrect": false, "explanation": "Giải thích chi tiết nhận định d..."}
      ]
    }
  ]
}`;

  const aiClient = getAiClient();

  if (aiClient) {
    let responseText = '';

    if (isPdf) {
      // Direct PDF processing via Base64 inlineData to Gemini 1.5 Flash
      const base64Data = await fileToBase64(file);
      const response = await aiClient.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: promptInstructions,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      responseText = response.text || '';
    } else {
      // Word (.docx) or Text extraction via mammoth in browser
      let extractedText = '';
      if (isDocx) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const mammothResult = await mammoth.extractRawText({ arrayBuffer } as any);
          extractedText = mammothResult.value || '';
        } catch (mErr) {
          console.warn('Mammoth extraction failed, fallback to file text:', mErr);
          extractedText = await file.text().catch(() => '');
        }
      } else {
        extractedText = await file.text().catch(() => '');
      }

      if (!extractedText.trim()) {
        extractedText = `File tài liệu đề thi: ${fileName}`;
      }

      const response = await aiClient.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `${promptInstructions}\n\nNỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ FILE "${fileName}":\n"""\n${extractedText.slice(0, 50000)}\n"""`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      responseText = response.text || '';
    }

    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        parsed.questions = parsed.questions.map((q: any, i: number) => ({
          ...q,
          id: q.id || `q_${Date.now()}_${i + 1}`,
        }));
      }
      return parsed;
    } catch (parseErr) {
      console.error('JSON Parse error from Gemini upload-exam:', parseErr, responseText);
      throw new Error('Dữ liệu AI trích xuất không đúng chuẩn JSON. Vui lòng thử lại.');
    }
  } else {
    // High standard fallback when API key is not yet set
    let fallbackText = '';
    if (isDocx) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const mammothResult = await mammoth.extractRawText({ arrayBuffer } as any);
        fallbackText = mammothResult.value || '';
      } catch {}
    } else if (!isPdf) {
      try {
        fallbackText = await file.text();
      } catch {}
    }

    return generateFallbackExam(
      fallbackText || `Đề thi từ tệp ${fileName}`,
      examTitle || `Đề thi trắc nghiệm (${fileName.replace(/\.[^/.]+$/, '')})`,
      subject || 'Công Nghệ Công Nghiệp',
      grade || '12',
      6,
      2
    );
  }
}

// Convert File to raw base64 string
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Fallback exam generator
export function generateFallbackExam(
  theoryText: string,
  title: string,
  subject: string,
  grade: string,
  mcCount: number = 6,
  tfCount: number = 2
): ExamGenerationResult {
  const cleanedText = theoryText.replace(/\r\n/g, '\n').trim();
  const sentences = cleanedText
    .split(/[.?!;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const baseTitle = title || `Đề kiểm tra ${subject} lớp ${grade}`;
  const questions: Question[] = [];

  // Generate 4-choice questions
  for (let i = 0; i < mcCount; i++) {
    const s =
      sentences[i % sentences.length] ||
      `Khái niệm trọng tâm số ${i + 1} trong tài liệu ${subject}`;
    questions.push({
      id: `mc_${Date.now()}_${i + 1}`,
      type: 'multiple_choice',
      question: `Theo nội dung tài liệu về "${subject}", khẳng định nào sau đây là ĐÚNG nhất liên quan đến: "${s.slice(0, 90)}..."?`,
      options: [
        { id: 'A', text: `Nội dung cốt lõi: ${s.slice(0, 70)}.` },
        { id: 'B', text: `Khái niệm chỉ áp dụng trong điều kiện ngoại lệ không phổ biến.` },
        { id: 'C', text: `Hiện tượng không có mối liên hệ nhân quả với bối cảnh thực tiễn.` },
        { id: 'D', text: `Tất cả các khẳng định trên đều không có cơ sở khoa học.` },
      ],
      correctAnswer: 'A',
      explanation: `Dựa vào tài liệu lý thuyết: "${s}", nhận định A là chính xác theo đúng nguyên văn và bản chất kiến thức.`,
    });
  }

  // Generate True/False 4-statement clusters
  for (let j = 0; j < tfCount; j++) {
    const s1 = sentences[(j * 2) % sentences.length] || 'Đặc trưng cơ bản thứ nhất';
    const s2 = sentences[(j * 2 + 1) % sentences.length] || 'Đặc trưng cơ bản thứ hai';
    questions.push({
      id: `tf_${Date.now()}_${j + 1}`,
      type: 'true_false',
      context: `Cho đoạn trích sau về chuyên đề ${subject}:\n"${s1}. Đồng thời, các yếu tố này tác động trực tiếp: ${s2}."`,
      question: 'Dựa vào kiến thức lý thuyết đã học và đoạn trích trên, hãy xác định tính Đúng/Sai của các mệnh đề sau:',
      statements: [
        {
          id: 'a',
          text: `Nội dung: ${s1.slice(0, 80)} phản ánh đúng nguyên lý cơ bản.`,
          isCorrect: true,
          explanation: 'Nhận định này hoàn toàn phù hợp với lý thuyết được trình bày trong bài.',
        },
        {
          id: 'b',
          text: `Quy luật trên hoàn toàn mâu thuẫn với nhận định: ${s2.slice(0, 60)}.`,
          isCorrect: false,
          explanation: 'Sai vì hai nội dung này bổ trợ và thống nhất với nhau trong cùng một hệ thống.',
        },
        {
          id: 'c',
          text: `Có thể ứng dụng các kết luận từ bối cảnh trên vào giải quyết bài toán thực tiễn.`,
          isCorrect: true,
          explanation: 'Đúng, đây là mục tiêu ứng dụng cốt lõi của môn học.',
        },
        {
          id: 'd',
          text: `Nếu đảo ngược điều kiện đầu vào, kết quả vận hành vẫn không hề thay đổi.`,
          isCorrect: false,
          explanation: 'Sai vì kết quả phụ thuộc chặt chẽ vào các thông số và điều kiện đầu vào.',
        },
      ],
    });
  }

  return {
    title: baseTitle,
    description: `Bộ đề thi trắc nghiệm được tổng hợp từ tài liệu lý thuyết ${subject}`,
    subject,
    grade,
    durationMinutes: 45,
    questions,
  };
}
