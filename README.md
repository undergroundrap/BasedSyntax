# BasedSyntax

React + Vite + Monaco editor app that helps you understand code using **local Ollama**.

## Quick start
```bash
# 1) Extract the zip
cd BasedSyntax

# 2) Install deps
npm i

# 3) Run the dev server
npm run dev
```

### Ollama
Make sure the **Ollama** app is open, and you have a model pulled, for example:
```bash
ollama pull llama3
# or
ollama pull gpt-oss-20b
```
This app proxies API calls to `http://localhost:11434` via Vite at `/ollama` to avoid CORS issues.

## Features
- Monaco editor (vs-dark), auto layout, word wrap, bracket colorization
- Actions: Explain · Pseudocode · ELI10 · Generate Tests · Find Bugs · Explain Selection
- Streamed responses with **Stop**
- Copy / Export Markdown
- Open/Save files + drag & drop open
- Remembers last model & language

## Notes
- Everything runs locally in your browser; no server required beyond the Vite dev server.
- Build with `npm run build` and serve `dist/` as static files.
