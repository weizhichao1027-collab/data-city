# 让「数据城市」更真实 —— 路线图

> 基于一轮多源深度调研（33 个来源 → 150 条声明 → 对抗式核实，保留 23 条已验证结论）综合而成，并对照 `city.html` 当前实现给出可增量落地的步骤。链接均为已核实来源。

## 一、现状与"真实感差距"

当前 `city.html` 已具备：实时数据（天气/空气/地震/汇率/币价）、程序化网格城市、宏观模拟（人口/经济/科技/污染/幸福 + 电力/就业/医疗/教育/交通五系统）、46 个按"固定作息"行动的市民、第三人称附身与干预。

要更"真实"，主要差距在五处：

1. **城市是虚构网格**，不是你所在地的真实街道/建筑。
2. **NPC 决策是写死的日程**，不是由需求/效用驱动，缺乏涌现与个体差异。
3. **车流是装饰**，没有真正的跟车/换道/拥堵与寻路。
4. **系统是全局公式**（一个污染数、一个交通数），不是**空间化**（逐地块的地价/污染扩散/服务覆盖）。
5. **画面是基础渲染**，缺 PBR/级联阴影/后期/LOD/实例化人群，规模与质感受限。

## 二、优先级总览（按 真实感收益 ÷ 工作量）

可行性图例：✅ 浏览器直跑·免密钥·无后端　🔑 需密钥　🖥 需后端或构建步骤

| 优先级 | 项目 | 收益 | 工作量 | 可行性 |
| --- | --- | --- | --- | --- |
| ✅ 已实现 T1-A | **用真实地图(OSM)建城** | 极高 | 中-高 | ✅ 已落地于 city.html（Overpass 免密钥 + 镜像兜底） |
| ✅ 已实现 T1-B | **效用制 AI + Smart Object 重写 NPC 决策** | 极高 | 中 | ✅ 已落地于 city.html |
| ✅ 已实现 T1-C | **真实道路寻路 + 车流 + 拥堵** | 高 | 中-高 | ✅ 路网图 + A* 行人寻路 + 车流减速拥堵 |
| ✅ 已实现 T2-A | **Web 3D 质感**：bloom · 环境反射PBR · ACES · SSAO · 实例化人群(上千) · **自适应高清阴影** 均✅（多级 CSM 因需向 400+ 动态材质注入着色器、风险高而以"随镜头自适应阴影"等效替代） | 高 | 中 | ✅ |
| ✅ 已实现 | **可进入室内 + NPC 社交/记忆** | 高 | 中 | ✅ 进出建筑 + 相遇交谈结识 |
| ✅ 已实现 T2-B | **系统空间化：污染扩散 + 地价 + 数据热力图** | 高 | 中-高 | ✅ 元胞扩散网格 + 可切换热力叠加层 |
| ◐ 大部分 T2-C | **更多真实数据**：OSM 公交/轨道线 ✅ · **真实人口(普查级)** ✅ ／ GTFS 实时时刻表（需后端解析，待续） | 中-高 | 中 | ◐ 真实地点/线路/人口已落地 |
| ✅ 已实现 T3-A | **生成式智能体**：确定性记忆流+反思+模板对话 ✅ + **WebLLM 本地大模型对话（可选，需 WebGPU）** ✅ | 中（天花板可信度） | 高 | ✅ 浏览器内本地 LLM，graceful 回退 |
| ⭐ T3-B | **GPGPU 智能体：上千~上万 agent 跑在着色器里** | 中 | 高 | ✅ |

---

## 三、分阶段详解

### T1-A　用真实地图把城市建成你所在地（最高杠杆）　✅ 已实现
> 已落地：进入时经 Overpass（含镜像兜底）拉取真实建筑 footprint+高度、路网、真实地名 POI，挤出成 3D；市民在真实场所间生活；数据不足自动回退程序生成城市。下文为原始设计参考。

把虚构网格换成**你定位处的真实道路、建筑轮廓、地点**——这是"模拟现实世界"最直接的一跃，且与我们计划中的"真实场所"完全一致。

**数据入口**：[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) —— 免密钥、只读、把 OSM 当"网络数据库"查询，取道路(way/LineString)、建筑 footprint(way/Polygon，带 `height`/`building:levels`)、POI(node)。软限额 <1 万次/天、<1GB/天（实测带 CORS 可浏览器直连）。

**footprint → 3D 的三条免密钥路线**：
- **deck.gl `GeoJsonLayer` + `extruded:true`**：一层同时渲染道路(线)/建筑(面挤出)/POI(点)，高度走 `getElevation`。[文档](https://deck.gl/docs/api-reference/layers/geojson-layer)
- **MapLibre GL JS + OpenFreeMap `fill-extrusion`**：完全免密钥的 3D 建筑底图，高度来自 OSM。[官方示例](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/)｜[OpenFreeMap](https://openfreemap.org)
- **纯 Three.js**：[geo-three](https://github.com/tentone/geo-three)（OSM 瓦片免密钥、ES module）做世界级地形瓦片；自己把 Overpass 的多边形用 `THREE.Shape`+`ExtrudeGeometry` 挤出。参考教程：[用 three.js + OSM 建 3D 城市](https://medium.com/@elfensky/how-i-build-a-3d-city-on-the-web-with-three-js-and-open-street-maps-607fc0d7bd39)（[three-geo](https://github.com/w3reality/three-geo) 卫星贴图需 Mapbox 🔑）

**对本项目**：保留现有"网格生成"作为兜底；定位成功→拉 Overpass→把真实 footprint 挤出替换网格楼，POI 名直接当作场所名（接上第二步 NPC 的家/工作/商店）。

> ⚠️ 坑：Overpass 有限额且会 429 节流 → 大范围要**缓存/预处理**（见构建期方案）；OpenFreeMap 为单人维护的免费服务，有中断风险，生产宜自托管或备用 provider。

### T1-B　把 46 个 NPC 换成"效用制 + Smart Object"　✅ 已实现
> 已落地：市民有 精力/饱腹/社交/娱乐/金钱 五需求 + 个性权重；ACTS 列表即 Smart Object 广播（睡觉/吃饭/工作/购物/休闲/回家，各声明满足哪些需求）；urgency() 用 d² 响应曲线（接近耗尽陡升）；chooseAction() 按 需求紧迫×个性 + 时段 + 距离打分，在最高分 0.35 内 top-4 做加权随机；每 3~6 秒或到达后重新决策。已验证：精力低→睡觉、饿→吃饭、缺钱→工作。下文为原始设计参考。

当前 NPC 按 if-else 日程行动；改成**需求驱动的效用决策**，立刻更像活人、且最易扩展。做法（《模拟人生》原版）：
- 每个需求（精力/饱腹/社交…）用**分段线性响应曲线**映射成效用——**阈值前几乎忽略，阈值后陡升**。[Game AI Pro 第9章（《模拟人生4》首席 AI 著）](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter09_An_Introduction_to_Utility_Theory.pdf)
- **Smart Object**：让"床/餐厅/公司/公园"等**对象自己广播能满足哪些需求**，NPC 扫描周围对象按效用选择，而不是把行为写死在 NPC 里——Will Wright 原则"让人笨、让环境/物体聪明"，加新场所只需加对象。[Smart Objects 解析](https://archive-gaslamp.dredmor.com/2015/04/15/smart-objects-or-everything-i-know-about-ai-i-stole-from-the-sims/)
- **不要永远选最高分**（机械感）→ 在 top-N（前5 或最高分 10% 内）里做**加权随机**。同上 Game AI Pro。
- 可叠加 [GOAP](https://excaliburjs.com/blog/goal-oriented-action-planning/) 做多步计划（"没钱→去工作→才能买饭"）。

> ⚠️ 已否决：「模拟人生恰好 6 个需求」不成立——需求数量自定；效用可多因子组合，不必强制归一化。

### T1-C　真实车流：IDM 跟车 + MOBIL 换道 + 打分寻路
让车真正"开"起来并产生拥堵，反哺交通系统数值。
- **跟车/换道**：[traffic-simulation.de](https://github.com/movsim/traffic-simulation-de) 是**纯 JS+Canvas、无后端、可本地直接打开**的微观交通模拟，纵向用 IDM(ACC)、换道用 [MOBIL](https://en.wikipedia.org/wiki/Intelligent_driver_model)——可直接借鉴其算法骨架移植进 Three.js。
- **寻路**（《城市天际线》CS1 做法）：不走纯最短路，而按**拥堵+限速+方向**给路段打分；车**算出路线后锁定**、除非路网改变不中途重算（省算力）；用车辆目标段构造"watch out"做**先到先得**碰撞仲裁。[Deep Dive](https://www.gamedeveloper.com/design/game-design-deep-dive-traffic-systems-in-i-cities-skylines-i-)（注：CS2 改为动态绕行）

### T2-A　Web 3D 质感与规模
全部可在 Three.js 单页里增量加：
- **PBR 材质**（金属度/粗糙度/法线贴图）+ **环境贴图**（PMREM）提升质感。
- **级联阴影 CSM**：大场景远近都清晰。[three-csm](https://github.com/StrandedKitty/three-csm)
- **后期处理**：`EffectComposer` + UnrealBloom（夜景霓虹）、SSAO/SAO（接触阴影更实）。[文档](https://threejs.org/docs/#examples/en/postprocessing/EffectComposer)
- **人群规模**：`InstancedMesh` 合批建筑/车；[InstancedSkinnedMesh 一次 draw call 渲染上百带动画角色](https://dev.to/sagacheng/using-instancedskinnedmesh-in-threejs-enabling-the-rendering-of-hundreds-of-3d-characters-on-screen-simultaneously-15gm)；[海量人群性能工程](https://discourse.threejs.org/t/one-draw-call-massive-crowd-performance-engineering-in-three-js/89928)。综合优化清单：[Three.js 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)

### T2-B　系统空间化（从"一个数"到"一张图"）
把全局标量换成**逐地块网格**：地价随交通便利/绿地/污染变化，**污染按元胞扩散**，医院/学校有**服务覆盖半径**，停电按片区。整套成熟逻辑可参考 GPL 开源的 [Micropolis（原版 SimCity 引擎）](https://github.com/SimHacker/micropolis) 与 [SimCity 逆向算法图](https://smalltalkzoo.computerhistory.org/users/Dan/uploads/SimCityReverseDiagrams.pdf)（衍生须保持 GPL）。

### T2-C　更多真实数据
- **公交骨架**：[Mobility Database](https://mobilitydatabase.org/)（99+ 国家、6000+ GTFS/GTFS-RT/GBFS）给真实线路与时刻让 NPC 通勤。注：REST API 需免费账号+token🔑，有免 token 的 CSV 下载，CORS 直连未证实。
- **土地利用/POI**：随 Overpass 一并取（`landuse=*`、`amenity=*`）→ 真实分区与真实店名。

### T3（天花板/可选，受约束）
- **生成式智能体**：[Stanford Generative Agents（Smallville）](https://arxiv.org/abs/2304.03442)——LLM + 记忆流 + 反思 + 检索，25 个 agent 从一条种子指令涌现出派对/约会/协同。可信度天花板，但 **LLM 需密钥/后端、有成本与延迟**，不适合实时驱动 46 个；建议**只点缀少数关键 NPC**的对话/反思，主决策仍用 T1-B 的确定性效用制。也可探索 **WebLLM/WebGPU 本地小模型**或"记忆流+反思"的确定性简化版（向量相似度检索 + 规则反思）来近似涌现而不引入密钥。学术界对其作为"社会模拟器"的有效性仍有争议。

## 四、何时值得加一个轻量后端 / 构建步骤
默认坚持"纯静态 + 免密钥"。下列情况引入**构建期预处理（仍可静态托管，无运行时后端）**收益最大：
- **OSM 预处理为静态瓦片**：用 [Protomaps PMTiles](https://github.com/protomaps/PMTiles)（[serverless 地图](https://protomaps.com/blog/serverless-maps-now-open-source)）把目标城市离线切成单文件瓦片，绕过 Overpass 限额、秒级加载。
- **构建期生成静态 JSON**：预拉 Overpass/GTFS、简化几何、预生成导航网格 → 运行时只读静态文件。
真正需要**运行时后端/代理**的只有：① 隐藏密钥的数据（新闻、详细人口/经济）；② LLM 代理；③ 绕过个别 API 的 CORS。可用一个极小的 serverless 函数承担。

## 五、推荐的落地顺序
1. **先把"真实地图建城"(T1-A) 和正在做的"室内 + 真实场所名"合并完成** —— 一步到位让城市变成你身边的真实地方。
2. **再做 NPC 效用制 AI (T1-B)** —— 让这些真实地点里住进"真的会自己生活"的人。
3. **接着真实车流 (T1-C) + 画质后期 (T2-A)** —— 街道活起来、画面立起来。
4. 之后按兴趣推进 系统空间化 (T2-B)、更多数据 (T2-C)，LLM/GPGPU (T3) 作为亮点点缀。

---
*坑位备忘*：Overpass 限额→缓存/预处理；OpenFreeMap 单人维护→备用；three-geo 卫星图与 Mobility REST 需密钥；CS 交通机制特指 CS1；LLM agent 有成本且有效性存争议；需求数量勿固定为 6。

---

# 🔭 下一阶段：让它更好（Next Horizons）

> 上面那张"更真实"的路线图已基本落地。下一步"更好"不再主要是"更真实"，而是四条**新轴**：**有目的 · 更有深度 · 更沉浸可分享 · 更大规模**。✅=纯前端可做，🖥=需小后端。

## ✅ 实施状态（截至最新）
- **A 目的与玩法**：✅ 已实现（剧本目标 + 进度/计分/超时 + 随机危机）
- **B 深化模拟**：✅ 大部分（市库财政收支 + 建造成本 + 赤字惩罚）；疫情/气候轨迹/完整系统闭环待续
- **C 更活的市民**：✅ 已实现（生老病死/整代更替 + 人生愿望 + 城市新闻流；社交网络可视化待续）
- **D 留存与分享**：✅ 已实现（localStorage 存读档 + 快照 PNG）；分享链接/GIF 待续
- **E 沉浸与打磨**：✅ 已实现（程序化城市音效 + 静音）；电影镜头/湿地/季节/引导待续
- **F 规模性能**：◐ 部分（高/中/低画质档位）；GPGPU 数万人群 / Web Worker / 真·LOD 待续（需大重构）
- **G 数字孪生**：◐ 部分（OSM 真实水体）；SRTM 地形高程 / 实时新闻流待续（需后端或大重构）

## 现状诚实评估
- **强**：真实数据接入、真实地图建城、智能体广度、渲染质感、功能广度。
- **浅 / 缺**：① 没有"目的"——是沙盒玩具、不是游戏（无目标/成败/计分/重玩）② 系统是公式而非深层联动 ③ 市民可信但无生老病死/家庭/人生 ④ 无存档/分享 ⑤ 无音效 ⑥ 上手引导弱 ⑦ "演化未来"较轻、分支少。

## A. 给它一个灵魂：目的与玩法 ⭐⭐⭐ ✅
- 目标/剧本系统：任务（"幸福度≥90 维持 N 年""震后重建""30 年内碳中和"）、成败、计分、结算页。
- 真实数据触发的危机：热浪 / 经济崩盘 / 疫情，需要你应对。
- 分支未来：你的选择导向 乌托邦 / 反乌托邦 / 生态 / 赛博 等结局；城市历史"时间轴回放"。
- → 把沙盒变成有取舍、有重玩价值的体验。

## B. 深化模拟（深度 > 广度）⭐⭐⭐ ✅
- 真实财政：税收、市库、建造成本、破产——真正的经营压力。
- 系统联动闭环：就业↔通勤↔拥堵↔污染↔健康↔迁徙，带正负反馈。
- 市民生命周期：年龄、出生 / 死亡、家庭 / 住户、职业晋升、代际更替 → 人口结构随时间演化。
- 疫情模型（关系图上的 SIR 传播）、气候轨迹（你的排放 → 未来气温 / 海平面反过来影响城市）。

## C. 更"活"的市民与社会 ⭐⭐ ✅
- 关系网（家人 / 朋友 / 同事）+ 社交网络可视化。
- 每个市民的人生目标与故事（攒钱买房 / 升职 / 恋爱），汇成"城市新闻流"。
- 记忆→声誉、流言在关系网扩散、自发形成社群；可选 LLM（已接口化）做更丰富日记/对话。

## D. 留存与分享 ⭐⭐⭐ ✅（性价比极高）
- 存档 / 读档（localStorage）+ 导出 / 导入城市文件（JSON）。
- 可分享：城市快照 / "城市明信片"图、演化延时 GIF、分享链接 / 种子。
- → 让作品"留得住、传得开"。

## E. 沉浸感与打磨（便宜的大提升）⭐⭐ ✅
- 音效：WebAudio 程序化城市环境声（车流 / 人声 / 雨 / 地震警报）+ 轻音乐——投入小、沉浸感大。
- 镜头：电影化过渡、照片模式、延时摄影。
- 天气 / 时间视觉：雨天湿滑路面、体积感雾、日落渐变、四季植被。
- 首次引导：30 秒上手教程（高亮操作、"试试走进一栋楼"）。

## F. 规模与性能 ⭐⭐ ✅
- GPGPU 智能体（状态存纹理、着色器里跑）→ 数万级行人 / 车。
- 建筑 LOD + 视锥剔除；Web Worker 把模拟 / 寻路移出主线程。
- 移动端触屏 + PWA 可安装 + 性能档位。

## G. 更真实 / 数字孪生 ⭐ 部分🖥
- 更多 OSM 细节：土地利用→分区、水系 / 海岸、SRTM 地形高程。
- 实时事件流→城市事件：新闻（需代理）、实时交通、AQI 热点空间化落点。
- 需小后端：GTFS 实时时刻表、LLM 代理、隐藏密钥的数据。

## 建议起步三件套（性价比最高）
1. **E 音效 + 打磨**（半天级，沉浸感飞跃）
2. **D 存档 / 分享**（让它留得住、传得开）
3. **A 目的 / 剧本**（给它灵魂、可重玩）

之后按兴趣深入 **B/C（深度与人生）**、**F（规模）**、**G（数字孪生）**。
