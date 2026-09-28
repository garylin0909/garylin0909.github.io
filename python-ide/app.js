const STORAGE_KEY = "garylin0909-python-ide-code-v1";
const output = document.querySelector("#output");
const status = document.querySelector("#runtime-status");
const runButton = document.querySelector("#run-button");
const stopButton = document.querySelector("#stop-button");
const codeField = document.querySelector("#code-editor");
const fileInput = document.querySelector("#file-input");
let editor = null;
let worker = null;
let mainPyodide = null;
let usingFallback = false;
let ready = false;
let running = false;
let runId = 0;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`;
}

function setButtons() {
  runButton.disabled = !ready || running;
  stopButton.disabled = !running || usingFallback;
}

function appendOutput(text) {
  output.textContent += text;
  output.scrollTop = output.scrollHeight;
}

function getCode() {
  return editor ? editor.getValue() : codeField.value;
}

function setCode(value) {
  if (editor) editor.setValue(value);
  else codeField.value = value;
  saveCode();
}

function saveCode() {
  try { localStorage.setItem(STORAGE_KEY, getCode()); }
  catch { /* Private browsing can disable localStorage. */ }
}

function updateCursor() {
  if (!editor) return;
  const cursor = editor.getCursor();
  document.querySelector("#cursor-position").textContent = `第 ${cursor.line + 1} 行，第 ${cursor.ch + 1} 欄`;
}

function createEditor() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) codeField.value = saved;
  } catch { /* The editor remains usable without localStorage. */ }

  if (window.CodeMirror) {
    editor = CodeMirror.fromTextArea(codeField, {
      mode: { name: "python", version: 3, singleLineStringErrors: true },
      theme: "material-darker",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      smartIndent: true,
      lineWrapping: false,
      matchBrackets: true,
      autoCloseBrackets: true,
      extraKeys: { Tab: (cm) => cm.replaceSelection("    ", "end") },
    });
    editor.on("change", saveCode);
    editor.on("cursorActivity", updateCursor);
    updateCursor();
  } else {
    codeField.addEventListener("input", saveCode);
    appendOutput("語法上色編輯器載入失敗，仍可使用基本文字編輯。\n");
  }
}

function startWorker() {
  usingFallback = false;
  mainPyodide = null;
  ready = false;
  running = false;
  setButtons();
  setStatus("載入 Python 中…");
  worker = new Worker("./worker.js", { type: "module" });
  worker.onmessage = ({ data }) => {
    if (data.type === "ready") {
      ready = true;
      setStatus(`Python 已就緒 · Pyodide ${data.version}`, "ready");
      if (output.textContent === "正在載入 Python 執行環境…") output.textContent = "Python 已就緒。\n";
      setButtons();
    } else if (data.type === "loading") {
      setStatus(data.message);
    } else if (data.type === "output" && data.runId === runId) {
      appendOutput(data.text);
    } else if (data.type === "done" && data.runId === runId) {
      running = false;
      setStatus("Python 已就緒", "ready");
      setButtons();
    } else if (data.type === "error") {
      if (data.runId && data.runId !== runId) return;
      if (!data.runId) {
        startMainThread(data.message);
        return;
      }
      appendOutput(`錯誤：${data.message}\n`);
      running = false;
      if (data.runId) setStatus("Python 已就緒", "ready");
      else setStatus("Python 載入失敗", "error");
      setButtons();
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    startMainThread(event.message);
  };
}

async function startMainThread(reason) {
  if (usingFallback) return;
  usingFallback = true;
  worker?.terminate();
  worker = null;
  ready = false;
  running = false;
  setButtons();
  setStatus("切換至相容模式…");
  try {
    const { loadPyodide } = await import("./vendor/pyodide/pyodide.mjs");
    const indexURL = new URL("./vendor/pyodide/", location.href).href;
    mainPyodide = await loadPyodide({
      indexURL,
      packageBaseUrl: "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/",
    });
    ready = true;
    setStatus(`Python 已就緒 · 相容模式`, "ready");
    output.textContent = "Python 已就緒。相容模式無法中途停止執行中的程式。\n";
    setButtons();
  } catch (error) {
    appendOutput(`Worker 載入失敗：${reason}\n相容模式也無法啟動：${error}\n`);
    setStatus("Python 載入失敗", "error");
  }
}

async function runInMainThread(id, code, stdin) {
  const inputLines = stdin ? stdin.replace(/\r\n?/g, "\n").split("\n") : [];
  mainPyodide.setStdout({ batched: (line) => appendOutput(`${line}\n`) });
  mainPyodide.setStderr({ batched: (line) => appendOutput(`${line}\n`) });
  mainPyodide.setStdin({ stdin: () => inputLines.length ? `${inputLines.shift()}\n` : null, autoEOF: false });
  try {
    await mainPyodide.loadPackagesFromImports(code);
    await mainPyodide.runPythonAsync(code);
  } catch (error) {
    appendOutput(`錯誤：${error}\n`);
  } finally {
    if (id === runId) {
      running = false;
      setStatus("Python 已就緒 · 相容模式", "ready");
      setButtons();
    }
  }
}

function runCode() {
  if (!ready || running) return;
  running = true;
  runId += 1;
  output.textContent = `>>> 執行 main.py\n`;
  setStatus("執行中…");
  setButtons();
  const code = getCode();
  const stdin = document.querySelector("#stdin-input").value;
  if (usingFallback) runInMainThread(runId, code, stdin);
  else worker.postMessage({ type: "run", runId, code, stdin });
}

function stopCode() {
  if (!running) return;
  worker.terminate();
  worker = null;
  appendOutput("\n[已停止執行；正在重新載入 Python]\n");
  startWorker();
}

function downloadCode() {
  const url = URL.createObjectURL(new Blob([getCode()], { type: "text/x-python;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "main.py";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

createEditor();
startWorker();
runButton.addEventListener("click", runCode);
stopButton.addEventListener("click", stopCode);
document.querySelector("#clear-button").addEventListener("click", () => { output.textContent = ""; });
document.querySelector("#new-button").addEventListener("click", () => {
  if (getCode() && !confirm("清空目前程式碼並建立新檔案？")) return;
  setCode("");
  editor?.focus();
});
document.querySelector("#open-button").addEventListener("click", () => fileInput.click());
document.querySelector("#download-button").addEventListener("click", downloadCode);
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (file) setCode(await file.text());
  fileInput.value = "";
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    runCode();
  }
});
