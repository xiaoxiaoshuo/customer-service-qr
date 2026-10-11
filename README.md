# customer-service-qr

客服微信二维码展示页：一个纯静态、双端自适应的二维码落地页，用于在 PC Web 与 H5 上展示客服微信二维码，方便访客扫码添加。

站点源码位于 [`docs/`](./docs)，仓库已启用 GitHub Pages 发布流程（分支 `main`、目录 `/docs`）。

## 本地预览

直接打开 `docs/index.html`，或在仓库根目录启动一个静态服务器：

```powershell
python -m http.server 8080 --directory docs
```

## 部署

- 正式网站（阿里云 OSS）：<https://www.denuoxuankeji.com/>
- GitHub Pages：<https://xiaoxiaoshuo.github.io/customer-service-qr/>
- [OSS 部署教程](DEPLOY_OSS.md)：现有环境、凭据准备、升级步骤、验收和回滚。
- [OSS 部署脚本](scripts/deploy-oss.ps1)：默认预演，传入 `-Apply` 才会备份并发布四个网站文件。

```powershell
# 在仓库根目录执行，网站改动需先提交。
.\scripts\deploy-oss.ps1
.\scripts\deploy-oss.ps1 -Apply
```

**推送 GitHub 不会自动更新 OSS**，两套发布目前需要分别执行；详细流程见[部署教程](DEPLOY_OSS.md)。

## 主要特性

- PC 左右分栏 / 手机单列，自动适配，无横向溢出
- 白底二维码 + 扫码框角标，保证扫码识别率
- 一键复制页面链接、一键保存二维码
- 无框架、无构建步骤，纯 HTML + CSS + JS

详细说明见 [`docs/README.md`](./docs/README.md)。
