# 程序风格

folders
- components: components linked with context and states
- configs: configuration schemas
- docs: markdown help documents
- hotKeys: hooks for keyboard shortcuts
- layout: layout configurations and utils
- supportInfo: info page that to be displayed on mobile devices
- utilComponents: components that doesn't have states
- utilHooks: hooks that doesn't have states

tabs里的责任分级
- App.jsx 仅负责管理context和顶级hook
    - return 主体短
- factory 仅决定是哪一种tab
    - return 短
- components里的component仅将通用component(如utilComponents)和state以及数据连接起来
    - 短
- utilComponents
    - 复杂逻辑都在这里
    - 可复用，不包含 app states 和 app context
