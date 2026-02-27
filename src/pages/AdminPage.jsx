import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { BarChart3, Users, BookOpen, Cpu, DollarSign, ArrowLeft, RefreshCw } from 'lucide-react';

function Card({ title, value, sub, icon: I, color = 'brand' }) {
  return (
    <div className="p-4 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-surface-400">{title}</span>
        <I className={`w-4 h-4 text-${color}-500`} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <p className="text-xs text-surface-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const nav = useNavigate();
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState(null);
  const [topWorks, setTopWorks] = useState([]);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ov, dy, tw, us, md] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/daily-stats?days=30'),
        api.get('/admin/top-works'),
        api.get('/admin/users?limit=20'),
        api.get('/admin/model-usage'),
      ]);
      setOverview(ov); setDaily(dy); setTopWorks(tw); setUsers(us.users); setModels(md);
      setError(null);
    } catch (e) {
      setError(e.message || '관리자 권한이 필요합니다');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-neutral-700 text-sm">{error}</p>
      <button onClick={() => nav('/')} className="text-sm text-neutral-900 dark:text-white underline">대시보드로 돌아가기</button>
    </div>
  );

  const o = overview;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => nav('/')} className="p-2 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
            <h1 className="text-xl font-bold">StoryMind 관리자</h1>
          </div>
          <button onClick={load} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-neutral-900 dark:bg-white text-white rounded-lg"><RefreshCw className="w-3 h-3" />새로고침</button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card title="전체 사용자" value={o.users.total.toLocaleString()} sub={`오늘 +${o.users.today} · 이번 주 +${o.users.thisWeek}`} icon={Users} />
          <Card title="작품 / 화" value={`${o.content.works} / ${o.content.chapters}`} sub={`총 ${(o.content.totalWords / 10000).toFixed(1)}만 자`} icon={BookOpen} color="violet" />
          <Card title="AI 검수" value={o.ai.totalReviews.toLocaleString()} sub={`오늘 ${o.ai.reviewsToday}건`} icon={Cpu} color="emerald" />
          <Card title="API 비용" value={`$${o.cost.totalCost.toFixed(2)}`} sub={`오늘 $${o.cost.todayCost.toFixed(2)} · ${o.cost.totalApiCalls.toLocaleString()} calls`} icon={DollarSign} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model usage */}
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" />모델별 사용량</h3>
            <div className="space-y-2">
              {models.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-surface-50 dark:bg-surface-900 rounded-lg">
                  <div>
                    <span className="text-xs font-mono font-medium">{m.model || 'unknown'}</span>
                    <p className="text-[10px] text-surface-400">{m.calls.toLocaleString()} calls · {(m.tokens_out / 1000).toFixed(0)}K tokens out</p>
                  </div>
                  <span className="text-xs font-bold text-neutral-700">${m.cost.toFixed(3)}</span>
                </div>
              ))}
              {models.length === 0 && <p className="text-xs text-surface-400 text-center py-4">아직 API 사용 기록이 없습니다</p>}
            </div>
          </div>

          {/* Top works */}
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
            <h3 className="text-sm font-bold mb-3">인기 작품 TOP 10</h3>
            <div className="space-y-1.5">
              {topWorks.slice(0, 10).map((w, i) => (
                <div key={w.id} className="flex items-center gap-2 p-2 bg-surface-50 dark:bg-surface-900 rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center text-[10px] font-bold text-neutral-900 dark:text-white">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{w.title}</p>
                    <p className="text-[10px] text-surface-400">{w.author} · {w.genre} · {w.chapters}화 · {(w.total_words / 10000).toFixed(1)}만 자</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent users */}
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4 lg:col-span-2">
            <h3 className="text-sm font-bold mb-3">최근 가입 사용자</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-surface-400 border-b dark:border-surface-700">
                  <th className="pb-2 pr-4">이메일</th><th className="pb-2 pr-4">닉네임</th><th className="pb-2 pr-4">플랜</th>
                  <th className="pb-2 pr-4">작품</th><th className="pb-2 pr-4">총 글자수</th><th className="pb-2 pr-4">API</th><th className="pb-2">가입일</th>
                </tr></thead>
                <tbody>{users.map(u => (
                  <tr key={u.id} className="border-b dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-900">
                    <td className="py-2 pr-4 font-mono">{u.email}</td>
                    <td className="py-2 pr-4">{u.nickname || '-'}</td>
                    <td className="py-2 pr-4"><span className={`px-1.5 py-0.5 rounded text-[10px] ${u.plan === 'premium' ? 'bg-neutral-100 text-neutral-700 dark:text-neutral-300' : u.plan === 'pro' ? 'bg-neutral-100 text-neutral-800' : 'bg-surface-100 text-surface-500'}`}>{u.plan || 'free'}</span></td>
                    <td className="py-2 pr-4">{u.works_count}</td>
                    <td className="py-2 pr-4">{u.total_words.toLocaleString()}</td>
                    <td className="py-2 pr-4">{u.api_calls}</td>
                    <td className="py-2 text-surface-400">{new Date(u.created_at).toLocaleDateString('ko')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
