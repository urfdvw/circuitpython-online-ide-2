import { useCallback } from "react";
import jsonSchemaDefaults from "json-schema-defaults";
import { isObject } from "./utils";
import { useLocalStorage } from "./useLocalStorage";

export function getConfigWithDefaults(currentConfig, schema) {
    const config = jsonSchemaDefaults(schema);
    if (!isObject(currentConfig)) return config;
    for (const name of Object.keys(config)) {
        if (!Object.hasOwn(currentConfig, name)) continue;
        const value = currentConfig[name];
        const property = schema.properties[name];
        if (typeof value !== typeof config[name] || value === null) continue;
        if (property.enum && !property.enum.includes(value)) continue;
        if (typeof value === "number" && (!Number.isFinite(value) ||
            value < property.minimum || value > property.maximum)) continue;
        config[name] = value;
    }
    return config;
}

export default function useConfig(schemas) {
    const { localStorageState, setLocalStorageState } = useLocalStorage("config", (stored) =>
        Object.fromEntries(schemas.map((schema) => [schema.name, getConfigWithDefaults(stored[schema.name], schema)]))
    );

    const setConfig = useCallback((name, values) => {
        const schema = schemas.find((entry) => entry.name === name);
        if (schema) setLocalStorageState(name, getConfigWithDefaults(values, schema));
    }, [schemas, setLocalStorageState]);

    const setConfigField = useCallback((name, field, value) => {
        const schema = schemas.find((entry) => entry.name === name);
        if (!schema || !Object.hasOwn(schema.properties, field)) return;
        setLocalStorageState(name, (previous) => getConfigWithDefaults({ ...previous, [field]: value }, schema));
    }, [schemas, setLocalStorageState]);

    return { config: localStorageState, setConfig, setConfigField, ready: true };
}
