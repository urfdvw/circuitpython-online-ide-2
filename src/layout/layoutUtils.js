import { Actions } from "flexlayout-react";

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
