# Windows 迁移和运行说明

这个项目的推荐使用方式是：Mac 继续作为主控开发机，GitHub 作为同步中心，Windows 只负责拉取最新版本并运行。

## 方案一：推荐，Windows 从 GitHub 克隆

在 Windows 上先安装：

- Node.js 22 LTS
- Git

然后打开 PowerShell，运行：

```powershell
git clone https://github.com/Richard1eeK/Synomym-Dics.git
cd Synomym-Dics
npm install
```

在项目根目录新建 `.env.local` 文件，内容如下：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API key
```

启动本地网页：

```powershell
npm run dev
```

浏览器打开：

```text
http://localhost:3000
```

如果 3000 端口被占用：

```powershell
npm run dev -- --port 3001
```

## 方案二：使用 Mac 打包好的压缩包

把 `vocab-app-windows-transfer.zip` 拷到 Windows 后解压，进入解压后的项目目录。

然后执行：

```powershell
npm install
```

接着新建 `.env.local`：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API key
```

最后启动：

```powershell
npm run dev
```

## Mac 保持主控权的工作流

以后所有代码和功能修改都在 Mac 上做：

```bash
cd /Users/richard/Documents/projects/vocab-app
# 修改代码后
git add .
git commit -m "Describe the change"
git push
```

Windows 只同步 Mac 推上 GitHub 的版本：

```powershell
cd Synomym-Dics
git pull
npm install
npm run dev
```

## 注意事项

- 不要把 `.env.local` 上传到 GitHub。
- `.env.local` 需要在 Mac 和 Windows 各自创建一份。
- `node_modules`、`.next` 这类缓存不用打包，Windows 运行 `npm install` 和 `npm run build` 会自动生成。
- 如果想严格避免 Windows 修改代码，可以只在 Windows 上运行和体验，不在 Windows 上提交 commit。
