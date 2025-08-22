# BasedSyntax

**BasedSyntax** is a powerful, locally-run coding assistant that supercharges your development workflow. It combines the advanced Monaco editor (the engine behind VS Code) with the flexibility of local AI models via Ollama. Use it as a scratchpad, a learning tool, or a powerful code refactoring and analysis companion, all while keeping your code securely on your own machine.

![App Screenshot](https://i.imgur.com/your-screenshot-url.png) 
*Note: You will need to replace the URL above with a real URL of a screenshot of your app.*

---

## ✨ Features

* **VS Code Experience, Locally**: Enjoy a feature-rich editing experience with syntax highlighting for dozens of languages, Prettier-based code formatting, and integrated search functionality, right in your browser.
* **Your Personal AI Code Architect**: Connects to your local Ollama instance to leverage powerful language models for a wide range of complex tasks:
    * **Deep Code Analysis**: Get detailed, step-by-step explanations of complex code.
    * **Intelligent Refactoring**: Automatically refactor code for readability, performance, and maintainability.
    * **Proactive Debugging**: Analyze code for potential bugs, security vulnerabilities, and performance issues before they become a problem.
    * **Automated Test Generation**: Create comprehensive unit tests to ensure your code is robust and reliable.
    * **Smart Commenting**: Intelligently add and explain comments to clarify your codebase.
    * **Effortless Language Conversion**: Translate code snippets from one language to another with detailed explanations of the changes.
* **Conversational AI**: Use the interactive follow-up prompt to ask clarifying questions and dive deeper into the AI's suggestions without losing context.
* **Visual Diff Checker**: Instantly see the changes suggested by the AI in a clear, side-by-side view before applying them to your code.
* **Ironclad Privacy**: Everything runs 100% locally. Your code is never sent to a third-party server, ensuring complete confidentiality.
* **Developer-Friendly UI**: A clean, customizable interface with adjustable editor settings, tooltips, and a straightforward workflow.

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or later recommended)
* [Ollama](https://ollama.com/) installed and running on your machine.
* At least one model pulled through Ollama (e.g., `ollama pull codegemma`).

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/basedsyntax.git](https://github.com/your-username/basedsyntax.git)
    cd basedsyntax
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:5173` (or the address provided in your terminal).

---

## 💻 How to Use

1.  **Select a Model**: Choose an available Ollama model from the dropdown at the top of the screen.
2.  **Write or Open Code**: Write code directly in the editor, paste it in, or use the "Open" button to load a local file.
3.  **Choose an Action**: Use the buttons below the editor to perform an action on your code (e.g., "Explain", "Refactor", "Find Bugs").
4.  **Review the Output**: The AI's response will stream into the output panel on the right. Code suggestions will include "Apply" and "Copy" buttons for easy use.
5.  **Ask a Follow-up**: Use the input box at the bottom of the output panel to ask clarifying questions about the generated response.
6.  **View Diffs**: When you "Apply" a change, the Diff panel will automatically show you a side-by-side comparison of the changes.

---

## 🤝 Contributing

Contributions are welcome! If you have a feature request, bug report, or want to contribute to the code, please feel free to open an issue or submit a pull request.

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## ⭐ Show Your Support

If you find BasedSyntax useful, please give it a star on GitHub!
