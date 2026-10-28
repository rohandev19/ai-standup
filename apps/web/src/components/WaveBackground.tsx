'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './WaveBackground.module.css';

const VERTEX_SHADER_SRC = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

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
  const [hasWebGLError, setHasWebGLError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    let animationId: number | null = null;
    let program: WebGLProgram | null = null;
    let positionBuffer: WebGLBuffer | null = null;
    let vs: WebGLShader | null = null;
    let fs: WebGLShader | null = null;
    let isVisible = true;
    let time = 0;
    let isCleanedUp = false;

    const cleanupGL = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      if (gl) {
        if (positionBuffer) {
          gl.deleteBuffer(positionBuffer);
          positionBuffer = null;
        }
        if (program) {
          gl.deleteProgram(program);
          program = null;
        }
        if (vs) {
          gl.deleteShader(vs);
          vs = null;
        }
        if (fs) {
          gl.deleteShader(fs);
          fs = null;
        }
      }
    };

    function initWebGL(): boolean {
      if (!canvas) return false;
      try {
        cleanupGL();

        gl = canvas.getContext('webgl', {
          alpha: true,
          antialias: false,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
        });

        if (!gl || gl.isContextLost()) {
          setHasWebGLError(true);
          return false;
        }

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

        vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
        fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
        if (!vs || !fs) {
          setHasWebGLError(true);
          return false;
        }

        program = gl.createProgram();
        if (!program) {
          setHasWebGLError(true);
          return false;
        }

        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          gl.deleteProgram(program);
          program = null;
          setHasWebGLError(true);
          return false;
        }

        gl.useProgram(program);

        // Quad geometry (2 triangles covering full clip space)
        positionBuffer = gl.createBuffer();
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

        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

        const resize = () => {
          if (!canvas || !gl || gl.isContextLost()) return;
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

        if (prefersReducedMotion) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform1f(timeLoc, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        } else {
          let lastFrameTime = performance.now();
          const targetInterval = 1000 / 45; // Smooth 45fps cap prevents GPU thermal throttling

          const render = (now: number) => {
            if (isCleanedUp) return;

            if (gl && !gl.isContextLost() && isVisible && !document.hidden) {
              const delta = now - lastFrameTime;
              if (delta >= targetInterval) {
                lastFrameTime = now - (delta % targetInterval);

                // Modulo wrap to prevent float precision drift and NaN after long open sessions
                time = (time + 0.008) % 628.31853; // ~100 * 2*PI

                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.uniform1f(timeLoc, time);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
              }
            }
            animationId = requestAnimationFrame(render);
          };

          animationId = requestAnimationFrame(render);
        }

        setHasWebGLError(false);
        return true;
      } catch (err) {
        console.warn('WebGL init failed, using CSS ambient glow fallback:', err);
        setHasWebGLError(true);
        return false;
      }
    }

    // Handle context loss gracefully - Prevent browser crashed-canvas gray box!
    const handleContextLost = (e: Event) => {
      e.preventDefault(); // IMPORTANT: Prevent default browser crashed-canvas UI!
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      setHasWebGLError(true);
    };

    const handleContextRestored = () => {
      initWebGL();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Initial setup
    initWebGL();

    const handleResize = () => {
      if (!canvas || !gl || gl.isContextLost() || !program) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const resLoc = gl.getUniformLocation(program, 'resolution');
      if (resLoc) gl.uniform2f(resLoc, canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Pause animation when tab is not active to prevent GPU strain and context loss
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationId !== null) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      } else if (!document.hidden && !animationId && gl && !gl.isContextLost()) {
        initWebGL();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    return () => {
      isCleanedUp = true;
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      observer.disconnect();
      cleanupGL();
    };
  }, []);

  return (
    <div className={styles.wrapper} aria-hidden="true">
      {/* Ambient CSS glow fallback that always stays rich and dark */}
      <div className={styles.ambientGlow} />
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${hasWebGLError ? styles.canvasHidden : ''}`}
        aria-hidden="true"
      />
    </div>
  );
}
