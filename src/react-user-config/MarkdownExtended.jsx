import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownExtended({ children }) {
    return (
        <Typography component="div" style={{ fontSize: "14px", color: "rgb(102, 102, 102)" }}>
            <Markdown
                className="markdown-body"
                remarkPlugins={[remarkGfm]}
                components={{
                    a: (props) => {
                        return (
                            <a href={props.href} target="_blank" rel="noreferrer">
                                {props.children}
                            </a>
                        );
                    },
                }}
            >
                {children}
            </Markdown>
        </Typography>
    );
}

MarkdownExtended.propTypes = {
    children: PropTypes.elementType,
};
