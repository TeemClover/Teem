/** Shared scenery primitives. All coordinates use the 384 × 216 game world. */
export function createSceneArt(ctx) {
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fill();
  }
  function line(x1, y1, x2, y2, color, width = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function gradient(y, height, top, bottom) {
    const paint = ctx.createLinearGradient(0, y, 0, y + height);
    paint.addColorStop(0, top); paint.addColorStop(1, bottom);
    rect(0, y, 384, height, paint);
  }
  function glow(x, y, radius, color) {
    const paint = ctx.createRadialGradient(x, y, 0, x, y, radius);
    paint.addColorStop(0, color); paint.addColorStop(1, "transparent");
    rect(x - radius, y - radius, radius * 2, radius * 2, paint);
  }
  function shadow(x, y, width, height = 4) {
    ctx.fillStyle = "#173e3930";
    ctx.beginPath(); ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2); ctx.fill();
  }
  function skyline(y, color, seed = 0) {
    for (let i = 0; i < 20; i++) {
      const h = 10 + (i * 17 + seed * 13) % 41;
      const x = i * 21 - 12;
      rect(x, y - h, 16, h, color);
      rect(x + 4, y - h - 3, 7, 3, color);
      for (let k = 0; k < h - 7; k += 8) {
        rect(x + 3, y - h + k + 4, 3, 2, "#f6d6a057");
        rect(x + 10, y - h + k + 4, 2, 2, "#d5e8df50");
      }
    }
  }
  function floor(top = 138, tile = false) {
    gradient(top, 216 - top, tile ? "#8caeaa" : "#bc976e", tile ? "#bdd0c3" : "#e0bd89");
    [top + 7, top + 20, top + 38, top + 62, 214].forEach((y, row) => {
      line(0, y, 384, y, tile ? "#77968c60" : "#936e4e50");
      for (let x = -60; x < 450; x += tile ? 48 : 68) {
        const offset = row % 2 * 32;
        line(x + offset, y, x + offset - 9, y + 18, "#846e4f30");
        if (!tile) line(x + offset + 8, y + 3, x + offset + 40, y + 3, "#fff0c723");
      }
    });
    rect(0, top, 384, 5, "#203d4040");
  }
  function plant(x, y, big = false) {
    shadow(x + 10, y + 30, 15, 3);
    rect(x + 2, y + 12, 18, 4, "#c5845c");
    polygon([[x + 3, y + 16], [x + 19, y + 16], [x + 17, y + 29], [x + 6, y + 29]], "#b5704e");
    rect(x + 6, y + 17, 3, 10, "#dba678");
    line(x + 11, y + 13, x + 10, y - 17, "#356b53", 2);
    for (let i = 0; i < (big ? 7 : 5); i++) {
      const direction = i % 2 ? 1 : -1;
      const yy = y + 7 - i * 5;
      polygon([[x + 11, yy], [x + 11 + direction * 14, yy - 4], [x + 9 + direction * 12, yy - 11], [x + 10, yy - 3]], i % 3 ? "#578e60" : "#79ac72");
      line(x + 11, yy, x + 11 + direction * 10, yy - 6, "#a5ca7960");
    }
  }
  function windowScene(x, y, w, h, night = false) {
    rect(x - 3, y - 3, w + 6, h + 8, "#284951");
    rect(x, y, w, h, night ? "#426c89" : "#9bcbd3");
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    glow(x + w * .25, y + 18, 40, night ? "#f8d6a875" : "#fff4cba0");
    for (let i = 0; i < Math.ceil(w / 13); i++) {
      const height = 12 + i * 17 % 24;
      rect(x + i * 13, y + h - height, 10, height, night ? "#30536a" : "#679aa6");
      for (let k = 0; k < height - 3; k += 6) rect(x + i * 13 + 3, y + h - height + k + 3, 3, 2, "#ffe3a783");
    }
    polygon([[x + 8, y], [x + 21, y], [x + w - 8, y + h], [x + w - 25, y + h]], "#e4f3e52b");
    ctx.restore();
    rect(x + w / 2 - 1, y, 3, h, "#e1d9bd");
    rect(x, y + h * .55, w, 3, "#e1d9bd");
    rect(x - 5, y + h, w + 10, 4, "#f1dfbc");
    rect(x - 5, y + h + 4, w + 10, 3, "#857962");
  }
  function lamp(x) {
    line(x, 0, x, 23, "#50615a", 2);
    polygon([[x - 8, 22], [x + 8, 22], [x + 14, 30], [x - 14, 30]], "#41675e");
    rect(x - 12, 30, 24, 2, "#eed59d");
    glow(x, 39, 35, "#ffedb934");
  }
  function room(theme = "office") {
    const cool = theme === "exam";
    gradient(0, 138, cool ? "#dce8df" : "#e7dfc9", cool ? "#b9cec5" : "#f1e7cd");
    rect(0, 0, 384, 5, "#526a5c"); rect(0, 5, 384, 3, "#bfd0b754");
    rect(0, 104, 384, 31, cool ? "#7f9d95" : "#89a48b");
    for (let x = 0; x < 384; x += 24) {
      rect(x, 107, 1, 24, "#244a4140"); rect(x + 3, 108, 18, 1, "#ffffff21");
    }
    rect(0, 102, 384, 3, "#d9dfc4"); rect(0, 134, 384, 4, "#405f53");
    floor(138, cool);
    if (!cool) {
      windowScene(26, 25, 76, 67);
      polygon([[29, 142], [96, 142], [217, 216], [88, 216]], "#ffe6ae33");
      line(61, 142, 151, 216, "#ddc59255", 2);
      plant(348, 124, true);
    }
    lamp(178); lamp(303);
    const vignette = ctx.createLinearGradient(0, 0, 384, 0);
    vignette.addColorStop(0, "#1d3b3824"); vignette.addColorStop(.12, "transparent");
    vignette.addColorStop(.9, "transparent"); vignette.addColorStop(1, "#1d3b3824");
    rect(0, 0, 384, 216, vignette);
  }
  function pine(x, y, size, color) {
    rect(x - 2, y, 4, size, "#294639");
    for (let i = 0; i < 3; i++) polygon([[x, y - size + i * size / 3], [x - size / 2 - i * 2, y + i * size / 3], [x + size / 2 + i * 2, y + i * size / 3]], color);
  }
  function camp() {
    gradient(0, 216, "#192e4c", "#729891");
    glow(306, 31, 27, "#fbe4b938");
    ctx.fillStyle = "#f1dfab"; ctx.beginPath(); ctx.arc(306, 31, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#243e59"; ctx.beginPath(); ctx.arc(310, 28, 9, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 43; i++) rect((i * 53 + 17) % 380, 9 + i * 31 % 76, i % 5 ? 1 : 2, 1, "#eadbaa9c");
    polygon([[0, 113], [59, 53], [126, 115], [204, 62], [291, 113], [350, 64], [384, 101], [384, 160], [0, 160]], "#365664");
    for (let i = 0; i < 12; i++) pine(i * 37 - 9, 113, 21 + i * 13 % 19, i % 2 ? "#284e47" : "#2e5b4c");
    gradient(134, 82, "#375d49", "#567057");
    polygon([[40, 139], [70, 96], [101, 139]], "#c6a06f");
    polygon([[70, 96], [73, 139], [101, 139]], "#b9865f");
    polygon([[63, 119], [73, 139], [55, 139]], "#3d5146");
    polygon([[295, 140], [323, 103], [355, 140]], "#739d8e");
    rect(136, 79, 112, 53, "#203d3c"); rect(140, 83, 104, 45, "#3e7159");
    ctx.fillStyle = "#efddb4"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
    ctx.fillText("THE XIRCLE", 192, 97); ctx.font = "5px monospace"; ctx.fillText("RESET / RECONNECT / RISE", 192, 120); ctx.textAlign = "start";
    for (let i = 0; i < 13; i++) {
      const x = 16 + i * 29, y = 53 + Math.sin(i / 12 * Math.PI) * 19;
      if (i < 12) line(x, y, x + 29, 53 + Math.sin((i + 1) / 12 * Math.PI) * 19, "#32413a");
      glow(x, y + 4, 10, "#ffdb793b"); rect(x - 1, y + 1, 3, 4, "#f5d592");
    }
    glow(193, 178, 65, "#ffb76b39"); shadow(193, 183, 29, 7);
    for (let i = 0; i < 40; i++) rect(i * 67 % 384, 145 + i * 17 % 65, 3, 1, "#aab38028");
  }
  function travel(destination) {
    const dusk = ["Tokyo", "Shanghai", "Dubai", "Paris", "London"].includes(destination);
    gradient(0, 151, dusk ? "#6884a1" : "#77b6d0", dusk ? "#efb895" : "#d3e7d5");
    glow(58, 48, 33, "#ffe3a589");
    ctx.fillStyle = "#ffe8b0"; ctx.beginPath(); ctx.arc(58, 48, 12, 0, Math.PI * 2); ctx.fill();
    skyline(143, "#637f9690", 2); skyline(151, "#496b7e", 6);
    const tower = (color) => {
      polygon([[191, 32], [159, 149], [171, 149], [191, 74], [213, 149], [224, 149]], color);
      rect(170, 107, 42, 4, "#f7dca8"); rect(177, 80, 28, 4, "#f7dca8");
      line(191, 17, 191, 37, color, 2);
      for (let y = 88; y < 143; y += 11) { const w = (y - 31) / 3.5; line(191 - w, y, 191 + w, y + 10, "#f2be9870"); }
    };
    if (destination === "Tokyo" || destination === "Paris") {
      tower(destination === "Tokyo" ? "#bc6053" : "#726b63");
      if (destination === "Tokyo") {
        rect(19, 94, 16, 56, "#ddd2ae"); rect(21, 97, 12, 23, "#ba5e6b");
        for (let i = 0; i < 4; i++) rect(25, 100 + i * 5, 4, 2, "#fce5b8");
      }
    } else if (destination === "Dubai") {
      for (let tier = 0; tier < 9; tier++) {
        const width = 36 - tier * 3.6, top = 137 - tier * 12;
        rect(191 - width / 2 + tier % 2 * 2, top, width, 14, tier % 2 ? "#73919a" : "#547482");
        for (let k = 2; k < 13; k += 3) rect(193 - width / 2, top + k, width - 4, 1, "#f1d4a57b");
      }
      line(195, 11, 195, 47, "#647c83", 2);
      polygon([[257, 149], [263, 91], [291, 145]], "#d7d6bd");
      line(263, 84, 263, 148, "#f0e3c7", 2);
    } else if (destination === "Seoul") {
      polygon([[75, 148], [157, 99], [218, 97], [296, 148]], "#688d76");
      rect(189, 49, 5, 69, "#e4ddd0"); rect(180, 43, 23, 11, "#5f7a86"); line(191, 26, 191, 43, "#4f6b7b", 2);
    } else if (destination === "Shanghai") {
      rect(187, 42, 6, 106, "#a39fb0"); line(190, 24, 190, 46, "#a39fb0", 2);
      for (const [y, r] of [[66, 15], [108, 11]]) { ctx.fillStyle = "#cf8993"; ctx.beginPath(); ctx.arc(190, y, r, 0, Math.PI * 2); ctx.fill(); line(179, y, 201, y, "#e3b29c", 2); }
    } else if (destination === "Taipei") {
      for (let tier = 0; tier < 7; tier++) { const y = 135 - tier * 14; polygon([[172, y], [208, y], [204, y + 13], [176, y + 13]], "#4e8c8a"); rect(176, y + 3, 28, 2, "#9dc0ad"); }
      rect(187, 24, 7, 16, "#6b9e94"); line(190, 15, 190, 25, "#467b7d", 2);
    } else if (destination === "London") {
      rect(171, 61, 39, 88, "#bd9b77"); polygon([[168, 61], [191, 25], [213, 61]], "#6b7978");
      rect(179, 68, 23, 24, "#f4e3b4"); line(191, 72, 191, 80, "#496267", 2); line(191, 80, 185, 83, "#496267", 2);
      for (let x = 177; x < 209; x += 7) rect(x, 99, 3, 46, "#927c65");
      rect(46, 127, 65, 22, "#b55850"); rect(50, 131, 55, 6, "#bfd2cb");
    } else if (destination === "Santorini") {
      gradient(112, 39, "#63a5bc", "#4388a6");
      for (let i = 0; i < 5; i++) { const x = 29 + i * 71, y = 101 - i % 2 * 19; rect(x, y, 54, 49, "#f3f0dd"); ctx.fillStyle = "#4f8bb7"; ctx.beginPath(); ctx.arc(x + 25, y, 15, Math.PI, 0); ctx.fill(); rect(x + 20, y + 23, 9, 26, "#4e7f9d"); rect(x + 4, y + 8, 8, 9, "#87b2bf"); }
    } else {
      gradient(113, 38, "#82b5be", "#4b91aa");
      polygon([[121, 149], [107, 88], [190, 143]], "#f7e9c8"); polygon([[179, 148], [210, 64], [262, 148]], "#fff3d8");
      polygon([[225, 148], [274, 98], [288, 148]], "#deceb0");
    }
    gradient(152, 64, "#c3b290", "#e2d0a8");
    for (let y = 159; y < 216; y += 15) line(0, y, 384, y, "#a68e6c5e");
    for (let x = -30; x < 420; x += 46) line(x, 152, x - 40, 216, "#a68e6c40");
    rect(0, 149, 384, 4, "#3c6170");
    for (let x = 0; x < 384; x += 31) rect(x, 152, 2, 14, "#547478");
    line(0, 165, 384, 165, "#547478", 2);
    plant(116, 157); plant(239, 157);
  }
  function organization(phase = 7) {
    room("management");
    rect(0, 14, 384, 94, "#3f625b");
    windowScene(143, 24, 222, 74, true);
    rect(18, 25, 109, 69, "#274a4b"); rect(22, 29, 101, 61, "#365e5b");
    const nodes = [[70, 42], [39, 61], [101, 61], [30, 78], [52, 78], [90, 78], [111, 78]];
    for (let i = 1; i < nodes.length; i++) { const parent = nodes[Math.floor((i - 1) / 2)]; line(...parent, ...nodes[i], "#85ae90", 1); }
    nodes.forEach(([x, y], i) => { rect(x - 3, y - 3, 6, 6, i ? "#abd0b0" : "#e9c477"); rect(x - 1, y - 1, 2, 2, "#eff0cd"); });
    rect(0, 132, 384, 3, phase >= 9 ? "#d4b468" : "#8faa81");
    shadow(193, 194, 112, 12);
    polygon([[124, 160], [266, 160], [292, 201], [94, 201]], "#9dafa076");
  }
  function finale() {
    gradient(0, 144, "#4f798d", "#eed5a4"); skyline(141, "#73928c", 3);
    rect(0, 143, 384, 73, "#88a382");
    polygon([[173, 137], [211, 137], [265, 216], [117, 216]], "#d5c39b");
    shadow(192, 144, 78, 9);
    rect(137, 42, 110, 101, "#43676a"); rect(141, 38, 102, 4, "#e8d8ad");
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
      rect(147 + col * 19, 51 + row * 19, 11, 13, (row + col) % 3 ? "#97c0bb" : "#f5dc97");
      rect(147 + col * 19, 63 + row * 19, 11, 1, "#d9daba");
    }
    rect(181, 124, 22, 19, "#294e56"); rect(191, 126, 1, 17, "#9dc1bd");
    for (const x of [64, 293]) { pine(x, 139, 30, "#496f56"); plant(x - 12, 147, true); }
    glow(191, 39, 60, "#ffe1a329");
  }
  return { room, camp, travel, organization, finale, plant, shadow, glow, polygon, line };
}
