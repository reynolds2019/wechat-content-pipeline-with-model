const fs = require('fs');
const path = require('path');
const { simple } = require('./simple');
const { business } = require('./business');
const { tech } = require('./tech');

const themes = { simple, business, tech };
const customThemes = {};

function loadCustomTheme(filePath) {
  const absPath = path.resolve(filePath);
  const raw = fs.readFileSync(absPath, 'utf-8');
  const data = JSON.parse(raw);
  const name = data.name || path.basename(filePath, '.json');
  const merged = {
    name,
    label: data.label || name,
    base: { ...simple.base, ...(data.base || {}) },
    elements: { ...simple.elements, ...(data.elements || {}) },
    codeTheme: { ...(simple.codeTheme || {}), ...(data.codeTheme || {}) },
  };
  customThemes[name] = merged;
  return merged;
}

function getTheme(name) {
  return customThemes[name] || themes[name] || themes.simple;
}

function listThemes() {
  const builtIn = Object.values(themes).map(t => `${t.name} - ${t.label}`);
  const custom = Object.values(customThemes).map(t => `${t.name} - ${t.label} (custom)`);
  return [...builtIn, ...custom];
}

module.exports = { themes, getTheme, listThemes, loadCustomTheme };
