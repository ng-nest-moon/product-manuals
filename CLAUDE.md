# product-manuals — AI 工作流守则

## 项目简介

AI 驱动的产品功能说明书合集。每个文档描述一个产品**做什么**，而非**怎么做**。

静态站点生成器，Markdown 源文件 → HTML 输出。基于 Node.js 构建。

## 开发命令

- `npm run build` — 构建完整站点到 `dist/`
- `npm run dev` — 本地开发服务器，访问 `http://localhost:3000`

## AI 工作流：新增产品说明书

任何时候要求写"新产品说明书"或类似任务，必须按以下流程执行：

### 步骤 1：加载 Skill

先激活 `writing-product-specs` skill（位于 `.github/skills/writing-product-specs/SKILL.md`），按其中的模板引导输出。

### 步骤 2：创建文档

在 `docs/` 下创建 `{nn}-{产品名}.md`，按 skill 模板依次填写：
一句话定义 → 架构总览 → 核心功能清单 → 模块详解 → 用户流程 → 边界声明

### 步骤 3：更新 README

在 `README.md` 的产品表格中追加一行，保持表格格式一致：
`| {nn} | [{产品名}](docs/{nn}-{产品名}.md) | 类型 | 一句话定义 |`

### 步骤 4：构建验证

运行 `npm run build`，确认无报错。

## 规则

- 不要修改已有文档的格式和内容结构
- 不要擅改 README 的表格以外的内容
- 章节编号使用中文数字（一、二、三），子章节使用小数编号（3.1、3.2）
- 架构图使用 ASCII 树形图
