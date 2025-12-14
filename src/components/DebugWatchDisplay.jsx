import React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";

/**
 * DebugWatchDisplay
 * * Displays a map of debug variables in a table format.
 * - Left Column (Key): Packs to content size (variable name).
 * - Right Column (Value): Expands to fill remaining width.
 * - All text is rendered in monospace.
 * * @param {Object} props
 * @param {Map<string, string> | Object} props.variables - A Map or Object containing variable names and values.
 */
const DebugWatchDisplay = ({ variables }) => {
    // Helper to convert input (Map or Object) to an array of [key, value] entries
    const entries = React.useMemo(() => {
        if (!variables) return [];
        if (variables instanceof Map) {
            return Array.from(variables.entries());
        }
        return Object.entries(variables);
    }, [variables]);

    return (
        <TableContainer component={Paper} elevation={1}>
            <Table size="small" aria-label="debug watch table">
                <TableBody>
                    {entries.map(([key, value]) => (
                        <TableRow key={key} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                            {/* Left Column: Key (Packs to content) */}
                            <TableCell
                                component="th"
                                scope="row"
                                sx={{
                                    fontFamily: "monospace",
                                    width: "1%", // Forces column to be as small as possible
                                    maxWidth: "100px", // Max width for key column
                                    fontWeight: "bold",
                                    color: "primary.main",
                                    verticalAlign: "top", // Aligns to top if value is multi-line
                                    pr: 3, // Right padding for visual separation
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    p: 0, // Remove padding to let tooltip cover cell
                                }}
                            >
                                <Tooltip 
                                    title={key}
                                    slotProps={{
                                        popper: {
                                            modifiers: [
                                                {
                                                    name: "offset",
                                                    options: {
                                                        offset: [0, 0],
                                                    },
                                                },
                                            ],
                                        },
                                    }}
                                    sx={{
                                        display: "block",
                                        width: "100%",
                                        height: "100%",
                                    }}
                                >
                                    <span style={{
                                        display: "block",
                                        width: "100%",
                                        height: "100%",
                                        padding: "inherit",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}>{key}</span>
                                </Tooltip>
                            </TableCell>

                            {/* Right Column: Value (Expands to rest of width) */}
                            <TableCell
                                align="left"
                                sx={{
                                    fontFamily: "monospace",
                                    wordBreak: "break-all", // Ensures long strings/hashes wrap nicely
                                    color: "text.secondary",
                                }}
                            >
                                {value}
                            </TableCell>
                        </TableRow>
                    ))}

                    {entries.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ color: "text.disabled", fontStyle: "italic" }}>
                                {/* No variables to watch */}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default DebugWatchDisplay;
