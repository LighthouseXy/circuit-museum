# 产品资料、馆藏扩充与显示预览

2026-10-11：216件去重选择实体，筛选池262条。发现与长期覆盖没有总数上限，一篇可靠、具体的正面媒体原评即可支持候选；不强加历史意义。当前先完成≥150实际可浏览馆藏及已约定首页/编年史布局。双核心、广泛产品资料库和全生命周期只是后续规划，不纳入本轮交付、不阻塞当前任务。

本轮追加122份完整稿；连同先前14份，新完整稿合计136份，加原40件可覆盖176件。另40件仍为事实档案。生产文件当前观察40件，原实现正在处理导入；研究清单、正文总包和本预览都不是正式站点已完成150件的证明。

查看显示效果：[新版预览首页](http://127.0.0.1:4174/expanded-layout-preview.html?view=home) · [电视](http://127.0.0.1:4174/expanded-layout-preview.html?view=chronicles&type=display) · [VR](http://127.0.0.1:4174/expanded-layout-preview.html?view=chronicles&type=immersive) · [游戏](http://127.0.0.1:4174/expanded-layout-preview.html?view=chronicles&type=gaming) · [型号目录](http://127.0.0.1:4174/expanded-layout-preview.html?view=catalog)。[正式站点](http://127.0.0.1:4173/)用于对照实际实现。

## 最新输入

- [累计完整稿JSON](complete-batch-150-ready.json) / [批包说明](complete-batch-150-ready.md)：136份新全文、分节与嵌套引用、稳定ID建议及累计关联；只作导入输入。
- [顺序导入清单](import-manifest.json)：19个自然分包，派生JSON在import-packets；每包只链接已导入前序和同包型号，避免部分导入断链。
- [生产进度与结构验证](prose-production-progress.json)、[证据修正](content-evidence-corrections.json)：原40冻结保全、122追加完成、引用/关联闭合，以及K380计划日与ScanSnap版次纠正。
- [正式选择](selection-150.json)、[页面方案](expanded-page-plan.json)：既有216实体与12首页行/16阅读线/45阶段；不重开研究，阶段为策展读法。
- [自然交接](implementation-handoff-150.md)：原实现的导入、增量字段及实际网页验收边界。

此前complete-batch-14、content-batches-150和expanded-validation保留为首批14稿阶段记录。后续正文数量以prose-production-progress为准。旧selection构建器会重放早期摘录，不作为这次正文交付的复现步骤。

## 查看与复现

预览首页选品类，顶部型号目录可查品牌、型号和年份。详情注明完整稿或事实档案。媒体观点保留作者、日期、版本、优缺点、测试及商业条件。既有照片沿原作者与许可，新型号暂无授权媒体时文字回退。

两项本地服务已在运行；关闭后可分别启动：

```sh
cd /Users/xyu/Program/circuit-museum
npm run dev
```

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory /Users/xyu/Program/circuit-museum/docs/expansion
```

累计复现只写本目录：

```sh
python3 docs/expansion/build-complete-wave-compute.py
python3 docs/expansion/assemble-prose-delivery.py
python3 docs/expansion/render-expanded-preview.py
python3 docs/expansion/validate-prose-delivery.py
```

## 后续规划及前阶段边界

[产品内容模型](product-model-increment.md)、[实体叠层](product-records-overlay.json)、[额外预览](expanded-future-model-preview-draft.html)均保留为后续规划草稿，不属于当前导入输入或必需验收。先完成150馆藏任务，再由本原功能线程分析设计新方案，自然交接本原实现线程。

原研究、首六稿和旧七线预览继续保留。它们的46件、七线26阶段和游戏止2022不是最终范围限制。扩搜研究来源不代表全部全文重读；手册索引/摘录、不可解析、厂商回顾、借测及返佣均保持原核查范围。

原40保全快照为base-40-preserved.json，SHA256为41ab8a43935829933ba6b0de54a1d03627eb0d94cf8f4fdc61bdf5d2632e7f8a。生产后新增型号不会使此快照失效，不能再要求整个现生产文件等于40件快照哈希。本聊天只写docs/expansion，没有修改正式collection/chronicles、网站代码、dist或根README；没有部署或实物测试。

## 最新可视预览与正文修订（2026-10-11）

本地预览：http://127.0.0.1:4174/expanded-layout-preview.html?view=home 。导航首页→馆藏→产品编年史→关于，176件已有完整介绍均有解释性修订，另40件仍是事实档案。editorial-delivery-manifest.json列23份自然包与同slug修订规则，editorial-revisions-ready.json为预览叠层；不增加独立型号计数。正式collection.json现场数量54件，原40原文不自动覆盖，122份额外完整新增稿交原代码聊天实施后验收。
