# K-Vault API 使用文档

## 基础信息

- **Base URL**: `https://k-vault-6m0.pages.dev`
- **Token**: `kvault_2eTn2gefEnZj_6leoEG270doR4GJ5mszDsluA6n9WdFmukJDMGRbU`

## 随机图片 API

```bash
# 返回图片 URL（默认）
curl "https://k-vault-6m0.pages.dev/api/random-image"

# 返回 JSON 格式
curl "https://k-vault-6m0.pages.dev/api/random-image?type=json"

# 重定向到图片
curl -L "https://k-vault-6m0.pages.dev/api/random-image?type=redirect"

# 只返回指定格式
curl "https://k-vault-6m0.pages.dev/api/random-image?ext=jpg"
curl "https://k-vault-6m0.pages.dev/api/random-image?ext=png"
curl "https://k-vault-6m0.pages.dev/api/random-image?ext=webp>"

# 缓存（N 秒）
curl "https://k-vault-6m0.pages.dev/api/random-image?cache=3600"
```

## 认证

所有 API 请求需要在 Header 中添加 Authorization：

```
Authorization: Bearer <token>
```

## API 列表

### 1. 上传文件

```bash
curl -X POST https://k-vault-6m0.pages.dev/api/v1/upload \
  -H "Authorization: Bearer kvault_2eTn2gefEnZj_6leoEG270doR4GJ5mszDsluA6n9WdFmukJDMGRbU" \
  -F "file=@video.mp4"
```

响应：
```json
{
  "success": true,
  "file": {
    "id": "xxx",
    "name": "video.mp4",
    "size": 123456,
    "storage": "telegram"
  },
  "links": {
    "download": "https://k-vault-6m0.pages.dev/file/xxx",
    "share": "https://k-vault-6m0.pages.dev/s/xxx"
  }
}
```

### 2. 获取文件列表

```bash
curl https://k-vault-6m0.pages.dev/api/v1/files \
  -H "Authorization: Bearer kvault_2eTn2gefEnZj_6leoEG270doR4GJ5mszDsluA6n9WdFmukJDMGRbU"
```

### 3. 获取文件信息

```bash
curl https://k-vault-6m0.pages.dev/api/v1/file/{id}/info \
  -H "Authorization: Bearer kvault_2eTn2gefEnZj_6leoEG270doR4GJ5mszDsluA6n9WdFmukJDMGRbU"
```

### 4. 下载文件

```bash
curl -O https://k-vault-6m0.pages.dev/file/{id}
```

或：

```bash
curl -O "https://k-vault-6m0.pages.dev/file/xxx?inline=1"
```

### 5. 删除文件

```bash
curl -X DELETE https://k-vault-6m0.pages.dev/api/v1/file/{id} \
  -H "Authorization: Bearer kvault_2eTn2gefEnZj_6leoEG270doR4GJ5mszDsluA6n9WdFmukJDMGRbU"
```

### 6. 管理 Tokens（需要登录）

```bash
# 登录
curl -c cookies.txt -X POST https://k-vault-6m0.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Zhoua754124"}'

# 获取 tokens 列表
curl -b cookies.txt https://k-vault-6m0.pages.dev/api/admin/tokens

# 创建新 token
curl -b cookies.txt -X POST https://k-vault-6m0.pages.dev/api/admin/tokens \
  -H "Content-Type: application/json" \
  -d '{"name": "My Token", "scopes": ["upload", "read", "delete"]}'
```

## 分片上传（大文件）

### 1. 初始化

```bash
curl -X POST https://k-vault-6m0.pages.dev/api/chunked-upload/init \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "large.mp4", "fileSize": 104857600}'
```

### 2. 上传分片

```bash
curl -X POST https://k-vault-6m0.pages.dev/api/chunked-upload/chunk \
  -H "Authorization: Bearer <token>" \
  -F "uploadId=xxx" \
  -F "chunkIndex=0" \
  -F "chunk=@part1.mp4"
```

### 3. 完成

```bash
curl -X POST https://k-vault-6m0.pages.dev/api/chunked-upload/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"uploadId": "xxx", "fileName": "large.mp4"}'
```

## 粘贴板（Paste）

### 1. 创建粘贴

```bash
curl -X POST https://k-vault-6m0.pages.dev/api/v1/paste \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello World"}'
```

### 2. 获取粘贴

```bash
curl https://k-vault-6m0.pages.dev/api/v1/paste/{slug}
```

## 错误代码

| Code | 说明 |
|------|------|
| 400 | 请求参数错误 |
| 401 | Token 无效或过期 |
| 403 | 权限不足 |
| 404 | 文件不存在 |
| 413 | 文件太大 |
| 429 | 请求太频繁 |
| 500 | 服务器错误 |