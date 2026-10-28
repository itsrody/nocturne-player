import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const SOURCE_DIR = 'src';
const MANIFEST_PATH = 'src/manifest.json';
const SCANNED_EXTENSIONS = ['.js', '.mjs', '.html', '.css'];

// Nothing in this extension may reach the network, read device sensors,
// or touch a request on its way past. Three exceptions, each declared by
// its own file and each earned narrow: the eye at the bus observes and
// it never answers — webRequest sits in the manifest with
// webRequestBlocking beside it, and no handler of the eye’s ever
// returns a BlockingResponse, so the wire itself is never spoken to —
// and the proxy room holds one response at the door, a segment whose
// address a read manifest seals, and writes the plaintext past.
//
// One file may declare its own narrow allowance at the top of itself,
// in a line the scan reads from the file’s own words: the cipher room
// fetches a manifest, a key and the segments of a stream the viewer’s
// page was already visiting — the same origins, and nowhere else; the
// proxy room holds a sealed response at the door and no other. A
// third mouth is earned the same narrow way: the bearer room answers
// an outgoing ask with the words the page itself said at the stream’s
// manifest ask — credentials and `x-` names only — and only for an
// address the ledger seals. The keeper adds the fourth, answered at
// the door it stands on: a manifest-shaped ask whose frame pinned a
// rung is killed at its own beat and replaced with the house’s reworded
// answer — never a segment, never an unpinned stream, and the door
// kills nothing it cannot replace. The origin’s own bytes pass it by,
// unchanged and unobserved, wherever the pin does not stand. The
// declaration is the file’s own, so the scan never widens by itself;
// every other verb in the list below is forbidden in every file, the
// declared ones included.
const FORBIDDEN_PATTERNS = [
  {
    id: 'fetch',
    pattern: /\bfetch\s*\(/,
    reason: 'network request',
  },
  {
    id: 'xmlhttprequest',
    pattern: /\bXMLHttpRequest\b/,
    reason: 'network request',
  },
  {
    id: 'filterresponse',
    pattern: /\bfilterResponseData\s*\(/,
    reason: 'rewrites a response in flight',
  },
  {
    id: 'bearer',
    pattern: /\{\s*requestHeaders/,
    reason: 'answers an outgoing request with rewritten headers',
  },
  { pattern: /\bsendBeacon\b/, reason: 'telemetry beacon' },
  {
    id: 'websocket',
    pattern: /\bWebSocket\b/,
    reason: 'network connection',
  },
  {
    id: 'eventsource',
    pattern: /\bEventSource\b/,
    reason: 'network connection',
  },
  {
    id: 'importscripts',
    pattern: /\bimportScripts\b/,
    reason: 'remote code',
  },
  {
    id: 'eval',
    pattern: /\beval\s*\(/,
    reason: 'dynamic code execution',
  },
  {
    id: 'newfunction',
    pattern: /new\s+Function\s*\(/,
    reason: 'dynamic code execution',
  },
  {
    id: 'storagesync',
    pattern: /\bstorage\.sync\b/,
    reason: 'account-synced storage',
  },
  {
    id: 'geolocation',
    pattern: /\bnavigator\.geolocation\b/,
    reason: 'device sensor',
  },
  {
    id: 'mediadevices',
    pattern: /\bnavigator\.mediaDevices\b/,
    reason: 'device sensor',
  },
  {
    id: 'connection',
    pattern: /\bnavigator\.connection\b/,
    reason: 'device fingerprinting',
  },
  {
    id: 'cookie',
    pattern: /\bdocument\.cookie\b/,
    reason: 'cookie access',
  },
  {
    id: 'analytics',
    pattern: /\b(gtag|mixpanel|amplitude|posthog)\b/,
    reason: 'analytics',
  },
  {
    id: 'analyticsword',
    pattern: /\b(telemetry|analytics)\s*[:=(]/i,
    reason: 'analytics',
  },
  // www.w3.org is the XML namespace identifier for SVG, never a request.
  {
    id: 'remoteurl',
    pattern: /https?:\/\/(?!github\.com\/|www\.w3\.org\/)/,
    reason: 'remote URL',
  },
];

// The verbs the manifest is allowed to ask for. <all_urls> is a host
// entry, not an API: it rides in `permissions` so the eye’s URL filter is
// matched without host gating, the same room the content script’s
// <all_urls> match already books.
const ALLOWED_PERMISSIONS = [
  'storage',
  'activeTab',
  'webRequest',
  'webRequestBlocking',
  '<all_urls>',
];

const collectFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFiles(path);
      files.push(...nested);
    } else if (SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(path);
    }
  }
  return files;
};

const scanFile = async (path) => {
  const content = await readFile(path, 'utf8');
  const lines = content.split('\n');
  // The file’s own declared allowances, read from its own words — a line
  // the scan never writes for it, and a name the scan alone never
  // wildcards: the declaration names one verb, whole.
  const allowances = new Set();
  for (const match of content.matchAll(
    /nocturne-privacy-allowance:\s*(\S+)/g,
  )) {
    allowances.add(match[1]);
  }
  const violations = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    for (const rule of FORBIDDEN_PATTERNS) {
      if (allowances.has(rule.id)) continue;
      if (rule.pattern.test(line)) {
        violations.push({
          file: relative('.', path),
          line: index + 1,
          reason: rule.reason,
          text: line.trim(),
        });
      }
    }
  }
  return violations;
};

const checkManifest = async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const violations = [];
  const permissions = manifest.permissions ?? [];
  for (const permission of permissions) {
    if (!ALLOWED_PERMISSIONS.includes(permission)) {
      violations.push({
        file: MANIFEST_PATH,
        line: 0,
        reason: 'permission outside the allowlist',
        text: permission,
      });
    }
  }
  const hostPermissions = manifest.host_permissions ?? [];
  for (const host of hostPermissions) {
    violations.push({
      file: MANIFEST_PATH,
      line: 0,
      reason: 'host permission grants network access',
      text: host,
    });
  }
  return violations;
};

const run = async () => {
  const files = await collectFiles(SOURCE_DIR);
  const results = await Promise.all(files.map(scanFile));
  const violations = results.flat().concat(await checkManifest());

  if (violations.length > 0) {
    console.error('Privacy check failed:\n');
    for (const violation of violations) {
      const place = `${violation.file}:${violation.line}`;
      console.error(`  ${place}  ${violation.reason}\n    ${violation.text}`);
    }
    console.error(`\n${violations.length} violation(s).`);
    process.exit(1);
  }

  console.log(`Privacy check passed: ${files.length} files clean.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
