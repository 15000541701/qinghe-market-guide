# 真实 SKU 与陈列管理

## 本次商品来源

首批29个商品档案于2026-10-12依据公开零售页面整理，数据在 `shared/real-catalog.ts`。来源为山姆会员商店官方京东店与京东零售商品页面，不是完整门店商品库，也不代表这些商品已在青禾门店有库存。部分商品详情页要求验证；只采用公开列表中能确认的标题、规格及链接，未绕过登录或验证。

- [山姆官方店公开商品列表](https://samsclub.jd.com/view_search-633676-16141896-99-1-24-1.html)
- [山姆官方店牛奶商品公开列表](https://samsclub.jd.com/view_search-633676-32527372-99-1-24-1.html)
- [京东纸品](https://www.jd.com/brand/159014d69385123e522ed.html)
- [京东洗衣液](https://www.jd.com/hprm/15901de3a56fffd18d97b.html)
- [京东宠物食品](https://www.jd.com/chanpin/2982898.html)
- [京东调味及推荐商品](https://item.jd.com/product/7tnn1xFQjdbvo9oI7o7E2A.html)
- 禽蛋及鸡胸肉商品的单独来源链接保存在对应记录中。

本店 SKU 和来源平台商品编号分开保存。SAM-/JD-前缀与QH-前缀均为本项目内部 SKU 编码规则；只有来源页面实际提供编号时才填写 sourceSku。QH-不是伪造的零售商编号，也不是商品条形码。未知条形码留空。

当前顾客目录默认按 USD 美元展示。首批 1,000 条 USD 参考商品来自 Open Prices 官方 API 前29页，按条码去重，只纳入名称、品牌、净含量和同条码正面图齐全的 Open Food Facts 商品。记录保留原始价格、日期、折扣状态、price_per、Open Prices 记录号、来源门店和 proof；本批 price_per 均未注明，因此不换算或声称为每公斤/升报价。数据库中的库存初值为100并按本地订单扣减，不代表来源门店的实际库存。

来源：[Open Prices 价格记录 API](https://prices.openfoodfacts.org/api/v1/prices) 与 [Open Food Facts 商品档案](https://world.openfoodfacts.org/)。图片通过 Open Food Facts 正式 CDN 直接显示，图像路径与产品条码相符。数据库/图片署名与许可要求见 [Open Food Facts 使用条款](https://world.openfoodfacts.org/terms-of-use)。门店未管理商品库存数量；USD 价格记录地点编号来自来源 API，虚拟货架位置只用于本应用路线演示，不代表真实门店坐标。

原有 CNY 商品与历史数据仍保留，和默认 USD 顾客目录分开筛选、分别合计；切换币种不会删除另一币种的购物清单项目。人民币请求在 USD 模式下会提示切换币种。后加的29条 JD/Sam 中文目录与608条 display-* 批次均已归档，不进入顾客列表、超市默认列表或常规 SKU 导出。

此前的608条 display-* 演示 SKU 已停用并归档，不再自动重建。归档前完整记录保存在数据库迁移快照 `display-catalog-archive-v1` 中；29条 JD/Sam 目录另存于 `cn-retail-catalog-archive-v1`。这些记录可恢复，但不进入顾客列表、超市默认列表或常规 SKU 导出。

首次启动新版会归档只有初始 seed 价格记录的旧示例 SKU，并保存迁移快照；不会删除旧记录。带有人工改价记录的商品保留。演示 SKU 按稳定 ID 增量写入；重复启动只补缺失记录，不覆盖人工售价、货架、层位或其他编辑。旧种子商品仍需显式设置 SEED_DEMO_DATA=true。

## 区域和设施

地图扩展至47×23格，右侧新增纸品、宠物用品、日化护理、零食冷冻区域及陈列设施。已有区域和商品价格不覆盖；扩展位置与自定义区域冲突时跳过对应新增区域。设施类型新增卧式冷冻柜与服饰挂架，支持后台新增与编辑。

区域及设施属于可编辑的虚拟门店布局，不是山姆或京东实体门店的坐标。商品资料真实来源与本店陈列位置独立维护。

## 拖拽陈列

在超市端“拖拽商品陈列”中搜索商品，选择目标设施，把商品卡拖到侧面和层位。也可点击商品再点击目标层位按钮；触屏设备提供手柄拖动与点击方式。

保存只改变 shelfId、shelf、shelfSide 和 shelfLevel。服务端检查目标位置、通道可达性和位置是否已被别的操作更新；冲突会要求刷新，不覆盖新位置。待确认商品可以先安排陈列，但不会因此自动定价或上架。

## SKU 批量导入、导出

入口为超市端“SKU 批量导入与导出”。支持UTF-8 CSV（含BOM）和JSON，不支持直接上传XLSX；可在Excel中编辑CSV。单次最多2000条、文件最多5MB。

1. 导出当前SKU档案，或下载空白CSV模板。
2. 必填 sku、name、category、unit；分类使用已有分类ID或唯一名称。新增商品的 id 留空。
3. 指定设施使用 shelfId（推荐）或唯一设施名 shelf。侧面为 left/right/front/back，层位从下往上1–8。
4. 新资料缺少售价/库存时为 draft。上架使用 status=active，必须确认本店售价且陈列位置可达。archived表示归档。
5. 上传后显示预检、逐行错误及新增/更新统计；选择“仅新增”或“新增并更新同SKU”，无错误后确认整批写入。

更新模式保留空的选填字段；category和unit等必填字段仍需填写。售价为0与留空不同。改变计价单位会使旧市场参考失效，价格改变追加历史记录。确认前再次校验，任何行错误都会阻止整批写入，数据库事务保证不会只写半批。

CSV支持带逗号、引号与换行的字段，并在导出时处理电子表格公式前缀。JSON导出结构为 { version, exportedAt, rows }，并使用与CSV相同的档案字段；不导出API密钥、上传图片文件或完整价格历史。

对应API：GET /api/sku/export?format=csv|json（默认不含已归档；scope=all可含归档），POST /api/sku/import，PATCH /api/products/:id/placement。顾客目录每次显示48条，使用“加载更多”继续浏览，筛选和价格排序对完整结果生效。

本轮界面在Web超市端实现，小程序可复用后端数据；小程序的原生导入、拖拽及扩展地图界面尚需单独适配。
