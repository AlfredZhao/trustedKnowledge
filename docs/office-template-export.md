# Markdown → AIBS Office 模板：适配规范、样稿与 UI 接入

## 第二阶段：公共 UI / API 已接入代码，部署后生效

公共 Markdown 工具栏新增“导出”；幻灯片顶部可以选择默认阅读或“AIBS 模板 · 16:9”。桌面、手机与 PWA 均可使用统一的导出工作区，支持设置、目录、详情、重试、取消和 PPTX/DOCX 下载。原阅读模式及原业务保存行为保持不变。

### 运行架构

- 前端 `utils/officeSource.ts` 复用现有 Markdown 解析器，处理用户点击时的可见快照；浏览器生成图形 PNG，不再要求服务器安装 Chromium/Node 来渲染用户正文。
- 新接口包括只读策略 `GET /api/markdown/office/limits`、`POST /api/markdown/office/preview` 和 `POST /api/markdown/office/export/{pptx|docx}`，使用现有 `require_current_user` 登录校验，没有业务表变更。
- 后端严格验证结构化内容，只接受固定 `aibs-v1` 模板和 PNG 数据，**不接受用户文件路径、任意模板或图片抓取 URL**。源媒体仍由浏览器按现有媒体 API 访问规则读取，不改变原公开内容路由的语义。
- 固定模板配置的唯一来源现在是 `backend/app/services/office/template-profile.json`；共享引擎为同目录 `engine.py`。离线 `scripts/office-export/generate.py` 是兼容 CLI，不维护另一份引擎或配置。
- 每次生成在短时 Python 子进程中执行；成功、失败、断连、取消后清理专属临时目录。响应 `Cache-Control: no-store, private`，不持久保存导出记录或正文，不把数据库/认证环境变量传入生成进程。
- 预览按固定 16:9 布局缩放，不因窗口尺寸变更而重新分页。**预览不是 Microsoft Office 原生渲染，也不是 DOCX 页码预览**；导出后仍需检查字体和原生排版。

### 当前限制与资源预算

默认预算：64 个图形素材（图片、Mermaid 图、行内/块公式均计数）、总 Base64 编码 48 MB、单个编码 4 MB（解码后最多 3 MB PNG）、总像素 1.28 亿。正文仍最多 120,000 字符、500 个块；原始系统媒体读取最多 8 MiB，浏览器保持原压缩策略，按比例缩至最长边 2048 px。单图仍最多 1600 万像素，不接受伪造比例。

管理员可以在 `backend/.env`（Docker 使用 `.env.docker`）配置；不提供普通用户修改保护上限的 UI：

```dotenv
TRUSTED_KNOWLEDGE_OFFICE_MAX_ASSETS=64
TRUSTED_KNOWLEDGE_OFFICE_MAX_TOTAL_MB=48
TRUSTED_KNOWLEDGE_OFFICE_MAX_TOTAL_PIXELS=128000000
```

配置范围分别为 1～128、4～96 MB、1600 万～2.56 亿像素。范围上界是硬保护，不代表所有组合均已压测或可交付；建议使用默认值，上调须验证本机内存和并发。MB 使用十进制编码字节，不是原图或成品体积。修改配置后需重启后端；环境变量优先级遵循现有 Settings 机制。

后端 `OfficeLimits` 是唯一有效策略源：`GET /limits` 要求现有登录且禁止缓存，每次预览/下载都重新获取，页面显示有效上限；获取失败可重试，不退回写死的宽松值。已准备的快照同样按新策略复检。API 校验后把可信策略单独写入任务临时文件，子进程再次验证；请求不能携带自定义限额，认证信息/数据库设置不会传给 worker。

关联预算自动取：请求体上限 = 总编码 + 8 MB（默认 56 MB），输出上限 = 总编码 + 16 MB（默认 64 MB）。Nginx 仅 `/api/markdown/office/` 路径放宽到 128 MiB，覆盖最大可配置请求 104 MB，其它接口仍保持 24 MiB；实际限制仍由后端执行。外部反向代理若存在，还需同步其 Office 路径请求体限制。

数量超限在获取/渲染素材前显示全部数量和分类计数。编码超限区分单个与总量，提示素材分类序号、简短名称、实际字节数和上限；总量报错仅表示已处理部分。服务端总像素超限也显示实际值和配置上限。不会静默丢图或降低清晰度。

每个后端进程最多同时生成 2 个任务，同一用户最多 1 个；多 Uvicorn worker 会累加并发，仍需按主机内存规划。读取请求超时 30 秒、生成超时 90 秒；前端策略读取超时 30 秒，后续准备/导出超时 180 秒。Linux worker CPU 软/硬限制 75/76 秒，地址空间仍为 1536 MiB。最多 160 张 PPT、6,000 个对象。提高图片限额不代表放弃其它保护。

### 长标题布局

封面保持 7 英寸宽的品牌安全区域，最多三行，字号按 36/34/32/30/28 pt 尝试，标题高度随实际行数调整，副标题和版本信息联动下移。章节标题最多两行，按 32/30/28/26/24 pt 尝试，含“（续）”的续页同样检查，不能与正文重叠。极长标题仍以中文提示要求缩短/拆分，不静默截断或改写。

标题保留原 `runs`，排版另存 `line_runs`；按单词/标识符边界换行，长主标题优先在中文冒号后分行，避免行首悬挂标点，保留 `GRAPH_TABLE` 等可容纳标识符完整。PPT 原生文本、浏览器预览和离线 HTML 使用相同显式换行，避免各自换出不同的行数。DOCX 仍使用完整原文和模板样式，不套用 PPT 标题限制。模板原文件不改写。

表格最多 6 列、201 行；明确拒绝嵌套列表、图形表格单元格、带链接的图片、外链图片或 Mermaid 外部资源/自定义初始化，遇到这些结构或超限会提示错误。其他 Markdown 语法以现有公共预览的解析结果为准，不额外保证所有 Markdown 方言。Word 不受 PPT 标题容量校验阻塞，可以单独导出；自动目录和自动列表编号仍是后续工作。

可选副标题/版本/页脚默认留空，分别限制 28/24/24 个字符且为单行；不伪造作者或保密级别。经用户确认，版权配置统一使用 `{year}`：`engine.load_template_profile()` 在每次任务执行时按 `Asia/Shanghai` 计算年份，覆盖 PPTX 页脚、DOCX 封面/页脚、网页预览与离线 HTML 检查页。2026 年生成用 2026，2027 年生成用 2027；不修改正文历史年份、原始模板或已有下载文件。预览若跨年停留，重新预览可更新显示，下载仍按新导出任务的年份计算。非 H1 开头的内容会补充封面，使用首个标题或“Markdown 文档”，原文不删除。

本次验证构建输出到 `frontend/node_modules/.cache/office-verify-build`，未覆盖已有 `dist`。**本次新增策略接口与配置，原生部署需要重启后端**（不同于前一次仅修复年份），并发布新的前端构建。在仓库根目录手工执行：

```bash
npm --prefix frontend run build
scripts/restart-backend.sh
```

然后刷新浏览器；开发模式前端无需生产构建，但后端仍需重启。Docker 请改用下文的 `docker compose up -d --build backend frontend`，同时更新代码与 Office 路径 Nginx 配置。本次未启停服务，无数据库迁移，也不要求清理业务数据或缓存。动态年份本身在后续跨年时仍无需重启。

### 多图负载验证（2026-10-09）

`cd backend && python -m tests.office_export_stress` 生成独立合成截图并运行真实受限 worker；不连接服务或数据库。已验证：

| 素材数 | 总编码 | 总像素 | PPTX / DOCX 输出 | 单任务耗时 | worker 峰值 RSS |
|---|---|---|---|---|---|
| 33 | 38.39 MB | 4752 万 | 34.79 / 33.94 MB | 约 5.9～6.7 秒 | 约 130～142 MiB |
| 64 | 37.51 MB | 9216 万 | 33.97 / 33.07 MB | 约 6.9～8.7 秒 | 约 128～138 MiB |

上述为本开发环境单任务结果，不是任意真实文章、手机浏览器内存、满并发或 macOS/Windows Office 的验收承诺。48 MB 等值/超限另由 schema 与前端边界测试覆盖。

### 部署：由用户手工执行，不由代理启停服务

原生 Conda / 脚本部署，在仓库根目录执行：

```bash
conda run -n alfred python -m pip install -r backend/requirements.txt
cd frontend
npm ci
npm run build
cd ..
scripts/restart-all.sh
```

如果服务使用的 Conda 环境不是 `alfred`，应将安装命令环境名和 `CONDA_ENV` 保持一致。新增后端依赖/路由需要重启后端，新前端依赖需要前端重新加载；`restart-all.sh` 将二者一并重启。**本次实现没有运行这些服务命令。无需数据库迁移、删除数据或清理业务缓存。**

PPT 排版需要本地 Noto Sans CJK 字体：自动寻找 Debian 和 Oracle Linux 常用安装位置。没有自动找到时，在 `backend/.env` 设置实际字体文件路径，随后重启后端；只影响新导出，不会修改原模板或安装/嵌入字体：

```dotenv
TRUSTED_KNOWLEDGE_OFFICE_FONT_PATH=/absolute/path/to/NotoSansCJK-Regular.ttc
```

Docker 部署使用下列命令替代上述 Conda 命令。后端 Dockerfile 已包含字体包和两个原模板的复制规则：

```bash
docker compose up -d --build backend frontend
```

不要仅把前端构建文件更新到旧后端：旧后端没有新导出路由，将出现 404。不要把隔离测试依赖路径 `/home/alfred/.codex/agent-tmp/` 配置为生产依赖。

### 第二阶段回归验证

```bash
cd frontend
npm run test:slides
npm run build -- --outDir node_modules/.cache/office-verify-build
cd ../backend
python -m unittest tests.test_office_export -v
cd ..
python -m unittest discover -s scripts/office-export -p 'test_*.py' -v
```

浏览器测试只通过请求拦截提供页面和 API，真实导出集成用短时 Python 进程，不运行项目服务；需要 Playwright Chromium、后端 Office 依赖和字体。后端 ASGI 测试额外使用开发依赖 `httpx`（不加入生产依赖）。macOS/Windows 原生 Office、真实 iOS Safari/PWA 仍需设备验收，不以 Chromium 移动视口测试冒充。

---

## 第一阶段记录：适配规范与离线样稿

## 状态与已确认范围

以下是第一阶段**离线技术样稿验证**记录，不是最终交付质量声明。第二阶段代码接入和部署说明见上文。

- 只适配 `frontend/template/aibs_ppt_template.pptx` 和 `aibs_word_template.docx` 两个内置模板，不接受用户上传任意模板。
- 默认完整保留当前 Markdown 内容，仅做排版和分页，不调用 AI 摘要、改写或生成事实。
- Word 使用品牌视觉制作通用文档；SOD 专用说明与免责声明不自动套用于通用内容，正式保留规则由模板所有者确认。
- macOS Microsoft PowerPoint / Word 为主要验收环境；Windows Microsoft Office 使用同一份文件做兼容性验收。不承诺逐像素一致。
- 第一阶段未改动运行时 UI/API；第二阶段已按上文接入。两个阶段均不修改数据库或现有认证行为，不由代理启停服务。

实现：`scripts/office-export/`。样稿：`output/office-template-validation-20261009-final/`（本地生成，不提交到 Git）。

## 1. 模板盘点与保护

### PPTX

- 原模板：16:9，33 张示例页，1 个母版、30 个版式。
- 样稿直接加载模板包，保留母版、主题、版式和品牌图片；删除的是**输出副本**中的示例幻灯片及其引用，不覆盖源模板。
- 清理输出副本母版/版式中的提示文字、旧日期、旧页脚占位；第一阶段输出页脚曾使用模板原有版权年份和明确的“技术验证样稿 · 非正式交付”标识。当前共享引擎已按用户要求改用生成当年的年份。
- 目前适配 `Title Slide` 和 `Title Only` 两个版式；后者承载普通正文、代码、原生表格、图片和图形。尚未自动选择双栏、时间线、客户故事等复杂版式。
- 图形保持纵横比，不默认裁切。表格按完整行续页并重复表头；超长行/过多列明确报错，不无限缩小字体。
- 原模板含 WMF 品牌装饰。PPTX 保留原图；HTML 检查页只能显示标记框。这是跨平台原生 Office 验收项，不能据 HTML 判断该图是否正常。

### DOCX

- 原模板是 SOD 模板，不是无正文的通用样式包；包含说明页、示例正文、声明、目录字段及旧字段缓存错误。
- 输出副本保留标题/段落样式、两个分节的纸张/页边距和页眉品牌图形；重新生成封面和正文，避免把说明页、示例及专用声明带入通用文档。
- 重建页脚，清除有错误缓存的旧 `STYLEREF`，保留正常 `PAGE` 页码字段；设置打开时更新字段。
- **本样稿不生成目录**，也不伪造页码。自动目录及其原生渲染更新属于下一步适配；不能把设置 `updateFields` 当成字段已被计算。
- 保留模板各样式的 Latin 字体，不用统一字体覆盖 Title / Heading 的原有设计；中文字体为待确认的显式提案。

原模板的 SHA-256 写入 `layout-plan.json`，自动检查和测试会验证源模板保持不变。

## 2. 第一阶段内容契约

| 内容 | PPTX | DOCX | 本阶段限制 |
| --- | --- | --- | --- |
| 标题、正文、强调 | 原生可编辑文本框 | 原生段落和模板样式 | 长标题超出适配能力时报错 |
| 链接 | 保留目标 | 原生超链接 | 不自动下载链接目标 |
| 列表 | 可编辑文本及连续编号 | 可编辑文字编号 | Word 原生自动编号/多级列表尚未适配 |
| 代码 | 可编辑文字、保留缩进并续页 | 可编辑 Code 段落 | 长代码自然分页；不承诺与网页相同的语法高亮 |
| 普通表格 | 原生表格、完整行续页、重复表头 | 原生表格、重复表头 | 本样稿最多 6 列；图形单元格/过高行明确拒绝 |
| 图片 | 嵌入 PNG，保持比例 | 嵌入 PNG，保持比例 | 本地资源仅允许输入文件目录内的图片 |
| Mermaid | 图形 + 可编辑演讲者备注源码 | 图形 + 可编辑源码正文 | 不是可逐节点编辑的 Office 图表 |
| 公式 | 清晰 PNG，保持行内顺序 | 清晰 PNG，保持行内顺序 | 不是原生可编辑公式；表达式保存在替代文本中 |
| `<!-- slide -->` | 显式分页边界 | 不强制 Word 分页 | 代码/数学内部的标记不当成指令 |

**Markdown 语法以当前项目共享渲染器的行为为准**，不是另起一套 Markdown 解析器。本阶段不保证所有 Markdown 方言、嵌套列表、任意 HTML、脚注等高级语法。后续 UI 接入前，需要针对共享渲染器未覆盖的语法增加显式提示/拒绝规则，而不是宣称全量 Markdown 无损支持。

验证样稿还会保留 `source.md`、`source.json`、原始资源和布局计划，便于对照。这些是用户可见的本地文件，不是当前生产环境的草稿持久化方案。

## 3. 字体与元数据

- PPT Latin 字体沿用 Oracle Sans Tab 系列的适配方向，Word 沿用模板各样式；代码使用 Consolas。
- 中文暂用 `Noto Sans CJK SC` 作为**提案**，不是已获得用户确认的品牌标准。
- `--measure-font` 提供本地真实字体文件用于保守的排版估算，不会自动安装或嵌入字体，也不证明 macOS/Windows 上具有同样字体。
- 当前样稿没有嵌入字体。正式方案需确认字体可用性、授权/嵌入权限及替代规则，不能悄悄替换 Oracle 字体后仍声称完全符合模板。
- 第一阶段曾保留模板版权年份；当前已按用户确认改为每次生成时取上海时区的当年年份，仅改变版权字段。不虚构作者、客户、版本或保密级别，样稿元数据仍仅表明技术验证身份。
- 正式版本须由用户/模板所有者确认版权和保密文字；适配器不能自动判断声明适用性。

## 4. 工具职责与安全边界

1. `prepare.mjs`：直接打包并调用 `frontend/src/utils/markdown.ts` 和 `markdownSlides.ts`，在隔离浏览器中得到内容块、渲染 Mermaid/KaTeX、截图图形。
2. `generate.py`：固定画布 PPT 排版、模板副本填充、连续 Word 文档生成、近似 HTML 检查页。
3. `validate.py`：独立重新打开 Office 文件，比对内容、代码空白、图片字节、表格行、超链接、关系引用、页内几何范围与模板哈希。
4. `check-preview.mjs`：浏览器近似预览的溢出检查、逐页截图与总览图。**这不是 Office 渲染。**
5. `test_export.py`：无服务、无数据库的回归测试，包括内容篡改探测、跨页保真、越界资源拒绝和原模板不变检查。

浏览器请求全部由本地拦截器处理，不监听端口，不访问业务服务；外部图片、跨目录路径/符号链接和 `/api/media` 不在本阶段支持范围内，失败即报错。后续生产接入必须通过现有权限验证解析媒体，并限制外部下载来源、重定向、大小及资源消耗，不能直接由后端抓任意 URL。

生成工具不覆盖已有输出文件。失败会保留部分输出用于排错；应更换一个**新的输出目录**重试。只有检查报告明确通过的目录才是可评审样稿，且报告始终保持 `delivery_approved: false`。

## 5. 复现命令

在仓库根目录执行。依赖使用独立虚拟环境，不添加到后端生产依赖：

```bash
python -m venv .office-export-venv
.office-export-venv/bin/python -m pip install -r scripts/office-export/requirements.txt
```

需要前端已安装开发依赖，以及 Playwright Chromium。若尚未安装：

```bash
cd frontend
npm ci
npx playwright install chromium
cd ..
```

选择一个尚不存在的输出目录，并将 `--measure-font` 改为本机实际字体文件路径：

```bash
node scripts/office-export/prepare.mjs \
  scripts/office-export/fixtures/acceptance.md \
  output/office-template-validation-review

.office-export-venv/bin/python scripts/office-export/generate.py \
  output/office-template-validation-review \
  --measure-font /path/to/NotoSansCJK-Regular.ttc

.office-export-venv/bin/python scripts/office-export/validate.py \
  output/office-template-validation-review

node scripts/office-export/check-preview.mjs \
  output/office-template-validation-review

.office-export-venv/bin/python -m unittest discover \
  -s scripts/office-export -p 'test_*.py' -v
```

在本次隔离验证环境，Python 库与 Chromium 安装于 `/home/alfred/.codex/agent-tmp/`，没有更改生产 Python 环境。复现时使用上面的独立虚拟环境即可，不依赖该临时路径。

输出：

- `aibs-markdown-proof.pptx` / `aibs-markdown-proof.docx`：实际 Office 样稿。
- `source.md` / `source.json` / `assets/`：保真对照和嵌入素材。
- `layout-plan.json`：每个源内容块到 PPT 页面对象的映射、模板哈希与待验收项。
- `VALIDATION.md` / `validation-report.json`：自动结构检查报告。
- `ppt-layout-preview.html`：离线近似预览，依赖同目录 `assets/`。
- `html-preview-check.json` / `preview-*.png` / `contact-sheet.png`：可选的浏览器检查结果和截图。

仅运行上述离线样稿命令无需重启或重载服务；在线功能部署仍按本文前面的部署步骤操作。

## 6. 原生 Office 验收清单（待执行，不得自动打勾）

将**整个输出目录**复制到 Mac。在包含 `output/` 的仓库目录执行：

```bash
open -a "Microsoft PowerPoint" output/office-template-validation-20261009-final/aibs-markdown-proof.pptx
open -a "Microsoft Word" output/office-template-validation-20261009-final/aibs-markdown-proof.docx
```

1. 记录 macOS 和 Office 版本、是否安装 Oracle 字体及选定的中文字体。
2. 两个文件打开均无“需要修复”提示。
3. 对照原模板：品牌图形、封面、颜色、边距、标题层级与页脚合理；特别检查 WMF 标志。
4. PPT 逐页检查换行、溢出、重叠、空白页及孤立内容；普通文本和表格能直接编辑。
5. Word 检查封面、分节、页眉页脚、页码、长代码、表格续页及图片顺序；确认没有模板说明或专用声明残留。
6. 断网后图片、公式及 Mermaid 仍可见；公式前后文本顺序正确。
7. 比对 `source.md`，确认表格 T01–T20、代码结束标记及全文结束标记存在。
8. 从 Office 导出 PDF，留存用于视觉差异回归；该 PDF 才是对应 Office 的原生排版证据。
9. 用**同一份** PPTX/DOCX 在 Windows Microsoft Office 重复检查；不另造一份 Windows 专用样稿掩盖差异。

验收记录：

| 环境/项 | 状态 | 说明 |
| --- | --- | --- |
| 自动结构检查 | 见本次生成报告 | 不是 Office 渲染验证 |
| 浏览器近似预览 | 见 `html-preview-check.json` | WMF 以标记框代替，仅作布局检查 |
| macOS Office | 待执行 | 当前开发环境不是 macOS Office |
| Windows Office | 待执行 | 未承诺已经验证通过 |
| 中文字体/Oracle 字体 | 待确认 | 字体未嵌入 |
| 正式声明、版权、保密级别 | 待确认 | 样稿不代表正式声明 |

## 7. 后续完善与验收

统一工具栏、模板选择、固定画布近似预览、导出与状态反馈已进入第二阶段实现。仍保留现有随屏幕分页的阅读模式，不改变草稿保存或用户可见范围；尚不提供 Office 原生渲染的成品预览。

第二阶段已经增加可信媒体路径校验、严格 IR/图片验证、资源限额、任务隔离及 UI 回归。后续仍需完善原生渲染/字体检查、Word 目录及编号、更多经过验收的模板版式、语法扩展及真实设备验收。**在线接口不是把离线脚本直接暴露成可上传任意模板/文件的 API。**
