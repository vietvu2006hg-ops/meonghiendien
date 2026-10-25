import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  X,
  Sparkles,
  AlertCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import { processLogoFile } from '../utils/imageUtils.ts';
import { saveAppLogo, resetAppLogo } from '../firebase/service.ts';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string | null;
}

// Built-in SVG/preset data URLs for quick school & tech selection
const PRESET_LOGOS: { id: string; name: string; icon: string; dataUrl: string }[] = [
  {
    id: 'electric_cat',
    name: 'Mèo Nghiện Điện (Mặc định)',
    icon: '🐱⚡',
    dataUrl: '', // empty means default emoji/gradient
  },
  {
    id: 'power_tech',
    name: 'Tia Sét Công Nghiệp',
    icon: '⚡',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
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
    `)}`,
  },
  {
    id: 'gear_circuit',
    name: 'Cơ Điện & Tự Động Hóa',
    icon: '⚙️⚡',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
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
    `)}`,
  },
  {
    id: 'school_tech',
    name: 'Huy Hiệu THPT Công Nghệ',
    icon: '🏫',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
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
    `)}`,
  },
];

export const LogoManagerModal: React.FC<LogoManagerModalProps> = ({
  isOpen,
  onClose,
  currentLogo,
}) => {
  const [previewLogo, setPreviewLogo] = useState<string | null>(currentLogo);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview when currentLogo changes
  React.useEffect(() => {
    setPreviewLogo(currentLogo);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [currentLogo, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chỉ tải lên tệp hình ảnh (PNG, JPG, WEBP, SVG, GIF).');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setSelectedFileName(file.name);

      const processedDataUrl = await processLogoFile(file, 400);
      setPreviewLogo(processedDataUrl);
    } catch (err: any) {
      console.error('Lỗi xử lý ảnh logo:', err);
      setErrorMessage(err.message || 'Không thể đọc tệp hình ảnh. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      if (!previewLogo) {
        await resetAppLogo();
      } else {
        await saveAppLogo(previewLogo);
      }

      setSuccessMessage('Đã cập nhật logo thành công!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Lỗi khi lưu logo:', err);
      setErrorMessage(err.message || 'Không thể lưu logo vào hệ thống.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setPreviewLogo(null);
    setSelectedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-100">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Thay đổi Logo Trang web / Trường học
              </h3>
              <p className="text-xs text-slate-500">
                Tải ảnh mới để đồng bộ logo hiển thị trên toàn hệ thống Mèo Nghiện Điện
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 py-5 space-y-6 pr-1">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Tải ảnh logo từ máy tính
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-6 text-center cursor-pointer transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-indigo-600 group-hover:scale-110 transition">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                {isProcessing ? 'Đang xử lý ảnh...' : 'Nhấp hoặc Kéo thả tệp ảnh logo vào đây'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Hỗ trợ PNG, JPG, JPEG, WEBP, SVG • Tự động tối ưu độ nét
              </p>
              {selectedFileName && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs font-semibold text-indigo-700 border border-indigo-100 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{selectedFileName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preset Logos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Hoặc chọn logo mẫu có sẵn
              </label>
              <span className="text-[11px] text-slate-400">Chọn nhanh 1 chạm</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESET_LOGOS.map((preset) => {
                const isSelected = preset.dataUrl === '' ? !previewLogo : previewLogo === preset.dataUrl;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (preset.dataUrl === '') {
                        handleResetToDefault();
                      } else {
                        setPreviewLogo(preset.dataUrl);
                        setSelectedFileName(preset.name);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                      {preset.dataUrl ? (
                        <img src={preset.dataUrl} alt={preset.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-base">
                          🐱⚡
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-bold truncate max-w-full leading-tight">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Comparison */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Xem trước hiển thị thực tế</span>
              </span>
              {previewLogo && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Dùng lại logo gốc (🐱⚡)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Preview on Navbar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200/80 flex items-center justify-center shadow-xs shrink-0">
                  {previewLogo ? (
                    <img src={previewLogo} alt="Preview" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-white font-bold text-lg">
                      🐱⚡
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-800">Mèo Nghiện Điện</div>
                  <div className="text-[10px] text-slate-400">Xem trước trên Navbar</div>
                </div>
              </div>

              {/* Preview in Large Card */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-slate-200/80 flex items-center justify-center shadow-xs shrink-0">
                  {previewLogo ? (
                    <img src={previewLogo} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-white font-bold text-2xl">
                      🐱⚡
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-800">Biểu tượng Đăng nhập</div>
                  <div className="text-[10px] text-slate-400">Xem trước trên Thẻ xác thực</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving || isProcessing}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu logo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Lưu & Áp dụng Logo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
