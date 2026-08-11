# Follow Builders Enhanced - 部署指南

## 📋 概述

这是一个扩展版的 follow-builders 项目，新增了 **Reddit** 和 **YouTube** 数据源。

## 🚀 部署步骤

### 1. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 仓库名：`follow-builders-enhanced`（或其他你喜欢的名字）
3. 设为 Public 或 Private
4. 不要初始化 README/.gitignore（我们已有这些文件）

### 2. 上传代码

```bash
# 在 Minis 中，复制仓库到本地
cd /var/minis/workspace/follow-builders-enhanced

# 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit: Enhanced follow-builders with Reddit and YouTube"

# 添加远程仓库（替换 YOUR-USERNAME）
git remote add origin https://github.com/YOUR-USERNAME/follow-builders-enhanced.git
git push -u origin main
```

### 3. 配置 Secrets

在 GitHub 仓库页面：
1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加以下 secrets：

| Secret 名称 | 说明 | 如何获取 |
|------------|------|---------|
| `X_BEARER_TOKEN` | X API Bearer Token | https://developer.x.com/en-us/dashboard |
| `POD2TXT_API_KEY` | Pod2txt API Key | https://pod2txt.vercel.app/ |

**获取 X Bearer Token：**
1. 访问 https://developer.x.com/
2. 创建项目和应用
3. 在 Keys and Tokens 中生成 Bearer Token
4. 复制并粘贴到 GitHub Secrets

**获取 Pod2txt API Key：**
1. 访问 https://pod2txt.vercel.app/
2. 注册并获取 API Key

### 4. 更新 prepare-digest-enhanced.js

打开 `scripts/prepare-digest-enhanced.js`，找到第 23-24 行：

```javascript
const FEED_REDDIT_URL = 'https://raw.githubusercontent.com/YOUR-USERNAME/follow-builders-enhanced/main/feed-reddit.json';
const FEED_YOUTUBE_URL = 'https://raw.githubusercontent.com/YOUR-USERNAME/follow-builders-enhanced/main/feed-youtube.json';
```

将 `YOUR-USERNAME` 替换为你的 GitHub 用户名。

### 5. 更新本地技能

将更新后的文件复制回 Minis 技能目录：

```bash
# 复制更新后的 prepare-digest-enhanced.js
cp /var/minis/workspace/follow-builders-enhanced/scripts/prepare-digest-enhanced.js \
   /var/minis/skills/follow-builders/scripts/prepare-digest-enhanced.js
```

### 6. 测试

手动触发 GitHub Action：
1. 进入仓库的 **Actions** 标签
2. 点击 **Generate Enhanced Feeds**
3. 点击 **Run workflow**
4. 等待完成（约 1-2 分钟）

检查生成的文件：
- `feed-reddit.json` - Reddit 热门帖子
- `feed-youtube.json` - YouTube 热门视频

## 📊 数据源

### Reddit Subreddits
- r/LocalLLaMA - 本地 LLM 讨论
- r/artificial - AI 新闻和讨论
- r/MachineLearning - 机器学习研究
- r/openai - OpenAI 官方和社区
- r/ChatGPT - ChatGPT 使用技巧
- r/ClaudeAI - Claude AI 讨论

### YouTube Channels
- Lex Fridman - AI 访谈节目
- Two Minute Papers - AI 论文解读
- AI Explained - AI 概念解释
- Yannic Kilcher - AI 论文综述
- The AI Revolution - AI 新闻
- Machine Learnia - 机器学习教程

## 🔄 自动化

GitHub Actions 会每天 UTC 6:17 自动运行，生成最新的 feed 文件。

你也可以手动触发：
- 访问仓库的 Actions 页面
- 点击 "Run workflow"
- 选择要运行的模式（all, reddit-only, youtube-only 等）

## 📝 使用方式

在 Minis 中运行：

```bash
cd /var/minis/skills/follow-builders/scripts
node prepare-digest-enhanced.js
```

输出 JSON 格式的数据，包含所有数据源的内容。

## ⚠️ 注意事项

1. **网络限制**：Reddit 和 YouTube 在沙箱环境中无法直接访问，必须通过 GitHub Actions 在云端生成数据
2. **API 限制**：X API 有 rate limit，确保不要超过限制
3. **数据更新**：Feed 文件每天更新一次，如需实时更新可手动触发 workflow

## 🆘 故障排查

### GitHub Actions 失败

1. 检查 Secrets 是否正确配置
2. 查看 Actions 日志找出错误
3. 确保 Node.js 版本兼容（使用 v20）

### 数据为空

1. 检查 subreddit/channel 是否仍然活跃
2. 查看 workflow 日志中的错误信息
3. 手动运行 workflow 测试

### 无法读取 feed 文件

1. 确认 GitHub 用户名正确
2. 确认分支名称正确（通常是 main 或 master）
3. 检查网络连接

## 📄 许可证

与原 follow-builders 项目相同
