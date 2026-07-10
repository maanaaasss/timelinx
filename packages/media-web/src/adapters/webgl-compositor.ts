/**
 * WebGL Compositor Adapter
 *
 * Implements the @timelinx/core Compositor contract using WebGL.
 * Provides GPU-accelerated compositing for timeline playback.
 */

import type {
  CompositeRequest,
  CompositeResult,
  VideoFrameResult,
  ClipTransform,
} from '@timelinx/core';
import type { ClipId, TrackId, TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebGLCompositorConfig = {
  /** Canvas element or OffscreenCanvas to render to. */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Output width. Default: 1920. */
  width?: number;
  /** Output height. Default: 1080. */
  height?: number;
  /** Enable alpha blending. Default: true. */
  alpha?: boolean;
  /** Enable antialiasing. Default: false. */
  antialias?: boolean;
};

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_texture;
  uniform float u_opacity;
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    gl_FragColor = vec4(color.rgb, color.a * u_opacity);
  }
`;

// ---------------------------------------------------------------------------
// WebGLCompositorAdapter
// ---------------------------------------------------------------------------

export class WebGLCompositorAdapter {
  private config: WebGLCompositorConfig;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private pixelBuffer: Uint8Array | null = null;
  private uniformLocations: Map<string, WebGLUniformLocation | null> = new Map();
  private attribLocations: Map<string, number> = new Map();

  constructor(config: WebGLCompositorConfig) {
    this.config = {
      canvas: config.canvas,
      width: config.width ?? 1920,
      height: config.height ?? 1080,
      alpha: config.alpha ?? true,
      antialias: config.antialias ?? false,
    };

    this.initWebGL(config.canvas);
  }

  /**
   * Initialize WebGL context and shaders.
   */
  private initWebGL(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    const contextAttributes: WebGLContextAttributes = {
      alpha: this.config.alpha,
      antialias: this.config.antialias,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    };

    // Try WebGL2 first, fall back to WebGL1
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = 
      canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext | null;
    if (!gl) {
      gl = canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext | null;
    }

    if (!gl) {
      console.warn('WebGL not available, using Canvas2D fallback');
      return;
    }

    this.gl = gl;

    // Compile shaders
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to compile shaders');
      this.gl = null;
      return;
    }

    // Create program
    const program = gl.createProgram();
    if (!program) {
      this.gl = null;
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Failed to link program:', gl.getProgramInfoLog(program));
      this.gl = null;
      return;
    }

    this.program = program;

    // Cache uniform and attribute locations
    this.uniformLocations.set('u_texture', gl.getUniformLocation(program, 'u_texture'));
    this.uniformLocations.set('u_opacity', gl.getUniformLocation(program, 'u_opacity'));
    this.attribLocations.set('a_position', gl.getAttribLocation(program, 'a_position'));
    this.attribLocations.set('a_texCoord', gl.getAttribLocation(program, 'a_texCoord'));

    // Create buffers
    this.positionBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();

    // Set up geometry (full-screen quad)
    const positions = new Float32Array([
      -1, -1,  // bottom-left
       1, -1,  // bottom-right
      -1,  1,  // top-left
       1,  1,  // top-right
    ]);

    const texCoords = new Float32Array([
      0, 1,  // bottom-left
      1, 1,  // bottom-right
      0, 0,  // top-left
      1, 0,  // top-right
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }

  /**
   * Compile a shader.
   */
  private compileShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Composite multiple layers into a single frame.
   */
  async composite(request: CompositeRequest): Promise<CompositeResult> {
    const { layers, width, height } = request;

    if (!this.gl || !this.program) {
      // Fallback: return empty canvas
      return this.fallbackComposite(request);
    }

    const gl = this.gl;

    // Set viewport
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use program
    gl.useProgram(this.program);

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw each layer
    for (const layer of layers) {
      this.drawLayer(layer.frame, layer.transform, layer.opacity);
    }

    return {
      timelineFrame: request.timelineFrame,
      bitmap: this.config.canvas,
    };
  }

  /**
   * Draw a single layer.
   */
  private drawLayer(
    frame: VideoFrameResult,
    transform: ClipTransform,
    opacity: number,
  ): void {
    const gl = this.gl;
    if (!gl || !this.program) return;

    // Create texture from frame
    const texture = gl.createTexture();
    if (!texture) return;

    try {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Upload frame data (placeholder - would use actual frame bitmap)
      const size = frame.width * frame.height * 4;
      if (!this.pixelBuffer || this.pixelBuffer.length !== size) {
        this.pixelBuffer = new Uint8Array(size);
      }
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        frame.width,
        frame.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.pixelBuffer,
      );

      // Bind texture to texture unit 0
      gl.uniform1i(this.uniformLocations.get('u_texture') ?? null, 0);

      // Set uniforms
      gl.uniform1f(this.uniformLocations.get('u_opacity') ?? null, opacity * transform.opacity.value);

      // Set position buffer
      const positionLocation = this.attribLocations.get('a_position') ?? -1;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Set texCoord buffer
      const texCoordLocation = this.attribLocations.get('a_texCoord') ?? -1;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } finally {
      // Always clean up texture, even if an error occurs mid-draw
      gl.deleteTexture(texture);
    }
  }

  /**
   * Fallback composite using Canvas2D.
   */
  private async fallbackComposite(request: CompositeRequest): Promise<CompositeResult> {
    const canvas = this.config.canvas;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;

    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, request.width, request.height);

      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Frame ${request.timelineFrame}`, request.width / 2, request.height / 2);
    }

    return {
      timelineFrame: request.timelineFrame,
      bitmap: canvas,
    };
  }

  /**
   * Resize the output canvas.
   */
  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;

    if (typeof HTMLCanvasElement !== 'undefined' && this.config.canvas instanceof HTMLCanvasElement) {
      this.config.canvas.width = width;
      this.config.canvas.height = height;
    } else if (typeof OffscreenCanvas !== 'undefined' && this.config.canvas instanceof OffscreenCanvas) {
      console.warn('WebGLCompositor.resize: OffscreenCanvas cannot be resized after creation. Create a new compositor instead.');
    }
  }

  /**
   * Release WebGL resources.
   */
  destroy(): void {
    if (this.gl) {
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
      if (this.positionBuffer) {
        this.gl.deleteBuffer(this.positionBuffer);
      }
      if (this.texCoordBuffer) {
        this.gl.deleteBuffer(this.texCoordBuffer);
      }
    }
    this.gl = null;
    this.program = null;
    this.positionBuffer = null;
    this.texCoordBuffer = null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a WebGL compositor adapter.
 */
export function createWebGLCompositor(
  config: WebGLCompositorConfig,
): WebGLCompositorAdapter {
  return new WebGLCompositorAdapter(config);
}
