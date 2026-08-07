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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validatePositiveNumber(file, value, pathLabel) {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
    report(file, `${pathLabel} 必须为正数`);
  }
}

function parseRangeValue(value) {
  if (Number.isFinite(value)) return value;
  if (typeof value !== "string") return NaN;

  const normalized = value.trim();
  if (!normalized || normalized === "~") return null;
  const parts = normalized.replace(/^~/, "").split("/");
  if (!parts.every((part) => /^-?\d+$/.test(part))) return NaN;

  const year = Number(parts[0]);
  const month = parts.length > 1 ? Number(parts[1]) : 1;
  const day = parts.length > 2 ? Number(parts[2]) : 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) return NaN;
  return year + (month - 1) / 12 + (day - 1) / (12 * 31);
}

function validateRange(file, item, type, index) {
  if (item.start == null || item.end == null) return;
  const label = item.name || `${type} #${index + 1}`;
  const start = parseRangeValue(item.start);
  const end = parseRangeValue(item.end);
  if (start == null || end == null) return;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    report(file, `${type}“${label}”的 start/end 格式无效`);
    return;
  }
  if (end < start) {
    report(file, `${type}“${label}”的 end (${item.end}) 不能早于 start (${item.start})`);
  }
}

for (const file of files) {
  let data;
  try {
    data = JSON5.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  } catch (error) {
    report(file, `JSON5 解析失败：${error.message}`);
    continue;
  }

  const config = data.config || {};
  if (Object.prototype.hasOwnProperty.call(config, "zoom")) {
    report(file, "请使用 config.axes.time.px，不再使用 config.zoom");
  }
  if (Object.prototype.hasOwnProperty.call(config, "o")) {
    report(file, "请使用 config.axes.time.major/minor，不再使用 config.o");
  }
  if (config.axes !== undefined && !isPlainObject(config.axes)) {
    report(file, "config.axes 必须为对象");
  } else if (config.axes) {
    if (config.axes.time !== undefined && !isPlainObject(config.axes.time)) {
      report(file, "config.axes.time 必须为对象");
    } else if (config.axes.time) {
      validatePositiveNumber(file, config.axes.time.px, "config.axes.time.px");
      validatePositiveNumber(file, config.axes.time.major, "config.axes.time.major");
      validatePositiveNumber(file, config.axes.time.minor, "config.axes.time.minor");
    }
    if (config.axes.cross !== undefined && !isPlainObject(config.axes.cross)) {
      report(file, "config.axes.cross 必须为对象");
    }
  }

  if (data.periods != null && !Array.isArray(data.periods)) {
    report(file, "periods 必须为数组");
  } else {
    for (const [index, period] of (data.periods || []).entries()) {
      validateRange(file, period, "时期", index);
    }
  }

  if (!Array.isArray(data.roles)) {
    report(file, "roles 必须存在且为数组");
    continue;
  }

  const ids = new Set();
  const references = [];
  const groups = new Set();
  for (const [index, role] of data.roles.entries()) {
    validateRange(file, role, "角色", index);
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
