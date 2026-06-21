(function () {
  "use strict";

  const DOOR_SPECIALS = new Set([1, 26, 27, 28, 31, 32, 33, 34, 46, 61, 63, 86, 90, 103, 106, 108, 109, 117, 118]);
  const SWITCH_SPECIALS = new Set([7, 9, 11, 14, 15, 18, 20, 21, 23, 29, 41, 42, 43, 45, 49, 50, 51, 55, 71, 101, 102, 103, 111, 112, 113, 114, 115, 116, 122, 123]);
  const EXIT_SPECIALS = new Set([11, 51, 52, 124]);
  const ENEMY_THING_TYPES = new Set([9, 16, 58, 3001, 3002, 3003, 3004, 3005, 3006]);

  function parseMapHints(wadBytes, mapName) {
    const directory = readDirectory(wadBytes);
    if (!directory?.length) {
      return null;
    }

    const mapIndex = directory.findIndex(entry => entry.name === mapName);
    if (mapIndex < 0) {
      return null;
    }

    const lumps = new Map();
    for (let index = mapIndex + 1; index < directory.length; index += 1) {
      const entry = directory[index];
      if (/^E\dM\d$/.test(entry.name) || /^MAP\d\d$/.test(entry.name)) {
        break;
      }

      lumps.set(entry.name, entry);
    }

    const linedefs = parseLinedefs(wadBytes, lumps.get("LINEDEFS"));
    const vertexes = parseVertexes(wadBytes, lumps.get("VERTEXES"));
    const sidedefs = parseSidedefs(wadBytes, lumps.get("SIDEDEFS"));
    const sectors = parseSectors(wadBytes, lumps.get("SECTORS"));
    const things = parseThings(wadBytes, lumps.get("THINGS"));
    const textureRoles = buildTextureRoles(linedefs, sidedefs, sectors);
    const doorLines = linedefs.filter(line => isDoorSpecial(line.special));
    const switchLines = linedefs.filter(line => isSwitchSpecial(line.special));
    const exitLines = linedefs.filter(line => isExitSpecial(line.special));
    const playerStart = summarizePlayerStart(things);

    return {
      map: mapName,
      source: "DOOM1.WAD static lump analysis",
      lumps: Array.from(lumps.keys()),
      counts: {
        things: things.length,
        linedefs: linedefs.length,
        vertexes: vertexes.length,
        sidedefs: sidedefs.length,
        sectors: sectors.length
      },
      playerStart,
      firstDoor: summarizeNearestDoor(doorLines, sidedefs, vertexes, playerStart),
      darkSectors: summarizeDarkSectors(sectors),
      enemyThings: summarizeEnemyThings(things),
      doorLines: doorLines.length,
      switchLines: switchLines.length,
      exitLines: exitLines.length,
      doorSpecials: summarizeSpecials(doorLines),
      switchSpecials: summarizeSpecials(switchLines),
      exitSpecials: summarizeSpecials(exitLines),
      thingTypes: summarizeThings(things),
      textureRoles,
      doorTextures: textureRoles.filter(role => role.role === "door").map(role => role.texture),
      switchTextures: textureRoles.filter(role => role.role === "switch").map(role => role.texture),
      generatedAt: new Date().toISOString()
    };
  }

  function readDirectory(wadBytes) {
    if (wadBytes.length < 12) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset, wadBytes.byteLength);
    const lumpCount = view.getInt32(4, true);
    const directoryOffset = view.getInt32(8, true);
    if (lumpCount <= 0 || directoryOffset <= 0 || directoryOffset + lumpCount * 16 > wadBytes.length) {
      return [];
    }

    const directory = [];
    for (let index = 0; index < lumpCount; index += 1) {
      const entry = directoryOffset + index * 16;
      directory.push({
        name: readWadName(wadBytes, entry + 8),
        offset: view.getInt32(entry, true),
        size: view.getInt32(entry + 4, true)
      });
    }

    return directory;
  }

  function parseLinedefs(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 14)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const lines = [];
    for (let offset = 0; offset + 14 <= lump.size; offset += 14) {
      lines.push({
        startVertex: view.getInt16(offset, true),
        endVertex: view.getInt16(offset + 2, true),
        flags: view.getInt16(offset + 4, true),
        special: view.getInt16(offset + 6, true),
        tag: view.getInt16(offset + 8, true),
        rightSidedef: view.getInt16(offset + 10, true),
        leftSidedef: view.getInt16(offset + 12, true)
      });
    }

    return lines;
  }

  function parseVertexes(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 4)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const vertexes = [];
    for (let offset = 0; offset + 4 <= lump.size; offset += 4) {
      vertexes.push({
        x: view.getInt16(offset, true),
        y: view.getInt16(offset + 2, true)
      });
    }

    return vertexes;
  }

  function parseSidedefs(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 30)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const sides = [];
    for (let offset = 0; offset + 30 <= lump.size; offset += 30) {
      sides.push({
        xOffset: view.getInt16(offset, true),
        yOffset: view.getInt16(offset + 2, true),
        upper: readWadName(wadBytes, lump.offset + offset + 4),
        lower: readWadName(wadBytes, lump.offset + offset + 12),
        middle: readWadName(wadBytes, lump.offset + offset + 20),
        sector: view.getInt16(offset + 28, true)
      });
    }

    return sides;
  }

  function parseSectors(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 26)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const sectors = [];
    for (let offset = 0; offset + 26 <= lump.size; offset += 26) {
      sectors.push({
        floorHeight: view.getInt16(offset, true),
        ceilingHeight: view.getInt16(offset + 2, true),
        floorTexture: readWadName(wadBytes, lump.offset + offset + 4),
        ceilingTexture: readWadName(wadBytes, lump.offset + offset + 12),
        lightLevel: view.getInt16(offset + 20, true),
        special: view.getInt16(offset + 22, true),
        tag: view.getInt16(offset + 24, true)
      });
    }

    return sectors;
  }

  function parseThings(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 10)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const things = [];
    for (let offset = 0; offset + 10 <= lump.size; offset += 10) {
      things.push({
        x: view.getInt16(offset, true),
        y: view.getInt16(offset + 2, true),
        angle: view.getInt16(offset + 4, true),
        type: view.getInt16(offset + 6, true),
        flags: view.getInt16(offset + 8, true)
      });
    }

    return things;
  }

  function buildTextureRoles(linedefs, sidedefs, sectors) {
    const roleByTexture = new Map();
    const remember = (texture, role, weight) => {
      if (!texture || texture === "-") {
        return;
      }

      const current = roleByTexture.get(texture) || { texture, role, door: 0, switch: 0, exit: 0, wall: 0, sector: 0 };
      current[role] += weight;
      if (current.door >= current.switch && current.door >= current.exit && current.door >= current.wall) {
        current.role = "door";
      } else if (current.switch >= current.exit && current.switch >= current.wall) {
        current.role = "switch";
      } else if (current.exit >= current.wall) {
        current.role = "exit";
      } else {
        current.role = "wall";
      }
      roleByTexture.set(texture, current);
    };

    for (const line of linedefs) {
      const role = isDoorSpecial(line.special)
        ? "door"
        : (isSwitchSpecial(line.special) ? "switch" : (isExitSpecial(line.special) ? "exit" : "wall"));
      const weight = role === "wall" ? 1 : 8;
      for (const sideIndex of [line.rightSidedef, line.leftSidedef]) {
        if (sideIndex < 0 || sideIndex >= sidedefs.length) {
          continue;
        }

        const side = sidedefs[sideIndex];
        remember(side.upper, role, weight);
        remember(side.lower, role, weight);
        remember(side.middle, role, weight);
      }
    }

    for (const sector of sectors) {
      remember(sector.floorTexture, "sector", 1);
      remember(sector.ceilingTexture, "sector", 1);
    }

    return Array.from(roleByTexture.values())
      .sort((left, right) => roleRank(left.role) - roleRank(right.role) || right.door + right.switch + right.exit - (left.door + left.switch + left.exit))
      .slice(0, 96);
  }

  function parsePlaypal(wadBytes) {
    const directory = readDirectory(wadBytes);
    for (const entry of directory) {
      if (entry.name === "PLAYPAL" && entry.size >= 768 && entry.offset + 768 <= wadBytes.length) {
        return wadBytes.slice(entry.offset, entry.offset + 768);
      }
    }

    return null;
  }

  function defaultPalette() {
    const palette = new Uint8Array(256 * 3);
    for (let index = 0; index < 256; index += 1) {
      palette[index * 3] = index;
      palette[index * 3 + 1] = index;
      palette[index * 3 + 2] = index;
    }
    return palette;
  }

  function buildPaletteCache(palette) {
    const rgba32 = new Uint32Array(256);
    const rgbaBytes = new Uint8ClampedArray(256 * 4);

    for (let index = 0; index < 256; index += 1) {
      const source = index * 3;
      const target = index * 4;
      const red = palette[source] || 0;
      const green = palette[source + 1] || 0;
      const blue = palette[source + 2] || 0;

      rgbaBytes[target] = red;
      rgbaBytes[target + 1] = green;
      rgbaBytes[target + 2] = blue;
      rgbaBytes[target + 3] = 255;
      rgba32[index] = 0xff000000 | (blue << 16) | (green << 8) | red;
    }

    return { rgba32, rgbaBytes };
  }

  function isValidLump(wadBytes, lump, recordSize) {
    return Boolean(lump)
      && lump.size >= recordSize
      && lump.offset >= 0
      && lump.offset + lump.size <= wadBytes.length;
  }

  function isDoorSpecial(special) {
    return DOOR_SPECIALS.has(Number(special));
  }

  function isSwitchSpecial(special) {
    return SWITCH_SPECIALS.has(Number(special));
  }

  function isExitSpecial(special) {
    return EXIT_SPECIALS.has(Number(special));
  }

  function summarizeSpecials(lines) {
    const counts = new Map();
    for (const line of lines) {
      counts.set(line.special, (counts.get(line.special) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([special, count]) => ({ special: Number(special), count }));
  }

  function summarizeThings(things) {
    const counts = new Map();
    for (const thing of things) {
      counts.set(thing.type, (counts.get(thing.type) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([type, count]) => ({ type: Number(type), count }));
  }

  function summarizeDarkSectors(sectors) {
    return sectors
      .map((sector, index) => ({
        id: index,
        lightLevel: sector.lightLevel,
        floorTexture: sector.floorTexture,
        ceilingTexture: sector.ceilingTexture
      }))
      .filter(sector => sector.lightLevel <= 128)
      .sort((left, right) => left.lightLevel - right.lightLevel)
      .slice(0, 16);
  }

  function summarizeEnemyThings(things) {
    return things
      .filter(thing => ENEMY_THING_TYPES.has(Number(thing.type)))
      .map(thing => ({
        x: thing.x,
        y: thing.y,
        angle: thing.angle,
        type: thing.type,
        flags: thing.flags
      }))
      .slice(0, 64);
  }

  function summarizePlayerStart(things) {
    const start = things.find(thing => thing.type === 1);
    return start ? {
      x: start.x,
      y: start.y,
      angle: start.angle
    } : null;
  }

  function summarizeNearestDoor(doorLines, sidedefs, vertexes, playerStart) {
    if (!playerStart || !doorLines.length || !vertexes.length) {
      return null;
    }

    let best = null;
    for (const line of doorLines) {
      const start = vertexes[line.startVertex];
      const end = vertexes[line.endVertex];
      if (!start || !end) {
        continue;
      }

      const centerX = (start.x + end.x) / 2;
      const centerY = (start.y + end.y) / 2;
      const distance = Math.hypot(centerX - playerStart.x, centerY - playerStart.y);
      const angle = normalizeDegrees(Math.atan2(centerY - playerStart.y, centerX - playerStart.x) * 180 / Math.PI);
      const relativeAngle = normalizeSignedDegrees(angle - Number(playerStart.angle || 0));
      const side = sidedefs[line.rightSidedef] || null;
      const candidate = {
        distance: round2(distance),
        angle: round2(angle),
        relativeAngle: round2(relativeAngle),
        special: line.special,
        tag: line.tag,
        texture: side?.middle || "",
        center: { x: round2(centerX), y: round2(centerY) }
      };
      if (!best || candidate.distance < best.distance) {
        best = candidate;
      }
    }

    return best;
  }

  function normalizeDegrees(value) {
    return ((Number(value || 0) % 360) + 360) % 360;
  }

  function normalizeSignedDegrees(value) {
    return ((Number(value || 0) + 540) % 360) - 180;
  }

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function roleRank(role) {
    return role === "door" ? 0 : (role === "switch" ? 1 : (role === "exit" ? 2 : 3));
  }

  function readWadName(bytes, offset) {
    let name = "";
    for (let index = 0; index < 8; index += 1) {
      const byte = bytes[offset + index];
      if (!byte) {
        break;
      }
      name += String.fromCharCode(byte);
    }
    return name;
  }

  self.AIKernelDoomWadMetadata = Object.freeze({
    parseMapHints,
    parsePlaypal,
    defaultPalette,
    buildPaletteCache,
    readDirectory,
    readWadName
  });
})();
