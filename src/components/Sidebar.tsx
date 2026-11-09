import React, { useRef, useState } from 'react'
import type { StoredSession } from '../electron'

const MIN_WIDTH = 160
const MAX_WIDTH = 480

interface Props {
  sessions: StoredSession[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  userEmail: string | null
  planName: string | null
  onOpenSettings: () => void
  extractorActive: boolean
  onExtractor: () => void
  readinessActive: boolean
  onReadiness: () => void
  derivationActive: boolean
  onDerivation: () => void
  width: number
  onWidthChange: (w: number) => void
  isProcessing?: boolean
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}m atrás`
  if (h < 24) return `${h}h atrás`
  if (d < 7)  return `${d}d atrás`
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function Sidebar({
  sessions, activeSessionId, onSelect, onNewSession, onDeleteSession,
  userEmail, planName, onOpenSettings, extractorActive, onExtractor,
  readinessActive, onReadiness, derivationActive, onDerivation,
  width, onWidthChange, isProcessing,
}: Props) {
  const dragging = useRef(false)
  const splitDragging = useRef(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const [splitPct, setSplitPct] = useState(50)

  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    splitDragging.current = true
    const startY = e.clientY
    const startPct = splitPct

    const onMove = (ev: MouseEvent) => {
      if (!splitDragging.current) return
      const sidebarH = sidebarRef.current?.clientHeight ?? 0
      if (!sidebarH) return
      const deltaPct = ((ev.clientY - startY) / sidebarH) * 100
      setSplitPct(Math.min(80, Math.max(20, startPct + deltaPct)))
    }
    const onUp = () => {
      splitDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = width

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + ev.clientX - startX))
      onWidthChange(next)
    }
    const onUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <aside ref={sidebarRef} className="sidebar" style={{ width }}>

      {/* metade superior — conversas */}
      <div className="sidebar-pane" style={{ flex: splitPct }}>
        <div className="sidebar-top">
          <button className="new-btn" onClick={onNewSession}>
            <span>＋</span> Nova conversa
          </button>
        </div>
        <div className="sidebar-label">Conversas recentes</div>
        <div className="session-list">
          {sessions.length === 0 && (
            <div className="session-empty">Nenhuma conversa ainda</div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === activeSessionId ? 'active' : ''}${isProcessing && s.id !== activeSessionId ? ' disabled' : ''}`}
              onClick={() => { if (!isProcessing || s.id === activeSessionId) onSelect(s.id) }}
              title={isProcessing && s.id !== activeSessionId ? 'Aguarde o processamento terminar para trocar de conversa' : undefined}
            >
              <div className="s-title">
                {s.feature === 'extractor'  && <span className="s-feat-badge" title="Extrator de HU/HT">📋</span>}
                {s.feature === 'readiness'  && <span className="s-feat-badge" title="Validador DoR">✅</span>}
                {s.feature === 'derivation' && <span className="s-feat-badge" title="Gerador de AT">📐</span>}
                {s.title}
              </div>
              <div className="s-footer">
                <span className="s-time">{timeAgo(s.updatedAt)}</span>
                <button
                  className="s-delete-btn"
                  title="Apagar conversa"
                  disabled={!!isProcessing}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isProcessing && window.confirm(`Apagar "${s.title}"?`)) onDeleteSession(s.id)
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* handle divisório arrastável */}
      <div className="sidebar-split-handle" onMouseDown={handleSplitMouseDown} />

      {/* metade inferior — funcionalidades + rodapé */}
      <div className="sidebar-pane sidebar-pane-bottom" style={{ flex: 100 - splitPct }}>
        <div className="sidebar-label sidebar-label-section">Funcionalidades</div>
        <div className="sidebar-tools-scroll">
          <button
            className={`sb-tool-btn${extractorActive ? ' active' : ''}`}
            onClick={onExtractor}
            title="Extrator de Histórias de Usuário"
          >
            <span className="sb-tool-icon">📋</span>
            <span className="sb-tool-label">Extrator de HU/HT</span>
          </button>
          <button
            className={`sb-tool-btn${readinessActive ? ' active' : ''}`}
            onClick={onReadiness}
            title="Validador DoR — Definition of Ready"
            style={{ marginTop: 6 }}
          >
            <span className="sb-tool-icon">✅</span>
            <span className="sb-tool-label">Validador DoR</span>
          </button>
          <button
            className={`sb-tool-btn${derivationActive ? ' active' : ''}`}
            onClick={onDerivation}
            title="Gerador de Anexo Técnico a partir de uma história de usuário"
            style={{ marginTop: 6 }}
          >
            <span className="sb-tool-icon">📐</span>
            <span className="sb-tool-label">Gerador de Anexo Técnico</span>
          </button>
        </div>
        <div className="sidebar-footer">
          <div className="sf-user-row">
            <div className="sf-dot" />
            <div className="sf-user-info">
              <span className="sf-email">{userEmail ?? 'kiro-cli'}</span>
              {planName && <span className="sf-plan">{planName}</span>}
            </div>
            <button className="sf-settings-btn" onClick={onOpenSettings} title="Configurações">⚙</button>
          </div>
        </div>
      </div>

      <div className="sidebar-resize-handle" onMouseDown={handleResizeMouseDown} />
    </aside>
  )
}
