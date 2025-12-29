/**
 * scene.js - Three.js 场景管理模块
 * 负责创建和管理3D场景、相机、渲染器和光照
 */

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.animationFrameId = null;
        this.renderCallbacks = [];
    }

    /**
     * 初始化3D场景
     */
    init() {
        this.container = document.getElementById('canvas-container');
        
        // 创建场景
        this.scene = new THREE.Scene();
        
        // 创建相机 - 透视相机
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 2, 8);
        this.camera.lookAt(0, 0, 0);
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        this.container.appendChild(this.renderer.domElement);
        
        // 设置光照
        this.setupLights();
        
        // 添加背景效果
        this.setupBackground();
        
        // 窗口大小变化监听
        window.addEventListener('resize', () => this.onWindowResize());
        
        // 开始渲染循环
        this.animate();
    }

    /**
     * 设置光照系统
     */
    setupLights() {
        // 环境光 - 柔和的紫色调
        const ambientLight = new THREE.AmbientLight(0x6B4AA0, 0.4);
        this.scene.add(ambientLight);
        
        // 主聚光灯 - 从上方照射
        const mainSpotlight = new THREE.SpotLight(0xFFD700, 1.5);
        mainSpotlight.position.set(0, 10, 5);
        mainSpotlight.angle = Math.PI / 4;
        mainSpotlight.penumbra = 0.5;
        mainSpotlight.decay = 2;
        mainSpotlight.distance = 50;
        mainSpotlight.castShadow = true;
        mainSpotlight.shadow.mapSize.width = 1024;
        mainSpotlight.shadow.mapSize.height = 1024;
        this.scene.add(mainSpotlight);
        
        // 补光 - 左侧蓝色
        const fillLight1 = new THREE.PointLight(0x4444FF, 0.5);
        fillLight1.position.set(-5, 3, 3);
        this.scene.add(fillLight1);
        
        // 补光 - 右侧紫色
        const fillLight2 = new THREE.PointLight(0x9944FF, 0.5);
        fillLight2.position.set(5, 3, 3);
        this.scene.add(fillLight2);
        
        // 底部反光
        const bottomLight = new THREE.PointLight(0x2D1B4E, 0.3);
        bottomLight.position.set(0, -3, 2);
        this.scene.add(bottomLight);
    }

    /**
     * 设置背景效果
     */
    setupBackground() {
        // 创建星空背景
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 500;
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 100;     // x
            positions[i + 1] = (Math.random() - 0.5) * 100; // y
            positions[i + 2] = -20 - Math.random() * 50;    // z (behind camera)
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFD700,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
        
        // 创建地面 - 神秘的桌面
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1A1A3E,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    /**
     * 添加渲染回调
     */
    addRenderCallback(callback) {
        this.renderCallbacks.push(callback);
    }

    /**
     * 移除渲染回调
     */
    removeRenderCallback(callback) {
        const index = this.renderCallbacks.indexOf(callback);
        if (index > -1) {
            this.renderCallbacks.splice(index, 1);
        }
    }

    /**
     * 渲染循环
     */
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // 星空缓慢旋转
        if (this.stars) {
            this.stars.rotation.y += 0.0001;
            this.stars.rotation.z += 0.00005;
        }
        
        // 执行所有渲染回调
        for (const callback of this.renderCallbacks) {
            callback();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 窗口大小变化处理
     */
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    /**
     * 获取场景对象
     */
    getScene() {
        return this.scene;
    }

    /**
     * 获取相机对象
     */
    getCamera() {
        return this.camera;
    }

    /**
     * 获取渲染器
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * 清理资源
     */
    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
