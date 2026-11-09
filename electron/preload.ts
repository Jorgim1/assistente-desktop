import { contextBridge, ipcRenderer } from 'electron'

type UnsubFn = () => void

function listen(channel: string, cb: (...args: any[]) => void): UnsubFn {
  const handler = (_: Electron.IpcRendererEvent, ...args: any[]) => cb(...args)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Controles de janela ─────────────────────────────────
  minimize:      () => ipcRenderer.send('win:minimize'),
  maximize:      () => ipcRenderer.send('win:maximize'),
  close:         () => ipcRenderer.send('win:close'),
  openNewWindow: () => ipcRenderer.invoke('win:new-window'),

  // ── Headless client: comandos ────────────────────────────
  connectAcp:  (cwd: string) => ipcRenderer.send('acp:connect', cwd),
  sendPrompt:  (text: string) => ipcRenderer.send('acp:prompt', text),
  cancelAcp:          () => ipcRenderer.send('acp:cancel'),
  resetKiroSession:   () => ipcRenderer.send('acp:reset-session'),
  acpRestoreSession:  (kiroSessionId: string | null) => ipcRenderer.send('acp:restore-session', kiroSessionId),
  getCwd:      () => ipcRenderer.invoke('acp:get-cwd'),
  setCwd:      (cwd: string) => ipcRenderer.send('acp:set-cwd', cwd),
  pickFolder:  () => ipcRenderer.invoke('dialog:pick-folder'),
  onCwdChange: (cb: (cwd: string) => void): UnsubFn =>
    listen('acp:cwd', cb),

  // ── Headless client: eventos ─────────────────────────────
  onAcpStatus: (cb: (status: string) => void): UnsubFn =>
    listen('acp:status', cb),
  onAcpUpdate: (cb: (update: unknown) => void): UnsubFn =>
    listen('acp:update', cb),
  onAcpError:  (cb: (msg: string) => void): UnsubFn =>
    listen('acp:error', cb),
  onAcpUsage:    (cb: (usage: { inputTokens: number; outputTokens: number }) => void): UnsubFn =>
    listen('acp:usage', cb),
  onAcpCredits:  (cb: (text: string) => void): UnsubFn =>
    listen('acp:credits', cb),
  onContextUsage: (cb: (pct: number) => void): UnsubFn =>
    listen('acp:context', cb),
  onAcpWhoami:    (cb: (info: { email: string }) => void): UnsubFn =>
    listen('acp:whoami', cb),
  onAcpSessionId: (cb: (kiroSessionId: string) => void): UnsubFn =>
    listen('acp:session-id', cb),
  refreshUsage:  () => ipcRenderer.invoke('acp:refresh-usage'),

  // ── History ──────────────────────────────────────────────
  historyList:          () => ipcRenderer.invoke('history:list'),
  historyGet:           (id: string) => ipcRenderer.invoke('history:get', id),
  historyCreate:        (firstText: string, feature?: string) => ipcRenderer.invoke('history:create', firstText, feature),
  historyAppend:        (sessionId: string, msg: unknown) => ipcRenderer.invoke('history:append', sessionId, msg),
  historySetKiroSession:(sessionId: string, kiroSessionId: string) => ipcRenderer.invoke('history:set-kiro-session', sessionId, kiroSessionId),
  historyDelete:        (id: string) => ipcRenderer.invoke('history:delete', id),

  // ── Models ───────────────────────────────────────────────
  listModels: () => ipcRenderer.invoke('models:list'),
  getModel:   () => ipcRenderer.invoke('models:get'),
  setModel:   (modelId: string) => ipcRenderer.invoke('models:set', modelId),

  // ── Config ───────────────────────────────────────────────
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (cfg: { kiroApiKey?: string }) => ipcRenderer.invoke('config:set', cfg),

  // ── Filesystem ───────────────────────────────────────────
  listFiles:   (dir: string) => ipcRenderer.invoke('fs:list-files', dir),
  readFile:    (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  searchFiles: (dir: string, query: string) => ipcRenderer.invoke('fs:search-files', dir, query) as Promise<{ name: string; path: string }[]>,
  pickFiles:   () => ipcRenderer.invoke('dialog:pick-files') as Promise<string[]>,

  // ── MCP ──────────────────────────────────────────────────
  getMcpConfig: () => ipcRenderer.invoke('mcp:get'),
  setMcpConfig: (cfg: unknown) => ipcRenderer.invoke('mcp:set', cfg),

  // ── Log ──────────────────────────────────────────────────
  onLog: (cb: (entry: { level: string; message: string }) => void): UnsubFn =>
    listen('app:log', cb),

  // ── Auto-update ──────────────────────────────────────────
  onUpdateAvailable:   (cb: (info: unknown) => void): UnsubFn => listen('app:update-available',   cb),
  onUpdateDownloaded:  (cb: (info: unknown) => void): UnsubFn => listen('app:update-downloaded',  cb),
  onDownloadProgress:  (cb: (data: { percent: number }) => void): UnsubFn => listen('app:download-progress', cb),
  onUpdateError:       (cb: (msg: string) => void): UnsubFn => listen('app:update-error', cb),
  installUpdate:    () => ipcRenderer.send('app:install-update'),
  getAppVersion:    () => ipcRenderer.invoke('app:version') as Promise<string>,
  checkForUpdates:  () => ipcRenderer.invoke('app:check-for-updates') as Promise<{ version?: string | null; currentVersion?: string; error?: boolean; devMode?: boolean }>,

  // ── Readiness ────────────────────────────────────────────
  readiness: {
    activate:   (model: 'padrao' | 'gfo') => ipcRenderer.invoke('readiness:activate', model),
    deactivate: ()                         => ipcRenderer.invoke('readiness:deactivate'),
    exportMd:   (content: string)          => ipcRenderer.invoke('readiness:export-md', content),
  },

  // ── Extrator ─────────────────────────────────────────────
  extrator: {
    activate:    (model: 'padrao' | 'gfo-tj' | 'simade') => ipcRenderer.invoke('extrator:activate', model),
    deactivate:  ()                    => ipcRenderer.invoke('extrator:deactivate'),
    pickExcel:   ()                    => ipcRenderer.invoke('extrator:pick-excel'),
    listSheets:  (filePath: string)    => ipcRenderer.invoke('extrator:list-sheets', filePath) as Promise<{name: string, rows: number}[]>,
    readExcel:   (filePath: string, selectedSheets?: string[]) => ipcRenderer.invoke('extrator:read-excel', filePath, selectedSheets),
    exportMd:    (content: string)     => ipcRenderer.invoke('extrator:export-md',   content),
    exportXlsx:  (content: string)     => ipcRenderer.invoke('extrator:export-xlsx', content),
  },

  // ── Derivação ─────────────────────────────────────────────
  derivation: {
    activate:   (phase: 'lacunas' | 'anexo' | 'html') => ipcRenderer.invoke('derivation:activate', phase),
    deactivate: ()                => ipcRenderer.invoke('derivation:deactivate'),
    exportMd:   (content: string) => ipcRenderer.invoke('derivation:export-md',   content),
    exportHtml: (content: string) => ipcRenderer.invoke('derivation:export-html', content),
  },
})
