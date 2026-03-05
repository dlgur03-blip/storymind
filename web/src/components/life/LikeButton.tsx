// @ts-nocheck
'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'

interface LikeButtonProps {
  isLiked: boolean
  count: number
  onToggle: () => Promise<void>
  size?: 'sm' | 'md'
}

export default function LikeButton({ isLiked: initialLiked, count: initialCount, onToggle, size = 'md' }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [animating, setAnimating] = useState(false)

  const handleClick = async () => {
    setLiked(!liked)
    setCount(liked ? count - 1 : count + 1)
    if (!liked) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }
    await onToggle()
  }

  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 transition ${
        liked ? 'text-rose-500' : 'text-neutral-400 hover:text-rose-400'
      }`}
    >
      <Heart className={`${sizeClass} ${liked ? 'fill-current' : ''} ${animating ? 'like-bounce' : ''}`} />
      <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>{count}</span>
    </button>
  )
}
