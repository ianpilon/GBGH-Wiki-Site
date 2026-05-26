import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'

const PROMPTS = [
  "Who's the President & CEO?",
  'Who works in pharmacy?',
  'What are the visiting hours?',
  'Is hand hygiene compliance improving?',
]

// Render an assistant message: turn [text](path) into clickable links.
// Only matches internal paths starting with "/". Everything else stays text.
function renderAssistantText(text, onLinkClick) {
  const parts = []
  const regex = /\[([^\]]+)\]\((\/[^\s)]+)\)/g
  let last = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ label: m[1], href: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((p, i) =>
    typeof p === 'string' ? (
      <span key={i}>{p}</span>
    ) : (
      <a
        key={i}
        href={p.href}
        onClick={onLinkClick}
        style={{ color: '#2563eb', textDecoration: 'underline' }}
      >
        {p.label}
      </a>
    )
  )
}

function prettyTitleFromPath(path) {
  if (!path || path === '/') return 'Home'
  const last = path.split('/').filter(Boolean).pop() || 'Home'
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function WikiChat() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  const pageTitle = prettyTitleFromPath(router.asPath.split('#')[0])

  async function callApi(nextMessages) {
    setLoading(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.filter((m) => !m.error),
          currentPath: router.asPath.split('#')[0].split('?')[0],
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.error || 'Request failed.',
            error: true,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.answer },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Network error: ' + String(err), error: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  function sendText(text) {
    const userMsg = { role: 'user', text }
    const next = [...messages, userMsg]
    setMessages(next)
    callApi(next)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    sendText(userText)
  }

  function reset() {
    setMessages([])
  }

  return (
    <>
      <button
        aria-label="Open AI chat"
        onClick={() => setOpen(true)}
        title="Ask the wiki (Cmd+/)"
        style={{
          position: 'fixed',
          right: 'calc(24px + env(safe-area-inset-right))',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          padding: '12px 20px',
          height: '52px',
          borderRadius: '9999px',
          background: '#111827',
          color: 'white',
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          zIndex: 60,
          border: 'none',
          fontFamily: 'inherit',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {/* Big 4-point sparkle, slightly left of center */}
          <path d="M9 1.5 L10.3 7.7 16.5 9 10.3 10.3 9 16.5 7.7 10.3 1.5 9 7.7 7.7 Z" />
          {/* Smaller sparkle, upper right */}
          <path d="M18 3 L18.7 5.3 21 6 18.7 6.7 18 9 17.3 6.7 15 6 17.3 5.3 Z" opacity="0.85" />
          {/* Tiny sparkle, lower right */}
          <path d="M19 16 L19.4 17.6 21 18 19.4 18.4 19 20 18.6 18.4 17 18 18.6 17.6 Z" opacity="0.7" />
        </svg>
        <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '0.3px' }}>Ai</span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.30)',
            zIndex: 70,
          }}
        />
      )}

      <aside
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100dvh',
          maxHeight: '100dvh',
          width: 'min(420px, 100vw)',
          background: '#ffffff',
          color: '#111827',
          boxShadow: '-12px 0 30px rgba(0,0,0,0.20)',
          zIndex: 80,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Wiki Chat</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Asking about: <span style={{ color: '#111827' }}>{pageTitle}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={reset}
              title="New conversation"
              style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#111827' }}
            >
              Reset
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ padding: '6px 10px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#111827' }}
            >
              ✕
            </button>
          </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {messages.length === 0 && (
            <>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.5 }}>
                Ask anything about Georgian Bay General Hospital. Answers will cite the wiki pages they draw from.
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Suggested
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PROMPTS.map((label) => (
                  <button
                    key={label}
                    onClick={() => sendText(label)}
                    disabled={loading}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#f9fafb',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      lineHeight: 1.4,
                      color: '#111827',
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: '14px' }}>
              {m.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      background: '#111827',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '14px 14px 4px 14px',
                      maxWidth: '85%',
                      fontSize: '13px',
                      lineHeight: 1.5,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      background: m.error ? '#fee2e2' : '#f3f4f6',
                      padding: '10px 12px',
                      borderRadius: '14px 14px 14px 4px',
                      fontSize: '13px',
                      lineHeight: 1.55,
                      color: m.error ? '#991b1b' : '#111827',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {renderAssistantText(m.text, () => setOpen(false))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  background: '#f3f4f6',
                  padding: '10px 12px',
                  borderRadius: '14px 14px 14px 4px',
                  fontSize: '13px',
                  color: '#6b7280',
                  display: 'inline-block',
                }}
              >
                Thinking…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', display: 'flex', gap: '8px', background: '#fff' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
              color: '#111827',
              background: '#fff',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 14px',
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.6 : 1,
            }}
          >
            Send
          </button>
        </form>
        <div className="wiki-chat-kb-hint" style={{ padding: '6px 16px 10px', fontSize: '11px', color: '#9ca3af', textAlign: 'center', background: '#fff' }}>
          Cmd+/ to toggle ・ Esc to close
        </div>
      </aside>

      <style jsx global>{`
        @media (hover: none) and (pointer: coarse) {
          .wiki-chat-kb-hint { display: none; }
        }
      `}</style>
    </>
  )
}
