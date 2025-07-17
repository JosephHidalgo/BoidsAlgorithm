// Importa GLTFLoader y AnimationMixer si estás usando módulos ES.
// Si no, asegúrate de que THREE.GLTFLoader y THREE.AnimationMixer estén cargados globalmente
// desde scripts HTML, por ejemplo:
// <script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
// <script src="https://unpkg.com/three@0.128.0/examples/js/animation/AnimationMixer.js"></script>
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { AnimationMixer } from 'three'; // AnimationMixer ya es parte del core de Three.js

// Configuración de la escena submarina
const scene = new THREE.Scene();

// Fondo de color vibrante (Turquesa)
const backgroundColor = new THREE.Color(0x40E0D0); // Turquesa
scene.background = backgroundColor;

// Niebla submarina más densa (ajustada al nuevo color de fondo)
scene.fog = new THREE.Fog(0x40E0D0, 30, 120); // Coincide con el color de fondo

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Luces submarinas
const ambientLight = new THREE.AmbientLight(0x004080, 0.4);
scene.add(ambientLight);

// Luz solar filtrada desde la superficie
const sunLight = new THREE.DirectionalLight(0x0080ff, 0.6);
sunLight.position.set(0, 50, 0); // Desde arriba
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 400;
sunLight.shadow.camera.bottom = -50;
scene.add(sunLight);

// Luz puntual azul para efecto submarino
const pointLight = new THREE.PointLight(0x00ffff, 0.3, 100);
pointLight.position.set(0, 20, 0);
scene.add(pointLight);

// Crear partículas flotantes (plancton/sedimento)
function createFloatingParticles() {
    const geometry = new THREE.BufferGeometry();
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    
    // Generar posiciones aleatorias dentro de un volumen
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 200; // X
        positions[i + 1] = (Math.random() - 0.5) * 100; // Y
        positions[i + 2] = (Math.random() - 0.5) * 200; // Z
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0x00ffff, // Cian brillante
        size: 0.3, // Tamaño de las partículas
        transparent: true,
        opacity: 0.2 // Muy transparentes
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    return particles;
}

const particles = createFloatingParticles();

// --- DIMENSIONES DEL ACUARIO ---
const AQUARIUM_SIZE = {
    width: 60,
    height: 30,
    depth: 40
};

// --- NUEVO: Nivel Y para la parte superior de la mesa (y base del acuario) ---
const TABLE_TOP_Y_LEVEL = 5;

// --- Parámetros del cardumen ---
const FISH_PARAMS = {
    maxSpeed: 0.4,
    maxForce: 0.05,
    separationRadius: 5,
    alignmentRadius: 10,
    cohesionRadius: 10,
    separationForce: 1.5,
    alignmentForce: 1.0,
    cohesionForce: 1.0,
    leaderFollowForce: 1.0,
    predatorAvoidForce: 3.0
};

// --- Funciones para elementos del acuario ---

function createRocks() {
    const rocksGroup = new THREE.Group();
    const numRocks = 15; // Número de rocas
    const brownRockMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Color marrón tierra
    const grayRockMaterial = new THREE.MeshPhongMaterial({ color: 0x696969 }); // Color gris

    for (let i = 0; i < numRocks; i++) {
        let rockGeometry;
        let materialToUse = (Math.random() > 0.5) ? brownRockMaterial : grayRockMaterial; // Variedad de color

        // Crear rocas con geometría variada (esfera o caja)
        if (Math.random() > 0.5) {
            rockGeometry = new THREE.SphereGeometry(
                Math.random() * 0.8 + 0.4, // Radio
                8, // Segmentos de ancho (bajo para aspecto rocoso)
                6  // Segmentos de alto (bajo para aspecto rocoso)
            );
        } else {
            rockGeometry = new THREE.BoxGeometry(
                Math.random() * 1.5 + 0.5, // Ancho
                Math.random() * 0.8 + 0.3, // Alto
                Math.random() * 1.5 + 0.5  // Profundidad
            );
        }

        const rock = new THREE.Mesh(rockGeometry, materialToUse);
        
        // Posicionar rocas aleatoriamente en el fondo del acuario
        rock.position.x = (Math.random() - 0.5) * (AQUARIUM_SIZE.width - 5);
        rock.position.z = (Math.random() - 0.5) * (AQUARIUM_SIZE.depth - 5);
        rock.position.y = -AQUARIUM_SIZE.height / 2 + rock.geometry.parameters.height / 2; // Asegurar que estén en el suelo
        
        // Rotación aleatoria para mayor naturalidad
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        rocksGroup.add(rock);
    }
    return rocksGroup;
}

// --- Manejo de animaciones GLB ---
const clock = new THREE.Clock(); // Necesario para calcular el delta de tiempo para el mixer
const mixers = []; // Array para almacenar todos los AnimationMixer

function loadGLBModel(path, scale, yOffset, numInstances, group) {
    const loader = new THREE.GLTFLoader();
    for (let i = 0; i < numInstances; i++) {
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.scale.set(scale, scale, scale);

            // Calcular posición aleatoria dentro de los límites del acuario
            model.position.x = (Math.random() - 0.5) * (AQUARIUM_SIZE.width - 10);
            model.position.z = (Math.random() - 0.5) * (AQUARIUM_SIZE.depth - 10);
            // Posicionar el modelo en el fondo del acuario, ajustado por yOffset
            model.position.y = -AQUARIUM_SIZE.height / 2 + yOffset + (Math.random() * 2 - 1); // Añadir pequeña variación de altura

            model.rotation.y = Math.random() * Math.PI * 2; // Rotación aleatoria
            
            // Habilitar sombras para las mallas del modelo
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            group.add(model);

            // --- INICIO: Lógica para animar los modelos GLB ---
            if (gltf.animations && gltf.animations.length) {
                const mixer = new THREE.AnimationMixer(model);
                mixers.push(mixer); // Añadir el mixer al array global

                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip).play(); // Reproducir todos los clips de animación
                });
            }
            // --- FIN: Lógica para animar los modelos GLB ---

        }, undefined, (error) => {
            console.error('An error occurred loading the GLTF model:', error);
        });
    }
}

let bubbles = []; // Array para almacenar las burbujas

function createBubbles() {
    const bubblesGroup = new THREE.Group();
    const numBubbles = 100; // Número de burbujas
    const bubbleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xADD8E6, // Azul claro
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < numBubbles; i++) {
        const bubbleRadius = Math.random() * 0.2 + 0.05; // Radio de 0.05 a 0.25
        const bubbleGeometry = new THREE.SphereGeometry(bubbleRadius, 8, 8); // Esferas de baja poli
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);

        // Posición inicial aleatoria dentro del acuario, cerca del fondo
        bubble.position.x = (Math.random() - 0.5) * (AQUARIUM_SIZE.width - 5);
        bubble.position.y = -AQUARIUM_SIZE.height / 2 + Math.random() * AQUARIUM_SIZE.height * 0.1; // Cerca del fondo
        bubble.position.z = (Math.random() - 0.5) * (AQUARIUM_SIZE.depth - 5);
        
        bubble.speed = Math.random() * 0.05 + 0.02; // Velocidad de subida
        bubbles.push(bubble); // Añadir a la lista de burbujas animadas
        bubblesGroup.add(bubble);
    }
    return bubblesGroup;
}

// --- NUEVO: Función para crear la mesa ---
function createTable() {
    const tableGroup = new THREE.Group();

    const TABLE_DIMENSIONS = {
        topWidth: AQUARIUM_SIZE.width + 10,  // Ligeramente más ancha que el acuario
        topDepth: AQUARIUM_SIZE.depth + 10,  // Ligeramente más profunda que el acuario
        topThickness: 2,                     // Grosor del tablero
        legHeight: 15,                       // Altura de las patas
        legRadius: 1                         // Radio de las patas
    };

    const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Marrón (simulando madera)

    // Tablero de la mesa
    const boardGeometry = new THREE.BoxGeometry(TABLE_DIMENSIONS.topWidth, TABLE_DIMENSIONS.topThickness, TABLE_DIMENSIONS.topDepth);
    const board = new THREE.Mesh(boardGeometry, tableMaterial);
    // Posicionar el tablero para que su superficie superior esté en TABLE_TOP_Y_LEVEL
    board.position.y = TABLE_TOP_Y_LEVEL - TABLE_DIMENSIONS.topThickness / 2;
    board.receiveShadow = true;
    tableGroup.add(board);

    // Patas de la mesa
    const legGeometry = new THREE.CylinderGeometry(TABLE_DIMENSIONS.legRadius, TABLE_DIMENSIONS.legRadius, TABLE_DIMENSIONS.legHeight, 8);
    const legOffset = (TABLE_DIMENSIONS.topWidth / 2) - TABLE_DIMENSIONS.legRadius * 2;
    const legDepthOffset = (TABLE_DIMENSIONS.topDepth / 2) - TABLE_DIMENSIONS.legRadius * 2;

    // Calcular la posición Y de las patas basándose en la parte inferior del tablero
    const legY = TABLE_TOP_Y_LEVEL - TABLE_DIMENSIONS.topThickness - TABLE_DIMENSIONS.legHeight / 2;

    const leg1 = new THREE.Mesh(legGeometry, tableMaterial);
    leg1.position.set(legOffset, legY, legDepthOffset);
    leg1.castShadow = true;
    tableGroup.add(leg1);

    const leg2 = new THREE.Mesh(legGeometry, tableMaterial);
    leg2.position.set(-legOffset, legY, legDepthOffset);
    leg2.castShadow = true;
    tableGroup.add(leg2);

    const leg3 = new THREE.Mesh(legGeometry, tableMaterial);
    leg3.position.set(legOffset, legY, -legDepthOffset);
    leg3.castShadow = true;
    tableGroup.add(leg3);

    const leg4 = new THREE.Mesh(legGeometry, tableMaterial);
    leg4.position.set(-legOffset, legY, -legDepthOffset);
    leg4.castShadow = true;
    tableGroup.add(leg4);

    return tableGroup;
}


// --- Construir el Acuario (ahora devuelve el grupo) ---
function createAquarium() {
    const wallMaterial = new THREE.MeshPhongMaterial({
        color: 0xADD8E6, // Azul claro para el agua/cristal
        transparent: true,
        opacity: 0.1, // Baja opacidad para que sea transparente
        side: THREE.DoubleSide, // Renderizar ambos lados
        shininess: 100 // Brillo
    });

    const floorMaterial = new THREE.MeshPhongMaterial({
        color: 0xD2B48C, // Color Tan (arena)
        shininess: 50
    });

    const roofMaterial = new THREE.MeshPhongMaterial({
        color: 0x004080, // Azul oscuro para la superficie del agua
        transparent: true,
        opacity: 0.2, // Ligera transparencia
        shininess: 50
    });

    const group = new THREE.Group(); // Este grupo contendrá todos los elementos del acuario

    // Suelo
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(AQUARIUM_SIZE.width, AQUARIUM_SIZE.depth), floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotar para que quede plano
    floor.position.y = -AQUARIUM_SIZE.height / 2; // Relativo al centro del grupo
    floor.receiveShadow = true;
    group.add(floor);

    // Techo (superficie del agua)
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(AQUARIUM_SIZE.width, AQUARIUM_SIZE.depth), roofMaterial);
    roof.rotation.x = -Math.PI / 2;
    roof.position.y = AQUARIUM_SIZE.height / 2;
    group.add(roof);

    // Pared trasera
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(AQUARIUM_SIZE.width, AQUARIUM_SIZE.height), wallMaterial);
    backWall.position.z = -AQUARIUM_SIZE.depth / 2;
    backWall.receiveShadow = true;
    group.add(backWall);

    // Pared frontal (opcional, principalmente para efecto visual ya que la cámara suele estar dentro)
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(AQUARIUM_SIZE.width, AQUARIUM_SIZE.height), wallMaterial);
    frontWall.position.z = AQUARIUM_SIZE.depth / 2;
    group.add(frontWall);

    // Pared izquierda
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(AQUARIUM_SIZE.depth, AQUARIUM_SIZE.height), wallMaterial);
    leftWall.rotation.y = Math.PI / 2; // Rotar para que quede vertical
    leftWall.position.x = -AQUARIUM_SIZE.width / 2;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Pared derecha
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(AQUARIUM_SIZE.depth, AQUARIUM_SIZE.height), wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = AQUARIUM_SIZE.width / 2;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Añadir rocas y burbujas al grupo del acuario
    const rocks = createRocks();
    group.add(rocks);

    const bubblesObj = createBubbles(); 
    group.add(bubblesObj);

    // --- Cargar modelos GLB ---
    // Asegúrate de que estas rutas sean correctas en relación con tu archivo HTML
    loadGLBModel('sea_weed.glb', 3, 0, 15, group); // Escala, Desplazamiento Y desde el suelo, número de instancias - AUMENTADO
    loadGLBModel('underwater_plant.glb', 1, 0.5, 10, group); // Escala, Desplazamiento Y desde el suelo, número de instancias - AUMENTADO
     loadGLBModel('piedra.glb', 1, 0.5, 10, group);
     loadGLBModel('cangrejo.glb', 0.1, 0.5, 3, group);
     loadGLBModel('sapo1.glb', 10, 0.5, 1, group);
     loadGLBModel('sapo2.glb', 2, 0.5, 1, group);
    return group; // Devolver el grupo en lugar de añadir a la escena directamente
}

// Variables globales
let fish = [];
let predator = null;
let isPaused = false;
let aquariumGroup; // Referencia global al grupo del acuario

// --- NUEVO: Plano o suelo debajo de la mesa para referencia ---
function createGroundPlane() {
    const groundGeometry = new THREE.PlaneGeometry(200, 200); // Gran plano
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Color tierra (marrón)
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Plano en el eje XZ
    ground.position.y = 0; // En el nivel Y=0 (absoluto)
    ground.receiveShadow = true; // Recibe sombras
    scene.add(ground);
}
createGroundPlane(); // Añadir el suelo al inicio

// --- CLASE FISH (con stayInAquarium modificado) ---
class Fish {
    constructor(x, y, z, isLeader = false) {
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * FISH_PARAMS.maxSpeed, 
            (Math.random() - 0.5) * (FISH_PARAMS.maxSpeed * 0.3), // Menos movimiento vertical
            (Math.random() - 0.5) * FISH_PARAMS.maxSpeed
        );
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.isLeader = isLeader;
        this.fishType = isLeader ? 'leader' : this.getRandomFishType();
        
        this.mesh = this.createFishMesh();
        scene.add(this.mesh); // Los peces son hijos directos de la escena
        
        this.swimCycle = Math.random() * Math.PI * 2; // Para animación de aletas
        this.originalY = y; // originalY ahora es la posición Y global inicial
        
        if (isLeader) {
            this.leaderTarget = new THREE.Vector3(0, 0, 0);
            this.leaderChangeTimer = 0;
            this.leaderChangeInterval = 200; // Cuadros para cambiar de objetivo
        }
    }
    
    getRandomFishType() {
        const types = ['tropical', 'deep', 'school'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    createFishMesh() {
        const group = new THREE.Group();
        const fishUnit = 0.8; // Unidad base para escalar el pez
        
        let bodyColor, finColor;
        switch(this.fishType) {
            case 'leader': bodyColor = 0xFF0000; finColor = 0xCC0000; break; // Rojo
            case 'tropical': bodyColor = 0xffff00; finColor = 0xffa500; break; // Amarillo con aletas naranjas
            case 'deep': bodyColor = 0x4169e1; finColor = 0x0000ff; break; // Azul real
            default: bodyColor = 0xc0c0c0; finColor = 0x808080; // Gris por defecto
        }
        
        const fishMaterial = new THREE.MeshPhongMaterial({ color: bodyColor, shininess: 100, transparent: true, opacity: 0.9 });
        const finMaterial = new THREE.MeshPhongMaterial({ color: finColor });

        // Cuerpo (forma de pez extruida)
        const bodyPoints = [
            new THREE.Vector2(-1.0 * fishUnit, 0),
            new THREE.Vector2(-0.5 * fishUnit, 0.3 * fishUnit),
            new THREE.Vector2(0.5 * fishUnit, 0.2 * fishUnit),
            new THREE.Vector2(1.0 * fishUnit, 0),
            new THREE.Vector2(0.5 * fishUnit, -0.2 * fishUnit),
            new THREE.Vector2(-0.5 * fishUnit, -0.3 * fishUnit),
            new THREE.Vector2(-1.0 * fishUnit, 0)
        ];
        const fishShape = new THREE.Shape(bodyPoints);
        const bodyGeometry = new THREE.ExtrudeGeometry(fishShape, { depth: 0.4 * fishUnit, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.08 * fishUnit, bevelThickness: 0.08 * fishUnit });
        const body = new THREE.Mesh(bodyGeometry, fishMaterial);
        body.rotation.y = Math.PI / 2; // Alinear el pez con el eje Z
        group.add(body);

        // Aleta dorsal (cono)
        const dorsalGeometry = new THREE.ConeGeometry(0.4 * fishUnit, 1.5 * fishUnit, 5); // Radio, altura, segmentos
        const dorsalFin = new THREE.Mesh(dorsalGeometry, finMaterial);
        dorsalFin.position.set(0, 0.3 * fishUnit, 0.3 * fishUnit); // Posición sobre el cuerpo
        dorsalFin.rotation.x = -Math.PI / 2; // Rotar para que apunte hacia arriba
        group.add(dorsalFin);
        
        // Aleta caudal (superior e inferior)
        const caudalUpperGeometry = new THREE.PlaneGeometry(1.5 * fishUnit, 0.8 * fishUnit);
        const caudalUpperFin = new THREE.Mesh(caudalUpperGeometry, finMaterial);
        caudalUpperFin.position.set(0, 0.2 * fishUnit, -1.0 * fishUnit); // Posición en la cola
        caudalUpperFin.rotation.y = Math.PI / 2;
        caudalUpperFin.rotation.z = Math.PI / 6; // Ligera inclinación
        group.add(caudalUpperFin);

        const caudalLowerGeometry = new THREE.PlaneGeometry(1.5 * fishUnit, 0.8 * fishUnit);
        const caudalLowerFin = new THREE.Mesh(caudalLowerGeometry, finMaterial);
        caudalLowerFin.position.set(0, -0.2 * fishUnit, -1.0 * fishUnit); // Posición en la cola
        caudalLowerFin.rotation.y = Math.PI / 2;
        caudalLowerFin.rotation.z = -Math.PI / 6; // Ligera inclinación opuesta
        group.add(caudalLowerFin);
        
        // Aletas pectorales (forma de curva)
        const pectoralShape = new THREE.Shape();
        pectoralShape.moveTo(0, 0);
        pectoralShape.bezierCurveTo(0.5 * fishUnit, 0.5 * fishUnit, 1.0 * fishUnit, 0.2 * fishUnit, 1.2 * fishUnit, 0); // Curva superior
        pectoralShape.bezierCurveTo(1.0 * fishUnit, -0.2 * fishUnit, 0.5 * fishUnit, -0.5 * fishUnit, 0, 0); // Curva inferior
        const pectoralGeometry = new THREE.ExtrudeGeometry(pectoralShape, { depth: 0.05 * fishUnit, bevelEnabled: false });

        const leftPectoral = new THREE.Mesh(pectoralGeometry, finMaterial);
        leftPectoral.position.set(-0.2 * fishUnit, 0, 0.4 * fishUnit); // Posición al costado
        leftPectoral.rotation.z = Math.PI / 4;
        leftPectoral.rotation.y = Math.PI / 2;
        group.add(leftPectoral);
        
        const rightPectoral = new THREE.Mesh(pectoralGeometry, finMaterial);
        rightPectoral.position.set(0.2 * fishUnit, 0, 0.4 * fishUnit); // Posición al costado opuesto
        rightPectoral.rotation.z = -Math.PI / 4;
        rightPectoral.rotation.y = -Math.PI / 2;
        group.add(rightPectoral);
        
        // Ojos
        const eyeGeometry = new THREE.SphereGeometry(0.15 * fishUnit, 8, 6);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15 * fishUnit, 0.1 * fishUnit, 0.8 * fishUnit);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15 * fishUnit, 0.1 * fishUnit, 0.8 * fishUnit);
        group.add(rightEye);
        
        // Guardar referencias para animación
        this.body = body; 
        this.caudalUpperFin = caudalUpperFin; 
        this.caudalLowerFin = caudalLowerFin; 
        this.leftPectoral = leftPectoral;
        this.rightPectoral = rightPectoral;
        this.dorsalFin = dorsalFin;
        
        // Escala para el líder
        if (this.isLeader) { group.scale.multiplyScalar(1.2); } 
        else { group.scale.multiplyScalar(0.7); } // Peces normales más pequeños
        
        return group;
    }
    
    update(fish, predator = null) {
        if (this.isLeader) { this.updateLeader(predator); } else { this.flock(fish, predator); }
        
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, FISH_PARAMS.maxSpeed); // Limitar velocidad
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0); // Resetear aceleración
        
        this.keepInAquarium(); // Asegurar que el pez esté dentro del acuario (MODIFICADA)
        this.updateMesh(); // Actualizar posición y orientación 3D
        this.animateFins(); // Animar aletas
        
        this.swimCycle += 0.03 * (this.velocity.length() / FISH_PARAMS.maxSpeed + 0.5); // Aumentar ciclo de nado
        this.position.y = this.originalY + Math.sin(this.swimCycle * 0.6) * 0.2; // Movimiento vertical de nado
    }
    
    updateLeader(predator) {
        this.leaderChangeTimer++;
        let targetForce = new THREE.Vector3(0, 0, 0);

        // Evitar al depredador si está cerca
        if (predator) {
            const avoid = this.avoidPredator(predator);
            targetForce.add(avoid);
        }

        // Si no hay una fuerte fuerza de evitación, moverse hacia un objetivo aleatorio
        if (targetForce.length() < FISH_PARAMS.maxForce * 0.5) { 
            if (this.leaderChangeTimer >= this.leaderChangeInterval) {
                // Nuevo objetivo aleatorio dentro del acuario (ajustado para la nueva Y)
                this.leaderTarget.set(
                    (Math.random() - 0.5) * (AQUARIUM_SIZE.width - 15), 
                    (Math.random() - 0.5) * (AQUARIUM_SIZE.height - 15) + aquariumGroup.position.y, // Ajustado Y
                    (Math.random() - 0.5) * (AQUARIUM_SIZE.depth - 15)
                );
                this.leaderChangeTimer = 0;
                this.leaderChangeInterval = 150 + Math.random() * 100; // Intervalo de cambio de objetivo
            }
            const seek = this.leaderTarget.clone().sub(this.position);
            seek.normalize();
            seek.multiplyScalar(FISH_PARAMS.maxSpeed * 1.0); // Velocidad de búsqueda más alta
            seek.sub(this.velocity);
            seek.clampLength(0, FISH_PARAMS.maxForce * 1.2); // Mayor fuerza de búsqueda
            targetForce.add(seek);
        }
        this.acceleration.add(targetForce);
    }
    
    flock(fish, predator) {
        const leader = fish.find(f => f.isLeader); // Encontrar al líder
        
        // Calcular las fuerzas de boid
        const sep = this.separate(fish);
        const ali = this.align(fish);
        const coh = this.cohesion(fish);
        const followLeader = leader ? this.followLeader(leader) : new THREE.Vector3(0, 0, 0);
        const avoidPredator = predator ? this.avoidPredator(predator) : new THREE.Vector3(0, 0, 0);
        
        // Aplicar pesos a las fuerzas
        sep.multiplyScalar(FISH_PARAMS.separationForce);
        ali.multiplyScalar(FISH_PARAMS.alignmentForce);
        coh.multiplyScalar(FISH_PARAMS.cohesionForce);
        followLeader.multiplyScalar(FISH_PARAMS.leaderFollowForce);
        avoidPredator.multiplyScalar(FISH_PARAMS.predatorAvoidForce);
        
        // Sumar las fuerzas a la aceleración
        this.acceleration.add(sep);
        this.acceleration.add(ali);
        this.acceleration.add(coh);
        this.acceleration.add(followLeader);
        this.acceleration.add(avoidPredator);
    }
    
    separate(fish) {
        const steer = new THREE.Vector3(0, 0, 0);
        let count = 0;
        for (let other of fish) {
            const d = this.position.distanceTo(other.position);
            if (d > 0 && d < FISH_PARAMS.separationRadius) {
                const diff = this.position.clone().sub(other.position);
                diff.normalize();
                diff.divideScalar(d); // Cuanto más cerca, más fuerte la repulsión
                steer.add(diff);
                count++;
            }
        }
        if (count > 0) {
            steer.divideScalar(count);
            steer.normalize();
            steer.multiplyScalar(FISH_PARAMS.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, FISH_PARAMS.maxForce);
        }
        return steer;
    }
    
    align(fish) {
        const sum = new THREE.Vector3(0, 0, 0);
        let count = 0;
        for (let other of fish) {
            const d = this.position.distanceTo(other.position);
            if (d > 0 && d < FISH_PARAMS.alignmentRadius) {
                sum.add(other.velocity);
                count++;
            }
        }
        if (count > 0) {
            sum.divideScalar(count);
            sum.normalize();
            sum.multiplyScalar(FISH_PARAMS.maxSpeed);
            const steer = sum.sub(this.velocity);
            steer.clampLength(0, FISH_PARAMS.maxForce);
            return steer;
        }
        return new THREE.Vector3(0, 0, 0);
    }
    
    cohesion(fish) {
        const sum = new THREE.Vector3(0, 0, 0);
        let count = 0;
        for (let other of fish) {
            const d = this.position.distanceTo(other.position);
            if (d > 0 && d < FISH_PARAMS.cohesionRadius) {
                sum.add(other.position);
                count++;
            }
        }
        if (count > 0) {
            sum.divideScalar(count);
            return this.seek(sum); // Buscar el centro de masa
        }
        return new THREE.Vector3(0, 0, 0);
    }
    
    followLeader(leader) {
        const distance = this.position.distanceTo(leader.position);
        if (distance > 8) { // Si está lejos del líder, lo persigue
            return this.seek(leader.position);
        }
        return new THREE.Vector3(0, 0, 0);
    }
    
    avoidPredator(predator) {
        const distance = this.position.distanceTo(predator.position);
        if (distance < 20) { // Si el depredador está dentro del radio de detección
            const flee = this.position.clone().sub(predator.position); // Huir en dirección opuesta
            flee.normalize();
            flee.multiplyScalar(FISH_PARAMS.maxSpeed * 1.2); // Más rápido al huir
            flee.sub(this.velocity);
            flee.clampLength(0, FISH_PARAMS.maxForce * 2); // Mayor fuerza para huir
            return flee;
        }
        return new THREE.Vector3(0, 0, 0);
    }
    
    seek(target) {
        const desired = target.clone().sub(this.position);
        desired.normalize();
        desired.multiplyScalar(FISH_PARAMS.maxSpeed);
        
        const steer = desired.sub(this.velocity);
        steer.clampLength(0, FISH_PARAMS.maxForce); // Limitar la fuerza
        return steer;
    }
    
    // --- Lógica de rebote en el acuario (MODIFICADA para la posición global) ---
    keepInAquarium() {
        // Calcular los límites globales del acuario
        const aqMinX = aquariumGroup.position.x - AQUARIUM_SIZE.width / 2;
        const aqMaxX = aquariumGroup.position.x + AQUARIUM_SIZE.width / 2;
        const aqMinY = aquariumGroup.position.y - AQUARIUM_SIZE.height / 2;
        const aqMaxY = aquariumGroup.position.y + AQUARIUM_SIZE.height / 2;
        const aqMinZ = aquariumGroup.position.z - AQUARIUM_SIZE.depth / 2;
        const aqMaxZ = aquariumGroup.position.z + AQUARIUM_SIZE.depth / 2;

        const bounceForce = FISH_PARAMS.maxForce * 2; // Fuerza de rebote
        const margin = 1; // Margen para reaccionar antes de tocar el borde

        // Rebotar en los ejes X, Y, Z
        if (this.position.x < aqMinX + margin) {
            this.velocity.x = Math.abs(this.velocity.x) + bounceForce; // Invertir y añadir fuerza
            this.position.x = aqMinX + margin; // Reposicionar dentro
        } else if (this.position.x > aqMaxX - margin) {
            this.velocity.x = -Math.abs(this.velocity.x) - bounceForce;
            this.position.x = aqMaxX - margin;
        }

        if (this.position.y < aqMinY + margin) {
            this.velocity.y = Math.abs(this.velocity.y) + bounceForce;
            this.position.y = aqMinY + margin;
        } else if (this.position.y > aqMaxY - margin) {
            this.velocity.y = -Math.abs(this.velocity.y) - bounceForce;
            this.position.y = aqMaxY - margin;
        }

        if (this.position.z < aqMinZ + margin) {
            this.velocity.z = Math.abs(this.velocity.z) + bounceForce;
            this.position.z = aqMinZ + margin;
        } else if (this.position.z > aqMaxZ - margin) {
            this.velocity.z = -Math.abs(this.velocity.z) - bounceForce;
            this.position.z = aqMaxZ - margin;
        }
    }
    
    updateMesh() {
        this.mesh.position.copy(this.position); // Sincronizar posición 3D con la lógica

        // Orientar el pez en la dirección de su velocidad
        if (this.velocity.length() > 0.01) { // Evitar divisiones por cero o jitter con velocidades muy bajas
            const direction = this.velocity.clone().normalize();
            this.mesh.lookAt(this.position.clone().add(direction));
        }
        
        // Calcular la profundidad relativa al suelo del acuario para mostrarla en el UI
        const aqFloorY = aquariumGroup.position.y - AQUARIUM_SIZE.height / 2;
        const depth = Math.max(0, Math.round(this.position.y - aqFloorY)); // Ajuste de profundidad
        if (this.isLeader) {
            document.getElementById('currentDepth').textContent = depth + 'm';
        }
    }
    
    animateFins() {
        this.swimCycle += 0.07 * (this.velocity.length() / FISH_PARAMS.maxSpeed + 0.2); // Aumentar el ciclo más rápido si va más rápido
        
        // Movimiento de aleta caudal
        const tailMovement = Math.sin(this.swimCycle * 2.5) * 0.5; // Oscilación
        this.caudalUpperFin.rotation.y = tailMovement;
        this.caudalLowerFin.rotation.y = tailMovement;

        // Movimiento de aletas pectorales
        const pectoralMovement = Math.sin(this.swimCycle * 1.8) * 0.3; 
        this.leftPectoral.rotation.z = Math.PI / 4 + pectoralMovement;
        this.rightPectoral.rotation.z = -Math.PI / 4 - pectoralMovement;

        // Pequeño movimiento dorsal y corporal
        this.dorsalFin.rotation.z = Math.sin(this.swimCycle * 1.2) * 0.1; 
        this.body.rotation.z = Math.sin(this.swimCycle * 0.8) * 0.05; 
    }
    
    destroy() {
        scene.remove(this.mesh);
        // Liberar recursos de la geometría y material para evitar fugas de memoria
        this.mesh.traverse(obj => {
            if (obj.isMesh) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });
    }
}

// --- CLASE PREDATOR (con stayInAquarium modificado) ---
class Predator {
    constructor() {
        // Posición inicial del depredador ajustada a la altura del acuario
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * AQUARIUM_SIZE.width * 0.8, 
            (Math.random() - 0.5) * AQUARIUM_SIZE.height * 0.8 + aquariumGroup.position.y, // Ajustado Y
            (Math.random() - 0.5) * AQUARIUM_SIZE.depth * 0.8
        );
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.8, // Velocidad inicial aleatoria
            (Math.random() - 0.5) * 0.2, // Movimiento vertical más lento
            (Math.random() - 0.5) * 0.8
        );
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.mesh = this.createSharkMesh();
        this.target = new THREE.Vector3(0, 0, 0); // Objetivo de persecución
        this.changeTimer = 0; // Temporizador para cambiar de objetivo
        scene.add(this.mesh); // Depredador es hijo directo de la escena
    }
    
    createSharkMesh() {
        const group = new THREE.Group();
        const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.4, 4, 8); // Cuerpo principal
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x2c3e50 }); // Gris oscuro
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2; // Orientar horizontalmente
        body.position.z = 1;
        group.add(body);

        const headGeometry = new THREE.ConeGeometry(0.5, 1, 8); // Cabeza puntiaguda
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.rotation.x = -Math.PI / 2;
        head.position.z = 3; // Delante del cuerpo
        group.add(head);

        const dorsalGeometry = new THREE.ConeGeometry(0.7, 2, 4); // Aleta dorsal alta
        const dorsalMaterial = new THREE.MeshPhongMaterial({ color: 0x34495e });
        const dorsalFin = new THREE.Mesh(dorsalGeometry, dorsalMaterial);
        dorsalFin.position.set(0, 1.5, 0);
        dorsalFin.rotation.x = Math.PI; // Apuntar hacia arriba
        group.add(dorsalFin);

        const tailGeometry = new THREE.CylinderGeometry(0.4, 0.1, 1, 6); // Base de la cola
        const tailBase = new THREE.Mesh(tailGeometry, dorsalMaterial);
        tailBase.rotation.x = Math.PI / 2;
        tailBase.position.z = -2; // Detrás del cuerpo
        group.add(tailBase);

        const caudalFinGeometry = new THREE.PlaneGeometry(2, 1.5); // Aleta caudal
        const caudalFin = new THREE.Mesh(caudalFinGeometry, dorsalMaterial);
        caudalFin.position.set(0, 0, -0.5);
        caudalFin.rotation.y = Math.PI / 2;
        tailBase.add(caudalFin); // Añadir a la base de la cola
        
        this.tail = caudalFin; // Referencia para animación
        this.swimCycle = 0;

        group.scale.multiplyScalar(0.7); // Escalar el tiburón
        return group;
    }
    
    update(fish) {
        this.changeTimer++;
        if (this.changeTimer > 200) { // Cambiar de objetivo cada 200 cuadros
            let closestFish = null;
            let closestDistance = Infinity;
            for (let f of fish) {
                const distance = this.position.distanceTo(f.position);
                if (distance < closestDistance) { closestDistance = distance; closestFish = f; }
            }
            if (closestFish) { this.target.copy(closestFish.position); } // Perseguir al pez más cercano
            this.changeTimer = 0;
        }

        const seek = this.target.clone().sub(this.position);
        seek.normalize();
        seek.multiplyScalar(0.3); // Velocidad de búsqueda del depredador
        seek.sub(this.velocity);
        seek.clampLength(0, 0.02); // Fuerza de búsqueda del depredador
        this.acceleration.add(seek);

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, 0.3); // Limitar velocidad del depredador
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);

        this.keepInAquarium(); // Asegurar que el depredador esté dentro del acuario (MODIFICADA)
        this.updateMesh();
        this.animateShark(); // Animar cola
    }
    
    // --- Lógica de rebote para Depredador (MODIFICADA para la posición global) ---
    keepInAquarium() {
        // Calcular los límites globales del acuario
        const aqMinX = aquariumGroup.position.x - AQUARIUM_SIZE.width / 2;
        const aqMaxX = aquariumGroup.position.x + AQUARIUM_SIZE.width / 2;
        const aqMinY = aquariumGroup.position.y - AQUARIUM_SIZE.height / 2;
        const aqMaxY = aquariumGroup.position.y + AQUARIUM_SIZE.height / 2;
        const aqMinZ = aquariumGroup.position.z - AQUARIUM_SIZE.depth / 2;
        const aqMaxZ = aquariumGroup.position.z + AQUARIUM_SIZE.depth / 2;

        const bounceForce = 0.2; // Fuerza de rebote
        const margin = 2; // Margen para reaccionar antes de tocar el borde

        // Rebotar en los ejes X, Y, Z
        if (this.position.x < aqMinX + margin) {
            this.velocity.x = Math.abs(this.velocity.x) + bounceForce;
            this.position.x = aqMinX + margin;
        } else if (this.position.x > aqMaxX - margin) {
            this.velocity.x = -Math.abs(this.velocity.x) - bounceForce;
            this.position.x = aqMaxX - margin;
        }

        if (this.position.y < aqMinY + margin) {
            this.velocity.y = Math.abs(this.velocity.y) + bounceForce;
            this.position.y = aqMinY + margin;
        } else if (this.position.y > aqMaxY - margin) {
            this.velocity.y = -Math.abs(this.velocity.y) - bounceForce;
            this.position.y = aqMaxY - margin;
        }

        if (this.position.z < aqMinZ + margin) {
            this.velocity.z = Math.abs(this.velocity.z) + bounceForce;
            this.position.z = aqMinZ + margin;
        } else if (this.position.z > aqMaxZ - margin) {
            this.velocity.z = -Math.abs(this.velocity.z) - bounceForce;
            this.position.z = aqMaxZ - margin;
        }
    }
    
    updateMesh() {
        this.mesh.position.copy(this.position);
        if (this.velocity.length() > 0.01) { 
            const direction = this.velocity.clone().normalize();
            this.mesh.lookAt(this.position.clone().add(direction));
        }
    }
    
    animateShark() {
        this.swimCycle += 0.08; // Velocidad de nado
        this.tail.rotation.y = Math.sin(this.swimCycle * 2) * 0.6; // Movimiento de cola
    }
    
    destroy() {
        scene.remove(this.mesh);
        this.mesh.traverse(obj => {
            if (obj.isMesh) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });
    }
}

// --- NUEVO: Función de inicialización principal ---
function initSceneElements() {
    // Añadir la mesa a la escena
    const table = createTable();
    scene.add(table);

    // Crear el grupo del acuario
    aquariumGroup = createAquarium();
    // Posicionar todo el grupo del acuario para que su suelo descanse en la parte superior de la mesa
    // El suelo del acuario está en -AQUARIUM_SIZE.height / 2 de su propio grupo.
    // Para que descanse en TABLE_TOP_Y_LEVEL, el centro del grupo debe ser TABLE_TOP_Y_LEVEL + AQUARIUM_SIZE.height / 2
    aquariumGroup.position.y = TABLE_TOP_Y_LEVEL + AQUARIUM_SIZE.height / 2;
    scene.add(aquariumGroup);

    // Ajustar la posición de la cámara para que mire al nuevo centro del acuario
    // El centro del acuario ahora está en Y = aquariumGroup.position.y
    camera.position.set(0, aquariumGroup.position.y + AQUARIUM_SIZE.height / 4, AQUARIUM_SIZE.depth / 2 + 15);
    camera.lookAt(0, aquariumGroup.position.y, 0); // Mirar al nuevo centro Y

    // Crear cardumen (sus posiciones se ajustarán internamente)
    createSchool(); 
}

// Llamar a la nueva función de inicialización al cargar la página
initSceneElements();

// --- Funciones de control de la simulación ---

// Variables para control de cámara
let mouseX = 0, mouseY = 0;

function createSchool() {
    // Limpiar peces existentes antes de recrear el cardumen
    fish.forEach(f => f.destroy());
    fish = [];

    // Crear líder en el centro del acuario (ajustado a la nueva altura global)
    const leader = new Fish(0, aquariumGroup.position.y, 0, true); 
    fish.push(leader);
    
    // Crear cardumen dentro de los límites del acuario (ajustado a la nueva altura global)
    for (let i = 0; i < 35; i++) { 
        const f = new Fish(
            (Math.random() - 0.5) * (AQUARIUM_SIZE.width * 0.8), // X
            (Math.random() - 0.5) * (AQUARIUM_SIZE.height * 0.8) + aquariumGroup.position.y, // Y ajustada
            (Math.random() - 0.5) * (AQUARIUM_SIZE.depth * 0.8) // Z
        );
        fish.push(f);
    }
    
    updateFollowerCount();
}

function updateFollowerCount() {
    // Si tienes un elemento para el conteo de seguidores, debería ser así:
    // document.getElementById('followerCount').textContent = fish.length - 1; // Restar el líder
    // El elemento con id 'currentDepth' se usa para mostrar la profundidad del líder,
    // si quieres mostrar el conteo, cambia el id o crea uno nuevo en tu HTML.
    document.getElementById('currentDepth').textContent = (fish.length - 1) + ' peces'; // Ejemplo
}

// Funciones de control (expuestas globalmente para onclick)
window.addFish = function() {
    const f = new Fish(
        (Math.random() - 0.5) * (AQUARIUM_SIZE.width * 0.8),
        (Math.random() - 0.5) * (AQUARIUM_SIZE.height * 0.8) + aquariumGroup.position.y, // Y ajustada
        (Math.random() - 0.5) * (AQUARIUM_SIZE.depth * 0.8)
    );
    fish.push(f);
    updateFollowerCount();
}

window.removeFish = function() {
    if (fish.length > 1) { // Asegurarse de no eliminar al líder si solo hay 1 pez
        const f = fish.pop();
        if (!f.isLeader) { // Solo eliminar si no es el líder
            f.destroy();
            updateFollowerCount();
        } else {
            fish.push(f); // Si era el líder, lo volvemos a añadir
        }
    }
}

window.togglePause = function() {
    isPaused = !isPaused;
}

window.togglePredator = function() {
    if (predator) {
        predator.destroy(); // Eliminar depredador existente
        predator = null;
    } else {
        predator = new Predator(); // Crear nuevo depredador (se crea en la nueva posición)
    }
}

window.resetSchool = function() {
    fish.forEach(f => f.destroy()); // Eliminar todos los peces existentes
    fish = [];
    if (predator) {
        predator.destroy(); // Eliminar depredador si existe
        predator = null;
    }
    createSchool(); // Recrea el cardumen en la nueva posición
}

// Control de cámara con el mouse
document.addEventListener('mousemove', (event) => {
    // Mapear la posición del mouse a un rango más pequeño para el movimiento de la cámara
    mouseX = (event.clientX - window.innerWidth / 2) / 200; 
    mouseY = (event.clientY - window.innerHeight / 2) / 200;
});


// Animación de partículas
function animateParticles() {
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        // Pequeño movimiento aleatorio y oscilante para cada partícula
        positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.01;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

// Bucle principal de animación
function animate() {
    requestAnimationFrame(animate);
    
    if (!isPaused) {
        const delta = clock.getDelta(); // Obtener el tiempo transcurrido desde el último frame

        // Actualizar todos los AnimationMixers
        for (const mixer of mixers) {
            mixer.update(delta);
        }

        // Actualizar peces
        fish.forEach(f => f.update(fish, predator));
        
        // Actualizar predador
        if (predator) {
            predator.update(fish);
        }
        
        // Movimiento de cámara basado en mouse para rotar alrededor del acuario
        // camera.position.y se ajusta con el mouse, pero su base está ahora centrada en el acuario
        const cameraCenterY = aquariumGroup.position.y + AQUARIUM_SIZE.height / 4; // Punto Y central para la rotación de la cámara
        camera.position.x = Math.sin(mouseX) * (AQUARIUM_SIZE.depth / 2 + 15);
        camera.position.z = Math.cos(mouseX) * (AQUARIUM_SIZE.depth / 2 + 15);
        camera.position.y = cameraCenterY + mouseY * 5; // Ajustar altura con el mouse
        camera.lookAt(0, aquariumGroup.position.y, 0); // Mirar al centro del acuario

        // Animar partículas flotantes
        animateParticles();
        
        // Rotar partículas lentamente
        particles.rotation.y += 0.001;

        // Animar burbujas (Y ajustada para reiniciar en el nuevo suelo del acuario)
        const aqFloorY = aquariumGroup.position.y - AQUARIUM_SIZE.height / 2;
        const aqRoofY = aquariumGroup.position.y + AQUARIUM_SIZE.height / 2;

        bubbles.forEach(bubble => {
            bubble.position.y += bubble.speed;
            // Si la burbuja sube por encima del techo del acuario, reiniciarla en el fondo
            if (bubble.position.y > aqRoofY + 2) { // 2 unidades por encima del techo
                bubble.position.y = aqFloorY; // Vuelve al fondo del acuario
                bubble.position.x = (Math.random() - 0.5) * (AQUARIUM_SIZE.width - 5);
                bubble.position.z = (Math.random() - 0.5) * (AQUARIUM_SIZE.depth - 5);
                bubble.speed = Math.random() * 0.05 + 0.02; // Nueva velocidad para variar
            }
        });
    }
    
    renderer.render(scene, camera);
}

// Manejar redimensionamiento de la ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Controles de teclado adicionales
document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case ' ':
            togglePause();
            break;
        case 'p':
            togglePredator();
            break;
        case '+':
            addFish();
            break;
        case '-':
            removeFish();
            break;
        case 'r':
            resetSchool();
            break;
    }
});

// Iniciar animación
animate();