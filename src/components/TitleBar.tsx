import React from 'react'
import ModelSelector from './ModelSelector'

interface Props {
  cwd: string
  onPickFolder: () => void
  acpStatus: string
  isProcessing: boolean
  contextPct: number | null
  currentModel: string
  onModelChange: (m: string) => void
  logOpen: boolean
  onToggleLog: () => void
}

export default function TitleBar({
  cwd, onPickFolder,
  acpStatus, isProcessing,
  contextPct,
  currentModel, onModelChange,
  logOpen, onToggleLog,
}: Props) {
  const api = window.electronAPI
  const dirName = cwd ? cwd.replace(/\\/g, '/').split('/').pop() ?? cwd : '…'

  const statusLabel = isProcessing      ? 'Processando'
    : acpStatus === 'ready'             ? 'Pronto'
    : acpStatus === 'connecting'        ? 'Conectando'
    : acpStatus === 'error'             ? 'Erro'
    : 'Desconectado'
  const statusCls = isProcessing ? 'generating' : acpStatus

  return (
    <div className="titlebar">
      <div className="tb-logo">
        <span className="tb-logo-brand">AceleraAI</span>
        <span className="tb-logo-app">Assistente de IA</span>
      </div>

      <div className="tb-divider" />

      {api && (
        <div className="tb-item">
          <span className="tb-item-label">Workspace</span>
          <button
            className="tb-dir-btn"
            onClick={onPickFolder}
            title={cwd || 'Selecionar pasta do projeto'}
          >
            <span className="tb-dir-icon">📁</span>
            <span className="tb-dir-name">{dirName}</span>
          </button>
        </div>
      )}

      <div className="tb-divider" />

      <div className="tb-item">
        <span className="tb-item-label">Status</span>
        <span className={`tb-conn-status ${statusCls}`}>
          {(isProcessing || acpStatus === 'connecting') && <span className="spin-icon">⟳</span>}
          {!isProcessing && acpStatus !== 'connecting' && <span className="tb-conn-dot" />}
          {statusLabel}
        </span>
      </div>

      {api && (
        <>
          <div className="tb-divider" />
          <div className="tb-item">
            <span className="tb-item-label">Modelo</span>
            <ModelSelector currentModel={currentModel} onModelChange={onModelChange} />
          </div>
        </>
      )}

      {contextPct != null && (
        <>
          <div className="tb-divider" />
          <div className="tb-item" title={`Janela de contexto: ${contextPct.toFixed(1)}% usada`}>
            <span className="tb-item-label">Contexto</span>
            <div className={`ctx-indicator${contextPct >= 80 ? ' ctx-danger' : contextPct >= 50 ? ' ctx-warn' : ''}`}>
              <div className="ctx-bar-track">
                <div className="ctx-bar-fill" style={{ width: `${Math.min(contextPct, 100)}%` }} />
              </div>
              <span className="ctx-label">{Math.round(contextPct)}%</span>
            </div>
          </div>
        </>
      )}

      <div className="tb-divider" />

      <button
        className={`tb-log-btn${logOpen ? ' active' : ''}`}
        onClick={onToggleLog}
        title="Painel de log kiro-cli"
      >
        Log
      </button>

      <div className="tb-spacer" />

      <div className="tb-winbtns">
        <button className="tb-win-btn" onClick={() => api?.minimize()} title="Minimizar">─</button>
        <button className="tb-win-btn" onClick={() => api?.maximize()} title="Maximizar">□</button>
        <button className="tb-win-btn tb-win-close" onClick={() => api?.close()} title="Fechar">✕</button>
      </div>
    </div>
  )
}
