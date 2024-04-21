const invert_css = {
    WebkitFilter: "invert(100%) hue-rotate(180deg)",
    MozFilter: "invert(100%) hue-rotate(180deg)",
    OFilter: "invert(100%) hue-rotate(180deg)",
    msFilter: "invert(100%) hue-rotate(180deg)",
};
// eslint-disable-next-line react/prop-types
export default function NoTheme({ children }) {
    var isDarkTheme = localStorage.getItem("isDarkTheme");
    if (isDarkTheme === null || isDarkTheme === undefined) {
        isDarkTheme = false;
    } else {
        isDarkTheme = JSON.parse(isDarkTheme);
    }
    return isDarkTheme ? <div style={invert_css}>{children}</div> : <div>{children}</div>;
}
