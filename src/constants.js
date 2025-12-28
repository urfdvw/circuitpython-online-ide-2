// Serial Constants
export const TITLE_START = "\x1B]0;";
export const TITLE_END = "\x1B\\";
export const CTRL_C = "\x03";
export const CTRL_D = "\x04";
export const LINE_END = "\x0D";
export const CV_JSON_START = "<CV>"; // ConnectedVariableJson start
export const CV_JSON_END = "</CV>";
export const RARE = "\x1F";
export const SEPARATOR = RARE + "\n" + RARE;
export const SOFT_REBOOT = "soft reboot";
export const DEBUG_OUT_START = "\x1b[?1049hD";
export const DEBUG_OUT_END = "D\x1b[?1049l";
export const DEBUG_START = "==== Start Debugging ===="
export const DEBUG_END = "==== End Debugging ===="
export const DEBUG_SIGNAL_S = "[S]"
export const DEBUG_SIGNAL_CO = "[CO]"
export const DEBUG_SIGNAL_CW = "[CW]"

// Editor
export const FILE_EDITED = "⚝";