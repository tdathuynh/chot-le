// Chụp HTML thành PNG bằng Microsoft Edge headless. File tạm nằm trong branding/.tmp
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

export const ROOT = 'D:/AI_appreview/branding';
export const TMP = ROOT + '/.tmp';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

let n = 0;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=block" rel="stylesheet">';

export function page(body, { bg = '#FAF6F0', extraCss = '' } = {}) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">${FONT_LINK}<style>*{box-sizing:border-box;margin:0;padding:0}html,body{background:${bg};font-family:'Be Vietnam Pro',sans-serif;overflow:hidden}${extraCss}</style></head><body>${body}</body></html>`;
}

const baseArgs = () => ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--user-data-dir=${TMP}/edge-profile`];

export function render(html, out, w, h) {
  fs.mkdirSync(TMP, { recursive: true });
  const file = `${TMP}/page${n++}.html`;
  fs.writeFileSync(file, html);
  if (fs.existsSync(out)) fs.rmSync(out);
  spawnSync(EDGE, [...baseArgs(), '--virtual-time-budget=6000', `--window-size=${w},${h}`, `--screenshot=${out}`, 'file:///' + file], {
    timeout: 90000,
    stdio: 'ignore',
  });
  for (let i = 0; i < 100 && !fs.existsSync(out); i++) sleep(300);
  if (!fs.existsSync(out)) throw new Error('Không render được ' + out);
  sleep(200);
  return out;
}
