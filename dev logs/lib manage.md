
given a lib/libs
- names bundle(libs) return libs that are in the bundles
- names dep(lib) dependencies of all lib/libs
    - treat dependency and external dependency the same
    - only return bundle(libs) in each recursion

existing libs
- names libs_on_disk: top level names in /libs folder
- names_w_ver libs_installed: bundle(libs_on_disk)
    - version from installed package

needed libs
- names libs_in_code: libs that are imported in python code
- names libs_imported: bundle(libs_in_code)
- names_w_ver libs_needed: dep(libs_imported)
    - versions from bundles

supported actions
- auto: reinstall all libs used in the code with dependencies
    - remove libs_installed from MCU
    - add libs_needed to MCU from bundle
    - warn if libs_needed_ext not on MCU
- manual:
    - install/upgrade lib_selected (same)
        - remove dep(lib_selected) if exist
        - add dep(lib_selected) to MCU from bundle
    - uninstall lib_selected
        - remove lib_selected only
            - will not go back to check unused dependencies, use auto function instead.
        
display
- display all libs in both bundles
- item
    - name
    - version or cur_version -> new_version
    - bundle (Icon)
    - instal status
    - action buttons
- action buttons
    - uninstall: if in libs_installed
    - upgrade: if in libs_installed AND version different from bundle
    - install: if not in libs_installed
- instal status: check mark to indicate installation
    - green means latest version
    - yellow means upgradable
- sort by
    - installation: green -> yellow -> not installed
    - name
    - bundle: Adafruit -> Community

menu
- refresh
    - actually, auto refresh at the start, then refresh on demand
- auto
- hamburger
    - help
    - config

config
- clear unused libs in auto mode, boolean


data flow
- const repo names
- repo names -> asset links
    - json
    - zip
        - int version number
- store into local storage
    - json combined
    - for each version
        - zip combined
- read
    - given a name
    - if it is a top level file, return an emulated file handle
    - if it is a top level folder, return an emulated file handle
    - then use copy folder util to copy to real directory

work flow and exceptions
- on load, unconditional: get resource
    - get asset lists from git api
        - if get failed
    - check if resources are cached and up to date
        - check time stamp
            - if not exist
                - continue
            - if not the same as assets
                - dialog
                    - continue if confirm
            - if same as assets
                - stop get resource process
    - get JSON and zips
        - if get failed
            - dialog: proxy error, upload bundle manually
            - stop get resource process
- unconditional: get mcu info
    - get cpy version of the MCU
        - if cpy version not in bundle list
            - error, cpy version not supported
    - get installed libs
    - if cannot get MCU status
        - dialog not supported
        - stop get resource process
        - block all features
- on button clicked
    - check if cpy version has data in bundle
        - dialog manual upload
    - get imported libs / selected ; libs
    - get list of libs to be installed: imports + dependencies
    - check
        - time stamp exist (which means the resource is downloaded)