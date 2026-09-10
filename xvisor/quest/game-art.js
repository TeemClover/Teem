/** Shared character identities from the illustrated X-VISOR cover. */
export const MENTOR_PALETTES = Object.freeze({
  teem: Object.freeze({ characterId: "teem", skin: "#e6ad83", hair: "#211e1d", shirt: "#26272b", accent: "#bc3e38", hairStyle: "spiky", glasses: true }),
  ako: Object.freeze({ characterId: "ako", skin: "#f0b88e", hair: "#272020", shirt: "#29272b", accent: "#f4d8a9", hairStyle: "ponytail", dress: true }),
});

const HAIR_STYLES = ["short", "long", "ponytail", "bob", "bun", "curly", "spiky", "buzz"];
const CLOTHING_STYLES = ["tee", "polo", "shirt", "cardigan", "hoodie", "dress"];
/** Explicit traits are shared by the world and portrait crop. Legacy palettes
 * get independent, stable defaults instead of one colour hash controlling all
 * their hair, clothing and glasses together. This never modifies a person. */
export function getCharacterTraits(palette = {}, player = false) {
  const key = palette.identityKey || [palette.skin, palette.hair, palette.shirt, palette.accent].join(":");
  const pick = (channel, values) => {
    let hash = 2166136261;
    for (const char of `${key}:${channel}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    hash ^= hash >>> 16;
    return values[(hash >>> 0) % values.length];
  };
  const glasses = palette.glasses === true ? "square" : ["round", "square"].includes(palette.glasses) ? palette.glasses
    : palette.glasses === false || palette.glasses === "none" || player ? false : pick("glasses", [false, false, false, "round", "square"]);
  return {
    hairStyle: HAIR_STYLES.includes(palette.hairStyle) ? palette.hairStyle : player ? "short" : pick("hair", HAIR_STYLES),
    clothing: palette.dress ? "dress" : CLOTHING_STYLES.includes(palette.clothing) ? palette.clothing : player ? "polo" : pick("clothing", CLOTHING_STYLES.slice(0, 5)),
    glasses,
    pants: palette.pants || "#344e4f",
    accessory: palette.accessory || "none",
    freckles: Boolean(palette.freckles),
    faceShape: palette.faceShape === "round" ? "round" : "oval"
  };
}

/** Shared scenery primitives. All coordinates use the 384 × 216 game world. */
export function createSceneArt(ctx) {
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  function rounded(x, y, w, h, radius, color, stroke = null, width = 1) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.fillStyle = color; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function ellipse(x, y, rx, ry, color) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }
  function path(points, color, stroke = null, width = 1) {
    ctx.beginPath();
    for (const [op, ...args] of points) ctx[op](...args);
    ctx.fillStyle = color; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fill();
  }
  function line(x1, y1, x2, y2, color, width = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
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
    ctx.save(); ctx.translate(x, y); ctx.scale(1, height / width);
    const paint = ctx.createRadialGradient(0, 0, 0, 0, 0, width);
    paint.addColorStop(0, "#203f3952"); paint.addColorStop(1, "#203f3900");
    ellipse(0, 0, width, width, paint); ctx.restore();
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
    gradient(top, 216 - top, tile ? "#c8b69a" : "#b88b62", tile ? "#f0dfbd" : "#edd0a0");
    for (let i = 0; i < 5; i++) {
      const y = top + 7 + i * i * 4;
      line(0, y, 384, y, tile ? "#6f97822b" : "#94775430", .6);
      for (let x = -40; x < 430; x += 62) {
        const xx = x + i % 2 * 31;
        line(xx, y, xx - 9, y + 6 + i * 7, "#746d5524", .6);
      }
    }
    rect(0, top, 384, 3, "#2849402b");
    glow(112, 190, 94, "#fff0c238");
    for(let i=0;i<84;i++)rect((i*71+19)%384,top+7+(i*37)%(210-top),2+i%4,1,i%3?"#654d3410":"#ffe9b326");
  }
  function plant(x, y, big = false) {
    shadow(x + 10, y + 29, 19, 4);
    path([["moveTo",x+1,y+13],["lineTo",x+21,y+13],["lineTo",x+18,y+28],["quadraticCurveTo",x+10,y+33,x+4,y+27],["closePath"]], "#bd8568");
    rounded(x, y + 11, 22, 5, 2, "#e3b294");
    line(x + 6, y + 18, x + 8, y + 27, "#efcbb03f", 2);
    const top = big ? y - 28 : y - 17;
    line(x + 11, y + 13, x + 10, top, "#476f4f", 1.5);
    for (let i = 0; i < (big ? 7 : 5); i++) {
      const direction = i % 2 ? 1 : -1;
      const yy = y + 7 - i * 5;
      path([["moveTo",x+11,yy],["quadraticCurveTo",x+10+direction*22,yy+2,x+10+direction*16,yy-12],["quadraticCurveTo",x+10+direction*3,yy-13,x+11,yy],["closePath"]], i % 3 ? "#6e9a68" : "#8ab17b");
      line(x + 11, yy, x + 10 + direction * 12, yy - 8, "#c5db9b6b", .6);
    }
  }
  function windowScene(x, y, w, h, night = false) {
    rounded(x - 4, y - 4, w + 8, h + 10, 8, "#335a56");
    rounded(x - 1, y - 1, w + 2, h + 2, 6, "#eee5ce");
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.clip();
    const sky = ctx.createLinearGradient(0,y,0,y+h);
    sky.addColorStop(0, night ? "#506d8b" : "#9bc8ca"); sky.addColorStop(1,night ? "#d1ab94" : "#e1e9d1");
    rect(x, y, w, h, sky);
    glow(x + w * .27, y + 20, 34, night ? "#f8d6a852" : "#fff4cbbf");
    for (let i = 0; i < Math.ceil(w / 15); i++) {
      const height = 12 + i * 17 % 27;
      rounded(x+i*15,y+h-height,12,height,1,night ? "#517286" : "#85aca9");
      for (let k=0;k<height-3;k+=7) rounded(x+i*15+3,y+h-height+k+3,2,3,.5,"#fce7b89c");
    }
    path([["moveTo",x,y+h],["bezierCurveTo",x+w*.2,y+h-24,x+w*.7,y+h+6,x+w,y+h-10],["lineTo",x+w,y+h],["closePath"]], "#789978");
    polygon([[x+8,y],[x+21,y],[x+w-8,y+h],[x+w-25,y+h]],"#f3f7e52b");
    ctx.restore();
    line(x+w/2,y+1,x+w/2,y+h,"#eee7cf",2.3);
    line(x,y+h*.59,x+w,y+h*.59,"#eee7cf",2);
    rounded(x-7,y+h+2,w+14,5,2,"#f3e5c8");
    rounded(x-5,y+h+7,w+10,2,1,"#546c5738");
  }
  function lamp(x, y = 28) {
    line(x,0,x,y-9,"#66796a",1.1);
    path([["moveTo",x-9,y-9],["quadraticCurveTo",x,y-16,x+9,y-9],["lineTo",x+15,y],["quadraticCurveTo",x,y+4,x-15,y],["closePath"]],"#54786b");
    ellipse(x,y+1,13,2,"#f6e3b5");
    glow(x,y+11,35,"#ffe6a92b");
  }
  function room(theme = "office") {
    const cool = theme === "exam" || theme === "academy";
    const forum = theme === "forum";
    const management = theme === "management";
    gradient(0,138,cool?"#e9d5ac":forum?"#d7b887":"#e9c493",cool?"#f5e7c7":management?"#ffebc0":"#fff0c9");
    rect(0,0,384,6,"#65503b"); rect(0,6,384,2,"#f1d49865");
    rounded(8,98,368,40,2,cool?"#9d9c78":"#b1966c");
    for(let x=16;x<384;x+=42) rounded(x,104,33,26,2,"#e3c38b2b","#73563335",.7);
    rect(0,96,384,3,"#ecd3a1"); rect(0,136,384,3,"#785b3d");
    floor(139,cool);
    ellipse(192,177,126,21,"#d6c3a475"); ellipse(192,176,119,17,"#eee0c25c");
    if(!forum) {
      // The exam entrance occupies x=16..64. Reserve that wall for the door.
      ctx.save();
      if(theme === "exam") ctx.translate(70,0);
      windowScene(22,25,83,65,cool);
      path([["moveTo",28,143],["lineTo",98,143],["lineTo",229,216],["lineTo",70,216],["closePath"]],"#fff0ba28");
      rounded(16,19,5,77,2,"#a8b49b"); rounded(107,19,5,77,2,"#94aa90");
      line(18,19,110,19,"#789277",2);
      ctx.restore();
    } else {
      rounded(47,22,290,74,9,"#507b68");
      rounded(52,27,280,64,6,"#638f78");
      for(const x of [38,346]) { glow(x,64,27,"#ffe7a864"); rounded(x-2,49,4,17,2,"#f4dfb8"); }
    }
    lamp(theme === "exam" ? 220 : 177); lamp(302);
    plant(349,121,true);
    const shade=ctx.createLinearGradient(0,0,384,0);
    shade.addColorStop(0,"#24453416");shade.addColorStop(.15,"transparent");shade.addColorStop(.88,"transparent");shade.addColorStop(1,"#24453420");
    rect(0,0,384,216,shade);
    for(let i=0;i<90;i++)rect((i*61+12)%384,10+i*29%120,1+i%3,1,"#9c764315");
  }
  function kitchen() {
    gradient(0,216,"#f2cf9d","#f6e4bc");floor(139);
    rect(0,16,384,4,"#a58559");
    for(let x=19;x<360;x+=41) {
      rounded(x,72,37,58,2,"#f6e5bd","#c1a97d",.5);
      for(let y=78;y<130;y+=13)line(x,y,x+36,y,"#dfcda5",.6);
    }
    windowScene(135,26,106,61);
    for(const x of [24,270]) {
      rounded(x,27,77,38,3,"#ac895f","#6a6245",1);
      line(x+38,30,x+38,62,"#6f6447",1);
      for(const xx of [x+31,x+45])rounded(xx,43,2,7,1,"#eccea0");
    }
    rounded(17,108,350,29,3,"#9b986e");
    rounded(13,105,358,7,2,"#f3dfb4","#9e865e",.7);
    for(let x=24;x<364;x+=57) {
      rounded(x,116,47,15,2,"#acaa7c","#797e59",.6);
      line(x+17,118,x+29,118,"#dfd1a1",1.4);
    }
    ellipse(279,103,22,5,"#a4b89e");ellipse(279,101,17,3,"#738b79");
    line(295,102,295,86,"#6a8875",2);line(295,86,285,86,"#6a8875",2);
    rounded(43,89,25,15,3,"#ead7aa");
    for(const [xx,color] of [[49,"#9bb574"],[58,"#ce975f"],[66,"#a6bb80"]])ellipse(xx,91,5,5,color);
    rounded(94,81,14,24,3,"#f4e7c8","#9b9b73",.7);rounded(95,78,12,4,1,"#8aab88");
    plant(334,76);
    lamp(187,20);
    ellipse(194,184,119,22,"#d6bc8950");
  }
  function community() {
    gradient(0,147,"#a9cdd2","#f6dfb1");glow(66,32,46,"#fff1b793");
    polygon([[0,92],[66,48],[139,101],[227,57],[307,92],[384,69],[384,149],[0,149]],"#9eaf88");
    rounded(16,49,113,96,3,"#e3b47f","#927956",1);
    rounded(29,79,85,62,2,"#dfcca0");
    for(let i=0;i<6;i++)rect(21+i*18,63,18,18,i%2?"#f1d8a5":"#9dba91");
    polygon([[17,61],[128,61],[121,46],[23,46]],"#927b5c");
    rounded(38,97,24,43,3,"#6b8b78");rounded(71,95,32,24,3,"#83b2b0");
    line(86,97,86,117,"#ede0b9",1.5);line(73,107,101,107,"#ede0b9",1.3);
    rounded(262,25,104,119,4,"#d7b27e","#8b7656",1);
    for(let i=0;i<3;i++)rounded(274+i*27,47,18,25,2,"#83a9a1","#ead8a7",1.7);
    rounded(288,94,32,49,4,"#648674");rounded(282,88,44,8,2,"#a67953");
    rounded(0,141,384,75,0,"#dbc097");
    for(let row=0;row<5;row++)for(let col=0;col<10;col++)rounded(col*43-row%2*21,147+row*15,39,12,2,(row+col)%3?"#ead4af":"#d2b58e","#bc9d7666",.5);
    for(const x of [148,235]) {line(x,68,x,145,"#756446",2.5);rounded(x-6,64,12,15,2,"#746245");rounded(x-4,67,8,10,1,"#ffe5a7");glow(x,72,19,"#ffdb7b52");}
    for(const x of [8,344])plant(x,133,true);
    rounded(167,129,57,6,2,"#a28256");line(174,135,174,146,"#77664a",2);line(216,135,216,146,"#77664a",2);
  }
  function garden() {
    gradient(0,125,"#b1d3cc","#f8e7bd");glow(279,25,54,"#ffeeb08c");
    polygon([[0,95],[62,47],[136,94],[210,43],[292,87],[357,45],[384,93],[384,138],[0,138]],"#a6b793");
    gradient(114,102,"#aec08a","#d1ce9a");
    path([["moveTo",162,120],["lineTo",215,120],["quadraticCurveTo",218,162,320,216],["lineTo",61,216],["quadraticCurveTo",163,160,162,120],["closePath"]],"#efdfb7");
    for(const [x,y] of [[36,72],[348,75]]) {
      rounded(x-4,y+17,9,64,2,"#95815a");
      for(let i=0;i<8;i++)ellipse(x+(i%3-1)*17,y+Math.floor(i/3)*13,23,17,["#709963","#83a873","#94b67b"][i%3]);
    }
    for(let i=0;i<42;i++){const x=i*67%384,y=135+i*29%76;if(x<105||x>277){rect(x,y,2,3,"#86a269");if(i%4===0){rect(x-1,y-2,4,2,"#e6c796");rect(x,y-3,2,4,"#e6c796");}}}
    for(const x of [62,261]) {
      rounded(x,133,61,7,2,"#ad8d5e");rounded(x,119,61,6,2,"#c2a171");
      line(x+6,125,x+6,153,"#7e7754",2.5);line(x+54,125,x+54,153,"#7e7754",2.5);
    }
    for(let i=0;i<8;i++)rect(135+i*19,179+i%3*10,5,2,"#d2bc9252");
  }
  function studio() {
    gradient(0,139,"#645748","#b59c76");floor(139);
    for(let x=12;x<384;x+=31)rounded(x,19,24,87,2,x%2?"#665f4e":"#746a54","#9b8b6b",.6);
    rounded(114,28,150,72,4,"#594f40","#d1b178",2);
    rounded(120,34,138,60,2,"#e3ce9e");
    rounded(128,41,30,10,2,"#a45b48");ctx.fillStyle="#fff1d2";ctx.font="bold 6px sans-serif";ctx.fillText("LIVE",134,48);
    for(let i=0;i<4;i++)rounded(130+i*25,61,18,21,2,["#89aa8b","#cdab78","#8bb0ad","#b79baf"][i]);
    rounded(18,105,78,30,3,"#987d58");rounded(15,102,84,6,2,"#d8bd8b");
    for(let i=0;i<4;i++)rounded(24+i*17,91,12,12,2,["#a7bd8d","#cfac77","#97b8b3","#c4b597"][i]);
    for(const x of [38,341]) {line(x,121,x-13,175,"#474c42",2);line(x,121,x+13,175,"#474c42",2);line(x,75,x,151,"#474c42",2);ellipse(x,78,16,16,"#eed9a4");ellipse(x,78,11,11,"#716955");glow(x,78,31,"#ffe3a522");}
    lamp(188,15);
    rounded(316,102,33,20,3,"#3f4d47");rounded(319,105,25,13,2,"#839f91");
    for(let x=307;x<361;x+=7)rect(x,131,3,5+x%3*3,"#c7b28a");
  }
  function pine(x,y,size,color) {
    line(x,y-3,x,y+size*.5,"#3e5946",2);
    for(let i=0;i<3;i++) {
      const yy=y-size+i*size/3,w=size*.45+i*2;
      path([["moveTo",x,yy],["quadraticCurveTo",x-w*.4,yy+size*.5,x-w,yy+size*.8],["quadraticCurveTo",x,yy+size*.94,x+w,yy+size*.8],["quadraticCurveTo",x+w*.4,yy+size*.5,x,yy],["closePath"]],color);
    }
  }
  function camp() {
    gradient(0, 216, "#192e4c", "#729891");
    glow(306, 31, 27, "#fbe4b938");
    ctx.fillStyle = "#f1dfab"; ctx.beginPath(); ctx.arc(306, 31, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#243e59"; ctx.beginPath(); ctx.arc(310, 28, 9, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 43; i++) ellipse((i * 53 + 17) % 380, 9 + i * 31 % 76, i % 5 ? .6 : 1, i % 5 ? .6 : 1, "#f1e4c49c");
    polygon([[0, 113], [59, 53], [126, 115], [204, 62], [291, 113], [350, 64], [384, 101], [384, 160], [0, 160]], "#365664");
    for (let i = 0; i < 12; i++) pine(i * 37 - 9, 113, 21 + i * 13 % 19, i % 2 ? "#284e47" : "#2e5b4c");
    gradient(134, 82, "#375d49", "#567057");
    shadow(70,140,39,5);
    path([["moveTo",39,139],["quadraticCurveTo",56,108,70,96],["quadraticCurveTo",79,119,103,139],["closePath"]],"#d1ac7c");
    path([["moveTo",70,96],["lineTo",73,139],["lineTo",103,139],["quadraticCurveTo",81,118,70,96],["closePath"]],"#b38a67");
    line(71,100,74,137,"#efcfa1",1);
    polygon([[63, 119], [73, 139], [55, 139]], "#3d5146");
    shadow(325,141,38,5);
    path([["moveTo",295,140],["quadraticCurveTo",308,115,323,103],["quadraticCurveTo",337,125,355,140],["closePath"]],"#91b09a");
    polygon([[323,103],[326,140],[355,140]],"#6e9788");line(323,107,326,138,"#c0d2ad",1);
    rounded(136,79,112,53,6,"#253f3c");rounded(140,83,104,45,4,"#4e7860");
    line(141,128,141,142,"#5c6950",2);line(243,128,243,142,"#5c6950",2);
    ctx.fillStyle = "#efddb4"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("THE XIRCLE", 192, 97); ctx.font = "5.5px sans-serif"; ctx.fillText("RESET / RECONNECT / RISE", 192, 120); ctx.textAlign = "start";
    for (let i = 0; i < 13; i++) {
      const x = 16 + i * 29, y = 53 + Math.sin(i / 12 * Math.PI) * 19;
      if (i < 12) line(x, y, x + 29, 53 + Math.sin((i + 1) / 12 * Math.PI) * 19, "#32413a");
      glow(x, y + 4, 11, "#ffdb7940"); ellipse(x, y + 4, 1.8, 2.6, "#ffe3a8");
    }
    glow(193, 178, 65, "#ffb76b39"); shadow(193, 183, 29, 7);
    for (let i = 0; i < 32; i++) {
      const x=i*67%384,y=149+i*17%61;
      line(x,y,x+1,y-3,"#b9c29028",.7);
    }
    for(const x of [144,226]) { rounded(x,166,18,5,2,"#937853");line(x+4,170,x+3,176,"#465c43",2);line(x+15,170,x+16,176,"#465c43",2); }
  }
  function travel(destination) {
    const dusk = ["Tokyo", "Shanghai", "Dubai", "Paris", "London"].includes(destination);
    gradient(0, 151, dusk ? "#6884a1" : "#77b6d0", dusk ? "#efb895" : "#d3e7d5");
    glow(58, 48, 45, "#ffe3a589");
    for (const [x,y,w] of [[104,37,28],[302,54,33],[338,27,17]]) {
      ellipse(x,y,w,5,"#ffffff35"); ellipse(x-8,y-3,w*.6,6,"#ffffff2b");
    }
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
    rounded(138,180,98,20,8,"#efdfbc90");
    for(const x of [9,367]) { line(x,117,x,164,"#52726f",2); ellipse(x,116,5,6,"#fff0bd"); glow(x,117,18,"#ffe5b42b"); }

  }
  function organization(phase = 7) {
    gradient(0,138,"#dbe4d6","#eef0de"); floor(139,true);
    rounded(0,0,384,12,0,"#31584f");
    windowScene(141,24,222,78,true);
    rounded(17,26,108,74,6,"#e9e4cf","#658576",1.2);
    rounded(22,31,98,64,4,"#365f58");
    const nodes=[[71,44],[44,64],[98,64],[32,82],[57,82],[85,82],[110,82]];
    for(let i=1;i<nodes.length;i++){const parent=nodes[Math.floor((i-1)/2)];line(...parent,...nodes[i],"#91ba965e",1.4);}
    nodes.forEach(([x,y],i)=>{ellipse(x,y,i?3.5:5,i?3.5:5,i?"#b4d6ac":"#f0cc83");ellipse(x-.7,y-.8,1,1,"#ffffff99");});
    rounded(15,109,111,26,4,"#779580"); rounded(13,108,115,4,2,"#d8cbae");
    for(const x of [39,72,105]) { rounded(x,117,5,2,1,"#eddcaa"); }
    plant(352,128,true);
    lamp(186,21); lamp(292,21);
    ellipse(195,180,135,26,"#91ad9d66"); ellipse(195,179,127,21,"#bfd2bc66");
    for(let i=0;i<Math.max(1,phase-6);i++) {
      const x=147+i*63;
      rounded(x,114,48,18,5,"#708f83"); rounded(x+4,112,40,6,3,"#a7c3ac");
      line(x+8,131,x+7,139,"#466b5c",2);line(x+40,131,x+41,139,"#466b5c",2);
    }
    rect(0,135,384,2,phase>=9?"#caa769":"#799d81");
    if(phase>=8) { rounded(17,14,108,5,2,"#ddc593"); }
  }
  function finale() {
    gradient(0,145,"#8fb3b4","#f5dfb3"); glow(282,48,69,"#ffe4a85c");
    skyline(142,"#89a69b66",3);
    gradient(142,74,"#a6bd92","#d4d6ad");
    path([["moveTo",170,141],["lineTo",213,141],["lineTo",282,216],["lineTo",102,216],["closePath"]],"#ecdec0");
    shadow(194,146,86,10);
    rounded(130,47,124,96,5,"#466f6a"); rounded(137,38,110,106,6,"#709a8c");
    rounded(127,43,130,7,2,"#f0dfb6");
    for(let row=0;row<3;row++) for(let col=0;col<5;col++) {
      const x=145+col*19,y=56+row*22;
      rounded(x,y,13,17,2,(row+col)%3?"#b9d2bc":"#f5ddb2");
      line(x+6,y,x+6,y+17,"#608d7c",.8);line(x,y+10,x+13,y+10,"#608d7c",.8);
      polygon([[x+1,y+1],[x+5,y+1],[x+12,y+15],[x+8,y+15]],"#ffffff28");
    }
    rounded(176,117,31,27,4,"#315d59");rounded(181,121,21,23,3,"#d0dabe");line(192,122,192,144,"#567b6c",1);
    rounded(158,28,72,13,5,"#2c594e");ctx.fillStyle="#f5e6be";ctx.font="bold 6px sans-serif";ctx.textAlign="center";ctx.fillText("X-VISOR COMMUNITY",194,37);ctx.textAlign="start";
    for(const x of [47,329]) { ellipse(x,147,31,13,"#85a675");plant(x-11,144,true); }
    for(const x of [83,292]) { line(x,120,x,153,"#5e7b63",2);ellipse(x,119,5,7,"#ffe6aa");glow(x,119,18,"#ffdb8438"); }
    for(const x of [32,327]) { rounded(x,158,29,5,2,"#947d5e");line(x+4,162,x+4,169,"#64775f",2);line(x+25,162,x+25,169,"#64775f",2); }
  }

  /** Human figures share the same limb geometry in every room and posture. */
  function character(x, footY, palette, options = {}) {
    const skin=palette.skin||"#dca57e", hair=palette.hair||"#293f3a", shirt=palette.shirt||"#679b86";
    const traits=getCharacterTraits(palette, options.player), {hairStyle,clothing,pants,accessory}=traits;
    const teem=palette.characterId==="teem", ako=palette.characterId==="ako", dress=clothing==="dress";
    const facing=options.direction==="left"?-1:1;
    const jump=options.jump||0, step=options.walk?Math.sin(options.walk)*2:0;
    const seated=Boolean(options.seated), top=footY-jump-72;
    const breath=options.breath||0;
    const longHair=hairStyle==="long";
    const center=x+16, shoulderY=top+29+breath;
    shadow(center,footY+1,18-Math.min(4,jump/3),4);
    // The chair shares the seated hip anchor. Its back, cushion and legs
    // remain visible around the body, with both shoes resting on the floor.
    if(seated) {
      const back=center-facing*8, seat=top+49;
      const cushion=options.chairColor || (options.player ? "#94b4a5" : "#bfad8e");
      shadow(center,footY+3,29,4.5);
      line(center-facing*12,seat+3,center-facing*16,footY+2,"#637b68",2.4);
      line(center+facing*12,seat+3,center+facing*16,footY+2,"#718572",2.6);
      rounded(back-12,top+26,24,25,6,cushion,"#657e68",.8);
      rounded(back-9,top+29,18,16,4,"#ffffff1d");
      rounded(center-17,seat,34,6,3,cushion,"#657e68",.8);
      line(center-13,seat+1.5,center+13,seat+1.5,"#f6eed23b",.7);
      rounded(center-10,top+43,20,9,3,dress?shirt:pants);
      // Far and near thighs have separate knee, shin and foot positions.
      const leg=(hip,knee,ankle,kneeY,floor,color)=>{
        line(hip,top+48,knee,kneeY,color,7.3);
        line(knee,kneeY,ankle,floor-5,color,6.5);
        const toe=ankle+facing*2;
        rounded(toe-6.5,floor-6,13,5.5,2.4,dress?"#302b2b":"#faf3de","#6e8271",.6);
        if(!dress) {line(toe-2.5,floor-4,toe+2.5,floor-4,"#baac93",.7);line(toe-1.5,floor-2.8,toe+3,floor-2.8,"#d4c8af",.6);}
        line(toe-5.5,floor-.6,toe+5.5,floor-.6,"#9bab97",.8);
      };
      leg(center-facing*2,center+facing*10,center+facing*12,top+50,footY-2,dress?skin:pants);
      line(center+facing*10,top+51,center+facing*12,footY-7,"#fff5d41c",2);
      leg(center-facing*6,center+facing*21,center+facing*22,top+52,footY,dress?skin:pants);
    } else {
      path([["moveTo",center-10,top+46],["lineTo",center+10,top+46],["lineTo",center+9+step,footY-5],["lineTo",center+3+step,footY-5],["lineTo",center,top+54],["lineTo",center-3-step,footY-5],["lineTo",center-9-step,footY-5],["closePath"]],dress?skin:teem?"#29282a":pants,dress?"#ab7858":"#283e37",.6);
      line(center+4,top+50,center+6+step,footY-8,"#a6b69d35",1.5);
      line(center-7,top+50,center-6-step,footY-9,"#172e2926",1.5);
      rounded(center-11-step,footY-7,12,6,2.7,dress?"#2c292b":"#fff7e5","#617971",.6);
      rounded(center+1+step,footY-7,12,6,2.7,dress?"#2c292b":"#fff7e5","#617971",.6);
      line(center-10-step,footY-1,center-step,footY-1,"#9baea1",1);
      line(center+2+step,footY-1,center+12+step,footY-1,"#9baea1",1);
      if(!dress)for(const xx of [center-5-step,center+7+step]) {line(xx-3,footY-4,xx+2,footY-4,"#b6aa91",.8);line(xx-2,footY-2.7,xx+3,footY-2.7,"#d3c6ab",.6);}
    }
    // Each arm has a shoulder, elbow, wrist and hand. The wearable is painted
    // around that wrist after the forearm, so it can never detach or be held.
    function arm(side, foreground) {
      const sx=center+side*10, sy=shoulderY+1;
      let ex=center+side*14,ey=shoulderY+11,wx=center+side*13,wy=shoulderY+19;
      if(options.pose==="celebrate") { ex=center+side*19;ey=shoulderY-6;wx=center+side*22;wy=shoulderY-17; }
      else if(options.pose==="talk"&&side===facing) { ex=center+side*16;ey=shoulderY+10;wx=center+side*24;wy=shoulderY+5; }
      else if(options.pose==="phone"&&foreground) { ex=center+side*18;ey=shoulderY+7;wx=center+side*11;wy=shoulderY-8; }
      else if(["write","read"].includes(options.pose)&&foreground) { ex=center+side*15;ey=shoulderY+12;wx=center+side*19;wy=shoulderY+8+(options.gesture||0); }
      else if(["present","handoff","welcome"].includes(options.pose)&&foreground) { ex=center+side*17;ey=shoulderY+8;wx=center+side*27;wy=shoulderY+5+(options.gesture||0); }
      else if(options.pose==="listen"&&foreground) { ex=center+side*13;ey=shoulderY+13;wx=center+side*7;wy=shoulderY+15; }
      else if(options.pose==="band"&&foreground) { ex=center+side*15;ey=shoulderY+10;wx=center+side*2;wy=shoulderY+4; }
      else if(seated&&foreground) {ex=center+side*15;ey=shoulderY+11;wx=center+side*23;wy=shoulderY+9;}
      else if(step) { wx+=side*step;wy-=Math.abs(step); }
      line(sx,sy,ex,ey,dress?"#b58361":"#455a465c",dress?6.1:9);
      line(sx,sy,ex,ey,dress?skin:shirt,dress?5.3:8);line(sx+side,sy+2,ex,ey,dress?skin:shirt,dress?4.8:6);
      line(sx-side*1.3,sy+1,ex-side*1.5,ey-1,"#f7e6c122",1.1);
      line(ex,ey,wx,wy,"#a47e5e",6);
      line(ex,ey,wx,wy,skin,5.2);
      line(ex-.5,ey-1,wx-.5,wy-1,"#ffedce2b",1.1);
      const angle=Math.atan2(wy-ey,wx-ex);
      const hx=wx+Math.cos(angle)*2.2,hy=wy+Math.sin(angle)*2.2;
      ellipse(hx,hy,2.7,3.1,skin);
      if(foreground&&options.pose==="phone") {
        rounded(hx-2.7,hy-7,5.4,10,1.4,"#294c47","#c5d9bd",.5);
        rounded(hx-1.7,hy-5.5,3.4,6,1,"#a3cfbd");
        ellipse(hx,hy+1.7,.5,.5,"#edf7da");
      }
      if(foreground&&options.pose==="write") {
        line(hx-2,hy+5,hx+2,hy-4,"#d0a56f",1.5);
        line(hx-2,hy+5,hx-2.5,hy+6,"#466b5a",.7);
      }
      if(options.band&&foreground) {
        ctx.save();ctx.translate(wx-Math.cos(angle)*1.1,wy-Math.sin(angle)*1.1);ctx.rotate(angle-Math.PI/2);
        rounded(-3.2,-2.6,6.4,4.5,1.5,"#294c47");
        rounded(-2.1,-2.2,4.2,3.6,1,"#91d8bf","#eefbe560",.5);
        rounded(-1.35,-1.4,2.7,2,.5,options.bandActive?"#dbffe9":"#244e4b");
        if(options.bandActive) glow(0,0,7,"#94f2c64f");
        ctx.restore();
      }
    }
    // Long hair is two side locks behind the neck and shirt. There is no
    // solid hair block beneath the chin, so it cannot read as a beard ring.
    if(hairStyle==="ponytail") {
      const back=center-facing*9;
      path([["moveTo",back,top+5],["quadraticCurveTo",back-facing*14,top+3,back-facing*10,top+23],["quadraticCurveTo",back-facing*8,top+31,back-facing*13,top+37],["quadraticCurveTo",back-facing*1,top+35,back-facing*2,top+22],["lineTo",back+facing*3,top+9],["closePath"]],hair);
      line(back-facing*5,top+13,back-facing*6,top+28,"#dcc09624",1);
      rounded(back-facing*3-2,top+7,4,3,1,palette.accent||"#dbad79");
    } else if(hairStyle==="bun") {
      ellipse(center-facing*6,top-2+breath,6.8,6.4,hair);
      line(center-facing*8,top-4+breath,center-facing*3,top-5+breath,"#dcc09638",1);
      rounded(center-facing*5-3,top+2+breath,6,2,1,palette.accent||"#e5ba79");
    } else if(hairStyle==="bob") {
      for(const side of [-1,1])path([["moveTo",center+side*7,top+4],["quadraticCurveTo",center+side*15,top+9,center+side*12,top+25],["lineTo",center+side*6,top+24],["lineTo",center+side*7,top+4],["closePath"]],hair);
    }
    if(longHair) {
      for(const side of [-1,1]) {
        path([["moveTo",center+side*6,top+5+breath],["quadraticCurveTo",center+side*13,top+10+breath,center+side*11.5,top+22+breath],["quadraticCurveTo",center+side*12,top+28+breath,center+side*7.5,top+31+breath],["lineTo",center+side*6,top+24+breath],["quadraticCurveTo",center+side*8,top+14+breath,center+side*6,top+5+breath],["closePath"]],hair);
        line(center+side*10,top+16+breath,center+side*9.5,top+25+breath,"#ffffff0e",.8);
      }
    }
    arm(-facing,false);
    if(clothing==="hoodie")ellipse(center,top+29+breath,13,6.5,shirt);
    path([["moveTo",center-6,top+26+breath],["quadraticCurveTo",center-12,top+27+breath,center-12,top+34],["lineTo",center-10,top+48],["quadraticCurveTo",center,top+51,center+10,top+48],["lineTo",center+12,top+34],["quadraticCurveTo",center+11,top+27+breath,center+6,top+26+breath],["closePath"]],shirt,"#38523e",.7);
    path([["moveTo",center-9,top+32],["quadraticCurveTo",center-8,top+44,center-7,top+47],["lineTo",center-3,top+48],["lineTo",center-5,top+31],["closePath"]],"#ffffff15");
    polygon([[center+7,top+32],[center+10,top+35],[center+8,top+46],[center+4,top+49],[center+2,top+47],[center+6,top+45]],"#173c2f22");
    line(center-7,top+47,center+7,top+47,"#203e302b",.7);
    for(const [dx,dy] of [[-7,35],[-6,38],[-4,43],[6,41]])rect(center+dx,top+dy,1.5,.7,"#f9eacb24");
    rounded(center-3.5,top+22+breath,7,10,2,skin);
    if(teem) {
      polygon([[center-5,top+27],[center,top+32],[center+5,top+27],[center+5,top+49],[center-5,top+49]],"#f3e8d1");
      line(center-7,top+28,center-5,top+48,"#ad4239",2);line(center+7,top+28,center+5,top+48,"#be4c41",2);
      line(center-4,top+34,center+2,top+46,"#d8c5a826",1);
    } else if(dress) {
      polygon([[center-7,top+29],[center,top+33],[center+7,top+28],[center+10,top+45],[center+13,top+55],[center-12,top+54],[center-9,top+44]],shirt);
      line(center-4,top+37,center+5,top+47,"#b1a18d20",1);
      line(center-3,top+30,center+5,top+32,"#dfc29a",.7);
    } else if(clothing==="cardigan") {
      polygon([[center-5,top+29],[center,top+33],[center+5,top+29],[center+5,top+48],[center-5,top+48]],palette.accent||"#f1e6cf");
      line(center-6,top+29,center-5,top+48,"#28463750",1.1);line(center+6,top+29,center+5,top+48,"#28463750",1.1);
      for(let i=0;i<3;i++)ellipse(center+6.5,top+35+i*4.5,.7,.7,"#f0e1bd");
    } else if(clothing==="hoodie") {
      path([["moveTo",center-5,top+29],["quadraticCurveTo",center,top+34,center+5,top+29]],shirt,"#395c485c",1);
      line(center-3,top+33,center-4,top+38,"#f9efd1",.9);line(center+3,top+33,center+4,top+37,"#f9efd1",.9);
      rounded(center-6,top+40,12,6,2,"#ffffff18","#28493855",.6);
    } else if(clothing==="polo"||clothing==="shirt") {
      polygon([[center-5,top+28],[center,top+32],[center-3,top+35]],"#e5eed8");polygon([[center+5,top+28],[center,top+32],[center+3,top+35]],"#f7f3df");
      if(clothing==="shirt") {line(center,top+33,center,top+48,"#ebead45e",1);for(let i=0;i<3;i++)ellipse(center,top+35+i*5,.65,.65,"#f1e9ce");}
      rounded(center+4,top+36,4,5,1,"#ffffff25");
      ellipse(center+6,top+38,1.1,1.1,palette.accent||"#e7cc83");
    } else {
      path([["moveTo",center-5,top+29],["quadraticCurveTo",center,top+34,center+5,top+29]],shirt,"#f3eed078",1.4);
      rounded(center-4,top+38,8,5,1.5,palette.accent||"#e7cc83");
    }
    if(accessory==="scarf") {
      polygon([[center-7,top+30],[center,top+33],[center+6,top+30],[center+4,top+35],[center-2,top+36]],palette.accent||"#e1b373");
      polygon([[center-2,top+34],[center+3,top+35],[center+1,top+45],[center-4,top+43]],palette.accent||"#e1b373");
      line(center-1,top+37,center-2,top+42,"#fff0d766",.8);
    }
    // Hair silhouette behind a softly shaded, three-quarter face.
    const faceWidth=traits.faceShape==="round"?9.8:9,faceHeight=traits.faceShape==="round"?10.2:10.7;
    ellipse(center,top+12+breath,Math.max(10.5,faceWidth+.8),12,hairStyle==="buzz"?skin:hair);
    ellipse(center+facing*.7,top+15+breath,faceWidth,faceHeight,skin);
    ctx.strokeStyle="#9d7657";ctx.lineWidth=.55;ctx.stroke();
    ctx.save();ctx.beginPath();ctx.ellipse(center+facing*.7,top+15+breath,faceWidth-.2,faceHeight-.2,0,0,Math.PI*2);ctx.clip();
    polygon([[center+5,top+7+breath],[center+10,top+10+breath],[center+10,top+26+breath],[center+2,top+26+breath],[center+5,top+23+breath],[center+6,top+18+breath]],"#9766422a");
    polygon([[center-6,top+9+breath],[center-2,top+7+breath],[center,top+11+breath],[center-4,top+13+breath],[center-5,top+19+breath],[center-7,top+18+breath]],"#ffedc52e");
    ctx.restore();
    ellipse(center-facing*8.6,top+16+breath,2,3,skin);
    line(center-facing*9,top+15+breath,center-facing*9,top+17+breath,"#b47c5959",.7);
    if(hairStyle==="buzz") {
      path([["moveTo",center-9.5,top+10+breath],["quadraticCurveTo",center-10,top+1+breath,center,top+1+breath],["quadraticCurveTo",center+10,top+1+breath,center+9.5,top+10+breath],["lineTo",center+7,top+6+breath],["quadraticCurveTo",center,top+4+breath,center-7,top+6+breath],["closePath"]],hair);
      for(let i=0;i<5;i++)line(center-6+i*3,top+4+breath,center-5+i*3,top+3.5+breath,"#f3dfb732",.5);
    } else if(hairStyle==="bob") {
      path([["moveTo",center-10,top+14+breath],["quadraticCurveTo",center-12,top+1+breath,center,top+1+breath],["quadraticCurveTo",center+12,top+1+breath,center+11,top+14+breath],["lineTo",center+7,top+9+breath],["lineTo",center+2,top+10+breath],["lineTo",center-2,top+7+breath],["lineTo",center-5,top+11+breath],["lineTo",center-10,top+14+breath],["closePath"]],hair);
      line(center-7,top+5+breath,center-8,top+10+breath,"#cfb88d35",1);
    } else if(hairStyle==="curly") {
      for(const [dx,dy,r] of [[-9,9,4],[-10,4,4.5],[-6,0,5],[0,-1,5.5],[6,1,5],[10,5,4],[8,9,3.5]])ellipse(center+dx,top+dy+breath,r,r,hair);
      for(const [dx,dy] of [[-7,1],[-1,-2],[6,3]])path([["moveTo",center+dx-1,top+dy+breath],["quadraticCurveTo",center+dx+2,top+dy-1+breath,center+dx+2,top+dy+1+breath]],hair,"#d7bd9233",.9);
    } else {
      path([["moveTo",center-9,top+12+breath],["quadraticCurveTo",center-13,top+2+breath,center-1,top+1+breath],["quadraticCurveTo",center+12,top-1+breath,center+10,top+12+breath],["quadraticCurveTo",center+5,top+9+breath,center+4,top+6+breath],["quadraticCurveTo",center-2,top+11+breath,center-9,top+12+breath],["closePath"]],hair);
      path([["moveTo",center-7,top+6+breath],["quadraticCurveTo",center-2,top+1+breath,center+4,top+4+breath]],hair,"#d4ba8438",1.7);
    }
    if(teem||hairStyle==="spiky") {
      polygon([[center-11,top+9],[center-13,top+3],[center-8,top+3],[center-10,top-2],[center-4,top],[center-2,top-5],[center+2,top-2],[center+7,top-5],[center+6,top],[center+12,top+2],[center+9,top+5],[center+12,top+10],[center+5,top+5],[center+1,top+4],[center-5,top+8]],hair);
      for(let i=0;i<3;i++)line(center-7+i*5,top+3,center-3+i*4,top+1,"#695a463e",1);
    }
    if(ako) {
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipse(center+8+Math.cos(a)*2.4,top-3+Math.sin(a)*2.4,2.3,2.3,"#f6deb5");}
      ellipse(center+8,top-3,1.7,1.7,"#d7b17c");
      line(center+6,top+8,center+8,top+5,"#e8dcc5",.8);
      line(center-facing*9,top+20,center-facing*9,top+25,"#eaddc1",.7);ellipse(center-facing*9,top+26,1,1.4,"#f6e9c9");
    }
    if(accessory==="headband")path([["moveTo",center-9,top+8+breath],["quadraticCurveTo",center,top-2+breath,center+9,top+7+breath]],"transparent",palette.accent||"#e7bf81",2.1);
    if(accessory==="hairclip") {line(center+6,top+8+breath,center+10,top+5+breath,palette.accent||"#e4b968",1.8);line(center+7,top+10+breath,center+11,top+7+breath,palette.accent||"#e4b968",1.3);}
    if(accessory==="earrings") {line(center-facing*9,top+19+breath,center-facing*9,top+22+breath,"#d4a952",.7);ellipse(center-facing*9,top+23+breath,1.5,2,palette.accent||"#e6bf69");}
    const ey=top+15+breath,offset=facing*1.6;
    for(const xx of [center-3+offset,center+3+offset]) {
      if(options.blink)line(xx-1,ey,xx+1,ey,"#2a403b",.9);
      else {ellipse(xx,ey,1.05,1.5,"#2a403b");ellipse(xx+.25,ey-.4,.28,.35,"#fffae5");}
      line(xx-1.4,ey-3.2,xx+1.3,ey-3.4,hair,.65);
    }
    if(teem||traits.glasses==="square") {
      for(const xx of [center-3+offset,center+3+offset])rounded(xx-2.8,ey-2.4,5.5,4.9,1,"#ffffff12","#262421",.9);
      line(center-.3+offset,ey-1,center+.3+offset,ey-1,"#292521",.9);
      line(center-8,ey-1,center-6+offset,ey-1,"#292521",.9);
    } else if(traits.glasses==="round") {
      for(const xx of [center-3+offset,center+3+offset]) {ctx.beginPath();ctx.ellipse(xx,ey,2.8,2.8,0,0,Math.PI*2);ctx.strokeStyle="#594d3d";ctx.lineWidth=.8;ctx.stroke();}
      line(center-.3+offset,ey-.5,center+.3+offset,ey-.5,"#594d3d",.8);
      line(center-8.5,ey-.5,center-6+offset,ey-.5,"#594d3d",.8);
    }
    ellipse(center+facing*5,top+19+breath,2.3,1,"#c8736326");
    if(traits.freckles)for(const side of [-1,1])for(const [dx,dy] of [[0,0],[2,.5],[1,2]])ellipse(center+side*(4+dx)+offset,ey+3+dy,.4,.4,"#a9704c9c");
    line(center+offset,ey+1.4,center+offset+facing*.7,ey+3,"#b474573b",.7);
    ctx.beginPath();ctx.moveTo(center-2+offset,top+21+breath);ctx.quadraticCurveTo(center+offset,top+23+(options.pose==="celebrate"?1:0)+breath,center+2.2+offset,top+20.8+breath);ctx.strokeStyle="#985e50";ctx.lineWidth=.85;ctx.stroke();
    // A pocket notebook rests against the torso; the foreground hand overlaps
    // its edge. The wrist device stays on that same arm, never on the notebook.
    if(options.notebook||options.pose==="read") {
      rounded(center+facing*9-6,shoulderY+5,13,17,2,"#e2c18d","#6f8e75",.7);
      rounded(center+facing*9-4,shoulderY+7,9,13,1,"#fff2d5");
      for(let i=0;i<3;i++)line(center+facing*9-2,shoulderY+10+i*3,center+facing*9+3,shoulderY+10+i*3,"#9aaf8d",.6);
    }
    arm(facing,true);
  }
  return { room, kitchen, community, garden, studio, camp, travel, organization, finale, plant, shadow, glow, polygon, line, rounded, ellipse, character };
}
