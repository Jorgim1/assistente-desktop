import React from 'react'
import ChatArea from './ChatArea'
import type { StoredSession } from '../electron'

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

export default function ReadinessPanel({
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
  const featureBar = (
    <div className="feature-bar">
      <div className="feature-bar-top">
        <span className="fb-title">✅ VALIDADOR DoR</span>
      </div>
      <div className="fb-hint">
        💡 Cole a história de usuário e envie — o assistente vai guiá-lo
      </div>
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
      featureBar={featureBar}
      activeFeature="readiness"
    />
  )
}
