import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import schema from "./WidgetSchema.json";
import uiSchema from "./uiSchema.json";

export default function WidgetsConfig({ variableWidgets, setVariableWidgets }) {
    function handleSubmit(e) {
        setVariableWidgets(
            e.formData.map((x, i) => {
                return { id: i, ...x };
            })
        );
    }
    return (
        <Form
            formData={variableWidgets}
            schema={schema}
            uiSchema={uiSchema}
            validator={validator}
            onSubmit={handleSubmit}
            omitExtraData={true}
        />
    );
}
