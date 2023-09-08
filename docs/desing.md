# Project Design

## Base Elements
The base elements are independent from each other,

- usefileSystem
    - talking to file system
- useSerial
    - talking to serial device
- useConfig
    - talking to local storage
- Layout
    - talking to the tab orgnizer

## Features
Features are based on the Base Elements.
They should not talk to each other directly.
Instead, interaction between the featues should be done by common Base Elements

Each Feature should include
- a tab contains all related UI
    - the tab creation factory is feed to Layout
- a json schema contains all configuration fields
    - feed to useConfig
- a menu row contains name and handler
- a help page 

Planned feature
- In 2.0
    - Folder View 
    - Raw Console
    - Editor
    - Help
    - Settings
    - Navigator
- 2.1 and After
    - Plotter
    - Fancy Console
    - Widgets
    - Backup dir
    - Global Search

# UI
## Menu Bar
- Open Feature Tab
- Physical Connections
- External Links

## Layout
- save layout in local storage under device ID (got from file API)
- if file does not exist any more, still create tab, but with error messgae.
    - can only close and relcate

## Status Bar
Showing the status of connections
- serial deviced: show connected or not
- dir handle: show open or not
- backup dir: show when open