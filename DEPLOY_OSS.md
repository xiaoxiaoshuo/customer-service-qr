# 阿里云 OSS 部署与升级

本项目是纯静态站点，无需构建。本教程记录已验证的正式环境，以及后续升级、验收和回滚方法。

> **GitHub Pages 和 OSS 是两套独立发布目标。** 推送 GitHub 会触发 Pages 发布，**不会自动更新 OSS**。目前 OSS 使用人工运行的部署脚本，尚未配置自动发布流水线。

## 1. 现有正式环境

| 项目 | 配置 |
| --- | --- |
| 正式网站 | <https://www.denuoxuankeji.com/> |
| Bucket | `yunshufe` |
| 地域 | 北京，`cn-beijing`（Bucket Location 为 `oss-cn-beijing`） |
| OSS Endpoint | `oss-cn-beijing.aliyuncs.com` |
| 对象前缀 | Bucket 根目录，即 `oss://yunshufe/` |
| 静态网站首页 | `index.html`，已开启子目录首页支持 |
| 现有访问配置 | Bucket 为 `public-read`，网站对象 ACL 为 `default`，继承 Bucket 权限 |
| 自定义域名 | `www.denuoxuankeji.com`，OSS CNAME 与 HTTPS 证书已启用 |
| GitHub Pages | <https://xiaoxiaoshuo.github.io/customer-service-qr/> |

**升级时不需要重建 Bucket、修改 ACL、重新绑定域名或改变网站配置。** Bucket 内还有其他下载资源，禁止整桶清空或使用带删除选项的全目录同步。

只上传以下四个文件，不要将整个工作区上传到公开 Bucket：

| 本地文件 | OSS 对象 | Content-Type |
| --- | --- | --- |
| [app.js](docs/app.js) | `app.js` | `application/javascript; charset=utf-8` |
| [styles.css](docs/styles.css) | `styles.css` | `text/css; charset=utf-8` |
| [customer-service-qr.jpg](docs/customer-service-qr.jpg) | `customer-service-qr.jpg` | `image/jpeg` |
| [index.html](docs/index.html) | `index.html` | `text/html; charset=utf-8` |

说明文档、Git 目录、密钥、附件、预览图和备份都不属于发布内容。GitHub Pages 使用的 `.nojekyll` 不需要上传 OSS。

## 2. 首次准备：工具与凭据

部署脚本使用 **PowerShell 5.1 或以上版本、Git、ossutil 2.x**；实际部署验证使用 ossutil **2.4.0**。

从阿里云官方渠道安装 ossutil 2.x，将可执行文件加入 PATH，然后检查：

```powershell
git --version
ossutil version
ossutil config
```

注意命令是 `ossutil version`，不是 `ossutil --version`。

在交互式配置中选择北京区域，按提示设置凭据；已有可用配置则无需再次配置。可以选择独立 profile：

```powershell
ossutil config --profile customer-service
```

- 凭据仅保存在用户目录、受控环境变量或凭据服务中，**不要写进仓库、部署脚本、截图或提交信息**。
- 优先使用最小权限的 RAM 身份或临时凭据，不使用主账号长期密钥。
- 发布与备份需要对上述四个对象的 `oss:GetObject`、`oss:PutObject` 权限；本脚本不要求删除对象的权限。
- 下面的诊断命令还可能需要列举对象、读取 Bucket 网站配置及 CNAME 等额外只读权限；可让管理员代为检查，不必为部署授予整账号管理权限。

只读核对目标（使用独立 profile 时，在命令末尾加 `--profile customer-service`）：

```powershell
ossutil ls oss://yunshufe/ --region cn-beijing --limited-num 20
ossutil api get-bucket-website --bucket yunshufe --region cn-beijing
ossutil api list-cname --bucket yunshufe --region cn-beijing
ossutil stat oss://yunshufe/index.html --region cn-beijing
```

## 3. 日常升级：先预演，再发布

在本仓库根目录执行。先完成修改、检查电脑与手机效果，并提交推送 GitHub；不要在部署过程中同时修改网站文件或运行另一份部署。

```powershell
git status --short --branch
# 只暂存本次需要提交的文件，不要使用 git add . 带入本地附件或凭据。
git add -- docs/index.html docs/styles.css docs/app.js docs/customer-service-qr.jpg
git commit -m "fix: 更新客服网站"
git push origin main

# 默认仅预演：生成本地发布记录，ossutil 使用 --dry-run，不修改云端。
.\scripts\deploy-oss.ps1

# 确认目标与四个文件正确后，再执行真实发布。
.\scripts\deploy-oss.ps1 -Apply
```

如果本次改动已经提交，就跳过重复的 `git add` / `git commit`。每一步成功后再执行下一步；如果系统执行策略限制脚本，请按所在组织的策略授权，不需要永久修改全局执行策略。

使用独立 profile：

```powershell
.\scripts\deploy-oss.ps1 -Profile customer-service
.\scripts\deploy-oss.ps1 -Profile customer-service -Apply
```

[部署脚本](scripts/deploy-oss.ps1)会：

1. 检查四个网站文件均被 Git 跟踪，且相对 `HEAD` 没有未提交修改；记录完整提交 SHA。
2. 创建独立的本地发布目录和文件快照。备份与记录位于已被 [.gitignore](.gitignore) 忽略的目录，不会自动提交。
3. 真实发布前，完整下载四个旧对象，并保存各自的 OSS 元数据；**任一备份失败都会在上传前终止**。
4. 按 **JS → CSS → 二维码 → HTML** 顺序上传，首页最后更新。这个过程不是原子切换，资产更新期间可能短暂混用新旧版本，应避免并行发布。
5. 保留 `Content-Disposition: inline` 及 `Cache-Control: no-cache, max-age=0, must-revalidate`，设置正确的 Content-Type。
6. 为每个对象写入 `release-commit` 和 `source-sha256` 自定义元数据，方便追踪线上版本。
7. 上传后重新下载四个对象，逐一比较 SHA-256；不匹配则报错，不会把校验失败记为发布成功。

每次执行产生一个独立目录：

```text
.deploy-artifacts/<时间>-<提交短SHA>-<随机标识>/
├── manifest.json       # 状态、提交、每个文件的哈希与上传/校验结果
├── before/             # 真实发布前的旧文件与 *.metadata.txt
├── release/            # 本次上传快照
└── verified/           # 发布后重新下载的文件
```

预演不会获取云端备份，也不能证明账号已有上传权限。真实发布会保留失败记录，不自动回滚；请先检查错误及哪些对象已上传，再决定重试还是回滚。**不要清理唯一一份有效备份。**

## 4. 二维码、缓存与域名注意事项

- 更换[二维码图片](docs/customer-service-qr.jpg)时保留扫码静区，不要拉伸或裁掉码点；同步修改[页面](docs/index.html)的图片尺寸，以及展示与下载链接的版本参数。
- 更改样式后也更新[页面](docs/index.html)内的 CSS 版本参数。本次版本示例：

```html
<link rel="stylesheet" href="./styles.css?v=20261010" />
<img src="./customer-service-qr.jpg?v=20261010" width="640" height="640" alt="客服二维码" />
<a href="./customer-service-qr.jpg?v=20261010" download="customer-service-qr.jpg">保存二维码</a>
```

- `no-cache` 允许存储响应，但要求再次使用前向服务器校验；不等于 `no-store`。版本参数和重新验证策略共同减少旧图缓存问题。
- 验收使用正式自定义域名，而不是只检查 OSS 默认域名。若未来接入 CDN/DCDN，还应核对其缓存键、刷新策略和实际响应；脚本不会自动刷新 CDN。
- 本次升级不修改 DNS、CNAME 或 HTTPS 证书。证书续期和域名维护是独立操作。

## 5. 发布验收

脚本验证的是 **OSS 对象内容**；仍需检查正式网站的访问、布局和扫码行为。

```powershell
ossutil stat oss://yunshufe/index.html --region cn-beijing
ossutil stat oss://yunshufe/customer-service-qr.jpg --region cn-beijing
```

核对 `X-Oss-Meta-Release-Commit` 等于本次提交 SHA，`X-Oss-Meta-Source-Sha256` 等于发布记录中的文件哈希。

验证正式域名返回的二维码与本地一致（从仓库根目录执行）：

```powershell
$download = Join-Path $env:TEMP ('customer-service-qr-' + [guid]::NewGuid().ToString('N') + '.jpg')
Invoke-WebRequest -UseBasicParsing `
  -Uri 'https://www.denuoxuankeji.com/customer-service-qr.jpg?v=20261010' `
  -OutFile $download
(Get-FileHash -Algorithm SHA256 $download).Hash -eq `
  (Get-FileHash -Algorithm SHA256 .\docs\customer-service-qr.jpg).Hash
```

应返回 `True`。后续换图时，请使用当次的实际版本参数。发布目录中也保留了上传快照，可以用它代替已被后续修改的工作区文件作比较。

最后在 <https://www.denuoxuankeji.com/> 检查：

- 电脑双栏、手机单栏；二维码不变形、不横向溢出。
- 新图能被识别，实际微信联系目标符合预期；仅识别成功不代表已验证客服账号状态。
- 保存按钮下载的是同一张新图；复制链接与 FAQ 操作正常。
- 浏览器无资源加载错误，页面和资源 HTTPS 正常。

## 6. 失败处理与回滚

### 常见问题

- **AccessDenied**：确认 Bucket、地域、profile、凭据有效期和四个对象的读取/写入权限。不要通过改成公共写入来解决。
- **已有未提交改动**：先审查、提交网站文件，再预演；脚本不会替你提交或丢弃修改。
- **备份失败**：不会开始上传。检查读取权限、网络和目标对象是否存在。
- **上传中断或验证失败**：发布目录中有失败阶段、已上传对象及备份。修复问题后可以重新运行，或按下面的方法回滚。
- **线上仍显示旧版**：检查正式域名、返回的提交元数据、HTML 资源版本参数及浏览器/CDN 缓存，不要盲目反复覆盖。
- **`Author identity unknown`**：用自己的 Git 身份配置本仓库，或用 `git -c user.name=... -c user.email=... commit ...` 临时指定；不要把其他人的身份写死在脚本里。

### 推荐：通过 Git 回滚后重新部署

```powershell
# 将占位符替换为要撤销的网站改动提交；先审查 revert 的内容。
git revert <需要撤销的网站提交SHA>
git push origin main
.\scripts\deploy-oss.ps1
.\scripts\deploy-oss.ps1 -Apply
```

这会生成一个新的可追踪提交，同时把 GitHub Pages 和 OSS 恢复到一致的网站内容。不要使用强制推送覆盖仓库历史；如果需要撤销多个网站提交，应完整审查依赖，避免只恢复页面而漏掉二维码或样式。

### 紧急使用本地备份

如果必须恢复发布前的 OSS 精确字节，使用对应成功备份目录中的 `before/` 文件，而不是新版本的 `release/` 文件：

1. 检查发布记录，确认备份四个文件齐全；逐一用 SHA-256 对照 `backupSha256`。
2. 从各对象的旧元数据记录获取原来的 Content-Type、缓存策略及 `X-Oss-Meta-Release-Commit`。
3. 用 `ossutil cp <备份文件> oss://yunshufe/<固定对象名> --region cn-beijing --force` 逐个恢复，并通过 `--content-type`、`--content-disposition`、`--cache-control`、`--metadata` 显式恢复相应属性；不要把新提交 SHA 标记到旧文件上。
4. 仍按 JS、CSS、图片、HTML 的顺序处理，恢复后重新下载校验并验证正式域名。
5. 随后同步处理 Git 历史中的网站版本，避免下次部署又覆盖成错误版本。不要递归上传备份目录或删除 Bucket 的其他对象。

## 7. 已验证的发布记录

- **2026-10-11 12:22（北京时间）**：将现有 OSS 站点升级到提交 [`318d8c6`](https://github.com/xiaoxiaoshuo/customer-service-qr/commit/318d8c64f405b410acd655306d356299f0d39a21)。
- 仅更新四个网站对象，旧版文件与元数据已在部署机器本地备份；其他下载资源未修改。
- 正式域名四个文件的 SHA-256 与发布源一致，HTTP 200、Content-Type、缓存头及版本元数据均核对通过。
- 390px 手机端和 1440px 电脑端布局、二维码解码、图片下载验证通过。这些是该次部署的测试结果，后续每次升级仍需重新验收。

当前教程与脚本用于复现上述部署流程。后续若要实现“推送 GitHub 自动发布 OSS”，应另行设计带最小权限凭据、人工审批或受保护环境的 CI 发布流程；本次未配置自动化云端凭据。
