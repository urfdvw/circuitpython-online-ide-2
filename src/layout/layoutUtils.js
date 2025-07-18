import { Actions } from "flexlayout-react";
import { FILE_EDITED } from "../constants";
import * as FlexLayout from "flexlayout-react";

export function selectTabById(model, tabNodeId) {
    const tabNode = model.getNodeById(tabNodeId);
    if (!tabNode) return;

    const parent = tabNode.getParent();
    if (!parent) return;

    // Works for both TabSetNode (middle area) and BorderNode (edges)
    const selectedNode = parent.getSelectedNode();

    // Only issue the action if it's not already selected
    if (!selectedNode || selectedNode.getId() !== tabNodeId) {
        model.doAction(Actions.selectTab(tabNodeId));
    }
}

export function toggleSelectTabById(model, tabNodeId) {
    const tabNode = model.getNodeById(tabNodeId);
    if (!tabNode) return;
    model.doAction(Actions.selectTab(tabNodeId));
}

export const findTabByName = (node, name) => {
    if (node.getType() === "tab" && (node.getName() === name || node.getName() === FILE_EDITED + name)) {
        return node;
    }
    if (node.getChildren) {
        for (let child of node.getChildren()) {
            const found = findTabByName(child, name);
            if (found) return found;
        }
    }
    return null;
};

export const findTabsetById = (model, tabsetId) => {
    let foundTabset = null; // Default to null if not found

    model.visitNodes((node) => {
        if (node.getType() === "tabset" && node.getId() === tabsetId) {
            foundTabset = node;
        }
    });

    return foundTabset;
};

export function openTab(model, name, component) {
    const tabNode = findTabByName(model.getRoot(), name);
    if (tabNode instanceof FlexLayout.TabNode) {
        // Activate the found tab
        selectTabById(model, tabNode.getId());
    } else {
        // Open a new tab
        model.doAction(
            FlexLayout.Actions.addNode(
                {
                    type: "tab",
                    name: name,
                    component: component,
                },
                model.getActiveTabset() ? model.getActiveTabset().getId() : model.getRoot().getChildren()[0].getId(),
                FlexLayout.DockLocation.CENTER,
                -1
            )
        );
    }
}
