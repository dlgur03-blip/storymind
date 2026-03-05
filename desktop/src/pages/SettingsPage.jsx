import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Key, FolderOpen, Save, ArrowLeft, CheckCircle, Type, Database, Download, Upload, AlertTriangle } from 'lucide-react';

const FONTS = [
  { id: 'pretendard', name: 'Pretendard (기본)' },
  { id: 'nanum-gothic', name: '나눔고딕' },
  { id: 'nanum-myeongjo', name: '나눔명조' },
  { id: 'spoqa', name: 'Spoqa Han Sans' },
];

const FONT_SIZES = [14, 16, 18, 20, 22, 24];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [dataPath, setDataPath] = useState('');
  const [saved, setSaved] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('pretendard');
  const [backupStatus, setBackupStatus] = useState('');

  useEffect(() => {
    // Electron API로 설정 로드
    if (window.electronAPI) {
      window.electronAPI.getConfig().then(config => {
        setApiKey(config.geminiApiKey || '');
        setFontSize(config.fontSize || 18);
        setFontFamily(config.fontFamily || 'pretendard');
      });
      window.electronAPI.getDataPath().then(path => {
        setDataPath(path);
      });
    }
    // 로컬스토리지에서도 폰트 설정 로드
    const savedFontSize = localStorage.getItem('sm_fontSize');
    const savedFontFamily = localStorage.getItem('sm_fontFamily');
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    if (savedFontFamily) setFontFamily(savedFontFamily);
  }, []);

  const handleSave = async () => {
    // 로컬스토리지에 폰트 설정 저장
    localStorage.setItem('sm_fontSize', fontSize.toString());
    localStorage.setItem('sm_fontFamily', fontFamily);

    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ geminiApiKey: apiKey, fontSize, fontFamily });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBackup = async () => {
    if (!window.electronAPI) return;
    setBackupStatus('backing-up');
    const result = await window.electronAPI.backupDb();
    setBackupStatus(result ? 'backup-done' : '');
    if (result) setTimeout(() => setBackupStatus(''), 3000);
  };

  const handleRestore = async () => {
    if (!window.electronAPI) return;
    if (!confirm('기존 데이터가 모두 덮어씌워집니다. 계속하시겠습니까?')) return;
    setBackupStatus('restoring');
    const result = await window.electronAPI.restoreDb();
    if (result) {
      setBackupStatus('restore-done');
      setTimeout(() => {
        alert('복원이 완료되었습니다. 앱을 재시작합니다.');
        window.location.reload();
      }, 1000);
    } else {
      setBackupStatus('');
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

          {/* Font Settings */}
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-5 h-5 text-green-500" />
              <h2 className="font-semibold">에디터 글꼴 설정</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-white/50 text-sm mb-2">글꼴</label>
                <div className="flex flex-wrap gap-2">
                  {FONTS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFontFamily(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition ${fontFamily === f.id ? 'bg-white text-neutral-900' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-white/50 text-sm mb-2">글자 크기: {fontSize}px</label>
                <div className="flex gap-2">
                  {FONT_SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => setFontSize(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition ${fontSize === s ? 'bg-white text-neutral-900' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 p-4 bg-neutral-800 rounded-lg" style={{ fontFamily: fontFamily === 'pretendard' ? 'Pretendard Variable' : fontFamily === 'nanum-gothic' ? 'Nanum Gothic' : fontFamily === 'nanum-myeongjo' ? 'Nanum Myeongjo' : 'Spoqa Han Sans Neo', fontSize: `${fontSize}px` }}>
                미리보기: 소설 작성의 시작은 StoryMind와 함께.
              </div>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-purple-500" />
              <h2 className="font-semibold">데이터 백업 / 복원</h2>
            </div>
            <p className="text-white/50 text-sm mb-4">
              모든 작품과 설정을 백업하거나 복원할 수 있습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBackup}
                disabled={backupStatus === 'backing-up'}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {backupStatus === 'backing-up' ? '백업 중...' : backupStatus === 'backup-done' ? '백업 완료!' : '백업하기'}
              </button>
              <button
                onClick={handleRestore}
                disabled={backupStatus === 'restoring'}
                className="flex-1 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {backupStatus === 'restoring' ? '복원 중...' : backupStatus === 'restore-done' ? '복원 완료!' : '복원하기'}
              </button>
            </div>
            <p className="text-yellow-500/70 text-xs mt-3 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              복원 시 기존 데이터가 모두 덮어씌워집니다
            </p>
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
            <div className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white/70 font-mono text-sm break-all">
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
