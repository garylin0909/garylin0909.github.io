/* Pyodide runs in a module Worker so user code cannot freeze the editor UI. */
import { loadPyodide } from "./vendor/pyodide/pyodide.mjs";
const PYODIDE_BASE = new URL("./vendor/pyodide/", self.location.href).href;
const PACKAGE_BASE = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
let pyodide = null;
let activeRunId = null;

async function initialize() {
  try {
    postMessage({ type: "loading", message: "下載 Pyodide 中…" });
    pyodide = await loadPyodide({ indexURL: PYODIDE_BASE, packageBaseUrl: PACKAGE_BASE });
    postMessage({ type: "ready", version: pyodide.version });
  } catch (error) {
    postMessage({ type: "error", message: String(error) });
  }
}

self.onmessage = async ({ data }) => {
  if (data.type !== "run" || !pyodide || activeRunId !== null) return;
  activeRunId = data.runId;
  const sendOutput = (text) => postMessage({ type: "output", runId: data.runId, text });
  const inputLines = data.stdin ? data.stdin.replace(/\r\n?/g, "\n").split("\n") : [];

  pyodide.setStdout({ batched: (line) => sendOutput(`${line}\n`) });
  pyodide.setStderr({ batched: (line) => sendOutput(`${line}\n`) });
  pyodide.setStdin({ stdin: () => inputLines.length ? `${inputLines.shift()}\n` : null, autoEOF: false });

  try {
    postMessage({ type: "loading", message: "檢查所需套件…" });
    await pyodide.loadPackagesFromImports(data.code);
    postMessage({ type: "loading", message: "執行中…" });
    await pyodide.runPythonAsync(data.code);
    postMessage({ type: "done", runId: data.runId });
  } catch (error) {
    postMessage({ type: "error", runId: data.runId, message: String(error) });
  } finally {
    activeRunId = null;
  }
};

initialize();
