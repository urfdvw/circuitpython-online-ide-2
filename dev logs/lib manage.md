
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