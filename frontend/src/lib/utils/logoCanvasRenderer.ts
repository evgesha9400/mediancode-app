// ─── Public Constants ────────────────────────────────────────────────
// Sizes, rotation speeds, and variant types are kept compatible with
// the original Three.js logoScene API so existing consumers compile
// without changes.

export const LOGO_SIZE_MAP = {
	sm: 32,
	md: 48,
	lg: 80,
	xl: 120
} as const;

export type LogoSize = keyof typeof LOGO_SIZE_MAP;
export type LogoVariant = 'light' | 'dark';

export const LOGO_INITIAL_ROTATION = Math.PI / 6;
export const LOGO_ROTATION_STEP_X = 0.002;
export const LOGO_ROTATION_STEP_Y = 0.003;
export const LOGO_REFERENCE_FPS = 60;
export const LOGO_ROTATION_SPEED_X = LOGO_ROTATION_STEP_X * LOGO_REFERENCE_FPS;
export const LOGO_ROTATION_SPEED_Y = LOGO_ROTATION_STEP_Y * LOGO_REFERENCE_FPS;

// ─── Internal Constants ──────────────────────────────────────────────

const OUTER_CUBE_SIZE = 2;
const INNER_CUBE_SIZE = 1.2;

const CAMERA_DISTANCE = 3.5;
const CAMERA_FOV_DEG = 75;
const FOV_SCALE = 1 / Math.tan(((CAMERA_FOV_DEG / 2) * Math.PI) / 180);

const VARIANT_COLORS: Record<LogoVariant, string> = {
	light: '#2b2b2e',
	dark: '#e0e0e6'
};

const BASE_LINE_WIDTH_RATIO = 0.020;
const DEPTH_LINE_WIDTH_RANGE = 0.15;
const MAX_Z_EXTENT = (OUTER_CUBE_SIZE / 2) * Math.SQRT2 * Math.sqrt(1.5);

const TOTAL_SEGMENTS = 32;

/** No DPR cap — use full `devicePixelRatio` (2×, 3×, 4×, …). Pass `maxDpr` to limit for perf/memory. */
const DEFAULT_MAX_DPR = Number.POSITIVE_INFINITY;

/**
 * Extra pixel density on top of `devicePixelRatio`. Many desktops report dpr=1; this is what
 * actually sharpens strokes. Bitmap size = cssSize × dpr × resolutionScale (per side).
 */
const DEFAULT_RESOLUTION_SCALE = 3;
const MAX_RESOLUTION_SCALE = 8;

// ─── Types ───────────────────────────────────────────────────────────

interface Vec3 {
	x: number;
	y: number;
	z: number;
}

interface Segment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	depth: number;
	width: number;
}

export interface LogoCanvasRendererOptions {
	canvas: HTMLCanvasElement;
	size: LogoSize | number;
	variant: LogoVariant;
	animated?: boolean;
	/** Upper bound for `window.devicePixelRatio` (default: uncapped). */
	maxDpr?: number;
	/**
	 * Multiplier on top of DPR for internal bitmap size (default 3). Use `1` to rely on DPR only.
	 * Higher = sharper (browser downscales); capped at 8.
	 */
	resolutionScale?: number;
	depthLineWidth?: boolean;
	lineWidthScale?: number;
	backgroundColor?: string | null;
}

export interface LogoCanvasRenderer {
	start(): void;
	stop(): void;
	renderAtTime(elapsedSeconds: number): void;
	resize(size: LogoSize | number): void;
	setVariant(variant: LogoVariant): void;
	destroy(): void;
	readonly isRunning: boolean;
}

// ─── Geometry ────────────────────────────────────────────────────────

function makeCubeVertices(size: number): Vec3[] {
	const h = size / 2;
	return [
		{ x: -h, y: -h, z: -h },
		{ x: h, y: -h, z: -h },
		{ x: h, y: h, z: -h },
		{ x: -h, y: h, z: -h },
		{ x: -h, y: -h, z: h },
		{ x: h, y: -h, z: h },
		{ x: h, y: h, z: h },
		{ x: -h, y: h, z: h }
	];
}

const CUBE_EDGES: ReadonlyArray<readonly [number, number]> = [
	[0, 1],
	[1, 2],
	[2, 3],
	[3, 0],
	[4, 5],
	[5, 6],
	[6, 7],
	[7, 4],
	[0, 4],
	[1, 5],
	[2, 6],
	[3, 7]
];

const TEMPLATE_OUTER = makeCubeVertices(OUTER_CUBE_SIZE);
const TEMPLATE_INNER = makeCubeVertices(INNER_CUBE_SIZE);

// ─── 3D Math ─────────────────────────────────────────────────────────
// Rotation follows the Three.js Euler XYZ convention:
//   p' = Ry · Rx · p   (Rx applied first, then Ry)
// Both use the standard right-hand rotation matrices.

function applyRotation(
	src: ReadonlyArray<Vec3>,
	dst: Vec3[],
	cosX: number,
	sinX: number,
	cosY: number,
	sinY: number
): void {
	for (let i = 0; i < src.length; i++) {
		const { x, y, z } = src[i];
		const y1 = y * cosX - z * sinX;
		const z1 = y * sinX + z * cosX;
		dst[i].x = x * cosY + z1 * sinY;
		dst[i].y = y1;
		dst[i].z = -x * sinY + z1 * cosY;
	}
}

// ─── Renderer ────────────────────────────────────────────────────────

function resolvePixelSize(size: LogoSize | number): number {
	return typeof size === 'number' ? size : LOGO_SIZE_MAP[size];
}

export function createLogoCanvasRenderer(options: LogoCanvasRendererOptions): LogoCanvasRenderer {
	const {
		canvas,
		animated = true,
		maxDpr = DEFAULT_MAX_DPR,
		resolutionScale: resolutionScaleOpt = DEFAULT_RESOLUTION_SCALE,
		depthLineWidth = true,
		lineWidthScale = 1,
		backgroundColor = null
	} = options;

	const resolutionScale = Math.min(
		MAX_RESOLUTION_SCALE,
		Math.max(1, resolutionScaleOpt)
	);

	let currentSize = options.size;
	let currentVariant = options.variant;
	let running = false;
	let animFrameId: number | null = null;
	let startTime = 0;

	// alpha: true — transparent backing; display-p3 — wider gamut when the UA supports it.
	const ctx =
		canvas.getContext('2d', { alpha: true, colorSpace: 'display-p3' }) ??
		canvas.getContext('2d', { alpha: true })!;

	// Pre-allocated buffers — mutated in place each frame to avoid GC
	const rotOuter: Vec3[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, z: 0 }));
	const rotInner: Vec3[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, z: 0 }));
	const segments: Segment[] = Array.from({ length: TOTAL_SEGMENTS }, () => ({
		x1: 0,
		y1: 0,
		x2: 0,
		y2: 0,
		depth: 0,
		width: 0
	}));

	let dpr = 1;
	let cssSize = 0;
	let canvasSize = 0;
	let projScale = 0;
	let baseLineWidth = 0;
	let halfCanvas = 0;

	function configureCanvas(): void {
		cssSize = resolvePixelSize(currentSize);
		const deviceDpr =
			typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
				? Math.max(1, window.devicePixelRatio)
				: 1;
		dpr = Math.min(deviceDpr, maxDpr);
		canvasSize = Math.max(1, Math.round(cssSize * dpr * resolutionScale));

		canvas.width = canvasSize;
		canvas.height = canvasSize;
		canvas.style.width = `${cssSize}px`;
		canvas.style.height = `${cssSize}px`;
		// body uses color-scheme: dark; without this, some browsers paint an opaque dark
		// canvas widget background instead of compositing transparency.
		canvas.style.backgroundColor = 'transparent';
		canvas.style.colorScheme = 'only light';

		halfCanvas = canvasSize / 2;
		projScale = FOV_SCALE * halfCanvas;
		baseLineWidth = BASE_LINE_WIDTH_RATIO * canvasSize * lineWidthScale;

		// canvas width/height reset context state — re-apply quality hints each configure
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
	}

	function fillSegment(seg: Segment, a: Vec3, b: Vec3): void {
		const distA = CAMERA_DISTANCE - a.z;
		const distB = CAMERA_DISTANCE - b.z;
		const fA = projScale / distA;
		const fB = projScale / distB;

		seg.x1 = halfCanvas + a.x * fA;
		seg.y1 = halfCanvas - a.y * fA;
		seg.x2 = halfCanvas + b.x * fB;
		seg.y2 = halfCanvas - b.y * fB;

		const avgZ = (a.z + b.z) * 0.5;
		seg.depth = avgZ;

		if (depthLineWidth) {
			const depthNorm = avgZ / MAX_Z_EXTENT;
			seg.width = baseLineWidth * (1 + DEPTH_LINE_WIDTH_RANGE * depthNorm);
		} else {
			seg.width = baseLineWidth;
		}
	}

	function buildSegments(): void {
		let idx = 0;
		for (let i = 0; i < CUBE_EDGES.length; i++) {
			fillSegment(segments[idx++], rotOuter[CUBE_EDGES[i][0]], rotOuter[CUBE_EDGES[i][1]]);
		}
		for (let i = 0; i < CUBE_EDGES.length; i++) {
			fillSegment(segments[idx++], rotInner[CUBE_EDGES[i][0]], rotInner[CUBE_EDGES[i][1]]);
		}
		for (let i = 0; i < 8; i++) {
			fillSegment(segments[idx++], rotOuter[i], rotInner[i]);
		}
	}

	function depthSort(a: Segment, b: Segment): number {
		return a.depth - b.depth;
	}

	function drawFrame(elapsedSeconds: number): void {
		const rotX = LOGO_INITIAL_ROTATION + elapsedSeconds * LOGO_ROTATION_SPEED_X;
		const rotY = LOGO_INITIAL_ROTATION + elapsedSeconds * LOGO_ROTATION_SPEED_Y;

		const cosX = Math.cos(rotX);
		const sinX = Math.sin(rotX);
		const cosY = Math.cos(rotY);
		const sinY = Math.sin(rotY);

		applyRotation(TEMPLATE_OUTER, rotOuter, cosX, sinX, cosY, sinY);
		applyRotation(TEMPLATE_INNER, rotInner, cosX, sinX, cosY, sinY);

		buildSegments();
		segments.sort(depthSort);

		ctx.clearRect(0, 0, canvasSize, canvasSize);

		if (backgroundColor) {
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(0, 0, canvasSize, canvasSize);
		}

		const color = VARIANT_COLORS[currentVariant];
		ctx.strokeStyle = color;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		for (let i = 0; i < TOTAL_SEGMENTS; i++) {
			const seg = segments[i];
			ctx.lineWidth = seg.width;
			ctx.beginPath();
			ctx.moveTo(seg.x1, seg.y1);
			ctx.lineTo(seg.x2, seg.y2);
			ctx.stroke();
		}
	}

	function animate(now: number): void {
		if (!running) return;
		if (startTime === 0) startTime = now;
		drawFrame((now - startTime) / 1000);
		animFrameId = requestAnimationFrame(animate);
	}

	configureCanvas();
	drawFrame(0);

	const renderer: LogoCanvasRenderer = {
		get isRunning() {
			return running;
		},

		start() {
			if (running) return;
			running = true;
			startTime = 0;
			animFrameId = requestAnimationFrame(animate);
		},

		stop() {
			running = false;
			if (animFrameId !== null) {
				cancelAnimationFrame(animFrameId);
				animFrameId = null;
			}
		},

		renderAtTime(elapsedSeconds: number) {
			drawFrame(elapsedSeconds);
		},

		resize(size: LogoSize | number) {
			currentSize = size;
			configureCanvas();
			if (!running) drawFrame(0);
		},

		setVariant(variant: LogoVariant) {
			currentVariant = variant;
			if (!running) drawFrame(0);
		},

		destroy() {
			renderer.stop();
			ctx.clearRect(0, 0, canvasSize, canvasSize);
		}
	};

	if (animated) {
		renderer.start();
	}

	return renderer;
}
