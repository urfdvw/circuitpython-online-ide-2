async function collectPythonTopLevelImports(rootHandle) {
    const importSet = new Set();
    const validExtensions = ['.py', '.PY', '.python', '.PYTHON'];

    async function traverseDirectory(dirHandle) {
        for await (const [name, handle] of dirHandle.entries()) {
            if (handle.kind === 'file' && validExtensions.some(ext => name.endsWith(ext))) {
                const file = await handle.getFile();
                const text = await file.text();
                extractImports(text, importSet);
            } else if (handle.kind === 'directory') {
                await traverseDirectory(handle);
            }
        }
    }

    function extractImports(fileContent, importSet) {
        const lines = fileContent.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('import ')) {
                const parts = trimmed
                    .replace(/^import\s+/, '')
                    .split(',')
                    .map(p => p.split(' as ')[0].split('.')[0].trim());

                parts.forEach(lib => {
                    if (lib) importSet.add(lib);
                });
            } else if (trimmed.startsWith('from ')) {
                const match = trimmed.match(/^from\s+([a-zA-Z_][\w\.]*)\s+import/);
                if (match) {
                    const topLib = match[1].split('.')[0];
                    if (topLib) importSet.add(topLib);
                }
            }
        }
    }

    await traverseDirectory(rootHandle);
    return Array.from(importSet);
}

export { collectPythonTopLevelImports }