import PropTypes from "prop-types";
import Box from "@mui/material/Box";

import { useEffect, useState } from "react";
// mui tab
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        "aria-controls": `simple-tabpanel-${index}`,
    };
}

export default function TabedPages({ pages, tabValue, setTabValue }) {
    return (
        <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                    value={tabValue}
                    onChange={(event, newValue) => {
                        setTabValue(newValue);
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {pages.map((page, index) => {
                        return <Tab label={page.title} {...a11yProps(index)} key={"schema_tab_key_" + page.name} />;
                    })}
                </Tabs>
            </Box>
            {pages.map((page, index) => {
                return (
                    <TabPanel value={tabValue} index={index} key={"schema_key_" + page.name}>
                        {page.body}
                    </TabPanel>
                );
            })}
        </Box>
    );
}

export function useTabValueName(pages) {
    const [tabValue, _setTabValue] = useState(0);
    const [tabName, _setTabName] = useState(pages[0].name);

    function setTabValue(value) {
        if (!(value >= 0 && value < pages.length)) {
            value = 0;
        }
        _setTabValue(value);
        _setTabName(pages[value].name);
    }

    function setTabName(name) {
        if (
            !pages
                .map((page) => {
                    return page.name;
                })
                .includes(name)
        ) {
            name = pages[0].name;
        }
        _setTabName(name);
        _setTabValue(
            pages
                .map((page, index) => {
                    return { name: page.name, index: index };
                })
                .filter((page) => {
                    return page.name === name;
                })[0].index
        );
    }

    return { tabValue, setTabValue, tabName, setTabName };
}
