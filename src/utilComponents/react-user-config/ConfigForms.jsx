import React, { useEffect, useState } from "react";
// schema form
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import CheckboxWidget from "./CheckboxWidget";
// user data
import uiSchema from "./uiSchema.json";
// tabbed pages
import TabedPages from "../TabedPages";

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

export default function ConfigForms({ schemas, config, setConfig }) {
    const [tabValue, setTabValue] = React.useState(0);
    return (
        <TabedPages
            tabValue={tabValue}
            setTabValue={setTabValue}
            pages={schemas.map((schema, index) => {
                return {
                    title: schema.title,
                    name: schema.name,
                    body: (
                        <SchemaForm
                            initFormData={config[schema.name]}
                            schema={schema}
                            onSubmit={(formData) => {
                                setConfig(schema.name, formData);
                            }}
                        />
                    ),
                };
            })}
        />
    );
}
