# 天气行政区划 CSV 导入说明

本文档说明如何将百度天气行政区划映射文件 `weather_district_id.csv` 导入数据库表 `weather_districts`，用于中文地名查询天气时自动映射 `district_id`。

## 1. 适用场景

- 新环境首次部署，需要启用“中文地区名查天气”
- 百度更新了区划映射数据，需要覆盖更新

## 2. 准备条件

- 已配置数据库连接 `DATABASE_URL`
- 已执行基础建表（`src/db/schema.sql`）
- 项目内已有导入脚本：`scripts/import-weather-districts.mjs`

## 3. 下载 CSV

```bash
mkdir -p data
curl -L "https://mapopen-website-wiki.bj.bcebos.com/cityList/weather_district_id.csv" -o data/weather_district_id.csv
```

## 4. 执行导入

使用默认路径导入：

```bash
npm run import:weather-districts
```

指定自定义路径导入：

```bash
node scripts/import-weather-districts.mjs /absolute/path/weather_district_id.csv
```

说明：

- 导入为 upsert（重复执行会更新，不会重复插入）
- 脚本会自动创建 `weather_districts` 表及索引（若不存在）

## 5. 导入后验证

```sql
SELECT COUNT(*) FROM weather_districts;

SELECT district_id, province, city, district
FROM weather_districts
WHERE district IN ('英德', '英德市');
```

预期示例：英德对应 `district_id = 441881`。

## 6. 是否需要长期保留 CSV 文件

不需要。

- CSV 仅在导入时使用
- 导入成功后，查询走数据库 `weather_districts`
- 可以删除本地 CSV，后续若有新版本再重新下载并导入

## 7. Docker 部署提示

如果你在服务器上通过 Docker Compose 运行，推荐在宿主机项目目录执行导入命令：

```bash
npm run import:weather-districts
```

只要 `DATABASE_URL` 指向部署环境数据库即可，不要求容器内保留 CSV。
