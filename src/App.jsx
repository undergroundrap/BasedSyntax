import React, { useEffect, useMemo, useRef, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { marked } from 'marked'
import Split from 'react-split'

// Vite proxy to local Ollama server
const OLLAMA_BASE = '/ollama'

// Supported languages for the editor
const LANGS = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'sql', label: 'SQL' },
  { id: 'cpp', label: 'C/C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'java', label: 'Java' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'php', label: 'PHP' },
  { id: 'shell', label: 'Shell' },
  { id: 'yaml', label: 'YAML' },
  { id: 'json', label: 'JSON' },
  { id: 'xml', label: 'XML' },
]

// Demo code for each language
const DEMO = {
    javascript: `// Welcome to BasedSyntax!
function factorial(n) {
  return n ? n * factorial(n - 1) : 1;
}
console.log(factorial(5)); // 120`,
    typescript: `type User = { id: number; name: string; }; function getUser(id: number): User { return { id, name: \`User \${id}\` }; }`,
    python: `def fib(n):\n    a, b = 0, 1\n    while a < n:\n        print(a, end=' ')\n        a, b = b, a + b\n    print()\nfib(50)`,
    rust: `fn main() {\n    println!("Hello, Rust!");\n}`,
    go: `package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, Go!")\n}`,
    html: `<!doctype html>\n<html>\n  <body>\n    <h1>Hello, World!</h1>\n  </body>\n</html>`,
    css: `body {\n  background: #121212;\n  color: #e0e0e0;\n}`,
    sql: `SELECT user_id, COUNT(*) FROM events WHERE event_type = 'click' GROUP BY 1;`,
    cpp: `#include <iostream>\nint main() {\n    std::cout << "Hello, C++!\\n";\n    return 0;\n}`,
    csharp: `using System;\nclass Program { static void Main() { Console.WriteLine("Hello, C#!"); } }`,
    java: `class HelloWorld { public static void main(String[] args) { System.out.println("Hello, Java!"); } }`,
    ruby: `puts "Hello, Ruby!"`,
    php: `<?php echo 'Hello, PHP!'; ?>`,
    shell: `echo "Hello, Shell!"`,
    yaml: `user:\n  name: Ocean\n  role: developer`,
    json: `{\n    "greeting": "Hello, JSON!"\n}`,
    xml: `<note><to>User</to><from>BasedSyntax</from><body>Hello, XML!</body></note>`
}

// Utility for conditional class names
function cx(...s){return s.filter(Boolean).join(' ')}

// Main Application Component
export default function App(){
  // --- STATE MANAGEMENT ---
  const [status, setStatus] = useState('Checking Ollama…')
  const [statusClass, setStatusClass] = useState('bg-neutral-900 border-neutral-700 text-neutral-300')
  const [models, setModels] = useState([])
  const [tip, setTip] = useState('')
  const [model, setModel] = useState(localStorage.getItem('basedsyntax:model') || '')
  const [lang, setLang] = useState(localStorage.getItem('basedsyntax:lang') || 'javascript')
  const [out, setOut] = useState('<p class="text-neutral-400">Select a model, paste or open code on the left, then choose an action.</p>')
  const [rawOut, setRawOut] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showLangConvert, setShowLangConvert] = useState(false)
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editorHistory, setEditorHistory] = useState([])
  const [editorRedoStack, setEditorRedoStack] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([])
  const [fontSize, setFontSize] = useState(Number(localStorage.getItem('basedsyntax:fontSize')) || 14)
  const [minimap, setMinimap] = useState(localStorage.getItem('basedsyntax:minimap') ? localStorage.getItem('basedsyntax:minimap') === 'true' : true)
  const [activeTab, setActiveTab] = useState('history')
  const [currentCode, setCurrentCode] = useState(DEMO.javascript);
  const [diffContent, setDiffContent] = useState({ original: DEMO.javascript, modified: DEMO.javascript });
  const [editorStats, setEditorStats] = useState({ chars: 0, lines: 0 });
  // NEW: State for follow-up questions
  const [followUp, setFollowUp] = useState('');
  const [lastPrompt, setLastPrompt] = useState(null);

  // --- REFS ---
  const editorRef = useRef(null)
  const abortRef = useRef(null)
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
            <button class="code-btn" data-tooltip="Apply this code to the editor" data-action="apply">Apply</button>
            <button class="code-btn" data-tooltip="Copy code to clipboard" data-action="copy">Copy</button>
          </div>
          <pre><code class="hljs language-${validLang}">${highlightedCode}</code></pre>
        </div>
      `;
    };
    return r;
  }, []);

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
          updateEditorValue(code, true);
          target.innerText = 'Applied!';
          setActiveTab('diff');
          setTimeout(() => { target.innerText = 'Apply' }, 2000);
        }
      }
    };

    outputElement.addEventListener('click', handleClick);
    return () => outputElement.removeEventListener('click', handleClick);
  }, [out]);

  useEffect(() => { checkHealth(); loadModels(); }, [])
  useEffect(() => { localStorage.setItem('basedsyntax:model', model) }, [model])
  useEffect(() => { localStorage.setItem('basedsyntax:lang', lang) }, [lang])
  useEffect(() => { localStorage.setItem('basedsyntax:fontSize', fontSize) }, [fontSize])
  useEffect(() => { localStorage.setItem('basedsyntax:minimap', minimap) }, [minimap])
  useEffect(() => { if(streaming && outRef.current){ outRef.current.scrollTop = outRef.current.scrollHeight } }, [out, streaming])
  
  useEffect(() => {
    const overlay = document.getElementById('dropOverlay')
    const onEnterOver = (e) => { e.preventDefault(); overlay.style.display = 'flex' }
    const onLeaveDrop = (e) => {
      e.preventDefault()
      if(e.type === 'drop'){
        const f = e.dataTransfer?.files?.[0]
        if(f){
          const r = new FileReader()
          r.onload = () => updateEditorValue(String(r.result), true)
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

  // --- API & OLLAMA FUNCTIONS ---
  
  async function checkHealth(){
    try{
      const r = await fetch(`${OLLAMA_BASE}/api/version`)
      if(!r.ok) throw new Error()
      setStatus('Ollama: Connected')
      setStatusClass('bg-green-900/30 border-green-800 text-green-200')
    }catch{
      setStatus('Ollama: Offline')
      setStatusClass('bg-red-900/30 border-red-800 text-red-200')
    }
  }

  async function loadModels(){
    try{
      const r = await fetch(`${OLLAMA_BASE}/api/tags`);
      const data = await r.json();
      const names = (data.models||[]).map(m => m.name);
      setModels(names);
      const prefs = ['codegemma', 'llama3:instruct', 'codellama', 'phi3'];
      if (!model || !names.includes(model)) {
        let chosen = '';
        for (const p of prefs) {
          const hit = names.find(n => n.toLowerCase().startsWith(p.toLowerCase()));
          if (hit) { chosen = hit; break; }
        }
        if (!chosen && names.length) chosen = names[0];
        if (chosen) setModel(chosen);
      }
      setTip(names.some(n => n.includes('codegemma')) ? '' : 'Tip: For best results, try `ollama pull codegemma`');
    }catch(err){
      setOut(`<p class="text-red-300">Error loading models: ${err.message}</p>`);
    }
  }

  // --- PROMPT ENGINEERING ---
  const SYSTEM_PROMPT = "You are an expert programmer providing clear, concise, and accurate explanations. Format your response using GitHub-flavored Markdown. Use headings, lists, tables, and bold text to improve readability.";

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
      // NEW: Prompt for follow-up questions
      followup: `The user provided the following code:\n\n\`\`\`${_lang}\n${code}\n\`\`\`\n\nYou provided this response:\n\n---\n${rawOut}\n---\n\nNow, answer this follow-up question: ${custom}`
    }
    const base = bases[kind] || 'Explain this code.'
    if (kind !== 'followup') {
        return `${base}\n\n\`\`\`${_lang}\n${code}\n\`\`\``
    }
    return base;
  }

  // --- CORE STREAMING LOGIC ---

  async function streamGenerate(thePrompt, saveToHistory = true){
    if(!model){ setOut('<p class="text-yellow-300">Select a model first.</p>'); return }
    const code = editorRef.current?.getValue()?.trim() || ''
    if(!code && !thePrompt.includes('followup')){ setOut('<p class="text-yellow-300">Paste or open some code in the editor.</p>'); return }

    setStreaming(true)
    setShowLangConvert(false)
    setShowCustomPrompt(false)
    setOut('')
    setRawOut('')
    abortRef.current = new AbortController()

    try{
      const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: thePrompt, system: SYSTEM_PROMPT, stream: true }),
        signal: abortRef.current.signal
      })
      if(!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while(true){
        const { done, value } = await reader.read()
        if(done) break
        const chunk = decoder.decode(value, { stream: true })
        for(const line of chunk.split('\n')){
          if(!line.trim()) continue
          try{
            const j = JSON.parse(line)
            if(j.response){
              full += j.response
              setRawOut(full);
              setOut(marked.parse(full, { renderer }))
            }
          }catch{ /* ignore partial lines */ }
        }
      }
      if (saveToHistory) {
        setConversationHistory(prev => [{ prompt: thePrompt, response: full }, ...prev])
        setLastPrompt(thePrompt); // Save the last main prompt
      }
    }catch(err){
      setOut(`<p class="text-red-300">Error: ${err.message}</p>`)
    }finally{
      setStreaming(false)
      abortRef.current = null
    }
  }
  
  // --- EDITOR MANAGEMENT ---
  function updateEditorValue(newValue, isNewAction = false) {
    const currentValue = editorRef.current?.getValue();
    setEditorHistory(prev => [...prev, currentValue]);
    setDiffContent({ original: currentValue, modified: newValue });
    setCurrentCode(newValue);
    if (isNewAction) {
      setEditorRedoStack([]);
    }
  }

  function onEditorChange(value) {
    setCurrentCode(value);
    setEditorRedoStack([]);
    const model = editorRef.current?.getModel();
    if (model) {
      setEditorStats({ chars: model.getValueLength(), lines: model.getLineCount() });
    }
  }

  function undo() {
      if (editorHistory.length > 0) {
          const lastValue = editorHistory.at(-1);
          setEditorRedoStack(prev => [currentCode, ...prev]);
          setEditorHistory(prev => prev.slice(0, -1));
          setDiffContent({ original: editorHistory.at(-2) || '', modified: lastValue });
          setCurrentCode(lastValue);
      }
  }

  function redo() {
    if (editorRedoStack.length > 0) {
      const nextValue = editorRedoStack[0];
      setEditorHistory(prev => [...prev, currentCode]);
      setEditorRedoStack(prev => prev.slice(1));
      setDiffContent({ original: currentCode, modified: nextValue });
      setCurrentCode(nextValue);
    }
  }

  // --- ACTION HANDLERS ---
  function doAction(kind, toLang, custom){
    const code = editorRef.current?.getValue() || ''
    const text = kind === 'explain-selection'
      ? editorRef.current?.getModel()?.getValueInRange(editorRef.current?.getSelection()) || ''
      : code
    if(kind === 'explain-selection'){
      if(!text.trim()) { setOut('<p class="text-yellow-300">Select some code to explain.</p>'); return }
      streamGenerate(getPrompt('explain', lang, text))
      return
    }
    streamGenerate(getPrompt(kind, lang, text, toLang, custom))
  }

  // NEW: Handle follow-up questions
  function handleFollowUp(e) {
    e.preventDefault();
    if (!followUp.trim() || !rawOut.trim()) return;
    const code = editorRef.current?.getValue() || '';
    const prompt = getPrompt('followup', lang, code, null, followUp);
    streamGenerate(prompt, false); // Don't save to main history
    setFollowUp('');
  }

  function stopStream(){
    if(abortRef.current){ abortRef.current.abort(); abortRef.current = null; setStreaming(false) }
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
      updateEditorValue(newContent, true)
      const ext = (file.name.split('.').pop()||'').toLowerCase()
      const map = { js:'javascript', mjs:'javascript', ts:'typescript', py:'python', go:'go', rs:'rust', html:'html', htm:'html', css:'css', sql:'sql', c:'cpp', h:'cpp', cpp:'cpp', hpp:'cpp', cs:'csharp', java:'java', rb:'ruby', php:'php', sh:'shell', bash:'shell', yaml:'yaml', yml:'yaml', json:'json', xml:'xml' }
      setLang(map[ext] || 'javascript')
    }
    reader.readAsText(file)
  }

  function saveFile(){
    const code = editorRef.current?.getValue() || ''
    const ext = {javascript:'js', typescript:'ts', python:'py', go:'go', rust:'rs', html:'html', css:'css', sql:'sql', cpp:'cpp', csharp:'cs', java:'java', ruby:'rb', php:'php', shell:'sh', yaml:'yml', json:'json', xml:'xml'}[lang] || 'txt'
    const blob = new Blob([code], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `code.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function handleLangChange(newLang) {
    setLang(newLang);
    const newCode = DEMO[newLang] || '';
    updateEditorValue(newCode, true);
  }

  function handleAppReset() {
    localStorage.clear();
    window.location.reload();
  }

  // --- RENDER ---
  return (
    <div className="h-screen flex flex-col bg-bg text-ink">
      <div id="dropOverlay" className="fixed inset-0 hidden items-center justify-center z-50 bg-panel/80 border-2 border-dashed border-line">
        <div className="text-center">
          <div className="text-2xl font-semibold">Drop a file to open</div>
          <div className="text-sm text-muted mt-2">Your code stays on your machine.</div>
        </div>
      </div>
      
      {showCustomPrompt && (
        <div className="modal-overlay" onClick={() => setShowCustomPrompt(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">Custom Prompt</h2>
                <p className="text-sm text-muted mb-4">Enter your own instructions. The current code will be automatically included.</p>
                <textarea ref={customPromptRef} className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-sm mb-4" rows="4" placeholder="e.g., 'Convert this to an arrow function'"></textarea>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowCustomPrompt(false)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Cancel</button>
                    <button onClick={() => doAction('custom', null, customPromptRef.current?.value)} className="bg-accent border border-blue-500 rounded-md px-3 py-2 text-sm hover:bg-blue-500">Submit</button>
                </div>
            </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">Settings</h2>
                <div className="flex items-center justify-between mb-4">
                    <label htmlFor="fontSize" className="text-sm">Editor Font Size</label>
                    <input id="fontSize" type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-20 bg-neutral-900 border border-neutral-700 rounded-md p-2 text-sm" />
                </div>
                <div className="flex items-center justify-between mb-4">
                    <label htmlFor="minimap" className="text-sm">Show Editor Minimap</label>
                    <input id="minimap" type="checkbox" checked={minimap} onChange={e => setMinimap(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                </div>
                <div className="border-t border-line pt-4 mt-4">
                    <button onClick={() => { setShowSettings(false); setShowResetConfirm(true); }} className="w-full bg-red-800 border border-red-700 rounded-md px-3 py-2 text-sm hover:bg-red-700">Reset App State</button>
                    <p className="text-xs text-muted mt-2">Clears all settings and history from your browser.</p>
                </div>
            </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">Are you sure?</h2>
                <p className="text-sm text-muted mb-4">This will permanently delete all application data from your browser. This cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowResetConfirm(false)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Cancel</button>
                    <button onClick={handleAppReset} className="bg-red-700 border border-red-600 rounded-md px-3 py-2 text-sm hover:bg-red-600">Confirm Reset</button>
                </div>
            </div>
        </div>
      )}

      <header className="w-full border-b border-line bg-panel">
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold">BasedSyntax</div>
            <div className={cx('text-xs px-2 py-1 rounded-full border', statusClass)}>{status}</div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="tooltip-wrapper"><button data-tooltip="Settings" onClick={() => setShowSettings(true)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Settings</button></span>
            <select value={model} onChange={e=>setModel(e.target.value)} className="flex-1 sm:flex-none bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm">
              <option value="">Select Ollama model</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="tooltip-wrapper"><button onClick={()=>{checkHealth(); loadModels();}} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Refresh</button></span>
          </div>
        </div>
        {tip && (<div className="px-4 pb-2 text-xs text-muted">{tip}</div>)}
      </header>

      <main className="flex-1 w-full p-4 overflow-hidden">
        <Split className="flex h-full" sizes={[65, 35]} minSize={300} gutterSize={10}>
            {/* Left Panel: Editor + History/Diff */}
            <div className="flex flex-col h-full rounded-xl border border-line overflow-hidden bg-panel">
                <Split direction="vertical" sizes={[70, 30]} minSize={100} className="h-full flex flex-col">
                    {/* Top-Left: Code Editor & Commands */}
                    <section className="flex flex-col overflow-hidden h-full">
                      <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-900 border-b border-line">
                        <select value={lang} onChange={e=>handleLangChange(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm">
                          {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                        {/* UPDATED: Buttons wrapped for tooltip fix */}
                        <span className="tooltip-wrapper"><button data-tooltip="Open a local file" onClick={()=>fileInputRef.current?.click()} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Open</button></span>
                        <span className="tooltip-wrapper"><button data-tooltip="Save the current code" onClick={saveFile} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Save</button></span>
                        <span className="tooltip-wrapper"><button data-tooltip="Search in code (Ctrl+F)" onClick={findInCode} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Search</button></span>
                        <span className="tooltip-wrapper"><button data-tooltip="Format code (Prettier)" onClick={formatCode} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Format</button></span>
                        <div className="flex-1" />
                        <div className="text-xs text-muted px-2">{editorStats.chars} chars · {editorStats.lines} lines</div>
                        <span className="tooltip-wrapper"><button data-tooltip="Undo last change" onClick={undo} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50" disabled={editorHistory.length === 0}>Undo</button></span>
                        <span className="tooltip-wrapper"><button data-tooltip="Redo last change" onClick={redo} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50" disabled={editorRedoStack.length === 0}>Redo</button></span>
                        <span className="tooltip-wrapper"><button data-tooltip="Clear the editor" onClick={()=>updateEditorValue('', true)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Clear</button></span>
                      </div>
                      <div className="flex-1 relative">
                        <Editor
                          theme="vs-dark"
                          language={lang}
                          value={currentCode}
                          onChange={onEditorChange}
                          onMount={(editor) => { 
                            editorRef.current = editor;
                            const model = editor.getModel();
                            if (model) {
                                setEditorStats({ chars: model.getValueLength(), lines: model.getLineCount() });
                            }
                            editor.onDidChangeModelContent(() => {
                                const model = editor.getModel();
                                if (model) {
                                    setEditorStats({ chars: model.getValueLength(), lines: model.getLineCount() });
                                }
                            });
                          }}
                          options={{ fontSize, minimap: { enabled: minimap }, automaticLayout: true, wordWrap: 'on', scrollBeyondLastLine: false }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-2 p-2 border-t border-line bg-neutral-900">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button data-tooltip="Explain the code step-by-step" onClick={()=>doAction('explain')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>Explain</button>
                          <button data-tooltip="Rewrite as pseudocode" onClick={()=>doAction('pseudo')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>Pseudocode</button>
                          <button data-tooltip="Explain it like I'm 10" onClick={()=>doAction('eli10')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>ELI10</button>
                          <button data-tooltip="Generate unit tests" onClick={()=>doAction('tests')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>Gen Tests</button>
                          <button data-tooltip="Find potential bugs and issues" onClick={()=>doAction('bugs')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>Find Bugs</button>
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-2">
                            <button data-tooltip="Suggest improvements to the code" onClick={()=>doAction('refactor')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>Refactor</button>
                            <button data-tooltip="Add and explain comments" onClick={()=>doAction('comments')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>Add Comments</button>
                            <button data-tooltip="Analyze time and space complexity" onClick={()=>doAction('complexity')} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>Complexity</button>
                            <div className="flex items-center gap-2">
                                <button data-tooltip="Translate code to another language" onClick={()=>setShowLangConvert(!showLangConvert)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50" disabled={streaming}>Convert Language</button>
                                {showLangConvert && (
                                    <select onChange={e=>doAction('convert', e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm">
                                        <option>Select Language</option>
                                        {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            <button data-tooltip="Explain only the selected code" onClick={()=>doAction('explain-selection')} className="bg-green-600/80 border border-green-500 rounded-md px-3 py-2 hover:bg-green-500 disabled:opacity-50" disabled={streaming}>Explain Selection</button>
                            <button data-tooltip="Write your own prompt" onClick={()=>setShowCustomPrompt(true)} className="bg-accent border border-blue-500 rounded-md px-3 py-2 hover:bg-blue-500 disabled:opacity-50" disabled={streaming}>Custom Prompt</button>
                        </div>
                      </div>
                    </section>
                    {/* Bottom-Left: History & Diff Panel */}
                    <aside className="flex flex-col overflow-hidden h-full">
                        <div className="flex items-center justify-between p-2 bg-neutral-900 border-b border-line">
                            <div className="flex">
                                <button onClick={() => setActiveTab('history')} className={`px-3 py-1 text-sm rounded-md ${activeTab === 'history' ? 'bg-neutral-700' : ''}`}>History</button>
                                <button onClick={() => setActiveTab('diff')} className={`px-3 py-1 text-sm rounded-md ${activeTab === 'diff' ? 'bg-neutral-700' : ''}`}>Diff</button>
                            </div>
                            {activeTab === 'history' && (
                                <button onClick={() => setConversationHistory([])} className="text-xs text-muted hover:text-white">Clear All</button>
                            )}
                        </div>
                        {activeTab === 'history' && (
                            <div className="overflow-y-auto flex-1">
                                {conversationHistory.length === 0 && <p className="p-4 text-sm text-muted">No history yet.</p>}
                                {conversationHistory.map((item, i) => (
                                    <div key={i} className="history-item flex justify-between items-center" onClick={() => { setRawOut(item.response); setOut(marked.parse(item.response, { renderer })); }}>
                                        <p className="text-sm text-neutral-300 truncate">{item.prompt.split('\n')[0]}</p>
                                        <button onClick={(e) => { e.stopPropagation(); setConversationHistory(prev => prev.filter((_, idx) => idx !== i)) }} className="text-xs text-muted hover:text-red-400">X</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'diff' && (
                            <div className="flex-1">
                                <DiffEditor
                                    theme="vs-dark"
                                    language={lang}
                                    original={diffContent.original}
                                    modified={diffContent.modified}
                                    onMount={(editor) => { diffEditorRef.current = editor }}
                                    options={{ readOnly: true, renderSideBySide: true, fontSize, minimap: { enabled: minimap } }}
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
                  {streaming && (
                    <div className="flex items-center gap-2 text-muted">
                      <div className="h-4 w-4 rounded-full border-2 border-neutral-500 border-t-transparent animate-spin" />
                      <span className="text-sm">Generating…</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {streaming && (
                    <button onClick={stopStream} className="bg-red-700 border border-red-600 rounded-md px-3 py-2 text-sm hover:bg-red-600">Stop</button>
                  )}
                  <button onClick={() => navigator.clipboard.writeText(rawOut)} className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm hover:bg-neutral-700">Copy</button>
                </div>
              </div>
              <div ref={outRef} className="p-4 text-ink space-y-2 overflow-auto flex-1 md" dangerouslySetInnerHTML={{__html: out}} />
              {/* NEW: Follow-up question form */}
              {rawOut && !streaming && (
                <div className="p-2 border-t border-line">
                    <form onSubmit={handleFollowUp}>
                        <input 
                            type="text"
                            value={followUp}
                            onChange={e => setFollowUp(e.target.value)}
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
