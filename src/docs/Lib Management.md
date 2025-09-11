This tool will help install and upgrade dependent libraries on to the microcontroller without leaving the IDE.

## Prepare



### Step 1: Prepare bundles

If this is the first time you use the tool,
you will need to connect to the internet.
Click on the "DOWNLOAD" button on the right of step 1 to download the library bundles.
Once downloaded, they will stay there even if you close the browser,
So next time you visit CircuitPython Online IDE, you don't need to download them again.

If there is a more recent version,
you can click on on the "DOWNLOAD" button on the right of step 1 to download the latest version.

PS:
1. downloaded resources are stored in browser cache, so clear browser cache will remove downloaded library bundles.
2. You can use previous downloaded library bundles without internet.

### Step 2: Analyze Microcontrollers

To run this step microcontrollers need to be opened as a USB drive in the IDE.
If you see the folder view on the left is showing contents on your microcontroller,
it means you are safe to proceed.

This step will analyze the files on your micro controller,
so that the IDE can see which libraries are already installed.

Click on the "ANALYZE" button on the right of step 2.
Once it is down, you will see a list of libraries show below in the list,
where installed libraries has a check mark on the left.

After you did any manual file operations on the CIRCUITPY drive,
Please reclick on the "ANALYZE" button to refresh.

## Use case: Auto Install

Click on the button on the top left corner of the list.
The tool will analyze your python code on the microcontroller,
and then install all necessary libraries from the bundles,

This should be the mostly used case.

## Use case: Manual Install

