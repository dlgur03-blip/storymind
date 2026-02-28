import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, BookOpen, Wand2, Shield, PenLine, BarChart3, Keyboard } from 'lucide-react';

const STEPS = [
  {
    icon: BookOpen,
    title: '작품 등록',
    description: '대시보드에서 새 작품을 만드세요. 제목과 장르를 입력하면 AI가 장르에 맞는 분석 기준을 자동으로 설정합니다.',
    tip: '기존 원고가 있다면 "일괄 임포트"로 한번에 등록할 수 있어요.',
  },
  {
    icon: PenLine,
    title: '에디터에서 집필',
    description: '화(챕터) 단위로 집필합니다. 자동 저장이 30초마다 작동하고, 오프라인에서도 로컬 백업이 유지됩니다.',
    tip: '화 제목은 클릭해서 바로 수정할 수 있어요.',
  },
  {
    icon: Wand2,
    title: 'AI 검수 실행',
    description: '검수 버튼을 누르면 6개 AI 모듈이 동시에 분석합니다: 설정 모순, 캐릭터 일관성, 시간선, 복선, 문체, 대중성.',
    tip: 'Ctrl+Shift+R 단축키로 더 빠르게!',
  },
  {
    icon: Shield,
    title: 'StoryVault 확인',
    description: '캐릭터, 복선, 세계관, 시간선이 자동으로 기록됩니다. 우측 패널에서 확인하고 직접 추가/수정할 수 있어요.',
    tip: '"스마트 모드"에서는 AI가 새 설정을 발견하면 승인을 요청합니다.',
  },
  {
    icon: BarChart3,
    title: '텐션 & 대중성',
    description: '각 화의 텐션 점수, 클리프행어 품질, 페이싱을 분석합니다. 차트에서 전체 흐름을 한눈에 볼 수 있어요.',
    tip: '장르별 인기 작품 기준과 비교해서 구체적인 개선 팁을 줍니다.',
  },
  {
    icon: Keyboard,
    title: '단축키',
    description: '자주 쓰는 기능을 키보드로 빠르게!',
    shortcuts: [
      { key: 'Ctrl + S', desc: '저장' },
      { key: 'Ctrl + Shift + R', desc: 'AI 검수' },
      { key: 'Ctrl + \\', desc: '우측 패널 토글' },
      { key: 'Ctrl + [', desc: '좌측 패널 토글' },
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
      <div className={`w-full max-w-md mx-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden transition-transform ${exiting ? 'scale-95' : 'scale-100'}`}>
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

          {current.tip && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg mb-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400"><span className="font-medium text-neutral-700 dark:text-neutral-300">💡 팁: </span>{current.tip}</p>
            </div>
          )}

          {current.shortcuts && (
            <div className="space-y-2 mb-4">
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
              시작하기
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
    if (!localStorage.getItem('sm_onboarding_done')) setShow(true);
  }, []);
  return { showOnboarding: show, closeOnboarding: () => setShow(false), reopenOnboarding: () => setShow(true) };
}
