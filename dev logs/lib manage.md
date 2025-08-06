
given a lib/libs
- names dep(lib) dependencies of all lib/libs

existing libs
- names libs_on_disk: top level names in /libs folder
- names_w_ver libs_installed: libs_on_disk but only the ones found in bundles

needed libs
- names libs_in_code: libs that are imported in python code
- names_w_ver libs_imported: libs_in_code but only the ones found in bundles
- names_w_ver libs_needed: dep(libs_imported)
- names libs_needed_ext: all external dependencies of libs_needed

supported actions
- auto: reinstall all used libs with dependencies
    - remove libs_installed from MCU
    - add libs_needed to MCU from bundle
    - warn if libs_needed_ext not on MCU
- manual:
    - install/upgrade (same)
        - remove dep(lib) if exist
        - add dep(lib) to MCU from bundle
    - uninstall
        - remove lib only
            - will not go back to check unused dependencies, use auto function instead.
        

display
- display all libs in the bundle
- context menu
    - uninstall: if in libs_installed
    - upgrade: if in libs_installed AND version different from bundle
    - install: if not in libs_installed
- check mark to indicate installation
    - green means latest version
    - yellow means upgradable
