// src/store.js
import { create } from 'zustand'

// Utility for conditional class names
export const cx = (...s) => s.filter(Boolean).join(' ')

// Supported languages for the editor
export const LANGS = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'jsx', label: 'JSX' },
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
export const DEMO = {
    javascript: `// Welcome to BasedSyntax!
// You can open a single file or a whole folder.
function factorial(n) {
  return n ? n * factorial(n - 1) : 1;
}
console.log(factorial(5)); // 120`,
    jsx: `import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}`,
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

const buildFileTree = (files) => {
    const tree = {};
    files.forEach(file => {
        const parts = file.path.split('/');
        let currentLevel = tree;
        parts.forEach((part, index) => {
            if (!currentLevel[part]) {
                currentLevel[part] = index === parts.length - 1 ? { _file: file } : {};
            }
            currentLevel = currentLevel[part];
        });
    });
    return tree;
};


export const useStore = create((set, get) => ({
  // --- STATE ---
  status: 'Checking Ollama…',
  statusClass: 'bg-neutral-900 border-neutral-700 text-neutral-300',
  models: [],
  tip: '',
  model: localStorage.getItem('basedsyntax:model') || '',
  lang: localStorage.getItem('basedsyntax:lang') || 'javascript',
  out: '<p class="text-neutral-400">Select a model, paste or open code on the left, then choose an action.</p>',
  rawOut: '',
  streaming: false,
  showLangConvert: false,
  showCustomPrompt: false,
  showSettings: false,
  showResetConfirm: false,
  editorHistory: [],
  editorRedoStack: [],
  conversationHistory: [],
  fontSize: Number(localStorage.getItem('basedsyntax:fontSize')) || 14,
  minimap: localStorage.getItem('basedsyntax:minimap') ? localStorage.getItem('basedsyntax:minimap') === 'true' : true,
  activeTab: 'history',
  currentCode: DEMO.javascript,
  diffContent: { original: DEMO.javascript, modified: DEMO.javascript },
  editorStats: { chars: 0, lines: 0 },
  followUp: '',
  lastPrompt: null,
  error: null,
  // New state for folder context
  projectFiles: [],
  fileTree: {},
  activeFilePath: null,

  // --- ACTIONS ---
  
  // UI Actions
  setShowLangConvert: (show) => set({ showLangConvert: show }),
  setShowCustomPrompt: (show) => set({ showCustomPrompt: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowResetConfirm: (show) => set({ showResetConfirm: show }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFontSize: (size) => {
    set({ fontSize: size });
    localStorage.setItem('basedsyntax:fontSize', size);
  },
  setMinimap: (enabled) => {
    set({ minimap: enabled });
    localStorage.setItem('basedsyntax:minimap', enabled);
  },
  setFollowUp: (text) => set({ followUp: text }),

  // Model and Language Actions
  setModel: (model) => {
    set({ model });
    localStorage.setItem('basedsyntax:model', model);
  },
  setLang: (lang) => {
    const { activeFilePath } = get();
    // Only switch to demo code if we're not in a project context
    if (!activeFilePath) {
        set({ lang, currentCode: DEMO[lang] || '' });
    } else {
        set({ lang });
    }
    localStorage.setItem('basedsyntax:lang', lang);
  },

  // Project and File Actions
  setProjectFiles: (files) => {
    const fileTree = buildFileTree(files);
    set({ projectFiles: files, fileTree });
    // Automatically open the first file if available
    if (files.length > 0) {
        get().setActiveFile(files[0]);
    }
  },

  setActiveFile: (file) => {
    const ext = (file.path.split('.').pop()||'').toLowerCase();
    const map = { js:'javascript', jsx: 'javascript', mjs:'javascript', ts:'typescript', py:'python', go:'go', rs:'rust', html:'html', htm:'html', css:'css', sql:'sql', c:'cpp', h:'cpp', cpp:'cpp', hpp:'cpp', cs:'csharp', java:'java', rb:'ruby', php:'php', sh:'shell', bash:'shell', yaml:'yaml', yml:'yaml', json:'json', xml:'xml' };
    
    set({
        activeFilePath: file.path,
        lang: map[ext] || 'plaintext',
    });
    get().updateEditorValue(file.content, true);
  },


  // Editor Actions
  setCurrentCode: (code) => set({ currentCode: code }),
  setEditorStats: (stats) => set({ editorStats: stats }),
  updateEditorValue: (newValue, isNewAction = false) => {
    const { currentCode } = get();
    set(state => ({
      editorHistory: [...state.editorHistory, currentCode],
      diffContent: { original: currentCode, modified: newValue },
      currentCode: newValue,
      editorRedoStack: isNewAction ? [] : state.editorRedoStack,
    }));
  },
  undo: () => {
    set(state => {
      if (state.editorHistory.length > 0) {
        const lastValue = state.editorHistory[state.editorHistory.length - 1];
        return {
          editorRedoStack: [state.currentCode, ...state.editorRedoStack],
          editorHistory: state.editorHistory.slice(0, -1),
          diffContent: { original: state.editorHistory[state.editorHistory.length - 2] || '', modified: lastValue },
          currentCode: lastValue,
        };
      }
      return {};
    });
  },
  redo: () => {
    set(state => {
      if (state.editorRedoStack.length > 0) {
        const nextValue = state.editorRedoStack[0];
        return {
          editorHistory: [...state.editorHistory, state.currentCode],
          editorRedoStack: state.editorRedoStack.slice(1),
          diffContent: { original: state.currentCode, modified: nextValue },
          currentCode: nextValue,
        };
      }
      return {};
    });
  },

  // History Actions
  setConversationHistory: (history) => set({ conversationHistory: history }),
  addConversationHistory: (item) => set(state => ({ conversationHistory: [item, ...state.conversationHistory] })),

  // API Actions
  checkHealth: async () => {
    try {
      const r = await fetch('/ollama/api/version');
      if (!r.ok) throw new Error(`Ollama API returned status ${r.status}`);
      const data = await r.json();
      if (!data.version) throw new Error("Invalid response from Ollama API");
      set({ status: 'Ollama: Connected', statusClass: 'bg-green-900/30 border-green-800 text-green-200', error: null });
    } catch (err) {
      set({ status: 'Ollama: Offline', statusClass: 'bg-red-900/30 border-red-800 text-red-200', error: 'Could not connect to Ollama. Please ensure it is running.' });
    }
  },

  loadModels: async () => {
    try {
      const r = await fetch('/ollama/api/tags');
      if (!r.ok) throw new Error(`Ollama API returned status ${r.status}`);
      const data = await r.json();
      const names = (data.models || []).map(m => m.name);
      set({ models: names, error: null });
      const { model } = get();
      const prefs = ['codegemma', 'llama3:instruct', 'codellama', 'phi3'];
      if (!model || !names.includes(model)) {
        let chosen = '';
        for (const p of prefs) {
          const hit = names.find(n => n.toLowerCase().startsWith(p.toLowerCase()));
          if (hit) { chosen = hit; break; }
        }
        if (!chosen && names.length) chosen = names[0];
        if (chosen) get().setModel(chosen);
      }
      set({ tip: names.some(n => n.includes('codegemma')) ? '' : 'Tip: For best results, try `ollama pull codegemma`' });
    } catch (err) {
      set({ error: `Error loading models: ${err.message}` });
    }
  },

  streamGenerate: async (thePrompt, saveToHistory = true) => {
    const { model, lang, rawOut } = get();
    if (!model) {
      set({ out: '<p class="text-yellow-300">Select a model first.</p>', error: 'No model selected.' });
      return;
    }

    set({ streaming: true, showLangConvert: false, showCustomPrompt: false, out: '', rawOut: '', error: null });
    const abortController = new AbortController();
    set({ abortController });

    try {
      const res = await fetch('/ollama/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: thePrompt, system: "You are an expert programmer providing clear, concise, and accurate explanations. Format your response using GitHub-flavored Markdown. Use headings, lists, tables, and bold text to improve readability.", stream: true }),
        signal: abortController.signal
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.trim()) continue;
          try {
            const j = JSON.parse(line);
            if (j.response) {
              full += j.response;
              set({ rawOut: full });
            }
            if (j.error) {
                throw new Error(j.error);
            }
          } catch { /* ignore partial lines */ }
        }
      }

      if (saveToHistory) {
        get().addConversationHistory({ prompt: thePrompt, response: full });
        set({ lastPrompt: thePrompt });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        set({ out: `<p class="text-red-300">Error: ${err.message}</p>`, error: err.message });
      }
    } finally {
      set({ streaming: false, abortController: null });
    }
  },

  stopStream: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ streaming: false, abortController: null });
    }
  },
}));
