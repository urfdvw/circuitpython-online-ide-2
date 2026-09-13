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

`compareFolders` returns `complete` and `unreadable` alongside its three difference
arrays. An unreadable file or subtree is excluded from differences on both sides;
it must not be presented as missing. Consumers must show the incomplete status.

Mounted-drive mutations retain a 200 ms compatibility pause pending real-board
verification. Serial handles use their own REPL sequencing and do not add it.
