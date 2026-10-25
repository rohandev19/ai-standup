'use client';

import { useEffect, useRef } from 'react';
import styles from './WaveBackground.module.css';

const VERTEX_SHADER_SRC = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform vec2 resolution;
  uniform float time;
  uniform float xScale;
  uniform float yScale;
  uniform float distortion;

  void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
    
    float d = length(p) * distortion;
    
    float rx = p.x * (1.0 + d);
    float gx = p.x;
    float bx = p.x * (1.0 - d);

    float w1 = 0.012 / (abs(p.y + sin((rx + time) * xScale) * yScale) + 0.05);
    float w2 = 0.012 / (abs(p.y + sin((gx + time) * xScale) * yScale) + 0.05);
    float w3 = 0.012 / (abs(p.y + sin((bx + time) * xScale) * yScale) + 0.05);
    
    vec3 color = w1 * vec3(0.545, 0.361, 0.965) + 
                 w2 * vec3(0.400, 0.200, 0.900) + 
                 w3 * vec3(0.231, 0.510, 0.965);
    
    float alpha = clamp(max(color.r, max(color.g, color.b)) * 1.2, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });

    if (!gl) return;

    function createShader(glCtx: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    // Quad geometry (2 triangles covering full clip space)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, 'resolution');
    const timeLoc = gl.getUniformLocation(program, 'time');
    const xScaleLoc = gl.getUniformLocation(program, 'xScale');
    const yScaleLoc = gl.getUniformLocation(program, 'yScale');
    const distortionLoc = gl.getUniformLocation(program, 'distortion');

    gl.uniform1f(xScaleLoc, 1.0);
    gl.uniform1f(yScaleLoc, 0.5);
    gl.uniform1f(distortionLoc, 0.05);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    let animationId: number;
    let isVisible = true;
    let time = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resLoc, canvas.width, canvas.height);

      if (prefersReducedMotion) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(timeLoc, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const observer = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
    });
    observer.observe(canvas);

    if (prefersReducedMotion) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLoc, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      const render = () => {
        if (isVisible) {
          time += 0.01;
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform1f(timeLoc, time);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        animationId = requestAnimationFrame(render);
      };
      animationId = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener('resize', resize);
      observer.disconnect();
      if (animationId) cancelAnimationFrame(animationId);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (program) gl.deleteProgram(program);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
