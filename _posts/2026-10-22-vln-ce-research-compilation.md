---
layout: post
title: "视觉语言导航（VLN / VLN-CE）研究资料汇编"
date: 2026-10-22 20:00:00 +0800
categories: [技术]
tags: [VLN, VLN-CE, 具身智能, Video-LLM, 论文笔记]
description: "连续环境视觉语言导航的 65 条资料：任务定义与基准、Habitat 平台、方法谱系、Video-LLM/VLA、多模态感知、记忆与加速、评测协议。"
pinned: true
---

**主题**：连续环境视觉语言导航 + Video-LLM/VLA 导航 + 多模态感知 + 记忆与推理加速 + 评测协议  
**整理日期**：2026-10-22　|　**条目数**：65（论文与项目 53 · 数据集与平台 12 · 工具 6，与 `vln_ce_resources.html` 同源）  
**校验说明**：所有 arXiv 编号均通过检索或 arXiv 元数据接口逐条核验；少数无法确证编号的条目只给官方页面或标题检索入口，并明确标注「待核验」，不做编号猜测。

---

## 0. 怎么用这份汇编

你列的六类资料并不是并列的六堆文献，而是一条论证链。建议按下面的顺序读，读完正好能支撑一份"流式 Video-LLM 连续环境导航"的选题论证：

| 顺序 | 板块 | 回答的问题 | 对应章节 |
|---|---|---|---|
| ① | 任务与基准 | 这个任务怎么定义、怎么测、和离散 VLN 差在哪 | §1 |
| ② | 平台与数据 | 在哪跑实验、数据怎么申请、有什么许可坑 | §2 |
| ③ | 方法谱系 | 要和谁比、SOTA 数字是多少、代码可不可用 | §3 |
| ④ | Video-LLM/VLA | 大模型怎么接进导航、输出什么动作、频率多少 | §4 |
| ⑤ | 多模态感知 | 输入到底是 RGB 还是 RGB-D/点云/里程计 | §5 |
| ⑥ | 记忆与加速 | 长时程上下文怎么压、显存和延迟怎么降 | §6 |
| ⑦ | 评测与工具 | 指标怎么算、效率怎么量、数字怎么才可信 | §7 |

> **一句话结论（可写进立项依据）**：VLN-CE 的精度竞赛已进入 55–60% SR 区间，但**"精度—延迟—显存"三者从未被联合报告**。现有工作要么只报 SR/SPL（ETPNav、BEVBert），要么只报"低延迟"而无统一口径（StreamVLN、Uni-NaVid 各自定义 Hz）。这正是一个可做、且审稿人认账的空位。

---

## 1. 任务定义与基准演进：从离散图到连续空间

### 1.1 两个范式的差别（写实验设置时必须交代）

| 维度 | 离散 VLN（R2R on MP3D-Sim） | 连续 VLN-CE（R2R-CE / RxR-CE on Habitat） |
|---|---|---|
| 状态空间 | 预建导航图上的 90 个全景节点 | 连续 SE(2) 平面，无导航图 |
| 动作 | 节点间 teleport（跳转） | `MOVE_FORWARD 0.25m` / `TURN_LEFT|RIGHT 15°` / `STOP` |
| 观测 | 单张 360° 全景（36 视角拼贴） | 前向 RGB-D，640×480 |
| 感知噪声 | 无 | 有（渲染噪声、碰撞、遮挡） |
| 主要失效模式 | 选错节点 | 碰撞、卡死、局部极小、无法回溯 |
| R2R-CE 具体参数 | — | 转向 15°、HFOV 90°、机体半径 0.10m、**允许沿墙滑动** |
| RxR-CE 具体参数 | — | 转向 30°、HFOV 79°、机体半径 0.18m、**碰撞即终止（不许滑动）**，含 LOOK_UP/DOWN |

**为什么必须写清**：R2R-CE 允许贴墙滑动、RxR-CE 不允许，同一模型在两个基准上的碰撞率差异极大；因此**跨基准比较 SR 时必须先对齐上述 6 个参数**，否则数字没有意义。这是很多复现实验翻车的直接原因。

### 1.2 数据集规模（引自官方与综述）

| 数据集 | 规模 | 指令特点 | 路径特点 |
|---|---|---|---|
| R2R（离散） | 7,189 条路径 / 21,567 条指令 / 90 场景 | 平均 29 词，单语 | 最短路 |
| R2R-CE | 5,611 条轨迹（每条约 3 条指令） | 平均 32 词，单语 | 平均 9.89 m，最短路 |
| RxR（离散/连续） | train 60,300 / val-seen 6,746 / val-unseen 11,006 / test-challenge 9,557 episodes | 平均 **120 词**，英/印地/泰卢固三语，含细粒度时空 grounding | 平均 15.23 m，**非最短路**（Guide/Follower 双轨迹） |
| GOAT-Bench（终身） | 181 个 HM3DSem 场景 / 312 类物体 / 68 万 episodes | 目标可为类别、语言描述或图像 | 每 episode 连续 5–10 个目标，场景不重置 |

> RxR 的"非最短路 + 三语 + 长指令"是它比 R2R-CE 难一个量级的根本原因，也是**做指令 grounding 消融的最佳试验台**。

---

## 2. 数据集与仿真平台（含申请与许可）

| 资源 | 内容 | 获取方式 / 许可 | 用途与注意 |
|---|---|---|---|
| **Matterport3D (MP3D)** | 90 个真实住宅/办公楼重建场景，10,800 全景，194k RGB-D | 官网签 Terms of Use 后邮件申请；**非商用**，衍生数据（含训练的模型权重）受 CC BY-NC-SA 3.0 约束 | R2R-CE/RxR-CE 的底层场景。**许可传染性**：基于 MP3D 训练的权重不能商用，论文里需声明 |
| **HM3D** | 1,000 个建筑级重建，112.5k m² 可导航面积 | [aihabitat.org/datasets/hm3d](https://www.aihabitat.org/datasets/hm3d)，学术非商用免费申请 | ScaleVLN 用它把预训练数据扩到 490 万指令-轨迹对；HM3D 上训练的 PointNav 在 MP3D/Gibson 上同样最优（"pareto 最优"结论） |
| **HM3D-Semantics** | HM3D 的语义标注版（GOAT-Bench 用其中 181 场景） | 同上，单独申请 | 语义导航、开放词表评测 |
| **Habitat-Sim** | 高性能 3D 渲染器，单线程数千 FPS、单卡多进程 >10,000 FPS | [github.com/facebookresearch/habitat-sim](https://github.com/facebookresearch/habitat-sim)（MIT） | 吞吐引擎。**注意**：v0.3.4 之后 Meta 已不再主动维护，长期项目需评估 fork 成本 |
| **Habitat-Lab** | 任务/episode/指标/训练框架，含 `habitat-baselines` | [github.com/facebookresearch/habitat-lab](https://github.com/facebookresearch/habitat-lab)（MIT） | VLN-CE 官方实现在其 v0.1.x 分支上 |
| **Habitat 3.0** | 人—化身—机器人共居，含人形代理与社交导航 | [arXiv:2310.13724](https://arxiv.org/abs/2310.13724)，ICLR 2024 | 动态环境/社交 VLN 的扩展方向 |
| **R2R-CE 官方代码** | 基线 Seq2Seq / CMA，支持 teacher forcing 与 DAgger | [github.com/jacobkrantz/VLN-CE](https://github.com/jacobkrantz/VLN-CE)（代码 MIT，数据随 MP3D 条款） | 所有 VLN-CE 工作的共同祖先；`R2R_VLNCE_v1-3_preprocessed` 可直接跑通 |
| **VLN-CE 榜单** | 公开 test-unseen 评测 | [EvalAI challenge 719](https://eval.ai/web/challenges/challenge-page/719) | 提交 `.json` 轨迹文件，本地推理 + 服务器评分 |
| **RxR-Habitat 榜单** | 三语 test-challenge | [ai.google.com/research/rxr/habitat](https://ai.google.com/research/rxr/habitat) | 提交 `.jsonl`，必须包含三种语言全部 episode |
| **GOAT-Bench** | 多模态终身导航 | [arXiv:2404.06609](https://arxiv.org/abs/2404.06609)，CVPR 2024 | 唯一系统评估"显式 vs 隐式记忆"的基准，做记忆模块的必选实验 |
| **IR2R-CE / IVLN** | 连续环境下的"多趟巡游"（每 scene 最多 100 个连续 episode，agent 保留记忆） | [IVLN 项目页](http://jacobkrantz.github.io/) | 长时程记忆压力测试；指标为 tour 级 t-nDTW |
| **VLN-CE-Isaac** | Isaac Lab 上的物理真实低层控制基准（NaVILA 提出） | [navila-bot.github.io](http://navila-bot.github.io/) | 从"航点执行"走向"关节控制"的桥 |
| **ReplicaCAD / HSSD** | 可交互 CAD 场景 / 高质量合成室内 | Habitat 生态，HSSD 需申请 | 真机迁移、可交互物体实验 |

> **选型建议**：主实验放 **R2R-CE + RxR-CE（Habitat-Lab，MP3D）** 保证可比性；泛化实验放 **HM3D 派生的 ScaleVLN 数据**；长时程/记忆实验放 **GOAT-Bench 或 IR2R-CE**。这三层覆盖了"可比、可泛化、可长时程"三个审稿必问点。

---

## 3. VLN-CE 方法谱系与开源代码

按四代技术路线排列，**加粗**为建议作为 baseline 复现的对象。

### 第一代：端到端模仿学习（2018–2020）

| 方法 | 出处 | 机制 | 链接 |
|---|---|---|---|
| **R2R / MP3D-Sim** | CVPR 2018 | 任务与离散基准的起点 | [arXiv:1711.07280](https://arxiv.org/abs/1711.07280) |
| **VLN-CE (CMA baseline)** | ECCV 2020 | 把 R2R 移植到 Habitat；跨模态注意力 + progress monitoring + DAgger + 数据增强 | [arXiv:2004.02857](https://arxiv.org/abs/2004.02857) · [代码](https://github.com/jacobkrantz/VLN-CE) |
| Waypoint Models | ICCV 2021 | 用"航点预测 + 局部规划"替代低层动作，揭示动作空间表达力与执行效率的权衡 | [项目页](http://jacobkrantz.github.io/) |
| Sim-2-Sim Transfer | ECCV 2022 | 把离散环境训练的强模型迁移到连续环境，+12% SR，并定位性能损失来源 | 同上（VLN-CE 仓库分支） |

> 读这三篇能搞清楚一件事：**VLN-CE 的性能差距很大一部分来自"动作空间"而非"感知"**。这条结论直接支撑"航点/宏动作 + 大模型高层决策"的分层设计。

### 第二代：地图与拓扑结构（2022–2023）

| 方法 | 出处 | 机制（一句话） | 链接 |
|---|---|---|---|
| DUET | CVPR 2022 | 双尺度图 Transformer：局部拓扑 + 全局拓扑并行编码 | 标题检索（编号待核验） |
| **BEVBert** | ICCV 2023 | 局部度量地图（BEV）+ 全局拓扑图的混合地图预训练，显式去重、聚合不完整观测 | [arXiv:2212.04385](https://arxiv.org/abs/2212.04385) · [代码](https://github.com/MarSaKi/VLN-BEVBert) |
| **GridMM** | ICCV 2023 | 随行走动态增长的**自中心栅格记忆图**，把历史观测钉在网格上 | [arXiv:2307.12907](https://arxiv.org/abs/2307.12907) |
| **ETPNav** | 2023 / TPAMI 2024 | 在线拓扑建图 + 跨模态规划 + 带避障的控制，三模块串联；R2R-CE SR 57% | [arXiv:2304.03047](https://arxiv.org/abs/2304.03047) |
| **ScaleVLN** | ICCV 2023 | 从 HM3D/Gibson 1200+ 场景自动采路径 + 风格迁移 + 自动指令，造 490 万指令-轨迹对 | [arXiv:2307.15644](https://arxiv.org/abs/2307.15644) |
| Reborn | CVPR 2022 RxR-Habitat 冠军 | 航点候选预测 + 航点选择（离散 VLN 强模型迁移）+ 航点导航的三级层次；nDTW 0.5543 | [arXiv:2206.11610](https://arxiv.org/abs/2206.11610) |
| HNR | 2024 | 层次化导航与回退，R2R-CE SR 61% | 标题检索（编号待核验） |
| ERG | 2023 | 用目标检测构建"环境表征图"，GCN 学物体-物体/物体-智能体关系 | [arXiv:2301.04352](https://arxiv.org/abs/2301.04352) |

> **这代的共同局限（可写成 motivation）**：地图/图结构是**人工设计的压缩**，与 LLM 的 token 序列不兼容；要么把图序列化成文本塞进 prompt（MapGPT 路线，信息损失大），要么单独训一个图编码器（BEVBert 路线，无法复用 Video-LLM 预训练）。"让记忆直接长在 LLM 的 KV 里"正是第三代要解决的问题。

### 第三代：Video-LLM / VLA 端到端（2024–2026）

| 方法 | 出处 | 输入 | 输出 | 频率 | 关键机制 | 链接 |
|---|---|---|---|---|---|---|
| **NaVid** | RSS 2024 | 单目 RGB 视频流 | 语言化动作（"前进 75cm"） | — | 首个视频 VLM 导航；**不用地图/里程计/深度**；510k 导航样本 | [arXiv:2402.15852](https://arxiv.org/abs/2402.15852) · [项目页](https://pku-epic.github.io/NaVid/) |
| **NaVILA** | RSS 2025 | RGB | 中层语言动作 → 运动策略 | VLA 1Hz + 运动 10Hz | 两级：VLA 出"向左 30°、前进 1m"，RL 运动策略执行；真机成功率 88% | [arXiv:2412.04453](https://arxiv.org/abs/2412.04453) |
| **Uni-NaVid** | 2024/2025 | RGB 视频 | 低层动作，端到端 | **5 Hz** | 统一 4 类导航任务，360 万样本；**在线 token 合并**（近帧低压缩、远帧高压缩） | [arXiv:2412.06224](https://arxiv.org/abs/2412.06224) |
| **StreamVLN** | 2025 | 连续视频流 | 动作 token | 稳定低延迟 | **慢-快双上下文**：快=滑窗 KV 的活跃对话；慢=**3D-aware token 剪枝**的历史记忆；多轮 KV 复用 | [arXiv:2507.05240](https://arxiv.org/abs/2507.05240) · [代码](https://github.com/OpenRobotLab/StreamVLN) |
| NavGPT | AAAI 2024 | 观测→文本 | 文本动作 | 低（API） | 纯 LLM 零样本推理，可解释 | [arXiv:2305.16986](https://arxiv.org/abs/2305.16986) |
| MapGPT | ACL 2024 | 拓扑图→文本 + 视觉 | 节点选择 | 低（API） | 在线拓扑图**语言化**进 prompt，自适应多步规划与回退 | [arXiv:2401.07314](https://arxiv.org/abs/2401.07314) |
| **Open-Nav** | 2024 | RGB-D + 航点 | 航点选择 | 中 | 开源 LLM 本地部署替代 GPT-4；时空 CoT；含真机实验 | [arXiv:2409.18794](https://arxiv.org/abs/2409.18794) |

### 第四代：强化学习与后训练（2025–2026）

| 方法 | 出处 | 机制 | 链接 |
|---|---|---|---|
| **ETP-R1** | 2025 | 在 ETPNav 式拓扑规划上做 GRPO 强化微调，R2R-CE val-unseen NE 3.94 / OSR 72 | [arXiv:2512.20940](https://arxiv.org/html/2512.20940) |
| Macro-action Topological RL | 2026 | 把 VLN-CE 重构为分层 MDP：高层在 frontier 宏动作空间做 PPO，低层为免训练控制器 | [arXiv:2609.03906](https://arxiv.org/abs/2609.03906) |
| Spatial-VLN | 2026 | 零样本 + 显式空间感知（门交互、多房间、歧义指令三类瓶颈专家） | [arXiv:2601.12766](https://arxiv.org/abs/2601.12766) |

### 3.1 R2R-CE Val-Unseen 数字对照（据各论文自报汇总）

| 方法 | 观测 | NE↓ | OSR↑ | SR↑ | SPL↑ |
|---|---|---|---|---|---|
| CMA (baseline) | RGB+Pano+Depth | 7.37 | 40.0 | 32.0 | 30.0 |
| RGB-CMA（仅单目） | RGB | 9.55 | 10.0 | 5.0 | 4.0 |
| GridMM* | RGB+Pano+Depth | 5.11 | 61.0 | 49.0 | 41.0 |
| BEVBert* | RGB+Pano+Depth | 4.57 | 67.0 | 59.0 | 50.0 |
| ETPNav* | RGB+Pano+Depth | 4.71 | 65.0 | 57.0 | 49.0 |
| HNR* | RGB+Pano+Depth | 4.42 | 67.0 | 61.0 | 51.0 |
| NaVid | **RGB only** | 5.47 | 49.0 | 37.0 | 35.0 |
| NaVILA | **RGB only** | 5.22 | 62.5 | 54.0 | 49.0 |
| StreamVLN | **RGB only** | — | — | **56.9** | **51.9** |

\* 表示使用了在仿真器上预训练的 waypoint predictor（额外监督）。

**三条必须注意的读表规则**：
1. `*` 方法用了 waypoint predictor，输入侧含有深度/全景信息；与 RGB-only 方法**不是同一赛道**。写 related work 时务必分组，否则会被质疑对比不公平。
2. RxR-CE 的主指标是 **nDTW / SDTW**，不是 SR；BEVBert 在 RxR 上 SR 68.5 / nDTW 69.6，ETPNav 54.7 / 61.9，NaVILA 49.3 / 58.8 —— 排序与 R2R 不同，说明**指令保真度与到达率是两种能力**。
3. 所有数字均为单次运行，**没有论文报告方差**。你自己做实验时给 3 seeds 的均值±std，本身就是加分项。

---

## 4. Video-LLM / VLA 在机器人导航中的应用

### 4.1 三条技术路线（选型时先定位自己）

| 路线 | 代表 | 优点 | 代价 | 适合什么课题 |
|---|---|---|---|---|
| **A. 把 VLM 微调成导航策略** | NaVid、Uni-NaVid、NaVILA、StreamVLN | 端到端、可真机、泛化好 | 需大规模导航数据；推理贵；上下文线性增长 | 效率优化、记忆压缩、流式推理 |
| **B. 把 LLM 当零样本规划器** | NavGPT、MapGPT、Open-Nav、InstructNav | 免训练、可解释、易迁移 | 依赖 API 或强开源 LLM；延迟高；需把视觉文本化 | 空间表征、图-语言对齐、可解释性 |
| **C. 分层：VLM 出中层指令 + 专用控制器** | NaVILA、Reborn、ETPNav、宏动作 RL | 控制频率高、安全性好 | 两层误差累积；中层接口设计靠人工 | 分层规划、Sim2Real、腿足/人形 |

### 4.2 基础 VLA 模型（做 backbone 选型时看这些）

| 模型 | 规模 | 动作表示 | 控制频率 | 开源 |
|---|---|---|---|---|
| RT-2 | 55B | 离散 token | 1–3 Hz | ✗ |
| **OpenVLA** | 7B | 离散 token（Llama2 + SigLIP/DINOv2 双视觉塔） | 1–5 Hz | ✓ [arXiv:2406.09246](https://arxiv.org/abs/2406.09246) · [代码](https://github.com/openvla/openvla) |
| **π0 / π0-FAST** | 3.3B | Flow matching 连续动作 / FAST 离散 token | 最高 50 Hz | ✓ [arXiv:2410.24164](https://arxiv.org/abs/2410.24164) · [代码](https://github.com/Physical-Intelligence/openpi) |
| Octo | 0.3–1B | 离散 token | 1–5 Hz | ✓ |

> **关键洞察**：导航与操作对频率的需求完全不同。操作要 10–50 Hz，导航 1–5 Hz 就够（人走路决策频率约 2–3 Hz）。所以**导航场景的加速重点不在动作头，而在"每步要重新 prefill 多少视觉 token"**——这正是 token 剪枝与 KV 复用（§6）的价值所在。

### 4.3 Video-LLM 做导航的四个共性瓶颈

1. **视觉 token 爆炸**：一帧 448×448 经 SigLIP/CLIP 切成 256–576 token；30 帧视频即 1–2 万 token，注意力成本平方增长。
2. **历史上下文无界**：episode 步数不固定，KV cache 随步数线性增长 → 显存 OOM 或必须截断。
3. **动作粒度与语言粒度的错配**：VLM 擅长"下一步往哪"，不擅长"转 17 度"；所以 NaVid/NaVILA 都把动作**语言化**（"前进 75cm"），用正则解析回数值。
4. **评测口径缺失**：几乎无人报告 TTFT/TPOT/峰值显存，"低延迟"全靠自证。→ §7 给出可复用的测量方案。

---

## 5. 多模态感知：RGB-D、点云、里程计与机器人状态

### 5.1 输入模态与对应方法

| 模态 | 在 VLN-CE 中的角色 | 代表做法 | 坑 |
|---|---|---|---|
| **RGB（单目）** | 主视觉流 | NaVid / StreamVLN 全部只用它 | 尺度歧义、无深度 → 靠运动视差隐式恢复 |
| **Depth（RGB-D）** | 几何与避障 | VLN-CE 基线用 **ResNet-50（DD-PPO PointNav 预训练）** 编码深度 | 深度编码器权重是"仿真器特供"，真机需替换 |
| **全景（12 视角 RGB-D）** | 360° 观测，配 waypoint predictor | ETPNav/BEVBert/GridMM 的标准配置 | 12 倍渲染开销；实时性差 |
| **点云 / 体素** | 显式 3D 表征 | 体素化环境表征（VER, CVPR 2024）、PointNet++/MinkowskiEngine/TorchSparse | 体素分辨率与显存强耦合 |
| **里程计 / IMU** | 位姿估计，拼图与回环 | Habitat 内置 odometry sensor；真机 ORB-SLAM3 / VIO | NaVid 明确**弃用里程计**以规避漂移与 Sim2Real 误差——这是设计选择而非能力缺陷 |
| **机器人状态** | 关节/底盘/碰撞信号 | NaVILA 的运动策略吃高度图 + 本体状态 | 仿真里常被省略，真机必需 |

### 5.2 关键组件资料

| 组件 | 说明 | 链接 |
|---|---|---|
| DD-PPO 深度编码器 | 2.5B 帧训练的 PointGoal 导航器，其 ResNet-50 权重是 VLN-CE 深度编码的默认初始化 | [arXiv:1911.00357](https://arxiv.org/abs/1911.00357) |
| Depth Anything V2 | 单目深度估计，可用于"只有 RGB 时补出伪深度" | [arXiv:2406.09414](https://arxiv.org/abs/2406.09414) |
| ORB-SLAM3 | 视觉/视觉惯性/多地图 SLAM，真机位姿的工业级方案 | [arXiv:2007.11898](https://arxiv.org/abs/2007.11898) |
| ConceptGraphs | 开放词表 3D 场景图：SAM + CLIP + LLaVA 融合成物体级图，供 LLM 规划 | [arXiv:2309.16650](https://arxiv.org/abs/2309.16650) |
| VLFM | 视觉-语言前沿地图：语言 grounding 的价值图 + frontier 探索，零样本语义导航 | [arXiv:2312.03275](https://arxiv.org/abs/2312.03275) |

> **做"多模态感知"这一节时的建议**：不要堆砌模态，而要论证**每种模态对哪类指令子句有用**。例如 RxR 里"穿过门后左转"依赖深度（门的可通行性），"经过钢琴"依赖语义（开放词表检测），"大约走三米"依赖里程计。按子句拆解模态贡献，就能做出一张有说服力的消融表。

---

## 6. 记忆、KV Cache、Token 剪枝与流式推理（核心创新区）

这是你题目里最"有肉"的部分。把它拆成**三个正交的轴**，任何一篇工作都落在这三轴的某点或某条连线上：

```
轴①  记忆载体  ： token 历史 → 栅格图 → 拓扑图 → 场景图 → 快照集 → 3DGS → KV 本身
轴②  压缩时机  ： 编码器侧（进 LLM 前） → 浅层 → 逐层递进 → 深层
轴③  保留策略  ： 滑窗 / 注意力 sink / heavy hitter / 观测窗 / 查询相关 / 3D 覆盖率
```

### 6.1 记忆载体（Memory Bank / Spatial Memory）

| 工作 | 记忆形式 | 更新方式 | 检索方式 | 链接 |
|---|---|---|---|---|
| GridMM | 自中心栅格图（grid memory map） | 随行走动态扩张 | 图注意力读取 | [arXiv:2307.12907](https://arxiv.org/abs/2307.12907) |
| BEVBert | BEV 度量图 + 全局拓扑图 | 在线累积 | 分层图编码 | [arXiv:2212.04385](https://arxiv.org/abs/2212.04385) |
| MapGPT | 语言化拓扑图（节点+关系文本） | 每步重写 prompt | 直接进 LLM 上下文 | [arXiv:2401.07314](https://arxiv.org/abs/2401.07314) |
| ConceptGraphs | 物体级 3D 场景图 | 增量融合 | 图序列化成 JSON 给 LLM | [arXiv:2309.16650](https://arxiv.org/abs/2309.16650) |
| **3D-Mem** | **Memory Snapshots（精选多视角图）+ Frontier Snapshots（未探索区预览）** | 增量聚类，仅对新增物体做 | **预过滤**：先按问题选 top-K 类别，39.8 个观测 → 10.9 → 3.3 个快照 | [arXiv:2411.17735](https://arxiv.org/abs/2411.17735) · [代码](https://github.com/UMass-Embodied-AGI/3D-Mem) |
| GSMem | 3D Gaussian Splatting 作为**可重渲染**的持久记忆 | 实时语言场，免优化 | 对象级场景图 + 语义级语言场双层检索，再"幻视"出最优视角 | [arXiv:2603.19137](https://arxiv.org/html/2603.19137v1) |
| StreamVLN（慢记忆） | **KV cache 中的剪枝后 token** | 3D-aware 剪枝后写入 | 注意力直接读取 | [arXiv:2507.05240](https://arxiv.org/abs/2507.05240) |
| IVLN / IR2R-CE | 跨 episode 的持久环境记忆 | 不随 episode 重置 | 隐式（Transformer 记忆）+ 显式（地图） | [项目页](http://jacobkrantz.github.io/) |

> **3D-Mem 的"预过滤"数字（39.8→3.3 快照，K=10 时仅保留 29% 而性能几乎不掉）是本节最有价值的实证**：它证明"大部分历史对当前决策是冗余的"，为 token 剪枝提供了动机背书。

### 6.2 KV Cache 管理

| 方法 | 策略族 | 机制 | 报告收益 | 链接 |
|---|---|---|---|---|
| **StreamingLLM** | 驱逐 | 保留前几个 "attention sink" + 最近滑窗，固定缓存即可流式到百万 token | 相比滑窗重算最高 22.2× | [arXiv:2309.17453](https://arxiv.org/abs/2309.17453) |
| **H2O** | 驱逐 | 动态保留 heavy hitters（累计注意力高）+ 近期 token，形式化为动态子模优化 | 保留 20% token，吞吐最高 29× | [arXiv:2306.14048](https://arxiv.org/abs/2306.14048) |
| **SnapKV** | 驱逐（prefill 侧） | 用 prompt 末尾"观测窗"的池化注意力投票，逐 head 选重要位置 | 16K 输入下 3.6× 生成加速、8.2× 内存效率 | [arXiv:2404.14469](https://arxiv.org/abs/2404.14469) · [代码](https://github.com/FasterDecoding/SnapKV) |
| PyramidKV / PyramidInfer | 分层预算 | 按层分配不同缓存大小（深层少） | 2.2× 吞吐、54% 显存下降 | 标题检索（编号待核验） |
| KIVI / KVQuant | 量化 | 2-bit / sub-4-bit，key 按通道、value 按 token | 2.6× 峰值内存下降、4× 更大 batch | 标题检索（编号待核验） |
| **PagedAttention (vLLM)** | 内存管理 | KV 分页 + 虚拟化，按需分配 | 消除碎片，吞吐数量级提升 | [arXiv:2309.06180](https://arxiv.org/abs/2309.06180) |
| FastKV | 解耦 | prefill 传播量 与 decode 保留量 **解耦**，前层全量、后层仅传播高 saliency token | 同时改善 TTFT 与 TPOT | [arXiv:2502.01068](https://arxiv.org/abs/2502.01068) |
| **KV Cache 管理综述** | 综述 | 静态选择 / 动态驱逐 / 量化 / 低秩 / 架构 五类taxonomy | — | [arXiv:2412.19442](https://arxiv.org/abs/2412.19442) |

### 6.3 视觉 Token 剪枝 / 压缩

| 方法 | 位置 | 信号 | 报告收益 | 对 VLN 的适配注意 |
|---|---|---|---|---|
| Token Merging (ToMe) | ViT 内部 | patch 余弦相似度二分匹配 | patch 减 30–50% | 会合并掉小物体（门把手、开关），导航里风险高 |
| Q-Former / Perceiver Resampler | 编码器→LLM 投影 | 固定 64/128 可学 query | token 数固定 | 密集空间定位退化，不适合"精确到门"的指令 |
| **FastV** | LLM 第 2 层后 | 视觉 token 收到的平均注意力 | FLOPs 降 45%，性能几乎不掉 | 需读注意力矩阵，与 FlashAttention 不兼容 | 
| **PyramidDrop** | LLM 多层（8/16/24） | 轻量相似度 | 训练时间 −40%、推理 FLOPs −55% | 分层丢弃更稳，适合长视频 |
| SparseVLM | 逐层 | 查询相关性动态比例 | — | 查询是"导航指令"时效果最好，值得试 |
| Uni-NaVid 在线 token 合并 | 编码后 | 时空相似度，近帧低压缩/远帧高压缩 | 推理达 5 Hz | 最贴近导航需求的做法 |
| **StreamVLN 3D-aware 剪枝** | 写入慢记忆时 | 体素空间覆盖率（同一 3D 位置只留一份） | 上下文有界、延迟稳定 | **目前唯一显式利用 3D 几何的剪枝**，也是最值得做系统性消融的点 |
| Token 压缩综述 | 综述 | 图像/视频/音频统一视角 | — | [arXiv:2507.20198](https://arxiv.org/abs/2507.20198) |

### 6.4 流式推理的系统级要点

| 要点 | 说明 |
|---|---|
| 滑窗 KV + 持久 sink | 固定缓存上限，是"有界上下文"的前提（StreamingLLM + StreamVLN 快通道） |
| 多轮 KV 复用 | 导航是天然的多轮对话，**同一 episode 内不要重算 prefix**；StreamVLN 的 KV 复用是其低延迟主因 |
| 异步流水 | 感知/编码（10–30 Hz）与 LLM 决策（1–2 Hz）解耦，中间用最新可用的观测；避免"等模型出结果才动" |
| 分层频率 | NaVILA：VLA 1 Hz + 运动策略 10 Hz。这是工程上最稳的实时方案 |
| 显存换延迟 | 保留全部历史 KV → 精度最好但 OOM；剪枝 → 省显存但可能丢关键帧。**必须画 Pareto 曲线**，不能只报一个点 |

---

## 7. 评测指标、实验协议与性能剖析工具

### 7.1 导航指标（含公式与陷阱）

| 指标 | 定义 | 公式/阈值 | 陷阱 |
|---|---|---|---|
| **NE** 导航误差 | 终止点到目标的最短路径距离 | `‖p_T − p_goal‖`（米） | 用欧氏距离而非测地距离会系统性低估难度（隔墙 1m 但要走 20m） |
| **SR** 成功率 | NE < 3m 的 episode 比例 | `S_i ∈ {0,1}`，阈值 3m | 阈值随基准变（ObjectNav 是 1m + 可见性） |
| **OSR**  oracle 成功率 | 路径上任一点进入 3m 即算成功 | `min_t ‖p_t − p_goal‖ < 3m` | 高 OSR + 低 SR = "路过但停不下来"，是 stop 策略的问题 |
| **SPL** | 成功率按路径长度加权 | `(1/N)Σ S_i · l_i / max(p_i, l_i)` | 对转向不敏感；RL 里直接当 reward 会奖励"抄近路" |
| **TL** 轨迹长度 | 实际行走距离 | 米 | 与 SPL 一起看才说明效率 |
| **nDTW** | 归一化动态时间规整，衡量与参考路径的**顺序敏感**对齐 | `exp(−DTW(P,R)/(|R|·d_th))`，`d_th` 常取 3m | 对"绕远但正确"宽容，对"顺序错"严厉 |
| **SDTW** | 成功加权的 nDTW | `SR × nDTW` | RxR 的主指标 |
| **CLS** | 覆盖度 × 长度得分 | `PC × LS` | 顺序不敏感；适合 R4R/R6R 这类非最短路 |
| **t-nDTW** | tour 级 nDTW | 对整趟巡游算 nDTW | IR2R-CE 专用 |

> 原始定义见 **Anderson et al., "On Evaluation of Embodied Navigation Agents"**（[arXiv:1807.06757](https://arxiv.org/abs/1807.06757)），nDTW/SDTW 见 [arXiv:1907.05446](https://arxiv.org/abs/1907.05446)，CLS 见 [arXiv:1905.12255](https://arxiv.org/abs/1905.12255)。这三篇是写实验章节时的引用刚需。

### 7.2 实验协议清单（建议直接抄进实验设计）

1. **主表用 val-unseen**，val-seen 只作诊断；test-unseen 必须走官方服务器（EvalAI / RxR-Habitat），本地算的 test 数字不可信。
2. **禁止在 val-unseen 上调超参**；所有超参在 val-seen 上定，或做 train-only 交叉验证。
3. **报告 3 个随机种子**的均值 ± 标准差；VLN 的方差常达 ±1.5% SR，单次结果的排序不可靠。
4. **固定环境版本**：Habitat-Lab / Habitat-Sim 版本、场景数据集版本（`R2R_VLNCE_v1-3`）、传感器分辨率与 HFOV、动作步长，全部写进附录。
5. **分组报告**：RGB-only / RGB-D / +waypoint predictor 三类必须分开，禁止混表。
6. **失败模式分析**：至少给碰撞率、超步率、停止错误率三项；审稿人几乎必问。
7. **效率必须与精度同时报告**（见 7.3），只报 SR 的"高效"主张不予采信。

### 7.3 效率指标口径（本项目建议自建标准）

| 指标 | 定义 | 采集方式 |
|---|---|---|
| **TTFT** | 请求进入到第一个输出 token | 客户端计时 / vLLM 内置 |
| **TPOT / ITL** | 相邻输出 token 间隔 | 同上 |
| **单步决策延迟 p50 / p95** | 一次 `obs → action` 的墙钟时间（含预处理） | `time.perf_counter` 多次采样 |
| **端到端 episode 时间** | 一个 episode 从 reset 到 STOP | 累计 |
| **峰值显存** | `torch.cuda.max_memory_allocated()` | 每个 episode reset 后清零 |
| **KV Cache 字节** | `2 × L × H_kv × d_head × T × bytes` | 解析式估算 + 实测校验 |
| **每帧视觉 token 数** | 编码后 token 数 | tokenizer / 模型 inner API |
| **每 episode 总 token** | 输入+输出累计 | 累计计数器 |
| **控制频率达成率** | 实际决策 Hz / 目标 Hz | 目标 3 Hz 或 5 Hz 作分母 |
| **FLOPs** | 单步前向 | fvcore / calflops（仅作参考，与硬件无关） |

### 7.4 工具速查

| 工具 | 用途 | 入口 |
|---|---|---|
| `torch.profiler` (Kineto) | 算子级热点、CPU-GPU 时间线、导出 Chrome trace | PyTorch 官方文档 |
| `torch.cuda.memory_stats` / `max_memory_allocated` | 峰值显存、分配器碎片 | PyTorch 官方文档 |
| `torch.cuda.memory._record_memory_history` | 显存快照，定位"哪一行 OOM" | PyTorch 官方文档 |
| **Nsight Systems (`nsys`)** | 系统级时间线：GPU 空泡、kernel 启动开销、CPU-GPU 串行 | NVIDIA 官方文档 |
| **Nsight Compute (`ncu`)** | 单 kernel 深挖：算术强度、DRAM 带宽、occupancy | NVIDIA 官方文档 |
| `nvidia-smi` / NVML / `pynvml` | 进程级显存与利用率轮询，可嵌入评测脚本 | NVIDIA 官方 / PyPI |
| DCGM | 集群级 GPU 指标采集（长跑实验用） | NVIDIA 官方 |
| **vLLM `benchmark_serving` / `benchmark_latency`** | TTFT/TPOT/吞吐的标准压测 | [vLLM 仓库](https://github.com/vllm-project/vllm) |
| **lmms-eval** | 多模态统一评测；v0.7 起内置**每样本 token 计数与运行级吞吐**效率指标 | [github.com/EvolvingLMMs-Lab/lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) |
| VLMEvalKit | 220+ LMM / 80+ 基准的统一评测，可复用其 harness | [github.com/open-compass/VLMEvalKit](https://github.com/open-compass/VLMEvalKit) |
| fvcore / calflops / thop | FLOPs 与参数量估算 | PyPI |
| FlashInfer | 高性能 attention/KV 原语，做"加速上限"参照 | [github.com/flashinfer-ai/flashinfer](https://github.com/flashinfer-ai/flashinfer) |

### 7.5 可直接用的测量骨架

```python
import time, torch, statistics

def measure_step(model, obs, warmup=3, iters=20):
    for _ in range(warmup):                     # 预热，避开首次编译
        model.act(obs)
    torch.cuda.synchronize()
    torch.cuda.reset_peak_memory_stats()
    lat = []
    for _ in range(iters):
        t0 = time.perf_counter()
        with torch.inference_mode():
            model.act(obs)
        torch.cuda.synchronize()                # 必须同步，否则测的是入队时间
        lat.append((time.perf_counter() - t0) * 1000)
    lat.sort()
    return {
        "p50_ms": statistics.median(lat),
        "p95_ms": lat[int(0.95 * len(lat)) - 1],
        "peak_vram_gb": torch.cuda.max_memory_allocated() / 2**30,
    }

def kv_bytes(L, H_kv, d_head, T, dtype_bytes=2):
    return 2 * L * H_kv * d_head * T * dtype_bytes   # K 和 V 各一份
```

> **报告规范建议**：论文里给一张 `(SR, SPL) vs (p95 延迟, 峰值显存)` 的双轴散点图，标出 3 个预算档（如 8/16/24 GB）。目前 VLN 领域**没有任何一篇论文这样做**——这本身就是一个可发表的方法论贡献点。

---

## 8. 研究缺口与三个可切入方向

| 缺口 | 证据 | 可做的贡献 |
|---|---|---|
| **G1 效率无标准** | StreamVLN 报"稳定低延迟"、Uni-NaVid 报"5 Hz"、NaVILA 报"1 Hz+10 Hz"，口径互不通约；无人报显存 | 提出 **VLN-CE 效率评测协议**（§7.3 的指标集 + 参考实现），在 3 个预算档上给 6 个 baseline 的 Pareto 前沿 |
| **G2 记忆与剪枝解耦** | 3D-aware 剪枝只在 StreamVLN 中出现且未做消融；3D-Mem 的预过滤只在 EQA 场景验证 | 系统研究"**空间覆盖率驱动的 token 预算分配**"：给定 B 个 token，如何在 3D 体素上做最大化覆盖的选择；给出 coverage-budget 曲线 |
| **G3 长时程记忆淘汰** | IVLN/GOAT 显示记忆有用，但 KV 只增不减；无"遗忘"策略 | **记忆淘汰/固化**：把久远 KV 蒸馏成少量"地标 token"或写入外部图，实现 episode 级有界缓存而 tour 级不丢信息 |
| **G4 模态-子句对齐** | RxR 长指令含空间/语义/度量三类子句，无人按子句分析模态贡献 | 按子句类型做模态消融，得到"哪种指令需要哪种感知"的定量结论，指导轻量化 |

---

## 9. 检索与追踪策略（保证资料不过期）

**关键词矩阵**（英文，按"任务 × 方法 × 效率"交叉）：
- 任务：`vision-and-language navigation`、`VLN-CE`、`instruction following navigation`、`embodied navigation`、`lifelong navigation`
- 方法：`video LLM navigation`、`VLA navigation`、`topological map`、`scene graph memory`、`streaming inference`
- 效率：`visual token pruning`、`KV cache compression`、`long video understanding efficiency`、`latency-aware`

**追踪入口**：
- [VLN-Survey-with-Foundation-Models](https://github.com/zhangyuejoslin/VLN-Survey-with-Foundation-Models)（TMLR 2024 综述的官方仓库，持续更新到 CVPR 2026 条目，是最高性价比的单一入口）
- [Awesome-VLA-Models](https://github.com/DelinQu/awesome-vision-language-action-model)（VLA 全景，含数据集与教程）
- arXiv `cs.RO` + `cs.CV` 每日 `VLN` 关键词订阅；Connected Papers 做引文回溯
- Papers with Code 的 [HM3D 页面](https://paperswithcode.com/paper/habitat-matterport-3d-dataset-hm3d-1000-large) 看榜单更新

**每周增量动作**：查 EvalAI VLN-CE 榜单是否有新提交 → 查 StreamVLN / NaVILA 仓库的 commit（这两个团队迭代最快）→ 查 arXiv 上 `R2R-CE` 关键词的 7 日新文。

---

## 10. 待核验清单（编号未能确证，请按标题检索）

以下条目内容可靠，但 arXiv 编号未能通过本次核验（我凭记忆写出的编号里有 6 个是错的，已剔除）。引用前请用标题在 arXiv 或 Google Scholar 上确认：

| 条目 | 建议检索式 |
|---|---|
| DUET: Dual-scale Graph Transformer | `"DUET" "Dual-scale Graph Transformer" VLN` |
| HAMT: History Aware Multimodal Transformer | `"History Aware Multimodal Transformer" navigation` |
| HNR（R2R-CE SR 61%） | `"HNR" R2R-CE navigation` |
| DiscussNav（多专家讨论式零样本） | `"DiscussNav" vision-and-language navigation` |
| InstructNav（多源价值图） | `"InstructNav" instruction navigation` |
| NaviLLM（LLM 统一具身任务） | `"NaviLLM" embodied navigation` |
| PyramidKV / PyramidInfer | `"PyramidKV" KV cache` |
| KIVI / KVQuant | `"KIVI" 2-bit KV cache quantization` |
| Matterport3D 数据集论文（3DV 2017） | 官方页 [niessner.github.io/Matterport](https://niessner.github.io/Matterport/) |
| RxR 论文（EMNLP 2020） | 官方页 [ai.google.com/research/rxr](https://ai.google.com/research/rxr) |

---

*本汇编中所有 SR/SPL 数字均标注来源论文，未做二次计算；跨论文比较请遵守 §3.1 的三条读表规则。*
