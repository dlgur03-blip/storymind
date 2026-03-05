// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { workId, files } = await request.json()
    if (!workId || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'workId, files[] 필수' }, { status: 400 })
    }

    // Get current max chapter number
    const { data: existing } = await supabase
      .from('chapters')
      .select('number')
      .eq('work_id', workId)
      .order('number', { ascending: false })
      .limit(1)

    let nextNum = (existing?.[0]?.number || 0) + 1

    const imported: Array<{ number: number; title: string; wordCount: number }> = []

    for (const file of files) {
      const { name, content } = file
      const title = name?.replace(/\.[^.]+$/, '') || `${nextNum}화`
      const htmlContent = content
        .split('\n\n')
        .filter((p: string) => p.trim())
        .map((p: string) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('\n')

      const wordCount = content.replace(/\s+/g, '').length

      await supabase.from('chapters').insert({
        work_id: workId,
        number: nextNum,
        title,
        content: htmlContent,
        word_count: wordCount,
      })

      imported.push({ number: nextNum, title, wordCount })
      nextNum++
    }

    return NextResponse.json({ imported, count: imported.length })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: '임포트 중 오류 발생' }, { status: 500 })
  }
}
