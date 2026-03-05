import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, Send, Loader2, BookOpen, Users, Globe, FileText, Puzzle, Sparkles, ChevronRight, Plus, GripVertical, Trash2 } from 'lucide-react';

const STEPS = [
  { n: 1, label: '아이디어', icon: Sparkles, desc: 'AI가 질문하며 아이디어를 구체화' },
  { n: 2, label: '구조', icon: BookOpen, desc: '아크 구조 3가지 중 선택' },
  { n: 3, label: '캐릭터', icon: Users, desc: '1명씩 대화하며 설계' },
  { n: 4, label: '세계관', icon: Globe, desc: '장르에 맞는 세계관 구축' },
  { n: 5, label: '콘티', icon: FileText, desc: '아크별 화 줄거리 생성' },
  { n: 6, label: '복선', icon: Puzzle, desc: '떡밥 설치/회수 매핑' },
];

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 anim-fade`}>
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-br-md'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

function ContiCard({ ch, idx, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(ch.title);
  const [summary, setSummary] = useState(ch.summary);

  return (
    <div className="group flex gap-2 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition">
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <GripVertical className="w-3 h-3 text-neutral-300 cursor-grab" />
        <div className="w-7 h-7 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
          <span className="text-[10px] font-bold text-white dark:text-neutral-900">{ch.number}</span>
        </div>
        <div className="w-5 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700" style={{ opacity: (ch.tension || 5) / 10 }}>
          <div className="h-full bg-neutral-600 dark:bg-neutral-400 rounded-full" style={{ width: `${(ch.tension || 5) * 10}%` }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-1">
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1 outline-none" />
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} className="w-full text-[11px] bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1 outline-none resize-none" />
            <div className="flex gap-1">
              <button onClick={() => { onEdit(idx, { ...ch, title, summary }); setEditing(false); }} className="text-[10px] px-2 py-0.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded">저장</button>
              <button onClick={() => setEditing(false)} className="text-[10px] px-2 py-0.5 text-neutral-500">취소</button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium truncate cursor-pointer" onClick={() => setEditing(true)}>{ch.title || `제${ch.number}화`}</p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{ch.summary}</p>
            {ch.cliffhanger && <p className="text-[10px] text-neutral-400 mt-1">🔚 {ch.cliffhanger}</p>}
          </>
        )}
      </div>
      <button onClick={() => onDelete(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-300 hover:text-neutral-600 transition"><Trash2 className="w-3 h-3" /></button>
    </div>
  );
}

export default function PlannerPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [plan, setPlan] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState('chat'); // chat | conti | summary
  const [quickMode, setQuickMode] = useState(false); // 빠른 모드: AI가 질문 최소화
  const chatEndRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try { setPlan(await api.get(`/planner/${id}`)); } catch { nav('/'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [plan?.conversation?.length]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);

    // Optimistic: add user message
    setPlan(p => ({ ...p, conversation: [...(p.conversation || []), { role: 'user', content: msg, step: p.current_step }] }));

    try {
      const result = await api.post(`/planner/${id}/chat`, { message: msg, quickMode });
      // Add AI response
      setPlan(p => ({
        ...p,
        conversation: [...(p.conversation || []), { role: 'assistant', content: result.response, step: result.new_step }],
        current_step: result.new_step,
        status: result.status,
      }));
      if (result.step_completed) await load(); // Refresh full data
    } catch (e) {
      setPlan(p => ({ ...p, conversation: [...(p.conversation || []), { role: 'assistant', content: `오류: ${e.message}`, step: p.current_step }] }));
    }
    setSending(false);
  };

  const extend = async (direction) => {
    setSending(true);
    try {
      const result = await api.post(`/planner/${id}/extend`, { direction, extend_count: 10 });
      await load();
      setTab('conti');
    } catch (e) { alert(e.message); }
    setSending(false);
  };

  const finalize = async () => {
    if (!confirm('이 콘티를 바탕으로 작품을 생성합니다. 계속할까요?')) return;
    try {
      const result = await api.post(`/planner/${id}/finalize`);
      alert(`✅ "${result.title}" 생성 완료!\n${result.chapters_created}화 | 캐릭터 ${result.characters_registered}명 | 복선 ${result.foreshadows_registered}개`);
      nav(`/editor/${result.work_id}`);
    } catch (e) { alert(e.message); }
  };

  const editConti = (idx, updated) => {
    const newConti = [...(plan.conti || [])];
    newConti[idx] = updated;
    setPlan(p => ({ ...p, conti: newConti }));
    api.put(`/planner/${id}/conti`, { conti: newConti }).catch(() => {});
  };

  const deleteConti = (idx) => {
    const newConti = (plan.conti || []).filter((_, i) => i !== idx);
    // Renumber
    newConti.forEach((c, i) => c.number = i + 1);
    setPlan(p => ({ ...p, conti: newConti }));
    api.put(`/planner/${id}/conti`, { conti: newConti }).catch(() => {});
  };

  if (loading || !plan) return <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>;

  const step = plan.current_step || 1;
  const conti = plan.conti || [];
  const conversations = plan.conversation || [];

  return (
    <div className="h-screen flex bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* Left — Step indicator */}
      <div className="w-56 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <button onClick={() => nav('/')} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 mb-3">
            <ArrowLeft className="w-3 h-3" />대시보드
          </button>
          <h2 className="text-sm font-bold truncate">{plan.title || '새 기획'}</h2>
          <p className="text-[10px] text-neutral-400 mt-0.5">{plan.genre || '장르 미정'}</p>
        </div>

        <div className="flex-1 p-3 space-y-1">
          {STEPS.map(s => {
            const Icon = s.icon;
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className={`flex items-center gap-2 p-2 rounded-lg transition ${active ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  done ? 'bg-neutral-900 dark:bg-white' : active ? 'border-2 border-neutral-900 dark:border-white' : 'border border-neutral-300 dark:border-neutral-600'
                }`}>
                  {done ? <span className="text-[10px] text-white dark:text-neutral-900">✓</span> : <span className={`text-[10px] ${active ? 'font-bold' : 'text-neutral-400'}`}>{s.n}</span>}
                </div>
                <div>
                  <p className={`text-xs ${active ? 'font-bold' : done ? 'text-neutral-500' : 'text-neutral-400'}`}>{s.label}</p>
                  {active && <p className="text-[10px] text-neutral-400 mt-0.5">{s.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
          <p className="text-[10px] text-neutral-400">캐릭터 {(plan.characters||[]).length}명 · 세계관 {(plan.world||[]).length}개</p>
          <p className="text-[10px] text-neutral-400">콘티 {conti.length}화 · 복선 {(plan.foreshadows||[]).length}개</p>
        </div>
      </div>

      {/* Center — Chat or Conti */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-4 px-6 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          {['chat','conti','summary'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`text-xs pb-1 transition ${tab === t ? 'font-bold border-b-2 border-neutral-900 dark:border-white' : 'text-neutral-400 hover:text-neutral-600'}`}>
              {t === 'chat' ? '💬 AI 대화' : t === 'conti' ? `📋 콘티 (${conti.length}화)` : '📊 요약'}
            </button>
          ))}
          <div className="flex-1" />
          {plan.status === 'completed' && (
            <button onClick={finalize} className="flex items-center gap-1 px-4 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium rounded-lg hover:opacity-90 transition">
              작품 생성하기 <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {tab === 'chat' && (
          <>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-1">
              {conversations.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-400">아이디어를 입력하면 AI가 질문하며 기획을 도와줍니다</p>
                </div>
              )}
              {conversations.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
              {sending && (
                <div className="flex justify-start mb-3">
                  <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <div className="flex flex-col gap-2 max-w-3xl mx-auto">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={step <= 6 ? STEPS[Math.min(step-1, 5)].desc : '수정하고 싶은 부분을 말해주세요'}
                    className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:border-neutral-400 transition"
                    disabled={sending}
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || sending} className="p-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:opacity-90 disabled:opacity-30 transition">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setQuickMode(!quickMode)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium transition ${
                      quickMode
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {quickMode ? '빠른 모드 ON' : '빠른 모드: AI가 바로 생성'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'conti' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-2">
              {conti.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-400">Step 5에서 콘티가 생성됩니다</p>
                </div>
              ) : (
                <>
                  {conti.map((ch, i) => <ContiCard key={i} ch={ch} idx={i} onEdit={editConti} onDelete={deleteConti} />)}
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => extend('end')} disabled={sending} className="flex-1 flex items-center justify-center gap-1 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-700 transition">
                      <Plus className="w-3 h-3" /> 후반부 +10화 연장
                    </button>
                    <button onClick={() => extend('middle')} disabled={sending} className="flex-1 flex items-center justify-center gap-1 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-700 transition">
                      <Plus className="w-3 h-3" /> 중반 확장 +10화
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'summary' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Analysis */}
              {plan.analysis && Object.keys(plan.analysis).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold mb-2">아이디어 분석</h3>
                  <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs space-y-1">
                    {plan.analysis.core_premise && <p><span className="font-medium">전제: </span>{plan.analysis.core_premise}</p>}
                    {plan.analysis.unique_hook && <p><span className="font-medium">차별점: </span>{plan.analysis.unique_hook}</p>}
                    {plan.analysis.detected_genres && <p><span className="font-medium">장르: </span>{plan.analysis.detected_genres.join(', ')}</p>}
                  </div>
                </div>
              )}

              {/* Characters */}
              {(plan.characters || []).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold mb-2">캐릭터 ({plan.characters.length})</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {plan.characters.map((ch, i) => (
                      <div key={i} className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <p className="text-xs font-bold">{ch.name} <span className="font-normal text-neutral-400">({ch.role})</span></p>
                        <p className="text-[11px] text-neutral-500 mt-1">{ch.personality}</p>
                        {ch.secret && <p className="text-[10px] text-neutral-400 mt-1">🔒 {ch.secret}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* World */}
              {(plan.world || []).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold mb-2">세계관 ({plan.world.length})</h3>
                  <div className="space-y-1">
                    {plan.world.map((w, i) => (
                      <div key={i} className="flex gap-2 p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <span className="text-[10px] text-neutral-400 shrink-0 w-14">{w.category}</span>
                        <div><p className="text-xs font-medium">{w.name}</p><p className="text-[11px] text-neutral-500">{w.description}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Foreshadows */}
              {(plan.foreshadows || []).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold mb-2">복선 ({plan.foreshadows.length})</h3>
                  <div className="space-y-1">
                    {plan.foreshadows.map((f, i) => (
                      <div key={i} className="p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
                        <p className="font-medium">{f.summary}</p>
                        <p className="text-[10px] text-neutral-400 mt-1">설치 {f.plant_chapter}화 → 회수 {f.payoff_chapter}화</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
