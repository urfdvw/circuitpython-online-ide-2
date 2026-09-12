import PropTypes from "prop-types";
import Box from "@mui/material/Box";

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
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", flexGrow: 0 }}>
                <Tabs
                    value={tabValue}
                    onChange={(event, newValue) => {
                        setTabValue(newValue);
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {pages.map((page, index) => {
                        return (
                            <Tab
                                label={page.title}
                                style={{
                                    textTransform: "none",
                                }}
                                {...a11yProps(index)}
                                key={"schema_tab_key_" + page.name}
                            />
                        );
                    })}
                </Tabs>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                {pages.map((page, index) => {
                    return (
                        <TabPanel value={tabValue} index={index} key={"schema_key_" + page.name}>
                            {page.body}
                        </TabPanel>
                    );
                })}
            </Box>
        </Box>
    );
}
