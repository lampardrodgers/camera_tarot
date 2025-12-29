/**
 * animations.js - 动画效果模块 (增强版)
 * 改进：更炫酷的抽卡粒子特效
 */

export class AnimationController {
    constructor(scene) {
        this.scene = scene;
        this.particleGroup = new THREE.Group();
        scene.add(this.particleGroup);
        this.activeParticles = [];
    }

    // 超炫酷抽卡粒子特效
    createDrawParticles(position) {
        // 第一波：爆发粒子
        this.createBurstParticles(position, 80);

        // 第二波：螺旋上升粒子
        setTimeout(() => this.createSpiralParticles(position, 40), 200);

        // 第三波：光环
        setTimeout(() => this.createRingEffect(position), 100);

        // 第四波：闪光
        setTimeout(() => this.createFlashEffect(position), 50);
    }

    createBurstParticles(position, count) {
        const colors = [0xFFD700, 0xFFA500, 0xFF6B6B, 0x9B59B6, 0x00D2D3];

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            this.particleGroup.add(particle);

            // 球形爆发
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const speed = 2 + Math.random() * 3;

            const vx = Math.sin(theta) * Math.cos(phi) * speed;
            const vy = Math.cos(theta) * speed * 0.5 + 1;
            const vz = Math.sin(theta) * Math.sin(phi) * speed;

            gsap.to(particle.position, {
                x: position.x + vx,
                y: position.y + vy,
                z: position.z + vz,
                duration: 1.5,
                ease: 'power2.out'
            });

            gsap.to(particle.scale, {
                x: 0.1, y: 0.1, z: 0.1,
                duration: 1.2,
                delay: 0.3
            });

            gsap.to(material, {
                opacity: 0,
                duration: 1,
                delay: 0.5,
                onComplete: () => {
                    this.particleGroup.remove(particle);
                    geometry.dispose();
                    material.dispose();
                }
            });
        }
    }

    createSpiralParticles(position, count) {
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(0.04, 8, 8);
            const hue = (i / count) * 0.15 + 0.1; // 金色到橙色
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(hue, 1, 0.5),
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            this.particleGroup.add(particle);

            const angle = (i / count) * Math.PI * 4;
            const radius = 0.5 + (i / count) * 2;
            const height = (i / count) * 4;

            gsap.to(particle.position, {
                x: position.x + Math.cos(angle) * radius,
                y: position.y + height,
                z: position.z + Math.sin(angle) * radius,
                duration: 2,
                ease: 'power1.out',
                delay: i * 0.02
            });

            gsap.to(material, {
                opacity: 0,
                duration: 1,
                delay: 1 + i * 0.01,
                onComplete: () => {
                    this.particleGroup.remove(particle);
                    geometry.dispose();
                    material.dispose();
                }
            });
        }
    }

    createRingEffect(position) {
        for (let r = 0; r < 3; r++) {
            const geometry = new THREE.RingGeometry(0.1, 0.15 + r * 0.1, 32);
            const material = new THREE.MeshBasicMaterial({
                color: r === 0 ? 0xFFD700 : (r === 1 ? 0xFFA500 : 0xFF6B6B),
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });

            const ring = new THREE.Mesh(geometry, material);
            ring.position.copy(position);
            ring.rotation.x = -Math.PI / 2;
            this.particleGroup.add(ring);

            gsap.to(ring.scale, {
                x: 15 + r * 5,
                y: 15 + r * 5,
                z: 1,
                duration: 1.2,
                ease: 'power2.out',
                delay: r * 0.15
            });

            gsap.to(material, {
                opacity: 0,
                duration: 1,
                delay: 0.2 + r * 0.15,
                onComplete: () => {
                    this.particleGroup.remove(ring);
                    geometry.dispose();
                    material.dispose();
                }
            });
        }
    }

    createFlashEffect(position) {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });

        const flash = new THREE.Mesh(geometry, material);
        flash.position.copy(position);
        this.particleGroup.add(flash);

        gsap.to(flash.scale, {
            x: 10, y: 10, z: 10,
            duration: 0.3,
            ease: 'power2.out'
        });

        gsap.to(material, {
            opacity: 0,
            duration: 0.4,
            onComplete: () => {
                this.particleGroup.remove(flash);
                geometry.dispose();
                material.dispose();
            }
        });
    }

    // 持续的卡牌光晕效果
    createCardGlow(cardMesh) {
        const glowGeometry = new THREE.PlaneGeometry(2, 3);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.z = -0.1;
        cardMesh.add(glow);

        // 脉冲动画
        gsap.to(glowMaterial, {
            opacity: 0.6,
            duration: 1,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1
        });

        gsap.to(glow.scale, {
            x: 1.2, y: 1.2,
            duration: 1.5,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1
        });

        return glow;
    }

    updateGestureHint(gesture) {
        const hints = {
            'open': 'hint-spread',
            'closed': 'hint-collapse',
            'move': 'hint-select',
            'pinch': 'hint-grab',
            'pinch_up': 'hint-draw',
            'thumbsup': 'hint-grab',
            'ok': 'hint-ok'
        };

        document.querySelectorAll('.gesture-item').forEach(el => el.classList.remove('active'));

        const hintId = hints[gesture];
        if (hintId) {
            const element = document.getElementById(hintId);
            if (element) element.classList.add('active');
        }
    }

    showStateIndicator(icon, text) {
        const indicator = document.getElementById('state-indicator');
        const iconEl = document.getElementById('state-icon');
        const textEl = document.getElementById('state-text');

        iconEl.textContent = icon;
        textEl.textContent = text;
        indicator.classList.add('visible');

        setTimeout(() => indicator.classList.remove('visible'), 2500);
    }

    showCardInfo(cardData) {
        const panel = document.getElementById('card-info-panel');
        const nameEl = document.getElementById('card-name');
        const meaningEl = document.getElementById('card-meaning');
        const imageEl = document.getElementById('card-image');

        nameEl.textContent = `${cardData.name} - ${cardData.english}`;
        meaningEl.textContent = cardData.meaning;
        if (imageEl) {
            if (cardData.imageUrl) {
                imageEl.style.backgroundImage = `url("${cardData.imageUrl}")`;
            } else {
                imageEl.style.backgroundImage = '';
            }
        }

        panel.classList.remove('hidden');
        setTimeout(() => panel.classList.add('visible'), 50);
    }

    hideCardInfo() {
        const panel = document.getElementById('card-info-panel');
        panel.classList.remove('visible');
        setTimeout(() => panel.classList.add('hidden'), 500);
    }

    hideLoading() {
        const loading = document.getElementById('loading-overlay');
        loading.classList.add('hidden');
    }
}
