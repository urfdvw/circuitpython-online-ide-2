/**
 * Resolve after `ms` milliseconds. Single source of truth — other modules
 * (fileSystemUtils, installedLibUtils, useSerial/utils) re-export it so their
 * existing import sites keep working.
 */
export function sleep(ms = 0) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
