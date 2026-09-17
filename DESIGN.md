---
name: "青禾 · 虚拟超市导购"
description: "温白底色、森林绿操作与柔和分区色组成的门店导览界面。"
colors:
  green: "#315443"
  green-dark: "#203c2e"
  lime: "#e1ebc6"
  ink: "#263c30"
  muted: "#697467"
  support-text: "#606f56"
  page: "#f7f8f4"
  surface: "#fff"
  line: "#e3e7de"
  map-canvas: "#f5f7ee"
  assistant-surface: "#f2f5ed"
  photo-backdrop: "#e7ebdf"
  route: "#557b3d"
  focus: "#8aa770"
  price: "#3e5932"
  price-advice: "#36542b"
  error: "#a15b38"
  error-surface: "#fff7f2"
  vegetables: "#456537"
  vegetables-tint: "#e7eddf"
  fruit: "#805b26"
  fruit-tint: "#f3e7d5"
  seafood: "#376770"
  seafood-tint: "#dcebec"
  meat: "#8f504a"
  meat-tint: "#f2e2df"
  dairy: "#536488"
  dairy-tint: "#e4e8f1"
  bakery: "#79593b"
  bakery-tint: "#eee2d5"
  pantry: "#67653e"
  pantry-tint: "#eae9d9"
typography:
  headline:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.6
  panel-title:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.6
  body:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  chat:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.95
  action:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 500
  label:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 500
  product-title:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "15px"
    fontWeight: 600
  price:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "21px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  price-display:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "35px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  zone-name:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "21px"
    fontWeight: 600
  zone-code:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.1em"
rounded:
  label: "4px"
  tag: "5px"
  filter: "6px"
  field: "7px"
  button: "8px"
  compact-surface: "9px"
  support-surface: "10px"
  photo: "11px"
  bubble: "12px"
  panel: "14px"
  circle: "50%"
spacing:
  gap-tight: "4px"
  gap-control: "8px"
  inset-small: "12px"
  inset-medium: "16px"
  inset-panel: "20px"
  gap-panel: "24px"
  inset-admin: "30px"
  gutter-desktop: "42px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.button}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.green-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.button}"
    padding: "10px 18px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.green}"
    typography: "{typography.label}"
    padding: "5px 0"
  field:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.field}"
    padding: "10px 11px"
    width: "100%"
  navigation:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "0 4px"
  filter:
    backgroundColor: "transparent"
    textColor: "{colors.support-text}"
    rounded: "{rounded.filter}"
    padding: "8px 13px"
  filter-active:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  product-card:
    typography: "{typography.product-title}"
  product-photo:
    backgroundColor: "{colors.photo-backdrop}"
    rounded: "{rounded.photo}"
    height: "185px"
  assistant-message:
    backgroundColor: "{colors.assistant-surface}"
    typography: "{typography.chat}"
    padding: "13px 15px"
  chat-compose:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.photo}"
    padding: "11px 12px 9px"
  map-wayfinding:
    backgroundColor: "{colors.map-canvas}"
---

# Design System: 青禾 · 虚拟超市导购

## Overview

**Creative North Star: "温白花园导览"**

青禾的现有界面以温白和浅灰绿承托内容，用森林绿指明操作、当前位置和任务进度。柔和的分区色把门店组织成容易辨认的地图；蔬菜、鱼肉与日用品的实物照片提供商品识别线索。

整体保持轻巧、安静和实用。白色工作面板、细边线与适度圆角区分任务，文字层级服务于商品、单位、价格与货架位置的快速核对。相同的颜色和控件语言贯穿顾客端与超市端。

**Key Characteristics:**

- 森林绿承载主要操作、选中状态与位置标记。
- 浅色分区底面始终配合深色文字、区名与字母编号。
- 本地中文无衬线字体配合清楚的数值与单位层级。
- 白色面板以细边线分隔，照片和地图承担主要视觉信息。

本文件根据 `src/styles.css`、`src/main.tsx`、`src/App.tsx`、`src/components/` 与 `shared/catalog.ts` 的完成实现记录。前置 YAML 保存规范化的常用值；`.impeccable/design.json` 保存阴影、动效、断点和独立组件预览。

## Colors

底色带轻微灰绿倾向，主色深而克制；分区通过同一色相的深色标识和浅色底面形成配对。

### Primary

- **森林绿**（`green`）：主要按钮、当前导航、筛选选中态、用户消息、地图站点与当前位置。
- **深林绿**（`green-dark`）：主要按钮悬停态。
- **嫩叶绿**（`lime`）：购物清单数量标记的浅色背景。
- **路线叶绿**（`route`）：步行路线的虚线；白色衬线把路线与分区底色分开。
- **焦点苔绿**（`focus`）：键盘焦点轮廓。
- **商品价绿 / 建议价绿**（`price` / `price-advice`）：商品售价与后台建议价格的数值强调。

### Secondary

下列深色用于区名、字母和分区标识，配对的 `-tint` 用于地图分区和目录字母底面。映射来自商品目录，新增视图复用同一映射。

| 分区 | 字母 | 深色标识 | 浅色底面 | 色彩特征 |
| --- | --- | --- | --- | --- |
| 蔬菜区 | A | `vegetables` | `vegetables-tint` | 叶片绿 |
| 水果区 | B | `fruit` | `fruit-tint` | 果实赭黄 |
| 水产区 | C | `seafood` | `seafood-tint` | 浅湖蓝绿 |
| 肉禽区 | D | `meat` | `meat-tint` | 柔和砖红 |
| 乳品区 | E | `dairy` | `dairy-tint` | 雾蓝 |
| 烘焙区 | F | `bakery` | `bakery-tint` | 麦皮棕 |
| 粮油区 | G | `pantry` | `pantry-tint` | 谷物橄榄色 |

错误提示使用 `error` 文字和 `error-surface` 底色，并同时说明问题与恢复方式。

### Neutral

- **温白页底**（`page`）与 **白色工作面**（`surface`）：形成页面和任务面板的底层层次。
- **深绿墨色**（`ink`）：全局默认文字。
- **灰绿辅助色**（`muted`）与 **苔绿说明色**（`support-text`）：副标题、单位、说明、状态和地图注释；保留现有加深后的文字颜色。
- **浅灰绿边线**（`line`）：面板、分隔线和列表边界。
- **地图浅底**（`map-canvas`）、**助手消息浅底**（`assistant-surface`）与 **照片占位底**（`photo-backdrop`）：区分对应内容区域。

**The Paired Zone Rule.** 分区颜色与目录中的区名、字母保持固定配对；颜色不能独自承担分区识别。

## Typography

**Display Font / Body Font / Label Font:** Noto Sans SC Variable，回退到 Microsoft YaHei、sans-serif。字体由 `@fontsource-variable/noto-sans-sc` 在入口文件导入，随应用本地打包。界面未使用独立衬线体或等宽字体。

**Character:** 中文无衬线字体统一标题、操作和内容。标题主要以字号和中等字重区分；价格通过更大的数值、较小的币种与单位形成清晰层级。

### Hierarchy

- **Headline:** 页面主标题；平板宽度缩为 26px，手机宽度缩为 24px。
- **Title / Panel title:** 区块标题与面板标题；面板标题略小，让商品和任务内容保持前景。
- **Body / Chat:** 全局基础字号与对话正文。对话保留换行，长词可换行；消息行距较松。
- **Label:** 文字操作等控件使用中等字重。现有辅助信息按组件使用 9–12px，不把地图注释的小字号扩展为通用正文标准。
- **Product title / Price:** 商品名称与售价。手机商品标题为 14px、价格为 20px，描述和单位保持次要层级。
- **Price display:** 后台建议价；手机缩为 32px。无价格依据时显示文字状态，使用较小字号。
- **Zone name / Zone code:** 地图内的区名与字母。手机宽度下分别扩大到 34 和 20 个 SVG 用户单位，保持缩小地图中的可读性。

商品售价、建议价、价格依据摘要、清单金额和数量使用 `font-variant-numeric: tabular-nums`。页面标题和区块标题使用平衡换行；商品简述保持单行省略，完整任务信息继续由商品名称、价格与单位承担。

**The Price and Unit Rule.** 金额与计价单位一起展示；价格强调不削弱单位、来源和说明的可读性。

## Layout

页头、主内容和页脚共享居中容器（最大宽度 1376px）。桌面左右留白为 42px；页头高 82px，主内容上内边距 34px、下内边距 64px。常用间距值见前置 YAML，局部布局保留其实际间距，不把整站强制改造成统一倍数网格。

导购工作区在桌面采用两列：对话列为 `minmax(330px, 0.92fr)`，地图列为 `minmax(0, 1.55fr)`，列间距 24px，两面板默认高 634px。商品区为四列，列间距 23px、行间距 29px；商品照片与文字直接排列在页底上。

门店地图页使用 270px 目录加弹性地图，间距 25px，展开地图默认高 735px。购物清单使用弹性列表加 300px 汇总列。超市端录入与定价区域为 `1fr 1.13fr`，共享一个带边框的白色工作面；表单字段通常为两列。

| 条件 | 已实现的响应行为 |
| --- | --- |
| ≥1550px | 主内容上留白增至 42px；导购面板高 670px，展开地图高 790px，商品照片高 202px。 |
| ≤1100px | 页面左右留白改为 26px；导购两列收紧，列间距 18px；地图目录为 230px，清单汇总列为 260px。 |
| ≤800px | 页头改为两行，总高 122px；主导航在品牌与角色切换下方等分。页面左右留白为 20px；对话、地图、清单和后台主面板均改为单列；商品网格为三列。地图目录变为四列；商品分类可横向滚动。 |
| ≤480px | 页面左右留白为 17px；商品网格为两列，目录为两列。对话面板高 536px，导购地图高 475px，展开地图高 530px。清单条目换行，将数量与金额放到下一行。 |

手机库存将表格行重排为三列网格（弹性内容、75px 价格列、48px 操作列），隐藏表头并显示库存文字标签。商品名、分区、售价、库存和“编辑”均留在可见宽度内；不依赖横向滚动才能编辑。

地图在独立滚动区域内缩放，宽度、最小宽度与高度同时乘以缩放比例；范围为 1–1.7，按钮每次调整 0.2 并钳制到边界。地图注释、指南针和缩放按钮留在容器位置。

## Elevation & Depth

大部分界面通过底色、细边线和内容留白建立层次。主面板没有常驻大阴影；阴影集中在选中的角色按钮、照片上的加号、消息提示和地图货架。

### Shadow Vocabulary

- **角色选中态**（`0 2px 6px #2e472c0a`）：让角色切换中的白色按钮从浅底中浮出。
- **商品加号**（`0 3px 9px #21361714`）：区分照片上的白色圆形操作。
- **消息提示**（`0 8px 24px #203e2921`）：承托页面底部的临时状态提示。
- **输入焦点**（`0 0 0 2px #e6eedc`）：对话输入区聚焦时的局部浅色轮廓。
- **地图货架**（SVG `feDropShadow`：dx 0、dy 5、stdDeviation 3、颜色 `#34433a`、不透明度 0.07）：为分区矩形提供轻微离地感。

**The Quiet Surface Rule.** 新增常规面板沿用白底和浅边线；悬浮操作与临时提示才使用对应的现有阴影层级。

## Shapes

任务面板使用较大的圆角，按钮、输入框和分类筛选使用更紧的圆角，具体值见前置 YAML。商品照片保持圆角矩形；头像、状态点、加号和当前位置使用圆形。对话气泡保留朝向：助手的左上角与用户的右上角为 2px，其余角为 12px。

多数边线为 1px；上传区使用虚线边框。地图分区用 12 个 SVG 用户单位的圆角，默认白色描边为 2，选中或路线经过时改为分区深色描边、宽度 3，并增加圆点标记。键盘焦点和悬停对分区矩形使用 3 单位的绿色描边。

## Components

### Buttons

主按钮为森林绿底、白字、适度圆角；次按钮为白底和浅灰绿边框。常规按钮最低高 42px，紧凑按钮最低高 35px，并使用较小文字。文字操作使用森林绿，悬停时加深并出现下划线；图标按钮采用透明底，悬停出现浅绿底。

默认按钮状态色过渡为 180ms，使用 `cubic-bezier(0.16, 1, 0.3, 1)`。禁用按钮显示禁止光标并降为 0.46 不透明度；对话发送按钮例外，使用专门的浅绿禁用底色。

### Chips

商品分类默认透明底，悬停浅绿，选中为森林绿底白字。楼层和辅助标签采用浅色小矩形。图片识别候选使用可换行的浅绿按钮组，选中时加深底色和边线；各类标记不替代可读的名称。

### Cards / Containers

对话、地图和后台工作面使用白底、浅边框和面板圆角。面板标题与内容以细线分隔。商品卡片由实物照片、分区及货架、名称、简述、售价和“带我去”组成，不增加外围白色卡壳。

商品照片采用覆盖裁切；悬停时在 400ms 内缩放到 1.035。照片上的圆形加号在加入清单后变成森林绿底勾选标记。上传预览改为完整包含裁切，方便核对商品。

### Inputs / Fields

字段使用白底、浅绿灰边线，最低高 40px；标签位于输入框上方。常规字段与选择器保留原生输入行为。全局键盘焦点为 3px 苔绿轮廓、3px 偏移；对话输入区通过外框变色和浅色轮廓显示焦点，最终售价输入区使用独立的 2px 焦点轮廓。

对话输入支持换行和中文输入法；Enter 发送，Shift+Enter 换行，输入法组词期间不发送。图片与语音操作留在输入区内，发送操作靠右。错误以暖色内联提示显示，字段内容保留以便修正。

### Navigation

桌面主导航居中，当前页使用深绿字、中等字重和底部 3px 指示线，同时标注 `aria-current`。角色切换位于右侧，选中态为白色背景，按钮使用 `aria-pressed`。窄屏导航下移为独立一行；清单数量以嫩叶绿小标记显示。

### Conversation

助手消息为浅灰绿底并带小叶片头像；用户消息靠右、使用森林绿底。历史记录独立滚动，消息区域通过礼貌级实时通知播报更新。顾客端在导购、地图和清单之间切换时，对话组件保持挂载，消息、输入草稿和筛选上下文延续。

无历史问题时显示可直接发送的示例。查找中用三点轻微明暗变化；结果商品采用紧凑照片行并提供路线动作。状态文案依据配置显示“大模型已配置”或“规则导购可用”。

### Store Map

SVG 地图以浅网格、柔和分区和轻量货架形状构成。区名与字母编号始终同时出现；分区支持鼠标点击及 Enter、空格键操作。路线为白色衬底上的叶绿虚线，圆端点和圆拐角；多站路线以森林绿圆形数字标记顺序。

当前地点使用深绿实心圆、白边、浅色外圈和方向小箭头。路线摘要包含目的地、估算距离与时间，可展开步行指引，并提供“模拟到达”。位置选择和“虚拟门店”提示保持可见，保留手动位置这一实际含义。

### Inventory and Pricing

后台把上传录入与价格建议放在相邻工作区。建议价配来源、历史中位数、参考价和可展开记录；最终售价独立输入，并保留单位。库存桌面为有轻色表头的表格，手机按 Layout 中的规则重排；“编辑”操作始终有文字标签。

### Feedback and Motion

空状态使用小幅图形、具体说明和恢复按钮。保存及清单操作反馈显示为底部深绿提示，并使用 `role="status"`。对话查找三点周期为 1.2s，旋转指示为 0.9s，骨架为 1.6s，路线流动为 1.5s，提示进入为 200ms。启用减少动态效果时停用动画与过渡，并取消商品图片缩放。

## Do's and Don'ts

### Do:

- **Do** 复用现有森林绿主色、温白底面和浅色边线表达操作与层级。
- **Do** 让地图、目录和商品分区共享固定的深浅配色、区名与字母编号。
- **Do** 使用本地 Noto Sans SC Variable，价格配单位，数值采用等宽数字。
- **Do** 在手机上完整保留商品售价、库存和可见的编辑入口。
- **Do** 保留键盘焦点、地图键盘操作、状态通知与减少动态效果支持。
- **Do** 在演示数据、手动位置和模型配置状态出现的界面位置保留准确说明。

### Don't:

- **Don't** 用更浅的说明文字替换现有加深后的辅助色，或仅靠颜色区分商品分区。
- **Don't** 给常规面板添加未在当前界面出现的大阴影、光晕或额外卡片边框。
- **Don't** 把本地打包字体改成依赖运行时外网字体请求。
- **Don't** 只放大地图容器或单独拉伸一边；图形宽高应同步缩放。
- **Don't** 因顾客端切换页面而清空对话、输入草稿或筛选上下文。
- **Don't** 把商品图片、价格依据或当前位置的演示状态表述成实时真实能力。
