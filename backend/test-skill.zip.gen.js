#!/usr/bin/env node
/**
 * 生成测试用 ZIP（含 SKILL.md），用于手动验证 POST /solutions/upload
 * 运行：node test-skill.zip.gen.js
 * 输出：test-skill.zip
 */
const AdmZip = require('adm-zip');
const fs = require('fs');

const zip = new AdmZip();
const skillContent = `---
name: 测试上传技能
description: 用于验证方案上传接口的测试技能
---

这是技能正文，供 Agent 理解与执行。`;

zip.addFile('SKILL.md', Buffer.from(skillContent, 'utf-8'));
zip.writeZip('test-skill.zip');
console.log('Created test-skill.zip');
