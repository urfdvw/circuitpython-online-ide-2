import { useState } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import PropTypes from "prop-types";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// GitHub-style fenced code block: visible border + copy-to-clipboard button.
// (Light colors are intentional — the app applies a global invert filter in dark mode.)
function CodeBlock({ className, children }) {
    const [copied, setCopied] = useState(false);
    const text = (Array.isArray(children) ? children.join("") : String(children ?? "")).replace(/\n$/, "");

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // fallback for non-secure contexts (e.g. the downloadable file:// IDE)
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            console.error("copy to clipboard failed", e);
        }
    };

    return (
        <Box sx={{ position: "relative", my: 2 }}>
            <Tooltip title={copied ? "Copied!" : "Copy"}>
                <IconButton
                    size="small"
                    onClick={handleCopy}
                    aria-label="Copy code to clipboard"
                    sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        color: "#57606a",
                        bgcolor: "rgba(255, 255, 255, 0.8)",
                        border: "1px solid #d0d7de",
                        "&:hover": { bgcolor: "#ffffff" },
                    }}
                >
                    {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
            </Tooltip>
            <Box
                component="pre"
                sx={{
                    m: 0,
                    p: 2,
                    pr: 6, // leave room for the copy button
                    border: "1px solid #d0d7de",
                    borderRadius: "6px",
                    backgroundColor: "#f6f8fa",
                    overflow: "auto",
                    fontSize: "85%",
                    lineHeight: 1.45,
                }}
            >
                <code className={className} style={{ fontFamily: "monospace" }}>
                    {children}
                </code>
            </Box>
        </Box>
    );
}

CodeBlock.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

const markdownComponents = {
    a: (props) =>
        props.href && props.href.startsWith("http") ? (
            <a href={props.href} target="_blank" rel="noreferrer">
                {props.children}
            </a>
        ) : (
            <a href={props.href}>{props.children}</a>
        ),
    code: ({ inline, className, children, ...props }) => {
        if (inline) {
            return (
                <Box
                    component="code"
                    sx={{
                        px: "0.4em",
                        py: "0.15em",
                        fontSize: "85%",
                        fontFamily: "monospace",
                        // light gray pill (the app inverts colors globally in dark mode)
                        bgcolor: "rgba(175, 184, 193, 0.35)",
                        borderRadius: "6px",
                        whiteSpace: "nowrap",
                    }}
                    {...props}
                >
                    {children}
                </Box>
            );
        }
        return <CodeBlock className={className}>{children}</CodeBlock>;
    },
    // fenced blocks already get their own <pre> from CodeBlock; drop the default wrapper
    pre: ({ children }) => <>{children}</>,
};

export default function MarkdownExtended({ children }) {
    return (
        <Typography component="div">
            <Markdown className="markdown-body" remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {children}
            </Markdown>
        </Typography>
    );
}

MarkdownExtended.propTypes = {
    children: PropTypes.node,
};
