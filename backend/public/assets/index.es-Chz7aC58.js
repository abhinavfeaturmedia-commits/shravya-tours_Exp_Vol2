import{r as u,j as O}from"./index-CPT6ZqTJ.js";function ba(t){const e=t.trim(),a=e.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(a){const r=a[1].length===3?a[1].split("").map(o=>o+o).join(""):a[1];return[parseInt(r.slice(0,2),16),parseInt(r.slice(2,4),16),parseInt(r.slice(4,6),16)]}const n=e.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);return n?[Math.round(+n[1]),Math.round(+n[2]),Math.round(+n[3])]:null}function Pa(t){const e=ba(t);return e?`rgb(${e[0]}, ${e[1]}, ${e[2]})`:null}function We(t){const e=ba(t);return e?`${e[0]}, ${e[1]}, ${e[2]}`:null}const La={dark:{strokeOpacity:1.16,innerOpacity:.47,bloomOpacity:.89,innerShadow:"rgba(255, 255, 255, 0.1)",saturation:1.2,brightness:1.1},light:{strokeOpacity:1.2,innerOpacity:.85,bloomOpacity:.5,innerShadow:"rgba(0, 0, 0, 0.08)",saturation:1.6,brightness:.95,hueRange:40,hueDuration:8.5,hueBase:5,strength:.8,bandStrength:1.7}},we=[{x:0,w:74,h:46,band:0},{x:-36,w:54,h:40,band:1},{x:36,w:54,h:40,band:1},{x:-72,w:48,h:32,band:2},{x:72,w:48,h:32,band:2},{x:-108,w:42,h:26,band:1},{x:108,w:42,h:26,band:1}],Ea=36,Ha=Ea*we.length,Da={colorful:{dark:["rgb(255, 70, 120)","rgb(60, 190, 255)","rgb(175, 70, 255)","rgb(60, 220, 130)","rgb(255, 150, 40)","rgb(90, 100, 255)","rgb(40, 200, 190)"],light:["rgb(255, 201, 21)","rgb(126, 196, 255)","rgb(180, 40, 230)","rgb(235, 100, 160)","rgb(255, 176, 122)","rgb(154, 160, 255)","rgb(127, 217, 238)"]},mono:{dark:["rgb(215, 215, 215)","rgb(180, 180, 180)","rgb(190, 190, 190)","rgb(160, 160, 160)","rgb(170, 170, 170)","rgb(150, 150, 150)","rgb(155, 155, 155)"],light:["rgb(60, 60, 60)","rgb(90, 90, 90)","rgb(85, 85, 85)","rgb(110, 110, 110)","rgb(105, 105, 105)","rgb(125, 125, 125)","rgb(120, 120, 120)"]},ocean:{dark:["rgb(80, 140, 255)","rgb(40, 200, 230)","rgb(120, 90, 255)","rgb(30, 170, 210)","rgb(160, 80, 240)","rgb(60, 110, 255)","rgb(40, 190, 180)"],light:["rgb(40, 100, 240)","rgb(20, 160, 200)","rgb(90, 60, 230)","rgb(20, 130, 180)","rgb(130, 50, 220)","rgb(40, 80, 230)","rgb(20, 150, 150)"]},sunset:{dark:["rgb(255, 110, 60)","rgb(255, 180, 40)","rgb(255, 60, 90)","rgb(255, 210, 80)","rgb(240, 70, 140)","rgb(255, 140, 50)","rgb(230, 50, 110)"],light:["rgb(235, 80, 30)","rgb(230, 150, 10)","rgb(230, 30, 70)","rgb(225, 175, 30)","rgb(215, 40, 110)","rgb(235, 110, 20)","rgb(205, 30, 90)"]},forest:{dark:["rgb(70, 220, 120)","rgb(40, 200, 180)","rgb(140, 230, 80)","rgb(30, 170, 140)","rgb(190, 235, 70)","rgb(50, 190, 110)","rgb(30, 150, 120)"],light:["rgb(30, 170, 80)","rgb(20, 150, 130)","rgb(90, 180, 30)","rgb(20, 130, 100)","rgb(130, 180, 20)","rgb(30, 150, 80)","rgb(20, 120, 90)"]},candy:{dark:["rgb(255, 90, 170)","rgb(255, 120, 220)","rgb(210, 80, 255)","rgb(255, 150, 190)","rgb(180, 110, 255)","rgb(255, 70, 140)","rgb(230, 100, 240)"],light:["rgb(235, 40, 140)","rgb(230, 70, 190)","rgb(180, 40, 230)","rgb(235, 100, 160)","rgb(150, 70, 230)","rgb(230, 30, 110)","rgb(200, 60, 210)"]},ice:{dark:["rgb(150, 230, 255)","rgb(90, 200, 255)","rgb(190, 240, 255)","rgb(120, 190, 255)","rgb(160, 220, 250)","rgb(80, 170, 255)","rgb(200, 235, 255)"],light:["rgb(30, 160, 220)","rgb(20, 130, 210)","rgb(60, 180, 230)","rgb(40, 120, 220)","rgb(50, 160, 220)","rgb(20, 110, 220)","rgb(70, 170, 230)"]},gold:{dark:["rgb(255, 200, 70)","rgb(255, 170, 40)","rgb(255, 220, 110)","rgb(240, 150, 30)","rgb(255, 235, 140)","rgb(230, 160, 40)","rgb(250, 210, 90)"],light:["rgb(200, 140, 10)","rgb(190, 120, 0)","rgb(210, 160, 30)","rgb(180, 110, 0)","rgb(205, 170, 40)","rgb(175, 115, 5)","rgb(195, 150, 20)"]}};function Ra(t,e){const a=t.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);return a?`rgba(${a[1]}, ${a[2]}, ${a[3]}, ${e.toFixed(2)})`:t}function at(t,e=1){return Math.max(.5,Math.round(t*e*100)/100)}function ja(t,e){return`calc(50% + (var(--vb-cx-${e}) + var(--vb-x${t}-${e})) * var(--vb-w-${e}) * var(--vb-z-${e}, 1))`}function rt({id:t,colors:e,alpha:a,sw:n,sh:r,y:o,fade:s,count:i}){return(i?we.slice(0,i):we).map((f,c)=>{const g=a>=1?e[c%e.length]:Ra(e[c%e.length],a),m=`calc(${Math.round(f.w*n)}px * var(--vb-w-${t}) * var(--vb-z-${t}, 1))`,v=`calc(${Math.round(f.h*r)}px * var(--vb-h-${t}) * var(--vb-l${c}-${t}) * var(--vb-z-${t}, 1))`,d=`calc(100% + (${o}px + var(--vb-y${c}-${t})) * var(--vb-z-${t}, 1))`;return`radial-gradient(ellipse ${m} ${v} at ${ja(c,t)} ${d}, ${g} 0%, transparent ${s}%)`}).join(`,
    `)}function qa(t){const{id:e,borderRadius:a,borderWidth:n,strokeOpacity:r,innerOpacity:o,bloomOpacity:s,innerShadow:i,colorVariant:f,colors:c,brightness:g,saturation:m,theme:v,hueBase:d=0,glowSize:h=1,glowWidth:S=1,glowHeight:L=1,strokeScale:E=1,innerScale:I=1,innerHeight:N=1,bloomScale:V=1,bloomHeight:H=1,coreSize:D=1,coreLight:j=0,coreLightWidth:p=1,coreLightHeight:Q=1,rangeWidth:q=1,rangeHeight:ee=1,softness:se=1,distortion:R=!1,scale:B=1}=t,A=Math.round(28*B*10)/10,U=Math.round(9*B*10)/10,P=Math.max(0,a-n),$=Math.round(Math.max(40,Math.min(95,70*se))),T=w=>S*w,x=w=>L*w,C=w=>Math.round(w*10)/10,y=`var(--vb-z-${e}, 1)`,M=w=>`calc(${C(w)}px * ${y})`,ae=v==="dark",re=Da[f][ae?"dark":"light"].map((w,F)=>{const G=c==null?void 0:c[F];return G&&Pa(G)||w}),oe=f==="mono"?.6:1,he=(r*oe).toFixed(2),Y=(o*oe).toFixed(2),be=(s*oe).toFixed(2),b=g.toFixed(2),K=m.toFixed(2),X=`hue-rotate(calc(var(--voice-hue-base, ${d}deg) + var(--vb-hue-${e})))`,ue=R?` url(#vb-distort-${e})`:"",ge=`filter: ${X} brightness(${b}) saturate(${K});`,Re=`filter: ${X} brightness(${b}) saturate(${K})${ue};`,je=`filter: blur(${M(at(10,h))}) ${X} brightness(${b}) saturate(${K});`,qe=`filter: blur(${M(at(10,h))}) ${X} brightness(${b}) saturate(${K})${ue};`,ve=`calc(50% + var(--vb-cx-${e}) * var(--vb-w-${e}) * ${y})`,ke=`calc(100% + (2px + var(--vb-cy-${e})) * ${y})`,Be=ae?`radial-gradient(ellipse calc(${C(30*D)}px * var(--vb-w-${e}) * ${y}) calc(${C(30*D)}px * var(--vb-h-${e}) * ${y}) at ${ve} ${ke}, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.14) 30%, transparent 65%)`:`radial-gradient(ellipse calc(${C(40*D)}px * var(--vb-w-${e}) * ${y}) calc(${C(30*D)}px * var(--vb-h-${e}) * ${y}) at ${ve} ${ke}, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.22) 35%, transparent 70%)`,Ie=rt({id:e,colors:re,alpha:1,sw:T(E),sh:x(E),y:2,fade:$}),Ue=rt({id:e,colors:re,alpha:.46,sw:T(.9*I),sh:x(.9*I*N),y:0,fade:$}),Ke=rt({id:e,colors:re,alpha:ae?.9:.7,sw:T(1.15*V),sh:x(1.5*V*H),y:0,fade:Math.min(95,$+2)}),ie=(w,F,G,te=0)=>`radial-gradient(ellipse calc(${C(w*q)}px * var(--vb-w-${e}) * var(--vb-mw-${e}) * ${y}) calc((${C(F*ee)}px * var(--vb-h-${e}) + var(--vb-bh-${e})) * ${y}) at ${ve} calc(100% + var(--vb-cy-${e}) * ${y}), white 0%, rgba(255, 255, 255, 0.5) ${G}%${te>0?`, rgba(255, 255, 255, ${te}) 85%`:""}, transparent 100%)`,pe=(w,F)=>`opacity: calc(var(--vb-opacity-${e}, 1) * var(--vb-glow-${e}) * ${F} * var(--voice-${w}-opacity, 1) * var(--voice-strength, 1));`,Ce=(w,F,G,te)=>`${w} {
  ${F}
  position: absolute;
  inset: 0;
  border-radius: ${M(a)};
  background: ${Ue};
  box-shadow: inset 0 0 ${M(U)} 1px ${i};
  -webkit-mask-image:
    ${ie(170,64,45,.3)},
    linear-gradient(white, transparent ${M(A)}, transparent calc(100% - ${A}px * ${y}), white),
    linear-gradient(to right, white, transparent ${M(A)}, transparent calc(100% - ${A}px * ${y}), white);
  -webkit-mask-composite: source-in, source-over;
  mask-image:
    ${ie(170,64,45,.3)},
    linear-gradient(white, transparent ${M(A)}, transparent calc(100% - ${A}px * ${y}), white),
    linear-gradient(to right, white, transparent ${M(A)}, transparent calc(100% - ${A}px * ${y}), white);
  mask-composite: intersect, add;
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  z-index: 1;
  ${G}
  ${pe("inner",Y)}
  ${te}
}`;return`
@property --vb-opacity-${e} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-voice-beam="${e}"] {
  position: relative;
  border-radius: ${a}px;
  overflow: hidden;
  --vb-h-${e}: 0.8;
  --vb-w-${e}: 1;
${we.map((w,F)=>`  --vb-x${F}-${e}: ${w.x}px;
  --vb-l${F}-${e}: 1;
  --vb-y${F}-${e}: 0px;`).join(`
`)}
  --vb-glow-${e}: 0.4;
  --vb-z-${e}: 1;
  --vb-cx-${e}: 0px;
  --vb-cy-${e}: 0px;
  --vb-bh-${e}: 0px;
  --vb-bendA-${e}: 0;
  --vb-mw-${e}: 1;
  --vb-hue-${e}: 0deg;
  --vb-level-${e}: 0;
}

[data-voice-beam="${e}"][data-active] {
  animation: vb-fade-in-${e} 0.6s ease forwards;
}

[data-voice-beam="${e}"][data-fading] {
  animation: vb-fade-out-${e} 0.5s ease forwards;
}

/* Stroke — the colours painted into the 1px edge ring, masked to the centred ellipse. */
[data-voice-beam="${e}"][data-active]::after,
[data-voice-beam="${e}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${M(P)};
  padding: ${M(n)};
  clip-path: inset(0 round ${M(a)});
  background:
    ${Be},
    ${Ie};
  -webkit-mask:
    ${ie(170,64,45)},
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    ${ie(170,64,45)},
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  z-index: 2;
  ${pe("stroke",he)}
  ${ge}
}

/* Inner glow — soft light inside the element, faded off at the corners.
   With distortion on, this copy is clipped to ABOVE the band line (the
   polygon the driver writes each frame) and a mirror layer below carries
   the displacement filter, so only the glow under the line warps. */
${Ce(`[data-voice-beam="${e}"][data-active]::before,
[data-voice-beam="${e}"][data-fading]::before`,'content: "";',R?`clip-path: var(--vb-clip-above-${e}, inset(0 round ${a}px));`:`clip-path: inset(0 round ${a}px);`,ge)}
${R?Ce(`[data-voice-beam="${e}"][data-active] [data-voice-beam-warp="inner"],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-warp="inner"]`,"display: block;",`clip-path: var(--vb-clip-below-${e}, inset(0 round ${a}px));`,Re):""}

/* Bloom — the blurred halo, tallest of the three, above the content. */
[data-voice-beam="${e}"] [data-voice-beam-bloom],
[data-voice-beam="${e}"] [data-voice-beam-warp] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${M(P)};
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  opacity: 0;
}

[data-voice-beam="${e}"] [data-voice-beam-bloom],
[data-voice-beam="${e}"] [data-voice-beam-warp="bloom"] {
  -webkit-mask: ${ie(200,130,35)};
  mask: ${ie(200,130,35)};
  background: ${Ke};
  z-index: 3;
}

[data-voice-beam="${e}"][data-active] [data-voice-beam-bloom],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-bloom] {
  display: block;
  clip-path: ${R?`var(--vb-clip-above-${e}, inset(0 round ${a}px))`:`inset(0 round ${a}px)`};
  ${pe("bloom",be)}
  ${je}
}
${R?`
[data-voice-beam="${e}"][data-active] [data-voice-beam-warp="bloom"],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-warp="bloom"] {
  display: block;
  clip-path: var(--vb-clip-below-${e}, inset(0 round ${a}px));
  ${pe("bloom",be)}
  ${qe}
}

/* Processing drops the distortion: the driver marks the wrapper once the
   warp has faded out, the warp layers leave the paint and the base layers
   give up their split at the band line. */
[data-voice-beam="${e}"][data-voice-warp="off"]::before,
[data-voice-beam="${e}"][data-voice-warp="off"] [data-voice-beam-bloom] {
  clip-path: inset(0 round ${a}px);
}

[data-voice-beam="${e}"][data-voice-warp="off"] [data-voice-beam-warp] {
  display: none;
}`:""}

/* Epicentre — a soft white wash at the source, under the band line (the
   driver's clip; unclipped when no line is drawn), sitting above every
   glow layer and the band's halo so the centre reads lighter than the
   band (same z as the band canvases, painted after them). Sized by the voice like the
   other layers; off unless \`coreLight\` is set (the light theme sets it).
   Up to 1 it is the wash's opacity; past 1 the solid white core widens
   too, for a centre that stays lighter than a strong band. It follows the
   glow's presence but not \`strength\`, which would only dim it. */
${j>0?(()=>{const w=Math.max(0,Math.min(2,j-1)),F=Math.min(1,w),G=Math.max(0,w-1),te=1+.3*w,Ge=C(45*F+27*G),Ne=C(40+25*F+15*G),Ve=Math.min(1,.55+.35*F+.1*G).toFixed(2),Xe=C(72+14*F+8*G);return`[data-voice-beam="${e}"] [data-voice-beam-core] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${M(P)};
  overflow: hidden;
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  /* The blur sits on this wrapper and the band-line clip on the child,
     so the cut edge is blurred too rather than left hard. */
  filter: blur(${M(at(8,h))});
  z-index: 4;
}

[data-voice-beam="${e}"] [data-voice-beam-core] > div {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse calc(${C(120*p*te*B)}px * var(--vb-w-${e}) * ${y}) calc((${C(70*Q*te*B)}px * var(--vb-h-${e}) + var(--vb-bh-${e})) * ${y}) at ${ve} calc(100% + var(--vb-cy-${e}) * ${y}), white 0%, white ${Ge}%, rgba(255, 255, 255, ${Ve}) ${Ne}%, transparent ${Xe}%);
  clip-path: var(--vb-clip-below-${e}, none);
}

[data-voice-beam="${e}"][data-active] [data-voice-beam-core],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-core] {
  display: block;
  opacity: calc(var(--vb-opacity-${e}, 1) * min(1, var(--vb-glow-${e}) * ${Math.min(1,j).toFixed(2)} * ${(1.6+1.4*w).toFixed(2)}) * var(--voice-core-light-opacity, 1));
}
`})():""}
/* Band — the canvas the driver draws the bend's contour on: an organic
   bell with chromatic fringes. Fades with the root, follows the strength
   and turns with the hue drift like the other layers. */
[data-voice-beam="${e}"] [data-voice-beam-band],
[data-voice-beam="${e}"] [data-voice-beam-band-halo] {
  display: none;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  z-index: 4;
}

[data-voice-beam="${e}"][data-active] [data-voice-beam-band],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-band],
[data-voice-beam="${e}"][data-active] [data-voice-beam-band-halo],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-band-halo] {
  display: block;
  opacity: calc(var(--vb-opacity-${e}, 1) * var(--voice-band-opacity, 1) * var(--voice-strength, 1));
  /* The blur vars are 0 where the canvas blurs its own strokes; where the
     2D context has no filter (WebKit) the driver sets them and the layers
     are blurred here instead — the ridge on the band canvas, its wider
     halo on the canvas beneath. */
  filter: blur(var(--vb-band-blur-${e}, 0px)) ${X} brightness(${b}) saturate(${K});
}

[data-voice-beam="${e}"][data-active] [data-voice-beam-band-halo],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-band-halo] {
  filter: blur(var(--vb-band-halo-blur-${e}, 0px)) ${X} brightness(${b}) saturate(${K});
}

/* Resolution. The soft layers — inner light and its warp mirror, bloom and
   its mirror, the epicentre — are rastered at half size and scaled back
   up by the compositor: the box is halved, every length inside rides the
   layer's factor \`--vb-z\` at 0.5 (the driver also writes the band-line
   clips at half scale), and the will-change transform is rastered
   pre-scale where the engine does that (Chromium, Safari 18). For blurred
   gradients that is the same picture at a quarter of the raster and
   filter work, which is what a phone at 3x runs out of. The 1px stroke
   stays full-res on every screen: at half size it is half a CSS pixel,
   which a 3x phone rasters into a faint smear instead of the hairline,
   and the layer is cheap (no blur). The component sets
   \`data-voice-halfres\`. */
[data-voice-beam="${e}"][data-voice-halfres]::before,
[data-voice-beam="${e}"][data-voice-halfres] [data-voice-beam-warp],
[data-voice-beam="${e}"][data-voice-halfres] [data-voice-beam-bloom],
[data-voice-beam="${e}"][data-voice-halfres] [data-voice-beam-core] {
  --vb-z-${e}: 0.5;
  inset: auto;
  left: 0;
  top: 0;
  width: 50%;
  height: 50%;
  transform: translateZ(0) scale(2);
  transform-origin: 0 0;
}
${R?`[data-voice-beam="${e}"][data-voice-halfres][data-active]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-fading]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-active] [data-voice-beam-bloom],
[data-voice-beam="${e}"][data-voice-halfres][data-fading] [data-voice-beam-bloom] {
  clip-path: var(--vb-clip-above-z-${e}, inset(0 round ${M(a)}));
}
[data-voice-beam="${e}"][data-voice-halfres][data-active] [data-voice-beam-warp],
[data-voice-beam="${e}"][data-voice-halfres][data-fading] [data-voice-beam-warp] {
  clip-path: var(--vb-clip-below-z-${e}, inset(0 round ${M(a)}));
}
/* Processing (warp off): the mirrors are gone, so the base layers paint
   the whole box again — this must outweigh the split above. */
[data-voice-beam="${e}"][data-voice-halfres][data-voice-warp="off"]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-voice-warp="off"] [data-voice-beam-bloom] {
  clip-path: inset(0 round ${M(a)});
}`:`[data-voice-beam="${e}"][data-voice-halfres][data-active]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-fading]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-active] [data-voice-beam-bloom],
[data-voice-beam="${e}"][data-voice-halfres][data-fading] [data-voice-beam-bloom] {
  clip-path: inset(0 round ${M(a)});
}`}
[data-voice-beam="${e}"][data-voice-halfres] [data-voice-beam-core] > div {
  clip-path: var(--vb-clip-below-z-${e}, none);
}
@keyframes vb-fade-in-${e} {
  to { --vb-opacity-${e}: 1; }
}

@keyframes vb-fade-out-${e} {
  from { --vb-opacity-${e}: 1; }
  to { --vb-opacity-${e}: 0; }
}

[data-voice-beam="${e}"][data-paused],
[data-voice-beam="${e}"][data-paused]::after,
[data-voice-beam="${e}"][data-paused]::before,
[data-voice-beam="${e}"][data-paused] [data-voice-beam-bloom] {
  animation-play-state: paused !important;
}
`}let Se=null;function Ba(){if(typeof window>"u")return null;const t=window;return t.AudioContext??t.webkitAudioContext??null}function ua(){const t=Ba();return t?(Se||(Se=new t),Se.state==="suspended"&&Se.resume().catch(()=>{}),Se):null}const ot=new WeakMap;function Ia(t){const e=ua();if(!e||t.getAudioTracks().length===0)return null;let a=ot.get(t);a||(a={node:e.createMediaStreamSource(t),refs:0},ot.set(t,a)),a.refs+=1;const n=e.createAnalyser();n.fftSize=1024,n.smoothingTimeConstant=.5,a.node.connect(n);let r=!1;return{analyser:n,release:()=>{if(!r){r=!0;try{a.node.disconnect(n)}catch{}if(a.refs-=1,a.refs<=0){try{a.node.disconnect()}catch{}ot.delete(t)}}}}}const ia=new WeakMap;function Ua(t){let e=ia.get(t);return e||(e={level:0,bands:[0,0,0],phase:0,scanA:0,scanT:0,t:0,lastTs:0,warp:1},ia.set(t,e)),e}const De=new Set;let $e=null,nt=0;const Ka=1e3/60-2,Ga=22,Na=500,Va=4e3;let He=0,it=!1,Ae=!1,me=0,na=0;const ga=Math.PI*2,Xa=5,_a=1.7,Ja=[[80,300],[300,2e3],[2e3,6e3]];function va(t){return t<0?0:t>1?1:t}function Ya(t,e){const a=e/2;return((t+a)%e+e)%e-a}function Za(t,e){const a=t/(e/2+4);return Math.max(0,1-a*a)}function sa(t,e){if(t<=e)return 0;const a=(t-e)/Math.max(.001,1-e);return va((1-Math.exp(-3*a))/(1-Math.exp(-3)))}function Pe(t,e,a,n,r){const o=e>t?n:r,s=1-Math.exp(-a/Math.max(.001,o));return t+(e-t)*s}const Qa=2,er=.06,tr=.35,ar=.03,rr=!(typeof navigator<"u"&&/AppleWebKit/.test(navigator.userAgent)&&!/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent)),la=.05,or=6,ir=12,nr=.1,ca=.1,sr=170,lr=64,da=56;function cr(t,e,a,n){const r=t<0?1-n:1+n,o=Math.max(.05,a*r),s=Math.exp(-Math.pow(Math.abs(t)/o,e)),i=Math.exp(-Math.pow(1/o,e));return Math.max(0,(s-i)/(1-i))}function dr(t,e,a,n,r){if(a<=0||e<=0)return 0;const o=e*Math.max(0,Math.min(.98,n));if(t<=o)return 0;const s=Math.min(1,(t-o)/Math.max(1,e-o));return a*Math.pow(s,Math.max(.5,r))}function pa(t,e,a){return Math.max(0,Math.min(t,e/2,a/2))}function st(t,e,a,n=0){if(a<=0)return 0;const r=Math.min(t,e-t)-n;if(r>=a)return 0;if(r<=0)return a;const o=a-r;return a-Math.sqrt(Math.max(0,a*a-o*o))}function hr(t,e,a,n){const r=a/2+e.cx*e.w,o=sr*t.rangeWidth*e.w*e.mw,s=n*.82*Math.min(1,t.scale),i=Math.min(s,(lr*t.rangeHeight*e.h+e.lift)*t.bandPosition),f=n-t.bandOffset,c=Math.min(1,e.corner*4),g=t.bandTail*(1-c*c*(3-2*c)),m=g>.001,v=m?t.bandTailOverflow:0,d=m?-v:r-o,h=m?a+v:r+o,S=[];for(let L=0;L<=da;L++){const E=d+(h-d)*L/da,I=Math.max(-1,Math.min(1,(E-r)/Math.max(1,o))),N=(E<r?r:a-r)+v,V=cr(I,t.bandCurve,t.bandSpread,t.bandSkew)+dr(Math.abs(E-r),N,g,t.bandTailPosition,t.bandTailCurve),H=e.corner>0?st(E,a,pa(t.radius,a,n))*e.corner:0;S.push([E,f-i*V-H])}return S}function br(t,e,a,n,r){for(const[o,s]of[["",1],["-z",.5]]){const i=m=>(m*s).toFixed(1)+"px",f=a.map(([m,v])=>`${i(m)} ${i(v)}`),c=`polygon(0 ${i(r)}, ${f.join(", ")}, ${i(n)} ${i(r)})`,g=`polygon(0 0, ${i(n)} 0, ${i(n)} ${i(r)}, ${f.slice().reverse().join(", ")}, 0 ${i(r)})`;t.style.setProperty(`--vb-clip-below${o}-${e}`,c),t.style.setProperty(`--vb-clip-above${o}-${e}`,g)}}function ur(t,e,a){let n=a;for(let i=0;i<e.length;i++)e[i][1]<n&&(n=e[i][1]);const r=Math.max(0,Math.min(.9,Math.floor((n-or)/a/la)*la));if(r===t.filterTop)return;t.filterTop=r;const o=1+Math.max(nr,ir/a),s=t.filter;s.setAttribute("x",`${-ca*100}%`),s.setAttribute("width",`${(1+2*ca)*100}%`),s.setAttribute("y",`${(r*100).toFixed(0)}%`),s.setAttribute("height",`${((o-r)*100).toFixed(1)}%`)}function gr(t,e,a){const{canvas:n,ctx:r,el:o,config:s}=t;if(!n||!r)return;const i=o.clientWidth,f=o.clientHeight;if(!i||!f)return;const c=Math.min(Qa,typeof window<"u"&&window.devicePixelRatio||1),g=Math.round(i*c),m=Math.round(f*c);(n.width!==g||n.height!==m)&&(n.width=g,n.height=m),r.setTransform(c,0,0,c,0,0),r.clearRect(0,0,i,f);const v=t.haloCanvas,d=t.haloCtx;v&&d&&((v.width!==g||v.height!==m)&&(v.width=g,v.height=m),d.setTransform(c,0,0,c,0,0),d.clearRect(0,0,i,f));const h=Math.min(1,.6*s.bandStrength*e.strength);if(h<.005||s.bandWidth<=0)return;const S=s.theme==="dark",L=s.bandWidth*(1+.35*e.level),E=s.bandAberration*(.35+.65*e.level),I=(4+12*E)*s.scale,N=4*E*s.scale,V=($,T)=>{r.beginPath(),r.moveTo(a[0][0]+$,a[0][1]+T);for(let x=1;x<a.length;x++)r.lineTo(a[x][0]+$,a[x][1]+T)},H={r:s.bandColors.above,g:s.bandColors.mid,c:s.bandColors.core,b:s.bandColors.below},D=(S?.42:.4)*h,j=14*L,p=3.5*s.bandWidth/2,Q=p*c,q=typeof r.filter=="string",ee=q?"0px":`${p.toFixed(2)}px`;t.cssBlur!==ee&&(o.style.setProperty(`--vb-band-blur-${s.id}`,ee),o.style.setProperty(`--vb-band-halo-blur-${s.id}`,q?"0px":`${(p*3).toFixed(2)}px`),t.cssBlur=ee);const se=[[1,.16],[.72,.2],[.46,.26],[.22,.34]],R=[{rgb:H.r,a:1,ox:N,oy:-I},{rgb:H.g,a:.55,ox:N*.35,oy:-I*.35},{rgb:H.b,a:1,ox:-N,oy:I},{rgb:H.c,a:.9,ox:0,oy:0}];r.lineCap="round",r.lineJoin="round",r.globalCompositeOperation="source-over";const B=a[0][0],A=a[a.length-1][0],U=($,T)=>{const x=r.createLinearGradient(B,0,A,0),C=s.bandTail>0?.015:.18;return x.addColorStop(0,`rgba(${$}, 0)`),x.addColorStop(C,`rgba(${$}, ${T.toFixed(3)})`),x.addColorStop(1-C,`rgba(${$}, ${T.toFixed(3)})`),x.addColorStop(1,`rgba(${$}, 0)`),x},P=!q&&d?d:r;q&&(r.filter=`blur(${(Q*3).toFixed(1)}px)`),P.lineCap="round",P.lineJoin="round",P.strokeStyle=U(H.c,D*.3),P.lineWidth=j*2.2,P.beginPath(),P.moveTo(a[0][0],a[0][1]);for(let $=1;$<a.length;$++)P.lineTo(a[$][0],a[$][1]);P.stroke(),q&&(r.filter=`blur(${Q.toFixed(1)}px)`);for(const $ of R)for(const[T,x]of se)r.strokeStyle=U($.rgb,D*$.a*x),r.lineWidth=Math.max(.6,j*T),V($.ox,$.oy),r.stroke();q&&(r.filter="none"),r.globalCompositeOperation="source-over"}function vr(t){return(1-Math.cos(ga*t))/2}function pr(t,e){const a=t.analyser,n=t.time,r=t.freq;a.getFloatTimeDomainData(n);let o=0;for(let i=0;i<n.length;i++)o+=n[i]*n[i];e.level=Math.sqrt(o/n.length)*Xa*t.config.sensitivity,a.getByteFrequencyData(r);const s=a.context.sampleRate/a.fftSize;for(let i=0;i<3;i++){const[f,c]=Ja[i],g=Math.max(0,Math.floor(f/s)),m=Math.min(r.length-1,Math.ceil(c/s));let v=0;for(let h=g;h<=m;h++)v+=r[h];const d=m>=g?v/(m-g+1)/255:0;e.bands[i]=d*_a*t.config.sensitivity}}const de={level:0,bands:[0,0,0]};function fa(t){$e=requestAnimationFrame(fa);const e=He?t-He:0;if(He=t,it){if(Ae=!Ae,Ae)return;t>=na&&(it=!1,me=0)}else e>Ga?me?t-me>Na&&(it=!0,Ae=!1,na=t+Va):me=t:me=0;t-nt<Ka||(nt=t,De.forEach(a=>{var n;const{el:r,config:o,source:s,s:i}=a,f=o.paused;if(f&&a.paintedConfig===o)return;const c=f?0:i.lastTs?Math.min(.05,(t-i.lastTs)/1e3):1/60;i.lastTs=t,i.t+=c;const g=i.t;if(!f)if(a.analyser)pr(a,de);else{const b=s.getLevel?va(s.getLevel()):0;de.level=b,de.bands[0]=b,de.bands[1]=b*(.72+.28*Math.sin(g*9.1)),de.bands[2]=b*(.6+.4*Math.sin(g*13.7+2))}const m=sa(de.level,o.threshold);i.level=Pe(i.level,m,c,o.attack,o.release);for(let b=0;b<3;b++){const K=sa(de.bands[b],o.threshold*.6);i.bands[b]=Pe(i.bands[b],K,c,o.attack,o.release*1.15)}const v=Ha*o.lobeSpacing;o.processing&&i.scanA<.001&&i.scanT===0&&(i.scanT=Math.max(.05,o.processingDuration)/2);const d=Math.max(.05,o.processingEase);i.scanA=Pe(i.scanA,o.processing?1:0,c,d*.9,d*.8),o.processing?i.scanT+=c:i.scanA<.001&&(i.scanT=0);const h=i.scanA*i.scanA*(3-2*i.scanA),S=r.clientWidth,L=r.clientHeight,E=v/2*o.processingTravel,I=i.scanT/Math.max(.05,o.processingDuration),N=Math.floor(I),V=I-N,H=Math.max(1,o.processingCurve),D=V<.5?.5*Math.pow(2*V,H):1-.5*Math.pow(2-2*V,H),j=o.reducedMotion?0:N%2===0?2*D-1:1-2*D,p=h*E*j,Q=1-h*.6,q=1-h*.45,ee=1+h*.3*(1-j*j),se=o.reducedMotion?.5:.5+.5*Math.sin(ga*g/o.breatheDuration),R=i.level+(1-i.level)*o.idle*se,B=Math.max(0,Math.min(1,(h-.25)/.75)),A=B*B*(3-2*B),U=Math.max(R,o.processingLevel*A),P=.15+.85*U,$=.5+o.reach*U,T=(.85+o.spread*U)*ee;o.flow!==0&&!o.reducedMotion&&(i.phase=((i.phase+o.flow*U*c)%v+v)%v),r.style.setProperty(`--vb-level-${o.id}`,i.level.toFixed(3)),r.style.setProperty(`--vb-cx-${o.id}`,`${p.toFixed(1)}px`),r.style.setProperty(`--vb-mw-${o.id}`,q.toFixed(3));const x=o.bend*U;r.style.setProperty(`--vb-bh-${o.id}`,`${Math.max(0,x).toFixed(1)}px`);const C=o.bend>0?Math.min(1,x/o.bend):0;r.style.setProperty(`--vb-bendA-${o.id}`,C.toFixed(3));const y={cx:p,w:T,h:$,mw:q,lift:x,strength:C,level:i.level,corner:h},M=S/2+p*T,ae=30*o.scale*T,re=pa(o.radius,S,L),oe=h*o.cornerFollow;r.style.setProperty(`--vb-cy-${o.id}`,`${(-st(M,S,re,ae*1.4)*oe).toFixed(1)}px`),i.warp=Pe(i.warp,o.processing?0:1,c,tr,er);const he=i.warp,Y=a.displace!=null&&he<ar;if(Y!==a.warpOff&&(a.warpOff=Y,Y?r.setAttribute("data-voice-warp","off"):r.removeAttribute("data-voice-warp")),S&&L&&(a.ctx||a.displace)){const b=hr(o,y,S,L);(a.displace&&!Y||o.coreLight>0)&&br(r,o.id,b,S,L),a.filter&&!Y&&rr&&ur(a,b,L),a.ctx&&gr(a,y,b)}if(a.displace&&!Y){const b=o.reducedMotion?0:o.distortion*120*o.scale*(.15+.85*U)*he;a.displace.scale.baseVal=b,a.noiseShift&&(a.noiseShift.dx.baseVal=8*o.scale*Math.sin(g*.9),a.noiseShift.dy.baseVal=4*o.scale*Math.sin(g*.6+1.3))}r.style.setProperty(`--vb-glow-${o.id}`,P.toFixed(3)),r.style.setProperty(`--vb-h-${o.id}`,$.toFixed(3)),r.style.setProperty(`--vb-w-${o.id}`,T.toFixed(3));for(let b=0;b<we.length;b++){const K=we[b],X=Ya(K.x*o.lobeSpacing+i.phase,v),ue=o.bands?.6+.7*i.bands[K.band]:1;r.style.setProperty(`--vb-x${b}-${o.id}`,`${(X*Q).toFixed(1)}px`),r.style.setProperty(`--vb-l${b}-${o.id}`,(ue*Za(X,v)).toFixed(3));const ge=S/2+(p+X*Q)*T;r.style.setProperty(`--vb-y${b}-${o.id}`,`${(-st(ge,S,re,ae)*oe).toFixed(1)}px`)}const be=o.staticColors||o.reducedMotion||o.hueRange===0?0:-o.hueRange+2*o.hueRange*vr(g/o.hueDuration);r.style.setProperty(`--vb-hue-${o.id}`,`${be.toFixed(2)}deg`),(n=a.onLevel)==null||n.call(a,i.level),a.paintedConfig=o}))}function fr(){$e==null&&(nt=0,He=0,me=0,$e=requestAnimationFrame(fa))}function mr(){De.size===0&&$e!=null&&(cancelAnimationFrame($e),$e=null)}function $r(t,e,a,n){const r={el:t,config:e,source:a,onLevel:n,analyser:null,releaseAnalyser:null,time:null,freq:null,canvas:null,ctx:null,haloCanvas:null,haloCtx:null,displace:null,noiseShift:null,filter:null,filterTop:-1,s:Ua(t),paintedConfig:null,cssBlur:null,warpOff:t.hasAttribute("data-voice-warp")};e.distortion>0&&(r.displace=t.querySelector(":scope > svg feDisplacementMap"),r.noiseShift=t.querySelector(":scope > svg feOffset"),r.filter=t.querySelector(":scope > svg filter"));const o=t.querySelector(":scope > [data-voice-beam-band]");if(o){r.canvas=o,r.ctx=o.getContext("2d");const s=t.querySelector(":scope > [data-voice-beam-band-halo]");s&&(r.haloCanvas=s,r.haloCtx=s.getContext("2d"))}if(r.s.lastTs=0,a.stream){const s=Ia(a.stream);s&&(r.analyser=s.analyser,r.releaseAnalyser=s.release,r.time=new Float32Array(s.analyser.fftSize),r.freq=new Uint8Array(s.analyser.frequencyBinCount))}return De.add(r),fr(),()=>{var s;De.delete(r),(s=r.releaseAnalyser)==null||s.call(r),mr()}}const wr={scale:1,glowSize:1,processingDuration:1.1,processingLevel:.55,processingTravel:1.55,processingCurve:2.1,cornerFollow:.45,strokeOpacity:1,innerOpacity:1,bloomOpacity:1,idle:.18,reach:1.2,spread:1.05,flow:48,bend:60,bandStrength:1.55,bandWidth:2.15,bandPosition:.35,bandCurve:1.75,bandSpread:.87,bandSkew:.12,bandOffset:-27,bandTail:.59,bandTailPosition:.67,bandTailCurve:2.4,bandTailOverflow:15,bandAberration:.89,distortion:.62,distortionDetail:2.3,glowWidth:.65,glowHeight:1.25,lobeSpacing:.85,rangeWidth:.75,rangeHeight:1,softness:1.07,coreSize:1,coreLight:0,coreLightWidth:1,coreLightHeight:1,strokeScale:1,innerScale:1,innerHeight:1,bloomScale:1,bloomHeight:1},xr={default:{},pill:{scale:.45,glowSize:.95,strokeOpacity:1.2,innerOpacity:.85,reach:1.35,spread:1.1,flow:0,bend:23,bandStrength:1.55,bandWidth:1.85,bandCurve:1.95,bandSpread:.38,bandOffset:-16,bandTail:0,processingTravel:2,cornerFollow:0,distortion:.45,distortionDetail:3,glowWidth:.65,glowHeight:.95,lobeSpacing:.45,rangeWidth:.8,rangeHeight:.7,softness:.88,coreSize:.25,strokeScale:1.25,innerScale:.95,bloomScale:1.05,bloomHeight:2.25},mobile:{scale:1.25,spread:.45,reach:3,flow:60,bend:70,bandWidth:2.4,bandCurve:1.55,bandSpread:.9,bandOffset:-50,bandTail:.62,bandTailPosition:.42,bandTailCurve:2.7,bandTailOverflow:22,processingDuration:1.05,processingLevel:.35,processingTravel:1,cornerFollow:.4,bandStrength:1.8,distortionDetail:2,glowWidth:1.15,glowHeight:2.1,lobeSpacing:1.35,rangeWidth:1.25,rangeHeight:1.2,softness:1.1}},yr={default:{brightness:1.15},pill:{brightness:1.35,saturation:1.5},mobile:{strength:1,brightness:1.2,saturation:1.5}},Mr={default:{},pill:{},mobile:{strength:1}};function Sr(t="default",e="dark"){return(e==="light"?Mr[t]:void 0)??yr[t]}const kr={default:{bandStrength:1.7},pill:{bandStrength:2},mobile:{bandStrength:1.7}};function Cr(t="default",e="dark"){const a=xr[t],n={};return e==="light"&&(a.reach===void 0&&(n.reach=1.8),a.spread===void 0&&(n.spread=.8),a.coreLight===void 0&&(n.coreLight=1.8)),{...wr,...n,...a,...e==="light"?kr[t]:void 0}}const Le={dark:{core:"255, 255, 255",above:"255, 70, 80",mid:"90, 255, 150",below:"80, 140, 255"},light:{core:"197, 139, 255",above:"255, 122, 182",mid:"126, 196, 255",below:"45, 255, 171"}},Tr=1,Or=16,Fr=6e4,ha=typeof navigator<"u"&&/AppleWebKit/.test(navigator.userAgent)&&!/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent),zr=(()=>{if(typeof document>"u")return!0;const t=document.createElement("canvas").getContext("2d");return!!t&&typeof t.filter=="string"})();function Wr(){const[t,e]=u.useState(()=>typeof window>"u"||window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");return u.useEffect(()=>{if(typeof window>"u")return;const a=window.matchMedia("(prefers-color-scheme: dark)"),n=r=>e(r.matches?"dark":"light");return a.addEventListener("change",n),()=>a.removeEventListener("change",n)},[]),t}function Ar(){const[t,e]=u.useState(()=>typeof window>"u"||!window.matchMedia?!1:window.matchMedia("(prefers-reduced-motion: reduce)").matches);return u.useEffect(()=>{if(typeof window>"u"||!window.matchMedia)return;const a=window.matchMedia("(prefers-reduced-motion: reduce)"),n=r=>e(r.matches);return a.addEventListener("change",n),()=>a.removeEventListener("change",n)},[]),t}function Pr(t,e){return t==="auto"?e:t}const Hr=u.forwardRef(function({children:t,type:e="default",scale:a,stream:n=null,level:r=0,sensitivity:o=3.1,threshold:s=.015,attack:i=.325,release:f=.86,idle:c,breatheDuration:g=5.2,reach:m,spread:v,bands:d=!0,flow:h,processing:S=!1,processingDuration:L,processingLevel:E,processingTravel:I,processingCurve:N,cornerFollow:V,processingEase:H=.6,colorVariant:D="colorful",colors:j,bandColors:p,theme:Q="dark",staticColors:q=!1,hueRange:ee,hueDuration:se,active:R=!0,paused:B=!1,borderRadius:A,brightness:U,saturation:P,glowSize:$,strokeOpacity:T,innerOpacity:x,bloomOpacity:C,bend:y,bandStrength:M,bandWidth:ae,bandPosition:re,bandCurve:oe,bandSpread:he,bandSkew:Y,bandOffset:be,bandTail:b,bandTailPosition:K,bandTailCurve:X,bandTailOverflow:ue,bandAberration:ge,distortion:Re,distortionDetail:je,glowWidth:qe,glowHeight:ve,lobeSpacing:ke,rangeWidth:Be,rangeHeight:Ie,softness:Ue,coreSize:Ke,coreLight:ie,coreLightWidth:pe,coreLightHeight:Ce,strokeScale:w,innerScale:F,innerHeight:G,bloomScale:te,bloomHeight:Ge,strength:Ne,className:Ve,style:Xe,css:lt,onLevel:ct,onActivate:_e,onDeactivate:Je,onAnimationEnd:Ye,...ma},xe){const le=u.useId().replace(/:/g,"-"),$a=Wr(),_=Pr(Q,$a),wa=j?j.join("|"):"",xa=p?[p.core,p.above,p.mid,p.below].join("|"):"",l=Cr(e,_),z=Math.max(.05,a??l.scale),dt=$??l.glowSize,ht=T??l.strokeOpacity,bt=x??l.innerOpacity,ut=C??l.bloomOpacity,gt=L??l.processingDuration,vt=E??l.processingLevel,pt=I??l.processingTravel,ft=N??l.processingCurve,mt=V??l.cornerFollow,$t=c??l.idle,wt=m??l.reach,xt=v??l.spread,yt=(h??l.flow)*z,Mt=(y??l.bend)*z,St=M??l.bandStrength,kt=(ae??l.bandWidth)*z,Ct=re??l.bandPosition,Tt=oe??l.bandCurve,Ot=he??l.bandSpread,Ft=Y??l.bandSkew,zt=(be??l.bandOffset)*z,Wt=b??l.bandTail,At=K??l.bandTailPosition,Pt=X??l.bandTailCurve,Lt=(ue??l.bandTailOverflow)*z,Et=ge??l.bandAberration,ya=Re??l.distortion,Ht=(je??l.distortionDetail)/z,Dt=(qe??l.glowWidth)*z,Rt=(ve??l.glowHeight)*z,jt=(ke??l.lobeSpacing)*z,Te=(Be??l.rangeWidth)*z,Oe=(Ie??l.rangeHeight)*z,qt=Ue??l.softness,Bt=(Ke??l.coreSize)*z,ye=Math.max(0,Math.min(3,ie??l.coreLight)),It=pe??l.coreLightWidth,Ut=Ce??l.coreLightHeight,Kt=w??l.strokeScale,Gt=F??l.innerScale,Nt=G??l.innerHeight,Vt=te??l.bloomScale,Xt=Ge??l.bloomHeight,_t=Ar(),Me=u.useRef(null),[ce,Jt]=u.useState(R),[ne,Yt]=u.useState(!1),[Ze,Ma]=u.useState(!0),[Sa,ka]=u.useState(null),[Ca,Ta]=u.useState(0);u.useEffect(()=>{if(!ha)return;const k=Me.current;if(!k)return;const W=()=>Ta(k.clientWidth*k.clientHeight);if(W(),typeof ResizeObserver>"u")return;const Z=new ResizeObserver(W);return Z.observe(k),()=>Z.disconnect()},[]);const fe=ha&&Ca>Fr?0:ya;u.useEffect(()=>{if(A!=null)return;const k=Me.current;if(!k)return;const W=()=>{const ze=k.firstElementChild;if(!ze)return;const Aa=getComputedStyle(ze),tt=parseFloat(Aa.borderTopLeftRadius);!isNaN(tt)&&tt>0&&ka(tt)};W();const Z=new MutationObserver(W);return Z.observe(k,{childList:!0,subtree:!1}),()=>Z.disconnect()},[A,t]),u.useEffect(()=>{R&&!ce&&!ne?Jt(!0):!R&&ce&&!ne&&Yt(!0)},[R,ce,ne]),u.useEffect(()=>{const k=Me.current;if(!k||typeof IntersectionObserver>"u")return;const W=new IntersectionObserver(Z=>{for(const ze of Z)Ma(ze.isIntersecting)},{rootMargin:"256px"});return W.observe(k),()=>W.disconnect()},[]);const Oa=u.useCallback(k=>{const W=k.animationName;W.includes("fade-out")?(Jt(!1),Yt(!1),Je==null||Je()):W.includes("fade-in")&&(_e==null||_e()),Ye==null||Ye(k)},[_e,Je,Ye]),J=La[_],Fe=A??Sa??Or,Qe=Sr(e,_),Fa=Ne??Qe.strength??J.strength??1,Zt=ee??J.hueRange??24,Qt=se??J.hueDuration??12,ea=U??Qe.brightness??J.brightness,ta=P??Qe.saturation??J.saturation,aa=u.useMemo(()=>qa({id:le,borderRadius:Fe,borderWidth:Tr,strokeOpacity:J.strokeOpacity*ht,innerOpacity:J.innerOpacity*bt,bloomOpacity:J.bloomOpacity*ut,innerShadow:J.innerShadow,colorVariant:D,colors:j,brightness:ea,saturation:ta,theme:_,hueBase:J.hueBase??0,glowSize:dt*z,glowWidth:Dt,glowHeight:Rt,strokeScale:Kt,innerScale:Gt,innerHeight:Nt,bloomScale:Vt,bloomHeight:Xt,coreSize:Bt,coreLight:ye,coreLightWidth:It,coreLightHeight:Ut,rangeWidth:Te,rangeHeight:Oe,softness:qt,distortion:fe>0,scale:z}),[le,Fe,J,D,wa,ea,ta,_,l,dt,ht,bt,ut,z,Dt,Rt,Kt,Gt,Nt,Vt,Xt,Bt,ye,It,Ut,Te,Oe,qt,fe>0]),ra=u.useMemo(()=>({id:le,sensitivity:Math.max(0,o),threshold:Math.max(0,Math.min(.95,s)),attack:Math.max(0,i),release:Math.max(0,f),idle:Math.max(0,Math.min(1,$t)),breatheDuration:Math.max(.2,g),reach:Math.max(0,wt),spread:Math.max(0,xt),bands:d,flow:yt,lobeSpacing:Math.max(.1,jt),bend:Math.max(0,Mt),bandStrength:Math.max(0,St),bandWidth:Math.max(0,kt),bandPosition:Math.max(0,Ct),bandCurve:Math.max(.3,Tt),bandSpread:Math.max(.05,Ot),bandSkew:Math.max(-.9,Math.min(.9,Ft)),bandOffset:zt,bandTail:Math.max(0,Math.min(1.5,Wt)),bandTailPosition:Math.max(0,Math.min(.98,At)),bandTailCurve:Math.max(.5,Pt),bandTailOverflow:Math.max(0,Lt),bandAberration:Math.max(0,Math.min(1,Et)),rangeWidth:Te,rangeHeight:Oe,theme:_,bandColors:{core:(p==null?void 0:p.core)&&We(p.core)||Le[_].core,above:(p==null?void 0:p.above)&&We(p.above)||Le[_].above,mid:(p==null?void 0:p.mid)&&We(p.mid)||Le[_].mid,below:(p==null?void 0:p.below)&&We(p.below)||Le[_].below},distortion:Math.max(0,Math.min(1,fe)),coreLight:ye,scale:z,radius:Fe,processing:S,processingDuration:Math.max(.05,gt),processingLevel:Math.max(0,Math.min(1,vt)),processingEase:Math.max(.05,H),processingTravel:Math.max(0,pt),processingCurve:Math.max(1,ft),cornerFollow:Math.max(0,Math.min(1,mt)),hueRange:Math.max(0,Zt),hueDuration:Math.max(.5,Qt),staticColors:D==="mono"?!0:q,reducedMotion:_t,paused:B}),[le,o,s,i,f,$t,g,wt,xt,d,yt,jt,Mt,St,kt,Ct,Tt,Ot,Ft,zt,Wt,At,Pt,Lt,Et,Te,Oe,_,xa,fe,ye,z,Fe,S,gt,vt,H,pt,ft,mt,Zt,Qt,q,D,_t,B]),oa=u.useRef(r);oa.current=r;const et=u.useRef(ct);et.current=ct,u.useEffect(()=>{if(!(ce||ne)||!Ze)return;const k=Me.current;return k?$r(k,ra,{stream:n,getLevel:()=>{const W=oa.current;return typeof W=="function"?W():W}},W=>{var Z;return(Z=et.current)==null?void 0:Z.call(et,W)}):void 0},[ra,n,ce,ne,Ze]);const za=u.useCallback(k=>{Me.current=k,typeof xe=="function"?xe(k):xe&&(xe.current=k)},[xe]),Wa={...Xe??{},"--voice-strength":Math.max(0,Math.min(1,Fa))};return O.jsxs(O.Fragment,{children:[O.jsx("style",{children:lt?`${aa}
${lt.split("{id}").join(le)}`:aa}),O.jsxs("div",{...ma,ref:za,"data-voice-beam":le,"data-voice-type":e,"data-voice-halfres":"","data-active":ce&&!ne?"":void 0,"data-fading":ne?"":void 0,"data-paused":ce&&!ne&&(!Ze||B)?"":void 0,"data-listening":n?"":void 0,"data-processing":S?"":void 0,className:Ve,style:Wa,onAnimationEnd:Oa,children:[t,O.jsx("div",{"data-voice-beam-bloom":!0}),fe>0&&O.jsxs(O.Fragment,{children:[O.jsx("div",{"data-voice-beam-warp":"inner"}),O.jsx("div",{"data-voice-beam-warp":"bloom"})]}),!zr&&O.jsx("canvas",{"data-voice-beam-band-halo":!0,"aria-hidden":"true"}),O.jsx("canvas",{"data-voice-beam-band":!0,"aria-hidden":"true"}),ye>0&&O.jsx("div",{"data-voice-beam-core":!0,children:O.jsx("div",{})}),fe>0&&O.jsx("svg",{"aria-hidden":"true",width:"0",height:"0",style:{position:"absolute",pointerEvents:"none"},children:O.jsxs("filter",{id:`vb-distort-${le}`,x:"-20%",y:"-20%",width:"140%",height:"140%",colorInterpolationFilters:"sRGB",children:[O.jsx("feTurbulence",{type:"fractalNoise",baseFrequency:`${(.012*Ht).toFixed(4)} ${(.05*Ht).toFixed(4)}`,numOctaves:2,seed:7,result:"noise"}),O.jsx("feOffset",{in:"noise",dx:"0",dy:"0",result:"moved"}),O.jsx("feColorMatrix",{in:"moved",type:"matrix",values:"1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1",result:"map"}),O.jsx("feDisplacementMap",{in:"SourceGraphic",in2:"map",scale:0,xChannelSelector:"R",yChannelSelector:"G"})]})})]})]})}),Lr={echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1};function Ee(){return typeof navigator<"u"&&typeof navigator.mediaDevices<"u"&&typeof navigator.mediaDevices.getUserMedia=="function"}function Dr(t={}){const{constraints:e,autoStart:a=!1}=t,[n,r]=u.useState(null),[o,s]=u.useState(()=>Ee()?"idle":"unsupported"),[i,f]=u.useState(null),c=u.useRef(null),g=u.useRef(e);g.current=e;const m=u.useCallback(()=>{const d=c.current;c.current=null,d&&d.getTracks().forEach(h=>h.stop()),r(null),s(Ee()?"idle":"unsupported")},[]),v=u.useCallback(async()=>{if(!Ee())return s("unsupported"),null;if(c.current)return c.current;ua(),s("requesting"),f(null);try{const d=await navigator.mediaDevices.getUserMedia({audio:{...Lr,...g.current??{}}});c.current=d,r(d),s("live");const h=()=>{c.current===d&&(c.current=null,r(null),s("idle"))};return d.getAudioTracks().forEach(S=>S.addEventListener("ended",h)),d}catch(d){const h=d instanceof Error?d:new Error(String(d));return f(h),s(h.name==="NotAllowedError"||h.name==="SecurityError"?"denied":"error"),null}},[]);return u.useEffect(()=>{a&&v()},[a]),u.useEffect(()=>()=>{const d=c.current;c.current=null,d&&d.getTracks().forEach(h=>h.stop())},[]),{stream:n,state:o,error:i,supported:Ee(),start:v,stop:m}}export{Hr as X,Dr as Y};
