This tool will help install and upgrade dependent libraries on to the microcontroller without leaving the IDE.

## Prepare bundles

If this is the first time you use the tool,
you will need to connect to the internet.
Click on the "DOWNLOAD" button on the top right to download the library bundles.
Once downloaded, they will stay there even if you close the browser,
So next time you visit CircuitPython Online IDE, you don't need to download them again.

If there is a more recent version of library bundles,
you can click on on the "UPGRADE" button on the top right to download the latest version.
Even though this step is optional, it is suggested to keep the bundle up to date.

PS:
1. downloaded resources are stored in browser cache, so clearing browser cache will remove downloaded library bundles.
2. You can use previous downloaded library bundles without internet.

## Use case: Auto Install

Click on the button on the top left corner of the list.
The tool will analyze your python code on the microcontroller,
and then install all necessary libraries from the bundles.

This should be the mostly used case.
Can be suitable for testing out example code,
or just focusing on code construction and let the tool take care of the dependencies.

related settings
- Clean up installed libs at the beginning of auto installation
    - turning this off will speed up the installation process
    - turning this on can clean up unused libraries

## Use case: Manual Install

The tool will show all the libs in the bundles as a list,
where installed libs are shown first.
Users can also use the search bar to filter the list.

For each library shown on the list,
green check mark means the installed library version is the same as the version in the bundle.
If there is a different version in the bundle, the checkmark will become orange.
Users can manually choose to install/upgrade or uninstall libraries by buttons on the right.

Note that installing or upgrade will also install/upgrade dependencies,
while uninstalling a library will only uninstall itself.

related settings
- Number of libraries per page

## Menu Options

- Refresh library list
    - After you did any manual file operations on the CIRCUITPY drive, 
    the installation status are not going to be reflected immediately on the library list. 
    This option is for refreshing the list manually.
- Settings: go to library management related settings
- help: go to library management related help documentation