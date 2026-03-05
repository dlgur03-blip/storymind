// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { UserMinus, Shield, Eye, Loader2, X } from 'lucide-react'

interface CollaboratorListProps {
  workId: string
  onClose: () => void
}

export default function CollaboratorList({ workId, onClose }: CollaboratorListProps) {
  const [collaborators, setCollaborators] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`/api/editor/collaborators?workId=${workId}`)
      const data = await res.json()
      setCollaborators(data.collaborators || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCollaborators() }, [workId])

  const handleRevoke = async (collabId: string) => {
    if (!confirm('편집자를 해제하시겠습니까?')) return
    await fetch('/api/editor/collaborators', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaboratorId: collabId, action: 'revoke' }),
    })
    fetchCollaborators()
  }

  const handleChangeRole = async (collabId: string, role: string) => {
    await fetch('/api/editor/collaborators', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaboratorId: collabId, action: 'changeRole', role }),
    })
    fetchCollaborators()
  }

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return '대기중'
      case 'active': return '활성'
      case 'revoked': return '해제됨'
      default: return s
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'active': return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400'
      default: return 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-bold">편집자 관리</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <p className="text-sm">초대된 편집자가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaborators.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center text-sm font-medium">
                      {c.display_name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{c.display_name || '알 수 없음'}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor(c.status)}`}>
                          {statusLabel(c.status)}
                        </span>
                        <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                          {c.role === 'editor' ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {c.role === 'editor' ? '편집자' : '열람자'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {c.status !== 'revoked' && (
                    <div className="flex items-center gap-1">
                      <select
                        value={c.role}
                        onChange={e => handleChangeRole(c.id, e.target.value)}
                        className="text-[10px] px-1.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-600 dark:text-neutral-300"
                      >
                        <option value="editor">편집자</option>
                        <option value="viewer">열람자</option>
                      </select>
                      <button
                        onClick={() => handleRevoke(c.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="해제"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
