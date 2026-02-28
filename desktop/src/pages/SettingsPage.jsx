import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Key, FolderOpen, Save, ArrowLeft, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [dataPath, setDataPath] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Electron API로 설정 로드
    if (window.electronAPI) {
      window.electronAPI.getConfig().then(config => {
        setApiKey(config.geminiApiKey || '');
      });
      window.electronAPI.getDataPath().then(path => {
        setDataPath(path);
      });
    }
  }, []);

  const handleSave = async () => {
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ geminiApiKey: apiKey });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">설정</h1>
            <p className="text-white/50 text-sm">StoryMind Desktop 설정</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* API Key */}
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-yellow-500" />
              <h2 className="font-semibold">Gemini API Key</h2>
            </div>
            <p className="text-white/50 text-sm mb-4">
              AI 기능을 사용하려면 Gemini API 키가 필요합니다.
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline ml-1"
              >
                여기서 발급받기
              </a>
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-neutral-600 outline-none"
            />
          </div>

          {/* Data Path */}
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold">데이터 저장 위치</h2>
            </div>
            <p className="text-white/50 text-sm mb-4">
              작품 데이터가 저장되는 경로입니다.
            </p>
            <div className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white/70 font-mono text-sm">
              {dataPath || '로딩 중...'}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-white text-neutral-900 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-white/90 transition"
          >
            {saved ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                저장됨!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                저장
              </>
            )}
          </button>
        </div>

        <p className="text-center text-white/30 text-sm mt-8">
          StoryMind Desktop v1.0.0 by Fedma Inc.
        </p>
      </div>
    </div>
  );
}
