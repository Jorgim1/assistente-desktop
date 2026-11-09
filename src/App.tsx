import React, { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import SettingsModal from './components/SettingsModal'
import TitleBar from './components/TitleBar'
import ReadinessPanel from './components/ReadinessPanel'
import DerivationPanel from './components/DerivationPanel'
import ExtractorPanel from './components/ExtractorPanel'
import type { StoredSession } from './electron'

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessions, setSessions]                   = useState<StoredSession[]>([])
  const [acpStatus, setAcpStatus]                 = useState('disconnected')
  const [credits, setCredits]                     = useState<string | null>(null)
  const [creditsLoading, setCreditsLoading]       = useState(false)
  const [userEmail, setUserEmail]                 = useState<string | null>(null)
  const [planName, setPlanName]                   = useState<string | null>(null)
  const [cwd, setCwd]                             = useState('')
  const [contextPct, setContextPct]               = useState<number | null>(null)
  const [currentModel, setCurrentModel]           = useState('auto')
  const [settingsOpen, setSettingsOpen]           = useState(false)
  const [logOpen, setLogOpen]                     = useState(false)
  const [newSessionKey, setNewSessionKey]         = useState(0)
  const [sidebarWidth, setSidebarWidth]           = useState(230)
  const [isProcessing, setIsProcessing]           = useState(false)
  const [updateReady, setUpdateReady]             = useState(false)
  const [updateDownloading, setUpdateDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent]     = useState(0)
  const [updateError, setUpdateError]             = useState<string | null>(null)
  const [toast, setToast]                         = useState<{msg: string, ok: boolean} | null>(null)
  const toastTimer                                = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Readiness
  const [readinessActive, setReadinessActive]     = useState(false)

  // Derivação
  const [derivationActive, setDerivationActive]   = useState(false)

  // Extrator
  const [extractorActive, setExtractorActive]     = useState(false)

  const showToast = (msg: string, ok = true) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    window.electronAPI?.historyList().then((list) => setSessions(list)).catch(() => {})
    window.electronAPI?.getModel().then((m) => { if (m) setCurrentModel(m) }).catch(() => {})
    window.electronAPI?.getCwd().then((d) => { if (d) setCwd(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    return window.electronAPI?.onCwdChange((d) => setCwd(d))
  }, [])

  // Ao clicar numa sessão existente: deativa feature atual e restaura a da sessão.
  // Troca bloqueada pelo Sidebar enquanto isProcessing=true.
  const handleSelectSession = async (id: string) => {
    const session = sessions.find((s) => s.id === id)
    const feat = session?.feature ?? null

    await deactivateAllFeatures()

    if (feat === 'extractor')       await window.electronAPI?.extrator?.activate('padrao')
    else if (feat === 'readiness')  await window.electronAPI?.readiness?.activate('padrao')
    else if (feat === 'derivation') await window.electronAPI?.derivation?.activate('lacunas')
    else window.electronAPI?.resetKiroSession()

    // Restaura o kiro session ID para manter o contexto da conversa.
    // Busca do state (sessão carregada do disco) ou do disco (se ainda não sincronizado).
    const kiroId = session?.kiroSessionId
      ?? (await window.electronAPI?.historyGet(id))?.kiroSessionId
    if (kiroId) window.electronAPI?.acpRestoreSession(kiroId)

    setExtractorActive(feat === 'extractor')
    setReadinessActive(feat === 'readiness')
    setDerivationActive(feat === 'derivation')
    setSelectedSessionId(id)
  }

  // Atalhos de teclado globais
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = ['TEXTAREA', 'INPUT'].includes((document.activeElement as HTMLElement)?.tagName ?? '')
      if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); window.electronAPI?.openNewWindow() }
      if (e.ctrlKey && !e.shiftKey && e.key === 'n') { e.preventDefault(); setSelectedSessionId(null); window.electronAPI?.resetKiroSession() }
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setLogOpen((v) => !v) }
      if (e.ctrlKey && e.key === ',') { e.preventDefault(); setSettingsOpen(true) }
      if (e.key === 'Escape' && !inInput) window.electronAPI?.cancelAcp()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const u1 = api.onAcpStatus(setAcpStatus)
    const u2 = api.onAcpCredits((text) => {
      setCredits(text)
      const firstLine = text.split('\n')[0] ?? ''
      const parts = firstLine.split('|')
      const plan = parts[parts.length - 1]?.trim()
      if (plan) setPlanName(plan)
    })
    const u3 = api.onAcpWhoami(({ email }) => setUserEmail(email))
    const u4 = api.onContextUsage((pct) => setContextPct(pct))
    const u5 = api.onUpdateAvailable(() => { setUpdateDownloading(true); setDownloadPercent(0); setUpdateError(null) })
    const u6 = api.onUpdateDownloaded(() => { setUpdateDownloading(false); setDownloadPercent(0); setUpdateReady(true) })
    const u7 = api.onDownloadProgress(({ percent }) => setDownloadPercent(percent))
    const u8 = api.onUpdateError((msg) => { setUpdateDownloading(false); setUpdateError(msg) })
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8() }
  }, [])

  const handlePickFolder = async () => {
    const folder = await window.electronAPI?.pickFolder()
    if (folder) {
      setCwd(folder)
      window.electronAPI?.setCwd(folder)
    }
  }

  const handleModelChange = async (modelId: string) => {
    setCurrentModel(modelId)
    await window.electronAPI?.setModel(modelId)
  }

  const handleRefreshCredits = async () => {
    const api = window.electronAPI
    if (!api || creditsLoading) return
    setCreditsLoading(true)
    await api.refreshUsage()
    setCreditsLoading(false)
  }

  const deactivateAllFeatures = async () => {
    if (extractorActive) { setExtractorActive(false); await window.electronAPI?.extrator?.deactivate() }
    if (readinessActive) { setReadinessActive(false); await window.electronAPI?.readiness?.deactivate() }
    if (derivationActive) { setDerivationActive(false); await window.electronAPI?.derivation?.deactivate() }
  }

  const handleReadinessToggle = async () => {
    const next = !readinessActive
    if (next) {
      await deactivateAllFeatures()
      setReadinessActive(true)
      setSelectedSessionId(null)
      await window.electronAPI?.readiness?.activate('padrao')
    } else {
      setReadinessActive(false)
      await window.electronAPI?.readiness?.deactivate()
    }
  }

  const handleExtractorToggle = async () => {
    const next = !extractorActive
    if (next) {
      await deactivateAllFeatures()
      setExtractorActive(true)
      setSelectedSessionId(null)
      await window.electronAPI?.extrator?.activate('padrao')
    } else {
      setExtractorActive(false)
      await window.electronAPI?.extrator?.deactivate()
    }
  }

  const handleDerivationToggle = async () => {
    const next = !derivationActive
    if (next) {
      await deactivateAllFeatures()
      setDerivationActive(true)
      setSelectedSessionId(null)
      window.electronAPI?.resetKiroSession()
    } else {
      setDerivationActive(false)
      await window.electronAPI?.derivation?.deactivate()
    }
  }

  const handleSessionCreated = (session: StoredSession) => {
    setSessions((prev) => [session, ...prev])
  }

  const handleSessionUpdated = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => s.id === sessionId ? { ...s, updatedAt: Date.now() } : s)
          .sort((a, b) => b.updatedAt - a.updatedAt)
    )
  }

  const handleNewSession = () => {
    setSelectedSessionId(null)
    setNewSessionKey((k) => k + 1)
    window.electronAPI?.resetKiroSession()
  }

  const handleDeleteSession = async (id: string) => {
    await window.electronAPI?.historyDelete(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (selectedSessionId === id) setSelectedSessionId(null)
  }

  return (
    <div className="app">
      <TitleBar
        cwd={cwd} onPickFolder={handlePickFolder}
        acpStatus={acpStatus} isProcessing={isProcessing}
        contextPct={contextPct}
        currentModel={currentModel} onModelChange={handleModelChange}
        logOpen={logOpen} onToggleLog={() => setLogOpen((v) => !v)}
      />
      {updateDownloading && !updateReady && (
        <div className="update-banner downloading">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>⬇ Baixando atualização… {downloadPercent > 0 ? `${downloadPercent}%` : ''}</span>
            <button className="update-dismiss" onClick={() => setUpdateDownloading(false)} title="Dispensar">✕</button>
          </div>
          <div className="update-progress-bar">
            <div className="update-progress-fill" style={{ width: `${Math.max(downloadPercent, downloadPercent === 0 ? 3 : 0)}%`, opacity: downloadPercent === 0 ? 0.4 : 1 }} />
          </div>
        </div>
      )}
      {updateError && (
        <div className="update-banner update-error">
          <span>⚠ Falha no download da atualização: {updateError}</span>
          <button className="update-dismiss" onClick={() => setUpdateError(null)}>✕</button>
        </div>
      )}
      {updateReady && (
        <div className="update-banner">
          <span>Nova versão do Assistente IA pronta para instalar.</span>
          <button onClick={() => window.electronAPI?.installUpdate()}>Reiniciar e instalar</button>
          <button className="update-dismiss" onClick={() => setUpdateReady(false)}>✕</button>
        </div>
      )}
      <div className="app-body">
        <Sidebar
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
          sessions={sessions}
          activeSessionId={selectedSessionId}
          onSelect={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          userEmail={userEmail}
          planName={planName}
          onOpenSettings={() => setSettingsOpen(true)}
          extractorActive={extractorActive}
          onExtractor={handleExtractorToggle}
          readinessActive={readinessActive}
          onReadiness={handleReadinessToggle}
          derivationActive={derivationActive}
          onDerivation={handleDerivationToggle}
          isProcessing={isProcessing}
        />
        {readinessActive
          ? <ReadinessPanel
              selectedSessionId={selectedSessionId}
              acpStatus={acpStatus}
              logOpen={logOpen}
              onToggleLog={() => setLogOpen((v) => !v)}
              credits={credits}
              creditsLoading={creditsLoading}
              onRefreshCredits={handleRefreshCredits}
              currentModel={currentModel}
              onProcessingChange={setIsProcessing}
              onSessionCreated={handleSessionCreated}
              onSessionUpdated={handleSessionUpdated}
            />
          : derivationActive
          ? <DerivationPanel
              selectedSessionId={selectedSessionId}
              acpStatus={acpStatus}
              logOpen={logOpen}
              onToggleLog={() => setLogOpen((v) => !v)}
              credits={credits}
              creditsLoading={creditsLoading}
              onRefreshCredits={handleRefreshCredits}
              currentModel={currentModel}
              onProcessingChange={setIsProcessing}
              onSessionCreated={handleSessionCreated}
              onSessionUpdated={handleSessionUpdated}
            />
          : extractorActive
          ? <ExtractorPanel
              selectedSessionId={selectedSessionId}
              acpStatus={acpStatus}
              logOpen={logOpen}
              onToggleLog={() => setLogOpen((v) => !v)}
              credits={credits}
              creditsLoading={creditsLoading}
              onRefreshCredits={handleRefreshCredits}
              currentModel={currentModel}
              onProcessingChange={setIsProcessing}
              onSessionCreated={handleSessionCreated}
              onSessionUpdated={handleSessionUpdated}
              onToast={showToast}
            />
          : <ChatArea
              key={selectedSessionId ?? `new-${newSessionKey}`}
              selectedSessionId={selectedSessionId}
              acpStatus={acpStatus}
              logOpen={logOpen}
              onToggleLog={() => setLogOpen((v) => !v)}
              currentModel={currentModel}
              credits={credits}
              creditsLoading={creditsLoading}
              onRefreshCredits={handleRefreshCredits}
              onProcessingChange={setIsProcessing}
              onSessionCreated={handleSessionCreated}
              onSessionUpdated={handleSessionUpdated}
            />}
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {toast && (
        <div className={`app-toast${toast.ok ? '' : ' app-toast-error'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
