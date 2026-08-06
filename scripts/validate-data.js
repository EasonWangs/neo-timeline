const fs = require("node:fs");
const path = require("node:path");
const JSON5 = require("json5");

const dataDir = path.join(__dirname, "..", "data");
const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".json5")).sort();
let errorCount = 0;

function report(file, message) {
  errorCount += 1;
  console.error(`${file}: ${message}`);
}

for (const file of files) {
  let data;
  try {
    data = JSON5.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  } catch (error) {
    report(file, `JSON5 解析失败：${error.message}`);
    continue;
  }

  if (!Array.isArray(data.roles)) {
    report(file, "roles 必须存在且为数组");
    continue;
  }

  const ids = new Set();
  const references = [];
  const groups = new Set();
  for (const role of data.roles) {
    if (role.groups != null && !Array.isArray(role.groups)) report(file, `${role.name || "未命名角色"} 的 groups 必须为数组`);
    for (const group of role.groups || []) groups.add(group);
    if (role.keypoints != null && !Array.isArray(role.keypoints)) {
      report(file, `${role.name || "未命名角色"} 的 keypoints 必须为数组`);
      continue;
    }
    for (const point of role.keypoints || []) {
      if (point.id) {
        if (ids.has(point.id)) report(file, `关键点 id 重复：${point.id}`);
        ids.add(point.id);
      }
      if (point.to) {
        if (!point.id) report(file, `${role.name || "未命名角色"} 中带 to 的关键点缺少 id`);
        references.push(point.to);
      }
    }
  }

  for (const target of references) if (!ids.has(target)) report(file, `to 引用了不存在的关键点：${target}`);
  const colors = data.config && data.config.g && data.config.g.colors || {};
  for (const group of groups) {
    if (!Object.prototype.hasOwnProperty.call(colors, group)) report(file, `分组缺少颜色配置：${group}`);
  }
}

if (errorCount) {
  console.error(`数据校验失败，共 ${errorCount} 个问题`);
  process.exit(1);
}
console.log(`数据校验通过：${files.length} 个 JSON5 文件`);
