
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

work flow

- prepare request
    - get cpy version of the MCU
        - error stop if cpy version cannot be get
    - get asset lists from git api
        - error stop if cpy version not in assets list
            - prompt to upload bundle
        - error stop if cannot get asset lists
            - prompt to upload bundle
    - get bundle versions from the asset lists
- prepare files
    - if lib zip in local storage
        - get cached bundle version
        - if upgradable
            - prompt asking if user want to upgrade
    - else
        - download bundle zip and json
    - error stop if cannot download bundle zip and json
        - prompt to upload bundle