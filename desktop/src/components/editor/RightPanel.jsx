import React, { useState, useEffect } from 'react';
import { useStore } from '../../stores/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { highlightIssuesInEditor } from './TipTapEditor';
import { BookOpen, Wand2, Lightbulb, PenLine, GraduationCap, Settings, Loader2, AlertTriangle, AlertCircle, Info, Sparkles, ChevronDown, ChevronUp, Plus, Send, X, Ban, Lock, Trash2, User } from 'lucide-react';

const TABS=[{id:'vault',icon:BookOpen},{id:'review',icon:Wand2},{id:'suggest',icon:Lightbulb},{id:'ghostwrite',icon:PenLine},{id:'style',icon:GraduationCap},{id:'settings',icon:Settings}];

export default function RightPanel(){const{rightPanel}=useStore();return(<div className="flex flex-col h-full"><div className="flex border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shrink-0">{TABS.map(t=><button key={t.id} onClick={()=>useStore.setState({rightPanel:t.id})} className={`flex-1 flex items-center justify-center py-2.5 text-[11px] font-medium transition border-b-2 ${rightPanel===t.id?'border-neutral-500 text-neutral-900 dark:text-white':'border-transparent text-surface-400 hover:text-surface-600'}`}><t.icon className="w-3.5 h-3.5"/></button>)}</div><div className="flex-1 overflow-y-auto p-3">{rightPanel==='vault'&&<VaultPanel/>}{rightPanel==='review'&&<ReviewPanel/>}{rightPanel==='suggest'&&<SuggestPanel/>}{rightPanel==='ghostwrite'&&<GhostwritePanel/>}{rightPanel==='style'&&<StylePanel/>}{rightPanel==='settings'&&<SettingsPanel/>}</div></div>);}

// ── VAULT with mode selector + relationship graph ──
function VaultPanel(){
  const{vault,addCharacter,addForeshadow,currentChapter,currentWork,updateVaultMode}=useStore();
  const[tab,setTab]=useState('chars');const[showAdd,setShowAdd]=useState(false);
  const[n,setN]=useState('');const[a,setA]=useState('');const[p2,setP2]=useState('');
  const mode=currentWork?.vault_mode||'smart';

  return(<div>
    {/* #8 Vault Mode */}
    <div className="flex items-center gap-1 mb-3 p-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg">
      {[{id:'manual',l:'수동'},{id:'smart',l:'스마트'},{id:'auto',l:'자동'}].map(m=>
        <button key={m.id} onClick={()=>updateVaultMode(m.id)} className={`flex-1 text-[10px] py-1 rounded font-medium transition ${mode===m.id?'bg-white dark:bg-surface-700 shadow-sm text-neutral-700':'text-surface-400'}`}>{m.l}</button>
      )}
    </div>

    <div className="flex gap-1 mb-3 flex-wrap">
      {[{id:'chars',l:'캐릭터',c:vault.characters.length},{id:'foreshadow',l:'복선',c:vault.foreshadows.length},{id:'world',l:'세계관',c:vault.world.length},{id:'timeline',l:'시간선',c:vault.timeline?.length||0},{id:'relations',l:'관계도',c:''}].map(t=>
        <button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 text-[10px] py-1.5 rounded-md font-medium transition ${tab===t.id?'bg-neutral-100 dark:bg-neutral-800/20 text-neutral-700 dark:text-neutral-300 dark:text-neutral-400':'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'}`}>{t.l}{t.c!==''?`(${t.c})`:''}</button>
      )}
    </div>

    {tab==='chars'&&<div className="space-y-2">{vault.characters.map(c=><CharCard key={c.id} c={c}/>)}{!showAdd?<button onClick={()=>setShowAdd(true)} className="w-full py-2 border border-dashed border-surface-300 dark:border-surface-700 rounded-lg text-xs text-surface-400 hover:border-neutral-400 transition flex items-center justify-center gap-1"><Plus className="w-3 h-3"/>추가</button>:<div className="p-3 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg space-y-2"><input value={n} onChange={e=>setN(e.target.value)} placeholder="이름" className="w-full text-sm px-2 py-1 border dark:border-surface-700 rounded bg-transparent" autoFocus/><input value={a} onChange={e=>setA(e.target.value)} placeholder="외모" className="w-full text-sm px-2 py-1 border dark:border-surface-700 rounded bg-transparent"/><input value={p2} onChange={e=>setP2(e.target.value)} placeholder="성격" className="w-full text-sm px-2 py-1 border dark:border-surface-700 rounded bg-transparent"/><div className="flex gap-2"><button onClick={()=>{if(n){addCharacter({name:n,appearance:a,personality:p2,first_appearance:currentChapter?.number||1});setShowAdd(false);setN('');setA('');setP2('');}}} className="flex-1 text-xs py-1 bg-neutral-900 text-white rounded">추가</button><button onClick={()=>setShowAdd(false)} className="flex-1 text-xs py-1 bg-surface-200 dark:bg-surface-700 rounded">취소</button></div></div>}</div>}

    {tab==='foreshadow'&&<div className="space-y-2">{vault.foreshadows.filter(f=>f.status==='open').length>0&&<div className="text-[10px] font-medium text-neutral-700 dark:text-neutral-400 mb-1">미회수 ({vault.foreshadows.filter(f=>f.status==='open').length})</div>}{vault.foreshadows.map(f=><FSCard key={f.id} f={f}/>)}<AddFS/></div>}

    {tab==='world'&&<div className="space-y-2">{vault.world.length===0&&<p className="text-xs text-surface-400 text-center py-4">AI 검수 시 자동 추출</p>}{vault.world.map(w=><div key={w.id} className="p-2 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"><div className="flex items-center gap-2 mb-1"><span className="text-[10px] px-1.5 py-0.5 bg-neutral-50 dark:bg-neutral-800/20 text-neutral-700 rounded">{w.category}</span><span className="text-sm font-medium">{w.name}</span></div><p className="text-xs text-surface-500">{w.description}</p></div>)}</div>}

    {/* #3-4 Timeline UI */}
    {tab==='timeline'&&<div className="space-y-2">{(!vault.timeline||vault.timeline.length===0)?<p className="text-xs text-surface-400 text-center py-4">AI 검수 시 시간선이 자동 구축됩니다</p>:vault.timeline.map((t,i)=><div key={i} className="flex gap-2 p-2 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"><div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800/20 flex items-center justify-center text-[10px] font-bold text-neutral-700 shrink-0">{t.chapter}</div><div className="flex-1 min-w-0"><p className="text-xs font-medium">{t.event_summary}</p><div className="flex gap-2 mt-0.5">{t.in_world_time&&<span className="text-[10px] text-surface-400">🕐 {t.in_world_time}</span>}{t.season&&<span className="text-[10px] text-surface-400">🌿 {t.season}</span>}</div></div></div>)}</div>}

    {/* #8 Character Relationship Graph */}
    {tab==='relations'&&<RelationGraph chars={vault.characters}/>}
  </div>);
}

// #8 Simple SVG relationship graph
function RelationGraph({chars}){
  if(chars.length===0) return <p className="text-xs text-surface-400 text-center py-8">캐릭터를 추가하면 관계도가 생성됩니다</p>;
  const r=120;const cx=160;const cy=140;
  const positions=chars.map((c,i)=>{const angle=(2*Math.PI*i)/chars.length-Math.PI/2;return{x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle),char:c};});

  // Build relationship lines
  const lines=[];
  chars.forEach((c,i)=>{
    const rels=Array.isArray(c.relationships)?c.relationships:[];
    rels.forEach(rel=>{
      const target=typeof rel==='string'?rel:(rel.name||rel.target||'');
      const j=chars.findIndex(ch=>ch.name===target);
      if(j>i&&j<positions.length){lines.push({from:positions[i],to:positions[j],label:typeof rel==='object'?rel.type||'':''});}
    });
  });

  return(<div className="anim-fade">
    <svg viewBox="0 0 320 280" className="w-full">
      {lines.map((l,i)=><g key={i}><line x1={l.from.x} y1={l.from.y} x2={l.to.x} y2={l.to.y} stroke="#a3a3a3" strokeWidth="1.5" strokeDasharray="4"/>{l.label&&<text x={(l.from.x+l.to.x)/2} y={(l.from.y+l.to.y)/2-4} textAnchor="middle" className="text-[8px] fill-neutral-500">{l.label}</text>}</g>)}
      {positions.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={20} className={p.char.is_alive?"fill-neutral-700":"fill-surface-400"}/><text x={p.x} y={p.y+1} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-white font-bold">{p.char.name.substring(0,3)}</text><text x={p.x} y={p.y+32} textAnchor="middle" className="text-[9px] fill-current">{p.char.name}</text></g>)}
    </svg>
    <p className="text-[10px] text-surface-400 text-center">캐릭터에 관계 설정을 추가하면 연결선이 표시됩니다</p>
  </div>);
}

function CharCard({c}){const[o,setO]=useState(false);return(<div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden"><button onClick={()=>setO(!o)} className="w-full flex items-center gap-2 p-2 hover:bg-surface-50 dark:hover:bg-surface-750 transition"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${c.is_alive?'bg-neutral-500':'bg-surface-400'}`}>{c.name[0]}</div><div className="text-left flex-1 min-w-0"><div className="text-sm font-medium truncate">{c.name}</div><div className="text-[10px] text-surface-400 truncate">{c.personality||'미설정'}</div></div>{!c.is_alive&&<span className="text-[10px] px-1.5 py-0.5 bg-neutral-50 dark:bg-red-900/30 text-neutral-700 rounded">사망</span>}{o?<ChevronUp className="w-3 h-3 text-surface-400"/>:<ChevronDown className="w-3 h-3 text-surface-400"/>}</button>{o&&<div className="px-3 pb-3 text-xs text-surface-600 dark:text-surface-400 space-y-1 border-t border-surface-100 dark:border-surface-700 pt-2 anim-fade">{c.appearance&&<p><b className="text-surface-500">외모:</b> {c.appearance}</p>}{c.personality&&<p><b className="text-surface-500">성격:</b> {c.personality}</p>}{c.speech_pattern&&<p><b className="text-surface-500">말투:</b> {c.speech_pattern}</p>}<p><b className="text-surface-500">첫 등장:</b> {c.first_appearance}화</p></div>}</div>);}
function FSCard({f}){const{updateForeshadow}=useStore();const col={open:'border-l-neutral-600 bg-neutral-50 dark:bg-neutral-900/20',resolved:'border-l-neutral-400 bg-neutral-50 dark:bg-neutral-800/20',abandoned:'border-l-surface-400 bg-surface-50 dark:bg-surface-800'};return(<div className={`p-2 rounded-lg border-l-[3px] ${col[f.status]||col.open}`}><div className="flex items-start justify-between"><p className="text-xs font-medium flex-1">{f.summary}</p><select value={f.status} onChange={e=>updateForeshadow(f.id,{...f,status:e.target.value})} className="text-[10px] bg-transparent border-none outline-none text-surface-500 cursor-pointer"><option value="open">미회수</option><option value="resolved">회수</option><option value="abandoned">폐기</option></select></div><p className="text-[10px] text-surface-400 mt-1">{f.planted_chapter}화 설치</p></div>);}
function AddFS(){const{addForeshadow,currentChapter}=useStore();const[s,setS]=useState(false);const[t,setT]=useState('');if(!s)return<button onClick={()=>setS(true)} className="w-full py-2 border border-dashed border-surface-300 dark:border-surface-700 rounded-lg text-xs text-surface-400 hover:border-neutral-400 transition flex items-center justify-center gap-1"><Plus className="w-3 h-3"/>복선 추가</button>;return<div className="flex gap-1"><input value={t} onChange={e=>setT(e.target.value)} placeholder="복선 내용" className="flex-1 text-xs px-2 py-1 border dark:border-surface-700 rounded bg-transparent" autoFocus/><button onClick={()=>{if(t){addForeshadow({summary:t,planted_chapter:currentChapter?.number||1});setT('');setS(false);}}} className="text-xs px-2 py-1 bg-neutral-900 dark:bg-white text-white rounded">추가</button></div>;}

// ── REVIEW with inline highlight + tension chart + feedback reject ──
function ReviewPanel(){
  const{reviewResult:r,isReviewing,rejectIssue,acceptIssue,tensionHistory,fetchTensionHistory,currentWork,reviewProgress}=useStore();

  useEffect(()=>{if(currentWork)fetchTensionHistory(currentWork.id);},[currentWork?.id,r]);

  // #4 Apply inline highlights when review completes
  useEffect(()=>{if(r?.issues)highlightIssuesInEditor(r.issues);},[r]);

  if(isReviewing)return<div className="space-y-3">
    <Loading text={reviewProgress?.current||'AI가 분석 중...'}/>
    {reviewProgress&&<div className="px-4"><div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden"><div className="h-full bg-neutral-800 rounded-full transition-all" style={{width:`${Math.max(5,(reviewProgress.completed/reviewProgress.total)*100)}%`}}/></div><p className="text-[10px] text-surface-400 text-center mt-1">{reviewProgress.completed}/{reviewProgress.total} 모듈 완료</p></div>}
  </div>;
  if(!r)return<Empty text="AI 검수 버튼을 눌러주세요" icon={Wand2}/>;
  if(r.error||r.raw)return<div className="text-xs text-surface-500 whitespace-pre-wrap">{r.error||r.raw}</div>;
  const issues=r.issues||[];
  const sIcon={critical:AlertTriangle,warning:AlertCircle,info:Info,suggestion:Sparkles};
  const sCol={critical:'text-neutral-700 bg-neutral-50 dark:bg-neutral-100 dark:bg-neutral-800/30',warning:'text-neutral-600 bg-neutral-50 dark:bg-neutral-800/20',info:'text-neutral-600 bg-neutral-50 dark:bg-neutral-900/20',suggestion:'text-neutral-600 bg-neutral-50 dark:bg-neutral-900/20'};

  return(<div className="space-y-3">
    {/* Tension score + chart (#5) */}
    {r.tension_score!==undefined&&<div className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg">
      <div className="flex items-center justify-between mb-2"><span className="text-xs text-surface-500">텐션 점수</span><span className="text-2xl font-bold text-neutral-900 dark:text-white">{r.tension_score}<span className="text-sm text-surface-400 font-normal">/10</span></span></div>
      {r.cliffhanger_score>0&&<div className="flex items-center justify-between mb-1"><span className="text-[10px] text-surface-400">클리프행어</span><span className="text-xs font-bold text-neutral-700">{r.cliffhanger_score}/10</span></div>}
      {r.pacing_warning&&<p className="text-[10px] text-neutral-700 mb-1">⚡ {r.pacing_warning}</p>}
      {tensionHistory.length>1&&<ResponsiveContainer width="100%" height={60}><LineChart data={tensionHistory.map(t=>({화:t.number+'화',텐션:t.tension_score}))}><XAxis dataKey="화" tick={{fontSize:9}} /><Line type="monotone" dataKey="텐션" stroke="#404040" strokeWidth={2} dot={{r:2}}/><Tooltip contentStyle={{fontSize:10}}/></LineChart></ResponsiveContainer>}
    </div>}

    {r.overall_feedback&&<div className="p-3 bg-surface-100 dark:bg-surface-800 rounded-lg"><div className="text-xs font-medium text-surface-500 mb-1">종합 피드백</div><p className="text-xs leading-relaxed">{r.overall_feedback}</p>
      {r._moduleStatus&&<div className="flex gap-1 mt-2 flex-wrap">{Object.entries(r._moduleStatus).map(([k,v])=><span key={k} className={`text-[9px] px-1.5 py-0.5 rounded ${v==='done'?'bg-neutral-100 dark:bg-neutral-800/20 text-neutral-700':'bg-neutral-100 dark:bg-red-900/30 text-neutral-700'}`}>{k} {v==='done'?'✓':'✗'}</span>)}</div>}
    </div>}

    {/* #3-7 Pending Vault Updates (Smart mode) */}
    {r._pendingVaultUpdates&&r.vault_updates&&(r.vault_updates.new_characters?.length>0||r.vault_updates.new_foreshadows?.length>0)&&<VaultDiffPanel updates={r.vault_updates}/>}

    <div className="text-xs font-medium text-surface-500">{issues.length>0?`이슈 (${issues.length}건)`:'이슈 없음'}</div>
    {issues.map((is,i)=>{const I=sIcon[is.severity]||Info;const c=sCol[is.severity]||sCol.info;return(
      <div key={i} className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 anim-fade">
        <div className="flex items-start gap-2"><div className={`p-1 rounded ${c}`}><I className="w-3 h-3"/></div><div className="flex-1">
          <div className="flex gap-2 mb-1"><span className="text-[10px] font-medium uppercase text-surface-400">{is.type}</span><span className={`text-[10px] px-1.5 py-0.5 rounded ${c}`}>{is.severity}</span>
            {/* #7 Reject button */}
            <button onClick={()=>rejectIssue(is.type,is.description)} className="text-[10px] text-surface-400 hover:text-neutral-700 flex items-center gap-0.5" title="이 유형 무시"><Ban className="w-2.5 h-2.5"/>무시</button>
          </div>
          <p className="text-xs mb-1">{is.description}</p>
          {is.location&&<p className="text-[10px] text-surface-400 italic mb-1 cursor-pointer hover:text-neutral-800" onClick={()=>{const e=window.__tiptapEditor;if(e){let pos=0;e.state.doc.descendants((nd,np)=>{if(nd.isText&&pos===0){const idx=(nd.text||'').indexOf(is.location);if(idx!==-1){pos=np+idx;return false;}}});if(pos>0)e.chain().setTextSelection({from:pos,to:pos+is.location.length}).scrollIntoView().run();}}}>&ldquo;{is.location}&rdquo;</p>}
          {is.suggestion&&<p className="text-xs text-neutral-900 dark:text-white font-medium mb-2">💡 {is.suggestion}</p>}
          {is.reference_chapters?.length>0&&<p className="text-[10px] text-surface-400 mb-1">📖 근거: {is.reference_chapters.map(c=>c+'화').join(', ')}</p>}
          {/* #1-5 Accept/Reject buttons */}
          <div className="flex gap-1 mt-1">{is.suggestion&&<button onClick={()=>acceptIssue(is)} className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800/20 text-neutral-700 rounded hover:bg-neutral-200 transition">수락</button>}<button onClick={()=>rejectIssue(is.type,is.description)} className="text-[10px] px-2 py-0.5 bg-neutral-50 dark:bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 rounded hover:bg-neutral-100 transition">거절</button></div>
        </div></div>
      </div>);})}

    {r.popularity_tips?.filter(Boolean).length>0&&<div className="mt-3"><div className="text-xs font-medium text-neutral-700 mb-2">🎯 대중성 팁</div>{r.popularity_tips.filter(Boolean).map((t,i)=><div key={i} className="p-2 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg text-xs text-neutral-700 dark:text-neutral-400 mb-1">{t}</div>)}</div>}

    {/* 9-1: Share report */}
    <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700"><button onClick={()=>{const url=`${window.location.origin}/api/ai/report/${r._workId||''}/${r._chapterId||''}`;navigator.clipboard.writeText(url).then(()=>alert('리포트 링크가 복사되었습니다!')).catch(()=>alert(url));}} className="w-full py-1.5 text-[11px] text-neutral-500 hover:text-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg transition">📤 리포트 공유 링크 복사</button></div>
  </div>);
}

// ── SUGGEST ──
function SuggestPanel(){const{suggestions,isSuggesting,suggestStory}=useStore();const[d,setD]=useState('');return(<div><p className="text-xs text-surface-500 mb-2">미회수 복선 기반 스토리 전개를 제안합니다</p><div className="flex gap-1 mb-3"><input value={d} onChange={e=>setD(e.target.value)} placeholder="원하는 방향 (선택)" className="flex-1 text-xs px-2 py-1.5 border border-surface-300 dark:border-surface-700 rounded-lg bg-transparent"/><button onClick={()=>suggestStory(d)} disabled={isSuggesting} className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg disabled:opacity-60 flex items-center gap-1">{isSuggesting?<Loader2 className="w-3 h-3 animate-spin"/>:<Lightbulb className="w-3 h-3"/>}제안</button></div>{isSuggesting&&<Loading text="구상 중..."/>}{suggestions?.suggestions?.map((s,i)=><div key={i} className="p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg mb-2 anim-fade"><div className="flex items-center justify-between mb-1"><h4 className="text-sm font-bold">{s.title}</h4>{s.tension&&<span className="text-[10px] px-1.5 py-0.5 bg-neutral-50 dark:bg-neutral-800/30 text-neutral-900 dark:text-white rounded">텐션 {s.tension}</span>}</div><p className="text-xs text-surface-600 dark:text-surface-400 mb-2 leading-relaxed">{s.synopsis}</p>
      {s.reader_reaction&&<div className="flex items-center gap-2 mb-1"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.reader_reaction==='열광'?'bg-neutral-100 text-neutral-700':s.reader_reaction==='분노'||s.reader_reaction==='이탈'?'bg-neutral-100 text-neutral-900 dark:text-neutral-200':'bg-neutral-100 text-neutral-700'}`}>📊 {s.reader_reaction}</span>{s.reader_retention&&<span className={`text-[10px] ${s.reader_retention?.includes('상승')?'text-neutral-600':s.reader_retention?.includes('하락')?'text-neutral-700':'text-surface-400'}`}>{s.reader_retention}</span>}</div>}
      {s.reader_reaction_detail&&<p className="text-[10px] text-surface-400 italic mb-1">💬 &ldquo;{s.reader_reaction_detail}&rdquo;</p>}
      {s.risk&&<p className="text-[10px] text-neutral-600">⚠️ {s.risk}</p>}</div>)}{suggestions?.raw&&<pre className="text-xs text-surface-500 whitespace-pre-wrap">{suggestions.raw}</pre>}</div>);}

// ── GHOSTWRITE ──
function GhostwritePanel(){const{ghostwriteResult,isGhostwriting,ghostwrite,saveChapter}=useStore();const[idea,setIdea]=useState('');const apply=()=>{if(ghostwriteResult?.content){const html=ghostwriteResult.content.split('\n\n').map(p=>`<p><mark data-color="#f0f0f0" style="background:#f0f0f0;border-left:2px solid #525252;padding-left:4px" title="AI 대필">${p}</mark></p>`).join('');const e=window.__tiptapEditor;if(e){e.commands.insertContent(html);saveChapter(e.getHTML());}}};return(<div><div className="flex items-center gap-2 mb-2"><PenLine className="w-4 h-4 text-neutral-600"/><span className="text-sm font-bold">AI 대필</span></div><p className="text-xs text-surface-500 mb-1">아이디어 → 현재 설정+문체로 한 화 작성</p><p className="text-[10px] text-neutral-400 mb-3">💡 적용 시 AI가 쓴 부분은 보라색으로 표시됩니다</p><textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="예: 보스가 사실 아버지였다" className="w-full text-xs px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg h-24 resize-none bg-transparent"/><button onClick={()=>ghostwrite(idea)} disabled={isGhostwriting||!idea.trim()} className="w-full mt-2 py-2 bg-neutral-900 dark:bg-white text-white text-xs rounded-lg disabled:opacity-60 flex items-center justify-center gap-1 font-medium">{isGhostwriting?<Loader2 className="w-3 h-3 animate-spin"/>:<Send className="w-3 h-3"/>}{isGhostwriting?'집필중...':'대필 시작'}</button>{isGhostwriting&&<Loading text="AI 집필중..."/>}{ghostwriteResult?.content&&<div className="mt-3 anim-fade"><div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-surface-500">결과</span><button onClick={apply} className="text-xs px-3 py-1 bg-neutral-900 dark:bg-white text-white rounded-lg">에디터 삽입</button></div><div className="p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg max-h-96 overflow-y-auto"><div className="text-xs leading-relaxed whitespace-pre-wrap">{ghostwriteResult.content}</div></div></div>}</div>);}

// ── STYLE LEARNING ──
function StylePanel(){const{styleProfile:sp,isLearningStyle,learnStyle}=useStore();const patterns=sp?.unique_patterns?(typeof sp.unique_patterns==='string'?JSON.parse(sp.unique_patterns):sp.unique_patterns):[];return(<div><div className="flex items-center gap-2 mb-2"><GraduationCap className="w-4 h-4 text-neutral-600"/><span className="text-sm font-bold">필체 학습</span></div><p className="text-xs text-surface-500 mb-3">기존 원고 분석 → 문체 프로필 → AI 대필 반영. 최소 3화(500자+)</p><button onClick={learnStyle} disabled={isLearningStyle} className="w-full py-2 bg-neutral-500 text-white text-xs rounded-lg disabled:opacity-60 flex items-center justify-center gap-1 font-medium mb-4">{isLearningStyle?<Loader2 className="w-3 h-3 animate-spin"/>:<GraduationCap className="w-3 h-3"/>}{isLearningStyle?'분석중...':'문체 분석'}</button>{isLearningStyle&&<Loading text="학습중..."/>}{sp&&sp.avg_sentence_length&&<div className="space-y-3 anim-fade"><div className="grid grid-cols-2 gap-2"><M l="문장길이" v={`${Number(sp.avg_sentence_length).toFixed(1)}어절`}/><M l="대화비율" v={`${((sp.dialogue_ratio||0)*100).toFixed(0)}%`}/><M l="묘사밀도" v={`${((sp.description_density||0)*100).toFixed(0)}%`}/><M l="어휘다양성" v={`${((sp.vocab_diversity||0)*100).toFixed(0)}%`}/></div>{sp.tone&&<div className="p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg"><div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400">톤</div><p className="text-xs">{sp.tone}</p></div>}{patterns.length>0&&<div className="p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg"><div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400">고유 패턴</div>{patterns.map((p,i)=><p key={i} className="text-xs">• {p}</p>)}</div>}<StyleDetail sp={sp}/><p className="text-[10px] text-surface-400 text-center">AI 대필에 자동 반영됩니다</p></div>}</div>);}

function StyleDetail({sp}){
  // 4-4: Conjunction pattern + active/passive voice display
  if(!sp) return null;
  const conj = sp.conjunction_patterns || null;
  const voice = sp.voice_ratio || null;
  if(!conj && !voice) return null;
  return(<div className="space-y-2 mt-2">{conj&&<div className="p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg"><div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400 mb-1">접속사 패턴</div><div className="flex flex-wrap gap-1">{(typeof conj==='string'?conj.split(','):Array.isArray(conj)?conj:[]).map((c,i)=><span key={i} className="text-[10px] px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">{c.trim()}</span>)}</div></div>}{voice&&<div className="p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg"><div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400 mb-1">능동/수동태</div><div className="flex gap-2 items-center"><div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden"><div className="h-full bg-neutral-600 rounded-full" style={{width:`${(voice.active||70)}%`}}/></div><span className="text-[10px] text-neutral-500">능동 {voice.active||70}%</span></div></div>}</div>);
}

// ── SETTINGS: password, delete, export, terms, usage ──
function SettingsPanel(){
  const{user,changePassword,deleteAccount,changeNickname,logout,darkMode,toggleDark}=useStore();
  const[curPw,setCurPw]=useState('');const[newPw,setNewPw]=useState('');const[delPw,setDelPw]=useState('');
  const[nick,setNick]=useState(user?.nickname||'');const[showDel,setShowDel]=useState(false);
  const[showTerms,setShowTerms]=useState(false);

  const exportData=()=>{const token=localStorage.getItem('sm_token');fetch('/api/export-data',{headers:{Authorization:'Bearer '+token}}).then(r=>r.blob()).then(b=>{const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='storymind_my_data.json';a.click();URL.revokeObjectURL(u);});};

  return(<div className="space-y-4">
    <div className="text-sm font-bold flex items-center gap-2"><Settings className="w-4 h-4"/>설정</div>

    {/* Profile */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="text-xs font-medium text-surface-500 mb-2 flex items-center gap-1"><User className="w-3 h-3"/>프로필</div>
      <p className="text-xs text-surface-400 mb-2">{user?.email}</p>
      <div className="flex gap-1">
        <input value={nick} onChange={e=>setNick(e.target.value)} className="flex-1 text-xs px-2 py-1 border dark:border-surface-700 rounded bg-transparent" placeholder="닉네임"/>
        <button onClick={()=>changeNickname(nick)} className="text-xs px-2 py-1 bg-neutral-900 dark:bg-white text-white rounded">변경</button>
      </div>
    </div>

    {/* Dark mode */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 flex items-center justify-between">
      <span className="text-xs font-medium">다크 모드</span>
      <button onClick={toggleDark} className={`w-10 h-5 rounded-full transition ${darkMode?'bg-neutral-900 dark:bg-white':'bg-surface-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${darkMode?'translate-x-5':'translate-x-0.5'}`}/></button>
    </div>

    {/* #10-3 Data export */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="text-xs font-medium text-surface-500 mb-2">📦 데이터 관리</div>
      <button onClick={exportData} className="w-full text-xs py-1.5 bg-neutral-900 dark:bg-white text-white rounded mb-1">내 데이터 전체 내보내기 (JSON)</button>
      <p className="text-[10px] text-surface-400">원고, 설정, 사용 기록 등 모든 데이터를 다운로드합니다</p>
    </div>

    {/* Password */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="text-xs font-medium text-surface-500 mb-2 flex items-center gap-1"><Lock className="w-3 h-3"/>비밀번호 변경</div>
      <input type="password" value={curPw} onChange={e=>setCurPw(e.target.value)} placeholder="현재 비밀번호" className="w-full text-xs px-2 py-1 border dark:border-surface-700 rounded bg-transparent mb-1"/>
      <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="새 비밀번호 (6자+)" className="w-full text-xs px-2 py-1 border dark:border-surface-700 rounded bg-transparent mb-2"/>
      <button onClick={async()=>{try{await changePassword(curPw,newPw);setCurPw('');setNewPw('');}catch(e){alert(e.message);}}} disabled={!curPw||!newPw} className="w-full text-xs py-1.5 bg-neutral-900 dark:bg-white text-white rounded disabled:opacity-40">변경</button>
    </div>

    {/* #10-7 Terms */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="text-xs font-medium text-surface-500 mb-2">📄 약관</div>
      <button onClick={()=>setShowTerms(!showTerms)} className="text-xs text-neutral-900 dark:text-white underline">{showTerms?'닫기':'이용약관 및 개인정보처리방침 보기'}</button>
      {showTerms&&<div className="mt-2 max-h-60 overflow-y-auto text-[10px] text-surface-500 space-y-2 anim-fade">
        <h4 className="font-bold text-xs">이용약관</h4>
        <p>이용자의 원고 저작권은 전적으로 이용자에게 귀속됩니다. AI 제안을 수락한 경우에도 저작권은 이용자의 것입니다. 명시적 동의 없이 원고를 AI 학습에 사용하지 않습니다.</p>
        <h4 className="font-bold text-xs">개인정보처리방침</h4>
        <p>수집 항목: 이메일, 닉네임. 원고 데이터는 서비스 제공 목적으로만 사용됩니다. 언제든 데이터를 내보내거나 계정을 삭제할 수 있습니다. AI 분석 시 Anthropic API로 전송되며, Anthropic은 API 입력을 모델 학습에 사용하지 않습니다.</p>
      </div>}
    </div>

    {/* Account delete */}
    <div className="p-3 bg-neutral-50 dark:bg-neutral-100 dark:bg-neutral-800/30 rounded-lg border border-neutral-300 dark:border-neutral-700">
      <div className="text-xs font-medium text-neutral-900 dark:text-neutral-200 mb-2 flex items-center gap-1"><Trash2 className="w-3 h-3"/>계정 삭제</div>
      {!showDel?<button onClick={()=>setShowDel(true)} className="text-xs text-neutral-700 underline">계정을 삭제하고 싶어요</button>:(
        <div className="space-y-2 anim-fade">
          <p className="text-[10px] text-neutral-700">모든 작품, 설정, 데이터가 영구 삭제됩니다.</p>
          <input type="password" value={delPw} onChange={e=>setDelPw(e.target.value)} placeholder="비밀번호 확인" className="w-full text-xs px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded bg-transparent"/>
          <div className="flex gap-2"><button onClick={async()=>{try{await deleteAccount(delPw);logout();}catch(e){alert(e.message);}}} disabled={!delPw} className="flex-1 text-xs py-1 bg-neutral-900 text-white rounded disabled:opacity-40">삭제</button><button onClick={()=>setShowDel(false)} className="flex-1 text-xs py-1 bg-surface-200 dark:bg-surface-700 rounded">취소</button></div>
        </div>
      )}
    </div>
  </div>);
}

// #3-7 Vault change approval panel (Smart mode)
function VaultDiffPanel({updates}){
  const{addCharacter,addForeshadow,currentChapter}=useStore();
  const[accepted,setAccepted]=useState(new Set());
  const accept=(type,item,idx)=>{
    if(type==='char')addCharacter({name:item.name,appearance:item.appearance||'',personality:item.personality||'',first_appearance:currentChapter?.number||1});
    else addForeshadow({summary:item.summary,planted_chapter:item.chapter||currentChapter?.number||1});
    setAccepted(s=>{const n=new Set(s);n.add(type+idx);return n;});
  };
  const nc=updates.new_characters||[];const nf=updates.new_foreshadows||[];
  if(nc.length===0&&nf.length===0)return null;
  return(<div className="p-3 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg anim-fade">
    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 dark:text-neutral-400 mb-2">📋 StoryVault 변경 제안 (승인 필요)</div>
    {nc.map((c,i)=>accepted.has('char'+i)?null:<div key={'c'+i} className="flex items-center gap-2 mb-1 p-1.5 bg-white dark:bg-surface-800 rounded"><div className="flex-1"><span className="text-[10px] text-neutral-500 mr-1">캐릭터</span><span className="text-xs font-medium">{c.name}</span></div><button onClick={()=>accept('char',c,i)} className="text-[10px] px-2 py-0.5 bg-neutral-900 text-white rounded">승인</button></div>)}
    {nf.map((f,i)=>accepted.has('fs'+i)?null:<div key={'f'+i} className="flex items-center gap-2 mb-1 p-1.5 bg-white dark:bg-surface-800 rounded"><div className="flex-1"><span className="text-[10px] text-neutral-600 mr-1">복선</span><span className="text-xs">{f.summary}</span></div><button onClick={()=>accept('fs',f,i)} className="text-[10px] px-2 py-0.5 bg-neutral-900 dark:bg-white text-white rounded">승인</button></div>)}
    {accepted.size>0&&<p className="text-[10px] text-neutral-600 mt-1">✓ {accepted.size}건 승인됨</p>}
  </div>);
}

function M({l,v}){return<div className="p-2 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 text-center"><div className="text-[10px] text-surface-400">{l}</div><div className="text-sm font-bold text-neutral-700">{v}</div></div>}
function Loading({text}){return<div className="flex flex-col items-center py-8"><div className="w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin mb-3"/><p className="text-xs text-surface-400">{text}</p></div>}
function Empty({text,icon:I}){return<div className="flex flex-col items-center py-12 text-center"><I className="w-10 h-10 text-surface-300 mb-3"/><p className="text-xs text-surface-400">{text}</p></div>}
