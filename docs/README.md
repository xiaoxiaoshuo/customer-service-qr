# 云龙虾客服 · 二维码展示页

一个用于展示微信客服二维码的纯静态页面，同时适配 **H5 手机端** 与 **PC Web**。
打开页面即可扫码添加客服，无需后端、无需构建步骤。

## 预览

| PC 端（双栏） | 手机端（单栏） |
| --- | --- |
| 左侧文案与操作按钮，右侧二维码卡片 | 二维码卡片置顶，按钮满宽，底部悬浮「扫码」 |

## 快速使用

直接用浏览器打开 `index.html` 即可。若要通过本地服务访问：

```powershell
# 任选其一
python -m http.server 8080
npx --yes serve .
```

然后访问 `http://localhost:8080`。

## 部署到 GitHub Pages

仓库已包含 `.nojekyll`，站点位于仓库的 `site/` 目录。

在仓库 **Settings → Pages** 中把 Source 设为 *Deploy from a branch*，
分支选 `main`，目录选 `/docs`，保存后等待一两分钟即可通过
`https://<用户名>.github.io/customer-service-qr/` 访问。

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
- **触屏友好**：按钮满宽、点击区放大、底部悬浮扫码入口避开内容
- **扫码卡片**：白底二维码 + 紫色扫码框角标，保证识别率
- **实用操作**：一键复制页面链接、一键保存二维码图片
- **细节处理**：`prefers-reduced-motion` 动效降级、`print` 打印样式、
  适配刘海屏的 `safe-area-inset`

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
