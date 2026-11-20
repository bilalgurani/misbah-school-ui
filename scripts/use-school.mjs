// Builds for a specific school: SCHOOL=<name> npm run build
// Replaces public/school/ with schools/<name>/ (config, logo, banner, login background, icon)
// and writes the phone home-screen manifest from the config.
// Without SCHOOL nothing changes and the default school in public/school/ is used.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const name = (process.env.SCHOOL ?? '').trim();
if (!name) process.exit(0);

if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error(`SCHOOL must be lowercase letters, numbers and dashes (got "${name}")`);
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'schools', name);
const target = join(root, 'public', 'school');

if (!existsSync(join(source, 'school.config.json'))) {
  console.error(`schools/${name}/school.config.json not found`);
  process.exit(1);
}

// The real format comes from the file's first bytes, so a wrong extension does not matter.
function imageInfo(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { type: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
    // The size sits in the first "start of frame" marker.
    for (let i = 2; i + 9 < buf.length; ) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'image/jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) ? 2 : 2 + buf.readUInt16BE(i + 2);
    }
    return { type: 'image/jpeg' };
  }
  if (buf.length > 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const kind = buf.toString('latin1', 12, 16);
    if (kind === 'VP8X') {
      return { type: 'image/webp', width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
    if (kind === 'VP8 ') {
      return { type: 'image/webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (kind === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { type: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

const config = JSON.parse(readFileSync(join(source, 'school.config.json'), 'utf8'));
const images = {
  logo: config.logo ?? 'school/logo.jpeg',
  banner: config.banner ?? 'school/banner.jpeg',
  loginBackground: config.loginBackground ?? 'school/login-bg.jpg',
  icon: config.icon ?? 'school/icon.png',
};

// A missing or broken image would silently show another school's, or nothing, so stop the build instead.
const problems = [];
const info = {};
for (const [key, path] of Object.entries(images)) {
  const file = resolve(source, path.replace(/^school\//, ''));
  if (!file.startsWith(source + sep)) {
    problems.push(`${key}: ${path} must be inside the school folder`);
  } else if (!existsSync(file)) {
    problems.push(`${key}: ${path} not found`);
  } else {
    info[key] = imageInfo(readFileSync(file));
    if (!info[key]) problems.push(`${key}: ${path} is not a PNG, JPEG or WebP image`);
  }
}
const icon = info.icon;
if (icon && (!icon.width || icon.width !== icon.height || icon.width < 192)) {
  problems.push(`icon: ${images.icon} must be a square image of at least 192x192`);
}
if (problems.length) {
  console.error(`schools/${name} has problems:\n - ${problems.join('\n - ')}`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

// What a phone uses for "Add to home screen": the school's name and icon.
const manifest = {
  name: config.schoolName ?? name,
  short_name: config.shortName ?? config.schoolName ?? name,
  start_url: '/',
  display: 'standalone',
  theme_color: '#ffffff',
  background_color: '#ffffff',
  icons: [{ src: images.icon.replace(/^school\//, ''), sizes: `${icon.width}x${icon.height}`, type: icon.type }],
};
writeFileSync(join(target, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Using school "${name}" from schools/${name}`);
