# Library Management

This tool makes it easy to install and update the libraries your microcontroller needs, right inside the IDE.

[Video Tutorial](https://www.youtube.com/watch?v=pno0WYdwzSo)

## Prepare bundles

*Make sure the CIRCUITPY drive is open in the IDE before you start.*

The first time you use this tool,
you need to be connected to the internet.
Click the "DOWNLOAD" button at the top right to get the library bundles.
Once downloaded, they will stay in your browser, even if you close it.
Next time you open CircuitPython Online IDE, you won’t need to download them again.

If a newer version of the bundles is available,
you can click the "UPGRADE" button at the top right to get the latest one.
This step is optional, but keeping the bundles updated is recommended.

Note:
1. Bundles are saved in your browser’s cache. If you clear the cache, the bundles will be removed.
2. Once downloaded, you can use the bundles offline without internet.

## Use case: Auto Install

Click the button in the top left corner of the list.
The tool will read your Python code on the microcontroller
and automatically install the libraries it needs from the bundles.

This is the easiest and most common way to use the tool.
It’s great for trying example code
or focusing on writing your program while the tool handles the libraries.

Settings you can adjust:
- Clean up installed libs at the beginning of auto installation
    - Off: faster, but unused libraries may stay  
    - On: removes all libraries first, then installs what’s needed  

## Use case: Manual Install

The tool can also show you a list of all libraries in the bundles,
with the libraries you already have installed shown first.
You can use the search bar to quickly find what you need.

Each entry shows the following information:
- Check mark:  
    - Green means the installed version matches the bundle  
    - Orange means the installed version is different  
- Library name  
- GitHub icon: click to open the library’s GitHub page with documentation and examples  
- Version number  
- Bundle name  
- Action buttons: install, upgrade, or uninstall the library  

Note:
- Installing or upgrading a library will also install or upgrade its dependencies.  
- Uninstalling a library will only remove that single library.  

Settings you can adjust:
- Number of libraries per page

## Menu Options

- Refresh library list  
    - If you add or remove files directly on the CIRCUITPY drive,  
      the library list won’t update right away.  
      Use this option to refresh it manually.  
- Settings: open the library management settings  
- Help: open the help guide for library management  
