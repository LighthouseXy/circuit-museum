# 产品编年史交付

2026-10-03。正式内容与本地页面验收均完成。预览： http://127.0.0.1:4173/ 。新版验收见 `chronicles-review.md`；实施与回归证据见 `test-results.md` 和 `evidence/browser-results.json`。本功能聊天仅修改本项目docs。

## 内容

- `chronicles.json`：ready，手机5、电脑8、手表6、手环4、耳机6，共29节点。20个引用馆藏，9个为历史背景；背景与重复引用不增加馆藏计数。
- `collection.json`：40件，10件替换完成；保留TPS-L2、2006年初代MacBook、iPhone 4。新增展品有中文背景、设计观察、策展解读、日期依据、来源及关联详情。
- `collection-40.csv`、`chronicles-collection-40.csv`、`catalog-content.tsv`、`curatorial-catalog.md`与正式馆藏一致。
- 五类概述控制为77—86字；各类有独立发展线索与当代代表。日期区分订购、原型、监管批准、公告、上市和列售观察。Smart Band 11 Active采用2026年9月意大利官方活动页列售口径。
- `evidence/chronicles-data-check.json`通过数量、引用、关联、媒体引用及导出一致性检查。所有展品有有效相关链接；修正了AirPods 5变化说明。

## 本地实现

代码聊天已恢复并完成最终构建。页面呈现品类图录、逐节点日期来源、详情往返及展签式馆藏。实施侧18组浏览器检查通过，脚本错误为空；本功能聊天另行进行了实际浏览器与截图复核，详见新版验收记录。

实际33件主照片、5个影像外链、3处内部观察。7件缺照片显示资料展签，名单见浏览器证据。`media-register.json`的研究候选与实际下载选择分开记录；实施照片许可记录由其implementationSnapshot指向 `../src/image-overrides.json`。

此交付已清除“新版尚未构建”的阻塞状态。根目录README及网站代码不在本线程限定的docs修改范围内；技术测试报告由实施聊天维护。公开发布未执行。

根目录README的完整更新文案已准备在 `README-update.md`，统计与本版功能一致，可替换旧首页和27照片表述。本线程保留docs范围，未替换根目录README。
