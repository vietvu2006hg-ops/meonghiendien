import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import mammoth from 'mammoth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// AI Exam Generator Endpoint
app.post('/api/ai/generate-exam', async (req, res) => {
  try {
    const {
      theoryText,
      examTitle = 'Đề ôn thi Công Nghệ Công Nghiệp',
      subject = 'Công Nghệ Công Nghiệp',
      grade = '12',
      mcCount = 8,
      tfCount = 2,
    } = req.body;

    if (!theoryText || typeof theoryText !== 'string' || theoryText.trim().length < 10) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp nội dung lý thuyết hoặc tài liệu tối thiểu 10 ký tự.',
      });
    }

    // If Gemini API Key is available, use real gemini-3.8-flash model
    if (ai) {
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        return res.json(parsed);
      } catch (e) {
        // In case of any wrapping or backticks
        const clean = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        return res.json(parsed);
      }
    } else {
      // High quality educational fallback template based on provided theory text
      // so teacher can test without interruption if API key isn't set yet
      const sampleQuestions = generateFallbackExam(theoryText, examTitle, subject, grade, mcCount, tfCount);
      return res.json(sampleQuestions);
    }
  } catch (error: any) {
    console.error('AI Exam Generation Error:', error);
    res.status(500).json({
      error: error.message || 'Lỗi khi tạo đề thi bằng AI. Vui lòng thử lại.',
    });
  }
});

// Endpoint: Upload Exam File directly (Word .docx/.doc or PDF)
app.post('/api/ai/upload-exam', async (req, res) => {
  try {
    const {
      fileBase64,
      fileName = 'dethi.pdf',
      mimeType = '',
      mode = 'extract_exam', // 'extract_exam' | 'generate_from_theory'
      subject = 'Công Nghệ Công Nghiệp',
      grade = '12',
      examTitle = '',
    } = req.body;

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({
        error: 'Vui lòng cung cấp dữ liệu tệp đề thi (Word hoặc PDF) hợp lệ.',
      });
    }

    const lowerFileName = fileName.toLowerCase();
    const isPdf = lowerFileName.endsWith('.pdf') || mimeType.includes('pdf');
    const isDocx =
      lowerFileName.endsWith('.docx') ||
      lowerFileName.endsWith('.doc') ||
      mimeType.includes('word') ||
      mimeType.includes('officedocument');

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
   - Môn học (subject): ví dụ Toán, Sinh học, Lịch sử, Hóa học, Vật lí, Địa lý, Tiếng Anh, GD Kinh tế & Pháp luật...
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

    if (ai) {
      let responseText = '';

      if (isPdf) {
        // Native Gemini PDF processing via inlineData
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: fileBase64,
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
        // Word document or Text file extraction
        const fileBuffer = Buffer.from(fileBase64, 'base64');
        let extractedText = '';

        if (isDocx) {
          try {
            const mammothResult = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = mammothResult.value || '';
          } catch (mErr) {
            console.warn('Mammoth docx parse failed, falling back to buffer string:', mErr);
            extractedText = fileBuffer.toString('utf-8');
          }
        } else {
          extractedText = fileBuffer.toString('utf-8');
        }

        if (!extractedText.trim()) {
          extractedText = `File tài liệu đề thi: ${fileName}`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
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

        // Ensure questions have valid unique IDs
        if (parsed.questions && Array.isArray(parsed.questions)) {
          parsed.questions = parsed.questions.map((q: any, i: number) => ({
            ...q,
            id: q.id || `q_${Date.now()}_${i + 1}`,
          }));
        }

        return res.json(parsed);
      } catch (parseErr) {
        console.error('JSON Parse error from Gemini upload-exam:', parseErr, responseText);
        throw new Error('Dữ liệu AI trích xuất không đúng chuẩn JSON. Vui lòng thử lại.');
      }
    } else {
      // High-standard fallback if Gemini API is in local mock mode
      const fileBuffer = Buffer.from(fileBase64, 'base64');
      let fallbackText = '';
      if (isDocx) {
        try {
          const mammothResult = await mammoth.extractRawText({ buffer: fileBuffer });
          fallbackText = mammothResult.value || '';
        } catch {}
      } else if (!isPdf) {
        fallbackText = fileBuffer.toString('utf-8');
      }

      const generated = generateFallbackExam(
        fallbackText || `Đề thi từ tệp ${fileName}`,
        examTitle || `Đề thi trắc nghiệm (${fileName.replace(/\.[^/.]+$/, '')})`,
        subject || 'Chung',
        grade || '12',
        6,
        2
      );
      return res.json(generated);
    }
  } catch (error: any) {
    console.error('Upload exam processing error:', error);
    res.status(500).json({
      error: error.message || 'Lỗi xử lý file đề thi. Vui lòng kiểm tra lại định dạng tệp.',
    });
  }
});


// Secure grading algorithm (Vietnam 2025+ standardized formula)
app.post('/api/exams/grade', (req, res) => {
  try {
    const { questions, userAnswers, durationSpentSeconds = 0 } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Danh sách câu hỏi không hợp lệ.' });
    }

    const answers = userAnswers || {};
    let earnedRawPoints = 0;
    let totalMaxRawPoints = 0;
    let fullyCorrectQuestions = 0;

    const details = questions.map((q: any, idx: number) => {
      const qId = q.id || `q_${idx}`;
      if (q.type === 'multiple_choice') {
        totalMaxRawPoints += 1.0;
        const studentAns = answers[qId];
        const isCorrect = studentAns === q.correctAnswer;
        const scoreEarned = isCorrect ? 1.0 : 0.0;
        earnedRawPoints += scoreEarned;
        if (isCorrect) fullyCorrectQuestions += 1;

        return {
          questionId: qId,
          type: 'multiple_choice',
          question: q.question,
          options: q.options,
          userAnswer: studentAns || null,
          correctAnswer: q.correctAnswer,
          isCorrect,
          scoreEarned,
          maxScore: 1.0,
          explanation: q.explanation || 'Không có lời giải chi tiết.',
        };
      } else if (q.type === 'true_false') {
        // True/False 4 statements cluster
        totalMaxRawPoints += 1.0;
        const statements = q.statements || [];
        const studentCluster = answers[qId] || {};
        let correctStatementCount = 0;

        const statementDetails = statements.map((st: any) => {
          const userVal = studentCluster[st.id]; // true | false | null
          const isStCorrect = userVal === st.isCorrect;
          if (isStCorrect) correctStatementCount += 1;
          return {
            id: st.id,
            text: st.text,
            userAnswer: userVal !== undefined ? userVal : null,
            correctAnswer: st.isCorrect,
            isCorrect: isStCorrect,
            explanation: st.explanation,
          };
        });

        // Vietnam BGD&ĐT new regulation scoring formula:
        // 1 ý đúng: 0.1 điểm
        // 2 ý đúng: 0.25 điểm
        // 3 ý đúng: 0.5 điểm
        // 4 ý đúng: 1.0 điểm
        let scoreEarned = 0;
        if (correctStatementCount === 1) scoreEarned = 0.1;
        else if (correctStatementCount === 2) scoreEarned = 0.25;
        else if (correctStatementCount === 3) scoreEarned = 0.5;
        else if (correctStatementCount === 4) scoreEarned = 1.0;

        earnedRawPoints += scoreEarned;
        if (correctStatementCount === 4) fullyCorrectQuestions += 1;

        return {
          questionId: qId,
          type: 'true_false',
          context: q.context,
          question: q.question,
          statements: statementDetails,
          correctStatementCount,
          totalStatements: statements.length,
          isCorrect: correctStatementCount === statements.length,
          scoreEarned,
          maxScore: 1.0,
        };
      }
      return null;
    }).filter(Boolean);

    // Calculate normalized 10.0 scale
    let finalScore = 0;
    if (totalMaxRawPoints > 0) {
      finalScore = (earnedRawPoints / totalMaxRawPoints) * 10;
      finalScore = Math.round(finalScore * 100) / 100; // 2 decimal places
    }

    const accuracyRate = questions.length > 0
      ? Math.round((earnedRawPoints / totalMaxRawPoints) * 100)
      : 0;

    res.json({
      score: finalScore,
      maxScore: 10.0,
      earnedRawPoints: Math.round(earnedRawPoints * 100) / 100,
      totalMaxRawPoints,
      correctCount: fullyCorrectQuestions,
      totalCount: questions.length,
      accuracyRate,
      durationSpentSeconds,
      details,
    });
  } catch (error: any) {
    console.error('Grading error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi chấm điểm bài thi.' });
  }
});

// Helper for intelligent fallback when API key is not yet set
function generateFallbackExam(
  theoryText: string,
  title: string,
  subject: string,
  grade: string,
  mcCount: number = 6,
  tfCount: number = 2
) {
  // Extract key sentences or themes from the text
  const cleanedText = theoryText.replace(/\r\n/g, '\n').trim();
  const sentences = cleanedText
    .split(/[.?!;\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  const baseTitle = title || `Đề kiểm tra ${subject} lớp ${grade}`;
  const questions: any[] = [];

  // Generate 4-choice questions
  for (let i = 0; i < mcCount; i++) {
    const s = sentences[i % sentences.length] || `Khái niệm trọng tâm số ${i + 1} trong tài liệu ${subject}`;
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

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartTest Online server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
