## Introduction

When working directly with code files on the microcontroller,
leveraging backup tools such as cloud storage or version control systems like Git proves challenging.
Manual file copying isn't the optimal approach.
The "Backup" feature within the CircuitPython Online IDE offers a convenient solution to this issue.

Aside from the "CircuitPy" drive located on the microcontroller,
users have the option to open an additional backup folder on their computer.
The IDE will automatically copy all files from the CircuitPy drive to the backup folder,
either periodically or upon request.

## How to Use

### Open Folders
You can open folders from the tab toolbar or click on the **Open Folder** button.
- **Microcontroller Folder**
    - This is the folder on the **Folder View**, which you mainly work on.
    - This should be the removable drive of the microcontroller
- **Computer Folder**
    - This is the folder stores backup files
    - This should be a local folder on your computer

### View Differences
To check the difference before backup or recover,
you can click on the **View Diff** button in the tab toolbar.
File path and rows edited will show below in the tab.

### Backup
- Please make sure both Folders are opened, and view difference if necessary.
- In the tab toolbar, click on **Sync** -> **Backup to Computer** to initiate the backup process.
- The timestamp of the most recent backup will be displayed.

### Periodic Backup
- To enable periodic backup, navigate to **Backup** settings and check "Auto backup by period."
- Adjust the backup period in **Backup** settings as required.
- Periodic back up only happens when the **Backup** tab is open.

### Recover
- Please make sure both Folders are opened, and view difference if necessary.
- In the tab toolbar, click on **Sync** -> **Recover from Computer** to initiate the backup process.

## Notes
- It is strongly recommended to backup to a local folder with cloud synchronization or Git enabled.
- Backup operations may consume a significant amount of computational resources on low-spec computers.
- Files removed or overwritten by the backup or recover process are not recoverable.
