# 代码质量修改详解

本报告对照 Git 基线 `66202af` 与当前工作区的实际差异编写，解释上一轮审查中每个文件的修改原因、行为变化和收益。日期：2026-09-12。原来的 [简版报告](CODE_REVIEW.md) 保留，本文件作为独立的详细版本。

“更好”在本文中指可说明的改进：减少数据丢失路径、避免过期异步结果、让错误传到能处理它的调用层、释放资源，或降低维护成本。没有测量依据的地方不声称性能提升；仅有构建或静态检查的地方不声称已经完成用户交互验证。

需要先纠正简版报告中的一个归因：**基线中的 `writeFileText` 已经返回成功布尔值，编辑器也已经在失败时保留未保存状态。** 本轮并不是首次实现这项保护。本轮新增的是写入失败后的流清理、`writeToPath` 向上返回结果、严格写入在安装流程中的使用，以及编辑器加载/保存并发保护。类似地，按路径寻找标签主要解决“不同目录的同名文件无法同时打开”，不是首次修复脏标记识别。

## 1. 文件读写、复制、移动和备份底层

主要文件：[fileSystemUtils.js](src/utilComponents/react-local-file-system/utilities/fileSystemUtils.js)。这里的修改同时影响文件树、编辑器、备份、库安装和 Agent Bridge，因此优先统一函数契约，而不是在每个界面分别绕过问题。

### F01：路径规范化保留文件名两端的空格

- **原代码问题：** `normalizePath` 对每一级路径执行 `trim()`。文件系统允许某些带首尾空格的名称，但调用者实际访问的是另一个名称。
- **修改：** 只统一路径分隔符、分割层级、过滤空路径段，不修改非空名称里的空格。
- **为什么更好：** `" spaced.py "` 不会被改成 `"spaced.py"`。读写指向调用者指定的对象，避免读错文件或创建一个相似名称的新文件。
- **验证/边界：** `fileSafety.test.js` 验证空格名称。该修改不等于对所有文件源实现完整路径规范；ZIP 缓存中的名称处理仍有自己的实现。

### F02：已知目标类型时，不再根据扩展名猜文件或目录

- **原代码问题：** `path2Handles` 用最后一级名称是否像扩展名来推测类型。`project.v1` 可能是目录，`README` 可能是文件，单凭名称无法判断。
- **修改：** 增加 `treatLastAsDirectory`；文件读写明确传 `treatLastAsFile`；父目录查询明确传目录选项。
- **为什么更好：** `project.v1/README` 这种合法路径可以正常使用。函数调用者已经知道目标类型时，将这个事实传给底层比重新猜测可靠。
- **验证/边界：** 测试覆盖带点目录和无扩展名文件。为了兼容其他调用，`path2Handles` 的启发式和默认 `create: true` 仍保留，因此新调用仍必须显式选择合适选项。

### F03：普通读取不再创建缺失文件

- **原代码问题：** `getFromPath` 间接采用 `create: true`。读取一个不存在的文件，可能在设备上留下空文件或目录。
- **修改：** `getFromPath` 使用 `create: false`；可选读取 `getFromPathIfExists` 同样明确文件类型；`checkPathExists` 在根句柄不存在时返回 `false`。
- **为什么更好：** 查询操作不会改变被查询对象。例如读取缺失的 `boot.py` 应报告不存在，而不是让“检查文件”变成“修改启动配置”。
- **验证/边界：** 测试验证缺失文件读取不创建文件。`getFromPathIfExists` 仍把不存在和其他读取错误统一返回 `null`，适合可选显示数据；需要据此覆盖文件的流程应使用严格读取并区分错误。

### F04：集中管理写入流的成功与失败清理

- **原代码问题：** 多个位置分别执行 `createWritable → write → close`，但写入或关闭失败时没有统一释放逻辑。
- **修改：** 新增 `writeFileData`。成功路径写入并关闭；异常路径尝试 `abort()`，即使 abort 再次失败也重新抛出最初的写入错误。严格路径写入、复制和调试文件写入复用它。
- **为什么更好：** 减少遗留打开流或未完成事务的机会，也不会把真正的“磁盘满”等原因掩盖成清理错误。一处维护错误策略，所有调用者受益。
- **验证/边界：** 测试注入写入失败和 abort 失败，检查清理发生且原始异常不被替换。清理是尽力而为；硬件断连时无法保证清理请求送达。

### F05：明确交互式与严格式写入的结果契约

- **原代码问题：** `writeFileText` 的布尔结果在 `writeToPath` 层被丢弃；而安装等组合流程需要失败立即中止，不能仅弹窗后继续。
- **修改：** `writeToPath` 返回 `writeFileText` 的结果；`writeToPathStrict` 通过公共写入器向上抛错；保留 `writeFileText` 的弹窗及布尔返回接口。
- **为什么更好：** 界面保存可以使用布尔值，自动流程可以使用异常。调用者不再只能猜测上一步是否成功。
- **验证/边界：** 既有保存结果测试与新增文件安全测试一起覆盖相关底层行为。没有将所有 API 强行改成同一种错误接口，以减少调用兼容风险。

### F06：创建、删除、目录清理失败不再被底层吞掉

- **原代码问题：** 创建失败弹窗后返回 `undefined`；删除失败弹窗后正常返回。上层可能继续访问不存在的句柄，或误判清理已经完成。
- **修改：** 创建函数直接返回底层 Promise；`removeEntry` 委托句柄执行文件或递归目录删除；`cleanFolder` 顺序等待并传播错误；旧 `_removeFile`、`_removeFolder` 名称保留为别名。
- **为什么更好：** 上层能在正确的位置停止操作并恢复加载状态。递归删除交给具有实际文件源语义的句柄，减少重复递归逻辑。
- **验证/边界：** 删除不是可撤销事务。移除清理时旧的隐藏文件优先排序，减少没有明确必要性的顺序规则，并不保证中途失败时目录保持原样。

### F07：复制失败必须阻止原文件删除

- **原代码问题：** `_copyFile` 捕获异常后正常返回；`moveEntry`、`renameEntry` 仍继续删除源文件。这条调用链可能在目标未写完整时丢掉原件。
- **修改：** 复制错误向上传播；移动和重命名只在复制完全成功后删除源项；目标重名提前拒绝，同名重命名和移动到原目录直接返回。
- **为什么更好：** 安全条件从“调用过复制函数”变为“复制已成功完成”。目标写满、权限失效、连接中断时，原件不会被这段正常流程主动删除。
- **验证/边界：** 故障注入测试检查失败移动、失败重命名后原文仍存在，并检查目标重名不覆盖。失败可能留下部分目标副本；源删除失败时也可能出现两份副本，这比静默失去原件更可恢复。

### F08：普通复制、移动、重命名保留隐藏文件

- **原代码问题：** 文件夹复制复用默认跳过点文件的备份逻辑，移动或重命名后再删除原文件夹，隐藏文件可能随原目录一起消失。
- **修改：** `copyEntry` 和 `_copyFolder` 默认 `skipHidden: false`；备份保留原有默认过滤策略，并将显式选项传到每层递归。
- **为什么更好：** “移动文件夹”符合完整移动的含义；“备份要不要排除隐藏文件”仍是独立策略，不再意外影响一般文件操作。
- **验证/边界：** 测试检查重命名后隐藏文件和嵌套文件都保留。备份默认仍排除点文件，不能据此宣称备份总是完整镜像。

### F09：在清空目标之前拒绝相互包含的目录

- **原代码问题：** 目标在源目录内可能导致递归复制；源在目标目录内且启用 clean 时，先清空目标会把源一起删除。
- **修改：** 新增 `containsEntry`，结合句柄相等检查和 `resolve()`；备份在任何清理前检查两个方向的包含关系；复制拒绝复制进自己或自己的子目录，也拒绝文件覆盖自身。
- **为什么更好：** 危险操作的前置条件在破坏性动作之前检查。例如 `/project → /project/backup` 会提前失败，而不是边复制边制造更多待复制文件。
- **验证/边界：** 测试验证重叠拒绝发生在删除前。该保护依赖文件源提供可靠的身份/resolve 能力；没有 resolve 的自定义句柄只能进行有限判断。

### F10：目录比较不能把读取失败当成文件不存在

- **原代码问题：** `compareFolders` 遇到不可读文件直接跳过，结果可能把文件显示成仅存在于另一端，或隐瞒实际差异。
- **修改：** 文件读取失败使整个比较失败，由界面报告。
- **为什么更好：** “没有差异”与“无法完成比较”成为不同结果，用户不会基于不完整扫描做恢复或覆盖判断。
- **验证/边界：** 新增文件安全测试覆盖错误传播；整个比较失败是有意的行为变化，牺牲部分结果展示来保证结果含义明确。

### F11：删除无依据的固定等待与过期兼容分支

- **原代码问题：** 多处 `sleep(200)` 配以 `chill down`，增加延迟，却没有表达它保障了什么协议条件；下载函数保留 IE 的 `msSaveOrOpenBlob` 分支。
- **修改：** 文件句柄操作以 API Promise 完成为准；下载使用当前浏览器的 Blob、临时链接和 object URL 释放路径。健康检查同时处理 `undefined`，并移除无用变量的 lint 屏蔽。
- **为什么更好：** 错误和完成状态有可追踪来源，减少任意延迟与项目目标浏览器不使用的维护分支。
- **验证/边界：** object URL 清理在旧的现代浏览器分支中已经存在，本轮是简化，不是首次修复下载内存泄漏。没有真实设备基准，不能把删除等待描述为已经测得的速度提升。

## 2. 文件树和文件源状态

文件：[FolderView.jsx](src/utilComponents/react-local-file-system/components/FolderView.jsx)、[ContentEntry.jsx](src/utilComponents/react-local-file-system/components/ContentEntry.jsx)、[useFileSystem.js](src/utilComponents/react-local-file-system/hooks/useFileSystem.js)。

### V01：只允许最新的目录读取更新界面

- **原代码问题：** 用户切换目录或文件源后，先前的慢请求仍可能覆盖新目录内容；根目录也不可读时，递归回到根目录的恢复逻辑可能反复调用自己。
- **修改：** 用递增 `requestId` 丢弃过期结果；根变更时先清空旧状态；仅尝试一次回退根目录，根仍不可读则清空内容；面包屑根据句柄 parent 链重新构造。
- **为什么更好：** 显示结果跟随用户最后选择的目录，避免旧请求“抢回”界面，也避免不可读根目录造成无止境异步重试。
- **验证/边界：** lint 和生产构建通过；快速切目录的浏览器交互未完成，不能声称已在真实浏览器覆盖所有时序。

### V02：轮询完成后才安排下一轮

- **原代码问题：** `setInterval(async ...)` 不会等待本次读取完成，慢文件源上可能同时运行多轮检查。
- **修改：** FolderView 和 useFileSystem 的健康检查改为完成后再安排 `setTimeout`，卸载/依赖变化时取消后续安排；文件操作忙时不发起新的目录轮询。
- **为什么更好：** 请求数量可控，减少重复 I/O 和结果乱序。文件源变化后先置为未就绪，旧健康结果不再使新文件源提前显示“已连接”。
- **验证/边界：** 已发出的底层 I/O 不一定能被真正取消；这里取消的是后续调度和过期状态更新。串口源禁用轮询是基线已有策略，本轮保留并简化说明。

### V03：集中处理文件树操作的忙状态和错误

- **原代码问题：** 创建、复制、重命名、删除、拖放各自设置 loading；中途异常可能跳过恢复。部分错误只写控制台。
- **修改：** `runOperation` 用 ref 同步阻止重入，用 `try/catch/finally` 处理调用、刷新、错误提示和状态恢复；ContentEntry 及工具栏复用它；手动刷新等待 `onRefresh` 完成。
- **为什么更好：** 所有入口遵循相同生命周期，减少某个按钮漏写 finally 的风险。ref 在 React 重渲染前就能阻止第二次点击。
- **验证/边界：** 忙时新操作被忽略，不排队；这是避免重叠的策略，不是任务队列。底层失败路径有回归测试，按钮交互没有完整浏览器自动化。

### V04：渲染不修改状态对象，目录比较考虑类型

- **原代码问题：** `content.sort()` 原地改变 React state 数组；比较只看路径，路径未变但文件变目录时可能漏刷新；未提供额外菜单时直接展开可能出错。
- **修改：** 对 `[...content]` 排序；比较键加入 `kind`；`additionalElement` 默认空数组。
- **为什么更好：** 状态更新与渲染分离，变化判断更准确，组件的可选参数真正可省略。

### V05：稳定文件源回调，正常处理取消选择

- **原代码问题：** set/clear 函数每次渲染变更，引用它们的 effect 难以建立完整依赖；路径转换 `path.replace(...)` 没有接收返回值，实际上没生效；用户取消选择也报错。
- **修改：** `setDirectory`、`clearDirectory` 使用 `useCallback`；路径复用 `normalizePath`；忽略 picker 的 `AbortError`，简化连接状态文本和错误文案。
- **为什么更好：** 依赖列表能如实表达关系，而不会因函数身份变化重复恢复目录；Windows 风格分隔符处理实际生效；取消对话框不再被当成故障。

## 3. 串口文件写入与连接身份

文件：[deviceOps.js](src/serialFs/deviceOps.js)、[pythonRepr.js](src/serialFs/pythonRepr.js)、[serialHandles.js](src/serialFs/serialHandles.js)、[fileSystem.js](src/serialFs/fileSystem.js)、[storageControl.js](src/serialFs/storageControl.js)。

### S01：替换文件时，保留旧内容直到新文件就位

- **原代码问题：** 旧实现写好临时文件后删除目标，再将临时文件重命名为目标。最后一步失败时，旧目标已被主动删除。
- **修改：** 先写临时文件；旧目标存在则重命名到恢复路径；再安装新目标；安装失败尝试恢复原路径；回滚也失败则报出恢复位置，并保留旧字节。
- **为什么更好：** 用额外的临时状态保住恢复依据。故障从“原件消失”变成“原路径已恢复，或者原件可从明确的恢复位置取回”。
- **具体顺序：** `code.py(旧) → .ide-old`，接着 `.ide-tmp(新) → code.py`；第二步失败则尝试 `.ide-old → code.py`。
- **验证/边界：** `serialWriteRecovery.test.js` 让安装 rename 和回滚 rename 分别失败，检查路径及原始内容。额外 rename 不是断电安全保证；它也增加少量文件操作与临时空间需求。

### S02：临时文件和恢复文件不能覆盖用户现有文件

- **原代码问题：** 固定 `.ide-tmp` 名称可能撞上用户文件或前一次故障留下的文件；目标本身叫 `.ide-tmp` 时尤其危险。
- **修改：** `_ide_free_path` 查找未占用名称，必要时使用数字后缀，并排除本次目标；清理仅针对本次创建的临时文件，恢复文件在需要时保留。
- **为什么更好：** 保存操作不会把别人或上一次故障的恢复数据当成可随意覆盖的工作区。
- **验证/边界：** 测试覆盖已有 `.ide-tmp`、已有 `.ide-old`、目标同名及后续保存保留旧恢复文件。没有引入多进程互斥；串口文件操作依赖已有串行会话机制。

### S03：设备路径拒绝越级和不合法单级名称

- **原代码问题：** 单级句柄操作可以接收含分隔符或 `..` 的名称，绕过“在当前目录寻找一个子项”的语义。
- **修改：** `devicePath` 拒绝 `.`、`..` 和 NUL；`joinPath` 额外拒绝空名称、非字符串及斜杠/反斜杠。
- **为什么更好：** 句柄 API 的边界与浏览器文件 API 更一致，不会把删除一个子项意外扩展成跨目录操作。
- **验证/边界：** 回归测试覆盖非法 child name；正常顶层绝对路径仍可由设备路径 API 表达。

### S04：拒绝损坏的十六进制传输内容

- **原代码问题：** 奇数长度用位移取整分配数组，末尾半个字节被静默丢弃；非法字符解析后也可能变成错误字节。
- **修改：** 移除空白后，要求整个字符串由完整十六进制字节对组成，否则抛错。
- **为什么更好：** 损坏传输明确失败，而不是把错误内容作为成功读取的数据交给编辑器或备份。
- **验证/边界：** 测试覆盖 `0`、`0g`、`001`。格式正确不证明数据没有被篡改；没有新增校验和协议。

### S05：相同设备路径不等于相同文件

- **原代码问题：** 串口句柄的 `isSameEntry`、`resolve` 只依赖类型与路径。两块板的 `/code.py` 可能被当成同一个文件。
- **修改：** WeakMap 记录句柄所属 source；使用连接的 writer 作为身份；普通和批量上下文共享该身份；判断相等和包含关系时先检查来源。
- **为什么更好：** 区分“同一连接的不同包装句柄”和“另一连接上的同名文件”。备份的重叠保护因此不会仅凭设备路径误判跨设备关系。
- **验证/边界：** 测试覆盖不同来源不相等、跨来源 resolve 返回 null、批量上下文仍识别同源。连接失效后的访问拒绝是既有机制，本轮补的是身份比较。

### S06：删除与固件发布日期绑定的注释

- **原代码问题：** storageControl 注释称 `unsafe_disable_usb_drive()` “只在 main，尚无 release”，会随固件发布过期。
- **修改：** 注释只要求运行时固件具有该能力，保留主机正在写入时可能损坏文件系统的说明和原有交互保护。
- **为什么更好：** 注释描述稳定的调用条件，而不是会失效的时间判断。此次没有改变危险写权限操作的授权流程。

## 4. 串口传输和命令生成

文件：[serial.js](src/hooks/useSerial/serial.js)、[useSerialCommands.js](src/hooks/useSerial/useSerialCommands.js)、[utils.js](src/hooks/useSerial/utils.js)、[useSerialChannel.js](src/hooks/useSerial/useSerialChannel.js)、[useSerial.js](src/hooks/useSerial/useSerial.js)、[SerialConsole.jsx](src/components/SerialConsole.jsx)。

### T01：发送 Python 时不把三引号字符串当注释删除

- **原代码问题：** 多行代码通过字符串拆分删除 `"""..."""` 块，再手工拼接 `exec`。三引号是合法字符串语法，内容不一定是注释，删除会改变程序。
- **修改：** 使用已有 `reprStr` 将整段源码安全表示为 Python 字符串，生成 `exec(源码字符串)`；同时修正 REPL 提示的拼写。
- **为什么更好：** 字符串、引号、反斜杠和 Unicode 由一个已有的引用函数处理，不需要新增一套脆弱的转义规则。
- **验证/边界：** `serialCode.test.js` 在真实 Python 解释器执行实际发送文本，检查三引号、空行、单引号和 emoji 的输出。源码仍会先执行公共缩进移除，并非逐字节原样传输。

### T02：移除公共缩进时保留空行

- **原代码问题：** 算缩进前把所有空行过滤掉，这会改变多行字符串的内容，也损失源码行布局。
- **修改：** 仅在计算最小缩进时忽略空行，最后仍对完整行数组处理；最小值使用 reduce。
- **为什么更好：** 不再为了计算缩进而删除输入信息；reduce 也避免将大数组展开为函数参数可能产生的参数数量限制。
- **验证/边界：** 测试覆盖字符串中的空行。该工具不是 Python AST 变换器，仍不能保证所有混合 tab/空格和字符串内部缩进场景完全保真。

### T03：USB 数据块间保持 UTF-8 解码状态

- **原代码问题：** 每块数据独立 decode，多字节字符恰好跨块时可能出现替换字符。
- **修改：** 同一个 TextDecoder 使用 `{ stream: true }` 连续解码。
- **为什么更好：** 字符边界由编码决定，不再假设它与 USB 包边界一致。
- **验证/边界：** 测试把文本拆成每包一个字节，检查中文以外的重音字符和 emoji 示例正常还原。未增加传输级内容完整性校验。

### T04：拔掉一个串口只关闭对应通道

- **原代码问题：** 全局 disconnect 事件可到达多个 SerialCommunication 实例，旧处理没有先确认被拔掉的是本实例端口。
- **修改：** 从 `event.port` 或 `event.target` 取得端口，只有严格匹配 `this.port` 才关闭。
- **为什么更好：** REPL 与 data 双串口、多个设备之间不会因一个端口拔出而互相关闭。
- **验证/边界：** 测试覆盖无关端口、当前端口及两种事件形状。真实 USB 双通道拔插没有完成硬件验证。

### T05：自动重连不再只凭 USB 型号选择设备

- **原代码问题：** VID/PID 标识厂商和产品型号，不唯一标识某块板，甚至不能区分同设备的 CDC 通道。
- **修改：** 成功打开后记住实际 SerialPort 对象；重连只寻找这一对象，不再以 VID/PID 匹配候选项。
- **为什么更好：** 宁可无法自动重连，也不把后续指令发送到另一块同型号板上。
- **验证/边界：** 这是基于对象身份的保守行为。若浏览器或设备重枚举后产生新对象，需要用户重新选择；并未实现跨重枚举的唯一硬件身份识别，也没有硬件重连成功率测试。

### T06：通道 ready 状态不依赖可变对象作为 React 依赖

- **原代码问题：** effect 依赖 `serial.port` 和其属性，但修改普通对象字段本身不触发 React 重渲染；以此监听外部状态并不可靠。
- **修改：** 在接收/状态通知回调中根据 port、writer、keepRunning 更新 ready；连接失败时等待 close 完成。
- **为什么更好：** 更新与实际通道事件关联，减少“对象已经关闭但 UI 仍显示 ready”的机会；失败连接清理不会被无意放到后台继续进行。
- **验证/边界：** 仍依赖现有通道通知机制，不是完整事件状态机重写。

### T07：回调依赖反映实际使用值

- **原代码问题：** useSerial 回调经由整体 channel 对象访问 connect/send；历史上下键函数每次渲染新建，导致依赖警告和不必要的绑定更新。
- **修改：** useSerial 解构 connect/send 并直接列入依赖；SerialConsole 的 histUp/histDown 用 useCallback，完整声明历史索引、历史内容、临时输入和 setter 依赖。删除 serial.js 中已经完成修复的旧过程性注释。
- **为什么更好：** 更容易判断回调何时更新，减少通过忽略 lint 来保留潜在旧闭包的做法。没有改变历史导航算法或发送协议。

## 5. 编辑器、标签和应用外壳

文件：[IdeEditor.jsx](src/components/IdeEditor.jsx)、[useEditorTabs.js](src/hooks/useEditorTabs.js)、[App.jsx](src/App.jsx)、[useIdePage.js](src/hooks/useIdePage.js)、[TabedPages.jsx](src/utilComponents/TabedPages.jsx)、[useTabValueName.js](src/utilHooks/useTabValueName.js)；删除 `src/utilHooks/useChannel.js`。

### E01：文件读取完成前不允许编辑或保存

- **原代码问题：** 初始文本暂时为空；用户可能在加载结束前输入，随后慢读取结果覆盖输入，也可能在内容尚未载入时触发保存。
- **修改：** `loadedFile` 记录当前已成功加载的句柄；不匹配时 ACE 只读，saveFile 直接返回；加载 effect 有取消标志并处理读取错误。
- **为什么更好：** 从“默认可以操作，等异步结果碰运气”改为“完成加载后才开放操作”，避免把临时空文本当文件内容。
- **验证/边界：** 静态检查与构建通过，浏览器编辑交互验证未完成。加载失败后保持只读是有意行为。

### E02：磁盘刷新不能覆盖刷新期间的新输入

- **原代码问题：** 检查开始时闭包中的 text 可能还是已保存版本；等待磁盘读取期间用户已经输入，但旧检查仍可能认为没有本地编辑并覆盖 ACE。
- **修改：** 请求结束时检查取消标记、保存状态、编辑器存在性以及 `editor.getValue() === text`；不满足就丢弃；用固定 2 秒的非重叠 timeout 替换随机 interval。
- **为什么更好：** 更新前重新确认假设仍成立。判断依据包括编辑器当前真实内容，而不只是请求发出时的 React 快照。
- **验证/边界：** 没有完成该竞态的浏览器回归。显式“Use disk”冲突解决处理器没有在本轮整体重写，不能把这项保护泛化为所有加载入口。

### E03：保存防重入，并只记录本次真正提交的内容

- **原代码问题：** 连续保存可能同时写同一文件；轮询还可能与保存相互干扰。
- **修改：** 用 saving ref 阻止重入，finally 释放；轮询在保存期间跳过；成功后基线更新为本次传入 contents。
- **为什么更好：** 保存期间继续编辑时，新输入仍与已提交版本不同，保持未保存提示；避免两个保存的完成顺序反转带来状态错误。
- **验证/边界：** 原来“写失败不清除脏标记”的保护保留。底层保存有测试，连续点击与输入时序尚未通过浏览器自动化验证；忙时再次保存不会排队。

### E04：快捷键安装与最新业务回调分离

- **原代码问题：** text 变化就重新 addCommand；依赖又未包括所有实际使用回调，代码既频繁重新注册又难确认闭包是否新鲜。
- **修改：** 命令注册一次，执行时通过 `commandActions.current` 获取当前文本和操作；脏状态注册/清理、标签名 effect 补齐依赖；换行模式访问使用可选链。
- **为什么更好：** 命令生命周期与输入数据生命周期分开，减少绑定维护复杂度，并使文件 key 变化时登记和清理对应正确对象。
- **验证/边界：** 没有快捷键性能基准，也没有将 ACE 命令系统改造成独立状态机。

### E05：简化断点状态推导

- **原代码问题：** 判断和扫描逻辑分散在组件内多个仅供一次调用的函数中。
- **修改：** 纯判断 `hasBreakpointComment` 移到组件外；effect 直接从 text 推导行号集合；删去不再需要的随机间隔函数和过长的历史解释。
- **为什么更好：** 依赖关系直接可见：文本变更就重新计算断点。断点标记语法和主要行为未改变，属于可维护性改进。

### E06：允许不同文件夹下的同名文件同时打开

- **原代码问题：** 先按显示名找 tab，再发现 fullPath 不同就拒绝打开第二个文件。
- **修改：** 只在 editor 类型节点中按 fullPath 找已有文件；匹配则选择，否则新建 tab。
- **为什么更好：** `/code.py` 与 `/examples/code.py` 可以同时比较编辑；同一完整路径仍复用已打开标签。
- **验证/边界：** 不是新增脏标记识别能力。这里的匹配仍依赖 fullPath，跨文件源标签关闭依赖已有 useFileSourceTabs 流程；相关界面行为没有完整自动化测试。

### E07：页面副作用移出 render，并有恢复路径

- **原代码问题：** render 内直接修改 document.title；板断开或关闭显示板号后可能留着旧标题；设置 body overflow 没有恢复；布局构造表达式每次 render 都会求值。
- **修改：** 新增 useIdePage 管理 overflow 的设置/恢复和标题 effect；无板号时恢复通用标题；布局使用 `useState(() => Model.fromJson(...))` 惰性初始化。
- **为什么更好：** App 保持装配职责，副作用的生效条件和释放条件明确；避免每次重渲染构造最终被丢弃的布局模型。
- **验证/边界：** 构建和 lint 通过；未测量布局构造的具体耗时。

### E08：删除无消费者的发布通道 hook，拆出标签选择 hook

- **原代码问题：** useChannel 的 dev/beta 结果只用于控制台打印；TabedPages 同时导出组件与 hook，职责混合并触发 Fast Refresh 相关质量告警。
- **修改：** 删除 useChannel 及唯一调用日志；将 useTabValueName 原逻辑搬到 utilHooks，更新 App 导入。
- **为什么更好：** 不再让无功能效果的参数看起来像真实特性开关；组件文件和状态工具各自独立，更符合热更新边界。
- **验证/边界：** useTabValueName 的双状态结构和算法基本未改，不声称该 hook 已被全面优化。

## 6. 设置存储、版本和板信息

文件：[useLocalStorage.js](src/utilComponents/react-user-config/useLocalStorage.js)、[useConfig.js](src/utilComponents/react-user-config/useConfig.js)、[utils.js](src/utilComponents/react-user-config/utils.js)、[useBoardInfo.js](src/hooks/useBoardInfo.js)、[boardInfoUtils.js](src/utilFunctions/boardInfoUtils.js)、[version.js](src/utilFunctions/version.js)、[Navigation.jsx](src/components/Navigation.jsx)。

### C01：只读取自己的设置键，并安全初始化

- **原代码问题：** 为读取 config 遍历解析整个 localStorage；无效 JSON、null、标量或不可用存储可能让后续初始化拿到错误形状。
- **修改：** `readStoredObject(section)` 只读指定键；读取、解析失败或结果非对象时返回空对象；useState 惰性初始化。
- **为什么更好：** 对无关站点数据没有依赖，失败回退路径集中，初次渲染就得到可以处理的结构。
- **验证/边界：** config 测试覆盖损坏 JSON 及非法存储形状。它不是跨标签页实时同步协议。

### C02：连续更新不再依赖尚未重渲染的旧 state

- **原代码问题：** 多步骤设置更新容易从旧配置快照构造下一份数据；存储失败可能阻止内存更新。
- **修改：** ref 同步保存最新值；setter 支持函数式更新；持久化失败记录 warning，但仍更新本会话 state。
- **为什么更好：** 同一轮中连续修改不同配置项可以累积；存储满或被禁用时用户仍可继续调整 IDE。
- **验证/边界：** 测试覆盖连续不同 section 更新和配额失败。保存失败后刷新页面可能丢失会话设置，这不是持久化成功。

### C03：默认值与输入校验在初始化时一起完成

- **原代码问题：** initStep + 多个 effect 分阶段填默认值，存在中间配置不完整状态；旧值只按字段名覆盖，没有验证枚举、范围或有限数值。
- **修改：** 从 schema 同步构建所有配置；只接受自身已知字段，校验基本类型、enum、有限数值及 min/max；setConfig 和 setConfigField 使用同样规则。
- **为什么更好：** 读取旧缓存和界面更新遵循一致入口，减少错误配置传入定时器、字号和布局的机会；ready 不再需要等待人为多阶段初始化。
- **验证/边界：** 测试验证默认值、无效 enum、null 修复。它是针对当前 schema 的轻量校验，不是完整 JSON Schema 验证器；不覆盖任意嵌套对象、所有约束或整数语义。

### C04：基础类型与版本字段判断更准确

- **原代码问题：** `typeof null` 是 object，数组也是 object；版本对象中的 null 经数值强制转换可能成为 0，未知版本被当成明确版本。
- **修改：** isObject 排除 null/数组；isDefined 使用严格比较；parseVersion 对对象字段排除空值、负数和非整数，保留合法数字字段的转换。
- **为什么更好：** “没有版本信息”不再等同于 0，配置的对象前置检查也更符合数据含义。
- **验证/边界：** 原有浏览器/版本相关测试随全套通过；没有声称新增完整的 SemVer 标准实现或改变所有字符串解析规则。

### C05：板信息及在线版本查询不会发布过期结果

- **原代码问题：** 切换板后慢读取可能写回旧 boardInfo；GitHub 错误响应会按成功 JSON 处理；离线拒绝没有处理。
- **修改：** useBoardInfo 先清空并用取消标记保护结果；fetchLatestCircuitPythonInfo 接收 signal 并检查 HTTP 状态；Navigation 使用 AbortController，卸载时取消，失败时 warning。
- **为什么更好：** 标题、板 UID 和备份恢复不再轻易引用上一块板的数据；网络故障有明确原因，正常取消不产生错误提示。
- **验证/边界：** HTTP 成功后的数据形状仍不是完整 schema 校验；真实离线导航流程未完整验证。

## 7. 备份调度与每块板的持久化

文件：[Backup.jsx](src/components/Backup.jsx)、[useBackupDirectory.js](src/hooks/useBackupDirectory.js)、[boardStore.js](src/utilFunctions/boardStore.js)。

### B01：备份、恢复和比较共享一个忙状态

- **原代码问题：** 手动按钮、自动备份和自动比较可重叠；错误路径无法可靠表达失败，后续刷新仍可能继续。
- **修改：** runJob 用 ref 防重入，返回成功布尔值并 finally 解锁；备份成功后才执行按钮流程中的刷新；异常由备份界面统一提示。
- **为什么更好：** 同时读写同一目录的入口被协调，减少比较读到复制中间状态的机会，也不会把失败后的刷新当作已成功完成的链条。
- **验证/边界：** 忙时任务跳过，不排队；不是多标签页/多进程互斥。底层备份有测试，界面定时调度没有完整浏览器覆盖。

### B02：无效周期不创建高频计时器，换目录清空旧记录

- **原代码问题：** 0、非有限数值或初始化中的假值可能被作为 interval；切换目录后还显示之前的比较和时间戳。
- **修改：** 明确要求启用、就绪、自动监测允许、周期有限且大于零；根/备份句柄变化时重置差异和时间；修正 computer 拼写。
- **为什么更好：** 配置异常不会意外形成紧密轮询，显示的记录不会直接沿用另一对目录的结果。
- **验证/边界：** 旧 job 的底层 I/O 不会因句柄变化自动中止；重置显示不等于完整的任务取消协议。串口不自动备份的限制是原有行为。

### B03：自动恢复目录不能覆盖更新的用户选择

- **原代码问题：** 从 IndexedDB 恢复和用户选择目录同时发生时，晚到的恢复结果可能覆盖用户刚选的目录；换 UID 期间继续保留旧板目录。
- **修改：** restore、picker、reconnect 共用递增 selection；每个 await 之后检查是否仍为当前请求；已知新 UID 时先清空旧目录；补齐 effect 依赖；reconnect 的 DB 读取也纳入 try/catch。
- **为什么更好：** 用户最新选择优先，旧板异步工作不能随意改写新板状态；数据库读取失败也能显示有意义的提示。
- **验证/边界：** 没有 UID 时继续保留手动选择是现有兼容策略，不保证在无法识别板身份时自动隔离备份目录。

### B04：IndexedDB 读改写使用同一事务并关闭连接

- **原代码问题：** 多次打开数据库后未 close；读取记录与写回在分开的便捷操作中，两个更新可能覆盖彼此。
- **修改：** 在同一 readwrite transaction 中读、修改、put，同时等待操作及 transaction.done；所有路径 finally 关闭连接。
- **为什么更好：** 对同一 store 的修改获得数据库事务顺序，减少丢失更新；同时观察 request 和 transaction 的拒绝，避免只处理其中一个错误通道。
- **验证/边界：** 这是 IndexedDB 记录级操作，不会让实际文件备份获得同样的事务性。未新增真实 IndexedDB 并发测试。

## 8. 终端与摄像头资源生命周期

文件：[XtermConsole.jsx](src/components/XtermConsole.jsx)、[CameraPage.jsx](src/components/CameraPage.jsx)。

### R01：终端实例的创建、订阅和销毁属于同一个 effect

- **原代码问题：** `useRef(new Terminal(...))` 的参数每次 render 都会求值，可能创建最终未使用的对象；退出时只取消串口订阅，没有完整处理 observer、xterm 事件及实例。
- **修改：** 在 effect 内创建 Terminal 和 FitAddon；登记输入、标题和串口订阅；cleanup 中依次注销、断开 ResizeObserver、dispose 事件和终端，并清空 ref。
- **为什么更好：** 对象所有权明确，重复打开/关闭控制台或开发模式重挂载时不会依赖上次遗留实例。
- **验证/边界：** 构建与 lint 通过；没有长时间终端打开关闭的内存曲线测试，不声称已测得泄漏量归零。

### R02：长期事件回调使用当前通道和设置

- **原代码问题：** 只在首次挂载注册的输入/标题回调可能持有旧 sendData、enableInput 或标题 setter。
- **修改：** latest ref 保存当前操作和设置；事件发生时读取它；effect 对 serial 和 readerId 的真实变化重新建立订阅。可见且有尺寸时才 fit 的策略保留。
- **为什么更好：** 输入路由跟随当前 props，事件注册不会因每个字符更新而重建，同时仍能切换实际通道。
- **验证/边界：** 使用 latest ref 是处理订阅闭包的局部方案，不是 React 外部存储重构。

### R03：延后滚动可以取消，主题读取不因 JSON 损坏崩溃

- **原代码问题：** async sleep 后的滚动无法在卸载时取消；主题 `JSON.parse` 可能因无效存储抛错。
- **修改：** 滚动使用可清理 timeout 和可选链；主题按存储字符串 `"true"` 判断，捕获存储访问失败。
- **为什么更好：** 已关闭的终端不会继续执行计划中的滚动；一个损坏的主题值不会阻断终端渲染。
- **验证/边界：** 没有改变终端历史总量或整体滚动策略。

### R04：摄像头异步初始化在页面结束后不再继续

- **原代码问题：** 用户在摄像头授权提示或模块加载期间离开，cleanup 可能先执行；随后 getUserMedia 仍返回新 stream，旧逻辑继续创建 Peer。
- **修改：** stream、peer、wakeLock 由本次 effect 的局部变量持有；每次 await 后检查取消；过期资源立即 stop；共同 stopRef 供按钮使用。
- **为什么更好：** 延迟授权不再使一个已结束页面继续持有摄像头，也避免旧 effect 清理新 effect 的共享 ref 资源。
- **验证/边界：** 没有在手机或真实摄像头完成测试。

### R05：停止、连接错误、远端关闭都走同一清理路径

- **原代码问题：** 手动 Stop、call close、call error 和 peer error 清理不一致；部分路径只修改状态，wake lock 可能仍保留。
- **修改：** 统一 stop/fail；错误及关闭停止 tracks、销毁 peer、释放 wake lock；迟到的 wake lock 也立即释放；缺 token 提前报错；检查 peer.call 是否返回有效对象。
- **为什么更好：** “已停止/出错”的界面状态与资源状态更一致，避免业务连接结束但摄像头或屏幕锁仍运行。
- **其他变动：** 保留 1080p 请求和原有视频码率设置，删去仅诊断分辨率的日志，码率失败仍记录 warning。它不是画质升级，也没有修改 DocCam 接收端所有资源路径。

## 9. Connected Variables 与 Widgets

文件：[Widgets.jsx](src/components/Widgets/Widgets.jsx)、[installConnectedVariables.js](src/components/Widgets/installConnectedVariables.js)、[useConnectedVariables.js](src/components/Widgets/useConnectedVariables.js)、[VariableBase.jsx](src/components/Widgets/VariableBase.jsx)、[VariableSet.jsx](src/components/Widgets/VariableSet.jsx)、[VariableButton.jsx](src/components/Widgets/VariableButton.jsx)、[VariableCursor.jsx](src/components/Widgets/VariableCursor.jsx)、[textProcessor.js](src/hooks/useSerial/textProcessor.js)。

### W01：布局与安装状态跟随当前文件源

- **原代码问题：** 布局加载只依赖 ready，没有完整依赖句柄；切板后可能显示旧布局，慢加载也可能覆盖新板状态；库存在性读取失败未统一处理。
- **修改：** root/ready 变化时重置布局及检查状态；请求结束前检查取消；布局必须是数组，过滤空值和非对象元素；检查库存在及非空的流程捕获错误。
- **为什么更好：** 不会直接沿用上一块板的 widgets；无效顶层 JSON 形状不再进入渲染逻辑。
- **验证/边界：** 只是浅层布局校验，未验证每种 widget 的全部属性，数组元素中的嵌套错误仍需更完整 schema 处理。

### W02：安装失败中止，boot.py 不可读不等于不存在

- **原代码问题：** UI 注入仅返回布尔值的 writer，但安装函数没有据此停止；读取 boot.py 任意失败都当作空文件，可能在权限/断连错误后用新启动脚本覆盖原内容。
- **修改：** UI 使用 writeToPathStrict 并 try/catch；注入 writer 的文档契约明确要求抛错；只有 `NotFoundError` 才允许按缺失 boot.py 处理。
- **为什么更好：** 安装步骤能准确失败；“无法读取原配置”不会被解释成“可以安全从零重建配置”。
- **验证/边界：** `fileSafety.test.js` 注入 boot.py 读取错误并确认没有写入。库文件写成功但 boot.py 写失败时仍可能处于部分安装状态，本轮没有多文件回滚。

### W03：变量名作为字典键，不继承 Object 的成员

- **原代码问题：** 队列、在途请求和计数字典用 `{}`；`constructor` 等合法字符串会碰到继承属性，破坏“没有记录”的判断。
- **修改：** 内部 map-like 对象和复位路径使用 `Object.create(null)`。
- **为什么更好：** 所有键都来自设备变量，字典不会意外返回 Object 原型上的函数或特殊字段。
- **验证/边界：** 这只是相关内部容器的加固，不代表全部项目对象都已改成无原型字典，也不代表设备端变量命名问题全部解决。

### W04：损坏的一帧数据不阻止整个会话更新

- **原代码问题：** aggregateConnectedVariable 对每帧直接 JSON.parse，一帧坏数据会让整个聚合抛错。
- **修改：** 每帧独立捕获解析错误，只合并非 null、非数组的对象；删除“已迁移”但函数仍在使用的旧注释及无信息量的抱怨注释。
- **为什么更好：** 一帧出错不会丢掉后续有效更新。JSON 语法错误和合法业务数据被明确区分。
- **验证/边界：** 没有新增完整协议 schema 或错误计数界面；帧内字段仍按现有业务规则处理。

### W05：自动补全的候选值与自由输入使用同一种类型

- **原代码问题：** options 是 `{label}`，freeSolo 输入却可能是字符串；onChange 一律取 `.label`，自由输入会得到 undefined；所有选项相等的比较器掩盖真实选择差异，固定 demo id 重复。
- **修改：** options 和 value 都是字符串，直接保存 newValue；移除始终 true 的比较器和固定 id，空值回退空字符串。
- **为什么更好：** 从候选列表选变量与手工输入新变量名走一致路径，组件无需伪造相等关系。
- **验证/边界：** MUI 实际键盘输入与选中流程没有完整浏览器回归。

### W06：非法值在发送前停止

- **原代码问题：** JSON.parse 失败后只有 alert，仍可能继续发送 undefined；非法数值可能是 NaN/Infinity。
- **修改：** JSON 错误后立即 return；统一拒绝 undefined 和非有限数字；布尔转换去掉多余三元表达式。
- **为什么更好：** 错误输入不再改变 MCU 变量或触发含糊的序列化结果。
- **验证/边界：** 不属于所有类型的严格输入解析，布尔文本仍保留原有“等于 true 才为真”的行为。

### W07：拖出边界释放和触摸/键盘操作有处理路径

- **原代码问题：** VariableButton 只处理 mouse down/up，指针移出按钮再释放可能丢失 up；VariableCursor 分别绑定鼠标/触摸事件，增加重复和遗漏路径。
- **修改：** 两者使用 Pointer Events 和 pointer capture；处理 pointer cancel；按钮另处理 Space/Enter 的按下、抬起和失焦复位。
- **为什么更好：** 指针越界后的释放仍送到控件，减少变量卡在 true 或绘制一直处于按下状态的机会；鼠标、触摸、笔共享流程。
- **验证/边界：** 未完成多指、多设备和辅助技术测试；控件卸载、串口断连等场景仍不构成设备端状态确认协议。

## 10. 调试器与 Agent Bridge

文件：[Debugger.jsx](src/components/Debugger.jsx)、[debuggerUtils.js](src/utilFunctions/debuggerUtils.js)、[DebugWatchSet.jsx](src/components/DebugWatchSet.jsx)、[DebugCodeView.jsx](src/components/DebugCodeView.jsx)、[cpyAgentBridge.js](src/components/agentBridge/cpyAgentBridge.js)。

### D01：调试目标列表随板的就绪状态变化

- **原代码问题：** 初始化只在 mount 执行，先打开调试器再连接目录时可能不更新；晚到的文件列表可属于旧板。
- **修改：** 文件列表 effect 依赖 root/ready，取消过期结果并捕获错误；auto_scroll 临时覆盖与文件列表分离，退出时恢复保存的初始值；DebugWatchSet 补全 setter 依赖。
- **为什么更好：** 调试器配置页跟随实际连接状态，两个不同生命周期的副作用不再挤在一次性初始化里。
- **验证/边界：** 初始 auto_scroll 恢复逻辑会覆盖调试期间的设置变化，这不是设置冲突合并机制。

### D02：解析调试输出时允许空历史和坏帧

- **原代码问题：** 任意 JSON 错误中断历史解析；历史为空时 `.at(-1).h` 抛错。
- **修改：** 每帧独立解析、过滤非对象结果；索引最小为 0；最新 halted 状态使用可选链和布尔转换。
- **为什么更好：** 启动阶段或设备输出不完整时调试器不会仅因缺一条记录而崩溃。
- **验证/边界：** 合法对象缺字段仍未进行完整验证；历史大小也仍未限制。

### D03：过滤 watch 列表不修改 React 原状态

- **原代码问题：** `filteredWatchExpressions = watchExpressions` 只是别名，给其字段重新赋值也会改原 state。
- **修改：** Object.entries/filter/fromEntries 构建新对象及新数组。
- **为什么更好：** 生成调试代码所需的过滤结果不会隐式改变界面状态，后续渲染与配置变更判断更可预测。

### D04：插桩失败不能继续启动旧的调试代码

- **原代码问题：** 插桩异常没有统一失败返回和 loading 释放；未 await 的 sleep 并没有实际等待，注释却暗示存在等待。
- **修改：** 插桩过程返回 true/false，finally 清 loading；只有成功才清除 outdated；startDebugging 收到失败立即返回；删除无效 sleep 调用和与现有自动失效机制重复的 TODO。
- **为什么更好：** 启动依赖明确的插桩成功状态，避免部分文件写失败后仍运行旧副本。
- **验证/边界：** 已写出的部分插桩文件不会自动回滚；也没有完整 debugger 浏览器测试。

### D05：解析器资源和生成的 Python 字符串更可靠

- **原代码问题：** AST tree 用完未释放；parser 不可用时可能继续生成不足的插桩；文件名直接嵌入引号，watch key 仅转义双引号，无法覆盖反斜杠、换行等字符。
- **修改：** AST 使用 finally tree.delete，空树保护；插桩前要求 parser 可用；文件名和 watch key 使用 reprStr；生成文件统一使用 writeFileData。
- **为什么更好：** WASM 资源释放有明确路径，生成代码的字符串字面量规则统一，写入失败处理一致。
- **验证/边界：** watch 表达式本身仍作为用户要求执行的 Python 表达式插入，不是沙箱；imports 仍有正则重写限制。reprStr 有既有 Python 对照测试，不等于所有插桩语法组合都被验证。

### D06：清理 CSS 中无效的“注释代码”

- **原代码问题：** style 模板包含 `//` 注释的旧 CSS，CSS 不使用这种注释语法，可能干扰解析；另有 NEW LOGIC、Extra、步骤编号等编辑历史残留。
- **修改：** 删除已停用的 CSS 行和过程性标签；修正 identifyCodeRows 注释为实际输入 Python source。
- **为什么更好：** 样式和说明表达当前实现，读者不必推测哪一版才有效。没有改变计划保留的断点外观设计。

### A01：Agent 文件 API 传递明确目录类型

- **原代码问题：** listFiles、createFolder、move 的目标目录仍受末级名称猜测影响。
- **修改：** 对目录路径传 `treatLastAsDirectory: true`。
- **为什么更好：** Agent 调用和 UI 使用一致的路径语义，带点目录不被误作文件。
- **验证/边界：** 现有 agentBridge 测试全部通过；没有借此声明所有嵌套路径展示或元数据问题都已修复。

### A02：Agent 串口 API 检查连接并等待操作

- **原代码问题：** 只检查函数是否存在；未连接时函数对象通常仍存在。调用 send/ctrl 后未 await 就返回 `{ok:true}`，会隐藏立即拒绝。
- **修改：** REPL/data 分别检查 ready，等待发送或控制函数完成。
- **为什么更好：** API 返回值更符合“调用已被当前可用通道接受”的事实，异常可以交给自动化调用者处理。
- **验证/边界：** await 的完成语义取决于底层发送 API，不代表板已经执行代码或对结果作了确认。本轮没有给 Agent Bridge 新增远程开放权限。

## 11. 库安装与缓存

文件：[useInstalledLibs.js](src/hooks/useInstalledLibs.js)、[useLibInstaller.js](src/hooks/useLibInstaller.js)、[installedLibUtils.js](src/utilFunctions/installedLibUtils.js)、[useTextStorage.js](src/utilHooks/useTextStorage.js)、[useZipStorage.js](src/utilHooks/useZipStorage.js)。

### L01：扫描已安装库不创建 lib 目录

- **原代码问题：** 检查已安装库时用默认会创建的 path2Handles，扫描本身会写设备。
- **修改：** 明确 `create: false`；目录不存在返回空列表，其他错误继续抛出。
- **为什么更好：** “没有安装库”与“设备无法访问”分开处理；扫描不会触发本来不需要的写权限要求。
- **验证/边界：** 原有批量扫描机制保留；本轮不是首次减少串口往返。

### L02：只在目录库不存在时尝试 .mpy 文件

- **原代码问题：** try/catch 同时包裹“寻找目录库”和“复制目录库”，磁盘满等复制错误也被解释为“也许这是一个 .mpy 库”。
- **修改：** 只捕获缓存查找的 `NotFoundError` 用于后备查找；获得 entry 后在 catch 外统一复制。
- **为什么更好：** 业务分支由真实文件类型决定，I/O 故障不会误入另一个安装路径，也不会产生误导的后续报错。
- **验证/边界：** 仍不是整个依赖树安装的事务；多个库中途失败可能保留前面已安装的库。

### L03：目录数据与 GitHub 响应有基本输入检查

- **原代码问题：** 依赖表使用普通对象；依赖项可能不是字符串；catalog JSON 的 null/数组形状和无 assets 的响应可能引起类型异常。
- **修改：** 合并表使用无原型对象；DFS 跳过非字符串依赖；遍历 catalog 前检查形状；请求检查 HTTP 状态与 assets 非空；时间戳读取允许缺失。
- **为什么更好：** 外部数据格式错误有明确处理，特殊名称不受继承属性干扰；“HTTP 失败”不再变成难懂的 `.at(0)` 或字段访问错误。
- **验证/边界：** 仍是基本形状检查，没有验证每个 catalog 节点或 asset 的全部内容。

### L04：文本缓存更新失败时不要先丢掉旧值

- **原代码问题：** 先 removeItem 再 setItem；新值写入因配额等原因失败时，旧缓存已被删除。
- **修改：** 直接 setItem 覆盖，让失败时保留旧值；setText 复用同时更新就绪状态的路径。
- **为什么更好：** 原本可用的缓存不因一次失败更新先被主动清掉，显示状态也与 setter 行为一致。
- **验证/边界：** 原有配额驱逐策略仍可能删除其他旧缓存；这是改善单键替换顺序，不是所有缓存写入都具备事务保证。

### L05：取消文件选择会结束 Promise，并释放 input

- **原代码问题：** 选择器取消未触发 onchange 时，导入 Promise 可能一直挂着，临时 input 也未清理。
- **修改：** text 和 ZIP 导入增加 oncancel，调用 cleanup 并返回明确的 no-file 结果；文本存储监听同时处理 `storage` 事件 key 为 null 的全量清空情况。
- **为什么更好：** 取消是完成的一种结果，上层可以解除 busy；其他标签页清空存储后 readiness 能更新。
- **验证/边界：** 依赖浏览器对 input cancel 事件的支持，未新增所有浏览器的后备检测。

### L06：先解析 ZIP，再替换已有数据库

- **原代码问题：** recreateDB 在 JSZip.loadAsync 前执行，损坏的归档可能先清掉可用缓存，再报解析失败。
- **修改：** 调换顺序，先确认归档可以解析，然后重建缓存。
- **为什么更好：** 明确不可用的输入不会破坏当前缓存。
- **验证/边界：** ZIP 解析成功后的逐条解压/数据库写入仍可能失败；没有完成“写入新数据库后原子切换”的缓存事务设计，也不防压缩炸弹。

### L07：将不依赖 React 状态的 ZIP 工具移到 hook 外

- **原代码问题：** putEntry、路径/目录推导、MIME 推断、只读句柄构建等函数定义在 hook 内，每次渲染重建，callback 依赖难以保持准确稳定。
- **修改：** 将仅依赖显式参数的函数提升到模块级，保留其原有算法和只读语义。
- **为什么更好：** 函数依赖从隐藏闭包变为参数，更易阅读，也不再因 render 获得新身份。
- **验证/边界：** 此文件 diff 很大，主要是代码搬移，不是重写整个 ZIP 实现。数据库 schema、目录扫描算法、名称 trim 等旧行为未在这次搬移中全面修改。

## 12. 下载代理与离线缓存

文件：[proxy.js](<proxy cloud function/proxy.js>)、[index.js](<proxy cloud function/index.js>)、[example.js](<proxy cloud function/example.js>)、[service-worker.js](public/service-worker.js)。

### N01：代理入口只接受实际需要的下载目标

- **原代码问题：** 初始白名单只看 github.com 和两个仓库前缀，没有明确要求 HTTPS、默认端口、无用户名密码或 release download 路径。
- **修改：** 提取可单独测试的 isAllowedUrl；只允许两个指定仓库的 releases/download 和 releases/latest/download，拒绝其他协议、非默认端口、带凭据 URL；query 必须是一个字符串。
- **为什么更好：** 代理的能力更接近业务需求，减少它变成任意仓库页面抓取器或异常目标转发器的空间。
- **验证/边界：** proxy 测试包含允许/拒绝 URL。该白名单不是用户鉴权，也没有速率限制；CORS 仍允许 `*`。

### N02：每次重定向都重新验证目标

- **原代码问题：** 首个 URL 合法后使用 `redirect: follow`；之后跳转到哪里不再经过本地限制。
- **修改：** 手动跟随跳转，每一跳校验；后续额外允许两个官方资产域名；限制最多五次跳转，取消未使用的 redirect body，支持相对 Location。
- **为什么更好：** 白名单不能通过一条重定向绕过，循环跳转也不会无限占用请求。
- **验证/边界：** mock fetch 测试检查不安全目标根本不被请求、官方 asset 可用、循环有上限。未部署验证 GitHub 所有真实下载路径，未来资产域名变化可能需要维护白名单。

### N03：HTTP 方法、超时和流错误有完整路径

- **原代码问题：** CORS 声明 GET/HEAD 不代表服务端真的拒绝其他方法；实际 fetch 默认 GET；普通 pipe 的异步错误不一定进入外层 catch，客户端走后下载仍可能继续。
- **修改：** OPTIONS 直接响应，GET/HEAD 之外 405；向上游传真实方法；60 秒 AbortController 和客户端关闭取消；await pipeline，依据 headersSent/destroyed 决定 502 或终止连接；finally 清 timer/listener。
- **为什么更好：** 请求行为与对外接口一致，占用时间有边界，中断错误不会再尝试向已开始输出的响应重复写错误页面。
- **验证/边界：** 单元测试主要覆盖抽出的 URL/重定向/HEAD helper；没有用真实 Cloud Functions 服务完整测试超时、客户端断线和响应流。大型下载超过时限会失败，这是明确的取舍。

### N04：不转发与自动解压后响应体不一致的头

- **原代码问题：** fetch 可能已解压 body，继续传原 content-encoding 和压缩前后的不匹配 content-length 会使客户端下载错误。
- **修改：** 只转发 content-type、content-disposition，不照搬编码与长度头。
- **为什么更好：** 交付的数据流与响应头不再依赖“fetch 是否保持原始压缩字节”的错误假设。
- **验证/边界：** 未执行线上下载完整性测试；不是新加入文件哈希校验。

### N05：示例函数导出，纳入静态检查

- **原代码问题：** 独立示例原来完全排除于 lint；函数没有导出或调用。
- **修改：** export fetchWithProxy，使示例可引用，并随代理目录纳入 ESLint。
- **为什么更好：** 示例也有明确入口和质量检查，不会因被忽略长期积累语法/变量问题。没有修改示例中的部署地址，也没有进行部署。

### O01：service worker 只清理自己的旧缓存

- **原代码问题：** activate 删除所有名字不等于当前 CACHE_NAME 的缓存，Cache Storage 却由同一 origin 下应用共享。
- **修改：** 缓存前缀包含 registration.scope，只删除自己 scope 的旧版缓存及明确的旧 IDE 命名缓存。
- **为什么更好：** IDE 更新不会正常删除同域其他应用的离线数据；同应用不同部署 scope 也有更明确边界。
- **验证/边界：** VM 测试检查无关应用缓存保留。迁移时旧命名没有 scope 信息，仍按旧 IDE 前缀清理，不能为旧缓存补回不存在的部署归属。

### O02：在线优先新内容，离线才回退缓存

- **原代码问题：** 注释说有网更新，实际 `cachedResponse || fetchPromise` 优先立即返回旧内容，本次访问仍可能运行旧版本。
- **修改：** network-first；网络异常时查缓存；导航路径没精确命中则回退 index.html；离线未缓存资源返回 Response.error。
- **为什么更好：** 在线访问更容易直接获得部署后的源码，离线根路径仍能找到已缓存应用壳。
- **验证/边界：** VM 测试覆盖在线 fresh、离线 exact match、根导航回退和离线缺资源。慢网下会等待请求失败才回退，没有新增超时竞速；HTTP 500 不视为网络异常而自动换成缓存。

### O03：缓存异步失败不能丢掉成功网络响应

- **原代码问题：** try 内调用 cache.put 但不 await，其 Promise rejection 不会被同步 catch 捕获。
- **修改：** await cache.put 并局部捕获；无论缓存写入是否成功，成功取得的 response 仍返回给请求者。
- **为什么更好：** 缓存满不应该让本来可以在线打开的 IDE 报资源失败。
- **验证/边界：** 测试模拟 put 拒绝，验证 fresh response 仍可读。代码仍需等待本次 put 结束，不是无成本的后台缓存策略。

### O04：缓存范围限制到自身 GET，并预存语法文件

- **原代码问题：** 原 fetch handler 广泛拦截请求，可能缓存外部 API 数据；离线安装资源没有 Python grammar WASM。
- **修改：** 仅处理 scope 内 GET；预缓存增加 tree-sitter-python.wasm，不把 service-worker.js 当应用运行资源预存；缩短过时的大段说明。
- **为什么更好：** 离线缓存职责更清楚，外部下载/API 不会顺便进入应用壳缓存；语法分析依赖在安装时准备好。
- **验证/边界：** 测试检查 POST/外部请求不拦截及 grammar 在安装列表。没有做真实 PWA 安装/升级回归；安装所需任一文件获取失败仍可能使 install 失败。

## 13. 小型组件、注释与工程配置

下表包含没有必要单独写故障时序的小修改。每一项仍说明原问题、实际改动和收益，避免将纯文本清理冒充运行时修复。

| 文件 | 原问题及实际修改 | 新代码为什么更好；行为边界 |
| --- | --- | --- |
| [ProductPage.jsx](src/components/ProductPage.jsx) | 删除 Features 标题已移除、移动端 order 调整、版本号已移除等 Modification 记录；Content Data 注释改为当前功能含义。 | 当前 JSX 已直接表达布局，版本历史交给 Git；没有产品功能或布局变更。 |
| [WhatSNew.jsx](src/components/WhatSNew.jsx) | 删除“庆祝图标”“更粗”“更多 padding”“固定高度”等重复或主观注释，保留有助理解滚动行为的说明。 | 阅读时突出实际参数；样式值没有改变。 |
| [LibCardMUI.jsx](src/utilComponents/LibCardMUI.jsx) | 删除 `now passed in directly`。 | 不再用时间性文字说明显然的 prop；接口未改变。 |
| [Menu.jsx](src/utilComponents/Menu.jsx) | 将“打开菜单时恢复焦点”纠正为“关闭菜单时恢复焦点”。 | 注释与 `prevOpen === true && open === false` 的实际条件一致，减少无障碍行为维护时的误解；代码行为未改。 |
| [MenuBar.jsx](src/utilComponents/MenuBar.jsx) | 删除大块注释掉的示例 menuStructure。 | 真实调用方已提供结构，避免示例在实现中成为第二套过期接口说明；没有删除运行代码。 |
| [SiblingWithBottomRightTab.jsx](src/utilComponents/SiblingWithBottomRightTab.jsx) | 删除注释掉的 color prop。 | 减少无用途候选代码，实际颜色不变。 |
| [react-local-file-system/index.js](src/utilComponents/react-local-file-system/index.js) | 将无 JSX 的 `index.jsx` 搬为 `index.js`，导出保持一致。 | 扩展名与内容一致，工具不必将纯导出模块视为 JSX；调用方继续使用无扩展名导入。 |
| [文件系统 README](src/utilComponents/react-local-file-system/readme.md) | 用当前 API 契约重写说明：纯读、path2Handles 默认创建、错误传播、交互式保存例外、测试入口。 | 调用者能知道哪些函数会写、哪些会抛错，而不只了解旧组件概念。 |
| [vite.config.js](vite.config.js) | 删除裸文档链接注释与 `or other MUI components` 占位文字。 | 当前配置就是精确列表，避免以为存在未完成选项；构建目标和参数未改。 |
| [eslint.config.js](eslint.config.js) | 不再忽略代理目录；为代理脚本配置 Node globals；检查扩展名加入 mjs；只排除 docs/dist 生成物。 | 检查覆盖实际维护的代理与测试运行器；浏览器、Node 环境的全局变量来源更明确。 |
| [package.json](package.json) | lint 命令加入 `--max-warnings=0`。 | warning 也让检查失败，避免依赖/热更新告警继续悄悄积累；并不证明程序逻辑正确。 |

## 14. 依赖锁文件：具体版本、原因和限制

文件：[package-lock.json](package-lock.json)。本轮运行兼容范围内的 audit 修复，没有强制跨主版本替换 Plotly/MapLibre，也没有更改 package.json 的依赖范围。

| 依赖 | 基线 → 当前锁定版本 | 修改原因与收益 |
| --- | --- | --- |
| @humanfs/core | 0.19.1 → 0.19.2 | 工具链文件系统依赖的兼容更新；随依赖求解更新，不单独声称修复了应用文件 API。 |
| @humanfs/node | 0.16.7 → 0.16.8 | 与 humanfs 工具链更新配套，减少旧传递依赖滞留。 |
| baseline-browser-mapping | 2.10.40 → 2.11.22 | 更新浏览器基线数据；收益在构建/兼容数据准确性，不代表新增浏览器运行支持。 |
| brace-expansion | 1.1.13 → 1.1.18 | 兼容补丁更新，减少旧模式展开依赖风险；以总体审计变化为依据，不在没有单独证据时指定某项业务修复。 |
| browserslist | 4.28.4 → 4.28.9 | 更新构建目标解析工具，与浏览器数据包配套。 |
| caniuse-lite | 1.0.30001800 → 1.0.30001810 | 更新特性兼容数据库，减少工具依据陈旧数据决策。 |
| electron-to-chromium | 1.5.384 → 1.5.427 | 更新 Electron/Chromium 对应数据；不意味着项目新增 Electron 支持。 |
| fast-uri | 3.1.3 → 3.1.7 | 更新 URI 解析传递依赖，纳入本次审计修复集合。 |
| js-yaml | 4.3.0 → 4.3.2 | 更新 YAML 解析传递依赖，减少已旧版本继续留在依赖树中。 |
| nanoid | 3.3.15 → 3.3.19 | 兼容补丁更新；没有修改应用的 ID 生成调用契约。 |
| node-releases | 2.0.50 → 2.0.55 | 更新 Node 版本数据，与 browserslist 工具数据一致。 |
| postcss | 8.5.16 → 8.5.28 | 更新 CSS 处理工具的兼容补丁，纳入审计修复集合；两种构建都重新验证。 |
| update-browserslist-db | 1.2.3 → 1.3.3 | 更新浏览器数据库维护工具，保持依赖组合一致。 |

lockfile 中项目根版本元数据从 2.4.0 同步到 package.json 已有的 2.5.2。这是修正两份元数据不一致，**不是本轮额外发布了一个新版本**。相关完整性哈希、解析元数据随锁文件更新。

上轮 `npm audit` 记录从 **10 个发现（2 moderate、6 high、2 critical）降至 2 个 critical**。余下条目是 `maplibre-gl` 和依赖它的 `plotly.js`，为同一依赖链的两个审计条目，不应说成两个已证明可利用的独立应用攻击。

MapLibre 的已查阅 [安全公告](https://github.com/advisories/GHSA-jrc7-96c5-q579) 描述 attribution HTML 清洗问题，修复版本为 6.4.1。当前依赖链仍包含受影响版本。应用目前使用散点图不能据此证明风险不存在。下一步需要兼容的 Plotly 版本或经过验证的绘图 bundle 调整，不能靠强制 override 后构建一次就宣布修复。本次仅撰写详细报告，没有重新查询线上公告或重新执行 audit；这里记录的是上一轮检查结果。

## 15. 测试、证据与未验证部分

### Q01：新增测试为什么有必要

这些测试针对可能丢数据、误连设备或吞掉错误的失败路径，不是为纯注释修改逐行补测试。

| 新文件 | 断言数 | 覆盖的行为 | 为什么这类验证有价值 |
| --- | ---: | --- | --- |
| [fileSafety.test.js](test/fileSafety.test.js) | 22 | 无扩展名/空格路径、纯读、隐藏文件、目录重叠、失败复制/移动/重命名、流 abort、boot.py 读取错误。 | 检查失败后的原内容与写入次数，能证明关键的“不删除原件/不覆盖启动文件”结果。 |
| [serialWriteRecovery.test.js](test/serialWriteRecovery.test.js) | 15 | 安装 rename 失败、回滚失败、恢复路径报告、已有临时/恢复文件、非法 child name。 | 在 Python fake board 上实际执行生成代码，用故障注入检查原字节仍可恢复。 |
| [serialCode.test.js](test/serialCode.test.js) | 11 | 发送文本由 Python 执行、UTF-8 每字节分包、不同端口 disconnect、非法 hex、跨连接身份与 batch 同源。 | 同时验证源码生成语义、传输边界和身份逻辑，避免只检查拼接出来的字符串“看起来对”。 |
| [config.test.js](test/config.test.js) | 8 | 损坏/错误形状存储、默认配置、连续更新、无效 enum、配额失败保留会话状态。 | 重建最容易让 IDE 启动或配置更新失败的输入条件。 |
| [proxy.test.js](test/proxy.test.js) | 12 | URL 白名单、禁止的重定向不被请求、HEAD、官方 asset 跳转、循环上限。 | 在外部请求边界检查实际 fetch 调用数量和目标，避免只验证第一跳。 |
| [serviceWorker.test.js](test/serviceWorker.test.js) | 9 | grammar 预缓存、缓存归属、在线/离线、导航 fallback、put 失败、请求范围。 | 在 VM 中加载实际 service worker 源码，验证事件处理结果，而不是复制一份“预期算法”来测试。 |

新增共 **77 个断言**；与基线 242 个一起，上轮完整运行结果为 **319 passed、0 failed**。其中计数是项目轻量 harness 的断言统计，不应误称 319 个独立浏览器场景。

### Q02：现有测试说明和报告的修改

- [test/deviceOps.test.js](test/deviceOps.test.js)：测试断言保留，仅把“读取仍会走 create 分支”的过期注释改成“公共读取 helper 必须保留内容”，因为本轮 getFromPath 已改为纯读。
- [test/README.md](test/README.md)：把仅讲串口的简介扩展为当前覆盖范围，加入六个新文件及测试意图，方便后续维护者选择回归测试。
- [CODE_REVIEW.md](CODE_REVIEW.md)：上一轮新增的简版结论和剩余风险记录；本详细版对其概括不足和归因不精确处作说明。
- 本文件：逐条说明实际差异、收益、代价及证据，并附文件级索引，便于对照 diff 审阅。

### Q03：上一轮实际完成的检查

| 检查 | 已记录结果 | 能说明什么 / 不能说明什么 |
| --- | --- | --- |
| npm test | 319 通过、0 失败 | 覆盖现有与新增的自动化断言；不能替代真实板测试。 |
| npm run lint | 0 error、0 warning；基线 25 warning | 静态规则通过；不证明异步时序和产品行为完全正确。 |
| git diff --check | 通过 | 没有检查出的空白格式问题；不是逻辑审查。 |
| hosted 生产构建 | 成功，输出到 /tmp 中的审查目录 | 实际应用模块可打包；没有覆盖写 tracked docs 部署物。 |
| portable 生产构建 | 成功，生成 dist/circuitpython-online-ide-2.5.2.html | 单文件目标构建可完成；未完成 file:// 下全功能浏览器回归。 |
| Python compile | 项目/test 的 3 个 Python 文件编译成功 | 检查 Python 语法，不说明 CircuitPython 特定 API 在板上可用。 |
| Chrome 检查 | 初次损坏 config 启动回退未捕获运行错误；后续自动化无响应 | 只能记录有限启动观察；编辑器交互、视觉布局尚未验证完成。 |
| npm audit | 剩余 2 个 critical 条目 | 依赖链尚未清零；无部署环境可利用性证明。 |

本轮为文档补充，**没有重跑整套测试和构建，也没有新增业务代码修改**。上表是上一轮已经取得的验证记录。构建仍有上游 web-tree-sitter 的 eval 和 Node 模块浏览器 externalization 警告，不能把“零 lint warning”扩大为“所有工具输出零 warning”。

### Q04：仍然需要后续处理的风险

1. **依赖漏洞未清零。** 见第 14 节；不能将兼容更新描述为完整安全修复。
2. **保存与备份不是断电事务。** 恢复文件提高可恢复性，但断电、断连和多文件操作中断仍可能留下中间状态；没有自动灾难恢复流程。
3. **长会话内存与 CPU 开销。** serial output、Agent log 和 debugger history 仍持续增长，后续需要带 cursor 语义的缓冲限制与增量处理；简单 slice 会改变消费者约定。
4. **调试器仍存在 Python 变换边界。** 正则 import rewriting 不是完整 AST 改写，对复杂语法不能给出全面正确性保证。
5. **真实硬件与浏览器验证不足。** 串口自动重连、双 CDC 拔插、只读/写权限切换、不同容量板、手机摄像头、PWA 升级，以及编辑中磁盘变化，需要专门回归。
6. **部分保护只覆盖明确入口。** 例如 ZIP 缓存不是事务替换、widget 布局只是浅层校验、显式 Use disk 不是本轮自动轮询保护的完整延伸。各条已注明，不能从局部修复推导全系统保证。

所有应用修改仍是本地未提交状态；没有发布站点、部署代理或向实际设备批量写入。这份详细报告不把审查中发现但没有实施的方案列为“已修复”。

## 16. 文件级索引

下面列出当前差异中的全部 79 个路径（包含新增、删除和本报告）。删除文件标明为已删除；搬移的原路径和新路径各占一行。索引不表示每个文件都新增了功能，具体性质以上文说明为准。

| 文件 | 对应说明 |
| --- | --- |
| [CODE_REVIEW.md](<CODE_REVIEW.md>) | Q02；上一轮简版报告 |
| [CODE_REVIEW_DETAILED_ZH.md](<CODE_REVIEW_DETAILED_ZH.md>) | 本文件；本轮文档补充 |
| [eslint.config.js](<eslint.config.js>) | 第 13 节；静态检查范围 |
| [package-lock.json](<package-lock.json>) | 第 14 节；逐项锁版本 |
| [package.json](<package.json>) | 第 13 节；warning 门槛 |
| [proxy cloud function/example.js](<proxy cloud function/example.js>) | N05 |
| [proxy cloud function/index.js](<proxy cloud function/index.js>) | N01–N04 |
| [proxy cloud function/proxy.js](<proxy cloud function/proxy.js>) | N01、N02 |
| [public/service-worker.js](<public/service-worker.js>) | O01–O04 |
| [src/App.jsx](<src/App.jsx>) | E07、E08 |
| [src/components/Backup.jsx](<src/components/Backup.jsx>) | B01、B02 |
| [src/components/CameraPage.jsx](<src/components/CameraPage.jsx>) | R04、R05 |
| [src/components/DebugCodeView.jsx](<src/components/DebugCodeView.jsx>) | D06 |
| [src/components/DebugWatchSet.jsx](<src/components/DebugWatchSet.jsx>) | D01 |
| [src/components/Debugger.jsx](<src/components/Debugger.jsx>) | D01–D04 |
| [src/components/IdeEditor.jsx](<src/components/IdeEditor.jsx>) | E01–E05 |
| [src/components/Navigation.jsx](<src/components/Navigation.jsx>) | C05 |
| [src/components/ProductPage.jsx](<src/components/ProductPage.jsx>) | 第 13 节；小修改明细 |
| [src/components/SerialConsole.jsx](<src/components/SerialConsole.jsx>) | T07 |
| [src/components/WhatSNew.jsx](<src/components/WhatSNew.jsx>) | 第 13 节；小修改明细 |
| [src/components/Widgets/VariableBase.jsx](<src/components/Widgets/VariableBase.jsx>) | W05 |
| [src/components/Widgets/VariableButton.jsx](<src/components/Widgets/VariableButton.jsx>) | W07 |
| [src/components/Widgets/VariableCursor.jsx](<src/components/Widgets/VariableCursor.jsx>) | W07 |
| [src/components/Widgets/VariableSet.jsx](<src/components/Widgets/VariableSet.jsx>) | W06 |
| [src/components/Widgets/Widgets.jsx](<src/components/Widgets/Widgets.jsx>) | W01、W02 |
| [src/components/Widgets/installConnectedVariables.js](<src/components/Widgets/installConnectedVariables.js>) | W02 |
| [src/components/Widgets/useConnectedVariables.js](<src/components/Widgets/useConnectedVariables.js>) | W03 |
| [src/components/XtermConsole.jsx](<src/components/XtermConsole.jsx>) | R01–R03 |
| [src/components/agentBridge/cpyAgentBridge.js](<src/components/agentBridge/cpyAgentBridge.js>) | A01、A02 |
| [src/hooks/useBackupDirectory.js](<src/hooks/useBackupDirectory.js>) | B03 |
| [src/hooks/useBoardInfo.js](<src/hooks/useBoardInfo.js>) | C05 |
| [src/hooks/useEditorTabs.js](<src/hooks/useEditorTabs.js>) | E06 |
| [src/hooks/useIdePage.js](<src/hooks/useIdePage.js>) | E07 |
| [src/hooks/useInstalledLibs.js](<src/hooks/useInstalledLibs.js>) | L01 |
| [src/hooks/useLibInstaller.js](<src/hooks/useLibInstaller.js>) | L02 |
| [src/hooks/useSerial/serial.js](<src/hooks/useSerial/serial.js>) | T03–T05、T07 |
| [src/hooks/useSerial/textProcessor.js](<src/hooks/useSerial/textProcessor.js>) | W04 |
| [src/hooks/useSerial/useSerial.js](<src/hooks/useSerial/useSerial.js>) | T07 |
| [src/hooks/useSerial/useSerialChannel.js](<src/hooks/useSerial/useSerialChannel.js>) | T06 |
| [src/hooks/useSerial/useSerialCommands.js](<src/hooks/useSerial/useSerialCommands.js>) | T01 |
| [src/hooks/useSerial/utils.js](<src/hooks/useSerial/utils.js>) | T02 |
| [src/serialFs/deviceOps.js](<src/serialFs/deviceOps.js>) | S01–S03 |
| [src/serialFs/fileSystem.js](<src/serialFs/fileSystem.js>) | S05 |
| [src/serialFs/pythonRepr.js](<src/serialFs/pythonRepr.js>) | S04 |
| [src/serialFs/serialHandles.js](<src/serialFs/serialHandles.js>) | S05 |
| [src/serialFs/storageControl.js](<src/serialFs/storageControl.js>) | S06 |
| [src/utilComponents/LibCardMUI.jsx](<src/utilComponents/LibCardMUI.jsx>) | 第 13 节；小修改明细 |
| [src/utilComponents/Menu.jsx](<src/utilComponents/Menu.jsx>) | 第 13 节；小修改明细 |
| [src/utilComponents/MenuBar.jsx](<src/utilComponents/MenuBar.jsx>) | 第 13 节；小修改明细 |
| [src/utilComponents/SiblingWithBottomRightTab.jsx](<src/utilComponents/SiblingWithBottomRightTab.jsx>) | 第 13 节；小修改明细 |
| [src/utilComponents/TabedPages.jsx](<src/utilComponents/TabedPages.jsx>) | E08；移出 hook |
| [src/utilComponents/react-local-file-system/components/ContentEntry.jsx](<src/utilComponents/react-local-file-system/components/ContentEntry.jsx>) | V03 |
| [src/utilComponents/react-local-file-system/components/FolderView.jsx](<src/utilComponents/react-local-file-system/components/FolderView.jsx>) | V01–V04 |
| [src/utilComponents/react-local-file-system/hooks/useFileSystem.js](<src/utilComponents/react-local-file-system/hooks/useFileSystem.js>) | V02、V05 |
| [src/utilComponents/react-local-file-system/index.js](<src/utilComponents/react-local-file-system/index.js>) | 第 13 节；小修改明细 |
| `src/utilComponents/react-local-file-system/index.jsx`（已删除） | 第 13 节；小修改明细 |
| [src/utilComponents/react-local-file-system/readme.md](<src/utilComponents/react-local-file-system/readme.md>) | 第 13 节；小修改明细 |
| [src/utilComponents/react-local-file-system/utilities/fileSystemUtils.js](<src/utilComponents/react-local-file-system/utilities/fileSystemUtils.js>) | F01–F11 |
| [src/utilComponents/react-user-config/useConfig.js](<src/utilComponents/react-user-config/useConfig.js>) | C03 |
| [src/utilComponents/react-user-config/useLocalStorage.js](<src/utilComponents/react-user-config/useLocalStorage.js>) | C01、C02 |
| [src/utilComponents/react-user-config/utils.js](<src/utilComponents/react-user-config/utils.js>) | C04 |
| [src/utilFunctions/boardInfoUtils.js](<src/utilFunctions/boardInfoUtils.js>) | C05 |
| [src/utilFunctions/boardStore.js](<src/utilFunctions/boardStore.js>) | B04 |
| [src/utilFunctions/debuggerUtils.js](<src/utilFunctions/debuggerUtils.js>) | D05、D06 |
| [src/utilFunctions/installedLibUtils.js](<src/utilFunctions/installedLibUtils.js>) | L03 |
| [src/utilFunctions/version.js](<src/utilFunctions/version.js>) | C04 |
| `src/utilHooks/useChannel.js`（已删除） | E08；删除 |
| [src/utilHooks/useTabValueName.js](<src/utilHooks/useTabValueName.js>) | E08；新增搬移目标 |
| [src/utilHooks/useTextStorage.js](<src/utilHooks/useTextStorage.js>) | L04、L05 |
| [src/utilHooks/useZipStorage.js](<src/utilHooks/useZipStorage.js>) | L05–L07 |
| [test/README.md](<test/README.md>) | Q02；测试说明更新 |
| [test/config.test.js](<test/config.test.js>) | Q01；新增回归测试 |
| [test/deviceOps.test.js](<test/deviceOps.test.js>) | Q02；测试说明更新 |
| [test/fileSafety.test.js](<test/fileSafety.test.js>) | Q01；新增回归测试 |
| [test/proxy.test.js](<test/proxy.test.js>) | Q01；新增回归测试 |
| [test/serialCode.test.js](<test/serialCode.test.js>) | Q01；新增回归测试 |
| [test/serialWriteRecovery.test.js](<test/serialWriteRecovery.test.js>) | Q01；新增回归测试 |
| [test/serviceWorker.test.js](<test/serviceWorker.test.js>) | Q01；新增回归测试 |
| [vite.config.js](<vite.config.js>) | 第 13 节；注释清理 |
