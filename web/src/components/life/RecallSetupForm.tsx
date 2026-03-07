// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'

const TONES = [
  { value: '따뜻한', label: '따뜻한' },
  { value: '드라마틱', label: '드라마틱' },
  { value: '유머러스', label: '유머러스' },
  { value: '담담한', label: '담담한' },
]

export interface RecallConfig {
  birth_year: number
  birth_place: string
  world_setting: 'real' | 'fantasy'
  world_detail: string
  novel_style: 'memoir' | 'fiction'
  protagonist_name: string
  tone: string
}

interface RecallSetupFormProps {
  onChange: (config: RecallConfig) => void
  initialConfig?: Partial<RecallConfig>
}

export default function RecallSetupForm({ onChange, initialConfig }: RecallSetupFormProps) {
  const [birthYear, setBirthYear] = useState(initialConfig?.birth_year || 2000)
  const [birthPlace, setBirthPlace] = useState(initialConfig?.birth_place || '')
  const [worldSetting, setWorldSetting] = useState<'real' | 'fantasy'>(initialConfig?.world_setting || 'real')
  const [worldDetail, setWorldDetail] = useState(initialConfig?.world_detail || '')
  const [novelStyle, setNovelStyle] = useState<'memoir' | 'fiction'>(initialConfig?.novel_style || 'memoir')
  const [protagonistName, setProtagonistName] = useState(initialConfig?.protagonist_name || '')
  const [tone, setTone] = useState(initialConfig?.tone || '따뜻한')

  useEffect(() => {
    onChange({
      birth_year: birthYear,
      birth_place: birthPlace,
      world_setting: worldSetting,
      world_detail: worldDetail,
      novel_style: novelStyle,
      protagonist_name: protagonistName,
      tone,
    })
  }, [birthYear, birthPlace, worldSetting, worldDetail, novelStyle, protagonistName, tone])

  const toggleBtnClass = (active: boolean) =>
    active
      ? 'border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/15'
      : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'

  const inputClass = 'w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-rose-700 dark:focus:border-rose-600 transition-colors duration-300 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600'

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">출생년도</label>
        <input
          type="number"
          value={birthYear}
          onChange={(e) => setBirthYear(parseInt(e.target.value) || 2000)}
          min={1920}
          max={new Date().getFullYear()}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">출생 장소 / 성장 지역</label>
        <input
          type="text"
          value={birthPlace}
          onChange={(e) => setBirthPlace(e.target.value)}
          placeholder="예: 서울 강남, 부산 해운대"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">세계관</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setWorldSetting('real')}
            className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${toggleBtnClass(worldSetting === 'real')}`}
          >
            현실
          </button>
          <button
            type="button"
            onClick={() => setWorldSetting('fantasy')}
            className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${toggleBtnClass(worldSetting === 'fantasy')}`}
          >
            판타지
          </button>
        </div>
        {worldSetting === 'fantasy' && (
          <input
            type="text"
            value={worldDetail}
            onChange={(e) => setWorldDetail(e.target.value)}
            placeholder="판타지 세계관을 설명해주세요"
            className={`${inputClass} mt-2`}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">소설 스타일</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setNovelStyle('memoir')}
            className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${toggleBtnClass(novelStyle === 'memoir')}`}
          >
            자서전 (1인칭)
          </button>
          <button
            type="button"
            onClick={() => setNovelStyle('fiction')}
            className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${toggleBtnClass(novelStyle === 'fiction')}`}
          >
            소설화 (3인칭)
          </button>
        </div>
        {novelStyle === 'fiction' && (
          <input
            type="text"
            value={protagonistName}
            onChange={(e) => setProtagonistName(e.target.value)}
            placeholder="주인공 이름 (가명)"
            className={`${inputClass} mt-2`}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">분위기</label>
        <div className="grid grid-cols-2 gap-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTone(t.value)}
              className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${toggleBtnClass(tone === t.value)}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
