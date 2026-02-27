import React, { useState } from 'react';
import { useStore } from '../stores/store';
import { PenTool, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useStore();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [nick, setNick] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (mode === 'login') await login(email, pw);
      else await register(email, pw, nick);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-neutral-800/30">
            <PenTool className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">StoryMind</h1>
          <p className="text-sm text-surface-400 mt-1">AI 기반 웹소설 창작 플랫폼</p>
        </div>

        <form onSubmit={submit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex bg-white/10 rounded-lg p-0.5">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === 'login' ? 'bg-white text-surface-900' : 'text-white/60'}`}>로그인</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === 'register' ? 'bg-white text-surface-900' : 'text-white/60'}`}>회원가입</button>
          </div>

          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input value={nick} onChange={e => setNick(e.target.value)} placeholder="닉네임 (필명)" className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-neutral-600 outline-none" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-neutral-600 outline-none" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호 (6자 이상)" className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-neutral-600 outline-none" />
          </div>

          {err && <p className="text-red-400 text-xs text-center">{err}</p>}

          <button type="submit" disabled={loading} className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {mode === 'login' ? '로그인' : '계정 만들기'}
          </button>
        </form>
        <p className="text-center text-xs text-white/30 mt-6">by Fedma Inc.</p>
      </div>
    </div>
  );
}
