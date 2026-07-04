import {
    Card,
    CardContent,
    CardActions,
    Stack,
    Box,
    Typography,
    Tooltip,
    Button,
    useTheme,
    IconButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GitHubIcon from "@mui/icons-material/GitHub";
import { compareVersions, versionToString, parseVersion } from "../utilFunctions/version";

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
                borderRadius: 0,
                p: 0,
                margin: 0,
                padding: 0,
            }}
        >
            <Stack direction="row" alignItems="center" spacing={0.5}>
                {/* Left: check icon */}
                <Box sx={{ width: 28, display: "flex", justifyContent: "center" }}>
                    {hasInstalled ? (
                        <Tooltip title={sameVersion ? "Installed and up to date" : "Installed but outdated"}>
                            <CheckCircleIcon
                                fontSize="small"
                                sx={{
                                    color: sameVersion ? theme.palette.success.main : theme.palette.warning.main,
                                }}
                                aria-label={sameVersion ? "Installed and up to date" : "Installed but outdated"}
                            />
                        </Tooltip>
                    ) : null}
                </Box>

                {/* Center */}
                <CardContent
                    sx={{
                        py: 1.5,
                        "&:last-child": { pb: 1.5 },
                        flex: 1,
                        overflowX: "auto",
                        padding: "3px",
                    }}
                >
                    <Stack spacing={0.5} alignItems="left" textAlign="left">
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                            <Tooltip title={libDisplayName}>
                                <Typography variant="span">{libDisplayName}</Typography>
                            </Tooltip>
                        </Typography>

                        {libObj.pypi_description && (
                            <Typography variant="body2">
                                <Tooltip title={libObj.pypi_description}>
                                    <Typography variant="span">{libObj.pypi_description}</Typography>
                                </Tooltip>
                            </Typography>
                        )}

                        <Typography
                            variant="body2"
                            sx={{ color: theme.palette.grey[700], display: "flex", alignItems: "left" }}
                        >
                            <Tooltip title="Check Lib Source Code">
                                <IconButton
                                    onClick={() => {
                                        window.open(libObj.repo, "_blank");
                                    }}
                                    sx={{ zoom: "70%", margin: "0px", marginRight: "5px", padding: "0px" }}
                                >
                                    <GitHubIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip
                                title={
                                    sameVersion
                                        ? "versions match"
                                        : outdated
                                        ? "installed version → bundle version"
                                        : "bundle version"
                                }
                            >
                                <Box component="span">{versionLine}</Box>
                            </Tooltip>
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
                <CardActions sx={{ pr: 1, padding: "2px" }}>
                    {sameVersion ? (
                        <Stack direction="column" spacing={0}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="small"
                                onClick={() => uninstallHandler?.()}
                            >
                                Uninstall
                            </Button>
                        </Stack>
                    ) : outdated ? (
                        <Stack direction="column" spacing={0}>
                            <Button variant="contained" color="primary" size="small" onClick={() => installHandler?.()}>
                                Upgrade
                            </Button>
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="small"
                                onClick={() => uninstallHandler?.()}
                            >
                                Uninstall
                            </Button>
                        </Stack>
                    ) : (
                        <Stack direction="column" spacing={0}>
                            <Button variant="contained" color="primary" size="small" onClick={() => installHandler?.()}>
                                Install
                            </Button>
                        </Stack>
                    )}
                </CardActions>
            </Stack>
        </Card>
    );
}
