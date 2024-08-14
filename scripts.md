# scrips

## 构建基础镜像

docker build -t firecrawl:api-base -f ./apps/api/Dockerfile.base .
docker build -t firecrawl:playwright-service-base -f ./apps/playwright-service/Dockerfile.base .

## 打包

docker compose build

## 运行

docker compose up -d

## 推送到 ty hub
