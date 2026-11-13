#!/usr/bin/env node
/**
 * Abort installs under package managers other than npm.
 * Used as the "preinstall" script; runs before anything else.
 */
const ua = process.env.npm_config_user_agent || '';
if (!/^npm\//.test(ua)) {
  const other = ua.split('/')[0] || 'an unsupported package manager';
  console.error(`\nThis repo installs with npm only (package-lock.json). You used ${other}.\nRun \`npm ci\` or \`npm install\` instead.\n`);
  process.exit(1);
}
