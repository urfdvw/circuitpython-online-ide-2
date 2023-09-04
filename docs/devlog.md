# Dev log

# 202309041158

## boilerplate

changes
- `npm create vite@latest .`
- removed vite exaple code
    - kept the counter there
    - kept the css files but empty
- Icon
    - saved the icon file in `./public`
    - refered in `index.html`
- Changed page title in `index.html`

test
- `npm run dev`
    - counter working
    - icon not working
- `npm run build` then run by vscode live server
    - icon working

## Deployment

changes
- added `base: "./"` in `vite.config.js`
- added `.github` actions

minor changes
- changed dir and file name of devlog
- formator use 4 spaces in all edited files