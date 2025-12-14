import React, { useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    TextField,
    IconButton,
    Button,
    FormControl,
    Divider,
    Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const SetDebugWatch = ({
    pythonFileNames,
    debugFileNames,
    setDebugFileNames,
    watchExpressions,
    setWatchExpressions,
}) => {
    // --- 1. Cleanup Effect ---
    useEffect(() => {
        let debugFilesChanged = false;
        let watchExprChanged = false;

        // A. Clean debugFileNames
        const validDebugFiles = debugFileNames.filter((fileName) => pythonFileNames.includes(fileName));

        if (validDebugFiles.length !== debugFileNames.length) {
            debugFilesChanged = true;
        }

        // B. Clean watchExpressions
        const newWatchExpressions = { ...watchExpressions };
        const currentKeys = Object.keys(newWatchExpressions);

        currentKeys.forEach((key) => {
            if (key !== "" && !validDebugFiles.includes(key)) {
                delete newWatchExpressions[key];
                watchExprChanged = true;
            }
        });

        if (debugFilesChanged) {
            setDebugFileNames(validDebugFiles);
        }

        if (watchExprChanged) {
            setWatchExpressions(newWatchExpressions);
        }
    }, [pythonFileNames, debugFileNames, watchExpressions, setDebugFileNames, setWatchExpressions]);

    // --- 2. Handlers ---

    const handleFileToggle = (fileName) => {
        const currentIndex = debugFileNames.indexOf(fileName);
        const newDebugFiles = [...debugFileNames];

        if (currentIndex === -1) {
            newDebugFiles.push(fileName);
        } else {
            newDebugFiles.splice(currentIndex, 1);
        }
        setDebugFileNames(newDebugFiles);
    };

    const cloneWatchMap = (map) => {
        const newMap = {};
        Object.keys(map).forEach((key) => {
            newMap[key] = [...map[key]];
        });
        return newMap;
    };

    const handleAddRow = () => {
        const newMap = cloneWatchMap(watchExpressions);
        if (!newMap[""]) newMap[""] = [];
        newMap[""].push("");
        setWatchExpressions(newMap);
    };

    // New: Duplicate Handler
    const handleDuplicateRow = (scope, index) => {
        const newMap = cloneWatchMap(watchExpressions);
        if (newMap[scope]) {
            const expressionToCopy = newMap[scope][index];
            // Insert copy immediately after the original
            newMap[scope].splice(index + 1, 0, expressionToCopy);
        }
        setWatchExpressions(newMap);
    };

    const handleDeleteRow = (scope, index) => {
        const newMap = cloneWatchMap(watchExpressions);
        if (newMap[scope]) {
            newMap[scope].splice(index, 1);
        }
        setWatchExpressions(newMap);
    };

    const handleExpressionChange = (scope, index, newValue) => {
        const newMap = cloneWatchMap(watchExpressions);
        if (newMap[scope]) {
            newMap[scope][index] = newValue;
        }
        setWatchExpressions(newMap);
    };

    const handleScopeChange = (oldScope, index, newScope) => {
        if (oldScope === newScope) return;

        const newMap = cloneWatchMap(watchExpressions);
        const expressionToMove = newMap[oldScope][index];

        // Remove from old
        newMap[oldScope].splice(index, 1);

        // Add to new
        if (!newMap[newScope]) newMap[newScope] = [];
        newMap[newScope].push(expressionToMove);

        setWatchExpressions(newMap);
    };

    // --- 3. Flatten Data ---
    const flattenedRows = useMemo(() => {
        const rows = [];

        // Sort keys: Files first, then Global ("")
        const fileKeys = Object.keys(watchExpressions)
            .filter((k) => k !== "")
            .sort();
        const orderedKeys = [...fileKeys, ""];

        orderedKeys.forEach((scope) => {
            const expressions = watchExpressions[scope];
            if (Array.isArray(expressions)) {
                expressions.forEach((expr, idx) => {
                    rows.push({
                        scope: scope,
                        expression: expr,
                        originalIndex: idx,
                        key: `${scope}-${idx}`,
                    });
                });
            }
        });
        return rows;
    }, [watchExpressions]);

    return (
        <Box sx={{ width: "calc(100% - 2px - 10px)", margin: "5px" }}>
            {/* --- Debug Targets --- */}
            <Typography variant="h6" gutterBottom>
                Debug Targets
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
                <FormGroup>
                    {pythonFileNames.map((fileName) => (
                        <FormControlLabel
                            key={fileName}
                            control={
                                <Checkbox
                                    checked={debugFileNames.includes(fileName)}
                                    onChange={() => handleFileToggle(fileName)}
                                />
                            }
                            label={fileName}
                        />
                    ))}
                    {pythonFileNames.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            No Python files available.
                        </Typography>
                    )}
                </FormGroup>
            </Paper>

            <Divider sx={{ my: 3 }} />

            {/* --- Watch Expressions --- */}
            <Typography variant="h6" gutterBottom>
                Watch Expressions
            </Typography>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "action.hover" }}>
                            <TableCell width="30%">Context (Scope)</TableCell>
                            <TableCell width="60%">Expression</TableCell>
                            <TableCell width="10%" align="center">
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {flattenedRows.map((row) => (
                            <TableRow key={row.key}>
                                {/* Scope */}
                                <TableCell>
                                    <FormControl fullWidth size="small" variant="standard">
                                        <Select
                                            value={row.scope}
                                            onChange={(e) =>
                                                handleScopeChange(row.scope, row.originalIndex, e.target.value)
                                            }
                                            disableUnderline
                                            displayEmpty
                                            renderValue={(selected) => {
                                                if (selected === "") return <em>(global)</em>;
                                                return selected;
                                            }}
                                        >
                                            <MenuItem value="">
                                                <em>(global)</em>
                                            </MenuItem>
                                            {debugFileNames.map((file) => (
                                                <MenuItem key={file} value={file}>
                                                    {file}
                                                </MenuItem>
                                            ))}
                                            {!debugFileNames.includes(row.scope) && row.scope !== "" && (
                                                <MenuItem value={row.scope}>{row.scope}</MenuItem>
                                            )}
                                        </Select>
                                    </FormControl>
                                </TableCell>

                                {/* Expression */}
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        variant="standard"
                                        placeholder="e.g. my_variable + 1"
                                        value={row.expression}
                                        onChange={(e) =>
                                            handleExpressionChange(row.scope, row.originalIndex, e.target.value)
                                        }
                                        InputProps={{ disableUnderline: true }}
                                    />
                                </TableCell>

                                {/* Actions: Duplicate & Delete */}
                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                    <Tooltip title="Duplicate">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDuplicateRow(row.scope, row.originalIndex)}
                                            sx={{ mr: 1 }}
                                        >
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteRow(row.scope, row.originalIndex)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}

                        {flattenedRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                    No active watches. Click + to add one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Add Button */}
                <Box sx={{ p: 1, display: "flex", justifyContent: "center", borderTop: 1, borderColor: "divider" }}>
                    <Button startIcon={<AddIcon />} onClick={handleAddRow} variant="text" fullWidth>
                        Add Watch Expression
                    </Button>
                </Box>
            </TableContainer>
        </Box>
    );
};

export default SetDebugWatch;
