"use client"

import * as React from "react"
import { Renderer, Program, Mesh, Triangle } from "ogl"

/**
 * Dezenter, GPU-beschleunigter Aurora-Hintergrund im Dynaamiq-Brandverlauf
 * (Orange → Pink/Magenta). Bewusst ruhig: langsame Drift, niedrige Helligkeit,
 * keine Maus-Interaktion. Respektiert prefers-reduced-motion (rendert dann nur 1 Frame).
 * Basiert auf react-bits „SoftAurora" (ogl), an Brand & Cockpit angepasst.
 */

const vertex = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0, 1); }
`

const fragment = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uScale;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
#define TAU 6.28318

vec3 gradientHash(vec3 p) {
  p = vec3(dot(p, vec3(127.1,311.7,234.6)), dot(p, vec3(269.5,183.3,198.3)), dot(p, vec3(169.5,283.3,156.9)));
  vec3 h = fract(sin(p) * 43758.5453123);
  float phi = acos(2.0*h.x-1.0); float theta = TAU*h.y;
  return vec3(cos(theta)*sin(phi), sin(theta)*cos(phi), cos(phi));
}
float quintic(float t){ float t2=t*t; float t3=t*t2; return 6.0*t3*t2-15.0*t2*t2+10.0*t3; }
vec3 cosGrad(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(TAU*(c*t+d)); }
float perlin(float amp, float freq, float px, float py, float pz){
  float x=px*freq; float y=py*freq;
  float fx=floor(x); float fy=floor(y); float fz=floor(pz);
  float cx=ceil(x);  float cy=ceil(y);  float cz=ceil(pz);
  vec3 g000=gradientHash(vec3(fx,fy,fz)); vec3 g100=gradientHash(vec3(cx,fy,fz));
  vec3 g010=gradientHash(vec3(fx,cy,fz)); vec3 g110=gradientHash(vec3(cx,cy,fz));
  vec3 g001=gradientHash(vec3(fx,fy,cz)); vec3 g101=gradientHash(vec3(cx,fy,cz));
  vec3 g011=gradientHash(vec3(fx,cy,cz)); vec3 g111=gradientHash(vec3(cx,cy,cz));
  float d000=dot(g000,vec3(x-fx,y-fy,pz-fz)); float d100=dot(g100,vec3(x-cx,y-fy,pz-fz));
  float d010=dot(g010,vec3(x-fx,y-cy,pz-fz)); float d110=dot(g110,vec3(x-cx,y-cy,pz-fz));
  float d001=dot(g001,vec3(x-fx,y-fy,pz-cz)); float d101=dot(g101,vec3(x-cx,y-fy,pz-cz));
  float d011=dot(g011,vec3(x-fx,y-cy,pz-cz)); float d111=dot(g111,vec3(x-cx,y-cy,pz-cz));
  float sx=quintic(x-fx); float sy=quintic(y-fy); float sz=quintic(pz-fz);
  float lx00=mix(d000,d100,sx); float lx10=mix(d010,d110,sx);
  float lx01=mix(d001,d101,sx); float lx11=mix(d011,d111,sx);
  float ly0=mix(lx00,lx10,sy); float ly1=mix(lx01,lx11,sy);
  return amp*mix(ly0,ly1,sz);
}
float glow(float t){
  vec2 uv = gl_FragCoord.xy / uResolution.y;
  float n=0.0; float freq=2.2; float amp=1.0; vec2 sp=uv*uScale;
  for(float i=0.0;i<3.0;i+=1.0){ n+=perlin(amp,freq,sp.x,sp.y,t); amp*=0.12; freq*=2.0; }
  float yBand = uv.y*10.0 - 0.62*10.0;
  return 0.3*max(exp(1.1*(1.0-1.1*abs(n+yBand))),0.0);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float t = uSpeed*0.4*uTime;
  vec3 col = vec3(0.0);
  col += 0.99*glow(t)*cosGrad(uv.x+uTime*uSpeed*0.2, vec3(0.5),vec3(0.5),vec3(1.0),vec3(0.3,0.2,0.2))*uColor1;
  col += 0.99*glow(t+2.0)*cosGrad(uv.x+uTime*uSpeed*0.1, vec3(0.5),vec3(0.5),vec3(2.0,1.0,0.0),vec3(0.5,0.2,0.25))*uColor2;
  col *= uBrightness;
  float alpha = clamp(length(col), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

export function AuroraBackground() {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = ref.current
    if (!container) return

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false, dpr: Math.min(window.devicePixelRatio, 1.5) })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height] },
        uSpeed: { value: 0.32 },
        uScale: { value: 1.4 },
        uBrightness: { value: 0.85 },
        uColor1: { value: hexToVec3("#ff6a00") }, // Brand Orange
        uColor2: { value: hexToVec3("#e81ccb") }, // Brand Magenta
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    function resize() {
      if (!container) return
      renderer.setSize(container.offsetWidth, container.offsetHeight)
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]
    }
    window.addEventListener("resize", resize)
    resize()
    container.appendChild(gl.canvas)

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    const loop = (time: number) => {
      raf = requestAnimationFrame(loop)
      program.uniforms.uTime.value = time * 0.001
      renderer.render({ scene: mesh })
    }
    if (reduce) {
      // Nur ein einziger statischer Frame bei reduzierter Bewegung
      program.uniforms.uTime.value = 8
      renderer.render({ scene: mesh })
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.45] [mask-image:radial-gradient(120%_90%_at_50%_0%,#000_30%,transparent_100%)]"
    >
      <div ref={ref} className="h-full w-full" />
    </div>
  )
}
