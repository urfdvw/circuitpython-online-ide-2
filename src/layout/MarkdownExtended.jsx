import PropTypes from "prop-types";
import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm'

export default function MarkdownExtended({ children }) {
    return (
        <Markdown
            className="markdown-body"
            remarkPlugins={[remarkGfm]}
            components={{
                a: props => {
                    return props.href.startsWith("http") ?
                        <a href={props.href} target="_blank" rel="noreferrer">{props.children}</a> :
                        <a href={props.href}>{props.children}</a>;
                }
            }}
        >{children}</Markdown>
    );
}

MarkdownExtended.propTypes = {
    children: PropTypes.elementType,
};
