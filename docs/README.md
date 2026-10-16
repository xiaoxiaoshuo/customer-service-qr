# 云龙虾客服 · 二维码展示页

一个用于展示微信客服二维码的纯静态页面，同时适配 **H5 手机端** 与 **PC Web**。
打开页面即可扫码添加客服，无需后端、无需构建步骤。

## 预览

| PC 端（双栏） | 手机端（单栏） |
| --- | --- |
| 原双栏、系统推荐下载与二维码操作 | 二维码优先，长按识别、添加微信与软件激活指引 |

## 快速使用

直接用浏览器打开 `index.html` 即可。若要通过本地服务访问：

```powershell
# 任选其一
python -m http.server 8080
npx --yes serve .
```

然后访问 `http://localhost:8080`。

## 部署到 GitHub Pages

仓库已包含 [.nojekyll](.nojekyll)，站点位于仓库的 [docs/](../docs/) 目录。

在仓库 **Settings → Pages** 中把 Source 设为 *Deploy from a branch*，
分支选 `main`，目录选 `/docs`，保存后等待一两分钟即可通过
`https://<用户名>.github.io/customer-service-qr/` 访问。

## 部署到阿里云 OSS

正式网站：<https://www.denuoxuankeji.com/>。

完整的升级、备份、验证与回滚步骤见仓库根目录的 [OSS 部署教程](../DEPLOY_OSS.md)，发布使用 [PowerShell 脚本](../scripts/deploy-oss.ps1)。GitHub Pages 发布与 OSS 更新相互独立。

## 目录结构

```
docs/
├── index.html                 # 页面结构
├── styles.css                 # 主题与响应式布局
├── app.js                     # 复制链接、保存二维码、悬浮按钮
├── customer-service-qr.jpg    # 客服微信二维码原图
└── .nojekyll                  # 关闭 Jekyll，保证静态资源原样发布
```

## 特性

- **双端自适应**：PC 左右分栏，平板与手机自动切为单列，无横向溢出
- **触屏友好**：移动端首屏优先展示二维码与激活指引，备用操作默认折叠
- **扫码卡片**：保留白底原图与扫码静区，不拉伸、裁切或遮挡码点
- **实用操作**：桌面复制页面链接、保存二维码；手机保留原生长按与原图保存
- **细节处理**：`prefers-reduced-motion` 动效降级、`print` 打印样式、
  适配刘海屏的 `safe-area-inset`

## 移动端激活首屏

手机、Android 平板、iPad（包括桌面模式）以及小于 768px 的窄视口展示精简版：二维码上移，隐藏重复标题、复制链接按钮和长篇售后介绍，突出「微信内长按识别 → 添加微信联系人 → 发送“激活软件”」的流程。普通浏览器或长按无响应时，可展开备用说明保存原图，再通过微信扫一扫的相册识别。

二维码继续使用未经修改的真实 `<img>`，不拦截触摸或右键菜单，不伪造自动添加联系人 / 自动激活功能。微信识别与添加联系人属于原生客户端操作，需要真实手机验收。桌面保留原布局、二维码操作和系统推荐下载功能。

第一版采用独立预览目录，未经确认不覆盖正式首页。

## 桌面客户端下载

桌面浏览器（视口至少 768px）显示下载面板；移动设备展示二维码激活指引，不显示桌面安装包入口。

- Windows 推荐 x64 ZIP 完整包（v0.1.18）；明确报告 ARM 的 Windows 设备先提示确认兼容性。
- Mac 优先使用浏览器 Client Hints 的 `architecture` 与 `bitness` 推荐 Apple 芯片 / Intel DMG（v0.1.5）。`Intel Mac OS X` 和 `MacIntel` **不能**证明是 Intel 芯片；Safari、Firefox或检测失败时要求手动选择。
- 检测最多等待 1.2 秒，不保存设备信息、不上传识别数据、不自动下载。浏览器提示仅作为推荐，始终提供手动选择。
- 更改下拉选项不会下载，必须再点击下载按钮；手动选择不会被迟到的自动检测覆盖。
- 三个安装包地址统一维护在 [页面](index.html) 的 `download-platform` 选项中。版本更新时同步修改地址、版本文案以及 CSS / JS 的缓存版本参数。
- 下载使用普通 HTTPS 链接，不把数百 MB 安装包读入浏览器内存；跨域响应的保存行为由浏览器和安装包 MIME 类型决定。

浏览器回归脚本：[test-downloads.cjs](../scripts/test-downloads.cjs)。需要已有 Playwright，可通过 `PLAYWRIGHT_MODULE` 指定其模块路径，通过 `CHROME_EXECUTABLE` 指定 Chrome 路径；安装包请求在测试中使用小型下载夹具，不下载真实安装包。运行 `node scripts/test-downloads.cjs --before <旧站点快照目录> --output <测试输出目录>` 可验证系统推荐、手动兜底、桌面截图保持一致及移动端首屏布局、触摸命中与原图保存。增加 `--url <预览网址>` 可验证实际 HTTPS 图片下载；本地虚拟域名测试仅校验图片响应字节，不将其视为原生下载验收。

## 自定义

主题色集中在 `styles.css` 顶部的 `:root` 变量中：

```css
:root {
  --brand: #5b5bd6;                       /* 主色 */
  --grad-brand: linear-gradient(140deg, #6366f1, #7c3aed);  /* 按钮渐变 */
  --grad-text: linear-gradient(96deg, #8b8cf9, #a78bfa, #c4b5fd); /* 标题渐变 */
}
```

二维码使用 `customer-service-qr.jpg`，当前为 **640 × 640** 的方形图片。
仅裁去上传图片外围的多余白边，不重绘、不拉伸二维码，四周保留至少 4 个码点宽度的扫码静区。
页面最大显示宽度为 344px，小屏幕按容器宽度等比例缩小；保存按钮下载同一张二维码。

后续替换时，请保留足够的白色静区，并同步更新 `index.html` 中图片的 `width` / `height` 以及展示、下载链接的 `v` 版本参数，避免旧图缓存。

## 说明

页面保留原站点的客服名称「云龙虾客服-售后」，卡片头像使用独立客服图标，不再从二维码中裁切。
如需修改名称，编辑 `index.html` 中对应的标题文本。
