import React, { useState } from 'react';
import { X, Database, Key, Shield, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { getSavedFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, isFirebaseActive } from '../firebase/config.ts';
import { FirebaseCustomConfig } from '../types.ts';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getSavedFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');
  const [rawConfigText, setRawConfigText] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-parse config pasted from Firebase Console
  const handleParseRaw = () => {
    try {
      setError(null);
      let text = rawConfigText.trim();
      if (text.includes('const firebaseConfig =')) {
        text = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      }
      // Relaxed JSON parsing for JS object keys
      const clean = text
        .replace(/([a-zA-Z0-9_]+):/g, '"$1":')
        .replace(/'/g, '"')
        .replace(/,\s*}/g, '}');

      const parsed = JSON.parse(clean);
      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
      if (parsed.appId) setAppId(parsed.appId);
      setPasteMode(false);
    } catch (e) {
      setError('Không thể tự động phân tích mã config. Vui lòng nhập từng trường bên dưới.');
    }
  };

  const handleSave = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setError('Vui lòng điền tối thiểu API Key và Project ID.');
      return;
    }
    const newConfig: FirebaseCustomConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim() || '123456789',
      appId: appId.trim() || '1:123456789:web:abcdef',
    };
    saveFirebaseConfig(newConfig);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Cấu hình kết nối Firebase</h3>
              <p className="text-xs text-slate-500">Kết nối Firestore Database & Authentication của trường học</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status banner */}
          {isFirebaseActive ? (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">Đang kết nối Firebase thành công!</p>
                <p className="text-xs text-emerald-700">Project ID: <span className="font-mono font-medium">{currentConfig?.projectId}</span></p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold">Chế độ giả lập Local Storage đang kích hoạt</p>
                <p className="text-xs text-amber-700">Ứng dụng hoạt động mượt mà với dữ liệu mẫu. Dán thông số Firebase bên dưới để lưu trữ thực tế trên Cloud.</p>
              </div>
            </div>
          )}

          {/* Quick paste helper */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nhập thông số cấu hình
              </label>
              <button
                type="button"
                onClick={() => setPasteMode(!pasteMode)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {pasteMode ? '← Nhập theo từng ô' : '📋 Dán nguyên khối firebaseConfig'}
              </button>
            </div>

            {pasteMode ? (
              <div className="space-y-2">
                <textarea
                  rows={5}
                  value={rawConfigText}
                  onChange={(e) => setRawConfigText(e.target.value)}
                  placeholder="Dán đoạn const firebaseConfig = { ... } lấy từ Firebase Console vào đây..."
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleParseRaw}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition"
                >
                  Tự động điền dữ liệu
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">apiKey *</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">projectId *</label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="smarttest-school-123"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">authDomain</label>
                  <input
                    type="text"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    placeholder="project.firebaseapp.com"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">storageBucket</label>
                  <input
                    type="text"
                    value={storageBucket}
                    onChange={(e) => setStorageBucket(e.target.value)}
                    placeholder="project.appspot.com"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">messagingSenderId</label>
                  <input
                    type="text"
                    value={messagingSenderId}
                    onChange={(e) => setMessagingSenderId(e.target.value)}
                    placeholder="123456789"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">appId</label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="1:123456789:web:abc"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="mt-2 text-xs text-rose-600 font-medium">{error}</p>
            )}
          </div>

          {/* Quick instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>3 bước kích hoạt trên Firebase Console:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Truy cập <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold inline-flex items-center gap-0.5 hover:underline">console.firebase.google.com <ExternalLink className="w-3 h-3 inline" /></a> và tạo một Project mới.</li>
              <li>Vào <strong>Authentication</strong> &gt; <strong>Sign-in method</strong> &gt; Bật <strong>Email/Password</strong>.</li>
              <li>Vào <strong>Firestore Database</strong> &gt; Bấm <strong>Create Database</strong> &gt; Chọn chế độ <strong>Start in test mode</strong>.</li>
              <li>Vào <strong>Project settings</strong> &gt; Mục <strong>General</strong> &gt; Kéo xuống tạo Web App và copy đoạn mã <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">firebaseConfig</code> dán vào đây!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          {currentConfig ? (
            <button
              type="button"
              onClick={clearFirebaseConfig}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium"
            >
              Xóa cấu hình & Về Demo
            </button>
          ) : (
            <span className="text-xs text-slate-400">Chưa lưu cấu hình riêng</span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
            >
              Lưu & Tải lại ứng dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
