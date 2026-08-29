# 部署到 Cloud Run（GitHub Actions + Workload Identity Federation）

## 0. 准备
- 本机安装 gcloud CLI：https://cloud.google.com/sdk/docs/install
- `gcloud auth login` 登录你的 Google 账号
- 已安装 Docker（Actions 里用的是 GitHub 提供的 runner，本机 Docker 只是方便你自己先测试）

## 1. 设置变量（改成你自己的值）
```bash
export PROJECT_ID="fastapi-user-crud-demo-$RANDOM"   # project ID 全局唯一，可用这种方式避免撞名
export REGION="us-central1"
export REPO_NAME="fastapi-user-crud"        # Artifact Registry 仓库名
export SERVICE_NAME="fastapi-user-crud"     # Cloud Run 服务名
export GITHUB_USER="你的GitHub用户名"
export GITHUB_REPO="fastapi_user_crud"      # 你在 GitHub 上建的仓库名
export SA_NAME="github-actions-deployer"
```

## 2. 创建 GCP 项目并关联 billing
```bash
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID
```
Billing 只能在网页上手动关联一次（需要选支付方式）：
打开 https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID

## 3. 启用需要的 API
```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  iam.googleapis.com
```

## 4. 创建 Artifact Registry（存 Docker 镜像）
```bash
gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REGION
```

## 5. 创建给 GitHub Actions 用的服务账号
```bash
gcloud iam service-accounts create $SA_NAME \
  --display-name="GitHub Actions Deployer"

export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/iam.serviceAccountUser"
```

## 6. 创建 Workload Identity Pool + Provider（这是 WIF 的核心，免密钥）
```bash
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_USER}/${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

## 7. 把 Provider 和服务账号绑定，只信任你这个仓库
```bash
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_USER}/${GITHUB_REPO}"
```

## 8. 拿到要填进 GitHub Secrets 的值
```bash
# WIF_PROVIDER 的值：
gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" --workload-identity-pool="github-pool" \
  --format="value(name)"

# WIF_SERVICE_ACCOUNT 的值：
echo $SA_EMAIL
```

## 9. 在 GitHub 仓库里添加 Secrets
仓库 → Settings → Secrets and variables → Actions → New repository secret：
- `WIF_PROVIDER` = 上一步第一条命令的输出
- `WIF_SERVICE_ACCOUNT` = 上一步第二条命令的输出（service account 邮箱）

## 10. 改 workflow 里的 PROJECT_ID
打开 `.github/workflows/deploy-cloud-run.yml`，把
```yaml
PROJECT_ID: your-gcp-project-id
```
改成你实际的 `$PROJECT_ID`。

## 11. 建 GitHub 仓库并推送
```bash
# 在 github.com 上手动新建一个空仓库，名字和 $GITHUB_REPO 一致，然后：
git remote add origin https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git
git push -u origin main
```
push 到 main 之后，去仓库的 Actions 标签页就能看到 workflow 自动跑起来了。跑完在日志最后一步能看到部署后的 Cloud Run URL。
