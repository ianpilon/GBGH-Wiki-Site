import fs from 'fs'
import path from 'path'

const PAGES_DIR = path.join(process.cwd(), 'src', 'pages')
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'his', 'her', 'their', 'this', 'that',
  'these', 'those', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'as', 'by', 'from',
  'what', 'who', 'where', 'when', 'why', 'how', 'which', 'whose', 'me', 'my', 'your', 'our',
  'if', 'then', 'than', 'so', 'not', 'no', 'yes', 'too', 'very', 'just', 'only', 'also', 'all',
  'any', 'some', 'each', 'every', 'one', 'two', 'three', 'there', 'here', 'up', 'down', 'out',
  'over', 'into', 'between', 'through', 'page', 'pages', 'wiki', 'gbgh', 'hospital',
])

function tokenize(text) {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

function pathToRoute(absPath) {
  const rel = path.relative(PAGES_DIR, absPath).replace(/\\/g, '/')
  const noExt = rel.replace(/\.(mdx|md)$/, '')
  const r = '/' + (noExt.endsWith('/index') ? noExt.slice(0, -'/index'.length) : noExt === 'index' ? '' : noExt)
  return r.replace(/\/+$/, '') || '/'
}

let cachedIndex = null
function buildIndex() {
  if (cachedIndex) return cachedIndex
  const docs = []
  function walk(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.name === 'api' || e.name.startsWith('_')) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) {
        const content = fs.readFileSync(full, 'utf-8')
        const route = pathToRoute(full)
        const titleMatch = content.match(/^#\s+(.+)$/m)
        const title = titleMatch ? titleMatch[1].trim() : route
        const tokens = tokenize(content)
        const tf = {}
        for (const t of tokens) tf[t] = (tf[t] || 0) + 1
        docs.push({ route, title, content, tf, len: tokens.length })
      }
    }
  }
  walk(PAGES_DIR)
  // Compute IDF.
  const df = {}
  for (const d of docs) {
    for (const t of Object.keys(d.tf)) df[t] = (df[t] || 0) + 1
  }
  const N = docs.length
  const idf = {}
  for (const t of Object.keys(df)) idf[t] = Math.log((N - df[t] + 0.5) / (df[t] + 0.5) + 1)
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(N, 1)
  cachedIndex = { docs, idf, avgLen, N }
  return cachedIndex
}

// BM25 ranking.
function retrieve(query, k = 4, opts = {}) {
  const { docs, idf, avgLen } = buildIndex()
  const queryTerms = tokenize(query)
  if (queryTerms.length === 0) return []
  const k1 = 1.5
  const b = 0.75
  const scored = docs.map((d) => {
    let score = 0
    for (const t of queryTerms) {
      const f = d.tf[t]
      if (!f) continue
      const w = idf[t] || 0
      score += w * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.len / avgLen))))
    }
    return { ...d, score }
  })
  let hits = scored.filter((d) => d.score > 0).sort((a, b) => b.score - a.score)
  if (opts.excludeRoute) hits = hits.filter((d) => d.route !== opts.excludeRoute)
  return hits.slice(0, k)
}

function readPageContent(route) {
  const r = route === '/' ? '/index' : route
  const candidates = [
    path.join(PAGES_DIR, r + '.mdx'),
    path.join(PAGES_DIR, r + '.md'),
    path.join(PAGES_DIR, r, 'index.mdx'),
    path.join(PAGES_DIR, r, 'index.md'),
  ]
  for (const c of candidates) {
    try { return fs.readFileSync(c, 'utf-8') } catch {}
  }
  return null
}

function buildSystemPrompt(currentPath, lastUserMessage) {
  // Retrieve top pages relevant to the user's question. Always exclude the current
  // page from retrieval and include it separately so its weight is consistent.
  const hits = retrieve(lastUserMessage, 4, { excludeRoute: currentPath })
  const currentPage = readPageContent(currentPath)
  const currentExcerpt = currentPage ? currentPage.slice(0, 1200) : null

  const retrievedBlocks = hits.map((h) => {
    const excerpt = h.content.slice(0, 1500)
    return `## ${h.title}  (${h.route})\n\n${excerpt}`
  })

  return `You answer questions about the Georgian Bay General Hospital (GBGH) wiki. Use only the wiki content shown below.

Rules:
- 2 to 4 sentences. Direct, plain language.
- ALWAYS link names and pages with markdown: [Display Name](/path). Use only the paths shown.
- People pages live at /people/<slug>. Role-family hubs live at /people/<family>.
- Do not invent facts, paths, or people.
- LinkedIn affiliation is self-declared (snapshot 2026-05-25). Treat status as soft signal.
- No em-dashes.
- If the answer is not in the content below, say so and suggest the most likely page from the retrieved list.

# Currently viewing: ${currentPath}
${currentExcerpt ? '\n## Current page (excerpt)\n\n' + currentExcerpt : ''}

# Retrieved pages relevant to the question

${retrievedBlocks.length > 0 ? retrievedBlocks.join('\n\n---\n\n') : '(no retrieved pages — answer from current page only)'}
`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.status(500).json({
      error: 'GROQ_API_KEY not set. Add it to .env.local and restart the dev server.',
    })
    return
  }
  const { messages, currentPath } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array required' })
    return
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const lastUserText = (lastUser && (lastUser.text || lastUser.content)) || ''
  const systemPrompt = buildSystemPrompt(currentPath || '/', lastUserText)

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text || m.content || '',
    })),
  ]

  try {
    const upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: chatMessages,
        temperature: 0.2,
        max_tokens: 600,
      }),
    })
    const raw = await upstream.text()
    if (!upstream.ok) {
      let friendly = `Groq returned ${upstream.status}`
      if (upstream.status === 429) {
        friendly = 'Rate limited by Groq free tier. Try again in about a minute, or upgrade at console.groq.com/settings/billing.'
      } else if (upstream.status === 413) {
        friendly = 'Wiki context too large for this model on the current Groq tier.'
      } else if (upstream.status === 401) {
        friendly = 'Groq rejected the API key. Check GROQ_API_KEY in .env.local.'
      }
      res.status(upstream.status).json({ error: friendly, detail: raw.slice(0, 300) })
      return
    }
    const data = JSON.parse(raw)
    const answer = data.choices?.[0]?.message?.content || '(empty response)'
    const sources = (buildSystemPrompt(currentPath || '/', lastUserText), null) // no-op, retrieval already inlined
    res.status(200).json({ answer, model: data.model, usage: data.usage })
  } catch (err) {
    res.status(500).json({ error: 'Upstream call failed', detail: String(err) })
  }
}
