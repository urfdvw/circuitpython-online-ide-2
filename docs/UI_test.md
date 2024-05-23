# Manual test
Here is the list of manual test steps and expected behaviors.
This list grows as test steps are recorded when creating PRs.

## Flex Layout
- opening Editor tab order
    - [ ] when there is "initial_tabset", always open editor tab to "initial_tabset"
    - [ ] else when there is active tab, open editor in active tab
    - [ ] else open in the first tabset.

## Folder View
- content list
    - [ ] When a file name is very long and contains multiple words connected with ` ` or `-`, the file name can be wrapped to multiple line, and the height of the item is adapting to the height of text.

## Serial Console
- Serial communication, hardware level
    - [ ] connect to device
    - [ ] get data from mcu
    - [ ] send data to mcu
    - [ ] switch connect to the same/another device
    - [ ] show disconnect info when unplug
    - [ ] reconnect after unplug then replug
- tweaks
    - [ ] auto send ctrl-c then ctrl-d on connect, to restart the script.
- UI
    - [ ] terminal size react to tab size
- Config
    - [ ] terminal font size react to settings

## Channel test
- [ ] visit http://localhost:5173/ to confirm dev and beta are not visible
- [ ] visit http://localhost:5173/?channel=beta to confirm that beta features are available
- [ ] visit http://localhost:5173/?channel=dev to confirm that dev and beta features are available