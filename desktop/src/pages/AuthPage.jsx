import React, { useState, useEffect } from 'react';
import { useStore } from '../stores/store';
import { PenTool, UserCircle, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = '63644023830-40bbo7vkacomrst81u7q8qou1vnqnh9m.apps.googleusercontent.com';

export default function AuthPage() {
  const { login, register, googleLogin } = useStore();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [nick, setNick] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.google && GOOGLE_CLIENT_ID) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setLoading(true);
          try {
            await googleLogin(response.credential);
          } catch (e) {
            setErr(e.message);
          }
          setLoading(false);
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'filled_black', size: 'large', width: '100%', text: 'continue_with' }
      );
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (mode === 'login') await login(username, pw);
      else {
        if (pw !== pwConfirm) { setErr('비밀번호가 일치하지 않습니다'); setLoading(false); return; }
        await register(username, pw, nick);
      }
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
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="아이디" className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-neutral-600 outline-none" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호 (6자 이상)" className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-neutral-600 outline-none" />
          </div>
          {mode === 'register' && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="비밀번호 확인" className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-neutral-600 outline-none" />
            </div>
          )}

          {err && <p className="text-red-400 text-xs text-center">{err}</p>}

          <button type="submit" disabled={loading} className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {mode === 'login' ? '로그인' : '계정 만들기'}
          </button>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-xs">또는</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>
              <div id="google-signin-btn" className="w-full flex justify-center" />
            </>
          )}
        </form>
        <p className="text-center text-xs text-white/30 mt-6">by Fedma Inc.</p>
      </div>
    </div>
  );
}
