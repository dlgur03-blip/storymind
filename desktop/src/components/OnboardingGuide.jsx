import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, BookOpen, Wand2, Shield, PenLine, BarChart3, Keyboard, Sparkles, FolderOpen, Download, Search, Maximize2 } from 'lucide-react';

const STEPS = [
  {
    icon: BookOpen,
    title: 'StoryMind에 오신 것을 환영합니다!',
    description: '소설 작가를 위한 AI 집필 도우미입니다. 설정 오류 검수, 복선 관리, AI 대필까지 - 창작에만 집중하세요.',
    tip: '이 가이드는 언제든 우측 상단 ? 버튼으로 다시 볼 수 있어요.',
  },
  {
    icon: FolderOpen,
    title: '작품 등록하기',
    description: '대시보드에서 "새 작품"을 눌러 시작하세요. 기존 원고가 있다면 하단의 "기존 원고 임포트" 버튼으로 폴더를 선택해 한번에 등록할 수 있습니다.',
    features: [
      { label: '새 작품', desc: '제목, 장르, 문체 설정' },
      { label: '폴더 임포트', desc: '.txt 파일들을 챕터로 변환' },
    ],
  },
  {
    icon: PenLine,
    title: '에디터에서 집필',
    description: '화(챕터) 단위로 집필합니다. 2초 후 자동 저장되며, 오프라인에서도 로컬 백업이 유지됩니다.',
    features: [
      { label: '좌측 패널', desc: '챕터 목록, 추가/삭제' },
      { label: '우측 패널', desc: 'AI 검수, StoryVault' },
    ],
  },
  {
    icon: Wand2,
    title: 'AI 검수 (핵심 기능)',
    description: '에디터 우측 패널에서 AI 검수를 실행하면 6개 모듈이 동시에 분석합니다.',
    features: [
      { label: '설정 오류', desc: '눈 색깔, 키 등 모순 탐지' },
      { label: '캐릭터', desc: '성격/말투 일관성 체크' },
      { label: '복선', desc: '미회수 복선 추적' },
      { label: '텐션', desc: '긴장감 점수 분석' },
    ],
  },
  {
    icon: Shield,
    title: 'StoryVault (설정 금고)',
    description: '우측 패널 첫 번째 탭에서 캐릭터, 복선, 세계관, 시간선, 관계도를 관리합니다.',
    features: [
      { label: '캐릭터', desc: '이름, 외모, 성격 등록' },
      { label: '복선', desc: '설치/회수 상태 관리' },
      { label: '시간선', desc: 'AI 검수 시 자동 구축' },
      { label: '관계도', desc: '캐릭터 간 관계 시각화' },
    ],
    tip: '"스마트 모드"에서는 AI가 새 설정 발견 시 승인을 요청합니다.',
  },
  {
    icon: Sparkles,
    title: 'AI 대필 & 제안',
    description: '아이디어만 입력하면 AI가 현재 설정과 문체에 맞게 글을 작성합니다.',
    features: [
      { label: '스토리 제안', desc: '미회수 복선 기반 전개 제안' },
      { label: 'AI 대필', desc: '아이디어 → 한 화 작성' },
      { label: '필체 학습', desc: '내 문체 분석 후 대필 반영' },
    ],
  },
  {
    icon: Maximize2,
    title: '집중 모드 & 검색',
    description: '방해 없이 글쓰기에 집중할 수 있는 기능들입니다.',
    features: [
      { label: '집중 모드', desc: '사이드바 숨기고 에디터만' },
      { label: '작품 내 검색', desc: '모든 챕터에서 텍스트 찾기' },
      { label: '내보내기', desc: 'TXT/HTML로 다운로드' },
    ],
  },
  {
    icon: Keyboard,
    title: '단축키 모음',
    description: '자주 쓰는 기능을 키보드로 빠르게!',
    shortcuts: [
      { key: 'Ctrl + S', desc: '저장' },
      { key: 'Ctrl + F', desc: '작품 내 검색' },
      { key: 'Ctrl + Enter', desc: '집중 모드' },
      { key: 'Ctrl + Shift + R', desc: 'AI 검수' },
      { key: 'Ctrl + \\', desc: '우측 패널 토글' },
      { key: 'Ctrl + [', desc: '좌측 패널 토글' },
      { key: 'Esc', desc: '집중 모드 / 검색 종료' },
    ],
  },
];

export default function OnboardingGuide({ onClose }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const current = STEPS[step];
  const Icon = current.icon;

  const close = () => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem('sm_onboarding_done', '1');
      onClose();
    }, 200);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity ${exiting ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`w-full max-w-lg mx-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden transition-transform ${exiting ? 'scale-95' : 'scale-100'}`}>
        {/* Progress bar */}
        <div className="h-1 bg-neutral-100 dark:bg-neutral-800">
          <div className="h-full bg-neutral-900 dark:bg-white transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-xs text-neutral-400 tracking-wide">{step + 1} / {STEPS.length}</span>
          <button onClick={close} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-4 h-4 text-neutral-400" /></button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 anim-fade" key={step}>
          <div className="w-12 h-12 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-white dark:text-neutral-900" />
          </div>

          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">{current.title}</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">{current.description}</p>

          {current.features && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {current.features.map((f, i) => (
                <div key={i} className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{f.label}</div>
                  <div className="text-[10px] text-neutral-500">{f.desc}</div>
                </div>
              ))}
            </div>
          )}

          {current.tip && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg mb-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400"><span className="font-medium text-neutral-700 dark:text-neutral-300">💡 팁: </span>{current.tip}</p>
            </div>
          )}

          {current.shortcuts && (
            <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
              {current.shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <kbd className="px-2 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-xs font-mono text-neutral-700 dark:text-neutral-300">{s.key}</kbd>
                  <span className="text-xs text-neutral-500">{s.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-0 transition"
          >
            <ArrowLeft className="w-4 h-4" />이전
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:opacity-90 transition"
            >
              다음<ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={close}
              className="px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:opacity-90 transition"
            >
              시작하기 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to check if onboarding should show
export function useOnboarding() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // 첫 실행 시 자동으로 튜토리얼 표시
    if (!localStorage.getItem('sm_onboarding_done')) {
      setShow(true);
    }
  }, []);
  return {
    showOnboarding: show,
    closeOnboarding: () => setShow(false),
    reopenOnboarding: () => {
      // 다시 보기 클릭 시
      setShow(true);
    }
  };
}
