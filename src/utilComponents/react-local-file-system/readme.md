# File-system UI

FolderView and its helpers accept native browser handles or the serial handles in
`src/serialFs`. Serial sources disable polling because each read interrupts board code.

File reads never create missing files. `path2Handles` creates entries by default;
pass `create: false` for lookups and specify `treatLastAsFile` or
`treatLastAsDirectory` when the entry type is known.

Copy, move, rename, and delete propagate failures to their callers. The UI owns
error messages and loading indicators. `writeFileText` is the interactive save
exception: it displays an error and returns a success boolean, which callers must
check before marking an editor saved.

The tests in `test/fileSystem.test.js` and `test/fileSafety.test.js` exercise these
helpers using a fake CircuitPython device that executes the generated Python.
