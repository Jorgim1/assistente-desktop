import React, { useEffect, useRef, useState } from 'react'
import ChatArea, { type ChatAreaRef } from './ChatArea'
import ExtractorBar, { type ExtractorModel } from './ExtractorBar'
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
  onToast?: (msg: string, ok?: boolean) => void
}

export default function ExtractorPanel({
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
  onToast,
}: Props) {
  const chatRef = useRef<ChatAreaRef>(null)

  const [model, setModel]               = useState<ExtractorModel>('padrao')
  const [excelFile, setExcelFile]       = useState<string | null>(null)
  const [excelContent, setExcelContent] = useState<string | null>(null)
  const [availableSheets, setAvailableSheets] = useState<{ name: string; rows: number }[]>([])
  const [selectedSheets, setSelectedSheets]   = useState<string[]>([])
  const [lastAiText, setLastAiText]     = useState('')

  // Desativa ao desmontar (quando o usuário troca de feature ou seleciona sessão)
  useEffect(() => {
    return () => { window.electronAPI?.extrator?.deactivate() }
  }, [])

  const handleModelChange = async (m: ExtractorModel) => {
    setModel(m)
    await window.electronAPI?.extrator?.activate(m)
  }

  const handlePickExcel = async () => {
    const file = await window.electronAPI?.extrator?.pickExcel()
    if (!file) return
    setExcelFile(file)
    setExcelContent(null)

    const sheets = await window.electronAPI?.extrator?.listSheets(file) ?? []
    setAvailableSheets(sheets)
    const allNames = sheets.map((s) => s.name)
    setSelectedSheets(allNames)

    const content = await window.electronAPI?.extrator?.readExcel(file, allNames)
    setExcelContent(content ?? null)
  }

  const handleSheetSelectionChange = async (sheetNames: string[]) => {
    setSelectedSheets(sheetNames)
    if (!excelFile || sheetNames.length === 0) {
      setExcelContent(null)
      return
    }
    const content = await window.electronAPI?.extrator?.readExcel(excelFile, sheetNames)
    setExcelContent(content ?? null)
  }

  const handleExportMd = async () => {
    if (!lastAiText) return
    const ok = await window.electronAPI?.extrator?.exportMd(lastAiText)
    if (ok) onToast?.('Histórias exportadas como Markdown')
    else if (ok === false) onToast?.('Exportação cancelada', false)
  }

  const handleExportXlsx = async () => {
    if (!lastAiText) return
    const ok = await window.electronAPI?.extrator?.exportXlsx(lastAiText)
    if (ok) onToast?.('Planilha Excel gerada com sucesso')
    else if (ok === false) onToast?.('Exportação cancelada', false)
  }

  const featureBar = (
    <ExtractorBar
      model={model}
      onModelChange={handleModelChange}
      excelFile={excelFile}
      excelContent={excelContent}
      availableSheets={availableSheets}
      selectedSheets={selectedSheets}
      hasOutput={!!lastAiText}
      onPickExcel={handlePickExcel}
      onSheetSelectionChange={handleSheetSelectionChange}
      onSendPrompt={(t) => chatRef.current?.send(t)}
      onExportMd={handleExportMd}
      onExportXlsx={handleExportXlsx}
      disabled={acpStatus !== 'ready'}
    />
  )

  return (
    <ChatArea
      ref={chatRef}
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
      onLastAiText={setLastAiText}
      featureBar={featureBar}
      activeFeature="extractor"
    />
  )
}
