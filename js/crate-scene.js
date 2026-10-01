const canvas = document.querySelector("#crate-scene");
const wrapper = canvas?.parentElement;

if (canvas && wrapper) {
	Promise.all([
		import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js"),
		import("https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js")
	])
		.then(([THREE, CANNON]) => startScene(THREE, CANNON, canvas, wrapper))
		.catch(() => {
			wrapper.dataset.error = "true";
		});
}

function startScene(THREE, CANNON, canvas, wrapper) {
	const crateWidth = 1.68;
	const wallThickness = 0.12;
	const baseThickness = 0.14;
	const containmentHeight = 1.62;
	const containmentCenterY = baseThickness / 2 + containmentHeight / 2;
	const plankHeight = 0.22;
	const plankCenters = [0.18, 0.46, 0.74, 1.02];
	const recordThickness = 0.09;
	const recordSize = 1.24;
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const dropHeight = reducedMotion ? 0 : 4.2;
	const gravity = 24;
	const recordNames = [
		"PINK FLOYD",
		"ALICE IN CHAINS",
		"DAFT PUNK",
		"MAC DEMARCO",
		"PEARL JAM",
		"RADIOHEAD",
		"JACK STAUBER",
		"THE BEATLES"
	];
	const recordLayout = [
		{ x: -0.4, z: -0.12, twist: -0.07 },
		{ x: -0.28, z: 0.08, twist: 0.02 },
		{ x: -0.16, z: -0.04, twist: 0.11 },
		{ x: -0.02, z: 0.14, twist: -0.08 },
		{ x: 0.1, z: -0.13, twist: 0.07 },
		{ x: 0.23, z: 0.06, twist: -0.12 },
		{ x: 0.35, z: -0.07, twist: 0.16 },
		{ x: 0.43, z: 0.13, twist: -0.04 }
	];
	const sleeveColors = ["#bd5540", "#34474a", "#d2a948", "#4f756b", "#b8a78b", "#455d79", "#b55e39", "#d5ccaf"];

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
	const baseCameraFov = 36;
	const referenceAspect = 0.85;
	const cameraPan = window.innerWidth < 900 ? 0.3 : 0.2;
	camera.position.set(2.85 + cameraPan, 2.7, 4);
	camera.lookAt(cameraPan, 0.72, 0);

	const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.16;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	scene.add(new THREE.HemisphereLight(0xfff4d5, 0x534439, 2.1));
	const keyLight = new THREE.DirectionalLight(0xffe2b0, 3.3);
	keyLight.position.set(-3.5, 7, 4.5);
	keyLight.castShadow = true;
	keyLight.shadow.mapSize.set(1024, 1024);
	keyLight.shadow.camera.left = -6;
	keyLight.shadow.camera.right = 6;
	keyLight.shadow.camera.top = 5;
	keyLight.shadow.camera.bottom = -3;
	keyLight.shadow.bias = -0.0004;
	scene.add(keyLight);
	const fillLight = new THREE.DirectionalLight(0x9ac6c2, 1.4);
	fillLight.position.set(4, 3, -3);
	scene.add(fillLight);

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(30, 30),
		new THREE.ShadowMaterial({ color: 0x211911, opacity: 0.2 })
	);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -baseThickness / 2;
	ground.receiveShadow = true;
	scene.add(ground);

	const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -gravity, 0) });
	world.allowSleep = true;
	world.broadphase = new CANNON.SAPBroadphase(world);
	world.solver.iterations = 14;
	world.defaultContactMaterial.friction = 0.68;
	world.defaultContactMaterial.restitution = 0.03;

	const groundBody = new CANNON.Body({ mass: 0, material: new CANNON.Material("ground") });
	groundBody.addShape(new CANNON.Plane());
	groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
	groundBody.position.y = -baseThickness / 2;
	world.addBody(groundBody);

	const woodTexture = makeWoodTexture(THREE);
	const woodMaterial = new THREE.MeshStandardMaterial({
		map: woodTexture,
		color: 0xc18454,
		roughness: 0.84,
		metalness: 0
	});
	const darkMetal = new THREE.MeshStandardMaterial({ color: 0x35332e, roughness: 0.46, metalness: 0.72 });
	const crateBody = new CANNON.Body({
		mass: reducedMotion ? 0 : 24,
		position: new CANNON.Vec3(0, dropHeight, 0),
		material: new CANNON.Material("wood"),
		linearDamping: 0.06,
		angularDamping: 0.58,
		allowSleep: true,
		sleepSpeedLimit: 0.12,
		sleepTimeLimit: 0.9
	});
	const crateGroup = new THREE.Group();
	scene.add(crateGroup);

	addCratePart(
		new THREE.Vector3(crateWidth, baseThickness, crateWidth),
		new THREE.Vector3(0, 0, 0)
	);

	const plankDepth = crateWidth;
	const wallOffset = crateWidth / 2 - wallThickness / 2;
	for (const centerY of plankCenters) {
		addCratePart(
			new THREE.Vector3(crateWidth, plankHeight, wallThickness),
			new THREE.Vector3(0, centerY, wallOffset)
		);
		addCratePart(
			new THREE.Vector3(crateWidth, plankHeight, wallThickness),
			new THREE.Vector3(0, centerY, -wallOffset)
		);
		addCratePart(
			new THREE.Vector3(wallThickness, plankHeight, plankDepth),
			new THREE.Vector3(wallOffset, centerY, 0)
		);
		addCratePart(
			new THREE.Vector3(wallThickness, plankHeight, plankDepth),
			new THREE.Vector3(-wallOffset, centerY, 0)
		);
	}

	const label = new THREE.Mesh(
		new THREE.PlaneGeometry(1.28, 0.14),
		new THREE.MeshStandardMaterial({ map: makeCrateLabel(THREE), roughness: 0.9 })
	);
	label.position.set(0, plankCenters[1], crateWidth / 2 + 0.002);
	label.castShadow = true;
	crateGroup.add(label);

	for (const centerY of plankCenters) {
		for (const x of [-0.67, 0.67]) {
			const nail = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), darkMetal);
			nail.position.set(x, centerY, crateWidth / 2 + 0.012);
			nail.castShadow = true;
			crateGroup.add(nail);
		}
	}

	const crateContact = new CANNON.Material("crate-contact");
	world.addContactMaterial(new CANNON.ContactMaterial(crateContact, groundBody.material, { friction: 0.74, restitution: 0.1 }));
	crateBody.material = crateContact;
	crateBody.addShape(
		new CANNON.Box(new CANNON.Vec3(crateWidth / 2, baseThickness / 2, crateWidth / 2)),
		new CANNON.Vec3(0, 0, 0)
	);
	crateBody.addShape(
		new CANNON.Box(new CANNON.Vec3(crateWidth / 2, containmentHeight / 2, wallThickness / 2)),
		new CANNON.Vec3(0, containmentCenterY, wallOffset)
	);
	crateBody.addShape(
		new CANNON.Box(new CANNON.Vec3(crateWidth / 2, containmentHeight / 2, wallThickness / 2)),
		new CANNON.Vec3(0, containmentCenterY, -wallOffset)
	);
	crateBody.addShape(
		new CANNON.Box(new CANNON.Vec3(wallThickness / 2, containmentHeight / 2, crateWidth / 2)),
		new CANNON.Vec3(wallOffset, containmentCenterY, 0)
	);
	crateBody.addShape(
		new CANNON.Box(new CANNON.Vec3(wallThickness / 2, containmentHeight / 2, crateWidth / 2)),
		new CANNON.Vec3(-wallOffset, containmentCenterY, 0)
	);
	world.addBody(crateBody);

	const recordContact = new CANNON.Material("record-contact");
	world.addContactMaterial(new CANNON.ContactMaterial(recordContact, groundBody.material, { friction: 0.7, restitution: 0.06 }));
	world.addContactMaterial(new CANNON.ContactMaterial(recordContact, crateContact, { friction: 0.78, restitution: 0.04 }));
	const recordBodies = [];
	const recordGroups = [];
	const coverGeometry = new THREE.PlaneGeometry(recordSize, recordSize);
	const spineGeometry = new THREE.PlaneGeometry(recordThickness * 0.92, recordSize * 0.96);
	const sleeveGeometry = new THREE.BoxGeometry(recordThickness, recordSize, recordSize);

	for (let index = 0; index < recordNames.length; index += 1) {
		const color = sleeveColors[index];
		const coverTexture = makeCoverTexture(THREE, recordNames[index], color, index);
		const spineTexture = makeSpineTexture(THREE, recordNames[index], color);
		const sleeveMaterials = [
			new THREE.MeshStandardMaterial({ color: 0xf3e8d1, roughness: 0.92 }),
			new THREE.MeshStandardMaterial({ color: 0xd8cbb0, roughness: 0.94 }),
			new THREE.MeshStandardMaterial({ color: 0xc8b99c, roughness: 0.95 }),
			new THREE.MeshStandardMaterial({ color: 0x8b7459, roughness: 0.95 }),
			new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
			new THREE.MeshStandardMaterial({ color: 0x75644f, roughness: 0.95 })
		];
		const sleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterials);
		sleeve.castShadow = true;
		sleeve.receiveShadow = true;
		const cover = new THREE.Mesh(
			coverGeometry,
			new THREE.MeshStandardMaterial({ map: coverTexture, roughness: 0.9, side: THREE.DoubleSide })
		);
		cover.rotation.y = Math.PI / 2;
		cover.position.x = recordThickness / 2 + 0.002;
		cover.castShadow = true;
		const spine = new THREE.Mesh(
			spineGeometry,
			new THREE.MeshStandardMaterial({ map: spineTexture, roughness: 0.94, side: THREE.DoubleSide })
		);
		spine.position.z = recordSize / 2 + 0.002;
		spine.castShadow = true;

		const group = new THREE.Group();
		group.add(sleeve, cover, spine);
		group.visible = reducedMotion;
		if (index === 0) {
			group.add(makeVinylDisc(THREE, color, recordThickness, recordSize));
		}
		scene.add(group);
		recordGroups.push(group);

		const body = new CANNON.Body({
			mass: reducedMotion ? 0 : 0.38,
			material: recordContact,
			linearDamping: 0.12,
			angularDamping: 0.94,
			allowSleep: true,
			sleepSpeedLimit: 0.14,
			sleepTimeLimit: 0.7
		});
		body.addShape(new CANNON.Box(new CANNON.Vec3(recordThickness / 2, recordSize / 2, recordSize / 2)));
		const placement = recordLayout[index];
		body.position.set(
			placement.x,
			reducedMotion
				? baseThickness / 2 + recordSize / 2
				: dropHeight + baseThickness / 2 + recordSize / 2,
			placement.z
		);
		body.quaternion.setFromEuler(0, placement.twist, 0);
		body.angularFactor.set(0, 1, 0);
		if (!reducedMotion) {
			body.collisionResponse = false;
		}
		world.addBody(body);
		if (!reducedMotion) {
			body.sleep();
		}
		recordBodies.push(body);
	}

	const simulatedBodies = [crateBody, ...recordBodies];
	let quietTime = 0;
	let animationTime = 0;
	let crateQuietTime = 0;
	let crateRestedAt = null;
	let nextRecordToRelease = 0;

	const resizeObserver = new ResizeObserver(() => {
		const width = Math.max(1, canvas.clientWidth);
		const height = Math.max(1, canvas.clientHeight);
		camera.aspect = width / height;
		camera.fov = camera.aspect < referenceAspect
			? THREE.MathUtils.radToDeg(
				2 * Math.atan(
					Math.tan(THREE.MathUtils.degToRad(baseCameraFov) / 2) *
						referenceAspect / camera.aspect
				)
			)
			: baseCameraFov;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height, false);
		renderer.render(scene, camera);
	});
	resizeObserver.observe(wrapper);

	const clock = new THREE.Clock();
	const fixedStep = 1 / 60;
	function animate() {
		const delta = Math.min(clock.getDelta(), 1 / 30);
		animationTime += delta;
		world.step(fixedStep, delta, 3);
		crateGroup.position.copy(crateBody.position);
		crateGroup.quaternion.copy(crateBody.quaternion);
		const crateIsQuiet = crateBody.velocity.length() < 0.12 && crateBody.angularVelocity.length() < 0.12;
		crateQuietTime = crateIsQuiet ? crateQuietTime + delta : 0;
		if (!reducedMotion && crateQuietTime >= 0.2) {
			if (crateRestedAt === null) {
				crateRestedAt = animationTime;
			}
			while (
				nextRecordToRelease < recordBodies.length &&
				animationTime - crateRestedAt >= 0.12 + nextRecordToRelease * 0.08
			) {
				const body = recordBodies[nextRecordToRelease];
				const group = recordGroups[nextRecordToRelease];
				const placement = recordLayout[nextRecordToRelease];
				const localPosition = new CANNON.Vec3(
					placement.x,
					baseThickness / 2 + recordSize / 2 + 0.2,
					placement.z
				);
				crateBody.pointToWorldFrame(localPosition, body.position);
				const localQuaternion = new CANNON.Quaternion();
				localQuaternion.setFromEuler(0, placement.twist, 0);
				crateBody.quaternion.mult(localQuaternion, body.quaternion);
				body.velocity.set(0, 0, 0);
				body.angularVelocity.set(0, 0, 0);
				body.collisionResponse = true;
				body.wakeUp();
				group.visible = true;
				nextRecordToRelease += 1;
			}
		}
		for (let index = 0; index < recordBodies.length; index += 1) {
			recordGroups[index].position.copy(recordBodies[index].position);
			recordGroups[index].quaternion.copy(recordBodies[index].quaternion);
		}
		renderer.render(scene, camera);
		const allBodiesQuiet = simulatedBodies.every(
			(body) => body.velocity.length() < 0.12 && body.angularVelocity.length() < 0.12
		);
		quietTime = allBodiesQuiet ? quietTime + delta : 0;
		if (quietTime >= 0.55) {
			wrapper.dataset.settled = "true";
			return;
		}
		requestAnimationFrame(animate);
	}
	animate();

	function addCratePart(size, position) {
		const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
		const mesh = new THREE.Mesh(geometry, woodMaterial);
		mesh.position.copy(position);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		crateGroup.add(mesh);
	}
}

function makeCanvasTexture(THREE, source) {
	const texture = new THREE.CanvasTexture(source);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

function makeWoodTexture(THREE) {
	const source = document.createElement("canvas");
	source.width = 512;
	source.height = 256;
	const context = source.getContext("2d");
	context.fillStyle = "#a96f45";
	context.fillRect(0, 0, source.width, source.height);
	for (let index = 0; index < 110; index += 1) {
		const y = Math.random() * source.height;
		context.strokeStyle = index % 3 === 0 ? "rgba(74, 43, 27, 0.25)" : "rgba(240, 193, 130, 0.18)";
		context.lineWidth = Math.random() * 2 + 0.4;
		context.beginPath();
		context.moveTo(0, y);
		context.bezierCurveTo(130, y - 10, 330, y + 12, source.width, y + (Math.random() - 0.5) * 12);
		context.stroke();
	}
	for (let index = 0; index < 1700; index += 1) {
		context.fillStyle = index % 2 ? "rgba(43, 29, 19, 0.07)" : "rgba(255, 220, 166, 0.08)";
		context.fillRect(Math.random() * source.width, Math.random() * source.height, Math.random() * 2 + 0.5, 1);
	}
	const texture = makeCanvasTexture(THREE, source);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.anisotropy = 4;
	return texture;
}

function makeCoverTexture(THREE, name, color, index) {
	const source = document.createElement("canvas");
	source.width = 512;
	source.height = 512;
	const context = source.getContext("2d");
	context.fillStyle = color;
	context.fillRect(0, 0, 512, 512);
	context.save();
	context.translate(256, 238);
	context.rotate(index % 2 ? -0.16 : 0.16);
	context.fillStyle = index % 2 ? "#e5d9bd" : "#292b28";
	context.beginPath();
	context.arc(0, 0, 142 - (index % 3) * 15, 0, Math.PI * 2);
	context.fill();
	context.strokeStyle = color;
	context.lineWidth = 12;
	for (let ring = 0; ring < 7; ring += 1) {
		context.beginPath();
		context.arc(0, 0, 35 + ring * 18, 0, Math.PI * 2);
		context.stroke();
	}
	context.fillStyle = index % 2 ? "#c95038" : "#d7d04c";
	context.beginPath();
	context.arc(0, 0, 33, 0, Math.PI * 2);
	context.fill();
	context.restore();
	context.fillStyle = "#f5ebd8";
	context.font = "700 29px 'Courier New', monospace";
	context.textAlign = "left";
	context.fillText(name, 28, 458, 456);
	context.fillStyle = "rgba(255, 247, 225, 0.55)";
	context.fillRect(24, 26, 5, 460);
	return makeCanvasTexture(THREE, source);
}

function makeSpineTexture(THREE, name, color) {
	const source = document.createElement("canvas");
	source.width = 128;
	source.height = 512;
	const context = source.getContext("2d");
	context.fillStyle = color;
	context.fillRect(0, 0, 128, 512);
	context.fillStyle = "rgba(255, 244, 215, 0.26)";
	context.fillRect(8, 0, 8, 512);
	context.save();
	context.translate(64, 256);
	context.rotate(-Math.PI / 2);
	context.fillStyle = "#fff4db";
	context.textAlign = "center";
	context.font = "700 23px 'Courier New', monospace";
	context.fillText(name, 0, 7, 440);
	context.restore();
	return makeCanvasTexture(THREE, source);
}

function makeCrateLabel(THREE) {
	const source = document.createElement("canvas");
	source.width = 1200;
	source.height = 128;
	const context = source.getContext("2d");
	context.fillStyle = "#dfcc9e";
	context.fillRect(0, 0, 1200, 128);
	context.strokeStyle = "#4b3524";
	context.lineWidth = 8;
	context.strokeRect(5, 5, 1190, 118);
	context.fillStyle = "#35291e";
	context.font = "700 120px 'Courier New', monospace";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillText("OPEN THE BOX", 600, 67);
	return makeCanvasTexture(THREE, source);
}

function makeVinylDisc(THREE, labelColor, thickness) {
	const source = document.createElement("canvas");
	source.width = 512;
	source.height = 512;
	const context = source.getContext("2d");
	context.fillStyle = "#171817";
	context.fillRect(0, 0, 512, 512);
	for (let radius = 63; radius < 240; radius += 8) {
		context.beginPath();
		context.arc(256, 256, radius, 0, Math.PI * 2);
		context.strokeStyle = radius % 16 ? "rgba(210, 210, 194, 0.19)" : "rgba(255, 255, 238, 0.3)";
		context.lineWidth = radius % 16 ? 1 : 2;
		context.stroke();
	}
	context.beginPath();
	context.arc(256, 256, 56, 0, Math.PI * 2);
	context.fillStyle = labelColor;
	context.fill();
	context.beginPath();
	context.arc(256, 256, 5, 0, Math.PI * 2);
	context.fillStyle = "#171817";
	context.fill();
	const texture = makeCanvasTexture(THREE, source);
	const faceMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.28, metalness: 0.08 });
	const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x171817, roughness: 0.48 });
	const disc = new THREE.Mesh(
		new THREE.CylinderGeometry(0.49, 0.49, 0.018, 64),
		[edgeMaterial, faceMaterial, faceMaterial]
	);
	disc.rotation.z = Math.PI / 2;
	disc.position.set(thickness / 2 + 0.012, 0.13, 0);
	disc.castShadow = true;
	return disc;
}