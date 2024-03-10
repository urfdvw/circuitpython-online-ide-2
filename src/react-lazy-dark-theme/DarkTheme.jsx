import { Helmet } from "react-helmet";
import useThemeDetector from "./useThemeDetector";

// eslint-disable-next-line react/prop-types
export default function DarkTheme({ dark = null }) {
    const systemIsDark = useThemeDetector();
    var isDarkTheme;
    if (dark === null) {
        isDarkTheme = systemIsDark;
    } else {
        isDarkTheme = dark;
    }

    return isDarkTheme ? (
        <Helmet>
            <style type="text/css">{`
                html {
                    background-color: white;
                    -webkit-filter: invert(87%) hue-rotate(180deg);
                    -moz-filter: invert(87%) hue-rotate(180deg);
                    -o-filter: invert(87%) hue-rotate(180deg);
                    -ms-filter: invert(87%) hue-rotate(180deg);
                }

                body {
                    background-color: white; 
                }
            `}</style>
        </Helmet>
    ) : (
        <></>
    );
}
