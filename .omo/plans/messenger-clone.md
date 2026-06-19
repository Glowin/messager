# Messenger (Abeto) MVP 复刻

## TL;DR

> **Quick Summary**: 复刻 https://messenger.abeto.co/ 的核心玩法——单机、桌面浏览器、Three.js 球形世界送信游戏。cel-shaded 低多边形原语美术，5 个配送任务，第三人称相机，球面重力。Playwright + 程序化断言 + glm-4.6v 视觉三重 QA。
>
> **Deliverables**:
> - 可在桌面浏览器运行的 Vite+TS+Three.js 游戏（`npm run dev` / `npm run build`）
> - 球形星球世界（IcosahedronGeometry）+ 球面重力 + 竖直方向系统
> - 第三人称跟随相机（自动居中、极点不翻转）
> - cel-shaded 低多边形视觉（MeshToonMaterial + OutlineEffect）
> - 5 个配送任务（步骤状态机 + "NEXT UP" 目标 + NPC 对话）
> - 5 个静态 NPC（三角标记 + 名牌 + idle/talk 动画）
> - 角色控制器（WASD/方向键移动 + Space 跳 + Shift 冲刺 + E 交互）
> - 开场标题屏 + 对话过场
> - 极简音频（lo-fi bgm + 跳跃/脚步/任务完成音效）
> - `window.__game` 调试 API（DEV 模式）供 QA 断言
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → 5 → 9 → 14 → F1-F4

---

## Context

### Original Request
复刻 Messenger（by Abeto）休闲浏览器游戏，交付测试完成、玩家操作流畅、无明显 bug 的 MVP。游戏信息：球形星球、动漫风人物、NPC、浏览器直接玩、开放世界探索、5 个配送任务。

### Interview Summary
**Key Discussions**:
- 多人：不做（单机）——多人需后端，MVP 跳过
- 美术：Cel-shaded 低多边形原语——不还原精细模型，聚焦机制
- 功能范围：仅核心玩法（世界+重力+移动+5任务+NPC对话+任务状态机+相机）
- 技术栈：Three.js + Vite + TypeScript（贴合原游戏）
- 验证：仅 Agent QA（无单测）——Playwright + browser_evaluate + glm-4.6v 视觉
- 音频：极简免费（1 首 lo-fi bgm + 基础音效）

**Research Findings**（一手体验 + 资源清单 + JS bundle + web 评测）:
- 原游戏：Vue + Three.js r180 + WebGL2，球面世界（界王星式，立方体展成球）
- 任务流：NPC 头顶三角标记+红色名牌 → 按 E 对话(小写台词) → "NEXT UP"+大写目标 → 配送 → "CONGRATULATIONS! ANOTHER SUCCESSFUL DELIVERY COMPLETED"
- NPC：Dave the Musician / Young Kid / Doctor Frieb / Frebi / cave man（各有 model/bones/idle/talk 动画）
- 真实对话样本："THANK GOD YOU'RE HERE! I SENT A LETTER TO MY BOSS EARLIER, BUT I NEED TO GET IT BACK..." / "FIND THE RED CLIFF HOUSE AND GET THE LETTER BACK" / "TAKE THE MYSTERY LETTER TO DAVE AT SMELLY FALLS"
- 操作：WASD/方向键、Space 跳、Shift 冲刺、E 交互、Esc 菜单
- 角色外观：黑短发/黄T恤/红短裤/白袜红鞋/背包

### Metis Review
**研究验证的关键技术决策**（Metis 自带 3 个研究子代理验证）:
- 球面重力：增量 `rotateOnAxis`；**禁止**绝对 `setFromUnitVectors`（南极锁死，Hairy Ball 定理）
- 星球几何：`IcosahedronGeometry`（非 `SphereGeometry`，避免极点挤压）
- 相机：`camera.up.copy(playerPos).normalize()` 每帧更新（极点不翻转）
- 角色朝向：仅 `rotateOnAxis`（后乘四元数）；**禁止** Euler `rotation.set()`（万向锁）
- cel-shading：`MeshToonMaterial` + 3 色 `gradientMap`(NearestFilter) + `OutlineEffect` + `flatShading`，~20 行内置
- Playwright WebGL QA 两硬前提：`preserveDrawingBuffer: true` + `window.__game` 调试 API

**Identified Gaps**（已解决）:
- Q2-Q9 默认值（区域数/NPC 静动/角色模型/存档/硬件/语言/音频源/球半径）→ 已用默认值解决
- 南极锁死/相机翻转/万向锁/极点挤压/空白截图 → 已锁定技术方案

---

## Work Objectives

### Core Objective
构建一个单机、桌面浏览器的 3D Messenger 复刻 MVP —— 球形世界重力、5 个配送任务、cel-shaded 低多边形视觉，通过 Playwright Agent QA 验证，无单测。

### Concrete Deliverables
- `index.html` + Vite TS 项目，`npm run dev` 启动、`npm run build` 产出静态包
- 球形星球 + 球面重力玩家控制器 + 第三人称相机
- cel-shaded 低多边形世界（3 区域）+ 5 NPC + 5 配送任务
- 标题屏 + 开场对话 + 对话/任务 UI
- 极简音频 + `window.__game` 调试 API

### Definition of Done
- [ ] `npm run build` 无错误，产物可在浏览器打开运行
- [ ] 玩家能在球面任意位置行走，跨极点不锁死、相机不翻转
- [ ] 5 个配送任务可完整接取→配送→完成
- [ ] 所有 QA 场景通过（程序化断言 + 视觉截图）
- [ ] 桌面浏览器（Chrome）稳定 60fps（中端机器）

### Must Have
- 球面重力（玩家始终贴球面，跳跃为径向速度）
- 竖直方向系统（物体在球面保持竖直，用表面法线）
- 第三人称相机（跟随 + 自动居中 + 极点安全）
- cel-shaded 低多边形视觉（MeshToonMaterial + OutlineEffect）
- 5 个配送任务（步骤状态机 + NEXT UP 目标 + 完成提示）
- 5 个 NPC（三角标记 + 名牌 + 对话）
- 角色控制器（移动/跳/冲刺/交互）
- `window.__game` 调试 API + `preserveDrawingBuffer:true`
- 标题屏 + 开场对话

### Must NOT Have (Guardrails)
- **G1**: 不引入物理引擎（cannon/rapier）——重力用每帧 snap 到球面 + 径向跳跃速度
- **G3**: 不加载外部 3D 模型（glTF/glb）——全部用 Three.js 原语几何体
- **G4**: 不写自定义 ShaderMaterial / 不用 EffectComposer——cel-shading 仅用内置 MeshToonMaterial + OutlineEffect
- **G17**: WebGLRenderer 必须 `preserveDrawingBuffer: true`（否则截图空白，QA 失效）
- **G18**: 星球用 `IcosahedronGeometry`，**禁止** `SphereGeometry`（极点挤压）
- **G19**: 角色朝向用增量 `rotateOnAxis`，**禁止**绝对 `setFromUnitVectors` 重建（南极锁死）；相机 `up` 每帧设为表面法线
- **G20**: **禁止** Euler `rotation.set()` 做角色朝向（万向锁）；只用 `rotateOnAxis` 后乘四元数
- **G12**: DEV 模式必须暴露 `window.__game` 调试 API（供 Playwright 状态断言）
- 不做多人物/后端/换装/3D表情/移动端触控/小地图/任务计时器/NPC 寻路/存档
- AI slop 防范：不过度抽象、不加无用 JSDoc、不写空 catch、不残留 debug 日志、不造泛型名(data/result/item)

### Scope Boundaries
- **INCLUDE**: 球形世界 + 重力 + 移动 + 跳跃 + 冲刺 + 第三人称相机 + cel-shaded 低多边形 + 3 区域 + 5 NPC + 5 配送任务 + 对话 + 任务 UI + 标题屏 + 开场过场 + 极简音频 + 调试 API
- **EXCLUDE**: 多人/后端、换装、3D 表情、完整音频体系（7 氛围+全音效）、精细还原模型、移动端触控、小地图、任务计时器、NPC 寻路、存档持久化、单元测试

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — 全部 Agent 执行验证。禁止"用户手动测试"类验收标准。

### Test Decision
- **Infrastructure exists**: NO（全新空项目）
- **Automated tests**: None（无单测框架）
- **Framework**: none
- **Agent QA**: Playwright 操作 + `browser_evaluate` 程序化场景断言（主） + glm-4.6v 视觉截图（辅，仅判渲染存在性）

### QA Policy
每个任务必须包含 agent 可执行的 QA 场景。证据存 `.omo/evidence/task-{N}-{slug}.{ext}`。
- **逻辑正确性**：`page.evaluate(() => window.__game.*)` 断言（坐标、点积、任务状态、FPS）
- **渲染存在性**：截图 + glm-4.6v 判"非空白/cel 色带可见/角色可见/轮廓可见"
- **交互**：Playwright 键盘（移动/跳/交互）+ 截图验证状态变化
- **极点测试**：用 `window.__game.teleport()` 传送到南北极，验证不锁死、相机不翻转（最高风险边界）

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (foundation — 4 parallel, 无依赖):
├── Task 1: 项目脚手架 + Vite/TS/Three.js + 渲染器(preserveDrawingBuffer) [quick]
├── Task 2: 类型定义 & 数据模型 [quick]
├── Task 3: cel-shading 材质模块 [quick]
└── Task 4: 音频系统 [quick]

Wave 2 (core engine — 4 parallel, dep Wave 1):
├── Task 5: 球形世界 + 重力系统 [deep]            (dep 1)
├── Task 6: 角色低多边形模型 + 动画 [quick]        (dep 1,3)
├── Task 7: 调试 API (window.__game) [quick]       (dep 1)
└── Task 8: 对话框 UI 覆盖层 [visual-engineering]  (dep 1,2)

Wave 3 (gameplay — 5 parallel, dep Wave 2):
├── Task 9:  玩家控制器(球面移动/跳/冲刺) [deep]    (dep 5,6)
├── Task 10: NPC 系统(标记/名牌/动画/接近检测) [unspecified-high] (dep 3,6)
├── Task 11: 任务系统(状态机/NEXT UP/5任务) [deep]  (dep 2,8)
├── Task 12: 世界内容(3区域原语布局) [unspecified-high] (dep 3,5)
└── Task 13: 第三人称相机(跟随/法线up/自动居中) [unspecified-high] (dep 5)

Wave 4 (integration — 3 parallel, dep Wave 3):
├── Task 14: 交互系统(E键→对话→任务→配送完成) [unspecified-high] (dep 9,10,11)
├── Task 15: 标题屏 + 开场过场 [visual-engineering] (dep 8,9)
└── Task 16: UI & HUD(菜单/音效键/任务目标overlay/Esc暂停) [visual-engineering] (dep 1,11)

Wave FINAL (4 parallel reviews):
├── F1: 计划合规审计 [oracle]
├── F2: 代码质量审查 [unspecified-high]
├── F3: 真实手动 QA [unspecified-high + playwright]
└── F4: 范围保真检查 [deep]

Critical Path: 1 → 5 → 9 → 14 → F1-F4
Parallel Speedup: ~4x vs sequential
Max Concurrent: 5 (Wave 3)
```

### Dependency Matrix

| Task | Deps | Blocks |
|---|---|---|
| 1 | — | 2,3,4,5,6,7,8,16 |
| 2 | — | 8,11 |
| 3 | — | 6,10,12 |
| 4 | — | 11,16 |
| 5 | 1 | 9,12,13 |
| 6 | 1,3 | 9,10 |
| 7 | 1 | F1-F4(QA依赖) |
| 8 | 1,2 | 11,15 |
| 9 | 5,6 | 13,14,15 |
| 10 | 3,6 | 14 |
| 11 | 2,8 | 14,16 |
| 12 | 3,5 | 14(场景) |
| 13 | 5 | 14,15 |
| 14 | 9,10,11 | F1-F4 |
| 15 | 8,9 | F1-F4 |
| 16 | 1,11 | F1-F4 |

### Agent Dispatch Summary
- **Wave 1**: 4 — T1-T4 全 `quick`
- **Wave 2**: 4 — T5 `deep`, T6 `quick`, T7 `quick`, T8 `visual-engineering`
- **Wave 3**: 5 — T9 `deep`, T10 `unspecified-high`, T11 `deep`, T12 `unspecified-high`, T13 `unspecified-high`
- **Wave 4**: 3 — T14 `unspecified-high`, T15 `visual-engineering`, T16 `visual-engineering`
- **FINAL**: 4 — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

> 每个 Task = 实现 + QA 一体。格式：裸数字编号（1. 2. ...）。
> 每个 task 必须有 QA 场景（agent 可执行），否则视为不完整。

- [x] 1. 项目脚手架 + Vite/TS/Three.js + 渲染器

  **What to do**:
  - 在 `/Users/jiangbian/Documents/projects/messager` 初始化 Vite + TypeScript 项目（`npm create vite@latest . -- --template vanilla-ts`，空目录已有 .omo/ 需保留）
  - 安装 `three` 和 `@types/three`
  - 创建 `src/main.ts`：初始化 `THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true, antialias: true })`，挂到 `#app canvas`，尺寸自适应窗口
  - 创建 `src/scene.ts`：基础 `THREE.Scene` + 雾 + 半球光 + 方向光（暖色调，日间氛围）
  - 主循环 `requestAnimationFrame`，`renderer.setAnimationLoop`
  - `index.html`：`<div id="app"><canvas></canvas></div>` + 全屏样式（margin:0, overflow:hidden）
  - `npm run dev` 可启动，`npm run build` 可构建

  **Must NOT do**:
  - 不要用 WebGPU（用 WebGLRenderer，OutlineEffect 仅支持 WebGL）
  - 不要忘记 `preserveDrawingBuffer: true`（G17，QA 截图依赖）
  - 不要引入框架壳（Vue/React），纯 TS + Three.js

  **Recommended Agent Profile**:
  - **Category**: `quick` — 标准脚手架，单文件级
  - **Skills**: [] — 无需特殊技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2, 3, 4)
  - **Blocks**: 5,6,7,8,16
  - **Blocked By**: None

  **References**:
  - **API**: `THREE.WebGLRenderer` 构造参数 `preserveDrawingbuffer` — https://threejs.org/docs/#api/en/renderers/WebGLRenderer
  - **Pattern**: 原游戏用 WebGLRenderer + Three.js r180；本 MVP 用 latest stable three（npm latest）
  - **External**: Vite vanilla-ts 模板标准结构

  **Acceptance Criteria**:
  - [ ] `npm run dev` 启动后浏览器打开看到渲染的空场景（半球光+方向光，非纯黑）
  - [ ] `npm run build` 产出 `dist/` 无错误
  - [ ] `renderer.getContext().getContextAttributes().preserveDrawingbuffer === true`

  **QA Scenarios**:
  ```
  Scenario: 渲染器初始化且 preserveDrawingBuffer 开启
    Tool: Bash + Playwright
    Preconditions: npm run dev 已启动
    Steps:
      1. Playwright navigate http://localhost:5173
      2. page.evaluate(() => { const c=document.querySelector('canvas'); const gl=c.getContext('webgl2')||c.getContext('webgl'); return gl.getContextAttributes().preserveDrawingbuffer; })
      3. page.evaluate(() => { const c=document.querySelector('canvas'); return c.toDataURL().length > 1000; })  // 截图非空(AC-20)
    Expected Result: preserveDrawingbuffer === true 且 toDataURL 长度 > 1000
    Failure Indicators: preserveDrawingbuffer false / toDataURL 返回极短空白串
    Evidence: .omo/evidence/task-1-renderer.png（截图）+ task-1-pdb.txt（断言输出）

  Scenario: 构建无错
    Tool: Bash
    Steps:
      1. npm run build
    Expected Result: exit code 0，dist/index.html 存在
    Failure Indicators: tsc 报错 / 构建失败
    Evidence: .omo/evidence/task-1-build.txt
  ```

  **Commit**: YES — `chore(scaffold): vite+ts+three.js + renderer(preserveDrawingBuffer)`

- [x] 2. 类型定义 & 数据模型

  **What to do**:
  - 创建 `src/types.ts`，定义核心接口：
    - `QuestStep { id: string; type: 'talk'|'deliver'|'goto'; targetNpcId?: string; objectiveText: string; }`
    - `Quest { id: string; title: string; giverNpcId: string; steps: QuestStep[]; completionText: string; }`
    - `QuestState { questId: string; status: 'locked'|'active'|'step_N'|'completed'; currentStep: number; }`
    - `NPC { id: string; name: string; color: number; position: [number,number,number]; idleAnim: boolean; dialogue: DialogueLine[]; questId?: string; }`
    - `DialogueLine { speaker: string; text: string; }`
    - `Region { id: string; name: string; center: [number,number,number]; }`
  - 创建 `src/data/quests.ts`：5 个任务定义（用真实对话样本）：
    - quest_0: Office Worker → "FIND THE RED CLIFF HOUSE AND GET THE LETTER BACK"（送信给老板）
    - quest_1: "TAKE THE MYSTERY LETTER TO DAVE AT SMELLY FALLS"
    - quest_2: "GO BACK TO THE MAN IN THE CAVE AND DELIVER THE CLOTHES"
    - quest_3: Doctor Frieb/Frebi 信件投错地址
    - quest_4: musician Dave 的任务
  - 创建 `src/data/npcs.ts`：5 NPC 定义（Dave/Young Kid/Office Worker/Doctor/cave man），各 3-5 句对话

  **Must NOT do**:
  - 不要把任务逻辑写死在类型文件——只定义数据结构 + 数据
  - 不要 over-engineer（不需要 JSON Schema 验证）

  **Recommended Agent Profile**:
  - **Category**: `quick` — 纯类型 + 数据文件
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 1, 3, 4)
  - **Blocks**: 8, 11
  - **Blocked By**: None

  **References**:
  - **Pattern**: 原游戏任务状态机字段 quest_enable_id/quest_step_check/quest_step_completed/quest_completed（从 JS bundle 提取）
  - **Data**: 真实对话样本见 Context；任务目标大写、NPC 台词小写

  **Acceptance Criteria**:
  - [ ] `src/types.ts` 导出所有接口，`tsc` 无错
  - [ ] `src/data/quests.ts` 导出 5 个 Quest，每个 ≥1 step
  - [ ] `src/data/npcs.ts` 导出 5 个 NPC，每个有对话

  **QA Scenarios**:
  ```
  Scenario: 数据完整性
    Tool: Bash (node)
    Steps:
      1. npx tsx -e "import {quests} from './src/data/quests'; console.log(quests.length, quests.every(q=>q.steps.length>=1))"
    Expected Result: 输出 "5 true"
    Failure Indicators: 数量 ≠5 / 有 quest 无 step
    Evidence: .omo/evidence/task-2-data.txt

  Scenario: 类型检查
    Tool: Bash
    Steps: npx tsc --noEmit
    Expected Result: exit 0
    Evidence: .omo/evidence/task-2-tsc.txt
  ```

  **Commit**: YES（group with Wave 1）— `feat(data): quest/npc/dialogue types + 5 quests + 5 npcs`

- [x] 3. cel-shading 材质模块

  **What to do**:
  - 创建 `src/cel-material.ts`：
    - `createGradientMap()`: 用 DataTexture 生成 3 色阶 gradientMap（暗/中/亮），`NearestFilter`（关键，否则渐变非色带）
    - `createToonMaterial(color: number)`: 返回 `new THREE.MeshToonMaterial({ color, gradientMap })`，`flatShading: true`
    - `createOutlineMesh(geometry, color=0x000000)`: 用 `OutlineEffect`（`import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'`），或 inverted hull BackSide 法（若 OutlineEffect 与渲染循环冲突）
    - 导出 `toonMat(color)` 工厂 + 在主循环用 `effect.render(scene, camera)` 替代 `renderer.render`
  - 验证：场景里放一个 IcosahedronGeometry + toon 材质，渲染出离散色带 + 黑轮廓

  **Must NOT do**:
  - **G4**: 不写自定义 ShaderMaterial，不用 EffectComposer
  - 不用 SphereGeometry 测试（用 IcosahedronGeometry）
  - 不要在 toon 材质上用 alphaTest（与 OutlineEffect 冲突）
  - 渲染循环必须调 `effect.render()` 而非 `renderer.render()`

  **Recommended Agent Profile**:
  - **Category**: `quick` — ~20 行内置 API
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 1, 2, 4)
  - **Blocks**: 6, 10, 12
  - **Blocked By**: None（但需 Task 1 的渲染器来验证；可先写模块，验证在 Wave 2 集成时）

  **References**:
  - **API**: `THREE.MeshToonMaterial` — https://threejs.org/docs/?q=toon#api/en/materials/MeshToonMaterial
  - **API**: `OutlineEffect` — https://threejs.org/examples/?q=outl#webgl_materials_toon
  - **Pattern**: 官方 webgl_materials_toon.html 示例（gradientMap + NearestFilter + OutlineEffect）
  - **Pitfall**: gradientMap 必须 NearestFilter（LinearFilter 会变平滑渐变失去 cel 感）

  **Acceptance Criteria**:
  - [ ] `createToonMaterial(0xff0000)` 返回 MeshToonMaterial，gradientMap 为 NearestFilter
  - [ ] 场景中 toon 球体渲染出 ≥2 个离散色带 + 黑色轮廓

  **QA Scenarios**:
  ```
  Scenario: cel-shading 视觉验证
    Tool: Playwright + glm-4.6v 视觉
    Preconditions: Task 1 dev server 运行（或本 task 临时挂测试球）
    Steps:
      1. 场景加一个红色 IcosahedronGeometry + toonMat，截屏
      2. glm-4.6v 判读：球体表面有离散色带（非平滑渐变），边缘有黑色轮廓线
    Expected Result: 视觉确认"离散色带 + 黑轮廓"
    Failure Indicators: 平滑渐变 / 无轮廓
    Evidence: .omo/evidence/task-3-cel.png

  Scenario: NearestFilter 校验
    Tool: Bash
    Steps: npx tsx -e 检查 gradientMap.magFilter === THREE.NearestFilter
    Expected Result: true
    Evidence: .omo/evidence/task-3-filter.txt
  ```

  **Commit**: YES（group Wave 1）— `feat(render): cel-shading toon material + outline`

- [x] 4. 音频系统

  **What to do**:
  - 安装 `howler`（`@types/howler`）
  - 创建 `src/audio.ts`：
    - `AudioManager` 单例：`playBgm()`, `playSfx(name)`, `setMuted(bool)`
    - lo-fi bgm 循环（找 CC0 lo-fi 曲，放 `public/audio/bgm.mp3`，或用占位 + 注释来源）
    - SFX：跳跃、脚步、任务完成、对话推进（CC0，freesound，放 `public/audio/sfx/`）
    - 音量适中，bgm 循环无缝
  - 注意：浏览器音频需用户手势解锁——在标题屏 Begin 点击时 `AudioManager.resume()`

  **Must NOT do**:
  - 不用付费音频，只用 CC0
  - 不实现 3D 空间音效（MVP 简化为立体声）
  - 不阻塞加载（音频异步加载，缺失不崩）

  **Recommended Agent Profile**:
  - **Category**: `quick` — Howler 标准用法
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 1, 2, 3)
  - **Blocks**: 11, 16
  - **Blocked By**: None

  **References**:
  - **API**: Howler.js — https://howlerjs.com/
  - **Pattern**: 原游戏 bgm + 脚步/jump/quest-complete 音效（从资源清单）

  **Acceptance Criteria**:
  - [ ] `AudioManager.playBgm()` 不报错（即使音频文件未就绪）
  - [ ] `setMuted(true)` 后 Howler 全局静音
  - [ ] 标题屏点击触发 `resume()` 解锁音频上下文

  **QA Scenarios**:
  ```
  Scenario: 音频上下文手势解锁
    Tool: Playwright
    Steps:
      1. navigate localhost，page.evaluate(() => Howler.ctx?.state)  // 初始可能 suspended
      2. 模拟点击 canvas（用户手势），page.evaluate(() => window.__audio?.resume())
      3. page.evaluate(() => Howler.ctx?.state)
    Expected Result: 解锁后 ctx.state === 'running'
    Failure Indicators: 一直 suspended
    Evidence: .omo/evidence/task-4-audio.txt

  Scenario: 缺失音频不崩
    Tool: Bash
    Steps: 临时删除某 sfx 文件，调 playSfx，验证不抛异常
    Expected Result: 静默失败，无 uncaught error
    Evidence: .omo/evidence/task-4-missing.txt
  ```

  **Commit**: YES（group Wave 1）— `feat(audio): howler bgm + sfx manager`

- [x] 5. 球形世界 + 重力系统（CRITICAL PATH）

  **What to do**:
  - 创建 `src/world.ts`：
    - 用 `IcosahedronGeometry(RADIUS, DETAIL)`（RADIUS≈25, DETAIL≈5）创建星球网格，应用 toon 材质（绿色草地/蓝色水面分区用顶点色或多个网格）
    - `snapToSurface(pos: Vector3, height=0)`: `pos.copy(pos.normalize().multiplyScalar(RADIUS + height))`
    - `getSurfaceNormal(pos: Vector3)`: `return pos.clone().normalize()`（星球中心在原点）
    - 导出 `planetRadius`、`planet` mesh、`snapToSurface`、`getSurfaceNormal`
  - 创建 `src/gravity.ts`：跳跃用径向速度
    - `applyGravity(obj, velocity, dt)`: 每帧把 obj 位置 snap 到球面 + 速度径向分量衰减（跳跃时给径向正速度，重力拉回）
    - 跳跃：`velocity.add(surfaceNormal * jumpForce)`，每帧 `velocity radial -= gravity*dt`，落地（高度≤R）时 snap + 清径向速度
  - **关键**：朝向用增量 `rotateOnAxis`，**绝不**用 `setFromUnitVectors(up, normal)` 绝对重建（南极锁死）

  **Must NOT do**:
  - **G18**: 不用 `SphereGeometry`（极点挤压）——必须 IcosahedronGeometry
  - **G19**: 不用 `setFromUnitVectors` 做绝对朝向重建
  - **G1**: 不引入物理引擎
  - 不要在球面外做重力（只在球面附近生效）

  **Recommended Agent Profile**:
  - **Category**: `deep` — 球面数学是 MVP 最高风险点，需深度推理
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 6, 7, 8)
  - **Blocks**: 9, 12, 13
  - **Blocked By**: 1

  **References**:
  - **Pattern (Method A)**: PavelBoytchev 三.js 论坛解法——增量 `rotateOnAxis(localAxis, angle)`，角色作为球心 pivot 的子节点
  - **Pattern (Method B)**: Boytchev Etude #12——纯向量算术：`camera.up = position.normalize()`，`lookAt`，叉乘
  - **External**: https://discourse.threejs.org/t/rotating-objects-on-a-sphere/58349（南极锁死讨论）
  - **Pitfall**: 绝对朝向重建 `setFromUnitVectors(up, normal)` 在南极法线突变导致锁死（Hairy Ball 定理）
  - **API**: `IcosahedronGeometry` — https://threejs.org/docs/#api/en/geometries/IcosahedronGeometry

  **Acceptance Criteria**:
  - [ ] `snapToSurface(new Vector3(0,26,0))` 后 y≈25（贴球面）
  - [ ] `getSurfaceNormal(new Vector3(0,26,0))` ≈ (0,1,0)
  - [ ] 跳跃后玩家落回球面（径向速度归零）

  **QA Scenarios**:
  ```
  Scenario: 球面 snap 正确
    Tool: Playwright + browser_evaluate
    Steps:
      1. page.evaluate(() => { const w=window.__game; const p=new THREE.Vector3(0,30,0); w.getScene().userData.snapToSurface(p,1); return p.length(); })
    Expected Result: ≈26（RADIUS+height）
    Failure Indicators: ≠26
    Evidence: .omo/evidence/task-5-snap.txt

  Scenario: 南极不锁死（最高风险边界，AC-22）
    Tool: Playwright + browser_evaluate
    Preconditions: Task 9 玩家控制器就绪后回归；本 task 先用 teleport+手动旋转测试
    Steps:
      1. teleport(0,-RADIUS-1,0)（南极）
      2. 给玩家一个 rotateOnAxis 旋转
      3. 读玩家位置/朝向变化
    Expected Result: 位置/朝向有变化，未锁死
    Failure Indicators: 位置不变、朝向 NaN
    Evidence: .omo/evidence/task-5-pole.txt
  ```

  **Commit**: YES — `feat(world): icosahedron planet + spherical gravity + surface snap`

- [x] 6. 角色低多边形模型 + 动画

  **What to do**:
  - 创建 `src/character.ts`：
    - `createCharacter()`: 用原语拼人形——
      - 头：`IcosahedronGeometry(0.5)`，肤色
      - 头发：扁球，黑色
      - 身体：`CapsuleGeometry(0.4, 0.8)`，黄色 T 恤
      - 腿：两个胶囊，红色短裤 + 白色袜
      - 鞋：扁盒，红色
      - 背包：`BoxGeometry`，棕色，挂背上
      - 组装成 `THREE.Group`，原点在脚底
    - idle 动画：轻微呼吸（整体 scale 或 Y 微动）
    - walk 动画：腿前后摆动（sin 函数驱动腿旋转）
    - 导出 `setAnimation(char, 'idle'|'walk'|'talk')`
  - 全部用 toon 材质（Task 3 的 `toonMat`）

  **Must NOT do**:
  - **G3**: 不加载外部模型——全原语
  - 不用骨骼动画（skeletal）——用程序化 sin 驱动
  - 不超过 ~15 个网格部件

  **Recommended Agent Profile**:
  - **Category**: `quick` — 原语拼接 + sin 动画
  - **Skills**: [`/frontend-ui-ux`]（视觉打磨，可选）

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 5, 7, 8)
  - **Blocks**: 9, 10
  - **Blocked By**: 1, 3

  **References**:
  - **Pattern**: 原角色外观（一手体验）：黑短发/黄T恤/红短裤/白袜红鞋/棕背包
  - **API**: `CapsuleGeometry`, `Group`, `rotateOnAxis`（腿摆动）

  **Acceptance Criteria**:
  - [ ] `createCharacter()` 返回 Group，脚底在原点
  - [ ] `setAnimation(char,'walk')` 后腿有可见摆动
  - [ ] 视觉确认角色像"送信少年"（glm-4.6v）

  **QA Scenarios**:
  ```
  Scenario: 角色视觉
    Tool: Playwright + glm-4.6v
    Steps: 场景放角色，截屏，glm-4.6v 描述：是否有人形角色，黄上衣红短裤背包
    Expected Result: 确认人形 + 颜色匹配
    Failure Indicators: 不像人形 / 颜色错
    Evidence: .omo/evidence/task-6-character.png

  Scenario: walk 动画
    Tool: Playwright
    Steps: setAnimation('walk')，1秒后截两帧对比腿位置
    Expected Result: 腿位置不同（在动）
    Evidence: .omo/evidence/task-6-walk-1.png, task-6-walk-2.png
  ```

  **Commit**: YES（group Wave 2）— `feat(character): low-poly humanoid + idle/walk/talk anim`

- [x] 7. 调试 API（window.__game）

  **What to do**:
  - 创建 `src/debug-api.ts`：
    - 仅 `import.meta.env.DEV` 时挂载 `window.__game`
    - 接口：
      ```ts
      window.__game = {
        isReady: boolean,
        fps: number,
        getPlayer: () => ({ position: Vector3, up: Vector3, velocity: Vector3 }),
        getCamera: () => ({ position: Vector3, up: Vector3 }),
        getScene: () => THREE.Scene,
        getRenderer: () => THREE.WebGLRenderer,
        getQuests: () => Array<{id,status,currentStep}>,
        teleport: (x,y,z) => void,
        completeQuest: (id) => void,
        pause: () => void, resume: () => void,
      };
      ```
    - 各 getter 从游戏单例读取（用模块级 `gameState` 引用，Task 9/11 注入）

  **Must NOT do**:
  - 生产构建（`import.meta.env.PROD`）**绝不**挂载 `window.__game`
  - 不暴露破坏性 API（如直接改任务状态绕过校验）——`completeQuest` 仅用于 QA 测试

  **Recommended Agent Profile**:
  - **Category**: `quick` — 薄封装层
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 5, 6, 8)
  - **Blocks**: F1-F4（QA 全依赖它）
  - **Blocked By**: 1

  **References**:
  - **Pattern**: WorkAdventure（WebGL 游戏）用 `window.__` 调试钩子供 Playwright 断言
  - **API**: `import.meta.env.DEV`（Vite 内置）

  **Acceptance Criteria**:
  - [ ] dev 模式 `window.__game` 存在且各 getter 可调
  - [ ] `npm run build` 产物中 `window.__game` 不存在（grep dist 无 __game）

  **QA Scenarios**:
  ```
  Scenario: DEV 暴露 / PROD 不暴露
    Tool: Playwright + Bash
    Steps:
      1. dev 模式 page.evaluate(() => typeof window.__game) → 'object'
      2. npm run build，grep -r "__game" dist/ → 无匹配
    Expected Result: dev object / prod 无
    Failure Indicators: prod 仍暴露
    Evidence: .omo/evidence/task-7-debug.txt
  ```

  **Commit**: YES（group Wave 2）— `feat(debug): window.__game dev-only API`

- [x] 8. 对话框 UI 覆盖层

  **What to do**:
  - 创建 `src/ui/dialogue.ts` + `src/ui/dialogue.css`：
    - HTML 覆盖层（绝对定位，DOM 元素在 canvas 上方）：
      - 左侧蓝色名牌（speaker 名）
      - 白底对话框（NPC 台词，小写）
      - 右下蓝色播放按钮（▶）推进
    - `showDialogue(lines: DialogueLine[], onComplete)`: 逐行显示，Space/E/点击推进
    - 打字机效果（可选，逐字显示）
    - 完成后调 onComplete
  - 样式贴合原游戏（白色圆角框、蓝色名牌、像素风按钮）

  **Must NOT do**:
  - 不用 React/Vue——纯 DOM 操作
  - 对话框不阻塞渲染循环（只是 UI 覆盖）
  - 不要做分支对话（线性即可）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — UI 打磨
  - **Skills**: [`/frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 5, 6, 7)
  - **Blocks**: 11, 15
  - **Blocked By**: 1, 2

  **References**:
  - **Pattern**: 原游戏对话框（一手体验）：白底圆角 + 左蓝色名牌 + 右下蓝▶推进；台词小写
  - **Data**: `DialogueLine` 接口（Task 2）

  **Acceptance Criteria**:
  - [ ] `showDialogue([{speaker:'OFFICE WORKER', text:'hi'}])` 显示名牌+台词
  - [ ] 按 Space 推进到下一行，末行再按触发 onComplete
  - [ ] 对话框隐藏后 DOM 清理

  **QA Scenarios**:
  ```
  Scenario: 对话推进
    Tool: Playwright
    Steps:
      1. page.evaluate 触发 showDialogue(2 行)
      2. 截图确认对话框可见 + 名牌文字
      3. 按 Space，截图确认第 2 行
      4. 按 Space，确认 onComplete 被调（对话框消失）
    Expected Result: 逐行推进，完成后消失
    Evidence: .omo/evidence/task-8-dialog-1.png, task-8-dialog-2.png
  ```

  **Commit**: YES（group Wave 2）— `feat(ui): dialogue overlay with advance`

- [x] 9. 玩家控制器（球面移动 / 跳跃 / 冲刺）（CRITICAL PATH）

  **What to do**:
  - 创建 `src/player.ts`：
    - `createPlayer(world)`: 创建角色（Task 6）放在球面某点，`player.up = surfaceNormal`
    - 输入：监听 keydown/keyup（WASD + 方向键 + Space + Shift），维护按键状态
    - 每帧更新：
      - 移动：用**增量 `rotateOnAxis`** 沿球面行进——前/后沿角色 forward 切线方向，左/右转向（rotateOnAxis(player.up, ±turnSpeed)）
      - 具体法：把"前/右"作为局部轴，`player.rotateOnAxis(rightAxis, -forwardSpeed)` 让角色沿球面前进（球心为隐含 pivot 的等价：角色位置 = normalize(pos) * R，前移 = 绕与 up 正交的轴旋转小角度）
      - 跳跃：Space 时给径向正速度（`velocity.add(up * jumpForce)`）
      - 冲刺：Shift 时速度 ×1.8
      - 落地：高度 ≤ R+0.01 时 snap 回球面，清径向速度
    - 动画：移动时 `setAnimation('walk')`，否则 `'idle'`
    - 暴露 `player` 对象供相机（Task 13）跟随 + 调试 API（Task 7）读取

  **Must NOT do**:
  - **G19/G20**: 不用 `setFromUnitVectors` 绝对重建朝向；不用 `rotation.set()` Euler——只用 `rotateOnAxis`
  - **G1**: 不用物理引擎
  - 跳跃不要变水平移动（仅径向）

  **Recommended Agent Profile**:
  - **Category**: `deep` — 球面移动 + 朝向是第二高风险点
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 10, 11, 12, 13)
  - **Blocks**: 13, 14, 15
  - **Blocked By**: 5, 6

  **References**:
  - **Pattern**: Task 5 的 Method A（rotateOnAxis 增量）
  - **API**: `Object3D.rotateOnAxis(axis, angle)` — https://threejs.org/docs/#api/en/core/Object3D.rotateOnAxis
  - **Pitfall**: 前进 = 绕"与 up 正交、垂直于 forward 的轴"旋转；该轴 = `new Vector3().crossVectors(up, forward).normalize()`
  - **Controls**: WASD/方向键/Space/Shift（从 JS bundle 确认）

  **Acceptance Criteria**:
  - [ ] 按 W 玩家沿球面前进（位置变化且始终贴球面，`|pos|-R < 0.1`）
  - [ ] 按方向键转向后前进方向改变
  - [ ] Space 跳跃后落回球面
  - [ ] 南极/北极移动不锁死、不 NaN

  **QA Scenarios**:
  ```
  Scenario: 球面前进且贴面
    Tool: Playwright
    Steps:
      1. teleport 玩家到赤道
      2. keydown('w') 2s，keyup
      3. page.evaluate(() => { const p=window.__game.getPlayer().position; return {len:p.length(), moved: p.x!==0||p.z!==0 }; })
    Expected Result: len ≈ R+1（贴面），moved true
    Failure Indicators: len ≠ R / 位置不变
    Evidence: .omo/evidence/task-9-move.txt

  Scenario: 跳跃落回
    Tool: Playwright
    Steps: keydown Space 100ms，等 1s，读高度
    Expected Result: 高度回到 R+1（落地）
    Evidence: .omo/evidence/task-9-jump.txt

  Scenario: 极点不锁死（AC-22，最高风险）
    Tool: Playwright
    Steps: teleport(0,-R-1,0)，按 W 2s，读位置变化 + up 向量无 NaN
    Expected Result: 位置变化，up 非 NaN
    Failure Indicators: 位置不变 / NaN
    Evidence: .omo/evidence/task-9-pole.txt
  ```

  **Commit**: YES — `feat(player): spherical movement controller + jump + sprint`

- [x] 10. NPC 系统

  **What to do**:
  - 创建 `src/npc.ts`：
    - `createNpcs(world, npcs: NPC[])`: 遍历 Task 2 的 NPC 数据，每个：
      - 用 Task 6 的角色创建函数（换配色/简化）做 NPC 模型，snap 到球面指定位置
      - 头顶三角标记（`ConeGeometry` 朝下，黄色，漂浮+旋转动画）
      - 头顶红色名牌（HTML overlay 或 sprite，显示 NPC.name，如 "OFFICE WORKER"）
      - idle 动画
    - `getNearestNpc(playerPos, threshold=3)`: 返回距离玩家 < threshold 的最近 NPC（供 Task 14 交互）
    - NPC 静态（不移动，G：MVP 简化）

  **Must NOT do**:
  - 不做 NPC 寻路/移动（静态）
  - 不用骨骼动画
  - 名牌不要用复杂 3D 文字——HTML overlay 或 sprite

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — 多部件组装
  - **Skills**: [`/frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 9, 11, 12, 13)
  - **Blocks**: 14
  - **Blocked By**: 3, 6

  **References**:
  - **Pattern**: 原游戏 NPC 头顶三角标记 + 红色名牌（一手体验：OFFICE WORKER 红名牌）
  - **Data**: Task 2 的 `npcs.ts`

  **Acceptance Criteria**:
  - [ ] 5 个 NPC 放置在球面，各带三角标记 + 名牌
  - [ ] `getNearestNpc` 在阈值内返回正确 NPC
  - [ ] 三角标记有漂浮动画

  **QA Scenarios**:
  ```
  Scenario: NPC 放置与标记
    Tool: Playwright + glm-4.6v
    Steps: 截图场景，glm-4.6v 确认可见 NPC + 头顶三角标记
    Expected Result: 至少 1 NPC 可见 + 三角标记
    Evidence: .omo/evidence/task-10-npc.png

  Scenario: 接近检测
    Tool: Playwright
    Steps: teleport 玩家到某 NPC 旁，page.evaluate(() => window.__game.getNearestNpc?.()) 或读 NPC 模块
    Expected Result: 返回该 NPC
    Evidence: .omo/evidence/task-10-near.txt
  ```

  **Commit**: YES（group Wave 3）— `feat(npc): 5 static npcs + triangle marker + name tag`

- [ ] 11. 任务系统（步骤状态机）

  **What to do**:
  - 创建 `src/quest.ts`：
    - `QuestManager`：管理 5 任务状态，`getQuests()` / `startQuest(id)` / `advanceStep(id)` / `isComplete(id)`
    - 状态机：locked → active（接取）→ step_0..step_N（推进）→ completed
    - 接取：NPC 对话结束后（Task 14 触发）`startQuest`
    - 推进：delivery 类任务，玩家携带物品到达目标 NPC 交互时 `advanceStep`
    - "NEXT UP" 目标 overlay：`showObjective(text)`（大写目标文字，居中显示 2-3 秒淡出）
    - 完成：显示 "CONGRATULATIONS! ANOTHER SUCCESSFUL DELIVERY COMPLETED" + 播放 quest-complete 音效
    - 5 任务用 Task 2 的数据；第一个任务默认接取或标题屏后自动激活

  **Must NOT do**:
  - 不做分支任务/多结局——线性步骤
  - 不持久化（内存态，刷新重置）
  - 不做任务计时器

  **Recommended Agent Profile**:
  - **Category**: `deep` — 状态机逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 9, 10, 12, 13)
  - **Blocks**: 14, 16
  - **Blocked By**: 2, 8

  **References**:
  - **Pattern**: 原任务状态机字段（JS bundle）：quest_enable_id / quest_step_check / quest_step_completed / quest_completed
  - **Pattern**: "NEXT UP" + 大写目标（一手体验：FIND THE RED CLIFF HOUSE AND GET THE LETTER BACK）
  - **Data**: Task 2 的 `quests.ts`

  **Acceptance Criteria**:
  - [ ] `startQuest('quest_0')` 后状态变 active
  - [ ] 推进所有步骤后 `isComplete` true，显示完成提示
  - [ ] `getQuests()` 返回 5 个任务状态

  **QA Scenarios**:
  ```
  Scenario: 任务全流程
    Tool: Playwright + browser_evaluate
    Steps:
      1. window.__game.completeQuest('quest_0')（QA 捷径）或手动推进
      2. 读 getQuests()，确认 quest_0 status='completed'
      3. 截图确认完成提示显示
    Expected Result: quest_0 completed + 提示可见
    Evidence: .omo/evidence/task-11-quest.png + .txt

  Scenario: NEXT UP overlay
    Tool: Playwright + glm-4.6v
    Steps: 触发 showObjective，截图，glm-4.6v 确认大写目标文字居中
    Expected Result: 大写文字可见
    Evidence: .omo/evidence/task-11-objective.png
  ```

  **Commit**: YES（group Wave 3）— `feat(quest): step state machine + NEXT UP overlay + 5 quests`

- [ ] 12. 世界内容（3 区域原语布局）

  **What to do**:
  - 创建 `src/regions.ts`：
    - 3 区域（neighborhood 街区 / plaza 广场 / beach 海滩），各在球面不同经纬
    - 每区域用原语摆场景：
      - neighborhood：几个房子（BoxGeometry 不同色 + 锥形屋顶 ConeGeometry）、路（扁盒）、树（圆柱干 + 球冠）
      - plaza：喷泉（圆柱+圆盘）、长椅、路标
      - beach：水面（蓝色扁盘/半球）、沙地（黄色圆盘）、礁石
    - 所有物体 snap 到球面 + 朝向沿表面法线（`obj.up = normal; obj.lookAt` 或用 `quaternion.setFromUnitVectors` 一次性建好——一次性建朝向 OK，**运行时**才禁止绝对重建）
    - 地标：红 cliff house（Task 11 quest_0 目标）、Smelly Falls（瀑布，蓝色锥）、cave（洞口）、Capital Corp（建筑）
    - 全部用 toon 材质
  - 区域间用小路连接，球面可步行环游

  **Must NOT do**:
  - **G3**: 不加载外部模型
  - 不做 7 区域（MVP 3 区域）
  - 不做复杂碰撞（物体只视觉，玩家可穿过——MVP 简化）——可选：简单阻挡

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — 大量原语摆放
  - **Skills**: [`/frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 9, 10, 11, 13)
  - **Blocks**: 14（场景就绪）
  - **Blocked By**: 3, 5

  **References**:
  - **Pattern**: 原游戏 7 区域（neighborhood/plaza/cemetery/beach/mountain temple/forest/factory）→ MVP 取 3
  - **Pattern**: 立方体展成球（原游戏），但 MVP 直接 IcosahedronGeometry + 物体 snap 到球面
  - **API**: snapToSurface / getSurfaceNormal（Task 5）

  **Acceptance Criteria**:
  - [ ] 3 区域各有可识别地标（红房/喷泉/水面）
  - [ ] 所有物体贴球面且竖直
  - [ ] 视觉确认 cel-shaded 小镇风格

  **QA Scenarios**:
  ```
  Scenario: 世界视觉
    Tool: Playwright + glm-4.6v
    Steps: 高空视角（相机拉远）截图，glm-4.6v 确认球形星球 + 3 区域 + 建筑/树/水
    Expected Result: 球形世界 + 可识别建筑群
    Evidence: .omo/evidence/task-12-world.png

  Scenario: 物体贴球面
    Tool: browser_evaluate
    Steps: 遍历区域物体，检查 |pos| ≈ R + 物体高度
    Expected Result: 全部贴面
    Evidence: .omo/evidence/task-12-snap.txt
  ```

  **Commit**: YES（group Wave 3）— `feat(world): 3 regions low-poly layout + landmarks`

- [ ] 13. 第三人称相机

  **What to do**:
  - 创建 `src/camera.ts`：
    - 第三人称跟随：相机在玩家后上方，看向玩家
    - **每帧** `camera.up.copy(player.position).normalize()`（表面法线，极点不翻转，G19）
    - 跟随：相机位置 = 玩家位置 + up * height + player.forward * (-distance)（在玩家局部系）
    - 自动居中：相机 yaw 跟随玩家朝向（玩家转向时相机缓动跟随）
    - 平滑：lerp 相机位置避免抖动
    - `lookAt(player.position)`
  - 极点测试：南北极相机 up 仍正确，不翻转

  **Must NOT do**:
  - **G19**: 不用固定 `worldUp=(0,1,0)`——极点翻转
  - 不做玩家自由控制相机旋转（自动居中，MVP 简化）
  - 不做相机碰撞（穿墙可接受）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — 相机数学
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 9, 10, 11, 12)
  - **Blocks**: 14, 15
  - **Blocked By**: 5

  **References**:
  - **Pattern**: 原游戏动态相机 + 自动居中（评测：相机自动化便于非玩家受众）
  - **Pitfall**: 固定 worldUp 在极点翻转；解法 `camera.up = surfaceNormal`
  - **API**: `camera.up.copy()`, `camera.lookAt()`, `Vector3.lerp()`

  **Acceptance Criteria**:
  - [ ] 相机始终在玩家后上方，看向玩家
  - [ ] `cam.up · surfaceNormal > 0.95`（5 位置：北极/南极/赤道×3，AC-5）
  - [ ] 极点不翻转

  **QA Scenarios**:
  ```
  Scenario: 相机跟随 + 极点安全（AC-5，最高风险）
    Tool: Playwright + browser_evaluate
    Steps:
      1. 对 5 位置 [北极(0,R,0)/南极(0,-R,0)/赤道×3] 各 teleport
      2. 每处读 cam.up 和 surfaceNormal 的点积
    Expected Result: 全部 > 0.95（不翻转）
    Failure Indicators: 点积 <0（翻转）或 NaN
    Evidence: .omo/evidence/task-13-camera.txt

  Scenario: 跟随视觉
    Tool: Playwright + glm-4.6v
    Steps: 移动玩家，截图确认第三人称背视角
    Expected Result: 看到角色背影 + 前方世界
    Evidence: .omo/evidence/task-13-follow.png
  ```

  **Commit**: YES（group Wave 3）— `feat(camera): third-person follow + surface-normal up + auto-center`

- [ ] 14. 交互系统（E 键 → 对话 → 任务 → 配送完成）

  **What to do**:
  - 创建 `src/interaction.ts`：
    - 监听 KeyE：当 `getNearestNpc` 返回 NPC 且玩家未在对话中 → 触发该 NPC 对话（Task 8 showDialogue）
    - 对话完成回调：
      - 若 NPC 有 questId 且任务未接取 → `startQuest`，显示 "NEXT UP" 目标
      - 若玩家携带该任务的目标物品且当前 NPC 是目标 recipient → `advanceStep`/`completeQuest`
    - "携带物品"：startQuest 时设 `player.hasItem = quest.itemName`，完成时清空（视觉可选：背包上方显示物品图标）
    - 接近 NPC 时显示 "Press E" 提示（HTML overlay）
    - 暂停玩家移动输入（对话中）

  **Must NOT do**:
  - 不做物品栏 UI（只持有一个物品标志）
  - 不做分支对话选择
  - 对话中禁止移动（但渲染循环继续）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — 串联多系统
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with 15, 16)
  - **Blocks**: F1-F4
  - **Blocked By**: 9, 10, 11

  **References**:
  - **Pattern**: 原任务循环（一手体验）：E 对话 → NEXT UP 目标 → 到目标 NPC 交互 → CONGRATULATIONS
  - **API**: Task 8 showDialogue, Task 10 getNearestNpc, Task 11 QuestManager

  **Acceptance Criteria**:
  - [ ] 接近 NPC 按 E 弹对话
  - [ ] 对话结束触发接任务 + NEXT UP overlay
  - [ ] 携带物品到目标 NPC 按 E 完成任务
  - [ ] 对话中玩家不动

  **QA Scenarios**:
  ```
  Scenario: 完整任务循环（集成核心）
    Tool: Playwright + browser_evaluate
    Steps:
      1. teleport 到 quest_0 的 giver NPC，按 E，推进对话，确认 NEXT UP 显示
      2. teleport 到目标 NPC（红房处），按 E
      3. 读 getQuests()，quest_0 status='completed'
      4. 截图确认 CONGRATULATIONS 提示
    Expected Result: quest_0 completed
    Failure Indicators: 任务未推进 / 提示未显示
    Evidence: .omo/evidence/task-14-loop.png + .txt

  Scenario: 对话中禁移动
    Tool: Playwright
    Steps: 触发对话，按 W 2s，读玩家位置
    Expected Result: 位置不变
    Evidence: .omo/evidence/task-14-nomove.txt
  ```

  **Commit**: YES — `feat(interaction): E key dialogue + quest pickup + delivery completion`

- [ ] 15. 标题屏 + 开场过场

  **What to do**:
  - 创建 `src/intro.ts` + `src/ui/title.css`：
    - 标题屏：
      - 显示 "MESSENGER" 标题（大字，可 CSS 或简单 3D）
      - 黄色 "Begin" 按钮（底部居中）
      - 背景渐变或简化星球预览
      - Begin 点击 → `AudioManager.resume()`（解锁音频）→ 进开场过场
    - 开场过场：
      - 2D 插画风对话（简化：黑底 + 角色立绘占位 + 对话框）
      - 台词："LOOKS LIKE I SLEPT IN... I BETTER START TODAY'S DELIVERIES." → "I'VE GOT FIVE ON THE LIST. HOPEFULLY THEY'RE EASY TO FIND."
      - Space/E/点击推进
      - 过场结束 → 进入 3D 世界，玩家可控
    - 游戏状态机：`title` → `intro` → `playing`

  **Must NOT do**:
  - 不做复杂 2D 插画动画（简化文字+占位立绘即可）
  - 标题字母不做逐字动画（MVP 简化，直接显示）
  - Begin 按钮要可键盘（Enter/Space）+ 鼠标点击触发

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — UI/过场
  - **Skills**: [`/frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with 14, 16)
  - **Blocks**: F1-F4
  - **Blocked By**: 8, 9

  **References**:
  - **Pattern**: 原标题屏（一手体验）：青色水面 + 圆岛 + 白色 MESSENGER + 黄 Begin；开场对话 2 句
  - **Data**: Task 2 对话

  **Acceptance Criteria**:
  - [ ] 启动显示标题屏 + Begin
  - [ ] 点击/Enter Begin → 音频解锁 → 开场对话
  - [ ] 推进 2 句后进入 3D 世界，玩家可控

  **QA Scenarios**:
  ```
  Scenario: 标题→过场→游戏
    Tool: Playwright + glm-4.6v
    Steps:
      1. 截图标题屏，glm-4.6v 确认 MESSENGER + Begin
      2. 按 Enter，截图开场对话
      3. 推进 2 次，截图确认进入 3D 世界（角色+世界可见）
    Expected Result: 三态正确切换
    Evidence: .omo/evidence/task-15-title.png, task-15-intro.png, task-15-playing.png

  Scenario: 音频解锁
    Tool: Playwright
    Steps: 按 Enter Begin 后读 Howler.ctx.state
    Expected Result: 'running'
    Evidence: .omo/evidence/task-15-audio.txt
  ```

  **Commit**: YES — `feat(intro): title screen + opening dialogue cutscene`

- [ ] 16. UI & HUD

  **What to do**:
  - 创建 `src/ui/hud.ts` + `src/ui/hud.css`：
    - 右上角菜单按钮（三横线），点/Esc 弹暂停菜单（继续/退出到标题）
    - 音效切换按钮（音符图标，静音/取消静音，绑 Task 4 setMuted）
    - 任务目标 overlay（Task 11 的 NEXT UP 复用）+ 当前任务提示（小字常驻右上角："Deliver: FIND THE RED CLIFF HOUSE..."）
    - Esc 暂停游戏（停渲染循环输入 + 弹菜单）
    - "Press E" 交互提示（Task 14）
  - 不做换装/表情按钮（已排除）

  **Must NOT do**:
  - 不做换装(t-shirt)/表情按钮（OUT）
  - 不做小地图（OUT）
  - HUD 不遮挡核心视野

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — HUD 打磨
  - **Skills**: [`/frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with 14, 15)
  - **Blocks**: F1-F4
  - **Blocked By**: 1, 11

  **References**:
  - **Pattern**: 原游戏 HUD（一手体验）：右上菜单、右下侧键、NPC 名牌、任务目标 overlay
  - **API**: Task 4 AudioManager, Task 11 QuestManager

  **Acceptance Criteria**:
  - [ ] 菜单按钮 + 音效按钮可见可点
  - [ ] Esc 弹暂停菜单
  - [ ] 当前任务提示常驻显示

  **QA Scenarios**:
  ```
  Scenario: HUD 元素 + 暂停
    Tool: Playwright + glm-4.6v
    Steps:
      1. 截图确认菜单/音效按钮可见
      2. 按 Esc，截图确认暂停菜单
      3. 点静音，读 Howler.muted
    Expected Result: HUD 可见 / 暂停菜单 / 静音生效
    Evidence: .omo/evidence/task-16-hud.png, task-16-pause.png, task-16-mute.txt
  ```

  **Commit**: YES — `feat(hud): menu + sound toggle + objective overlay + pause`

---

## Final Verification Wave (MANDATORY — 所有实现任务完成后)

> 4 个 review agent 并行。全部 APPROVE 才算通过。汇总结果给用户，获明确"okay"后才算完成。

- [ ] F1. **Plan Compliance Audit** — `oracle`
  逐条核对 Must Have：读文件/curl/跑命令验证实现存在；逐条核对 Must NOT Have：搜代码库禁用模式（SphereGeometry/setFromUnitVectors/EffectComposer/物理引擎/Euler rotation.set），发现即 file:line 拒绝。检查 `.omo/evidence/` 证据文件齐全。对比交付物与计划。
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  跑 `npm run build`（必须无错）。审查所有改动文件：type 抑制、空 catch、debug 日志、注释残留代码、未用 import。AI slop：过度注释、过度抽象、泛型名(data/result/item/temp)。验证 `preserveDrawingBuffer:true`、`window.__game` DEV 守卫、OutlineEffect 用 `effect.render()`。
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` + `playwright` skill
  从干净状态执行每个 task 的 QA 场景——跟随精确步骤、抓证据。测跨任务集成（移动→找NPC→对话→接任务→配送→完成 全流程）。测边界：极点传送、空状态、连续按键、Esc 暂停。存 `.omo/evidence/final-qa/`。
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  每个 task：读"What to do"，读实际 diff（git log/diff），1:1 核对——计划的都建了（无遗漏），没建超计划的（无 creep）。查"Must NOT do"合规。查跨任务污染（Task N 动了 Task M 的文件）。标记未说明改动。
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `chore(scaffold): vite+ts+three.js project + renderer + audio + types + cel material` — 多文件
- **Wave 2**: `feat(core): spherical world gravity, character model, debug api, dialogue ui`
- **Wave 3**: `feat(gameplay): player controller, npc, quest system, world content, camera`
- **Wave 4**: `feat(integration): interaction, intro sequence, hud`
- **FINAL**: 视审计结果修复后提交
- Pre-commit: `npm run build`（必须通过）

---

## Success Criteria

### Verification Commands
```bash
npm install          # 依赖安装无错
npm run build        # 构建无错，产出 dist/
npm run dev          # 开发服务器启动，浏览器可访问
```

### 程序化断言（Playwright + window.__game）
```js
// 球面重力：玩家在球面
page.evaluate(() => Math.abs(window.__game.getPlayer().position.length() - R - 1) < 0.1)
// 极点不锁死：传送南极后按 W，位置变化
// 相机不翻转：cam.up · surfaceNormal > 0.95
// 5 任务：getQuests() 全部 completed
// FPS：window.__game.fps > 45
```

### Final Checklist
- [ ] 所有 Must Have 存在
- [ ] 所有 Must NOT Have 缺席
- [ ] `npm run build` 通过
- [ ] 5 任务全流程可完成
- [ ] 极点不锁死、相机不翻转
- [ ] QA 证据齐全（.omo/evidence/）
- [ ] 玩家操作流畅（60fps）
