import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadScript(context, relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const source = readFileSync(filePath, "utf8");
  vm.runInContext(source, context, { filename: filePath });
}

function writeName(bytes, offset, name) {
  for (let index = 0; index < 8; index += 1) {
    bytes[offset + index] = index < name.length ? name.charCodeAt(index) : 0;
  }
}

function writeI16(bytes, offset, value) {
  new DataView(bytes.buffer).setInt16(offset, value, true);
}

function createThings() {
  const bytes = new Uint8Array(20);
  writeI16(bytes, 0, 0);
  writeI16(bytes, 2, 0);
  writeI16(bytes, 4, 0);
  writeI16(bytes, 6, 1);
  writeI16(bytes, 8, 7);
  writeI16(bytes, 10, 128);
  writeI16(bytes, 12, 64);
  writeI16(bytes, 14, 90);
  writeI16(bytes, 16, 3001);
  writeI16(bytes, 18, 7);
  return bytes;
}

function createVertexes() {
  const bytes = new Uint8Array(8);
  writeI16(bytes, 0, 64);
  writeI16(bytes, 2, 0);
  writeI16(bytes, 4, 64);
  writeI16(bytes, 6, 64);
  return bytes;
}

function createSidedefs() {
  const bytes = new Uint8Array(30);
  writeName(bytes, 4, "-");
  writeName(bytes, 12, "-");
  writeName(bytes, 20, "DOOR1");
  writeI16(bytes, 28, 0);
  return bytes;
}

function createSectors() {
  const bytes = new Uint8Array(26);
  writeI16(bytes, 0, 0);
  writeI16(bytes, 2, 128);
  writeName(bytes, 4, "FLOOR0");
  writeName(bytes, 12, "CEIL1");
  writeI16(bytes, 20, 96);
  writeI16(bytes, 22, 0);
  writeI16(bytes, 24, 0);
  return bytes;
}

function createLinedefs() {
  const bytes = new Uint8Array(28);
  writeI16(bytes, 0, 0);
  writeI16(bytes, 2, 1);
  writeI16(bytes, 6, 1);
  writeI16(bytes, 10, 0);
  writeI16(bytes, 12, -1);
  writeI16(bytes, 14, 0);
  writeI16(bytes, 16, 1);
  writeI16(bytes, 20, 11);
  writeI16(bytes, 24, 0);
  writeI16(bytes, 26, -1);
  return bytes;
}

function createPlaypal() {
  const bytes = new Uint8Array(768);
  bytes[0] = 3;
  bytes[1] = 2;
  bytes[2] = 1;
  bytes[255 * 3] = 250;
  bytes[255 * 3 + 1] = 251;
  bytes[255 * 3 + 2] = 252;
  return bytes;
}

function createWad() {
  const lumps = [
    { name: "PLAYPAL", bytes: createPlaypal() },
    { name: "E1M1", bytes: new Uint8Array() },
    { name: "THINGS", bytes: createThings() },
    { name: "LINEDEFS", bytes: createLinedefs() },
    { name: "SIDEDEFS", bytes: createSidedefs() },
    { name: "VERTEXES", bytes: createVertexes() },
    { name: "SECTORS", bytes: createSectors() }
  ];
  let dataOffset = 12;
  for (const lump of lumps) {
    lump.offset = dataOffset;
    dataOffset += lump.bytes.length;
  }

  const directoryOffset = dataOffset;
  const bytes = new Uint8Array(directoryOffset + lumps.length * 16);
  const view = new DataView(bytes.buffer);
  bytes[0] = "P".charCodeAt(0);
  bytes[1] = "W".charCodeAt(0);
  bytes[2] = "A".charCodeAt(0);
  bytes[3] = "D".charCodeAt(0);
  view.setInt32(4, lumps.length, true);
  view.setInt32(8, directoryOffset, true);

  for (const lump of lumps) {
    bytes.set(lump.bytes, lump.offset);
  }

  lumps.forEach((lump, index) => {
    const entry = directoryOffset + index * 16;
    view.setInt32(entry, lump.offset, true);
    view.setInt32(entry + 4, lump.bytes.length, true);
    writeName(bytes, entry + 8, lump.name);
  });

  return bytes;
}

const sandbox = {
  self: {},
  console,
  Array,
  DataView,
  Date,
  Map,
  Math,
  Number,
  Object,
  Set,
  String,
  Uint8Array,
  Uint8ClampedArray,
  Uint32Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/doom-wad-metadata.js");

const metadata = context.self.AIKernelDoomWadMetadata;
assert(metadata?.parseMapHints, "WAD metadata module should export parseMapHints");
assert(metadata?.parsePlaypal, "WAD metadata module should export parsePlaypal");
assert(metadata?.defaultPalette, "WAD metadata module should export defaultPalette");
assert(metadata?.buildPaletteCache, "WAD metadata module should export buildPaletteCache");

const wad = createWad();
const directory = metadata.readDirectory(wad);
assert(directory.length === 7, "directory should expose every lump");
assert(directory[0].name === "PLAYPAL", "directory should decode WAD lump names");

const playpal = metadata.parsePlaypal(wad);
assert(playpal.length === 768, "PLAYPAL should return first 256-color palette");
assert(playpal[0] === 3 && playpal[1] === 2 && playpal[2] === 1, "PLAYPAL should preserve RGB bytes");

const defaultPalette = metadata.defaultPalette();
assert(defaultPalette[0] === 0 && defaultPalette[255 * 3] === 255, "default palette should be grayscale");

const paletteCache = metadata.buildPaletteCache(playpal);
assert(paletteCache.rgbaBytes[0] === 3, "palette cache should expose red byte");
assert(paletteCache.rgbaBytes[1] === 2, "palette cache should expose green byte");
assert(paletteCache.rgbaBytes[2] === 1, "palette cache should expose blue byte");
assert(paletteCache.rgbaBytes[3] === 255, "palette cache should force alpha byte");

const hints = metadata.parseMapHints(wad, "E1M1");
assert(hints.map === "E1M1", "map hints should retain map name");
assert(hints.counts.things === 2, "map hints should count things");
assert(hints.counts.linedefs === 2, "map hints should count linedefs");
assert(hints.playerStart.x === 0 && hints.playerStart.y === 0, "map hints should summarize player start");
assert(hints.doorLines === 1, "map hints should count door specials");
assert(hints.switchLines === 1, "map hints should count switch specials");
assert(hints.exitLines === 1, "map hints should count exit specials");
assert(hints.enemyThings.length === 1 && hints.enemyThings[0].type === 3001, "map hints should summarize enemies");
assert(hints.darkSectors.length === 1 && hints.darkSectors[0].lightLevel === 96, "map hints should summarize dark sectors");
assert(hints.firstDoor.texture === "DOOR1", "nearest door should include wall texture");
assert(Math.abs(hints.firstDoor.distance - 71.55) < 0.02, "nearest door should include distance from player start");
assert(hints.doorTextures.includes("DOOR1"), "texture roles should classify door textures");
assert(metadata.parseMapHints(wad, "E1M2") === null, "missing map should return null");

console.log("DOOM_WAD_METADATA_VM_TEST_OK", {
  lumps: directory.length,
  door: hints.firstDoor.texture,
  palette: playpal.length
});
