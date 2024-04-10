import global_config_schema from "./global.json";
import editor_config_schema from "./editor.json";
import serial_console_config_schema from "./serial_console.json";
import plotter_config_schema from "./plot.json";
import backup_config_schema from "./backup.json";
const schemas = [
    global_config_schema,
    editor_config_schema,
    serial_console_config_schema,
    plotter_config_schema,
    backup_config_schema,
];
export default schemas;
