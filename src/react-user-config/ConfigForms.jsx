import React, { useEffect, useState } from "react";
// mui tab
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { TabPanel, a11yProps } from "./TabPanel";
// schema form
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import CheckboxWidget from "./CheckboxWidget";
// user data
import uiSchema from "./uiSchema.json";
// utils
import { toName } from "./utils";

// ---- form ui ----
function SchemaForm({ initFormData, schema, onSubmit }) {
    const [formData, setFormData] = useState();
    useEffect(() => {
        setFormData(initFormData);
    }, [initFormData]);

    function handleChange(e) {
        setFormData(e.formData);
    }
    function handleSubmit(e) {
        onSubmit(e.formData);
    }
    return (
        <Form
            formData={formData}
            schema={schema}
            uiSchema={uiSchema}
            validator={validator}
            onSubmit={handleSubmit}
            omitExtraData={true}
            onChange={handleChange}
            widgets={{
                CheckboxWidget: CheckboxWidget,
            }}
        />
    );
}

export default function ConfigForms({ schemas, config, set_config }) {
    const [tabValue, setTabValue] = React.useState(0);
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
                    {schemas.map((schema, index) => {
                        return (
                            <Tab
                                label={schema.title}
                                {...a11yProps(index)}
                                key={"schema_tab_key_" + toName(schema.title)}
                            />
                        );
                    })}
                </Tabs>
            </Box>
            {schemas.map((schema, index) => {
                return (
                    <TabPanel value={tabValue} index={index} key={"schema_key_" + toName(schema.title)}>
                        <SchemaForm
                            initFormData={config[toName(schema.title)]}
                            schema={schema}
                            onSubmit={(formData) => {
                                set_config(toName(schema.title), formData);
                            }}
                        />
                    </TabPanel>
                );
            })}
        </Box>
    );
}
