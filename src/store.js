// src/store.js
import { create } from 'zustand'

// Utility for conditional class names
export const cx = (...s) => s.filter(Boolean).join(' ')

// Supported languages for the editor with aliases for file extensions
// A comprehensive list including many new additions
export const LANGS = [
  { id: 'javascript', label: 'JavaScript', aliases: ['js', 'jsx', 'mjs', 'cjs'] },
  { id: 'typescript', label: 'TypeScript', aliases: ['ts', 'tsx'] },
  { id: 'python', label: 'Python', aliases: ['py'] },
  { id: 'go', label: 'Go', aliases: ['go'] },
  { id: 'rust', label: 'Rust', aliases: ['rs'] },
  { id: 'html', label: 'HTML', aliases: ['html', 'htm'] },
  { id: 'css', label: 'CSS', aliases: ['css'] },
  { id: 'sql', label: 'SQL', aliases: ['sql'] },
  { id: 'cpp', label: 'C/C++', aliases: ['cpp', 'c', 'h', 'hpp'] },
  { id: 'csharp', label: 'C#', aliases: ['cs'] },
  { id: 'java', label: 'Java', aliases: ['java'] },
  { id: 'ruby', label: 'Ruby', aliases: ['ruby', 'rb'] },
  { id: 'php', label: 'PHP', aliases: ['php'] },
  { id: 'shell', label: 'Shell', aliases: ['sh', 'bash', 'zsh'] },
  { id: 'yaml-lang', label: 'YAML', aliases: ['yaml', 'yml'] },
  { id: 'json', label: 'JSON', aliases: ['json'] },
  { id: 'xml', label: 'XML', aliases: ['xml'] },
  { id: 'swift-lang', label: 'Swift', aliases: ['swift'] },
  { id: 'kotlin', label: 'Kotlin', aliases: ['kt', 'kts'] },
  { id: 'r', label: 'R', aliases: ['r'] },
  { id: 'scala', label: 'Scala', aliases: ['scala', 'sc'] },
  { id: 'elixir', label: 'Elixir', aliases: ['ex', 'exs'] },
  { id: 'markdown', label: 'Markdown', aliases: ['md', 'markdown'] },
  { id: 'vue', label: 'Vue', aliases: ['vue'] },
  { id: 'svelte', label: 'Svelte', aliases: ['svelte'] },
  { id: 'clojure', label: 'Clojure', aliases: ['clj', 'cljs', 'cljc'] },
  { id: 'c', label: 'C', aliases: ['c', 'h'] },
  { id: 'dockerfile', label: 'Dockerfile', aliases: ['dockerfile'] },
  { id: 'dart', label: 'Dart', aliases: ['dart'] },
  { id: 'erlang', label: 'Erlang', aliases: ['erl'] },
  { id: 'fortran', label: 'Fortran', aliases: ['f', 'f90', 'f95'] },
  { id: 'graphql', label: 'GraphQL', aliases: ['graphql', 'gql'] },
  { id: 'handlebars', label: 'Handlebars', aliases: ['hbs', 'handlebars'] },
  { id: 'hcl', label: 'HCL', aliases: ['hcl', 'tf'] },
  { id: 'less', label: 'Less', aliases: ['less'] },
  { id: 'lua', label: 'Lua', aliases: ['lua'] },
  { id: 'matlab', label: 'MATLAB', aliases: ['matlab'] },
  { id: 'objective-c', label: 'Objective-C', aliases: ['m', 'mm'] },
  { id: 'perl', label: 'Perl', aliases: ['pl', 'pm'] },
  { id: 'powershell', label: 'PowerShell', aliases: ['ps1'] },
  { id: 'proto', label: 'Protobuf', aliases: ['proto'] },
  { id: 'razor', label: 'Razor', aliases: ['cshtml'] },
  { id: 'scss', label: 'SCSS', aliases: ['scss'] },
  { id: 'shader', label: 'GLSL', aliases: ['glsl', 'vert', 'frag'] },
  { id: 'solidity', label: 'Solidity', aliases: ['sol'] },
  { id: 'stylus', label: 'Stylus', aliases: ['styl'] },
  { id: 'v', label: 'V', aliases: ['v'] },
  { id: 'vb', label: 'Visual Basic', aliases: ['vb', 'bas'] },
  { id: 'wasm', label: 'WebAssembly', aliases: ['wasm'] },
  { id: 'plaintext', label: 'Plain Text', aliases: ['txt'] }
];

export const LANGUAGE_COLORS = {
  javascript: 'text-yellow-500',
  typescript: 'text-blue-500',
  python: 'text-green-500',
  go: 'text-sky-400',
  rust: 'text-red-500',
  html: 'text-orange-500',
  css: 'text-blue-400',
  sql: 'text-amber-500',
  cpp: 'text-blue-600',
  csharp: 'text-purple-500',
  java: 'text-orange-600',
  ruby: 'text-red-500',
  php: 'text-indigo-500',
  shell: 'text-neutral-400',
  'yaml-lang': 'text-green-400',
  json: 'text-cyan-400',
  xml: 'text-lime-400',
  'swift-lang': 'text-orange-500',
  kotlin: 'text-fuchsia-500',
  r: 'text-blue-400',
  scala: 'text-red-600',
  elixir: 'text-purple-400',
  markdown: 'text-neutral-300',
  vue: 'text-green-500',
  svelte: 'text-red-400',
  clojure: 'text-lime-500',
  c: 'text-blue-600',
  dockerfile: 'text-cyan-500',
  dart: 'text-blue-400',
  erlang: 'text-red-600',
  fortran: 'text-purple-400',
  graphql: 'text-pink-500',
  handlebars: 'text-orange-400',
  hcl: 'text-lime-400',
  less: 'text-blue-300',
  lua: 'text-indigo-500',
  matlab: 'text-orange-400',
  'objective-c': 'text-purple-500',
  perl: 'text-cyan-500',
  powershell: 'text-sky-400',
  proto: 'text-pink-400',
  razor: 'text-rose-400',
  scss: 'text-pink-400',
  shader: 'text-amber-400',
  solidity: 'text-neutral-400',
  stylus: 'text-emerald-400',
  v: 'text-blue-300',
  vb: 'text-neutral-400',
  wasm: 'text-purple-400',
  plaintext: 'text-neutral-400',
};


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
    go: `package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, Go!")\n}`,
    rust: `fn main() {\n    println!("Hello, Rust!");\n}`,
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
    xml: `<note><to>User</to><from>BasedSyntax</from><body>Hello, XML!</body></note>`,
    swift: `import Foundation\n\nprint("Hello, Swift!")`,
    kotlin: `fun main() {\n  println("Hello, Kotlin!")\n}`,
    r: `message <- "Hello, R!"\nprint(message)`,
    scala: `object HelloWorld {\n  def main(args: Array<String>): Unit = {\n    println("Hello, Scala!")\n  }\n}`,
    elixir: `IO.puts "Hello, Elixir!"`,
    markdown: `# Hello, Markdown!\n\nThis is a simple paragraph.\n\n- List item 1\n- List item 2\n\n\`\`\`javascript\nconsole.log("hello");\n\`\`\``,
    vue: `<template>\n  <h1>{{ message }}</h1>\n</template>\n\n<script>\nexport default {\n  data() {\n    return {\n      message: 'Hello, Vue!'\n    }\n  }\n}\n</script>`,
    svelte: `<script>\n  let message = 'Hello, Svelte!';\n</script>\n\n<h1>{message}</h1>`,
    clojure: `(println "Hello, Clojure!")`,
    c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, C!\\n");\n    return 0;\n}`,
    dockerfile: `FROM node:18\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["node", "index.js"]`,
    dart: `void main() {\n  print('Hello, Dart!');\n}`,
    erlang: `-module(hello).\n-export([say_hello/0]).\n\nsay_hello() ->\n  io:fwrite("Hello, Erlang!\\n").`,
    fortran: `program hello\n  print *, 'Hello, Fortran!'\nend program hello`,
    graphql: `query MyQuery {\n  user(id: 1) {\n    name\n    email\n  }\n}`,
    handlebars: `<h1>Hello, {{name}}!</h1>`,
    hcl: `resource "aws_s3_bucket" "my_bucket" {\n  bucket = "my-unique-bucket-name"\n}`,
    less: `@color: #4D926F;\n\n#header {\n  color: @color;\n}`,
    lua: `print("Hello, Lua!")`,
    matlab: `disp('Hello, MATLAB!')`,
    'objective-c': `#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@"Hello, Objective-C!");\n    return 0;\n}`,
    perl: `print "Hello, Perl!\\n";`,
    powershell: `Write-Host "Hello, PowerShell!"`,
    proto: `syntax = "proto3";\n\nmessage User {\n  string name = 1;\n  int32 id = 2;\n}`,
    razor: `@page\n<h1>Hello, @Model.Name!</h1>`,
    scss: `$font-stack:    Helvetica, sans-serif;\n$primary-color: #333;\n\nbody {\n  font: 100% $font-stack;\n  color: $primary-color;\n}`,
    shader: `void main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n}`,
    solidity: `pragma solidity ^0.8.0;\n\ncontract Greeter {\n  string public greeting = "Hello, Solidity!";\n}`,
    stylus: `body\n  font 12px Helvetica, Arial, sans-serif`,
    v: `fn main() {\n  println('Hello, V!')\n}`,
    vb: `Module Program\n    Sub Main(args As String())\n        Console.WriteLine("Hello, Visual Basic!")\n    End Sub\nEnd Module`,
    wasm: `(module\n  (func (export "add") (param $lhs i32) (param $rhs i32) (result i32)\n    local.get $lhs\n    local.get $rhs\n    i32.add))\n`,
    plaintext: `This is a plain text file. There is no special syntax highlighting here.`,
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
  
  setOut: (output) => set({ out: output }),
  setRawOut: (output) => set({ rawOut: output }),

  // Model and Language Actions
  setModel: (model) => {
    set({ model });
    localStorage.setItem('basedsyntax:model', model);
  },
  setLang: (lang) => {
    const { activeFilePath } = get();
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
    if (files.length > 0) {
        get().setActiveFile(files[0]);
    }
  },

  setActiveFile: (file) => {
    const ext = (file.path.split('.').pop()||'').toLowerCase();
    const map = LANGS.reduce((acc, l) => {
      acc[l.id] = l.id;
      l.aliases?.forEach(a => acc[a] = l.id);
      return acc;
    }, {});
    
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
    const { model, rawOut } = get();
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
              set({ rawOut: full, out: full });
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