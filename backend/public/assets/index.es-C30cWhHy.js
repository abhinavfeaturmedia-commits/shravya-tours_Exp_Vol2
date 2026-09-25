import{r as G,j as se}from"./index-CPT6ZqTJ.js";function Jt(e){let t=e.replace("#","");(t.length===3||t.length===4)&&(t=t.split("").map(a=>a+a).join(""));const o=t.length>=8?parseInt(t.slice(6,8),16)/255:1;return[parseInt(t.slice(0,2),16)/255,parseInt(t.slice(2,4),16)/255,parseInt(t.slice(4,6),16)/255,o]}function Ao(e,t,o){e/=255,t/=255,o/=255;const a=Math.max(e,t,o),r=Math.min(e,t,o),i=a-r;let n=0;const l=a===0?0:i/a;return i!==0&&(a===e?n=((t-o)/i+6)%6:a===t?n=(o-e)/i+2:n=(e-t)/i+4,n/=6),[n,l,a]}function Po(e,t,o){const a=Math.floor(e*6),r=e*6-a,i=o*(1-t),n=o*(1-r*t),l=o*(1-(1-r)*t);let s=0,c=0,u=0;switch(a%6){case 0:s=o,c=l,u=i;break;case 1:s=n,c=o,u=i;break;case 2:s=i,c=o,u=l;break;case 3:s=i,c=n,u=o;break;case 4:s=l,c=i,u=o;break;case 5:s=o,c=i,u=n;break}return[Math.round(s*255),Math.round(c*255),Math.round(u*255)]}const mr=66,pr=66,gr=1500,xr=1,Kt=16,vr=96,wr=2,br=0,yr=1,We={colorBack:"#00000000",speed:1,repetition:1.5,softness:.05,shiftRed:.3,shiftBlue:.3,distortion:.1,contour:.4,angle:90,shape:br,scale:1,rotation:0,offsetX:0,offsetY:0,originX:.5,originY:.5,worldWidth:0,worldHeight:0,fit:yr},Mr={name:"chromatic",modes:{dark:{...We,colorTint:"#88ccff2e",shiftRed:.75,shiftBlue:.75,repetition:2,softness:.09,shaderOpacity:1},light:{...We,colorTint:"#66b0ff99",shiftRed:.6,shiftBlue:.6,shaderOpacity:1}}},_r={name:"silver",modes:{dark:{...We,colorTint:"#ffffff66",shaderOpacity:.88},light:{...We,colorTint:"#ffffff40",shaderOpacity:1}}},Rr={name:"gold",modes:{dark:{...We,colorTint:"#ffcc55cc",speed:.85,shaderOpacity:.92},light:{...We,colorTint:"#f7d488aa",shaderOpacity:1}}},Fo={chromatic:Mr,silver:_r,gold:Rr},kr=`
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`,Cr=`
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`,Sr=`
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);
`,Tr=`
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`,Or=`#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec4 u_colorBack;
uniform vec4 u_colorTint;

uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;

uniform float u_shape;
uniform bool u_isImage;

in vec2 v_objectUV;
in vec2 v_responsiveUV;
in vec2 v_responsiveBoxGivenSize;
in vec2 v_imageUV;

out vec4 fragColor;

${kr}
${Cr}
${Tr}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {

  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));

  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  if (u_isImage == true) {
    bump = smoothstep(.2, .8, bump);
  }
  border = w[0] + .4 * (1. - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + .5 * (1. - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));

  // Tint color is applied with color burn blending
  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

float getImgFrame(vec2 uv, float th) {
  float frame = 1.;
  frame *= smoothstep(0., th, uv.y);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.y);
  frame *= smoothstep(0., th, uv.x);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.x);
  return frame;
}

float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
  vec2 texel = 1.0 / vec2(textureSize(tex, 0));
  vec2 r = radius * texel;

  float w1 = 1.0, w2 = 2.0, w4 = 4.0;
  float norm = 16.0;
  float sum = w4 * centerSample;

  sum += w2 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;

  sum += w1 * textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;

  return sum / norm;
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {

  const float firstFrameOffset = 2.8;
  float t = .3 * (u_time + firstFrameOffset);

  vec2 uv = v_imageUV;
  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec4 img = textureGrad(u_image, uv, dudx, dudy);

  if (u_isImage == false) {
    uv = v_objectUV + .5;
    uv.y = 1. - uv.y;
  }

  float cycleWidth = u_repetition;
  float edge = 0.;
  float contOffset = 1.;

  vec2 rotatedUV = uv - vec2(.5);
  float angle = (-u_angle + 70.) * PI / 180.;
  float cosA = cos(angle);
  float sinA = sin(angle);
  rotatedUV = vec2(
  rotatedUV.x * cosA - rotatedUV.y * sinA,
  rotatedUV.x * sinA + rotatedUV.y * cosA
  ) + vec2(.5);

  if (u_isImage == true) {
    float edgeRaw = img.r;
    edge = blurEdge3x3(u_image, uv, dudx, dudy, 6., edgeRaw);
    edge = pow(edge, 1.6);
    edge *= mix(0.0, 1.0, smoothstep(0.0, 0.4, u_contour));
  } else {
    if (u_shape < 1.) {
      // full-fill on canvas
      vec2 borderUV = v_responsiveUV + .5;
      float ratio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
      vec2 mask = min(borderUV, 1. - borderUV);
      vec2 pixel_thickness = min(250. / v_responsiveBoxGivenSize, vec2(.5));
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);

      uv = v_responsiveUV;
      if (ratio > 1.) {
        uv.y /= ratio;
      } else {
        uv.x *= ratio;
      }
      uv += .5;
      uv.y = 1. - uv.y;

      cycleWidth *= 2.;
      contOffset = 1.5;

    } else if (u_shape < 2.) {
      // circle
      vec2 shapeUV = uv - .5;
      shapeUV *= .67;
      edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);
    } else if (u_shape < 3.) {
      // daisy
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.68;

      float r = length(shapeUV) * 2.;
      float a = atan(shapeUV.y, shapeUV.x) + .2;
      r *= (1. + .05 * sin(3. * a + 2. * t));
      float f = abs(cos(a * 3.));
      edge = smoothstep(f, f + .7, r);
      edge *= edge;

      uv *= .8;
      cycleWidth *= 1.6;

    } else if (u_shape < 4.) {
      // diamond
      vec2 shapeUV = uv - .5;
      shapeUV = rotate(shapeUV, .25 * PI);
      shapeUV *= 1.42;
      shapeUV += .5;
      vec2 mask = min(shapeUV, 1. - shapeUV);
      vec2 pixel_thickness = vec2(.15);
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);
    } else if (u_shape < 5.) {
      // metaballs
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.3;
      edge = 0.;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float speed = 1.5 + 2./3. * sin(fi * 12.345);
        float angle = -fi * 1.5;
        vec2 dir1 = vec2(cos(angle), sin(angle));
        vec2 dir2 = vec2(cos(angle + 1.57), sin(angle + 1.));
        vec2 traj = .4 * (dir1 * sin(t * speed + fi * 1.23) + dir2 * cos(t * (speed * 0.7) + fi * 2.17));
        float d = length(shapeUV + traj);
        edge += pow(1.0 - clamp(d, 0.0, 1.0), 4.0);
      }
      edge = 1. - smoothstep(.65, .9, edge);
      edge = pow(edge, 4.);
    }

    edge = mix(smoothstep(.9 - 2. * fwidth(edge), .9, edge), edge, smoothstep(0.0, 0.4, u_contour));

  }

  float opacity = 0.;
  if (u_isImage == true) {
    opacity = img.g;
    float frame = getImgFrame(v_imageUV, 0.);
    opacity *= frame;
  } else {
    opacity = 1. - smoothstep(.9 - 2. * fwidth(edge), .9, edge);
    if (u_shape < 2.) {
      edge = 1.2 * edge;
    } else if (u_shape < 5.) {
      edge = 1.8 * pow(edge, 1.5);
    }
  }

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color = vec3(0.);
  vec3 color1 = vec3(.98, 0.98, 1.);
  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - .5;

  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1. - bump;
  bump *= pow(uv.y, .3);


  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);
  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

  float noise = snoise(uv - t);

  edge += (1. - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  float contour = 0.;
  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));
  direction *= mix(1., 1. - edge, smoothstep(.5, 1., u_contour));
  direction -= 1.7 * edge * smoothstep(.5, 1., u_contour);
  direction += .2 * pow(u_contour, 4.) * (1.0 - smoothstep(0., 1., edge));

  bump *= clamp(pow(uv.y, .1), .3, 1.);
  direction *= (.1 + (1.1 - edge) * bump);

  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));
  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));
  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));

  direction *= (.5 + .5 * pow(uv.y, 2.));
  direction *= cycleWidth;
  direction -= t;


  float colorDispersion = (1. - bump);
  colorDispersion = clamp(colorDispersion, 0., 1.);
  float dispersionRed = colorDispersion;
  dispersionRed += .03 * bump * noise;
  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));
  dispersionRed -= diagBLtoTR;

  float dispersionBlue = colorDispersion;
  dispersionBlue *= 1.3;
  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));
  dispersionBlue -= .2 * edge;

  dispersionRed *= (u_shiftRed / 20.);
  dispersionBlue *= (u_shiftBlue / 20.);

  float blur = 0.;
  float rExtraBlur = 0.;
  float gExtraBlur = 0.;
  if (u_isImage == true) {
    float softness = 0.05 * u_softness;
    blur = softness + .5 * smoothstep(1., 10., u_repetition) * smoothstep(.0, 1., edge);
    float smallCanvasT = 1.0 - smoothstep(100., 500., min(u_resolution.x, u_resolution.y));
    blur += smallCanvasT * smoothstep(.0, 1., edge);
    rExtraBlur = softness * (0.05 + .1 * (u_shiftRed / 20.) * bump);
    gExtraBlur = softness * 0.05 / max(0.001, abs(1. - diagBLtoTR));
  } else {
    blur = u_softness / 15. + .3 * contour;
  }

  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= .02 * smoothstep(.0, 1., edge + bump);
  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r) + rExtraBlur, bump, u_colorTint.r);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g) + gExtraBlur, bump, u_colorTint.g);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);

  color = vec3(r, g, b);
  color *= opacity;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  ${Sr}

  fragColor = vec4(color, opacity);
}
`,Br=`#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`,Er=Or;function Zt(e,t,o){const a=e.createShader(t);if(!a)throw new Error("metal-fx: gl.createShader returned null");if(e.shaderSource(a,o),e.compileShader(a),!e.getShaderParameter(a,e.COMPILE_STATUS)){const r=e.getShaderInfoLog(a);throw e.deleteShader(a),new Error(`metal-fx: shader compile failed: ${r??"(no info log)"}`)}return a}function Ir(e,t,o){const a=e.createProgram();if(!a)throw new Error("metal-fx: gl.createProgram returned null");if(e.attachShader(a,t),e.attachShader(a,o),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS)){const r=e.getProgramInfoLog(a);throw e.deleteProgram(a),new Error(`metal-fx: program link failed: ${r??"(no info log)"}`)}return a}const Uo=140,zo=40,Lo=1.6,No=1.3;let g=null,Ee=null;function Ar(){var e;if(Ee!==null)return Ee;if(typeof document>"u")return Ee=!1;try{const t=document.createElement("canvas").getContext("webgl2");Ee=!!t,(e=t==null?void 0:t.getExtension("WEBGL_lose_context"))==null||e.loseContext()}catch{Ee=!1}return Ee}let Ct=null;function Pr(e){Ct=e}const Fr=["u_resolution","u_time","u_pixelRatio","u_colorBack","u_colorTint","u_repetition","u_softness","u_shiftRed","u_shiftBlue","u_distortion","u_contour","u_angle","u_shape","u_isImage","u_image","u_originX","u_originY","u_worldWidth","u_worldHeight","u_fit","u_scale","u_rotation","u_offsetX","u_offsetY","u_imageAspectRatio"];function eo(e){e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA);const t=Zt(e,e.VERTEX_SHADER,Br),o=Zt(e,e.FRAGMENT_SHADER,Er),a=Ir(e,t,o);e.useProgram(a);const r=e.createBuffer();if(!r)throw new Error("metal-fx: gl.createBuffer returned null");e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);const i=e.getAttribLocation(a,"a_position");e.enableVertexAttribArray(i),e.vertexAttribPointer(i,2,e.FLOAT,!1,0,0);const n={};for(const s of Fr)n[s]=e.getUniformLocation(a,s);const l=e.createTexture();return l&&(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,l),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),n.u_image&&e.uniform1i(n.u_image,0)),{program:a,buffer:r,uniforms:n,dummyTexture:l}}function Vo(){if(g)return g;const e=Math.min(wr,typeof window<"u"&&window.devicePixelRatio||1),t=Math.round(vr*e),o=typeof OffscreenCanvas<"u";let a,r;if(o)a=new OffscreenCanvas(t,t),r=a.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});else{const d=document.createElement("canvas");d.width=t,d.height=t,r=d.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,preserveDrawingBuffer:!0}),a=d}if(!r)throw new Error("metal-fx: WebGL2 not supported");const{program:i,buffer:n,uniforms:l,dummyTexture:s}=eo(r),c=d=>{d.preventDefault(),g&&(g.contextLost=!0)},u=()=>{if(!g)return;const d=eo(g.gl);g.program=d.program,g.buffer=d.buffer,g.uniforms=d.uniforms,g.dummyTexture=d.dummyTexture,g.presetDirty=!0,g.contextLost=!1,Ct==null||Ct()};return a.addEventListener("webglcontextlost",c,!1),a.addEventListener("webglcontextrestored",u,!1),g={glCanvas:a,gl:r,program:i,buffer:n,uniforms:l,dummyTexture:s,preset:Fo.chromatic.modes.dark,presetDirty:!0,contextLost:!1,useOffscreen:o,frameBitmap:null,startMs:performance.now(),pausedMs:0,pausedAtMs:null,rafId:0,dpr:e,instances:new Set,frameCount:0,glowQueue:[],glowIdx:0,glowSkip:0,glowPixels:new Uint8Array(t*t*4),glowPixelsW:t,glowPixelsH:t},g}function Ur(){var e;if(!g)return;const{gl:t,program:o,buffer:a,frameBitmap:r,dummyTexture:i}=g;try{r==null||r.close(),t.deleteBuffer(a),t.deleteProgram(o),i&&t.deleteTexture(i),(e=t.getExtension("WEBGL_lose_context"))==null||e.loseContext()}catch{}g=null}let to=0;function zr(){if(!g)return;const e=performance.now();if(e-to<gr)return;to=e;const{gl:t,glCanvas:o}=g,a=o.width,r=o.height;(g.glowPixelsW!==a||g.glowPixelsH!==r)&&(g.glowPixelsW=a,g.glowPixelsH=r,g.glowPixels=new Uint8Array(a*r*4)),t.readPixels(0,0,a,r,t.RGBA,t.UNSIGNED_BYTE,g.glowPixels)}const Ie={bx:0,by:0};function $t(e,t,o){if(!g)return Ie.bx=0,Ie.by=0,Ie;const{glCanvas:a}=g,r=a.width,i=a.height,n=e.dpr,l=e.cssWidth*n,s=e.cssHeight*n,c=Uo*n,u=zo*n;let d=l*(r/c)/e.shaderScale,h=s*(i/u)/e.shaderScale;d>r&&(d=r),h>i&&(h=i);const x=(r-d)/2,m=(i-h)/2,f=x+t/e.cssWidth*d,y=m+o/e.cssHeight*h;return Ie.bx=Math.round(f),Ie.by=Math.round(i-1-y),Ie}const ce={r:0,g:0,b:0,lum:0,count:0};function Wo(e,t,o,a,r,i){const n=Math.max(1,i|0),l=Math.max(0,a-n),s=Math.min(t,a+n+1),c=Math.max(0,r-n),u=Math.min(o,r+n+1);ce.r=0,ce.g=0,ce.b=0,ce.lum=0,ce.count=0;for(let d=c;d<u;d++){const h=d*t;for(let x=l;x<s;x++){const m=(h+x)*4;ce.r+=e[m],ce.g+=e[m+1],ce.b+=e[m+2],ce.lum+=(.2126*e[m]+.7152*e[m+1]+.0722*e[m+2])/255,ce.count++}}return ce}const J={r:255,g:255,b:255};function St(e,t,o,a){if(!g)return 0;const r=$t(e,t,o),i=Wo(g.glowPixels,g.glowPixelsW,g.glowPixelsH,r.bx,r.by,a);return i.count>0?i.lum/i.count:0}function Do(e,t,o,a){if(!g)return J.r=255,J.g=255,J.b=255,J;const r=$t(e,t,o),i=Wo(g.glowPixels,g.glowPixelsW,g.glowPixelsH,r.bx,r.by,a);return i.count===0?(J.r=255,J.g=255,J.b=255,J):(J.r=i.r/i.count,J.g=i.g/i.count,J.b=i.b/i.count,J)}function Lr(e,t,o,a){if(!g)return J.r=255,J.g=255,J.b=255,J;const r=$t(e,t,o),{glowPixels:i,glowPixelsW:n,glowPixelsH:l}=g,s=Math.max(1,a|0),c=Math.max(0,r.bx-s),u=Math.min(n,r.bx+s+1),d=Math.max(0,r.by-s),h=Math.min(l,r.by+s+1);let x=-1;J.r=255,J.g=255,J.b=255;for(let m=d;m<h;m++){const f=m*n;for(let y=c;y<u;y++){const b=(f+y)*4,w=i[b],p=i[b+1],M=i[b+2],v=Math.max(w,p,M),A=Math.min(w,p,M),N=(v>0?(v-A)/v:0)*(.35+.65*(v/255));N>x&&(x=N,J.r=w,J.g=p,J.b=M)}}return J}const pt=14,oo=1.5,gt={x:0,y:0};function De(e=512){return{xy:new Float32Array(e*2),n:0}}function He(e,t,o,a,r,i,n=De()){r=Math.max(0,Math.min(r,Math.min(o,a)/2));const l=4*(pt+1)+Math.ceil(2*(o+a)/oo)+8;n.xy.length<l*2&&(n.xy=new Float32Array(l*2));const s=n.xy;let c=0;const u=(x,m)=>{i?(i(x,m,gt),s[c*2]=gt.x,s[c*2+1]=gt.y):(s[c*2]=x,s[c*2+1]=m),c++},d=(x,m,f,y)=>{const b=Math.hypot(f-x,y-m),w=Math.max(1,Math.ceil(b/oo));for(let p=0;p<w;p++){const M=p/w;u(x+(f-x)*M,m+(y-m)*M)}},h=(x,m,f,y)=>{for(let b=0;b<=pt;b++){const w=f+(y-f)*(b/pt);u(x+r*Math.cos(w),m+r*Math.sin(w))}};return d(e+r,t,e+o-r,t),h(e+o-r,t+r,-Math.PI/2,0),d(e+o,t+r,e+o,t+a-r),h(e+o-r,t+a-r,0,Math.PI/2),d(e+o-r,t+a,e+r,t+a),h(e+r,t+a-r,Math.PI/2,Math.PI),d(e,t+a-r,e,t+r),h(e+r,t+r,Math.PI,1.5*Math.PI),n.n=c,n}Pr(()=>{g&&g.instances.size>0&&g.pausedAtMs===null&&tt()});typeof document<"u"&&document.addEventListener("visibilitychange",()=>{!g||g.pausedAtMs!==null||g.contextLost||(document.hidden?Xo():g.instances.size>0&&tt())});function Nr(e){const t=Vo(),o=e.hostCanvas.getContext("2d",{alpha:!0});if(!o)throw new Error("metal-fx: canvas 2D context unavailable");const a=e.scale??1,r={canvas:e.hostCanvas,ctx:o,cssWidth:e.cssWidth,cssHeight:e.cssHeight,cornerRadius:e.cornerRadius,kind:e.kind,ringCssPx:e.ringCssPx??(e.kind==="circle"?2:1)*a,shaderScale:e.shaderScale??(e.kind==="circle"?No:Lo)*a,opacityMul:e.opacityMul??1,glowGain:e.glowGain??1,visible:!0,paused:e.paused??!1,everCopied:!1,frozen:null,dpr:typeof window<"u"&&window.devicePixelRatio||1,scale:a,onAfterFrame:e.onAfterFrame,onComposite:e.onComposite,onFirstCopy:e.onFirstCopy,mask:e.mask??null,deform:null,deformLayers:null,overscan:0,cursorLight:null,glowFast:!1,rawCanvas:null,wantRaw:!1,ringCanvas:null,wantRing:!1};return Gt(r),t.instances.add(r),t.rafId===0&&t.pausedAtMs===null&&tt(),r}function Vr(e){if(!g)return;g.instances.delete(e);const t=g.glowQueue.indexOf(e);t!==-1&&g.glowQueue.splice(t,1),g.instances.size===0&&(Xo(),Ur())}function Wr(e){g&&(g.glowQueue.includes(e)||g.glowQueue.push(e))}function Dr(e){if(!g)return;const t=g.glowQueue.indexOf(e);t!==-1&&g.glowQueue.splice(t,1)}function Ae(e,t){let o=!1;t.mask!==void 0&&(e.mask=t.mask),t.cssWidth!==void 0&&t.cssWidth!==e.cssWidth&&(e.cssWidth=t.cssWidth,o=!0),t.cssHeight!==void 0&&t.cssHeight!==e.cssHeight&&(e.cssHeight=t.cssHeight,o=!0),t.cornerRadius!==void 0&&(e.cornerRadius=t.cornerRadius),t.scale!==void 0&&(e.scale=t.scale),t.kind!==void 0&&t.kind!==e.kind&&(e.kind=t.kind,t.shaderScale===void 0&&(e.shaderScale=(t.kind==="circle"?No:Lo)*e.scale),t.ringCssPx===void 0&&(e.ringCssPx=(t.kind==="circle"?2:1)*e.scale)),t.shaderScale!==void 0&&(e.shaderScale=t.shaderScale),t.ringCssPx!==void 0&&(e.ringCssPx=t.ringCssPx),t.opacityMul!==void 0&&(e.opacityMul=t.opacityMul),t.glowGain!==void 0&&(e.glowGain=t.glowGain),t.paused!==void 0&&t.paused!==e.paused&&(e.paused=t.paused,t.paused?Ho(e):e.frozen=null,!t.paused&&g&&g.rafId===0&&g.pausedAtMs===null&&!g.contextLost&&tt()),o&&Gt(e)}function Hr(e,t){e.visible=t,t&&g&&g.rafId===0&&g.pausedAtMs===null&&!g.contextLost&&tt()}function $r(e){return(typeof window<"u"&&window.devicePixelRatio||1)===e.dpr?!1:(Gt(e),$o(e),!0)}function Gr(e,t){const o=Vo();o.preset=Fo[e].modes[t],o.presetDirty=!0}let Ce=null;function Xr(e){Ce=e}function xt(e,t){!Ce||!g||!e.visible||e.paused||g.glowQueue.includes(e)&&(e.glowFast=!!Ce(e,t))}function Gt(e){e.dpr=typeof window<"u"&&window.devicePixelRatio||1;const t=e.overscan,o=Math.max(1,Math.round((e.cssWidth+2*t)*e.dpr)),a=Math.max(1,Math.round((e.cssHeight+2*t)*e.dpr));e.canvas.width!==o&&(e.canvas.width=o),e.canvas.height!==a&&(e.canvas.height=a);const r=e.canvas.style;t>0?(r.left=`${-t}px`,r.top=`${-t}px`,r.width=`calc(100% + ${2*t}px)`,r.height=`calc(100% + ${2*t}px)`,r.borderRadius="0"):r.left!==""&&(r.left="",r.top="",r.width="100%",r.height="100%",r.borderRadius="")}function Yr(e){const{ctx:t,dpr:o,canvas:a}=e,r=e.ringCssPx*o,i=a.width,n=a.height,l=Math.max(0,(e.cornerRadius-e.ringCssPx)*o);t.save(),t.globalCompositeOperation="destination-out",t.fillStyle="#000",t.beginPath(),t.roundRect(r,r,i-2*r,n-2*r,l),t.fill(),t.restore()}const jr=De();function Re(e,t,o,a,r,i,n,l){const{xy:s,n:c}=He(t,o,a,r,i,n,jr);e.beginPath();for(let u=0;u<c;u++)u===0?e.moveTo(s[0]*l,s[1]*l):e.lineTo(s[u*2]*l,s[u*2+1]*l);e.closePath()}function Ho(e){if(!g)return null;const t=g.frameBitmap??g.glCanvas,o=g.glCanvas.width,a=g.glCanvas.height;if(o<1||a<1)return null;let r=e.frozen;r||(r=document.createElement("canvas"),e.frozen=r),(r.width!==o||r.height!==a)&&(r.width=o,r.height=a);const i=r.getContext("2d");return i?(i.clearRect(0,0,o,a),i.drawImage(t,0,0),r):(e.frozen=null,null)}function $o(e){var t,o;if(!g)return;const a=(e.paused?e.frozen??Ho(e):null)??g.frameBitmap??g.glCanvas,r=e.dpr,i=e.canvas.width,n=e.canvas.height;if(i<1||n<1)return;const l=Math.max(1,Math.round(e.cssWidth*r)),s=Math.max(1,Math.round(e.cssHeight*r)),c=e.overscan*r,u=a.width,d=a.height,h=Uo*r,x=zo*r;let m=l*(u/h)/e.shaderScale,f=s*(d/x)/e.shaderScale;m>u&&(m=u),f>d&&(f=d);const y=Math.max(0,(u-m)/2),b=Math.max(0,(d-f)/2),w=e.opacityMul*g.preset.shaderOpacity,p=e.ctx;p.clearRect(0,0,i,n);const M=e.deform;if(e.mask){if(w<1&&(p.globalAlpha=w),p.drawImage(a,y,b,m,f,0,0,i,n),w<1&&(p.globalAlpha=1),e.wantRaw){let v=e.rawCanvas;v||(v=document.createElement("canvas"),e.rawCanvas=v),(v.width!==i||v.height!==n)&&(v.width=i,v.height=n);const A=v.getContext("2d");A&&(A.clearRect(0,0,i,n),A.drawImage(e.canvas,0,0))}p.save(),p.globalCompositeOperation="destination-in",p.fillStyle="#000",e.mask(p,i,n,r),p.restore(),p.globalCompositeOperation="source-over"}else if(!M)w<1&&(p.globalAlpha=w),p.drawImage(a,y,b,m,f,0,0,i,n),w<1&&(p.globalAlpha=1),Yr(e);else{const v=e.cssWidth,A=e.cssHeight,N=e.cornerRadius,U=e.ringCssPx,I=e.deformLayers;p.save(),p.translate(c,c);const X=l/m,P=s/f,z=Math.min(u,m*(l+2*c)/l),k=Math.min(d,f*(s+2*c)/s),D=Math.max(0,(u-z)/2),Y=Math.max(0,(d-k)/2),H=z*X,C=k*P;if(w<1&&(p.globalAlpha=w),p.drawImage(a,D,Y,z,k,l/2-H/2,s/2-C/2,H,C),w<1&&(p.globalAlpha=1),p.globalCompositeOperation="destination-in",Re(p,0,0,v,A,N,M,r),p.fillStyle="#000",p.fill(),p.globalCompositeOperation="destination-out",Re(p,U,U,v-2*U,A-2*U,Math.max(0,N-U),M,r),p.fill(),e.wantRing){let _=e.ringCanvas;_||(_=document.createElement("canvas"),e.ringCanvas=_),(_.width!==i||_.height!==n)&&(_.width=i,_.height=n);const S=_.getContext("2d");S&&(S.setTransform(1,0,0,1,0,0),S.globalCompositeOperation="source-over",S.clearRect(0,0,i,n),S.translate(c,c),w<1&&(S.globalAlpha=w),S.drawImage(a,D,Y,z,k,l/2-H/2,s/2-C/2,H,C),S.globalAlpha=1,S.globalCompositeOperation="destination-out",Re(S,U,U,v-2*U,A-2*U,Math.max(0,N-U),M,r),S.fillStyle="#000",S.fill(),S.globalCompositeOperation="source-over",S.setTransform(1,0,0,1,0,0))}if(I!=null&&I.hairline){const _=I.hairline;p.globalCompositeOperation="destination-over",Re(p,_.inset,_.inset,v-2*_.inset,A-2*_.inset,Math.max(0,N-_.inset),M,r),p.lineWidth=_.width*r,p.strokeStyle=_.color,p.stroke()}if(I!=null&&I.fill&&(p.globalCompositeOperation="destination-over",Re(p,0,0,v,A,N,M,r),p.fillStyle=I.fill,p.fill()),I!=null&&I.rim){const _=I.rim;p.globalCompositeOperation="source-over",p.save(),Re(p,0,0,v,A,N,M,r),p.clip();const S=_.inset+_.width/2;Re(p,S,S,v-2*S,A-2*S,Math.max(0,N-S),M,r),p.lineWidth=_.width*r,p.strokeStyle=_.color,p.stroke(),p.restore()}p.restore(),p.globalCompositeOperation="source-over"}if((t=e.onComposite)==null||t.call(e),e.onFirstCopy){const v=e.onFirstCopy;e.onFirstCopy=void 0,v()}(o=e.onAfterFrame)==null||o.call(e)}function qr(){if(!g)return;const{gl:e,uniforms:t,preset:o,glCanvas:a,dpr:r}=g;t.u_resolution&&e.uniform2f(t.u_resolution,a.width,a.height),t.u_pixelRatio&&e.uniform1f(t.u_pixelRatio,r),t.u_colorBack&&e.uniform4fv(t.u_colorBack,Jt(o.colorBack)),t.u_colorTint&&e.uniform4fv(t.u_colorTint,Jt(o.colorTint)),t.u_repetition&&e.uniform1f(t.u_repetition,o.repetition),t.u_softness&&e.uniform1f(t.u_softness,o.softness),t.u_shiftRed&&e.uniform1f(t.u_shiftRed,o.shiftRed),t.u_shiftBlue&&e.uniform1f(t.u_shiftBlue,o.shiftBlue),t.u_distortion&&e.uniform1f(t.u_distortion,o.distortion),t.u_contour&&e.uniform1f(t.u_contour,o.contour),t.u_angle&&e.uniform1f(t.u_angle,o.angle),t.u_shape&&e.uniform1f(t.u_shape,o.shape),t.u_isImage&&e.uniform1i(t.u_isImage,0),t.u_imageAspectRatio&&e.uniform1f(t.u_imageAspectRatio,1),t.u_originX&&e.uniform1f(t.u_originX,o.originX),t.u_originY&&e.uniform1f(t.u_originY,o.originY),t.u_worldWidth&&e.uniform1f(t.u_worldWidth,o.worldWidth),t.u_worldHeight&&e.uniform1f(t.u_worldHeight,o.worldHeight),t.u_fit&&e.uniform1f(t.u_fit,o.fit),t.u_scale&&e.uniform1f(t.u_scale,o.scale),t.u_rotation&&e.uniform1f(t.u_rotation,o.rotation),t.u_offsetX&&e.uniform1f(t.u_offsetX,o.offsetX),t.u_offsetY&&e.uniform1f(t.u_offsetY,o.offsetY),g.presetDirty=!1}function Qr(e){if(!g)return;const{gl:t,uniforms:o,preset:a,glCanvas:r}=g,i=(e-g.startMs-g.pausedMs)/1e3*a.speed;t.viewport(0,0,r.width,r.height),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),g.presetDirty&&qr(),o.u_time&&t.uniform1f(o.u_time,i),t.drawArrays(t.TRIANGLES,0,6),g.frameCount++}let ro=0;function Go(e){var t;if(!g)return;if(g.contextLost){g.rafId=0;return}let o=!1;for(const a of g.instances)if(a.visible&&(!a.paused||!a.everCopied)){o=!0;break}if(!o){g.rafId=0;return}if(g.rafId=requestAnimationFrame(Go),e-ro<mr){if(Ce)for(const a of g.glowQueue)a.glowFast&&a.visible&&!a.paused&&(a.glowFast=!!Ce(a,e));return}ro=e,Qr(e),zr(),g.useOffscreen&&((t=g.frameBitmap)==null||t.close(),g.frameBitmap=g.glCanvas.transferToImageBitmap());for(const a of g.instances)a.visible&&(a.paused&&a.everCopied||($o(a),a.everCopied=!0));if(Ce&&g.glowQueue.length>0&&++g.glowSkip%xr===0)for(const a of g.glowQueue)a.visible&&!a.paused&&(a.glowFast=!!Ce(a,e))}function tt(){!g||g.rafId!==0||(g.rafId=requestAnimationFrame(Go))}function Xo(){g&&(g.rafId!==0&&cancelAnimationFrame(g.rafId),g.rafId=0)}const Tt={linear:e=>e,smoothstep:e=>e*e*(3-2*e)};function Xe(e,t,o,a=Tt.linear){return{from:e,to:t,dur:o,ease:a,startMs:-1,val:e,done:!1}}function Ye(e,t){e.startMs=t,e.val=e.from,e.done=!1}function ao(e,t){if(e.done||e.startMs<0)return e.val;const o=Math.min(1,(t-e.startMs)/e.dur);return e.val=e.from+(e.to-e.from)*e.ease(o),o>=1&&(e.done=!0),e.val}const Jr=Object.freeze({haloOpMul:2,extraIntensity:3.51,peakOp:.85,baseOp:.34,inset:1.5,extraOutward:1,wanderRange:15,wanderLerp:.0075,fadeRate:.00875,lumLo:.08,lumHi:.32,minDwellMs:1500,relocFadeMs:300,relocFadeOutMs:450,pointGain:2.5,haloHalfLen:7.8,extraHalfLen:9.13952/3,haloStrokeXl:26.4,haloStrokeLg:15.6,haloStrokeMd:7.2,haloStrokeSm:3,haloBlurXl:8.4,haloBlurLg:4.8,haloBlurMd:2.1,haloBlurSm:.9,haloOpXl:.385,haloOpLg:.595,haloOpMd:.7,haloOpSm:.7,extraStrokeOuter:4/3,extraStrokeCore:2/3,extraBlurOuter:2/3,extraBlurCore:1.35/3,extraFadeR:13/3,extraOpOuter:.85}),R={...Jr},no=new Set;function Kr(e){return no.add(e),()=>{no.delete(e)}}const Zr=Object.freeze({enabled:!0,reach:56,fadeMs:200,cursor:!0,cursorDistance:186,cursorStrength:3.35,cursorDiffuse:1.4,cursorFalloff:37,cursorDepth:.4,cursorEdge:0,cursorReach:11.5,cursorBlur:.5,cursorZoom:3,spill:!1,spillRadius:48,spillStrength:.55,spillOffset:.35,spillLumGain:.7,spillSaturation:1.3,spillInside:.5,spillBlur:0,catchLight:!1,catchFollow:.25,catchGain:1}),qe={...Zr};let Yo=!1,jo=0,st=0,Qe=0,$e=!1,Te=0,Ot=0,pe=Number.NaN,Se=Number.NaN,Bt=0,Et=0,ke=0,Ue=0,Q=null;const K={d:0,nx:0,ny:0,k:1,left:0,top:0},vt={x:0,y:0},fe={r:255,g:255,b:255};let xe=null,It="",At=-1,Pt=-1,Ze=!1;function ea(){Qe++,ra()}function ta(){Qe=Math.max(0,Qe-1),Qe===0&&aa()}const oa=e=>typeof window.matchMedia=="function"&&window.matchMedia(e).matches;function io(){return Yo||performance.now()<jo,!1}function ra(){$e||Qe===0||typeof document>"u"||oa("(pointer: fine)")&&($e=!0,document.addEventListener("pointermove",qo,{passive:!0}),document.addEventListener("pointerleave",ye),document.addEventListener("pointercancel",ye),document.addEventListener("keydown",Qo,{passive:!0}),document.addEventListener("visibilitychange",ye),window.addEventListener("blur",ye))}function aa(){$e&&($e=!1,document.removeEventListener("pointermove",qo),document.removeEventListener("pointerleave",ye),document.removeEventListener("pointercancel",ye),document.removeEventListener("keydown",Qo),document.removeEventListener("visibilitychange",ye),window.removeEventListener("blur",ye),Te!==0&&(cancelAnimationFrame(Te),Te=0),Q&&(Q.cursorLight=null,Q=null),ke=0,Ue=0,xe&&(xe.remove(),xe=null,It="",At=-1,Pt=-1,Ze=!1),Be(),Me&&(Me.remove(),Me=null))}let Ft=!0,Xt=!1;function qo(e){Ft=e.pointerType==="mouse"||e.pointerType==="",Xt=!1,pe=Bt=e.clientX,Se=Et=e.clientY,Ut&&Me&&(Ft&&Ko(pe,Se)?void 0:Be()),Jo()}function Qo(){Xt=!0,Be()}function ye(){pe=Se=Number.NaN,Jo()}function Jo(){!$e||Te!==0||(Ot=performance.now(),Te=requestAnimationFrame(Zo))}function na(e,t,o,a,r,i,n){const l=i==="circle"?Math.min(o,a)/2:Math.max(0,Math.min(r,Math.min(o,a)/2)),s=o/2,c=a/2,u=Math.max(0,o/2-l),d=Math.max(0,a/2-l),h=Math.max(-u,Math.min(u,e-s)),x=Math.max(-d,Math.min(d,t-c)),m=e-s-h,f=t-c-x,y=Math.hypot(m,f);if(y>1e-6)return n.x=s+h+m/y*l,n.y=c+x+f/y*l,y-l;const b=e,w=o-e,p=t,M=a-t,v=Math.min(b,w,p,M);return v===b?(n.x=0,n.y=t):v===w?(n.x=o,n.y=t):v===p?(n.x=e,n.y=0):(n.x=e,n.y=a),-v}let Me=null,Ut=!1,Ve=!1,zt="",ge=null,Je="";const ia=/^(INPUT|TEXTAREA|SELECT)$/;let Lt=new WeakMap,so=0,Nt=null;function sa(e){let t=e;for(;t&&t!==document.body;){if(ia.test(t.tagName)||t.isContentEditable)return!0;t=t.parentElement}return!1}function la(){if(Me)return!0;const e=document.createElement("div");e.className="metal-fx-cursor",e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:0;top:0;pointer-events:none;z-index:2147483001;will-change:transform;transform-origin:0 0;display:none";const t=document.createElement("canvas");t.style.display="block",e.appendChild(t),document.body.appendChild(e);const o=t.getContext("2d"),a=document.createElement("canvas"),r=a.getContext("2d");return!o||!r?(e.remove(),!1):(Me=e,!0)}function Ko(e,t,o=!1){const a=performance.now();if(!o&&Ve&&a-so<12)return!0;so=a;const r=document.elementFromPoint(e,t);if(!r)return Vt(),!1;if(r===Nt&&Ve)return!0;Nt=r;let i=Lt.get(r);if(i===void 0){if(i=!sa(r),i){const n=getComputedStyle(r).cursor;i=n==="auto"||n==="default"||n==="none"}Lt.set(r,i)}if(!i)return Vt(),!1;if(!Ve){const n=document.documentElement;zt=n.style.cursor,n.style.cursor="none",Ve=!0}return r!==ge&&(ge&&(ge.style.cursor=Je,ge=null,Je=""),getComputedStyle(r).cursor!=="none"&&(ge=r,Je=r.style.cursor,r.style.cursor="none")),!0}function Vt(){ge&&(ge.isConnected&&(ge.style.cursor=Je),ge=null,Je=""),Ve&&(document.documentElement.style.cursor=zt,Ve=!1,zt=""),Nt=null,Lt=new WeakMap}function Be(){Vt(),Me&&Ut&&(Me.style.display="none",Ut=!1)}function ca(){if(xe)return xe;const e=document.createElement("div");return e.className="metal-fx-cursor-spill",e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;border-radius:50%;mix-blend-mode:plus-lighter;will-change:transform,opacity;opacity:0;display:none",document.body.appendChild(e),xe=e,e}function Wt(){!xe||!Ze||(xe.style.display="none",xe.style.opacity="0",Ze=!1)}function Zo(e){if(Te=0,!$e)return;const t=performance.now();try{ua(e)}catch(o){Yo=!0,Be(),Wt(),Q&&(Q.cursorLight=null,Q=null),typeof console<"u"&&console.warn("metal-fx: cursor light disabled after error",o);return}performance.now()-t>6?++st>=20&&(st=0,jo=performance.now()+5e3,Be()):st>0&&st--}function ua(e){const t=qe,o=Math.min(.05,Math.max(.001,(e-Ot)/1e3));Ot=e;let a=null,r=0,i=0;if(t.enabled&&g&&!Number.isNaN(pe)){let l=Number.POSITIVE_INFINITY;const s=Math.max(1,t.reach),c=t.cursor&&io()?Math.max(1,t.cursorDistance):0,u=Math.max(s,c);for(const d of g.instances){if(!d.visible||!d.canvas.isConnected)continue;const h=d.canvas.getBoundingClientRect();if(h.width<=0)continue;const x=d.overscan,m=h.width/(d.cssWidth+2*x),f=h.left+x*m,y=h.top+x*m,b=u*m;if(pe<f-b||pe>f+d.cssWidth*m+b||Se<y-b||Se>y+d.cssHeight*m+b)continue;const w=(pe-f)/m,p=(Se-y)/m,M=na(w,p,d.cssWidth,d.cssHeight,d.cornerRadius,d.kind,vt),v=Math.abs(M);v<=u&&v<l&&(l=v,a=d,K.d=M,K.nx=vt.x,K.ny=vt.y,K.k=m,K.left=f,K.top=y)}if(a){if(l<=s){const d=1-l/s;r=d*d*(3-2*d)}l<=c&&(i=Math.min(1,(1-l/c)*3)),a.mask&&(K.nx=a.cssWidth/2,K.ny=a.cssHeight/2,a.wantRaw=!0)}}const n=1-Math.exp(-(o*1e3)/(Math.max(1,t.fadeMs)/3));if(ke+=(r-ke)*n,Ue+=(i-Ue)*n,a&&a!==Q&&(Q&&(Q.cursorLight=null,xt(Q,e)),Q=a),!a&&ke<.002&&Ue<.002){ke=0,Ue=0,Q&&(Q.cursorLight=null,xt(Q,e),Q=null),Wt(),Be();return}if(Q){if(t.catchLight){const l=Q.cursorLight??(Q.cursorLight={x:0,y:0,w:0});l.x=K.nx,l.y=K.ny,l.w=ke}else Q.cursorLight&&(Q.cursorLight=null);if(xt(Q,e),t.cursor&&Ue>.002&&Ft&&!Xt&&!Number.isNaN(pe)&&io()&&la()&&Ko(pe,Se)?void 0:Be(),t.spill){const l=ca(),s=Do(Q,K.nx,K.ny,2),c=St(Q,K.nx,K.ny,3),u=Math.max(s.r,s.g,s.b)||1,d=Ao(s.r*255/u,s.g*255/u,s.b*255/u),[h,x,m]=Po(d[0],Math.min(1,d[1]*t.spillSaturation),1);fe.r+=(h-fe.r)*.15,fe.g+=(x-fe.g)*.15,fe.b+=(m-fe.b)*.15;const f=Math.round(fe.r/6)*6,y=Math.round(fe.g/6)*6,b=Math.round(fe.b/6)*6,w=`radial-gradient(closest-side, rgba(${f},${y},${b},1) 0%, rgba(${f},${y},${b},0.35) 45%, rgba(${f},${y},${b},0) 100%)`;w!==It&&(It=w,l.style.background=w);const p=Math.max(1,t.spillRadius*K.k);p!==At&&(At=p,l.style.width=`${(2*p).toFixed(1)}px`,l.style.height=`${(2*p).toFixed(1)}px`),t.spillBlur!==Pt&&(Pt=t.spillBlur,l.style.filter=t.spillBlur>0?`blur(${t.spillBlur}px)`:"");const M=K.left+K.nx*K.k,v=K.top+K.ny*K.k,A=Bt+(M-Bt)*t.spillOffset,N=Et+(v-Et)*t.spillOffset;l.style.transform=`translate3d(${(A-p).toFixed(2)}px,${(N-p).toFixed(2)}px,0)`;const U=Math.min(1,Math.max(0,c/.3)),I=1-t.spillLumGain+t.spillLumGain*U,X=K.d<0?t.spillInside:1,P=Math.max(0,Math.min(1,t.spillStrength*ke*I*X));Ze||(l.style.display="",Ze=!0),l.style.opacity=P.toFixed(3)}else Wt();Te=requestAnimationFrame(Zo)}}const dt=new Map;function da(e,t){const o=Math.sqrt(12*e*e/t+1);let a=Math.floor(o);a%2===0&&a--;const r=a+2,i=(12*e*e-t*a*a-4*t*a-3*t)/(-4*a-4),n=Math.round(i),l=[];for(let s=0;s<t;s++)l.push(s<n?a:r);return l}function ha(e,t,o,a,r){const i=1/(r+r+1);for(let n=0;n<a;n++){const l=n*o;let s=0;for(let c=-r;c<=r;c++)s+=e[l+Math.min(o-1,Math.max(0,c))];for(let c=0;c<o;c++){t[l+c]=s*i;const u=l+Math.max(0,c-r),d=l+Math.min(o-1,c+r+1);s+=e[d]-e[u]}}}function fa(e,t,o,a,r){const i=1/(r+r+1);for(let n=0;n<o;n++){let l=0;for(let s=-r;s<=r;s++)l+=e[Math.min(a-1,Math.max(0,s))*o+n];for(let s=0;s<a;s++){t[s*o+n]=l*i;const c=Math.max(0,s-r)*o+n,u=Math.min(a-1,s+r+1)*o+n;l+=e[u]-e[c]}}}function Yt(e,t,o,a){if(a<=.05)return e;const r=new Float32Array(e.length);let i=e;for(const n of da(a,3)){const l=(n-1)/2;ha(i,r,t,o,l),fa(r,i,t,o,l)}return i}function ma(e,t,o,a,r,i,n){const l=document.createElement("canvas");l.width=o,l.height=a;const s=l.getContext("2d",{willReadFrequently:!0}),c=new Float32Array(o*a);if(!s)return c;s.scale(r,r),s.strokeStyle="#fff",s.lineCap="round",s.lineJoin="round",s.lineWidth=t,s.beginPath(),s.moveTo(i-e,n),s.lineTo(i+e,n),s.stroke();const u=s.getImageData(0,0,o,a).data;for(let d=0,h=3;d<c.length;d++,h+=4)c[d]=u[h]/255;return c}function er(e,t,o,a,r){let i=0;for(const f of e)i=Math.max(i,(f.stroke/2+3*f.blur)*o);const n=Math.ceil(i)+1,l=2*t+2*n,s=2*n,c=Math.ceil(l*a),u=Math.ceil(s*a),d=new Float32Array(c*u);for(const f of e){let y=ma(t,f.stroke*o,c,u,a,n,n);y=Yt(y,c,u,f.blur*o*a);const b=f.opacity;for(let w=0;w<d.length;w++){const p=y[w]*b;d[w]=d[w]+p*(1-d[w])}}if(r>0){const f=n*a,y=n*a,b=r*o*a;for(let w=0;w<u;w++)for(let p=0;p<c;p++){const M=Math.hypot(p+.5-f,w+.5-y)/b;let v;M<=.3?v=1:M<=.65?v=1-(M-.3)/.35*.75:M<1?v=.25*(1-(M-.65)/.35):v=0,d[w*c+p]*=v}}const h=document.createElement("canvas");h.width=c,h.height=u;const x=h.getContext("2d"),m=new Uint8ClampedArray(c*u);for(let f=0;f<d.length;f++)m[f]=Math.round(Math.min(1,d[f])*255);if(x){const f=x.createImageData(c,u),y=f.data;for(let b=0,w=0;b<d.length;b++,w+=4)y[w]=255,y[w+1]=255,y[w+2]=255,y[w+3]=m[b];x.putImageData(f,0,0)}return{canvas:h,alpha:m,w:l,h:s,ax:n,ay:n}}function tr(){return[R.haloStrokeXl,R.haloStrokeLg,R.haloStrokeMd,R.haloStrokeSm,R.haloBlurXl,R.haloBlurLg,R.haloBlurMd,R.haloBlurSm,R.haloOpXl,R.haloOpLg,R.haloOpMd,R.haloOpSm,R.extraStrokeOuter,R.extraStrokeCore,R.extraBlurOuter,R.extraBlurCore,R.extraFadeR,R.extraOpOuter].join(",")}function pa(e,t,o){const a=`h|${e.toFixed(2)}|${t}|${o}|${tr()}`;let r=dt.get(a);return r||(r=er([{stroke:R.haloStrokeXl,blur:R.haloBlurXl,opacity:R.haloOpXl},{stroke:R.haloStrokeLg,blur:R.haloBlurLg,opacity:R.haloOpLg},{stroke:R.haloStrokeMd,blur:R.haloBlurMd,opacity:R.haloOpMd},{stroke:R.haloStrokeSm,blur:R.haloBlurSm,opacity:R.haloOpSm}],e,t,o,0),dt.set(a,r)),r}function ga(e,t,o){const a=`e|${e.toFixed(2)}|${t}|${o}|${tr()}`;let r=dt.get(a);return r||(r=er([{stroke:R.extraStrokeOuter,blur:R.extraBlurOuter,opacity:R.extraOpOuter},{stroke:R.extraStrokeCore,blur:R.extraBlurCore,opacity:1}],e,t,o,R.extraFadeR),dt.set(a,r)),r}function lo(e,t,o,a,r){var i;const n=t<<16|o<<8|a;if(r.canvas&&r.tint===n&&r.src===e)return r.canvas;let l=r.canvas,s=r.img;(!l||!s||r.src!==e)&&(l=document.createElement("canvas"),l.width=e.canvas.width,l.height=e.canvas.height,s=((i=l.getContext("2d"))==null?void 0:i.createImageData(l.width,l.height))??null);const c=l.getContext("2d");if(c&&s){const u=s.data,d=e.alpha;for(let h=0,x=0;h<d.length;h++,x+=4)u[x]=t,u[x+1]=o,u[x+2]=a,u[x+3]=d[h];c.putImageData(s,0,0)}return r.canvas=l,r.img=s,r.tint=n,r.src=e,l}function jt(e,t,o){const a=Math.max(0,Math.min(o,Math.min(e,t)/2));return 2*Math.max(0,e-2*a)+2*Math.max(0,t-2*a)+2*Math.PI*a}function ht(e,t,o,a){return a==="circle"?2*Math.PI*Math.max(0,Math.min(o,Math.min(e,t)/2)):jt(e,t,o)}function et(e,t,o,a,r,i,n,l){const s=l||{x:0,y:0},c=Math.max(0,Math.min(a,Math.min(t,o)/2));if(n==="circle"){const b=2*Math.PI*c;if(b<=1e-4)return s.x=t*.5,s.y=o*.5,s;e=(e%b+b)%b;const w=-Math.PI/2+e/b*Math.PI*2,p=Math.max(0,c-r+i);return s.x=t*.5+p*Math.cos(w),s.y=o*.5+p*Math.sin(w),s}const u=Math.max(0,t-2*c),d=Math.max(0,o-2*c),h=Math.PI*c/2,x=2*(u+d)+4*h;e=(e%x+x)%x;const m=Math.max(0,c-r+i);let f=e;if(f<u)return s.x=c+f,s.y=r-i,s;if(f-=u,f<h){const b=-Math.PI/2+(h>0?f/h:0)*(Math.PI/2);return s.x=t-c+m*Math.cos(b),s.y=c+m*Math.sin(b),s}if(f-=h,f<d)return s.x=t-r+i,s.y=c+f,s;if(f-=d,f<h){const b=(h>0?f/h:0)*(Math.PI/2);return s.x=t-c+m*Math.cos(b),s.y=o-c+m*Math.sin(b),s}if(f-=h,f<u)return s.x=t-c-f,s.y=o-r+i,s;if(f-=u,f<h){const b=Math.PI/2+(h>0?f/h:0)*(Math.PI/2);return s.x=c+m*Math.cos(b),s.y=o-c+m*Math.sin(b),s}if(f-=h,f<d)return s.x=r-i,s.y=o-c-f,s;f-=d;const y=Math.PI+(h>0?f/h:0)*(Math.PI/2);return s.x=c+m*Math.cos(y),s.y=c+m*Math.sin(y),s}function xa(e,t,o,a,r,i){const n=Math.max(0,Math.min(r,Math.min(o,a)/2));if(i==="circle"){const v=2*Math.PI*n;return v<=1e-4?0:((Math.atan2(t-a/2,e-o/2)+Math.PI/2)/(2*Math.PI)*v%v+v)%v}const l=Math.max(0,o-2*n),s=Math.max(0,a-2*n),c=Math.PI*n/2,u=Math.PI/2,d=l,h=d+c,x=h+s,m=x+c,f=m+l,y=f+c,b=y+s,w=e>=n&&e<=o-n,p=t>=n&&t<=a-n;if(w&&p){const v=e,A=o-e,N=t,U=a-t,I=Math.min(v,A,N,U);return I===N?e-n:I===A?h+(t-n):I===U?m+(o-n-e):y+(a-n-t)}if(w)return t<a/2?e-n:m+(o-n-e);if(p)return e>o/2?h+(t-n):y+(a-n-t);if(e>o/2&&t<a/2){const v=Math.atan2(t-n,e-(o-n));return d+(v+u)/u*c}if(e>o/2){const v=Math.atan2(t-(a-n),e-(o-n));return x+v/u*c}if(t>a/2){const v=Math.atan2(t-(a-n),e-n);return f+(v-u)/u*c}const M=Math.atan2(t-n,e-n);return b+(M+Math.PI)/u*c}const wt={x:0,y:0},bt={x:0,y:0};function va(e,t,o,a,r,i){return et(e-.1,t,o,a,r,0,i,wt),et(e+.1,t,o,a,r,0,i,bt),Math.atan2(bt.y-wt.y,bt.x-wt.x)}function co(e,t,o){if(e===t)return o<e?0:1;const a=Math.max(0,Math.min(1,(o-e)/(t-e)));return a*a*(3-2*a)}function wa(e){if(e.samplePoints&&e.samplePoints.length>0)return e.samplePoints.map((r,i)=>({x:r.x,y:r.y,arc:i}));const t=ht(e.width,e.height,e.cornerRadius,e.kind),o=R.inset*(e.scale??1),a=[];for(let r=0;r<Kt;r++){const i=r/Kt*t,n=et(i,e.width,e.height,e.cornerRadius,o,0,e.kind);a.push({x:n.x,y:n.y,arc:i})}return a}const ba=.05,ya=120*(1e3/15),uo=1e3/15,ho=2e3,yt=400,Ma=2.625,_a=1.008,Ra=.31,or=140,rr=40,ar=20,ka=34,lt=.25,Ca=.01,fo=.004,Sa=.5,Ta=3.5,ie={x:0,y:0};function mo(e,t){const{width:o,height:a}=t,r=t.scale??1,i=Math.min(3,typeof window<"u"&&window.devicePixelRatio||1),n=ht(o,a,t.cornerRadius,t.kind)/jt(or,rr,ar),l=Math.max(1,R.haloHalfLen*n),s=Math.max(.6,R.extraHalfLen*n),c=pa(l,r,i),u=ga(s,r,i),d=Math.ceil(Math.max(c.ay,u.ay)+R.extraOutward*n*r+2),h=document.createElement("div");h.className="metal-fx-glow-svg",h.setAttribute("aria-hidden","true");const x=document.createElement("div");x.className="metal-fx-glow-env",x.style.cssText="position:absolute;inset:0;pointer-events:none;opacity:0";const m=document.createElement("canvas");m.className="metal-fx-glow-canvas";const f=o+2*d,y=a+2*d;m.width=Math.ceil(f*i),m.height=Math.ceil(y*i),m.style.cssText=`position:absolute;left:${-d}px;top:${-d}px;width:${f}px;height:${y}px;pointer-events:none`,x.appendChild(m),h.appendChild(x),e.appendChild(h);const b=m.getContext("2d",{willReadFrequently:!!t.maskDataUrl});if(!b)throw new Error("metal-fx: glow canvas 2D context unavailable");const w={wrap:h,env:x,canvas:m,ctx:b,surroundPath:null,bandPath:null,maskAlpha:null,maskReady:!1,margin:d,dpr:i,halo:c,extra:u,haloTint:{canvas:null,img:null,tint:-1,src:null},extraTint:{canvas:null,img:null,tint:-1,src:null},mO:De(),mI:De(),maskSum:Number.NaN,maskDeformed:!1,deform:null,width:o,height:a,cornerRadius:t.cornerRadius,kind:t.kind,scale:r,perim:wa(t),pointMode:!!(t.samplePoints&&t.samplePoints.length>0),currentIdx:0,appearedAt:0,glowOpacity:0,relocTween:null,relocNextIdx:-1,relocMul:0,envClock:0,cursorMode:!1,cursorArc:0,cursorTargetArc:0,lastTickMs:0,wanderS:0,wanderTargetS:0,wanderFrames:0,tintFrom:{r:255,g:255,b:255},tintTarget:{r:255,g:255,b:255},tintTween:null,tintHoldUntil:0,dX:Number.NaN,dY:Number.NaN,dAng:Number.NaN,dEX:Number.NaN,dEY:Number.NaN,dHOp:Number.NaN,dEOp:Number.NaN,dHaloTint:"",dExtraTint:"",dirty:!0,dEnv:-1};if(t.maskDataUrl){const p=new Image;p.onload=()=>{const M=document.createElement("canvas");M.width=m.width,M.height=m.height;const v=M.getContext("2d",{willReadFrequently:!0});if(!v)return;v.scale(i,i),v.drawImage(p,d,d,o,a);const A=v.getImageData(0,0,M.width,M.height).data,N=M.width*M.height,U=new Float32Array(N);for(let k=0,D=3;k<N;k++,D+=4)U[k]=A[D]/255;const I=Yt(Float32Array.from(U),M.width,M.height,Ta*i);let X=0;for(let k=0;k<N;k++)I[k]>X&&(X=I[k]);const P=X>0?Sa/X:0,z=new Uint8ClampedArray(N);for(let k=0;k<N;k++)z[k]=Math.round(Math.max(U[k],I[k]*P)*255);w.maskAlpha=z,w.maskReady=!0,w.dirty=!0},p.src=t.maskDataUrl}else Dt(w,null);return w}function Dt(e,t){if(e.pointMode)return;const{margin:o,width:a,height:r,cornerRadius:i}=e,n=e.kind==="circle"?2:1;He(0,0,a,r,i,t,e.mO),He(n,n,a-2*n,r-2*n,Math.max(0,i-n),t,e.mI);const l=new Path2D;Mt(l,e.mO,o);const s=new Path2D;Mt(s,e.mO,o),Mt(s,e.mI,o);const c=new Path2D;c.rect(0,0,a+2*o,r+2*o),c.addPath(l),e.surroundPath=c,e.bandPath=s,e.maskReady=!0}function Mt(e,t,o){const a=t.xy;for(let r=0;r<t.n;r++){const i=a[r*2]+o,n=a[r*2+1]+o;r===0?e.moveTo(i,n):e.lineTo(i,n)}e.closePath()}function Oa(e,t){if(!e)return 0;He(0,0,t.width,t.height,t.cornerRadius,e,t.mO);let o=0;const a=t.mO.xy;for(let r=0;r<t.mO.n;r+=4)o+=a[r*2]*1.37+a[r*2+1];return o}function Ba(e,t){if(e.deform=t,!e.pointMode)if(t){const o=Oa(t,e);o!==e.maskSum&&(e.maskSum=o,Dt(e,t),e.maskDeformed=!0,e.dirty=!0)}else e.maskDeformed&&(e.maskSum=Number.NaN,Dt(e,null),e.maskDeformed=!1,e.dirty=!0)}function Ea(e,t,o,a,r="dark"){var i;const{width:n,height:l,cornerRadius:s,perim:c}=e;if(c.length===0)return!1;const u=2;let d=-1,h=e.currentIdx,x=0;for(let E=0;E<c.length;E++){const q=c[E],$=St(t,q.x,q.y,u);$>d&&(d=$,h=E),E===e.currentIdx&&(x=$)}const m=e.appearedAt>0&&o-e.appearedAt<R.minDwellMs,f=R.baseOp+(R.peakOp-R.baseOp)*co(R.lumLo,R.lumHi,x),y=!m&&d-x>ba,b=t.cursorLight,w=qe.enabled&&qe.catchLight&&!e.pointMode&&!!b&&b.w>.02,p=ht(n,l,s,e.kind);w&&(e.cursorTargetArc=xa(b.x,b.y,n,l,s,e.kind));const M=w?Math.min(1,R.peakOp*qe.catchGain*b.w):0,v=e.lastTickMs>0?Math.min(200,Math.max(.5,o-e.lastTickMs)):uo;e.lastTickMs=o,e.envClock+=Math.min(v,ka);const A=E=>1-Math.pow(1-E,v/uo),N=Math.max(1,R.relocFadeMs),U=Math.max(1,R.relocFadeOutMs),I=-2,X=-3,P=()=>{e.appearedAt=o,e.wanderS=0,e.wanderTargetS=0,e.wanderFrames=0,e.relocTween=Xe(0,1,N,Tt.smoothstep),Ye(e.relocTween,e.envClock)},z=E=>{e.relocNextIdx=E,e.relocTween=Xe(1,0,U,Tt.smoothstep),Ye(e.relocTween,e.envClock)};if((i=e.relocTween)!=null&&i.done&&e.relocTween.to===0){let E=e.relocNextIdx;if(E===I&&!w&&(E=X),E===X)e.cursorMode=!1,e.appearedAt=0,e.relocTween=null;else if(E===I)e.cursorMode=!0,e.cursorArc=e.cursorTargetArc,e.glowOpacity=M,P();else{e.currentIdx=E;const q=c[e.currentIdx],$=St(t,q.x,q.y,u);e.glowOpacity=R.baseOp+(R.peakOp-R.baseOp)*co(R.lumLo,R.lumHi,$),P()}}if((!e.relocTween||e.relocTween.done)&&(e.appearedAt===0?(w?(e.cursorMode=!0,e.cursorArc=e.cursorTargetArc,e.glowOpacity=M):(e.cursorMode=!1,e.currentIdx=h,e.glowOpacity=f),P()):w!==e.cursorMode?z(w?I:X):!e.cursorMode&&y&&z(h)),e.cursorMode){w&&(e.glowOpacity=M);const E=Math.max(.01,Math.min(1,qe.catchFollow)),q=1-Math.pow(1-E,v/(1e3/60));let $=e.cursorTargetArc-e.cursorArc;$=($%p+p*1.5)%p-p/2,e.cursorArc+=$*q}else e.glowOpacity+=(f-e.glowOpacity)*A(R.fadeRate);e.glowOpacity=Math.max(0,Math.min(1,e.glowOpacity)),e.relocMul=e.relocTween?ao(e.relocTween,e.envClock):1;const k=ht(n,l,s,e.kind)/jt(or,rr,ar),D=R.wanderRange*k;e.wanderFrames+=v,e.wanderFrames>=ya&&(e.wanderTargetS=(Math.random()*2-1)*D,e.wanderFrames=0),e.wanderS+=(e.wanderTargetS-e.wanderS)*A(R.wanderLerp);let Y,H,C,_,S;if(e.pointMode){const E=c[e.currentIdx];Y=E.x+e.wanderS,H=E.y,C=0,_=Y,S=H}else{const E=e.cursorMode?e.cursorArc:c[e.currentIdx].arc+e.wanderS,q=R.inset*e.scale;et(E,n,l,s,q,0,e.kind,ie),Y=ie.x,H=ie.y,C=va(E,n,l,s,q,e.kind);const $=R.extraOutward*k*e.scale;et(E,n,l,s,q,$,e.kind,ie),_=ie.x,S=ie.y}e.deform&&(e.deform(Y,H,ie),Y=ie.x,H=ie.y,e.deform(_,S,ie),_=ie.x,S=ie.y);const Z=r==="light",ee=Z?Lr(t,Y,H,u):Do(t,Y,H,u);e.tintTween?e.tintTween.done&&(Z?(e.tintFrom={r:e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*e.tintTween.val,g:e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*e.tintTween.val,b:e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*e.tintTween.val},e.tintTarget={...ee},e.tintTween=Xe(0,1,yt),Ye(e.tintTween,o)):o>=e.tintHoldUntil&&(e.tintFrom={...e.tintTarget},e.tintTarget={...ee},e.tintTween=Xe(0,1,yt),Ye(e.tintTween,o),e.tintHoldUntil=o+ho)):(e.tintFrom={...ee},e.tintTarget={...ee},e.tintTween=Xe(0,1,yt),Ye(e.tintTween,o),e.tintHoldUntil=Z?0:o+ho),ao(e.tintTween,o);const te=e.tintTween.val;let B,O,V;if(Z)B=Math.round(e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*te),O=Math.round(e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*te),V=Math.round(e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*te);else{const E=e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*te,q=e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*te,$=e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*te,ne=Math.max(E,q,$)||1;B=Math.round(255*(E/ne)),O=Math.round(255*(q/ne)),V=Math.round(255*($/ne))}const L=`rgb(${B},${O},${V})`;let F="#ffffff";if(Z){const E=Ao(B,O,V),[q,$,ne]=Po(E[0],Math.min(1,E[1]*Ma),Math.max(Ra,E[2]*_a));F=`rgb(${q},${$},${ne})`}const oe=Math.max(0,Math.min(1,a))*(e.pointMode?R.pointGain:1),ae=Math.min(1,e.glowOpacity*R.haloOpMul*oe),ue=Math.min(1,e.glowOpacity*R.extraIntensity*oe);if(Math.abs(e.relocMul-e.dEnv)>.002){const E=e.relocMul>=.998&&e.dEnv<.998;e.dEnv=e.relocMul,e.env.style.opacity=e.relocMul.toFixed(3),E&&(e.dirty=!0)}const le=!!(e.relocTween&&!e.relocTween.done)||e.cursorMode,de=!(Math.abs(Y-e.dX)<lt&&Math.abs(H-e.dY)<lt&&Math.abs(C-e.dAng)<Ca&&Math.abs(_-e.dEX)<lt&&Math.abs(S-e.dEY)<lt),he=!(Math.abs(ae-e.dHOp)<fo&&Math.abs(ue-e.dEOp)<fo),ve=L!==e.dHaloTint||F!==e.dExtraTint;return(e.dirty||de||he||ve)&&(e.dX=Y,e.dY=H,e.dAng=C,e.dEX=_,e.dEY=S,e.dHOp=ae,e.dEOp=ue,e.dHaloTint=L,e.dExtraTint=F,e.dirty=!1,Ia(e,Y,H,C,_,S,ae,ue,L,F)),le}function Ia(e,t,o,a,r,i,n,l,s,c){const{ctx:u,canvas:d,dpr:h,margin:x}=e;if(u.setTransform(1,0,0,1,0,0),u.globalCompositeOperation="source-over",u.globalAlpha=1,u.clearRect(0,0,d.width,d.height),n<=.002&&l<=.002||!e.maskReady)return;const m=n>.002?lo(e.halo,...po(s),e.haloTint):null,f=l>.002?c==="#ffffff"?e.extra.canvas:lo(e.extra,...po(c),e.extraTint):null,y=M=>{m&&(u.save(),u.translate(t+x,o+x),u.rotate(a),u.globalAlpha=n*M,u.drawImage(m,-e.halo.ax,-e.halo.ay,e.halo.w,e.halo.h),u.restore()),f&&(u.save(),u.translate(r+x,i+x),u.rotate(a),u.globalAlpha=l*M,u.drawImage(f,-e.extra.ax,-e.extra.ay,e.extra.w,e.extra.h),u.restore())};if(!e.pointMode&&e.surroundPath&&e.bandPath){u.save(),u.scale(h,h),u.clip(e.surroundPath,"evenodd"),y(.5),u.restore(),u.save(),u.scale(h,h),u.clip(e.bandPath,"evenodd"),y(1),u.restore();return}u.save(),u.scale(h,h),y(1),u.restore();const b=e.maskAlpha;if(!b)return;const w=u.getImageData(0,0,d.width,d.height),p=w.data;for(let M=0,v=3;M<b.length;M++,v+=4){const A=b[M];if(A!==255){if(A===0){p[v]=0;continue}p[v]=(p[v]*A+127)/255}}u.putImageData(w,0,0)}const Pe=[255,255,255];function po(e){if(e[0]==="#")return Pe[0]=parseInt(e.slice(1,3),16),Pe[1]=parseInt(e.slice(3,5),16),Pe[2]=parseInt(e.slice(5,7),16),Pe;let t=4,o=0,a=0;for(;t<e.length&&a<3;){const r=e.charCodeAt(t++);r>=48&&r<=57?o=o*10+(r-48):(r===44||r===41)&&(Pe[a++]=o,o=0)}return Pe}function Aa(e,t){e.pointMode===t.pointMode&&(t.currentIdx=Math.min(e.currentIdx,Math.max(0,t.perim.length-1)),t.appearedAt=e.appearedAt,t.glowOpacity=e.glowOpacity,t.relocTween=e.relocTween,t.relocNextIdx=e.relocNextIdx,t.relocMul=e.relocMul,t.envClock=e.envClock,t.cursorMode=e.cursorMode,t.cursorArc=e.cursorArc,t.cursorTargetArc=e.cursorTargetArc,t.lastTickMs=e.lastTickMs,t.wanderS=e.wanderS,t.wanderTargetS=e.wanderTargetS,t.wanderFrames=e.wanderFrames,t.tintFrom=e.tintFrom,t.tintTarget=e.tintTarget,t.tintTween=e.tintTween,t.tintHoldUntil=e.tintHoldUntil,t.dEnv=e.relocMul,t.env.style.opacity=e.relocMul.toFixed(3))}const go=Object.freeze({offsetY:1,blur:.5,alpha:.9,color:"#ffffff"});function Pa(e,t,o){const a=Math.min(3,typeof window<"u"&&window.devicePixelRatio||1),r=Math.ceil(3*o.blur+Math.abs(o.offsetY)+1),i=t.width+2*r,n=t.height+2*r,l=document.createElement("canvas");l.className="metal-fx-rim-canvas",l.setAttribute("aria-hidden","true"),l.width=Math.ceil(i*a),l.height=Math.ceil(n*a),l.style.cssText=`position:absolute;left:${-r}px;top:${-r}px;width:${i}px;height:${n}px;pointer-events:none`;const s=l.getContext("2d"),c=document.createElement("canvas");c.width=l.width,c.height=l.height;const u=c.getContext("2d",{willReadFrequently:!0});if(!s||!u)return null;e.appendChild(l);const d={canvas:l,ctx:s,scratch:c,sctx:u,width:t.width,height:t.height,cornerRadius:t.cornerRadius,kind:t.kind,ring:t.ring,margin:r,dpr:a,opts:o,mO:De(),mI:De(),sum:Number.NaN};return nr(d,null,!0),d}function xo(e,t,o){const a=t.xy;for(let r=0;r<t.n;r++){const i=a[r*2]+o,n=a[r*2+1]+o;r===0?e.moveTo(i,n):e.lineTo(i,n)}e.closePath()}function nr(e,t,o=!1){const{width:a,height:r,cornerRadius:i,ring:n,margin:l,dpr:s}=e;He(0,0,a,r,i,t,e.mO),He(n,n,a-2*n,r-2*n,Math.max(0,i-n),t,e.mI);let c=0;const u=e.mO.xy;for(let k=0;k<e.mO.n;k+=4)c+=u[k*2]*1.37+u[k*2+1];if(!o&&c===e.sum)return;e.sum=c;const{sctx:d,scratch:h,ctx:x,canvas:m,opts:f}=e,y=h.width,b=h.height;d.setTransform(1,0,0,1,0,0),d.clearRect(0,0,y,b),d.scale(s,s),d.fillStyle="#fff",d.beginPath(),xo(d,e.mO,l),xo(d,e.mI,l),d.fill("evenodd");const w=d.getImageData(0,0,y,b).data,p=y*b,M=new Float32Array(p);for(let k=0,D=3;k<p;k++,D+=4)M[k]=w[D]/255;const v=Math.round(f.offsetY*s)*y,A=new Float32Array(p);if(v>=0)for(let k=0;k<p;k++)A[k]=Math.max(0,M[k]-(k>=v?M[k-v]:0));else for(let k=0;k<p;k++)A[k]=Math.max(0,M[k]-(k-v<p?M[k-v]:0));const N=Yt(A,y,b,f.blur*s),U=parseInt(f.color.slice(1,3),16),I=parseInt(f.color.slice(3,5),16),X=parseInt(f.color.slice(5,7),16),P=x.createImageData(y,b),z=P.data;for(let k=0,D=0;k<p;k++,D+=4)z[D]=U,z[D+1]=I,z[D+2]=X,z[D+3]=Math.round(Math.min(1,N[k]*M[k]*f.alpha)*255);x.setTransform(1,0,0,1,0,0),x.putImageData(P,0,0)}function vo(e){e&&e.canvas.remove()}const ut=12,wo=32,bo=1,yo=.55,Fa=1,Ua=1,za=.85,La=0,Na=1.3,Mo=3.6,Va=.7,Wa=1,Da=.52,Ha=1,$a=.044,Ga=235,Xa=2.535,_o=.7,Ya=.5,ja=new Set(["INPUT","TEXTAREA","SELECT","OPTION"]);function qa(e,t){const o=Math.max(e.left-t.right,t.left-e.right,0),a=Math.max(e.top-t.bottom,t.top-e.bottom,0);return Math.sqrt(o*o+a*a)}function Qa(e,t,o,a){return!(Math.min(e.bottom,t.bottom)-Math.max(e.top,t.top)<o||Math.max(e.left-t.right,t.left-e.right,0)>a)}function Ja(e,t,o,a){return Math.min(e.right,t.right)-Math.max(e.left,t.left)<o?!1:Math.max(e.top-t.bottom,t.top-e.bottom,0)<=a}function Oe(e,t,o,a,r,i){const n=Math.max(0,Math.min(i,a*.5,r*.5)),l=e.roundRect;if(typeof l=="function"){l.call(e,t,o,a,r,n);return}e.moveTo(t+n,o),e.lineTo(t+a-n,o),e.quadraticCurveTo(t+a,o,t+a,o+n),e.lineTo(t+a,o+r-n),e.quadraticCurveTo(t+a,o+r,t+a-n,o+r),e.lineTo(t+n,o+r),e.quadraticCurveTo(t,o+r,t,o+r-n),e.lineTo(t,o+n),e.quadraticCurveTo(t,o,t+n,o)}function ir(e,t,o,a,r){if(!r.flipX&&!r.flipY){e.drawImage(t,r.sx??0,r.sy??0,o,a,r.x,r.y,r.w,r.h);return}e.save(),r.flipX&&(e.translate(r.x+r.w,0),e.scale(-1,1)),r.flipY&&(e.translate(0,r.y+r.h),e.scale(1,-1)),e.drawImage(t,r.sx??0,r.sy??0,o,a,r.flipX?0:r.x,r.flipY?0:r.y,r.w,r.h),e.restore()}const Ka=4;function Za(e,t,o,a,r,i,n){if(a<=2*n||r<=2*n){e.beginPath(),Oe(e,t,o,a,r,i),e.clip();return}e.beginPath(),Oe(e,t,o,a,r,i),Oe(e,t+n,o+n,a-2*n,r-2*n,Math.max(0,i-n)),e.clip("evenodd")}function en(e,t,o,a,r,i,n,l,s,c,u,d){const h=d??Math.max(1,Math.round((ut+Ka*3)*u));let x=Math.max(0,n),m=!0;for(let f=0;f<3&&x>1e-4;f++){const y=Math.min(1,x);e.save(),Za(e,c.x,c.y,c.w,c.h,c.r,h),e.globalCompositeOperation=m?"source-over":"lighter",m=!1,e.globalAlpha=y,ir(e,t,o,a,s),e.globalAlpha=1,e.globalCompositeOperation="destination-in",e.fillStyle=l,e.fillRect(0,0,r,i),e.restore(),x-=y}}function sr(e,t,o,a,r,i,n){const l=n|0;if(l<1||a<=2*l||r<=2*l){e.beginPath(),Oe(e,t,o,a,r,i),e.clip();return}e.beginPath(),Oe(e,t,o,a,r,i),Oe(e,t+l,o+l,a-2*l,r-2*l,Math.max(0,i-l)),e.clip("evenodd")}function tn(e,t,o,a,r,i,n,l,s,c,u,d){let h=l*u,x=!0;for(let m=0;m<3&&h>1e-4;m++){const f=Math.min(1,h);e.save(),sr(e,n.x,n.y,n.w,n.h,n.r,s),e.globalCompositeOperation=x?"source-over":"lighter",x=!1,e.globalAlpha=f,ir(e,t,o,a,d),e.globalAlpha=1,e.globalCompositeOperation="destination-in",e.fillStyle=c,e.fillRect(0,0,r,i),e.restore(),h-=f}}function on(e,t,o,a,r,i,n,l){const s=e.createLinearGradient(a,r,i,n);s.addColorStop(0,`rgba(255,255,255,${l.toFixed(3)})`),s.addColorStop(.5,`rgba(255,255,255,${(l*.45).toFixed(3)})`),s.addColorStop(1,"rgba(255,255,255,0)"),e.save(),sr(e,t.x,t.y,t.w,t.h,t.r,o),e.globalCompositeOperation="lighter",e.lineWidth=o*2,e.strokeStyle=s,e.beginPath(),Oe(e,t.x,t.y,t.w,t.h,t.r),e.stroke(),e.restore()}function lr(e){const t=getComputedStyle(e),o=[parseFloat(t.borderTopLeftRadius)||0,parseFloat(t.borderTopRightRadius)||0,parseFloat(t.borderBottomRightRadius)||0,parseFloat(t.borderBottomLeftRadius)||0].filter(a=>a>0);return o.length?Math.min.apply(null,o):0}function cr(e){const t=getComputedStyle(e),o=Math.max(parseFloat(t.borderTopWidth)||0,parseFloat(t.borderRightWidth)||0,parseFloat(t.borderBottomWidth)||0,parseFloat(t.borderLeftWidth)||0);let a=0,r=0;const i=t.boxShadow;if(i&&i!=="none"){const l=i.replace(/rgba?\([^)]*\)/g,u=>u.replace(/,/g,"\0")).split(/,\s*/);let s=1/0,c=1/0;for(const u of l){const d=u.match(/-?\d+(?:\.\d+)?px/g);if(!d||d.length<4)continue;const h=parseFloat(d[3]);h>0&&(/\binset\b/.test(u)?h<s&&(s=h):h<c&&(c=h))}Number.isFinite(s)&&(a=s),Number.isFinite(c)&&(r=c)}const n=Math.max(o,r);return{width:Math.max(o,a,r)||1,outerCssPx:n}}function Ro(e){e.cornerRadius=lr(e.el);const t=cr(e.el);e.hairlineWidth=t.width,e.hairlineOuterCssPx=t.outerCssPx}function rn(e){typeof ResizeObserver<"u"&&(e.resizeObserver=new ResizeObserver(()=>Ro(e)),e.resizeObserver.observe(e.el)),typeof MutationObserver<"u"&&(e.mutationObserver=new MutationObserver(()=>Ro(e)),e.mutationObserver.observe(e.el,{attributes:!0,attributeFilter:["style","class"]}))}function an(e){var t,o;(t=e.resizeObserver)==null||t.disconnect(),e.resizeObserver=null,(o=e.mutationObserver)==null||o.disconnect(),e.mutationObserver=null}const _e=new Set,nn=Object.freeze({enabled:!0,radius:11.5,strength:.57,penumbra:.55,falloff:.21,edgeFade:.7,softness:.24,repaintMs:36}),mt={...nn};let be=null,_t=0,ko=0,Co=!1;function qt(){_t!==0||typeof requestAnimationFrame>"u"||(_t=requestAnimationFrame(e=>{if(_t=0,e-ko<mt.repaintMs){qt();return}ko=e,dr()}))}let ft=!1;function sn(e,t){const o=mt.radius;for(const a of _e){const r=a.anchorEl.getBoundingClientRect(),i=a.el.getBoundingClientRect(),n=Math.min(r.left,i.left)-o,l=Math.max(r.right,i.right)+o,s=Math.min(r.top,i.top)-o,c=Math.max(r.bottom,i.bottom)+o;if(e>=n&&e<=l&&t>=s&&t<=c)return!0}return!1}function So(e){if(be={x:e.clientX,y:e.clientY},!mt.enabled)return;const t=sn(e.clientX,e.clientY);(t||ft)&&qt(),ft=t}function ct(){be=null,ft&&qt(),ft=!1}function ur(e){typeof document>"u"||e===Co||(Co=e,e?(document.addEventListener("pointermove",So,{passive:!0}),document.addEventListener("pointerleave",ct),window.addEventListener("blur",ct)):(document.removeEventListener("pointermove",So),document.removeEventListener("pointerleave",ct),window.removeEventListener("blur",ct),be=null))}function ln(e,t,o,a,r,i,n,l,s){if(!be)return;const c=mt;if(!c.enabled||c.strength<=0)return;const u=c.radius;let d,h,x,m,f,y;if(r){const C=o.left>=a.right;d=C?a.right:o.right,h=C?o.left:a.left,x=be.x,m=be.y,f=Math.max(o.top,a.top),y=Math.min(o.bottom,a.bottom)}else{const C=o.top>=a.bottom;d=C?a.bottom:o.bottom,h=C?o.top:a.top,x=be.y,m=be.x,f=Math.max(o.left,a.left),y=Math.min(o.right,a.right)}const b=Math.min(d,h),w=Math.max(d,h),p=Math.max(1,w-b);if(x<b-u||x>w+u||m<f-u||m>y+u)return;const M=Math.max(0,Math.min(1,Math.abs(x-d)/p)),v=Math.max(.5,u*c.edgeFade),A=Math.min(1,Math.min(x-(b-u),w+u-x)/v),N=Math.min(1,Math.min(m-(f-u),y+u-m)/v),U=c.strength*(1-c.falloff*M)*A*N;if(U<=.001)return;const I=u*s*(1+c.penumbra*M),X=r?(m-a.top+l)*s:(m-a.left+l)*s,P=Math.max(0,Math.min(.5,(1-c.softness)*.5)),z=Math.max(.001,.5-P),k=r?n:i,D=Math.max(0,Math.floor(X-I)),Y=Math.min(k,Math.ceil(X+I));if(Y<=D)return;const H=new Float32Array(Y-D);for(let C=D;C<Y;C++){const _=(C+.5-(X-I))/(2*I),S=_<z?_/z:_>1-z?(1-_)/z:1;H[C-D]=1-U*Math.max(0,Math.min(1,S))}for(const C of[e,t]){const _=r?0:D,S=r?D:0,Z=r?i:Y-D,ee=r?Y-D:n,te=C.getImageData(_,S,Z,ee),B=te.data;if(r)for(let O=0;O<ee;O++){const V=H[O];if(!(V>=.999))for(let L=O*Z*4+3,F=(O+1)*Z*4;L<F;L+=4)B[L]=B[L]*V}else for(let O=0;O<ee;O++)for(let V=0;V<Z;V++){const L=H[V];if(L>=.999)continue;const F=(O*Z+V)*4+3;B[F]=B[F]*L}C.putImageData(te,_,S)}}let me=null,ze=null,Le=null,Ne=null;function cn(e,t){return me||(me=document.createElement("canvas"),ze=document.createElement("canvas"),Le=me.getContext("2d",{alpha:!0}),Ne=ze.getContext("2d",{alpha:!0})),!Le||!Ne||!me||!ze?!1:(me.width!==e&&(me.width=e,ze.width=e),me.height!==t&&(me.height=t,ze.height=t),Le.setTransform(1,0,0,1,0,0),Ne.setTransform(1,0,0,1,0,0),Le.globalCompositeOperation="source-over",Ne.globalCompositeOperation="source-over",Le.clearRect(0,0,e,t),Ne.clearRect(0,0,e,t),!0)}function un(e,t,o,a=1){if(typeof document>"u"||ja.has(e.tagName))return null;for(const m of _e)if(m.el===e)return m.strength=a,m;const r=document.createElement("div");r.setAttribute("data-metal-fx-reflection",""),r.setAttribute("aria-hidden","true");const i=document.createElement("canvas");i.className="metal-fx-reflection-canvas";const n=i.getContext("2d",{alpha:!0,willReadFrequently:!0});if(!n)return null;const l=document.createElement("canvas");l.className="metal-fx-reflection-stroke-canvas";const s=l.getContext("2d",{alpha:!0,willReadFrequently:!0});if(!s)return null;r.appendChild(i),r.appendChild(l);const c=getComputedStyle(e);let u=!1;c.position==="static"&&(e.style.position="relative",u=!0);let d=!1;c.isolation!=="isolate"&&(e.style.isolation="isolate",d=!0),e.setAttribute("data-metal-fx-reflect-host",""),e.insertBefore(r,e.firstChild);const h=cr(e),x={el:e,anchor:t,anchorEl:o,strength:a,wrap:r,canvas:i,ctx:n,strokeCanvas:l,strokeCtx:s,cornerRadius:lr(e),hairlineWidth:h.width,hairlineOuterCssPx:h.outerCssPx,appliedPositionRelative:u,appliedIsolation:d,resizeObserver:null,mutationObserver:null};return rn(x),_e.add(x),ur(!0),x}function dn(e){for(const t of _e)if(t.el===e){an(t),t.canvas.width=0,t.canvas.height=0,t.strokeCanvas.width=0,t.strokeCanvas.height=0,t.wrap.parentNode===t.el&&t.el.removeChild(t.wrap),t.el.removeAttribute("data-metal-fx-reflect-host"),t.appliedPositionRelative&&(t.el.style.position=""),t.appliedIsolation&&(t.el.style.isolation=""),_e.delete(t),_e.size===0&&ur(!1);return}}function hn(e,t,o,a,r){if(a<1||r<1)return null;const i=e.getContext("2d");if(!i)return null;const n=i.getImageData(t,o,a,r).data;let l=a,s=r,c=-1,u=-1;for(let d=0;d<r;d++){const h=d*a;for(let x=0;x<a;x++)n[(h+x)*4+3]>8&&(x<l&&(l=x),x>c&&(c=x),d<s&&(s=d),d>u&&(u=d))}return c<0?null:{x:t+l,y:o+s,w:c-l+1,h:u-s+1}}function dr(){if(_e.size===0)return;const e=typeof window<"u"&&window.devicePixelRatio||1,t=new Map;for(const o of _e){const a=o.el.getBoundingClientRect();let r=t.get(o.anchorEl);if(r||(r=o.anchorEl.getBoundingClientRect(),t.set(o.anchorEl,r)),a.width<1||a.height<1||r.width<1||r.height<1)continue;const i=o.el.hasAttribute("data-metal-fx-text");if(i&&!o.glyphStyled&&(o.canvas.style.filter="blur(0.4px) saturate(1.35) brightness(1.2)",o.glyphStyled=!0),!Qa(r,a,bo,wo)&&!Ja(r,a,bo,wo)){o.canvas.width!==1&&(o.canvas.width=1,o.canvas.height=1),o.strokeCanvas.width!==1&&(o.strokeCanvas.width=1,o.strokeCanvas.height=1);continue}const n=i&&!!o.anchor.mask;n&&!o.anchor.wantRaw&&(o.anchor.wantRaw=!0),o.anchor.wantRing||(o.anchor.wantRing=!0);const l=!!o.anchor.deform&&!!o.anchor.ringCanvas,s=n&&o.anchor.rawCanvas?o.anchor.rawCanvas:l?o.anchor.ringCanvas:o.anchor.canvas,c=Math.round(o.anchor.overscan*e);let u=c,d=c,h=(s.width|0)-2*c,x=(s.height|0)-2*c;if(o.anchor.mask&&!n){const ee=hn(s,u,d,h,x);ee&&(u=ee.x,d=ee.y,h=ee.w,x=ee.h)}if(h<4||x<4)continue;const m=(r.left+r.right)*.5,f=(r.top+r.bottom)*.5,y=(a.left+a.right)*.5,b=(a.top+a.bottom)*.5,w=m-y,p=f-b,M=Math.max(r.left-a.right,a.left-r.right,0),v=Math.max(r.top-a.bottom,a.top-r.bottom,0),A=M>=v,N=qa(r,a);let U=1-Math.min(1,N/ut);U=U*U*(3-2*U);const I=yo+(Fa-yo)*U,X=Math.min(Mo,I*Na*Va)*o.strength,P=r.left>=a.left&&r.right<=a.right&&r.top>=a.top&&r.bottom<=a.bottom?[!0,!1]:[A],z=o.anchor.scale??1,k=Math.max(Wa*z,o.hairlineWidth),D=Math.max(1,Math.round(k*e)),Y=Math.max(1,Math.round(Math.max(Ha*z,o.hairlineWidth)*e)),H=o.hairlineOuterCssPx;o.wrap.style.inset=`${-H}px`,o.wrap.style.borderRadius=`${Math.max(0,o.cornerRadius)}px`;const C=Math.max(1,Math.round((a.width+H*2)*e)),_=Math.max(1,Math.round((a.height+H*2)*e));o.canvas.width!==C&&(o.canvas.width=C),o.canvas.height!==_&&(o.canvas.height=_),o.strokeCanvas.width!==C&&(o.strokeCanvas.width=C),o.strokeCanvas.height!==_&&(o.strokeCanvas.height=_);const S=o.ctx;S.setTransform(1,0,0,1,0,0),S.clearRect(0,0,C,_);const Z=o.strokeCtx;Z.setTransform(1,0,0,1,0,0),Z.clearRect(0,0,C,_);for(const[ee,te]of P.entries()){const B=ee>0&&cn(C,_),O=B?Le:S,V=B?Ne:Z,L=Math.min((i?ut*1.5:ut)*e,Math.max(C,_));let F,oe,ae,ue;te?(F=w>0?C:0,ae=w>0?C-L:L,oe=_*.5,ue=_*.5):(oe=p>0?_:0,ue=p>0?_-L:L,F=C*.5,ae=C*.5);const le=S.createLinearGradient(F,oe,ae,ue);le.addColorStop(0,`rgba(0,0,0,${Ua})`),le.addColorStop(.5,`rgba(0,0,0,${za})`),le.addColorStop(1,`rgba(0,0,0,${La})`);const de=h/e,he=i?Math.max(1,Math.min(te?C:_,Math.round(te?h:x))):Math.max(1,Math.round(Ga*Math.max(.1,de/140)*e));let ve,E,q,$,ne=!1,Ge=!1;if(te){const W=Math.max(r.top,a.top),j=Math.min(r.bottom,a.bottom);ne=!0,ve=w>0?C-he:0,E=Math.round((W-a.top+H)*e),q=he,$=Math.max(1,Math.round((j-W)*e))}else{const W=Math.max(r.left,a.left),j=Math.min(r.right,a.right);Ge=!0,ve=Math.round((W-a.left+H)*e),E=p>0?_-he:0,q=Math.max(1,Math.round((j-W)*e)),$=he}const ot={x:ve,y:E,w:q,h:$,flipX:ne,flipY:Ge,sx:u,sy:d},we={x:0,y:0,w:C,h:_,r:Math.max(0,o.cornerRadius*e)},T=i?Math.min(1,X*_o):Math.min(Mo,X*Xa*_o*Ya);en(O,s,h,x,C,_,T,le,ot,we,e,i?Math.max(C,_):void 0),i||(tn(V,s,h,x,C,_,we,X,D,le,Da,ot),on(V,we,Y,F,oe,ae,ue,Math.min(.85,$a*X))),B&&(S.globalCompositeOperation="lighter",S.drawImage(me,0,0),Z.globalCompositeOperation="lighter",Z.drawImage(ze,0,0))}for(const ee of P)ln(S,Z,r,a,ee,C,_,H,e);S.globalCompositeOperation="source-over",Z.globalCompositeOperation="source-over"}}let Rt=!1,To=0;function fn(){Rt||(Rt=!0,!(typeof requestAnimationFrame>"u")&&requestAnimationFrame(e=>{Rt=!1,!(e-To<pr)&&(To=e,dr())}))}const Oo="metal-fx-styles",mn=`
.metal-fx-root {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
  overflow: visible;
  background: #272727;
  color: #f8f8f8;
}
.metal-fx-root[data-theme='light'] {
  background: #ffffff;
  color: #1d1d1d;
}

.metal-fx-root::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 50px 0 rgba(255, 255, 255, 0.02);
}
.metal-fx-root[data-theme='light']::before {
  box-shadow: inset 0 0 50px 0 rgba(0, 0, 0, 0.02);
}

.metal-fx-root::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 4;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
.metal-fx-root[data-theme='light']::after {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}
/* Circle variant gets a thicker outer rim than the button variant. */
.metal-fx-root[data-variant='circle']::after {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
}
.metal-fx-root[data-theme='light'][data-variant='circle']::after {
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.06);
}

.metal-fx-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
}

/* The inner spacer — defines the inset geometry where the metal ring meets
   the interior (3 px for Button, 1-2 px for Circle) and carries the Circle dark
   hairline ('box-shadow: inset' rules below). Intentionally transparent so
   the wrapper's background propagates through to the punched shader centre,
   giving consumers a single surface tone to override. See "Single-surface
   background" in the file header for the rationale. */
.metal-fx-inner {
  position: absolute;
  inset: 3px;
  border-radius: inherit;
  z-index: 1;
  pointer-events: none;
}

.metal-fx-root[data-variant='button'][data-shape='pill'] .metal-fx-inner {
  border-radius: calc(var(--mfx-radius, 20px) - 3px);
}
.metal-fx-root[data-variant='button'][data-shape='circle'] .metal-fx-inner {
  border-radius: calc(var(--mfx-radius, 16px) - 3px);
}
.metal-fx-root[data-variant='circle'][data-shape='pill'] .metal-fx-inner {
  inset: 0;
  border-radius: var(--mfx-radius, 20px);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
.metal-fx-root[data-variant='circle'][data-shape='circle'] .metal-fx-inner {
  inset: 0;
  border-radius: var(--mfx-radius, 16px);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
/* Circle-variant hairline alpha — light mode.
   Source-of-truth: index.html L2261-2267. The 0.45-alpha black inset that
   reads as a single-pixel frame against the dark interior is too heavy
   on a #ffffff inner: it ends up looking like a hard 2-px black ring
   against the iridescent shader. Suppressed entirely (alpha 0) — the
   shader's own iridescent rim already defines the silhouette in light
   mode, so an extra dark hairline only competes with it. The rule is
   kept (rather than deleted) as a tunable hook in case a future variant
   wants to re-introduce a soft edge. NOTE: we keep the dark-mode inset
   and border-radius values because — unlike index.html — our renderer
   does NOT overscan the canvas in light mode, so there is no 1-px gap
   between inner element and shader to compensate for. */
.metal-fx-root[data-theme='light'][data-variant='circle'][data-shape='pill'] .metal-fx-inner,
.metal-fx-root[data-theme='light'][data-variant='circle'][data-shape='circle'] .metal-fx-inner {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0);
}

/* ─── Combined glow SVG (z=3) ──────────────────────────────────────────────
   Single SVG per instance that holds BOTH the wide-halo group
   (#mfx_haloTravel) and the catch-light group (#mfx_extraTravel), exactly
   mirroring canonical's _buildGlowSvgInner (index.html L8078). One
   mix-blend-mode: screen lifts the combined composite onto the shader
   ring; per-frame opacity attributes on each inner group still drive the
   independent fade-in / fade-out cycles for the halo and the catch-light.

   Why a single SVG: the circle variant anchors halo + catch-light at the same
   perimeter point, so they overlap in the bright zone. Two separately-
   screened SVGs would double-screen the overlap (A + B + C - AB - AC -
   BC + ABC instead of A + B + C - AB - AC once both groups composite
   in source-over inside one SVG and then screen against the host once).
   That overlap looked muted versus canonical specifically on the circle
   variant where both layers travel together.

   Source-of-truth opacity: #btnGlowSvg drops to 0.7 in dark and 0.2746 in
   light (index.html L632/L643). */
.metal-fx-glow-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  z-index: 3;
  pointer-events: none;
  opacity: 0.7;
}
.metal-fx-root[data-theme='light'] .metal-fx-glow-svg {
  /* Light-mode 1-px overscan mirrors .btn-glow-svg in metal.html so the
     halo stays glued to the visible silhouette (the shader ring there sits
     1 px outside the host's padding box). */
  inset: -1px;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  mix-blend-mode: multiply;
  /* Source-of-truth: html[data-theme="light"] #btnGlowSvg { opacity: 0.2746 }
     → −35 % from 0.4225 from the original 0.7 dark-mode opacity. */
  opacity: 0.2746;
  filter: saturate(5.355) brightness(0.78);
}
/* Circle light-mode small variants (e.g. 36×36 send button): the geometrically
   shrunk halo loses density when multiplied against #ffffff. Mirror the
   canonical override at index.html L2316 — bump saturation + drop brightness
   so the small glow holds together visually. */
.metal-fx-root[data-variant='circle'][data-shape='circle'][data-theme='light'] .metal-fx-glow-svg {
  filter: saturate(7.5) brightness(0.6);
}

/* The wrapped child — hoisted into z=5 so it sits above every overlay, with
   normalized chrome so consumer button styles don't fight the metal frame. */
.metal-fx-content {
  position: relative;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  pointer-events: none;
}
.metal-fx-content > * {
  pointer-events: auto;
}
.metal-fx-root[data-normalize='true'] .metal-fx-content > * {
  background: transparent !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  /* Sizing: we deliberately DO NOT force \`width: 100%; height: 100%\` on the
     child here. That used to be the contract ("the wrapper is the visible
     button surface; the child stretches to fill it"), but it created a cyclic
     percentage dependency: the wrapper is \`inline-flex\` with no intrinsic
     size, .metal-fx-content is \`width/height: 100%\` of the wrapper, and the
     child was \`100%\` of .metal-fx-content. With nothing breaking the cycle,
     icon-only / class-sized children collapsed.

     The new contract: the child sizes itself (intrinsic content, CSS class,
     or inline style — all work), and the wrapper's \`inline-flex\` wraps it
     tightly. Consumers who want a metal frame BIGGER than the child (e.g.
     padding around an icon) size <MetalFx style={{ width, height }}> AND
     explicitly set width/height on the child to fill (or accept that the
     child renders at its intrinsic size, centered).

     Typography is intentionally NOT touched. We used to apply
     \`color: inherit; font: inherit;\` here to "match" the wrapper, but
     \`font: inherit\` is a shorthand that overrides font-family, font-size,
     font-weight, AND line-height on the child — which (a) shrank the
     button height (line-height changes propagate through the flex
     content box) and (b) scaled em-based icons / font-icons inside the
     child to whatever the wrapper inherited. The wrapper now stays out
     of the child's typography entirely; consumers who want typographic
     normalization can apply it themselves on the child element. */
}

[data-metal-fx-reflection] {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
  z-index: 0;
  isolation: isolate;
}
.metal-fx-reflection-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: blur(4px) saturate(1.2) brightness(1.58);
}
.metal-fx-reflection-stroke-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: saturate(1.35) brightness(1.75);
}
/* Hosts that participate as reflection targets need positioning + isolation
   so the wrap composites only against the host (not the parent stack). The
   wrap injects these inline as well, but stating them here keeps reflections
   working on hosts that already have other inline styles applied. */
[data-metal-fx-reflect-host] {
  isolation: isolate;
}
`;let kt=!1;function pn(){if(kt||typeof document>"u")return;if(document.getElementById(Oo)){kt=!0;return}const e=document.createElement("style");e.id=Oo,e.textContent=mn,document.head.appendChild(e),kt=!0}pn();const gn={position:"absolute",inset:0,width:"100%",height:"100%"},xn={position:"absolute",inset:3},vn={position:"absolute",inset:0,pointerEvents:"none",zIndex:3,borderRadius:"inherit"},wn={position:"absolute",inset:0,pointerEvents:"none",zIndex:4},Ke=new Map;function bn(){const e=globalThis;e.__MFX_DEBUG__&&(e.__mfxGlow=Ke)}Xr((e,t)=>{const o=Ke.get(e);return o?Ea(o.handles,e,t,e.opacityMul*e.glowGain,o.themeRef.current):!1});function yn(e){const[t,o]=G.useState(()=>e!=="auto"?e:typeof window>"u"||!window.matchMedia||window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");return G.useEffect(()=>{if(e!=="auto"){o(e);return}if(typeof window>"u"||!window.matchMedia)return;const a=window.matchMedia("(prefers-color-scheme: dark)"),r=()=>o(a.matches?"dark":"light");return r(),a.addEventListener("change",r),()=>a.removeEventListener("change",r)},[e]),t}const hr=G.forwardRef(function({children:e,variant:t="button",preset:o="chromatic",theme:a="auto",strength:r=1,glowGain:i=1,paused:n=!1,borderRadius:l,normalizeHostStyles:s=!0,reflectionTargets:c,disableGlow:u=!1,innerShadow:d,shaderScale:h,ringCssPx:x,scale:m=1,mask:f,glowMode:y="mask",className:b,style:w,...p},M){const v=G.useRef(null),A=G.useRef(null),N=G.useRef(null),U=G.useRef(null),I=G.useRef(null),X=G.useRef(null),P=G.useRef(null),z=G.useRef(null),k=G.useRef("dark"),D=G.useRef(0),[Y,H]=G.useState(!1),C=yn(a),_=G.useMemo(()=>Ar(),[]);k.current=C;const S=t==="circle"?"circle":"pill",Z=!u;G.useImperativeHandle(M,()=>v.current,[]);const ee=(B,O)=>{if(S==="circle")return Math.min(B,O)/2;const V=typeof l=="number"?l:(()=>{var L;const F=(L=X.current)==null?void 0:L.firstElementChild;if(F){const oe=parseFloat(getComputedStyle(F).borderTopLeftRadius);if(Number.isFinite(oe)&&oe>0)return oe}return D.current})();return Math.min(V,Math.min(B,O)/2)};G.useEffect(()=>{_&&Gr(o,C)},[o,C,_]),G.useEffect(()=>{const B=P.current;B&&Ae(B,{mask:f??null})},[f]),G.useEffect(()=>{const B=P.current;B&&Ae(B,{paused:n})},[n]),G.useEffect(()=>{const B=P.current;if(!B)return;const O={};h!==void 0&&(O.shaderScale=h),x!==void 0&&(O.ringCssPx=x),m!==void 0&&(O.scale=m),Object.keys(O).length>0&&Ae(B,O)},[h,x,m]),G.useLayoutEffect(()=>{const B=A.current,O=v.current,V=N.current;if(!B||!O||!_)return;{const T=getComputedStyle(O),W=parseFloat(T.borderTopLeftRadius);D.current=Number.isFinite(W)?W:0}const L=()=>{const T=O.getBoundingClientRect(),W=Math.max(1,Math.round(T.width)),j=Math.max(1,Math.round(T.height));return{cssWidth:W,cssHeight:j,cornerRadius:ee(W,j)}},F=L();P.current=Nr({onComposite:()=>{const T=P.current,W=z.current;T&&W&&Ba(W,T.deform);const j=I.current;T&&j&&nr(j,T.deform)},hostCanvas:B,cssWidth:F.cssWidth,cssHeight:F.cssHeight,cornerRadius:F.cornerRadius,kind:S,paused:n,shaderScale:h,ringCssPx:x,scale:m,mask:f??null,onFirstCopy:()=>H(!0)}),O.style.setProperty("--mfx-radius",`${F.cornerRadius}px`),O.style.borderRadius=`${F.cornerRadius}px`;const oe=(T,W)=>{if(!f||y==="ring")return{};const j=window.devicePixelRatio||1,re=document.createElement("canvas");re.width=Math.max(1,Math.round(T*j)),re.height=Math.max(1,Math.round(W*j));const rt=re.getContext("2d");if(!rt)return{};rt.fillStyle="#fff",f(rt,re.width,re.height,j);const fr=rt.getImageData(0,0,re.width,re.height).data,Qt=[],at=Math.max(1,Math.round(2*j));for(let nt=at>>1;nt<re.height;nt+=at)for(let it=at>>1;it<re.width;it+=at)fr[(nt*re.width+it)*4+3]>128&&Qt.push({x:it/j,y:nt/j});return{samplePoints:Qt,maskDataUrl:re.toDataURL("image/png")}};V&&(z.current=mo(V,{width:F.cssWidth,height:F.cssHeight,cornerRadius:F.cornerRadius,kind:S,scale:m,...oe(F.cssWidth,F.cssHeight)}));const ae=T=>{if(!V)return;const W=z.current;V.innerHTML="",z.current=mo(V,{width:T.cssWidth,height:T.cssHeight,cornerRadius:T.cornerRadius,kind:S,scale:m,...oe(T.cssWidth,T.cssHeight)}),W&&Aa(W,z.current);const j=P.current;j&&z.current&&Ke.set(j,{handles:z.current,themeRef:k})},ue=()=>d?d===!0?go:{...go,...d}:null,le=T=>{const W=U.current,j=P.current;vo(I.current),I.current=null;const re=ue();!W||!j||!re||(I.current=Pa(W,{width:T.cssWidth,height:T.cssHeight,cornerRadius:T.cornerRadius,kind:S,ring:j.ringCssPx},re))};le(F);let de=0,he=F.cssWidth,ve=F.cssHeight,E=F.cornerRadius;const q=new ResizeObserver(()=>{de===0&&(de=requestAnimationFrame(()=>{de=0;const T=L(),W=P.current;!W||Math.abs(T.cssWidth-he)<.5&&Math.abs(T.cssHeight-ve)<.5&&Math.abs(T.cornerRadius-E)<.5||(he=T.cssWidth,ve=T.cssHeight,E=T.cornerRadius,Ae(W,{cssWidth:T.cssWidth,cssHeight:T.cssHeight,cornerRadius:T.cornerRadius}),O.style.setProperty("--mfx-radius",`${T.cornerRadius}px`),O.style.borderRadius=`${T.cornerRadius}px`,ae(T),le(T))}))});q.observe(O);let $=null;const ne=()=>{const T=P.current;if(T&&$r(T)){const W=L();ae(W),le(W)}Ge()},Ge=()=>{$==null||$.removeEventListener("change",ne),$=typeof window.matchMedia=="function"?window.matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`):null,$==null||$.addEventListener("change",ne)};Ge();const ot=Kr(T=>{T&&P.current&&ae(L())});let we=null;return typeof IntersectionObserver<"u"&&(we=new IntersectionObserver(T=>{const W=P.current;if(W)for(const j of T)Hr(W,j.isIntersecting)},{rootMargin:"64px"}),we.observe(O)),P.current&&z.current&&(Ke.set(P.current,{handles:z.current,themeRef:k}),Wr(P.current)),ea(),bn(),()=>{ta(),vo(I.current),I.current=null,q.disconnect(),$==null||$.removeEventListener("change",ne),we==null||we.disconnect(),ot(),de!==0&&cancelAnimationFrame(de);const T=P.current;T&&(Ke.delete(T),Dr(T),Vr(T)),P.current=null,z.current=null,V&&(V.innerHTML="")}},[S]),G.useEffect(()=>{const B=P.current;B&&Ae(B,{opacityMul:Math.max(0,Math.min(1,r)),glowGain:Math.max(0,i)})},[r,i,t]),G.useEffect(()=>{const B=P.current,O=v.current;if(!B||!O||!c||C!=="dark")return;B.onAfterFrame=fn;const V=c.flatMap(L=>{const F="current"in L?L:L.ref,oe="current"in L?1:L.strength??1;return F.current?[{el:F.current,strength:oe}]:[]});for(const{el:L,strength:F}of V)un(L,B,O,F);return()=>{B.onAfterFrame=void 0;for(const{el:L}of V)dn(L)}},[c,C]),G.useEffect(()=>{const B=v.current,O=P.current;if(!B||!O)return;const V=ee(O.cssWidth,O.cssHeight);Ae(O,{cornerRadius:V}),B.style.setProperty("--mfx-radius",`${V}px`),B.style.borderRadius=`${V}px`},[l,C,t,S]);const te=G.useMemo(()=>({...w,"--mfx-strength":String(Math.min(1,Math.max(0,r))),opacity:Y?1:0,visibility:Y?"visible":"hidden",transition:Y?"opacity 0.15s ease-out":"none"}),[w,r,Y]);return _?se.jsxs("div",{...p,ref:v,className:b?`metal-fx-root ${b}`:"metal-fx-root","data-variant":t,"data-shape":S,"data-theme":C,"data-paused":n?"true":void 0,"data-normalize":s?"true":"false",style:te,children:[se.jsx("canvas",{ref:A,className:"metal-fx-canvas",style:gn}),se.jsx("div",{className:"metal-fx-inner","aria-hidden":"true",style:xn}),se.jsx("div",{ref:N,"aria-hidden":"true",style:{...vn,display:Z?void 0:"none"}}),d?se.jsx("div",{ref:U,"aria-hidden":"true",style:wn}):null,se.jsx("div",{ref:X,className:"metal-fx-content",children:e})]}):se.jsx("div",{...p,ref:v,className:b?`metal-fx-fallback ${b}`:"metal-fx-fallback","data-metal-fx-unsupported":"",style:{display:"inline-flex",...w},children:e})});hr.displayName="MetalFx";const Fe=55.556,Ht=45,Bo=25,Mn=26.667,Eo=(Ht-Mn)/2,Io={position:"absolute",inset:0,pointerEvents:"none"},_n=(e,t)=>`inset 0px 0px ${8.333*e}px 0px rgba(255,255,255,${t}), inset 0px 0px ${8.333*e}px 0px rgba(255,255,255,${t}), inset 0px 0px 0px ${.833*e}px rgba(255,255,255,0.5), inset 0px ${.833*e}px 0px 0px rgba(255,255,255,0.78)`,je=Object.freeze({metalOpacity:.8,shaderScale:1.6,core:Object.freeze({r:46,blur:100,a:.94,size:49}),gradient:0,glow:.41});function Cn({children:e="New",strength:t=1,theme:o,scale:a=1,reflectionTargets:r,metalOpacity:i=je.metalOpacity,shaderScale:n=je.shaderScale,core:l=je.core,gradient:s=je.gradient,glow:c=je.glow,textColor:u="#323232"}){const d=G.useRef(null),h=i,x=G.useCallback((m,f,y,b)=>{m.beginPath(),m.roundRect(0,0,f,y,Fe*b),m.fill()},[]);return se.jsx(hr,{ref:d,preset:"chromatic",theme:o,strength:t*h,shaderScale:n,mask:x,glowMode:"ring",reflectionTargets:r,borderRadius:Fe*a,style:{background:"#ffffff",borderRadius:Fe*a},children:se.jsxs("div",{style:{position:"relative",width:Ht*a,height:Bo*a,borderRadius:Fe*a},children:[se.jsx("div",{"aria-hidden":"true",style:{...Io,borderRadius:Fe*a,background:`radial-gradient(ellipse ${l.size}% ${l.size}% at 50% 50%, rgba(255,255,255,1) ${l.r}%, rgba(255,255,255,0) ${Math.min(100,l.r+l.blur)}%)`,opacity:l.a}}),se.jsx("div",{"aria-hidden":"true",style:{...Io,borderRadius:Fe*a,background:`linear-gradient(to bottom, rgba(255,255,255,${s}), rgba(255,255,255,0))`,boxShadow:_n(a,c)}}),se.jsx("span",{style:{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box",width:Ht*a,height:Bo*a,paddingLeft:Eo*a,paddingRight:Eo*a,font:`600 ${12.222*a}px/1.4 Inter, sans-serif`,color:u,letterSpacing:0,whiteSpace:"nowrap"},"aria-label":e,children:e})]})})}const Rn=Object.freeze({enabled:!0,applyTo:"ring",strength:.74,fadeInMs:200,fadeOutMs:350,smoothMs:140,reach:36,blob:13,liquidBlob:10,maxDisp:9,gain:.6,pressGain:.55,pullGain:.49,press:5,liquid:7.5,liquidReach:8,liquidStiffness:53,liquidDamping:9,stiffness:260,damping:13,mass:1,follow:.32,mapRes:2,smooth:.25});({...Rn});export{Cn as O};
