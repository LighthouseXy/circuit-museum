> 最新状态：产品编年史本地新版已验收通过，40件馆藏、五类29节点、33件主照片。详见[新版策展与视觉验收](chronicles-review.md)。下文保留为旧版复核记录。

# Circuit Museum · 首版策展与视觉复核

复核时间：2026-10-03 01:09；收尾更新于01:10，Asia/Shanghai。对象：本地 `http://127.0.0.1:4173/`、实际生成数据与页面，以及 `docs/evidence` 的桌面和手机截图。本线程只修改 docs；没有改动网站实现。

**旧版收尾结论：原40件图录的唯一手机首屏P2已于01:15定点复核关闭。随后新增“产品编年史”核心需求，整体首版重新进入设计/实施阶段；以下旧版通过项不代表新功能已验收。** 没有发现需要回退40件范围或重做视觉方向的 P0/P1 问题。13件照片缺口按既定方案明确显示，作为首版局限列出。

## 需要处理的项目

### 已关闭 P2 · 手机馆藏首屏完全被说明与重复筛选占用

- 原问题：01:06版390×844首屏没有展品。01:15打开最新 [390px 馆藏截图](evidence/390-collection.png)，已见Radiola III完整照片和名称；重复标签组隐藏，类别、年代和排序保留为有标签的控件。只读读取正在运行的 `/exhibits/` 和 `/style.css`，分别与dist页面及src样式一致，确认不是仅修改截图。
- 位置：`src/style.css` 的移动端 `.page-title`、`.category-tabs`、`.filters`；`scripts/build.mjs` 的馆藏筛选结构。
- 原因：九个类型入口占三行，紧接着又出现作用相同的“产品类型”下拉框；标题和介绍也占较多垂直空间。
- 最小处理：手机保留一个主要类型入口（可横向滚动并可键盘访问），减少重复类型控件和标题上下留白；年代和排序可以并列。桌面不必重构。
- 验收：390×844 的初始馆藏视口出现第一件展品的名称和至少部分真实照片，搜索、类别、年代及排序仍可达；320px 无横向溢出。

### 已解决 · 最后两条设计事实来源同步

- 本轮设计文档已补 `SX01`（Programma 101 的打印与磁卡）和 `SX02`（初代消费版 Vive 的头显、控制器与房间定位）；01:07比对时 `docs/collection.json` 已有，`src/collection.json` 对应 `sourceIds` 尚缺这两项。它们补足具体设计段落依据，不改变展品数量或年份。
- 收尾复核：实现线程随后重新构建，最新 `src/collection.json` 的引用差集为空，新增来源已进入实现数据；本项关闭。后续仍可在 `/exhibits/olivetti-programma-101/` 与 `/exhibits/htc-vive/` 的来源列表查阅。
- 来源：[CHM 的 Programma 101 专页](https://www.computerhistory.org/revolution/story/62)、[HTC 2016年消费版发布稿](https://www.htc.com/ca/newsroom/2016-02-21/)。

## 已核实的范围与结果

| 检查项 | 结果及证据 |
| --- | --- |
| 40件独立产品 | 文档与实现均40个唯一 slug；没有靠颜色、容量或地区包装凑数。年代1924—2022；1904、1922、1947是另外的历史背景。 |
| 8种产品类型 | 实际馆藏导航为声音6、个人计算10、游戏8、移动6、创造1、影像3、生活4、穿戴2；年代作为辅助筛选。 |
| 指定3件 | iPhone 4、2006年初代 MacBook、Walkman TPS-L2 都有独立详情与实际照片。MacBook引用2006-05-16消费系列发布稿，未替换为MacBook Pro。 |
| 产品为主视觉 | 新版首页暖白底、克制绿灰文字与大幅TPS-L2实物照片；无霓虹、电路纹理、扫描线或装饰动画。三件首页精选已由占位变为真实照片。 |
| 中文内容 | 40件有展签、背景、设计、独立标注的策展解读和史料；编辑边界已移出多数访客段落，保留必要的历史代际区别。关联slug与所有文档来源引用通过结构检查。 |
| 视频 | 实现数据5条站外链接，首页显示Sony、CHM、iFixit三条；另两条关联Speak & Spell和PlayStation。均有标题、发布方与摘要，无需嵌入。现场查看首页确认3个外链存在。 |
| 内部观察 | HP-35、iPhone 4、2022 LCD Steam Deck三件接入；HP-35有独立内部照片；后两件原创简述配原拆解外链，没有复制iFixit图片。实际iPhone 4页面可见“玻璃与钢框之内”。 |
| 检索 | 手动测试“随身听”1件、“苹果”9件、倒序首件Steam Deck；既有 `npm test` 最新运行3项全过。 |
| 实际媒体数量 | 最新实现40件中27件带主图，另有1张HP-35内部图。不能把28张图片说成28件已配图展品。 |

数据审阅记录见 [curatorial-data-check.json](evidence/curatorial-data-check.json)。首次运行单元测试曾因视频数组为空失败；实现更新后重跑3项全过。因此不把首次失败继续列为未修缺陷，也不把旧截图里的空视频区、精选缺图作为当前状态。

## 照片代际与署名复核

- 实际MacBook照片 [MacBook white transparency.png](https://commons.wikimedia.org/wiki/File:MacBook_white_transparency.png) 的来源日期为2006-05-22，匹配初代；摄影者Jean-Pierre Louis，CC BY 2.0。原图只有518×424，适合当前展台，不宜再放大作全屏高清图。
- 实际iPhone 4照片 [IPhone 4 Black.jpg](https://commons.wikimedia.org/wiki/File:IPhone_4_Black.jpg) 为2010-06-24拍摄，Taylor Shomaker释出公有领域，未混用4S。
- TPS-L2保留Binarysequence摄影与Ubcule色彩校正署名。Steam Deck保留Liam Dawe / GamingOnLinux及VulcanSphere修改署名，使用2022 LCD实物。
- PlayStation实际采用SCPH-1000及早期控制器，优于候选登记中后期SCPH-5001/DualShock组合；后者仅为备用，不能替换后仍称首发配置。
- Atari实际为六开关版本并有年份说明；Apple-1已说明木壳属于拍摄实物，不是统一原厂套装。IBM照片说明运行后来的MS-DOS 5.0，避免把演示软件当成1981年配置。
- PalmPilot作者链接要求已落实为 `creatorUrl` 并由统一署名组件输出。许可文件页：[Palm Pilot Professional 01.JPG](https://commons.wikimedia.org/wiki/File:Palm_Pilot_Professional_01.JPG)。
- 网站实际照片与 `media-register.json` 的候选并非逐一相同；不同文件各自有署名，不能直接套用候选登记的作者。`src/image-overrides.json` 与 `docs/evidence/image-metadata/` 是本次实际素材对应依据。此次做重点型号与许可抽核，不宣称完成了外部图片版权的法律审计。

## 明确局限

仍缺主图的13件：Marconi 702、Philips EL3300、Programma 101、DynaTAC 8000X、Sony D-50、Nokia 9000、Tamagotchi、AIBO ERS-110、初代Kindle、初代iPad、初代Echo、初代Apple Watch、HTC Vive。当前采用明确的“实物照片待补”资料面板；按首版允许缺图的约定，不为这些条目伪造或借用其他型号照片。

本轮打开并检查了6张原始截图，也重新检查了更新后的首页及390px馆藏截图，并通过实际浏览器查看最新首页、馆藏和iPhone 4详情。收尾时已读取实现线程于01:09:20保存的 [browser-results.json](evidence/browser-results.json)：320/390/768/1440px 无横向溢出、40个直接详情地址、27张照片解码、3处内部观察、筛选返回、媒体失败提示、404、跳转主内容、减少动态效果与640px重排均记录通过，错误数组为空。此为已检查的实现线程回归记录；没有额外声称真实浏览器200%缩放或所有外部链接均已逐个验证。第三方视频原发布页面已核查，不承诺任意访客网络均可播放。

最新旧版记录：`docs/test-results.md`记载构建、语法检查、4项测试通过；01:12:21浏览器记录12组检查通过、错误为空。13件缺图、未专项验证原生缩放/实体手机/完整屏幕阅读器、视频外站播放等局限保留。新增“产品编年史”另按其设计和验收标准完成，不据本报告提前宣称新增要求通过。
