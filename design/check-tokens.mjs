// Checks design/era-tokens.css: every text colour meets WCAG 2.2 AA (4.5:1) on
// each background of its theme, strong borders meet 3:1, and the dark values
// under prefers-color-scheme match the forced dark theme.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("era-tokens.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `missing block ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--era-([\w-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]),
  );
}

const light = block("[data-era-product]");
const dark = block('[data-era-product][data-era-theme="dark"]');
const darkMedia = block('  [data-era-product]:not([data-era-theme="light"])');
assert.deepEqual(darkMedia, dark, "the media-query dark theme and the forced dark theme differ");

function luminance(hex) {
  const channel = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const texts = ["text", "text-muted", "text-subtle", "mesh", "db", "infra"];
const statuses = ["success", "warning", "danger", "info"];
let checks = 0;

for (const [name, theme] of Object.entries({ light, dark })) {
  const backgrounds = ["bg", "surface", "sunken", "raised"].map((k) => theme[k]);
  const expect = (fg, bg, min, what) => {
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= min, `${name}: ${what} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
    checks += 1;
  };
  for (const key of [...texts, ...statuses]) {
    for (const bg of backgrounds) expect(theme[key], bg, 4.5, `--era-${key} on ${bg}`);
  }
  for (const key of statuses) {
    expect(theme[key], theme[`${key}-soft`], 4.5, `--era-${key} on --era-${key}-soft`);
  }
  for (const key of ["mesh", "db", "infra", "danger"]) {
    expect(theme["accent-ink"], theme[key], 4.5, `--era-accent-ink on --era-${key}`);
  }
  for (const bg of backgrounds)
    expect(theme["border-strong"], bg, 3, `--era-border-strong on ${bg}`);
}

console.log(`era-tokens.css: ${checks} contrast checks passed`);
