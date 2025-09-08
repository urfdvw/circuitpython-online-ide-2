import React, { useMemo, useState, useEffect } from "react";
import { Box, Stack, TextField, InputAdornment, Typography, Button, Divider } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

import LibCardMUI from "../utilComponents/LibCardMUI";

export default function PagedLibCards({ libCards = [], itemsPerPage = 20 }) {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return libCards;
        return libCards.filter((card) => {
            const fields = [card?.libDisplayName, card?.repoName, card?.abbr];
            return fields.some((f) =>
                String(f || "")
                    .toLowerCase()
                    .includes(q)
            );
        });
    }, [libCards, query]);

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

    useEffect(() => {
        setPage((p) => Math.min(p, totalPages - 1));
    }, [totalPages]);

    const start = page * itemsPerPage;
    const end = Math.min(start + itemsPerPage, sorted.length);
    const pageItems = sorted.slice(start, end);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            {/* Search bar */}
            <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider", p: 1 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search libraries..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(0);
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                        {sorted.length === 0 ? "0 results" : `Showing ${start + 1}–${end} of ${sorted.length}`}
                    </Typography>
                </Stack>
            </Box>

            {/* Scrollable list */}
            <Box sx={{ flex: 1, overflow: "auto" }}>
                <Stack spacing={1.5} sx={{ p: 1.5 }}>
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

            {/* Pager */}
            <Box sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider", p: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<NavigateBeforeIcon />}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                    >
                        Next
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
}
