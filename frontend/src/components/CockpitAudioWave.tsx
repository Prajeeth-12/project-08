import React, { useEffect, useRef } from 'react';

interface CockpitAudioWaveProps {
  turnState: 'user' | 'ai' | 'idle';
  isListening: boolean;
  isProcessing: boolean;
  voiceActivity: number;
}

const VERTEX_SRC = `attribute vec2 a_pos; void main(){ gl_Position=vec4(a_pos,0,1); }`;

const FRAGMENT_SRC = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uMix;
uniform float uLineWidth;
uniform vec3 uColor;
uniform float uColorShift;

vec3 rgb2hsv(vec3 c){
  vec4 K=vec4(0.,-1./3.,2./3.,-1.);
  vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));
  vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));
  float d=q.x-min(q.w,q.y),e=1e-10;
  return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);
}
vec3 hsv2rgb(vec3 c){
  vec4 K=vec4(1.,2./3.,1./3.,3.);
  vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);
  return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);
}

float bellCurve(float dist,float maxDist){
  float n=dist/maxDist;
  return pow(cos(n*0.7854),16.);
}

float wave(float x,float cx,float t){
  float rel=x-cx;
  float bell=bellCurve(abs(rel),cx);
  return sin(rel*uFrequency+t*uSpeed)*uAmplitude*bell;
}

void main(){
  vec2 uv=gl_FragCoord.xy/uResolution;
  float cx=0.5,cy=0.5;
  float pxSize=2./(uResolution.x+uResolution.y);
  float lwUV=uLineWidth*pxSize;
  float smUV=0.5*pxSize;
  float minD=1000.;
  for(int i=0;i<60;i++){
    float off=(float(i)/59.-0.5)*0.025;
    float sx=uv.x+off;
    float wy=cy+wave(sx,cx,uTime);
    float d=distance(vec2(uv.x,uv.y),vec2(sx,wy));
    minD=min(minD,d);
  }
  float line=smoothstep(lwUV+smUV,lwUV-smUV,minD);
  vec3 col=uColor;
  if(abs(uColorShift)>0.01){
    float edgeF=clamp((abs(uv.x-cx)-0.2)/0.5,0.,1.);
    vec3 hsv=rgb2hsv(col);
    hsv.x=fract(hsv.x+edgeF*uColorShift*0.3);
    col=hsv2rgb(hsv);
  }
  col*=line;
  float edgeMask=smoothstep(0.,0.2,uv.x)*smoothstep(0.,0.2,1.-uv.x);
  float alpha=line*uMix*edgeMask;
  gl_FragColor=vec4(col*uMix,alpha);
}
`;

function hexToGL(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function lerpColor(
  current: [number, number, number],
  target: [number, number, number],
  t: number
): void {
  current[0] += (target[0] - current[0]) * t;
  current[1] += (target[1] - current[1]) * t;
  current[2] += (target[2] - current[2]) * t;
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

interface WaveState {
  speed: number;
  amplitude: number;
  frequency: number;
  mix: number;
  lineWidth: number;
  color: [number, number, number];
  colorShift: number;
}

export default function CockpitAudioWave({
  turnState,
  isListening,
  isProcessing,
  voiceActivity,
}: CockpitAudioWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());
  const waveRef = useRef<WaveState>({
    speed: 5,
    amplitude: 0.0,
    frequency: 10,
    mix: 1.0,
    lineWidth: 1.5,
    color: [0.92, 0.70, 0.03],
    colorShift: 0.05,
  });
  const propsRef = useRef({ turnState, isListening, isProcessing, voiceActivity });

  // Keep propsRef in sync on every render
  propsRef.current = { turnState, isListening, isProcessing, voiceActivity };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
    }) as WebGLRenderingContext | null;
    if (!gl) return;
    glRef.current = gl;

    // Compile and link program
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;
    gl.useProgram(program);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    const uNames = [
      'uResolution', 'uTime', 'uSpeed', 'uAmplitude',
      'uFrequency', 'uMix', 'uLineWidth', 'uColor', 'uColorShift',
    ];
    for (const name of uNames) {
      uniformsRef.current[name] = gl.getUniformLocation(program, name);
    }

    // Blend
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Resize helper
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Animation loop
    const render = () => {
      const {
        turnState: ts,
        isProcessing: proc,
        voiceActivity: va,
      } = propsRef.current;
      const wave = waveRef.current;
      const t = (performance.now() - startTimeRef.current) / 1000;

      // Determine targets
      let targetSpeed: number;
      let targetAmplitude: number;
      let targetFrequency: number;
      let targetMix: number;
      let targetColor: [number, number, number];
      let colorLerpRate: number;

      if (ts === 'ai') {
        targetSpeed = 10;
        targetAmplitude = 0.015 + 0.4 * va;
        targetFrequency = 20 + 60 * va;
        targetMix = 1.0;
        targetColor = hexToGL('#DC2626');
        colorLerpRate = 0.06;
      } else if (proc) {
        targetSpeed = 20;
        targetAmplitude = 0.006;
        targetFrequency = 40;
        targetMix = 0.4 + Math.sin(t * 8) * 0.3;
        targetColor = hexToGL('#6B7280');
        colorLerpRate = 0.04;
      } else {
        targetSpeed = 5;
        targetAmplitude = 0.001;
        targetFrequency = 10;
        targetMix = 1.0;
        targetColor = hexToGL('#1e3a5f');
        colorLerpRate = 0.06;
      }

      // Smooth interpolation
      wave.speed += (targetSpeed - wave.speed) * 0.08;
      wave.amplitude += (targetAmplitude - wave.amplitude) * 0.12;
      wave.frequency += (targetFrequency - wave.frequency) * 0.1;
      wave.mix += (targetMix - wave.mix) * 0.08;
      lerpColor(wave.color, targetColor, colorLerpRate);

      // Set uniforms and draw
      const u = uniformsRef.current;
      const glCtx = glRef.current!;
      glCtx.uniform2f(u.uResolution, canvas.width, canvas.height);
      glCtx.uniform1f(u.uTime, t);
      glCtx.uniform1f(u.uSpeed, wave.speed);
      glCtx.uniform1f(u.uAmplitude, wave.amplitude);
      glCtx.uniform1f(u.uFrequency, wave.frequency);
      glCtx.uniform1f(u.uMix, wave.mix);
      glCtx.uniform1f(u.uLineWidth, wave.lineWidth);
      glCtx.uniform3fv(u.uColor, wave.color);
      glCtx.uniform1f(u.uColorShift, wave.colorShift);

      glCtx.clearColor(0, 0, 0, 0);
      glCtx.clear(glCtx.COLOR_BUFFER_BIT);
      glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      if (programRef.current) {
        glRef.current?.deleteProgram(programRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '160px',
        pointerEvents: 'none',
        zIndex: 5,
        maskImage: 'linear-gradient(to top, black 60%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%)',
      }}
    />
  );
}
