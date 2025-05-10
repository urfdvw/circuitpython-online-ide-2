- To open the **Backup** tab: Menu -> Tools -> Backup
- To open **Backup** settings: Settings -> Backup
- To connect to the backup folder directly: Menu -> Connect -> Backup Folder

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

### Manual Backup
- Navigate to the **Backup** tab.
- Select "Open Backup Directory" to link to the backup folder.
    - The tab will indicate a change in connection status once the directory is linked.
- Click on "Manual Backup" to initiate the backup process.
- The timestamp of the most recent backup will be displayed.

### Periodic Backup
- Connect to the backup folder either through the **Backup** tab or directly from the **Connect** menu.
- To enable periodic backup, navigate to **Backup** settings and check "Auto backup by period."
- Adjust the backup period in **Backup** settings as required.

## Notes
- It is strongly recommended to backup to a local folder with cloud synchronization or Git enabled.
    - Enabling GitHub Desktop allows for easy viewing of changes.
- Backup operations may consume a significant amount of computational resources on low-spec computers.
- Files removed or overwritten by the backup process are not recoverable.
