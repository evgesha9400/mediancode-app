<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';

	export interface LogoProps {
		size?: 'sm' | 'md' | 'lg' | 'xl';
		variant?: 'light' | 'dark';
		showText?: boolean;
		class?: string;
	}

	interface Props extends LogoProps {}

	let { size = 'md', variant = 'light', showText = false, class: className = '' }: Props = $props();

	const sizeMap = {
		sm: 32,
		md: 48,
		lg: 80,
		xl: 120
	};

	let canvasContainer = $state<HTMLDivElement>();
	let renderer: THREE.WebGLRenderer | null = null;
	let animationId: number | null = null;
	let isVisible = $state(true);
	let observer: IntersectionObserver | null = null;

	// Create cube vertices at given size
	function createCubeVertices(cubeSize: number): THREE.Vector3[] {
		const half = cubeSize / 2;
		return [
			new THREE.Vector3(-half, -half, -half),
			new THREE.Vector3(half, -half, -half),
			new THREE.Vector3(half, half, -half),
			new THREE.Vector3(-half, half, -half),
			new THREE.Vector3(-half, -half, half),
			new THREE.Vector3(half, -half, half),
			new THREE.Vector3(half, half, half),
			new THREE.Vector3(-half, half, half)
		];
	}

	// Create a cylinder connecting two points
	function createCylinder(
		point1: THREE.Vector3,
		point2: THREE.Vector3,
		color: number,
		radius: number
	): THREE.Mesh {
		const direction = new THREE.Vector3().subVectors(point2, point1);
		const length = direction.length();
		const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
		const material = new THREE.MeshBasicMaterial({ color });
		const cylinder = new THREE.Mesh(geometry, material);

		// Position at midpoint
		cylinder.position.copy(point1).add(point2).divideScalar(2);

		// Align with direction
		const axis = new THREE.Vector3(0, 1, 0);
		cylinder.quaternion.setFromUnitVectors(axis, direction.clone().normalize());

		return cylinder;
	}

	// Create edges for a cube
	function createCubeEdges(
		scene: THREE.Scene,
		vertices: THREE.Vector3[],
		color: number,
		radius: number
	): void {
		const edges = [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 0], // back face
			[4, 5],
			[5, 6],
			[6, 7],
			[7, 4], // front face
			[0, 4],
			[1, 5],
			[2, 6],
			[3, 7] // side edges
		];

		edges.forEach(([i, j]) => {
			const cylinder = createCylinder(vertices[i], vertices[j], color, radius);
			scene.add(cylinder);
		});
	}

	// Create connecting cylinders between two cubes
	function createConnectingCylinders(
		scene: THREE.Scene,
		outerVertices: THREE.Vector3[],
		innerVertices: THREE.Vector3[],
		color: number,
		radius: number
	): void {
		outerVertices.forEach((outerVertex, i) => {
			const cylinder = createCylinder(outerVertex, innerVertices[i], color, radius);
			scene.add(cylinder);
		});
	}

	onMount(() => {
		if (!canvasContainer) return;

		const pixelSize = sizeMap[size];
		// Light variant (for light backgrounds): dark edges
		// Dark variant (for dark backgrounds): light edges
		const edgeColor = variant === 'light' ? 0x333333 : 0xe5e5e5;
		const cylinderRadius = 0.03;

		// Scene setup
		const scene = new THREE.Scene();

		// Camera setup - adjusted for small viewport
		const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
		camera.position.z = 3.5;

		// Renderer setup with transparent background
		renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true
		});
		renderer.setSize(pixelSize, pixelSize);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setClearColor(0x000000, 0);
		canvasContainer.appendChild(renderer.domElement);

		// Create outer and inner cube vertices
		const outerVertices = createCubeVertices(2);
		const innerVertices = createCubeVertices(1.2);

		// Create edges for both cubes
		createCubeEdges(scene, outerVertices, edgeColor, cylinderRadius);
		createCubeEdges(scene, innerVertices, edgeColor, cylinderRadius);

		// Create connecting cylinders between cubes
		createConnectingCylinders(scene, outerVertices, innerVertices, edgeColor, cylinderRadius);

		// Animation loop
		function animate() {
			if (!renderer || !isVisible) {
				animationId = requestAnimationFrame(animate);
				return;
			}

			scene.rotation.x += 0.01;
			scene.rotation.y += 0.01;

			renderer.render(scene, camera);
			animationId = requestAnimationFrame(animate);
		}

		// Set up Intersection Observer for performance
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					isVisible = entry.isIntersecting;
				});
			},
			{ threshold: 0.1 }
		);

		observer.observe(canvasContainer);

		// Start animation
		animate();

		// Cleanup
		return () => {
			if (animationId !== null) {
				cancelAnimationFrame(animationId);
			}
			if (observer) {
				observer.disconnect();
			}
			if (renderer) {
				renderer.dispose();
				if (canvasContainer && renderer.domElement.parentNode === canvasContainer) {
					canvasContainer.removeChild(renderer.domElement);
				}
			}
			// Dispose geometries and materials
			scene.traverse((object) => {
				if (object instanceof THREE.Mesh) {
					object.geometry.dispose();
					if (object.material instanceof THREE.Material) {
						object.material.dispose();
					}
				}
			});
		};
	});
</script>

<div class="inline-flex items-center {showText ? 'space-x-2' : ''} {className}">
	<div
		bind:this={canvasContainer}
		class="flex-shrink-0"
		style="width: {sizeMap[size]}px; height: {sizeMap[size]}px;"
	></div>
	{#if showText}
		<span class="font-bold {variant === 'light' ? 'text-mono-900' : 'text-white'}">Median Code</span>
	{/if}
</div>
