import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
    ariaDescribedByIds,
    descriptionId,
    getTemplate,
    labelValue,
    schemaRequiresTrueValue,
    // Removed specific type imports that are TypeScript only
} from "@rjsf/utils";
import MarkdownExtended from "./MarkdownExtended";

/** The `CheckBoxWidget` is a widget for rendering boolean properties.
 *  It is typically used to represent a boolean.
 *
 * @param props - The props for this component
 */
export default function CheckboxWidget(props) {
    const {
        schema,
        id,
        value,
        disabled,
        readonly,
        label = "",
        hideLabel,
        autofocus,
        onChange,
        onBlur,
        onFocus,
        registry,
        options,
        uiSchema,
    } = props;

    const DescriptionFieldTemplate = getTemplate("DescriptionFieldTemplate", registry, options);

    // Because an unchecked checkbox will cause html5 validation to fail, only add
    // the "required" attribute if the field value must be "true", due to the
    // "const" or "enum" keywords
    const required = schemaRequiresTrueValue(schema);

    const _onChange = (_, checked) => onChange(checked);
    const _onBlur = ({ target: { value } }) => onBlur(id, value);
    const _onFocus = ({ target: { value } }) => onFocus(id, value);
    const description = options.description ?? schema.description;

    return (
        <>
            <FormControlLabel
                control={
                    <Checkbox
                        id={id}
                        name={id}
                        checked={typeof value === "undefined" ? false : Boolean(value)}
                        required={required}
                        disabled={disabled || readonly}
                        autoFocus={autofocus}
                        onChange={_onChange}
                        onBlur={_onBlur}
                        onFocus={_onFocus}
                        aria-describedby={ariaDescribedByIds(id)}
                    />
                }
                label={labelValue(label, hideLabel, false)}
            />
            <MarkdownExtended>{description}</MarkdownExtended>
        </>
    );
}
