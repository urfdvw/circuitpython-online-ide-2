import LibCardMUI from "../utilComponents/LibCardMUI";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Box, Stack, TextField, InputAdornment, Typography, Button, Divider, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export default function PagedLibCards({ libCards = [], itemsPerPage = 20, autoInstallHandler }) {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const listRef = useRef(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return libCards;
        return libCards.filter((card) => {
            const fields = [card?.libDisplayName, card?.repoName, card?.abbr, card?.libObj?.pypi_description];
            return fields.some((f) =>
                String(f || "")
                    .toLowerCase()
                    .includes(q)
            );
        });
    }, [libCards, query]);

    // Sort: installedVersion (present first) -> libDisplayName
    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            const aHas = a?.installedVersion != null;
            const bHas = b?.installedVersion != null;
            if (aHas !== bHas) return aHas ? -1 : 1;

            const aName = (a?.libDisplayName || "").toString();
            const bName = (b?.libDisplayName || "").toString();
            return aName.localeCompare(bName, undefined, {
                sensitivity: "accent",
                numeric: true,
            });
        });
        return arr;
    }, [filtered]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / Math.max(1, itemsPerPage)));

    // Keep page in range if dataset changes
    useEffect(() => {
        setPage((p) => Math.min(p, totalPages - 1));
    }, [totalPages]);

    const start = page * itemsPerPage;
    const end = Math.min(start + itemsPerPage, sorted.length);
    const pageItems = sorted.slice(start, end);

    const scrollListTop = () => {
        if (listRef.current) {
            listRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handlePrev = () => {
        setPage((p) => {
            const next = Math.max(0, p - 1);
            // scroll immediately for snappy UX
            scrollListTop();
            return next;
        });
    };

    const handleNext = () => {
        setPage((p) => {
            const next = Math.min(totalPages - 1, p + 1);
            scrollListTop();
            return next;
        });
    };

    const handleSearchChange = (e) => {
        setQuery(e.target.value);
        setPage(0);
    };

    const handleClearSearch = () => {
        setQuery("");
        setPage(0);
        // optional: scroll to top when clearing
        scrollListTop();
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            {/* Top bar: Search (fixed) */}
            <Box
                sx={{
                    bgcolor: "background.paper",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    p: 1,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Tooltip title="Analyze microcontroller and auto install libs and dependencies.">
                        <Button size="small" variant="outlined" onClick={autoInstallHandler}>
                            Auto Install
                        </Button>
                    </Tooltip>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search libraries..."
                        value={query}
                        onChange={handleSearchChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: query ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="Clear search"
                                        size="small"
                                        onClick={handleClearSearch}
                                        edge="end"
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                    <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                        {sorted.length === 0 ? "0 results" : `Showing ${start + 1}–${end} of ${sorted.length}`}
                    </Typography>
                </Stack>
            </Box>

            {/* Scrollable list */}
            <Box ref={listRef} sx={{ flex: 1, overflow: "auto" }}>
                <Stack spacing={0} sx={{ p: 0 }}>
                    {pageItems.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                            No results.
                        </Typography>
                    ) : (
                        pageItems.map((card) => (
                            <LibCardMUI
                                key={card.libDisplayName}
                                libObj={card.libObj}
                                repoName={card.repoName}
                                abbr={card.abbr}
                                libDisplayName={card.libDisplayName}
                                installedVersion={card.installedVersion}
                                installHandler={card.installHandler}
                                uninstallHandler={card.uninstallHandler}
                            />
                        ))
                    )}
                </Stack>
            </Box>

            <Divider />

            {/* Bottom bar: Pager (fixed) */}
            <Box
                sx={{
                    bgcolor: "background.paper",
                    borderTop: "1px solid",
                    borderColor: "divider",
                    p: 1,
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<NavigateBeforeIcon />}
                        onClick={handlePrev}
                        disabled={page === 0}
                    >
                        Previous
                    </Button>

                    <Typography variant="body2">
                        Page {Math.min(page + 1, totalPages)} / {totalPages}
                    </Typography>

                    <Button
                        variant="outlined"
                        size="small"
                        endIcon={<NavigateNextIcon />}
                        onClick={handleNext}
                        disabled={page >= totalPages - 1}
                    >
                        Next
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
}
