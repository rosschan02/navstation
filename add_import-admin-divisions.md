# 四级行政区 Excel 导入说明（本地数据库）

本文档说明如何把百度行政区 Excel 数据导入到本项目 PostgreSQL，支持：

- 按“XX镇 / XX街道”模糊搜索
- 详情页查看上级区域
- 根据父级代码查询下级区域（可继续点选）

## 1. 数据文件

已下载文件：

- `data/admin_code_251218.xlsx`

下载地址：

- `https://mapopen-pub-webserviceapi.cdn.bcebos.com/geocoding/admin_code_251218.xlsx`

## 2. Excel 转换为 CSV

```bash
npx -y xlsx-cli -o data/admin_code_251218.csv data/admin_code_251218.xlsx
awk -F',' 'BEGIN{OFS=","} NR==1{sub(/^\xef\xbb\xbf/,"",$1)} NF>=12{print $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12}' data/admin_code_251218.csv > data/admin_code_251218.clean.csv
```

转换后的文件：

- `data/admin_code_251218.clean.csv`

## 3. 执行建表迁移

执行迁移文件：

- `src/db/migrations/011_add_admin_divisions.sql`

示例：

```bash
psql "$DATABASE_URL" -f src/db/migrations/011_add_admin_divisions.sql
```

## 4. 执行数据合并（Upsert）

执行：

```bash
psql "$DATABASE_URL" -f scripts/import-admin-divisions.sql
```

说明：

- `scripts/import-admin-divisions.sql` 会先清空 `admin_divisions_import`，再通过 `\copy` 导入 CSV。
- 主表 `admin_divisions` 使用 `ON CONFLICT (code) DO UPDATE`，可重复执行，不会重复插入。
- 脚本会同步刷新 `has_children` 和 `full_name_zh/full_name_en`。

## 5. 查询示例（用于接口）

搜索“XX镇/XX街道”：

```sql
SELECT code, name_zh, full_name_zh, parent_code
FROM admin_divisions
WHERE level = 4
  AND name_zh ILIKE '%' || '合作路' || '%'
ORDER BY char_length(name_zh), code
LIMIT 50;
```

看详情（含上级链路）：

```sql
WITH RECURSIVE chain AS (
  SELECT level, code, parent_level, parent_code, name_zh, full_name_zh
  FROM admin_divisions
  WHERE level = 4 AND code = '130105007'
  UNION ALL
  SELECT p.level, p.code, p.parent_level, p.parent_code, p.name_zh, p.full_name_zh
  FROM admin_divisions p
  JOIN chain c ON c.parent_level = p.level AND c.parent_code = p.code
)
SELECT * FROM chain ORDER BY level;
```

查下级是否可选：

```sql
SELECT level, code, name_zh, has_children
FROM admin_divisions
WHERE parent_level = 3
  AND parent_code = '130105'
ORDER BY level, code;
```
