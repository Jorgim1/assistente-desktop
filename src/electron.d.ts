export type UnsubFn = () => void

export interface FileEntry { name: string; isDirectory: boolean; path: string }

export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

export interface StoredSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  feature?: string
  kiroSessionId?: string
  messages: StoredMessage[]
}

export interface KiroModel {
  model_id:              string
  model_name:            string
  description:           string
  rate_multiplier:       number
  rate_unit:             string
  context_window_tokens: number
}

export interface AgentUpdate {
  type: 'AgentMessageChunk' | 'ToolCallStart' | 'ToolCallEnd' | 'TurnEnd'
  content?: string
  toolName?: string
  toolId?: string
  args?: unknown
  status?: 'success' | 'error'
  output?: string
  model?: string
  credits?: number
}

export interface TokenUsage {
  inputTokens:  number
  outputTokens: number
  credits?:     number
}

export interface LogEntry {
  level: 'info' | 'error' | 'raw'
  message: string
}

export interface ElectronAPI {
  // Janela
  minimize:      () => void
  maximize:      () => void
  close:         () => void
  openNewWindow: () => void

  // Headless client — comandos
  connectAcp:  (cwd: string) => void
  sendPrompt:  (text: string) => void
  cancelAcp:          () => void
  resetKiroSession:   () => void
  acpRestoreSession:  (kiroSessionId: string | null) => void
  getCwd:      () => Promise<string>
  setCwd:      (cwd: string) => void
  pickFolder:  () => Promise<string | null>
  onCwdChange: (cb: (cwd: string) => void) => UnsubFn

  // Headless client — eventos
  onAcpStatus: (cb: (status: string) => void) => UnsubFn
  onAcpUpdate: (cb: (update: AgentUpdate) => void) => UnsubFn
  onAcpError:  (cb: (msg: string) => void) => UnsubFn
  onAcpUsage:    (cb: (usage: TokenUsage) => void) => UnsubFn
  onAcpCredits:   (cb: (text: string) => void) => UnsubFn
  onAcpWhoami:    (cb: (info: { email: string }) => void) => UnsubFn
  onContextUsage: (cb: (pct: number) => void) => UnsubFn
  onAcpSessionId: (cb: (kiroSessionId: string) => void) => UnsubFn
  refreshUsage:  () => Promise<string>

  // History
  historyList:           () => Promise<StoredSession[]>
  historyGet:            (id: string) => Promise<StoredSession | null>
  historyCreate:         (firstText: string, feature?: string) => Promise<StoredSession>
  historyAppend:         (sessionId: string, msg: StoredMessage) => Promise<boolean>
  historySetKiroSession: (sessionId: string, kiroSessionId: string) => Promise<boolean>
  historyDelete:         (id: string) => Promise<void>

  // Models
  listModels: () => Promise<KiroModel[]>
  getModel:   () => Promise<string>
  setModel:   (modelId: string) => Promise<void>

  // Config
  getConfig:  () => Promise<{ kiroApiKey?: string; proxyUrl?: string }>
  setConfig:  (cfg: { kiroApiKey?: string; proxyUrl?: string }) => Promise<void>

  // Filesystem
  listFiles:   (dir: string) => Promise<FileEntry[]>
  readFile:    (path: string) => Promise<string | null>
  searchFiles: (dir: string, query: string) => Promise<{ name: string; path: string }[]>
  pickFiles:   () => Promise<string[]>

  // MCP
  getMcpConfig: () => Promise<{ mcpServers: Record<string, { command: string; args?: string[]; env?: Record<string,string> }> }>
  setMcpConfig: (cfg: { mcpServers: Record<string, { command: string; args?: string[]; env?: Record<string,string> }> }) => Promise<void>

  // Log
  onLog:      (cb: (entry: LogEntry) => void) => UnsubFn

  // Auto-update
  onUpdateAvailable:   (cb: (info: unknown) => void) => UnsubFn
  onUpdateDownloaded:  (cb: (info: unknown) => void) => UnsubFn
  onDownloadProgress:  (cb: (data: { percent: number }) => void) => UnsubFn
  onUpdateError:       (cb: (msg: string) => void) => UnsubFn
  installUpdate:    () => void
  getAppVersion:    () => Promise<string>
  checkForUpdates:  () => Promise<{ version?: string | null; currentVersion?: string; error?: boolean; devMode?: boolean }>

  // Readiness
  readiness: {
    activate:   (model: 'padrao' | 'gfo') => Promise<void>
    deactivate: () => Promise<void>
    exportMd:   (content: string) => Promise<boolean>
  }

  // Extrator
  extrator: {
    activate:    (model: 'padrao' | 'gfo-tj' | 'simade') => Promise<void>
    deactivate:  () => Promise<void>
    pickExcel:   () => Promise<string | null>
    listSheets:  (filePath: string) => Promise<{name: string, rows: number}[]>
    readExcel:   (filePath: string, selectedSheets?: string[]) => Promise<string | null>
    exportMd:    (content: string) => Promise<boolean>
    exportXlsx:  (content: string) => Promise<boolean>
  }

  // Derivação
  derivation: {
    activate:   (phase: 'lacunas' | 'anexo' | 'html') => Promise<void>
    deactivate: () => Promise<void>
    exportMd:   (content: string) => Promise<boolean>
    exportHtml: (content: string) => Promise<boolean>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
