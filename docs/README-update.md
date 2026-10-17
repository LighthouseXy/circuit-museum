# Circuit Museum · 赛博电子博物馆

以真实产品为中心的电子产品线上展览。首页“产品编年史”沿手机、电脑、手表、手环、耳机五条脉络，呈现形态、技术与使用方式的变化。当前馆藏40件，包含29个有来源的编年史节点；实物详情与历史背景分别呈现，背景不增加馆藏计数。

## 本地查看

使用Node.js 22或更新版本，无需安装生产依赖。在项目目录运行：

```sh
npm run build
npm run dev
```

打开 http://127.0.0.1:4173/ 。`PORT=其他端口 npm run dev` 可更换端口。构建输出位于 `dist/`；修改内容或样式后重新构建。当前已完成本地实现与验收，尚未公开部署。

## 阅读与探索

- 五类编年史各有独立概述、早期背景、关键变化和当代代表；共29节点，其中20个引用馆藏、9个属于历史背景。
- 日期注明订购、原型、监管批准、发布、发售或官方列售观察等口径，来源紧邻节点。
- 品类地址可分享，详情往返保留品类与节点位置；关闭JavaScript时，五类正文依次展示，品类入口跳至相应章节。
- 40个独立展品详情，提供中文背景、设计观察、策展解读、事实依据与相关展品。
- 馆藏支持产品类型、年代、关键词组合筛选及升降序；中文品牌别名、型号空格和连字符搜索可用，筛选地址可分享，详情返回保留筛选条件。
- 手机与平板布局、键盘焦点、跳到正文、图片失败文字回退，以及明确的未知地址提示。

## 实物与影像

40件馆藏中，33件已配实物主照片，另外7件显示馆藏资料展签并保留正文及来源。另有1张HP-35内部细节照片。实际照片作者、许可、原文件页及转码说明保存在 `src/image-overrides.json`，并显示在页面中。

待补照片：SP/3、Pulsar P1、DynaTAC 8000X、Kindle第一代、iPad第一代、13英寸MacBook Air M5、Smart Band 11 Active。

5个影像入口链接到原发布页面，未自动播放或请求视频嵌入。3处内部观察覆盖iPhone 4、Steam Deck LCD和HP-35；前两项采用原创文字分析及出处，HP-35另有授权内部图。第三方视频在访客网络中的播放情况尚未专项验证。

## 维护入口

- `docs/chronicles.json`：五类编年史的正文、日期与来源。
- `docs/collection.json`：40件馆藏的正文、分类、关联展品与引用。
- `docs/media-register.json`：媒体研究候选、影像入口与实际实施记录索引。
- `src/image-overrides.json`：实际页面使用的照片及具体文件许可。
- `scripts/import-collection.mjs`：将正式策展数据导入 `src/collection.json`。
- `scripts/build.mjs`、`scripts/render-chronicles.mjs`、`src/style.css`、`src/app.js`：页面生成、编年史图录、样式与交互。

图片随项目提供，普通构建无需联网或图像处理库。新增照片先核对准确型号与文件许可，再使用 `scripts/download-images.mjs`；该维护脚本需要Sharp，并接受库路径作为第一个参数。

## 验证

```sh
npm run build
npm run lint
npm test
```

本版构建、7个文件的Node语法检查、6项单元测试及18项本地浏览器回归通过。浏览器证据包含五类切换、来源与年代顺序、手机首屏、分享新会话、详情往返、全部40详情、33主照片解码、图片失败回退及10个撤展地址的404。

浏览器回归使用本地Playwright和Chrome：

```sh
node tests/browser.mjs /absolute/path/to/playwright /absolute/path/to/chrome
```

运行前启动本地预览。具体范围与限制见 `docs/test-results.md`，机器结果与截图见 `docs/evidence/`，策展及视觉验收见 `docs/chronicles-review.md`。
