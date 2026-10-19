# 山姆跨品类批量采集

范围为超市主类：肉禽、水产、乳品蛋类、烘焙、熟食、水果、蔬菜、冷冻食品、粮油、调味、零食、饮料、纸品、清洁、家居、宠物、母婴、个护、服饰。每个最终主类至多 100 件，按 Item # 去重；不足时继续读取公开分类页，来源耗尽后保留实际数量。

## 数据流

1. `scripts/samsclub-iab-source.mjs` 通过当前人工验证后的浏览器会话读取公开页面，保存完整 DOM 与来源元数据。遇到人机验证即停止，不自动解答或绕过验证。
2. `scripts/samsclub-iab-ingest.mjs --watch` 处理已保存详情，读取 Item #、主商品图库、介绍、规格和渠道报价，下载原图并生成卡片及缩略图。
3. `scripts/samsclub-build-queue.mjs` 在采集批次边界更新待办，优先补齐覆盖较少的主类；多余候选写入可恢复的 deferred 队列。
4. `scripts/samsclub-queue-worker.mjs` 协调批次边界，更新队列并运行 `scripts/import-samsclub-catalog.ts` 导入 SQLite。导入不覆盖已有商品的人工价格、库存或历史。

浏览器会话由当前 Codex 采集任务持有。普通 Node watcher 只负责本地解析、图片下载和数据导入，不能单独恢复已关闭的浏览器采集会话。

## 文件

- 来源目录：`shared/samsclub-catalog.json`。
- 本地图片：`public/images/samsclub/<Item #>/`；原图为 `00.jpg` 等，卡片 `card.jpg`，缩略图 `thumb-00.jpg` 等。
- 原始网页及元数据：`.cache/samsclub-bulk/verified-pages/`。
- 待采集队列：`.cache/samsclub-bulk/pending-pages.json`；延后候选：`deferred-pages.json`。
- 下载/解析进度：`.cache/samsclub-bulk/ingest-progress.json`。
- 各类计数：最近一次 `.cache/samsclub-bulk/queue-refresh-response.json` 中 builder 的输出，以及当前来源目录、SQLite。
- 原有商品与派生字段更新前均有 SQLite 备份；原商品备份位于 `data/market.before-samsclub-only-2026-10-16T06-05-02-758Z.sqlite`。

请求图片尺寸为 2000×2000，保留 CDN 实际返回尺寸，不将 1500px 原图放大成 2000px。价格保留门店、渠道和采集时间，称重估价不作为固定净重包装价。

## 克隆后恢复图片

商品目录及公开 CDN 来源随 Git 保存；约 3.3 GB 的图片、派生图及下载记录保留在本地，不进入 Git。复制项目时可一起复制 `public/images/samsclub/`；新克隆可按目录恢复：

```sh
npm run catalog:samsclub:images                  # 仅列出缺失数量，不联网
npm run catalog:samsclub:images -- --download    # 下载缺失原图并生成卡片、缩略图
```

可加 `--limit=20` 只处理目录前 20 件；重复运行只补缺失文件。恢复不修改商品目录、价格或库存；CDN 文件失效或访问受限时停止并报错。需要 Node.js、curl 及项目依赖，不调用模型服务。

## 本轮结果（2026-10-18）

已导入 1,867 件，保存 12,963 张图库原图。1,618 件已安排陈列，249 件保留待确认；其中包含鲜花等主类之外的商品。19 个主类共 1,751 件，14 类达到 100 件，其余水产 88、熟食 89、水果 46、蔬菜 71、冷冻食品 57。每个最终分类均不超过 100 件。另有 2 个详情缺少明确主商品图库而未导入；120 条候选因品类上限跳过。当前已发现且未超上限的候选队列已处理完，超限候选仍保存在本地 deferred 队列。

## 目录复核（2026-10-19）

`npm run catalog:samsclub:review` 对来源目录重新执行复核，默认只打印统计；加 `-- --write` 才改写 `shared/samsclub-catalog.json` 并生成 [复核记录](docs/review/samsclub-catalog-review.md)。每次采集或 `--reclassify-generated` 之后都应重新运行，结果只取决于商品自身的来源文字和复核文件，可重复执行。

- 储存条件：只采信商品页规格、亮点和介绍中的储存原句（兼容 Refridgerated 等原站拼写错误），区分开封前后；规格表优先于营销文字。68 件由此确认。
- 人工复核：来源页没有写明时，在 `shared/samsclub-review.json` 按品类常识填写并注明理由（如切片奶酪冷藏、瓶装番茄酱常温）。来源原句存在时，人工结论不会覆盖原句。60 件按此确认。
- 分类修正：35 件食品改到正确主类，例如冷冻鸡胸和牛肉饼从水产改为肉禽、番茄酱和蛋黄酱从蔬菜改为调味、热狗面包从肉禽改为烘焙。调味 115、肉禽 110、烘焙 106、粮油 101 因此超过 100 件，按决定继续销售；采集上限仍按每类 100 件执行。
- 归档：71 件鲜花花艺不属于 19 个主类，45 件非食品的正确主类已满 100 件，均修正分类后归档，不在顾客端展示、不占货架，记录保留可恢复。
- 净含量：重新解析液量（fl. oz.、加仑、夸脱）、“1 lb. 6 oz.”式组合重量、多包装（用页面单价印证是否需乘件数）、过时规格表、鸡蛋按枚；按磅称重商品按“页面估价 ÷ 每磅单价”估重并标为估重。餐单可用食品由 654 件增至 1,026 件，其余 25 件来源未写净含量（定制蛋糕、整只菠萝等）。
- 仍待确认 5 件：鲜莎莎、两件咖啡档热食、蟹柳、熟培根碎，原因见复核记录。

## 运行约束

遵守工作区 `AGENTS.md`：不计算或校验文件哈希，不进行网页操作测试，不调用大模型 API 做测试。浏览器仅用于实际源站采集。必要检查限于本地构建、接口和基础业务。

暂停 ingest 使用 `.cache/samsclub-bulk/STOP`；暂停队列协调器使用 `STOP-QUEUE`。改写源目录或执行 `--reclassify-generated` 前，应等待 ingest 当前处理结束。采集进行时不并发改写 pending 队列。
