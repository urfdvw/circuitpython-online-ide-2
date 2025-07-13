## Interface Layout
- **Menu**: This is the horizontal bar located at the very top.
- **Center**: The central part of the interface
    - Containing one or more tab sets.
    - Initially featuring two tab sets, each with a single tab.
- **Borders**: The areas along the left, right, and bottom edges.
    - Each border area is a special kind of tab set.

## Menu structure
In the menu bar, options are located on the left, while indicators are on the right.

### Options
- CircuitPython online IDE: Access information about this IDE.
- Connect: Establish connections.
- Tools: Open tabs with various features.
- Help: Access help resources and documentation.

### Indicators
- CircuitPy drive connection indicator
- Serial port connection indicator
- Time
    - This can be toggled shown or hidden in the "Global" settings.

## Tab Management
- Upon startup, some tabs are automatically opened:
    - A folder view tab in the left border.
    - A settings tab in the right border, collapsed.
    - A help tab in the bottom border, collapsed.
    - Navigation and serial console tabs in the center.
- Additional tabs can be added from the menu bar or through the folder view.
- Tabs are closable via the "x" on their label, except for certain system tabs including the folder view, settings, help and serial console, which cannot be closed.
- Maximizing a tab set to fill the center area is done by clicking the square icon at the top right corner of a tab set; clicking again reverses the maximization.
- Tabs can be repositioned by dragging:
    - To move a tab, drag its label to another spot within its tab set, to another tab set, or to a border.
    - Dragging a tab to the edge of a tab set can split the set into two separate sets.
- The size of tab sets can be adjusted by dragging the edges of the tabs.
