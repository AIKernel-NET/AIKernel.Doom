(function () {
  "use strict";

  const DARK_ZONE_LUMA_THRESHOLD = 78;
  const ENEMY_COLOR_CLUSTERS = [
    { name: "red", r: 176, g: 38, b: 32 },
    { name: "brown", r: 135, g: 82, b: 48 },
    { name: "gray", r: 142, g: 142, b: 132 },
    { name: "pink", r: 184, g: 92, b: 92 }
  ];

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function scoreEnemyPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return { score: 0, name: "none" };
    }

    const offset = index * 4;
    return scoreEnemyRgb(rgbaBytes[offset] || 0, rgbaBytes[offset + 1] || 0, rgbaBytes[offset + 2] || 0);
  }

  function scoreProjectilePaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const hsv = rgbToHsv(red, green, blue);
    const brightness = (red + green + blue) / 3;
    const warmHue = hueInRange(hsv.hue, 8, 54) || hueInRange(hsv.hue, 350, 360);
    const warm = warmHue && hsv.saturation >= 0.36 && hsv.value >= 0.18;
    const redDominance = red - Math.max(green * 0.72, blue * 1.4);
    const orangeBalance = green > blue ? clamp01((green - blue) / 128) : 0;
    const hueScore = warmHue ? 0.44 : 0;
    return warm
      ? clamp01(hueScore + (hsv.saturation * 0.22) + (redDominance / 180) * 0.22 + orangeBalance * 0.08 + clamp01((brightness - 38) / 160) * 0.04)
      : 0;
  }

  function scoreResourcePaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const hsv = rgbToHsv(red, green, blue);
    const brightness = (red + green + blue) / 3;
    const blueResource = hueInRange(hsv.hue, 178, 250) && hsv.saturation >= 0.28 && hsv.value >= 0.2;
    const greenResource = hueInRange(hsv.hue, 78, 158) && hsv.saturation >= 0.26 && hsv.value >= 0.2;
    const brightPickup = brightness > 164 && Math.max(red, green, blue) - Math.min(red, green, blue) < 78;
    return blueResource || greenResource || brightPickup
      ? clamp01((hsv.saturation * 0.44) + clamp01((brightness - 42) / 180) * 0.36 + (brightPickup ? 0.2 : 0))
      : 0;
  }

  function rgbToHsv(red, green, blue) {
    const r = clamp01(Number(red || 0) / 255);
    const g = clamp01(Number(green || 0) / 255);
    const b = clamp01(Number(blue || 0) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    if (delta > 0) {
      if (max === r) {
        hue = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        hue = 60 * (((b - r) / delta) + 2);
      } else {
        hue = 60 * (((r - g) / delta) + 4);
      }
    }

    if (hue < 0) {
      hue += 360;
    }

    return {
      hue,
      saturation: max === 0 ? 0 : delta / max,
      value: max
    };
  }

  function hueInRange(hue, min, max) {
    const value = ((Number(hue || 0) % 360) + 360) % 360;
    const lower = ((Number(min || 0) % 360) + 360) % 360;
    const upper = ((Number(max || 0) % 360) + 360) % 360;
    if (lower <= upper) {
      return value >= lower && value <= upper;
    }

    return value >= lower || value <= upper;
  }

  function scoreDarkPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return { score: 0, luma: 0 };
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max - min;
    const dark = luma <= DARK_ZONE_LUMA_THRESHOLD && saturation >= 8;
    return {
      score: dark ? clamp01((DARK_ZONE_LUMA_THRESHOLD - luma) / DARK_ZONE_LUMA_THRESHOLD) : 0,
      luma
    };
  }

  function scoreBlueFloorPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const brightness = (red + green + blue) / 3;
    const blueDominance = blue - Math.max(red, green);
    const mutedBlue = blue >= 44 && blue <= 190 && brightness >= 24 && brightness <= 150;
    return mutedBlue && blueDominance >= 10
      ? clamp01((blueDominance - 10) / 64)
      : 0;
  }

  function scoreCourtyardLowerPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const brightness = (red + green + blue) / 3;
    const greenDominance = green - Math.max(red, blue);
    const nukageLike = green >= 34 && green <= 190 && brightness >= 18 && brightness <= 150;
    return nukageLike && greenDominance >= 8
      ? clamp01((greenDominance - 8) / 72)
      : 0;
  }

  function scoreCourtyardUpperPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max - min;
    const darkGreen = green >= Math.max(red, blue) - 2 && luma <= 72 && saturation >= 8;
    const paleGray = luma >= 88 && luma <= 196 && saturation <= 24;
    return darkGreen
      ? clamp01((72 - luma) / 72)
      : (paleGray ? clamp01((196 - Math.abs(luma - 142)) / 196) : 0);
  }

  function scoreSpawnSecretDoorPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const brightWhite = luma >= 148 && saturation <= 42;
    const washedGray = luma >= 118 && saturation <= 30;
    return brightWhite
      ? clamp01((luma - 122) / 104)
      : (washedGray ? clamp01((luma - 106) / 104) * 0.42 : 0);
  }

  function scoreSpawnWestStairDarkPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const darkOpening = luma >= 8 && luma <= 72 && saturation <= 58;
    return darkOpening ? clamp01((76 - luma) / 68) : 0;
  }

  function scoreSpawnWestStairLampPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const hsv = rgbToHsv(red, green, blue);
    const warmLamp = red >= 82 && green >= 44 && red >= blue + 30 && green >= blue + 12 && luma >= 44;
    const paleTip = luma >= 132 && hsv.saturation >= 0.18 && hueInRange(hsv.hue, 16, 58);
    return warmLamp
      ? clamp01(((red - blue) / 150) * 0.56 + hsv.saturation * 0.26 + clamp01((luma - 40) / 154) * 0.18)
      : (paleTip ? clamp01((luma - 110) / 118) * 0.74 : 0);
  }

  function scoreSpawnCorridorGapPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const panelDark = luma >= 18 && luma <= 92 && saturation <= 48;
    return panelDark ? clamp01((92 - luma) / 74) : 0;
  }

  function scoreSpawnCorridorPillarPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const brown = red >= green + 6 && green >= blue - 4 && luma >= 42 && luma <= 154;
    const gray = Math.max(red, green, blue) - Math.min(red, green, blue) <= 28 && luma >= 54 && luma <= 178;
    return brown || gray ? clamp01((luma - 32) / 108) : 0;
  }

  function scoreBridgeBrownPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const brown = red >= green - 2 && green >= blue + 4 && luma >= 38 && luma <= 156 && saturation >= 10;
    return brown ? clamp01((saturation - 8) / 74) : 0;
  }

  function scoreBridgeGreenPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const greenDominance = green - Math.max(red, blue);
    const darkGreenWall = green >= Math.max(red, blue) - 1 && luma >= 18 && luma <= 116;
    const nukage = green >= 28 && greenDominance >= 5 && luma >= 18 && luma <= 158;
    return nukage
      ? clamp01((greenDominance + 12) / 86)
      : (darkGreenWall ? clamp01((116 - luma) / 108) * 0.7 : 0);
  }

  function scoreBridgeDoorPanelPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const darkDoorBrown = red >= green - 4 && green >= blue - 2 && luma >= 18 && luma <= 96 && saturation >= 10;
    const blackPanel = luma >= 8 && luma <= 42 && saturation <= 36;
    return darkDoorBrown
      ? clamp01((96 - luma) / 78)
      : (blackPanel ? clamp01((42 - luma) / 34) * 0.68 : 0);
  }

  function scoreFirstDoorRedAccentPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const hsv = rgbToHsv(red, green, blue);
    const brightness = (red + green + blue) / 3;
    const redHue = hueInRange(hsv.hue, 348, 18);
    const redDominance = red - Math.max(green * 1.08, blue * 1.18);
    const orangeLeak = green > blue + 8 && green >= red * 0.54;
    if (!redHue || orangeLeak || redDominance < 16 || hsv.saturation < 0.34 || hsv.value < 0.14) {
      return 0;
    }

    return clamp01(
      (redDominance / 148) * 0.48
      + hsv.saturation * 0.28
      + clamp01((brightness - 28) / 156) * 0.24);
  }

  function scoreComputerRoomBluePaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const blueDominance = blue - Math.max(red, green);
    const darkPanelBlue = blue >= 34 && blueDominance >= 6 && luma >= 14 && luma <= 116;
    return darkPanelBlue ? clamp01((blueDominance + 18) / 88) : 0;
  }

  function scoreComputerRoomRedLightPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const redDominance = red - Math.max(green, blue);
    const redLamp = red >= 72 && redDominance >= 24 && luma >= 22 && luma <= 172;
    return redLamp ? clamp01((redDominance - 8) / 120) : 0;
  }

  function scoreComputerRoomDarkPanelPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const blueFloor = blue >= Math.max(red, green) + 18 && luma >= 28;
    const nukageGreen = green >= Math.max(red, blue) + 18 && luma >= 34;
    const darkConsole = luma >= 8 && luma <= 86 && saturation <= 78 && !blueFloor && !nukageGreen;
    return darkConsole ? clamp01((92 - luma) / 84) : 0;
  }

  function scoreComputerRoomPanelPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const greenLed = green >= 42 && green >= red + 4 && green >= blue + 8 && luma >= 18 && luma <= 128;
    const amberLed = red >= 48 && green >= 28 && red >= blue + 14 && green >= blue + 8 && luma >= 22 && luma <= 142;
    const grayConsole = Math.abs(red - green) <= 24 && Math.abs(green - blue) <= 28 && luma >= 34 && luma <= 126;
    return greenLed
      ? clamp01((green - blue + 16) / 92)
      : (amberLed ? clamp01((red + green - blue) / 210) : (grayConsole ? 0.28 : 0));
  }

  function scoreFootObstaclePaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const barrelBrown = red >= green - 2 && green >= blue + 2 && luma >= 34 && luma <= 134 && saturation >= 12;
    const barrelGreen = green >= red + 4 && green >= blue + 8 && luma >= 26 && luma <= 150 && saturation >= 18;
    const metalGray = saturation <= 30 && luma >= 52 && luma <= 162;
    return barrelBrown
      ? clamp01((saturation - 8) / 78)
      : (barrelGreen
        ? clamp01((saturation - 12) / 84)
        : (metalGray ? clamp01((162 - Math.abs(luma - 96)) / 162) * 0.42 : 0));
  }

  function scoreEnemyRgb(red, green, blue) {
    let best = { score: 0, name: "none" };
    const brightness = (red + green + blue) / 3;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    if (brightness < 24 || brightness > 226 || saturation < 18) {
      return best;
    }

    for (let index = 0; index < ENEMY_COLOR_CLUSTERS.length; index += 1) {
      const cluster = ENEMY_COLOR_CLUSTERS[index];
      const dr = red - cluster.r;
      const dg = green - cluster.g;
      const db = blue - cluster.b;
      const distance = Math.sqrt((dr * dr) + (dg * dg) + (db * db));
      const score = Math.max(0, 1 - (distance / 128));
      if (score > best.score) {
        best = { score, name: cluster.name };
      }
    }

    return best.score >= 0.18 ? best : { score: 0, name: "none" };
  }

  self.AIKernelDoomVisionPalette = Object.freeze({
    hueInRange,
    rgbToHsv,
    scoreBlueFloorPaletteIndex,
    scoreBridgeBrownPaletteIndex,
    scoreBridgeDoorPanelPaletteIndex,
    scoreBridgeGreenPaletteIndex,
    scoreComputerRoomBluePaletteIndex,
    scoreComputerRoomDarkPanelPaletteIndex,
    scoreComputerRoomPanelPaletteIndex,
    scoreComputerRoomRedLightPaletteIndex,
    scoreCourtyardLowerPaletteIndex,
    scoreCourtyardUpperPaletteIndex,
    scoreDarkPaletteIndex,
    scoreEnemyPaletteIndex,
    scoreEnemyRgb,
    scoreFirstDoorRedAccentPaletteIndex,
    scoreFootObstaclePaletteIndex,
    scoreProjectilePaletteIndex,
    scoreResourcePaletteIndex,
    scoreSpawnCorridorGapPaletteIndex,
    scoreSpawnCorridorPillarPaletteIndex,
    scoreSpawnSecretDoorPaletteIndex,
    scoreSpawnWestStairDarkPaletteIndex,
    scoreSpawnWestStairLampPaletteIndex
  });
})();
