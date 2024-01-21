# console
- New line with function will not auto indent

# folder view
- ~~Plus sign position is not fixed~~
    - fixed with measured parent size
- ~~when drag back to side from tab, the size is wrong~~
    - using `100%`
    - using `node.getRect().height`

# Plot
- ~~image size not matching if on the side~~
    - same as folder view sizing
- plot tab corrupt when log too long
    - which is because the title bar of the plot data is gone