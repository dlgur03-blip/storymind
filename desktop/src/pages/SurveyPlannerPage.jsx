import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Swords, Heart, Compass, Ghost, Laugh, Microscope, BookOpen, Zap, Shield, Clock, Users, Flame, Brain, Target } from 'lucide-react';

// ===== SURVEY DATA =====

const SURVEY_STEPS = [
  {
    id: 'genre',
    question: '어떤 장르를 쓰고 싶어?',
    subtitle: '복수 선택도 가능해요',
    multi: true,
    options: [
      { id: 'fantasy', label: '판타지', icon: Swords, desc: '검과 마법, 던전, 이세계' },
      { id: 'romance', label: '로맨스', icon: Heart, desc: '사랑, 관계, 감정' },
      { id: 'martial', label: '무협', icon: Compass, desc: '강호, 무공, 의리' },
      { id: 'horror', label: '호러/스릴러', icon: Ghost, desc: '공포, 미스터리, 서스펜스' },
      { id: 'modern', label: '현대판타지', icon: Zap, desc: '현실+초능력, 헌터물' },
      { id: 'slice', label: '일상/코미디', icon: Laugh, desc: '일상, 학원, 힐링' },
      { id: 'sf', label: 'SF', icon: Microscope, desc: '과학, 우주, 디스토피아' },
      { id: 'regression', label: '회귀/환생', icon: Clock, desc: '시간 역행, 두 번째 기회' },
    ],
  },
  {
    id: 'protagonist',
    question: '주인공은 어떤 타입?',
    subtitle: '하나만 골라줘',
    multi: false,
    options: [
      { id: 'underdog', label: '약자→강자', desc: '바닥에서 시작, 성장형' },
      { id: 'op', label: '처음부터 강함', desc: '먼치킨, 압도적 실력' },
      { id: 'smart', label: '두뇌파', desc: '머리로 싸우는 전략가' },
      { id: 'ordinary', label: '평범한 사람', desc: '일상에 사건이 찾아옴' },
      { id: 'dark', label: '다크히어로', desc: '모호한 도덕관, 안티히어로' },
      { id: 'kind', label: '선한 영웅', desc: '정의로운, 모두를 지키는' },
    ],
  },
  {
    id: 'mood',
    question: '전체적인 분위기는?',
    subtitle: '독자가 느낄 주된 감정',
    multi: false,
    options: [
      { id: 'thrilling', label: '손에 땀', icon: Flame, desc: '긴장감, 위기, 서바이벌' },
      { id: 'heartwarming', label: '따뜻함', icon: Heart, desc: '감동, 치유, 성장' },
      { id: 'exciting', label: '통쾌함', icon: Zap, desc: '사이다, 카타르시스' },
      { id: 'mystery', label: '궁금증', icon: Brain, desc: '미스터리, 반전, 떡밥' },
      { id: 'epic', label: '웅장함', icon: Shield, desc: '대서사시, 세계의 운명' },
      { id: 'fun', label: '가볍고 재밌게', icon: Laugh, desc: '코믹, 가벼운 전개' },
    ],
  },
  {
    id: 'scale',
    question: '이야기의 규모는?',
    subtitle: '연재 계획',
    multi: false,
    options: [
      { id: 'short', label: '단편 (30화 이하)', desc: '짧고 강렬하게' },
      { id: 'medium', label: '중편 (30~100화)', desc: '한 시즌 완결' },
      { id: 'long', label: '장편 (100화+)', desc: '시즌제, 장기 연재' },
      { id: 'unsure', label: '아직 모르겠어', desc: '일단 시작하고 보자' },
    ],
  },
  {
    id: 'hook',
    question: '핵심 매력 포인트는?',
    subtitle: '이 소설의 무기가 될 것. 복수 가능',
    multi: true,
    options: [
      { id: 'growth', label: '성장/레벨업', icon: Target, desc: '눈에 보이는 강해짐' },
      { id: 'twist', label: '반전/떡밥', icon: Brain, desc: '예상 못한 전개' },
      { id: 'romance_element', label: '로맨스 라인', icon: Heart, desc: '심쿵, 밀당' },
      { id: 'world', label: '세계관의 깊이', icon: Compass, desc: '빠져드는 설정' },
      { id: 'action', label: '전투/액션', icon: Swords, desc: '화려한 배틀' },
      { id: 'characters', label: '캐릭터 매력', icon: Users, desc: '개성 넘치는 등장인물' },
      { id: 'humor', label: '유머/개그', icon: Laugh, desc: '웃기는 전개' },
      { id: 'emotion', label: '감정선', icon: Flame, desc: '울리는 스토리' },
    ],
  },
  {
    id: 'idea',
    question: '마지막! 떠오르는 아이디어가 있어?',
    subtitle: '한 줄이라도 좋고, 없으면 빈 칸으로 넘어가도 돼',
    type: 'text',
  },
];

// ===== COMPONENT =====

function OptionCard({ opt, selected, onClick, multi }) {
  const Icon = opt.icon;
  const active = selected;
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        active
          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
      }`}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
            <Icon className={`w-4 h-4 ${active ? 'text-white dark:text-neutral-900' : 'text-neutral-500'}`} />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${active ? 'text-neutral-900 dark:text-white' : ''}`}>{opt.label}</span>
            {multi && active && <span className="text-[10px] px-1.5 py-0.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full">✓</span>}
          </div>
          {opt.desc && <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>}
        </div>
      </div>
    </button>
  );
}

export default function SurveyPlannerPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [ideaText, setIdeaText] = useState('');
  const [loading, setLoading] = useState(false);

  const current = SURVEY_STEPS[step];
  const isLast = step === SURVEY_STEPS.length - 1;

  const toggleOption = (optId) => {
    if (current.multi) {
      const prev = answers[current.id] || [];
      setAnswers({ ...answers, [current.id]: prev.includes(optId) ? prev.filter(x => x !== optId) : [...prev, optId] });
    } else {
      setAnswers({ ...answers, [current.id]: optId });
    }
  };

  const canNext = () => {
    if (current.type === 'text') return true; // Optional
    const val = answers[current.id];
    if (current.multi) return val && val.length > 0;
    return !!val;
  };

  const buildIdeaFromSurvey = () => {
    const parts = [];
    const genres = (answers.genre || []).map(g => SURVEY_STEPS[0].options.find(o => o.id === g)?.label).filter(Boolean);
    if (genres.length) parts.push(`장르: ${genres.join(', ')}`);

    const protag = SURVEY_STEPS[1].options.find(o => o.id === answers.protagonist);
    if (protag) parts.push(`주인공: ${protag.label} (${protag.desc})`);

    const mood = SURVEY_STEPS[2].options.find(o => o.id === answers.mood);
    if (mood) parts.push(`분위기: ${mood.label}`);

    const scale = SURVEY_STEPS[3].options.find(o => o.id === answers.scale);
    if (scale) parts.push(`규모: ${scale.label}`);

    const hooks = (answers.hook || []).map(h => SURVEY_STEPS[4].options.find(o => o.id === h)?.label).filter(Boolean);
    if (hooks.length) parts.push(`핵심 매력: ${hooks.join(', ')}`);

    if (ideaText.trim()) parts.push(`아이디어: ${ideaText.trim()}`);

    return parts.join('\n');
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const idea = buildIdeaFromSurvey();
      const r = await api.post('/planner', { idea_text: idea });

      // Trigger first AI analysis automatically
      await api.post(`/planner/${r.id}/chat`, {
        message: `설문 결과를 바탕으로 기획을 시작하자:\n${idea}`
      });

      nav(`/planner/${r.id}`);
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : nav('/')} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 transition">
            <ArrowLeft className="w-4 h-4" />{step > 0 ? '이전' : '대시보드'}
          </button>
          <div className="flex items-center gap-1.5">
            {SURVEY_STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-neutral-900 dark:bg-white' : i < step ? 'w-3 bg-neutral-400' : 'w-3 bg-neutral-200 dark:bg-neutral-700'}`} />
            ))}
          </div>
          <span className="text-xs text-neutral-400">{step + 1}/{SURVEY_STEPS.length}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl anim-fade" key={step}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{current.question}</h2>
            <p className="text-sm text-neutral-500 mt-2">{current.subtitle}</p>
          </div>

          {current.type === 'text' ? (
            <div className="space-y-4">
              <textarea
                value={ideaText}
                onChange={e => setIdeaText(e.target.value)}
                placeholder="예: '헌터가 죽었다가 10년 전으로 회귀해서 미래의 재앙을 막는 이야기'&#10;&#10;없으면 빈 칸으로 넘어가도 괜찮아요. AI가 설문 결과로 제안해줄게요."
                rows={5}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:border-neutral-400 transition resize-none leading-relaxed"
              />
              <div className="flex flex-wrap gap-2">
                {['헌터가 회귀해서 미래 재앙을 막는다', '악녀로 환생했는데 원작을 바꾸고 싶다', '평범한 대학생이 갑자기 능력을 얻는다'].map(ex => (
                  <button key={ex} onClick={() => setIdeaText(ex)} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                    💡 {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={`grid ${current.options.length > 4 ? 'grid-cols-2' : 'grid-cols-2'} gap-3`}>
              {current.options.map(opt => (
                <OptionCard
                  key={opt.id}
                  opt={opt}
                  multi={current.multi}
                  selected={current.multi ? (answers[current.id] || []).includes(opt.id) : answers[current.id] === opt.id}
                  onClick={() => toggleOption(opt.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => { if (!isLast) { setStep(s => s + 1); } }}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition"
            style={{ visibility: current.type === 'text' || canNext() ? 'hidden' : 'visible' }}
          >
            건너뛰기
          </button>

          {isLast ? (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI 콘티 플래너 시작
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-30 transition"
            >
              다음 <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
