// @ts-nocheck
'use client'

import { useState } from 'react'
import { Share2, Link, Download, X, Check } from 'lucide-react'

interface ShareButtonProps {
  storyId: string
  chapterId?: string
  chapterNum?: number
}

export default function ShareButton({ storyId, chapterId, chapterNum }: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = chapterNum
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/life/story/${storyId}/${chapterNum}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/life/story/${storyId}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleDownloadCard = () => {
    if (!chapterId) return
    const cardUrl = `/api/life/share-card?chapterId=${chapterId}`
    window.open(cardUrl, '_blank')
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 hover:border-rose-300 transition text-sm"
      >
        <Share2 className="w-4 h-4" />
        공유
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-sm p-6 life-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">공유하기</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Copy link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-600 transition"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Link className="w-5 h-5 text-neutral-500" />}
                <span className="text-sm font-medium">{copied ? '복사됨!' : '링크 복사'}</span>
              </button>

              {/* Download card */}
              {chapterId && (
                <button
                  onClick={handleDownloadCard}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl hover:from-rose-100 hover:to-pink-100 dark:hover:from-rose-900/30 dark:hover:to-pink-900/30 transition"
                >
                  <Download className="w-5 h-5 text-rose-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium">인스타 카드 다운로드</p>
                    <p className="text-xs text-neutral-400">1080x1920 이미지</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
