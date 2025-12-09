Prompts for making a instrumentation debugger for CircuitPython.

write an async browser js function to scan the existing python files, and store the modified version to original directory.
the arguments, steps and rules are given as below.
Parameters

root_dir: a file system folder handle that provide the root directory
python_file_names: a list of strings, where each string is the file name of file that will be affected. got from get_all_python_files()
debug_file_names: a list of strings, where each string is the file name of file that will be processed. sub set of python_file_names
watch_expressions: a map form string to list of strings, where key is the file name which can be empty, and in the list each string is a python expression that the user want to evaluate during the debug process.

Steps:

1, generate debug block

given and generate debug block given the example as below
watch_expressions:
```
["t", "math.sin(t)", "cos(t)"]
```
debug block
```
if not _dbg.jump_to_breakpoint:
    ide_debug_data = {
        "time": _dbg.time_now() - _dbg.timestamp,
        "file": "file_name.py",
        "line": 1,
        "watch": {},
    }
    try:
        ide_debug_data["watch"]["t"] = str(t)
    except:
        ide_debug_data["watch"]["t"] = "`t` cannot be evaluated"
    try:
        ide_debug_data["watch"]["math.sin(t)"] = str(math.sin(t))
    except:
        ide_debug_data["watch"]["math.sin(t)"] = "`math.sin(t)` cannot be evaluated"
    try:
        ide_debug_data["watch"]["cos(t)"] = str(cos(t))
    except:
        ide_debug_data["watch"]["cos(t)"] = "`cos(t)` cannot be evaluated"
    _dbg.jump_to_breakpoint = bool(input("<CV>" + str(ide_debug_data) + "</CV>"))
    _dbg.timestamp = _dbg.time_now()
```

if the file "file_name.py" is a place holder that should hold the file name to the file

"line" is the code row number that I am going to explain later.
here in `"line": 1,` the number is placeholder

where each watched expression is a try except block.
in watch_expressions, take the expressions from key == "" and key == file_name to this file.
key == "" in watch_expressions means shared across all files

If I have watch_expressions = {"": ["x"], "code.py": ["y"], "a_file.py": ["z"]},  code.py will watch ["x", "y"] but not "z"
2, read files

read all python files in python_file_names with respect to the root directory,

store the files in ram variable together with their file name, use a map to store it in ram
key is the file name, root-relative (starting with /).
value is a sting containing the content of the code.

3, Identify code rows (using Tree-sitter)

For each code file in debug_file_names, use the tree-sitter library with the tree-sitter-python grammar to identify valid "code rows".

Process:

Parse: Create a syntax tree from the file content.

Traverse: Walk the tree to identify "Statement" nodes. You must traverse into nested blocks (e.g., inside functions, if-statements, loops) to find all executable statements.

Target Nodes: Look for nodes that represent executable statements. Common types in tree-sitter-python include:

- expression_statement
- assignment
- return_statement
- if_statement, for_statement, while_statement
- try_statement, with_statement
- function_definition, class_definition
- break_statement, continue_statement, pass_statement
- match_statement

Filtering Rules:

- Docstrings: Ignore expression_statement nodes if their only child is a string node.
- Decorators: If a function_definition or class_definition is the child of a decorated_definition node, use the decorated_definition node as the target. The "code row" is the start row of the first decorator.
- Exclusions: Do not mark the following node types as code rows (even if they appear as children): else_clause, elif_clause, except_clause, finally_clause, case_clause. (We only debug the statements inside their bodies, or the parent statement that triggers them).

Output:

Store the start row number (1-indexed) of each valid node identified above.

If a node spans multiple physical lines (e.g., a multi-line list assignment or a decorated function), strictly use the start row of the node.

These row numbers represent the "Code Rows" where debug blocks will be inserted in Step 5.

4, identify breakpoint rows

if a code row has comment mentioning breakpoints, mark it. example could be
with word `breakpoint`
```
print("hello world") # breakpoint
```

with word `break point`
```
print("hello world") # break point
```
with random casing, please first convert to all lower
```
print("hello world") # BrEAkPoinT
```
with random number of space, please first trim on both side
```
print("hello world") #     breakpoint
```

if on a multi-line code row, it is the complete multi-line code row is a breakpoint row, not the physical row
```
print(
	"hello",
	"world",
) # breakpoint
```
if marked on a non-code row, ignore


5, add debug block


terms
a "step debug block" is what we have in the step 1
a "breakpoint debug block" is the "step debug block" but without the if condition on the first row, and also the body don't have that indention from the removed if

for each of the code file in debug_file_names,
add "breakpoint debug block" before each the breakpoint row.with the current file, line, and watch blocks.
see more rules in step 1

add "step debug block" before each code row that are not breakpoint row

in both situations
the indention of the added debug block should match the indention of the code row.
the line number should be the physical row number on the original code file of the code row,
if multi-line code row, use the row number of the first physical row.

6, change imports
for each of the code file in python_file_names, if the imports are importing modules from python_file_names,
change the imports to include prefix `ide_debug_` (to match step 10)
for example
if there is a `functions.py` in debug_file_names


`from functions import index_to_time`
will be modified to
`from ide_debug_functions import index_to_time`

`import functions`
will be modified to 
`import ide_debug_functions as functions`

not considering dot imports as all modified files are on the root level.

7, add dependencies

at the beginning of each code file in ram,
add this at the begging
```
import ide_debug_state as _dbg
```

these are dependencies of the debug block

8, add initial states

at the beginning of `/code.py` or `/main.py` (check `/code.py` first, only use `/main.py` if `/code.py` doesn't exisits)
add the following
```
_dbg.timestamp = _dbg.time_now()
_dbg.jump_to_breakpoint = False
```

9, cleanup
remove all files in the file system starting with `ide_debug_`
all files, folders, and subfolders etc.
this step should be a stand alone function outside the main process to be used else where
that use root directory as parameter.
This step calls that function
10, write to folder
write the following module to file `/ide_debug_state.py`
```
try:
    from time import monotonic as _time_now
    time_unit = 1000
except ImportError:
    from time import ticks_ms as _time_now
    time_unit = 1

timestamp = 0
jump_to_breakpoint = False

def time_now():
    return _time_now() * time_unit
```

and then, write the modified code from python_file_names to file system.
each file should be beside the original file, and the the new file name should be "ide_debug_" + original file name

---
Extra 1
write a js function that
called get_all_python_files

given a root directory handle
return a list of file name of all python files from the root directory, not going into subfolders.

and any file starts with `.`, hidden files.
skip `/boot.py` file
skip any file started with`ide_debug_`