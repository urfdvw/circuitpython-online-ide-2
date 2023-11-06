import { Helmet } from "react-helmet";

export default function GlobalDarkTheme({ dark }) {
    return dark ? (
        <Helmet>
            <style type="text/css">{`
                html {
                    -webkit-filter: invert(87%) hue-rotate(180deg);
                    -moz-filter: invert(87%) hue-rotate(180deg);
                    -o-filter: invert(87%) hue-rotate(180deg);
                    -ms-filter: invert(87%) hue-rotate(180deg);
                }
            `}</style>
        </Helmet>
    ) : (
        <></>
    );
}
