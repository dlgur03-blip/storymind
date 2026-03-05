// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const workId = request.nextUrl.searchParams.get('workId')
    const format = request.nextUrl.searchParams.get('format') || 'txt'
    const platform = request.nextUrl.searchParams.get('platform') || 'generic'

    if (!workId) return NextResponse.json({ error: 'workId 필수' }, { status: 400 })

    const { data: work } = await supabase.from('works').select('title').eq('id', workId).single()
    const { data: chapters } = await supabase
      .from('chapters')
      .select('number, title, content')
      .eq('work_id', workId)
      .order('number')

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({ error: '내보낼 챕터가 없습니다' }, { status: 404 })
    }

    const title = work?.title || 'export'
    let content = ''

    if (format === 'txt') {
      content = chapters.map(ch => {
        const chTitle = ch.title || `${ch.number}화`
        const text = (ch.content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
        if (platform === 'naver') return `${chTitle}\n\n${text}\n\n---\n`
        if (platform === 'kakao') return `[${chTitle}]\n\n${text}\n\n===\n`
        if (platform === 'munpia') return `# ${chTitle}\n\n${text}\n\n`
        if (platform === 'ridi') return `${chTitle}\n\n${text}\n\n* * *\n`
        return `${chTitle}\n\n${text}\n\n---\n`
      }).join('\n')
    } else if (format === 'html') {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{max-width:800px;margin:0 auto;padding:40px;font-family:serif;line-height:1.8}</style></head><body><h1>${title}</h1>${chapters.map(ch => `<h2>${ch.title || `${ch.number}화`}</h2>${ch.content || ''}`).join('<hr>')}</body></html>`
    }

    const headers = new Headers()
    headers.set('Content-Type', format === 'html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8')
    headers.set('Content-Disposition', `attachment; filename="${title}.${format}"`)

    return new NextResponse(content, { headers })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: '내보내기 중 오류 발생' }, { status: 500 })
  }
}
