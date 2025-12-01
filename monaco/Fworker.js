const params = new URL(self.location.href).searchParams;
const workerUrl = params.get('workerUrl'); // e.g. "modules/monaco/assets/editor.worker-Be8ye1pW.js"
if (!workerUrl) throw new Error('No worker specified!');
importScripts(decodeURIComponent(workerUrl));
globalThis.postMessage({ type: 'vscode-worker-ready' });
