import { Card, CardContent, CardActions, Stack, Box, Typography, Tooltip, Button, useTheme } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { compareVersions, versionToString, parseVersion } from "../utilFunctions/installedLibUtils";

export default function LibCardMUI({
    libObj,
    repoName,
    abbr,
    libDisplayName, // <-- now passed in directly
    installedVersion,
    installHandler,
    uninstallHandler,
}) {
    const theme = useTheme();
    const targetVersion = parseVersion(libObj?.version ?? "");
    const hasInstalled = !!installedVersion;
    const isValidTarget = targetVersion.major !== null && targetVersion.minor !== null && targetVersion.patch !== null;

    const sameVersion = hasInstalled && isValidTarget ? compareVersions(installedVersion, targetVersion) === 0 : false;

    const outdated = hasInstalled && isValidTarget ? compareVersions(installedVersion, targetVersion) !== 0 : false;

    const versionLine =
        hasInstalled && isValidTarget && !sameVersion
            ? `${versionToString(installedVersion)} → ${libObj.version}`
            : String(libObj?.version ?? "");

    return (
        <Card
            variant="outlined"
            sx={{
                borderRadius: 3,
                p: 1,
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1.5}>
                {/* Left: check icon */}
                <Box sx={{ width: 28, display: "flex", justifyContent: "center" }}>
                    {hasInstalled ? (
                        <CheckCircleIcon
                            fontSize="small"
                            sx={{
                                color: sameVersion ? theme.palette.success.main : theme.palette.warning.main,
                            }}
                            aria-label={sameVersion ? "Installed and up to date" : "Installed but outdated"}
                        />
                    ) : null}
                </Box>

                {/* Center */}
                <CardContent
                    sx={{
                        py: 1.5,
                        "&:last-child": { pb: 1.5 },
                        flex: 1,
                    }}
                >
                    <Stack spacing={0.5} alignItems="left" textAlign="left">
                        <Typography variant="subtitle1" fontWeight={700}>
                            {libDisplayName}
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{ color: theme.palette.grey[700], display: "flex", alignItems: "left" }}
                        >
                            <Box component="span">{versionLine}</Box>
                            {abbr && (
                                <Tooltip title={repoName}>
                                    <Box
                                        component="span"
                                        sx={{ ml: 1, color: theme.palette.text.primary, fontWeight: 400 }}
                                    >
                                        {abbr}
                                    </Box>
                                </Tooltip>
                            )}
                        </Typography>
                    </Stack>
                </CardContent>

                {/* Right: actions */}
                <CardActions sx={{ pr: 1 }}>
                    {sameVersion ? (
                        <Stack direction="column" spacing={1}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="small"
                                onClick={() => uninstallHandler?.(libObj, repoName)}
                            >
                                Uninstall
                            </Button>
                        </Stack>
                    ) : outdated ? (
                        <Stack direction="column" spacing={1}>
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={() => installHandler?.(libObj, repoName)}
                            >
                                Upgrade
                            </Button>
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="small"
                                onClick={() => uninstallHandler?.(libObj, repoName)}
                            >
                                Uninstall
                            </Button>
                        </Stack>
                    ) : (
                        <Stack direction="column" spacing={1}>
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={() => installHandler?.(libObj, repoName)}
                            >
                                Install
                            </Button>
                        </Stack>
                    )}
                </CardActions>
            </Stack>
        </Card>
    );
}
