import React, { useEffect, useMemo, useRef } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { marked } from 'marked'
import Split from 'react-split'
import { useStore, LANGS, DEMO, cx } from './store'

// Vite proxy to local Ollama server
const OLLAMA_BASE = '/ollama'

// Main Application Component
export default function App(){
  const store = useStore()

  // --- REFS ---
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)
  const outRef = useRef(null)
  const customPromptRef = useRef(null)
  const diffEditorRef = useRef(null)

  // --- MARKDOWN RENDERER ---
  const renderer = useMemo(() => {
    const r = new marked.Renderer();
    r.code = (code, language) => {
      const validLang = window.hljs?.getLanguage(language) ? language : 'plaintext';
      const highlightedCode = window.hljs?.highlight(code, { language: validLang, ignoreIllegals: true }).value;
      
      return `
        <div class="code-container">
          <div class="code-actions">
            <span class="text-xs text-neutral-400 pr-2">${validLang}</span>
            <button class="code-btn" data-lang="${validLang}" data-tooltip="Apply this code to the editor" data-action="apply">Apply</button>
            <button class="code-btn" data-tooltip="Copy code to clipboard" data-action="copy">Copy</button>
          </div>
          <pre><code class="hljs language-${validLang}">${highlightedCode}</code></pre>
        </div>
      `;
    };
    return r;
  }, []);

  useEffect(() => {
    if (outRef.current) {
        outRef.current.innerHTML = marked.parse(store.rawOut, { renderer });
    }
  }, [store.rawOut, renderer]);

  // --- EFFECTS ---

  useEffect(() => {
    const outputElement = outRef.current;
    if (!outputElement) return;

    const handleClick = (e) => {
      const target = e.target;
      if (target.classList.contains('code-btn')) {
        const action = target.dataset.action;
        const code = target.closest('.code-container').querySelector('code').innerText;

        if (action === 'copy') {
          navigator.clipboard.writeText(code);
          target.innerText = 'Copied!';
          setTimeout(() => { target.innerText = 'Copy' }, 2000);
        } else if (action === 'apply') {
          const language = target.dataset.lang;
          if (language && LANGS.some(l => l.id === language)) {
            store.setLang(language);
          }
          store.updateEditorValue(code, true);
          target.innerText = 'Applied!';
          store.setActiveTab('diff');
          setTimeout(() => { target.innerText = 'Apply' }, 2000);
        }
      }
    };

    outputElement.addEventListener('click', handleClick);
    return () => outputElement.removeEventListener('click', handleClick);
  }, [store.out]);

  useEffect(() => { store.checkHealth(); store.loadModels(); }, [])
  useEffect(() => { if(store.streaming && outRef.current){ outRef.current.scrollTop = outRef.current.scrollHeight } }, [store.out, store.streaming])
  
  useEffect(() => {
    const overlay = document.getElementById('dropOverlay')
    const onEnterOver = (e) => { e.preventDefault(); overlay.style.display = 'flex' }
    const onLeaveDrop = (e) => {
      e.preventDefault()
      if(e.type === 'drop'){
        const f = e.dataTransfer?.files?.[0]
        if(f){
          const r = new FileReader()
          r.onload = () => store.updateEditorValue(String(r.result), true)
          r.readAsText(f)
        }
      }
      overlay.style.display = 'none'
    }
    document.addEventListener('dragenter', onEnterOver)
    document.addEventListener('dragover', onEnterOver)
    document.addEventListener('dragleave', onLeaveDrop)
    document.addEventListener('drop', onLeaveDrop)
    return () => {
      document.removeEventListener('dragenter', onEnterOver)
      document.removeEventListener('dragover', onEnterOver)
      document.removeEventListener('dragleave', onLeaveDrop)
      document.removeEventListener('drop', onLeaveDrop)
    }
  }, [])

  // --- PROMPT ENGINEERING ---
  function getPrompt(kind, _lang, code, toLang = 'python', custom = ''){
    const bases = {
      explain: `Explain the following ${_lang} code. Break it down step-by-step. Use headings for different parts of the code (e.g., "Function Definition", "Main Logic", "Output"). Explain the purpose of each part and how they work together.`,
      pseudo:  `Rewrite the following ${_lang} code as clear, indented pseudocode. Use comments to clarify complex or non-obvious steps.`,
      eli10:   `Explain this ${_lang} code like I'm 10 years old. Use simple words and analogies.`,
      tests:   `Generate idiomatic unit tests for the following ${_lang} code. Include a brief explanation for each test case, describing what it's testing.`,
      bugs:    `Analyze the following ${_lang} code for potential bugs, edge cases, and performance issues. For each issue found, provide a heading (e.g., "Logic Error", "Performance Issue"), a brief explanation of the problem, and a suggested fix with a code example.`,
      refactor: `Refactor the following ${_lang} code to improve its readability, performance, and maintainability. Provide the full refactored code. After the code, explain the key changes and why they were made under a "Changes" heading.`,
      comments: `Add comments to the following ${_lang} code. First, provide the full, commented code block. After the code block, add a "Comment Explanations" heading and use a list to explain why each significant comment was added.`,
      complexity: `Analyze the time and space complexity (Big O notation) of this code. Explain your reasoning for each.`,
      convert: `Convert the following ${_lang} code to ${toLang}. Provide the converted code in a markdown block. Afterwards, under a "Conversion Notes" heading, explain the key syntactical and logical changes made during the conversion.`,
      custom: custom,
      followup: `The user provided the following code:\n\n\`\`\`${_lang}\n${code}\n\`\`\`\n\nYou provided this response:\n\n---\n${store.rawOut}\n---\n\nNow, answer this follow-up question: ${custom}`
    }
    const base = bases[kind] || 'Explain this code.'
    if (kind !== 'followup') {
        return `${base}\n\n\`\`\`${_lang}\n${code}\n\`\`\``
    }
    return base;
  }
  
  // --- EDITOR MANAGEMENT ---
  function onEditorChange(value) {
    store.setCurrentCode(value);
    const model = editorRef.current?.getModel();
    if (model) {
      store.setEditorStats({ chars: model.getValueLength(), lines: model.getLineCount() });
    }
  }

  // --- ACTION HANDLERS ---
  function doAction(kind, toLang, custom){
    const code = editorRef.current?.getValue() || ''
    const text = kind === 'explain-selection'
      ? editorRef.current?.getModel()?.getValueInRange(editorRef.current?.getSelection()) || ''
      : code
    if(kind === 'explain-selection'){
      if(!text.trim()) { store.setOut('<p class="text-yellow-300">Select some code to explain.</p>'); return }
      store.streamGenerate(getPrompt('explain', store.lang, text))
      return
    }
    store.streamGenerate(getPrompt(kind, store.lang, text, toLang, custom))
  }

  function handleFollowUp(e) {
    e.preventDefault();
    if (!store.followUp.trim() || !store.rawOut.trim()) return;
    const code = editorRef.current?.getValue() || '';
    const prompt = getPrompt('followup', store.lang, code, null, store.followUp);
    store.streamGenerate(prompt, false);
    store.setFollowUp('');
  }

  function formatCode() {
    editorRef.current?.getAction('editor.action.formatDocument').run();
  }

  function findInCode() {
    editorRef.current?.getAction('actions.find').run();
  }

  // --- FILE & APP MANAGEMENT ---
  function onOpenFile(e){
    const file = e.target.files?.[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const newContent = String(reader.result);
      store.updateEditorValue(newContent, true)
      const ext = (file.name.split('.').pop()||'').toLowerCase()
      const map = { js:'javascript', mjs:'javascript', ts:'typescript', py:'python', go:'go', rs:'rust', html:'html', htm:'html', css:'css', sql:'sql', c:'cpp', h:'cpp', cpp:'cpp', hpp:'cpp', cs:'csharp', java:'java', rb:'ruby', php:'php', sh:'shell', bash:'shell', yaml:'yaml', yml:'yaml', json:'json', xml:'xml' }
      store.setLang(map[ext] || 'javascript')
    }
    reader.readAsText(file)
  }

  function saveFile(){
    const code = editorRef.current?.getValue() || ''
    const ext = {javascript:'js', typescript:'ts', python:'py', go:'go', rust:'rs', html:'html', css:'css', sql:'sql', cpp:'cpp', csharp:'cs', java:'java', ruby:'rb', php:'php', shell:'sh', yaml:'yml', json:'json', xml:'xml'}[store.lang] || 'txt'
    const blob = new Blob([code], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `code.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function handleAppReset() {
    localStorage.clear();
    window.location.reload();
  }

  // --- RENDER ---
  return (
    <div className="h-screen flex flex-col bg-bg text-ink">
      <input type="file" ref={fileInputRef} onChange={onOpenFile} className="hidden" />
      <div id="dropOverlay" className="fixed inset-0 hidden items-center justify-center z-50 bg-panel/80 border-2 border-dashed border-line">
        <div className="text-center">
          <div className="text-2xl font-semibold">Drop a file to open</div>
          <div className="text-sm text-muted mt-2">Your code stays on your machine.</div>
        </div>
      </div>
      
      {store.showCustomPrompt && (
        <div className="modal-overlay" onClick={() => store.setShowCustomPrompt(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">Custom Prompt</h2>
                <p className="text-sm text-muted mb-4">Enter your own instructions. The current code will be automatically included.</p>
                <textarea ref={customPromptRef} className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-sm mb-4" rows="4" placeholder="e.g., 'Convert this to an arrow function'"></textarea>
                <div className="flex justify-end gap-2">
                    <button onClick={() => store.setShowCustomPrompt(false)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Cancel</button>
                    <button onClick={() => doAction('custom', null, customPromptRef.current?.value)} className="bg-accent border border-blue-500 rounded-md px-3 py-2 text-sm hover:bg-blue-500">Submit</button>
                </div>
            </div>
        </div>
      )}

      {store.showSettings && (
        <div className="modal-overlay" onClick={() => store.setShowSettings(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">Settings</h2>
                <div className="flex items-center justify-between mb-4">
                    <label htmlFor="fontSize" className="text-sm">Editor Font Size</label>
                    <input id="fontSize" type="number" value={store.fontSize} onChange={e => store.setFontSize(Number(e.target.value))} className="w-20 bg-neutral-900 border border-neutral-700 rounded-md p-2 text-sm" />
                </div>
                <div className="flex items-center justify-between mb-4">
                    <label htmlFor="minimap" className="text-sm">Show Editor Minimap</label>
                    <input id="minimap" type="checkbox" checked={store.minimap} onChange={e => store.setMinimap(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                </div>
                <div className="border-t border-line pt-4 mt-4">
                    <button onClick={() => { store.setShowSettings(false); store.setShowResetConfirm(true); }} className="w-full bg-red-800 border border-red-700 rounded-md px-3 py-2 text-sm hover:bg-red-700">Reset App State</button>
                    <p className="text-xs text-muted mt-2">Clears all settings and history from your browser.</p>
                </div>
            </div>
        </div>
      )}

      {store.showResetConfirm && (
        <div className="modal-overlay" onClick={() => store.setShowResetConfirm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">Are you sure?</h2>
                <p className="text-sm text-muted mb-4">This will permanently delete all application data from your browser. This cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => store.setShowResetConfirm(false)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Cancel</button>
                    <button onClick={handleAppReset} className="bg-red-700 border border-red-600 rounded-md px-3 py-2 text-sm hover:bg-red-600">Confirm Reset</button>
                </div>
            </div>
        </div>
      )}

      <header className="w-full border-b border-line bg-panel z-20 relative">
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold">BasedSyntax</div>
            <div className={cx('text-xs px-2 py-1 rounded-full border', store.statusClass)}>{store.status}</div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="tooltip-wrapper tooltip-bottom" data-tooltip="Settings"><button onClick={() => store.setShowSettings(true)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Settings</button></span>
            <select value={store.model} onChange={e=>store.setModel(e.target.value)} className="flex-1 sm:flex-none bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm">
              <option value="">Select Ollama model</option>
              {store.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="tooltip-wrapper tooltip-bottom" data-tooltip="Refresh model list"><button onClick={()=>{store.checkHealth(); store.loadModels();}} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Refresh</button></span>
          </div>
        </div>
        {store.tip && (<div className="px-4 pb-2 text-xs text-muted">{store.tip}</div>)}
        {store.error && <div className="px-4 pb-2 text-xs text-red-400 bg-red-900/30">{store.error}</div>}
      </header>

      <main className="flex-1 w-full p-4 overflow-hidden">
        <Split className="flex h-full" sizes={[65, 35]} minSize={300} gutterSize={10}>
            <div className="flex flex-col h-full rounded-xl border border-line bg-panel overflow-visible">
                <Split direction="vertical" sizes={[70, 30]} minSize={100} className="h-full flex flex-col">
                    <section className="flex flex-col h-full">
                      <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-900 border-b border-line relative z-10">
                        <select value={store.lang} onChange={e=>store.setLang(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm">
                          {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                        <span className="tooltip-wrapper" data-tooltip="Open a local file"><button onClick={()=>fileInputRef.current?.click()} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Open</button></span>
                        <span className="tooltip-wrapper" data-tooltip="Save the current code"><button onClick={saveFile} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Save</button></span>
                        <span className="tooltip-wrapper" data-tooltip="Search in code (Ctrl+F)"><button onClick={findInCode} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Search</button></span>
                        <span className="tooltip-wrapper" data-tooltip="Format code (Prettier)"><button onClick={formatCode} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Format</button></span>
                        <div className="flex-1" />
                        <div className="text-xs text-muted px-2">{store.editorStats.chars} chars · {store.editorStats.lines} lines</div>
                        <span className="tooltip-wrapper" data-tooltip="Undo last change"><button onClick={store.undo} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50" disabled={store.editorHistory.length === 0}>Undo</button></span>
                        <span className="tooltip-wrapper" data-tooltip="Redo last change"><button onClick={store.redo} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50" disabled={store.editorRedoStack.length === 0}>Redo</button></span>
                        <span className="tooltip-wrapper" data-tooltip="Clear the editor"><button onClick={()=>store.updateEditorValue('', true)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Clear</button></span>
                      </div>
                      <div className="flex-1 relative">
                        <Editor
                          theme="vs-dark"
                          language={store.lang}
                          value={store.currentCode}
                          onChange={onEditorChange}
                          onMount={(editor) => { 
                            editorRef.current = editor;
                            const model = editor.getModel();
                            if (model) {
                                store.setEditorStats({ chars: model.getValueLength(), lines: model.getLineCount() });
                            }
                            editor.onDidChangeModelContent(() => {
                                const model = editor.getModel();
                                if (model) {
                                    store.setEditorStats({ chars: model.getValueLength(), lines: model.getLineCount() });
                                }
                            });
                          }}
                          options={{ fontSize: store.fontSize, minimap: { enabled: store.minimap }, automaticLayout: true, wordWrap: 'on', scrollBeyondLastLine: false }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-2 p-2 border-t border-line bg-neutral-900">
                        <div className="flex flex-wrap justify-center gap-2">
                          <span className="tooltip-wrapper" data-tooltip="Explain the code step-by-step"><button onClick={()=>doAction('explain')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>Explain</button></span>
                          <span className="tooltip-wrapper" data-tooltip="Rewrite as pseudocode"><button onClick={()=>doAction('pseudo')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>Pseudocode</button></span>
                          <span className="tooltip-wrapper" data-tooltip="Explain it like I'm 10"><button onClick={()=>doAction('eli10')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>ELI10</button></span>
                          <span className="tooltip-wrapper" data-tooltip="Generate unit tests"><button onClick={()=>doAction('tests')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>Gen Tests</button></span>
                          <span className="tooltip-wrapper" data-tooltip="Find potential bugs and issues"><button onClick={()=>doAction('bugs')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>Find Bugs</button></span>
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-2">
                            <span className="tooltip-wrapper" data-tooltip="Suggest improvements to the code"><button onClick={()=>doAction('refactor')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>Refactor</button></span>
                            <span className="tooltip-wrapper" data-tooltip="Add and explain comments"><button onClick={()=>doAction('comments')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>Add Comments</button></span>
                            <span className="tooltip-wrapper" data-tooltip="Analyze time and space complexity"><button onClick={()=>doAction('complexity')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>Complexity</button></span>
                            <div className="tooltip-wrapper" data-tooltip="Translate code to another language">
                                <div className="flex items-center gap-2">
                                    <button onClick={()=>store.setShowLangConvert(!store.showLangConvert)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={store.streaming}>Convert Language</button>
                                    {store.showLangConvert && (
                                        <select onChange={e=>doAction('convert', e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm">
                                            <option>Select Language</option>
                                            {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            <span className="tooltip-wrapper" data-tooltip="Explain only the selected code"><button onClick={()=>doAction('explain-selection')} className="bg-green-600/80 border border-green-500 rounded-md px-3 py-2 hover:bg-green-500 disabled:opacity-50" disabled={store.streaming}>Explain Selection</button></span>
                            <span className="tooltip-wrapper" data-tooltip="Write your own prompt"><button onClick={()=>store.setShowCustomPrompt(true)} className="bg-accent border border-blue-500 rounded-md px-3 py-2 hover:bg-blue-500 disabled:opacity-50" disabled={store.streaming}>Custom Prompt</button></span>
                        </div>
                      </div>
                    </section>
                    {/* Bottom-Left: History & Diff Panel */}
                    <aside className="flex flex-col overflow-hidden h-full">
                        <div className="flex items-center justify-between p-2 bg-neutral-900 border-b border-line">
                            <div className="flex">
                                <button onClick={() => store.setActiveTab('history')} className={`px-3 py-1 text-sm rounded-md ${store.activeTab === 'history' ? 'bg-neutral-700' : ''}`}>History</button>
                                <button onClick={() => store.setActiveTab('diff')} className={`px-3 py-1 text-sm rounded-md ${store.activeTab === 'diff' ? 'bg-neutral-700' : ''}`}>Diff</button>
                            </div>
                            {store.activeTab === 'history' && (
                                <button onClick={() => store.setConversationHistory([])} className="text-xs text-muted hover:text-white">Clear All</button>
                            )}
                        </div>
                        {store.activeTab === 'history' && (
                            <div className="overflow-y-auto flex-1">
                                {store.conversationHistory.length === 0 && <p className="p-4 text-sm text-muted">No history yet.</p>}
                                {store.conversationHistory.map((item, i) => (
                                    <div key={i} className="history-item flex justify-between items-center" onClick={() => { store.setRawOut(item.response); }}>
                                        <p className="text-sm text-neutral-300 truncate">{item.prompt.split('\n')[0]}</p>
                                        <button onClick={(e) => { e.stopPropagation(); store.setConversationHistory(store.conversationHistory.filter((_, idx) => idx !== i)) }} className="text-xs text-muted hover:text-red-400">X</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {store.activeTab === 'diff' && (
                            <div className="flex-1">
                                <DiffEditor
                                    theme="vs-dark"
                                    language={store.lang}
                                    original={store.diffContent.original}
                                    modified={store.diffContent.modified}
                                    onMount={(editor) => { diffEditorRef.current = editor }}
                                    options={{ readOnly: true, renderSideBySide: true, fontSize: store.fontSize, minimap: { enabled: store.minimap } }}
                                />
                            </div>
                        )}
                    </aside>
                </Split>
            </div>
            {/* Right Panel: Output */}
            <section className="flex flex-col rounded-xl border border-line overflow-hidden h-full bg-panel">
              <div className="flex items-center justify-between gap-2 p-2 bg-neutral-900 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold">Output</div>
                  {store.streaming && (
                    <div className="flex items-center gap-2 text-muted">
                      <div className="h-4 w-4 rounded-full border-2 border-neutral-500 border-t-transparent animate-spin" />
                      <span className="text-sm">Generating…</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {store.streaming && (
                    <button onClick={store.stopStream} className="bg-red-700 border border-red-600 rounded-md px-3 py-2 text-sm hover:bg-red-600">Stop</button>
                  )}
                  <button onClick={() => navigator.clipboard.writeText(store.rawOut)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Copy</button>
                </div>
              </div>
              <div ref={outRef} className="p-4 text-ink space-y-2 overflow-auto flex-1 md" dangerouslySetInnerHTML={{__html: store.out}} />
              {store.rawOut && !store.streaming && (
                <div className="p-2 border-t border-line">
                    <form onSubmit={handleFollowUp}>
                        <input 
                            type="text"
                            value={store.followUp}
                            onChange={e => store.setFollowUp(e.target.value)}
                            placeholder="Ask a follow-up question..."
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-sm"
                        />
                    </form>
                </div>
              )}
            </section>
        </Split>
      </main>

      <footer className="px-4 py-3 text-center text-xs text-muted w-full">
        Created by Ocean Bennett · Uses local Ollama. Start the Ollama app and pull a model (e.g. <code>ollama pull codegemma</code>).
      </footer>
    </div>
  )
}
