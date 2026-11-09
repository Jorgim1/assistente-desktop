import React, { useEffect, useRef, useState } from 'react'
import ChatArea from './ChatArea'
import type { StoredSession } from '../electron'

type Step = 'lacunas' | 'anexo' | 'html'

interface Props {
  selectedSessionId: string | null
  acpStatus: string
  logOpen?: boolean
  onToggleLog?: () => void
  credits?: string | null
  creditsLoading?: boolean
  onRefreshCredits?: () => void
  currentModel?: string
  onProcessingChange?: (v: boolean) => void
  onSessionCreated: (session: StoredSession) => void
  onSessionUpdated: (sessionId: string) => void
}

export default function DerivationPanel({
  selectedSessionId,
  acpStatus,
  logOpen,
  onToggleLog,
  credits,
  creditsLoading,
  onRefreshCredits,
  currentModel,
  onProcessingChange,
  onSessionCreated,
  onSessionUpdated,
}: Props) {
  const [step, setStep] = useState<Step>('lacunas')
  const stepRef = useRef<Step>('lacunas')
  stepRef.current = step

  const [lastAiText, setLastAiText] = useState('')
  const [htmlResult, setHtmlResult] = useState('')

  // Ativa skill de lacunas ao montar; limpa ao desmontar
  useEffect(() => {
    window.electronAPI?.derivation?.activate('lacunas')
    return () => { window.electronAPI?.derivation?.deactivate() }
  }, [])

  const handleAdvanceToPhase2 = async () => {
    await window.electronAPI?.derivation?.activate('anexo')
    setStep('anexo')
    setLastAiText('')
  }

  const handleExportHtmlViaIA = async () => {
    const atText = lastAiText
    await window.electronAPI?.derivation?.activate('html')
    setStep('html')
    setLastAiText('')
    window.electronAPI?.sendPrompt(
      `Converta o Anexo Técnico abaixo para HTML usando o template Prodemge fornecido nos steering files. Retorne APENAS o HTML completo, sem explicações adicionais.\n\nANEXO TÉCNICO:\n\n${atText}`,
    )
  }

  const handleExportMd = async (content: string) => {
    await window.electronAPI?.derivation?.exportMd(content)
  }

  const handleSaveHtml = async () => {
    await window.electronAPI?.derivation?.exportHtml(htmlResult)
  }

  const handleReset = async () => {
    await window.electronAPI?.derivation?.activate('lacunas')
    setStep('lacunas')
    setLastAiText('')
    setHtmlResult('')
  }

  const handleOnLastAiText = (text: string) => {
    setLastAiText(text)
    if (stepRef.current === 'html') setHtmlResult(text)
  }

  // Enriquece o prompt de acordo com a fase atual — invisível ao usuário
  const featurePromptTransform = (text: string): string => {
    if (step === 'lacunas') {
      return `Analise a seguinte história de usuário e levante as lacunas técnicas que precisam ser respondidas antes de derivar o Anexo Técnico:\n\n${text}`
    }
    if (step === 'anexo') {
      return `Com base nas lacunas respondidas abaixo, derive o Anexo Técnico completo para a história de usuário.\n\nPERGUNTAS RESPONDIDAS:\n\n${text}`
    }
    return text
  }

  const phaseState = (s: Step): 'active' | 'done' | '' => {
    if (s === step) return 'active'
    if (s === 'lacunas' && (step === 'anexo' || step === 'html')) return 'done'
    if (s === 'anexo'   && step === 'html') return 'done'
    return ''
  }

  const featureBar = (
    <div className="feature-bar">
      <div className="feature-bar-top">
        <span className="fb-title">📐 GERADOR DE AT</span>
        <div className="fb-phases">
          <span className={`fb-phase ${phaseState('lacunas')}`}>1. Lacunas</span>
          <span className="fb-phase-sep">→</span>
          <span className={`fb-phase ${phaseState('anexo')}`}>2. Derivar AT</span>
          <span className="fb-phase-sep">→</span>
          <span className={`fb-phase ${phaseState('html')}`}>3. HTML</span>
        </div>
        <button className="fb-reset-btn" onClick={handleReset} title="Reiniciar derivação">↺</button>
      </div>

      {step === 'lacunas' && !lastAiText && (
        <div className="fb-hint">
          💡 Cole a história de usuário abaixo e envie — o assistente levantará as lacunas técnicas
        </div>
      )}
      {step === 'lacunas' && lastAiText && (
        <div className="feature-bar-actions">
          <button className="fb-action-btn" onClick={() => handleExportMd(lastAiText)}>📥 Salvar lacunas .md</button>
          <button className="fb-action-btn fb-advance-btn" onClick={handleAdvanceToPhase2}>Avançar para Fase 2 →</button>
        </div>
      )}

      {step === 'anexo' && !lastAiText && (
        <div className="fb-hint">
          💡 Responda as lacunas acima e envie — o assistente derivará o Anexo Técnico
        </div>
      )}
      {step === 'anexo' && lastAiText && (
        <div className="feature-bar-actions">
          <button className="fb-action-btn" onClick={() => handleExportMd(lastAiText)}>📥 Exportar .md</button>
          <button className="fb-action-btn" onClick={handleExportHtmlViaIA}>🌐 Exportar HTML via IA</button>
        </div>
      )}

      {step === 'html' && !htmlResult && (
        <div className="fb-hint">
          <span className="spin-icon">⟳</span> Gerando HTML…
        </div>
      )}
      {step === 'html' && htmlResult && (
        <div className="feature-bar-actions">
          <button className="fb-action-btn fb-advance-btn" onClick={handleSaveHtml}>💾 Salvar .html</button>
        </div>
      )}
    </div>
  )

  return (
    <ChatArea
      selectedSessionId={selectedSessionId}
      acpStatus={acpStatus}
      logOpen={logOpen}
      onToggleLog={onToggleLog}
      credits={credits}
      creditsLoading={creditsLoading}
      onRefreshCredits={onRefreshCredits}
      currentModel={currentModel}
      onProcessingChange={onProcessingChange}
      onSessionCreated={onSessionCreated}
      onSessionUpdated={onSessionUpdated}
      onLastAiText={handleOnLastAiText}
      featureBar={featureBar}
      featurePromptTransform={featurePromptTransform}
      activeFeature="derivation"
    />
  )
}
