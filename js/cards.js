/**
 * cards.js - 3D塔罗牌系统模块 (优化版)
 * 改进：更精美的卡面、空中悬浮展开、更好的选择效果
 */

const MAJOR_ARCANA = [
    { id: 0, name: '愚者', english: 'The Fool', meaning: '新的开始，无限可能，天真与冒险。代表着一段新旅程的开始，充满无限可能性。', color: '#FFD700' },
    { id: 1, name: '魔术师', english: 'The Magician', meaning: '创造力，意志力，技能与资源。你拥有实现目标所需的一切力量。', color: '#FF6B6B' },
    { id: 2, name: '女祭司', english: 'The High Priestess', meaning: '直觉，神秘，内在智慧。倾听内心深处的声音。', color: '#4ECDC4' },
    { id: 3, name: '女皇', english: 'The Empress', meaning: '丰收，母性，自然之美。创造与养育的能量环绕着你。', color: '#95E1D3' },
    { id: 4, name: '皇帝', english: 'The Emperor', meaning: '权威，结构，领导力。稳定与控制的力量正在显现。', color: '#F38181' },
    { id: 5, name: '教皇', english: 'The Hierophant', meaning: '传统，精神指引，教育。寻求更高层次的真理与智慧。', color: '#AA96DA' },
    { id: 6, name: '恋人', english: 'The Lovers', meaning: '爱情，和谐，选择。重要的关系与人生决定即将到来。', color: '#FF69B4' },
    { id: 7, name: '战车', english: 'The Chariot', meaning: '胜利，意志力，决心。克服一切障碍勇往直前。', color: '#6C5CE7' },
    { id: 8, name: '力量', english: 'Strength', meaning: '勇气，耐心，内在力量。以柔克刚的智慧将引导你。', color: '#FDCB6E' },
    { id: 9, name: '隐士', english: 'The Hermit', meaning: '内省，寻找，独处。在静默中寻找内心的光明。', color: '#636E72' },
    { id: 10, name: '命运之轮', english: 'Wheel of Fortune', meaning: '命运，转变，机遇。生命的循环正在转动。', color: '#00CEC9' },
    { id: 11, name: '正义', english: 'Justice', meaning: '公正，真相，因果。一切因果终将平衡。', color: '#E17055' },
    { id: 12, name: '倒吊人', english: 'The Hanged Man', meaning: '牺牲，等待，新视角。换一个角度看世界。', color: '#0984E3' },
    { id: 13, name: '死神', english: 'Death', meaning: '结束，转变，新生。旧事物的终结带来新的开始。', color: '#2D3436' },
    { id: 14, name: '节制', english: 'Temperance', meaning: '平衡，耐心，调和。在极端之间找到中庸之道。', color: '#74B9FF' },
    { id: 15, name: '恶魔', english: 'The Devil', meaning: '束缚，欲望，阴影。是时候面对内心的黑暗面了。', color: '#B33939' },
    { id: 16, name: '塔', english: 'The Tower', meaning: '突变，觉醒，解放。打破旧有结构迎接重建。', color: '#E84118' },
    { id: 17, name: '星星', english: 'The Star', meaning: '希望，灵感，宁静。黑暗过后的曙光已经降临。', color: '#00D2D3' },
    { id: 18, name: '月亮', english: 'The Moon', meaning: '幻觉，直觉，潜意识。穿越迷雾找到真相。', color: '#9B59B6' },
    { id: 19, name: '太阳', english: 'The Sun', meaning: '快乐，成功，活力。光明与温暖的祝福降临。', color: '#F39C12' },
    { id: 20, name: '审判', english: 'Judgement', meaning: '重生，召唤，反思。做出改变人生的重要决定。', color: '#8E44AD' },
    { id: 21, name: '世界', english: 'The World', meaning: '完成，整合，成就。一个周期的圆满结束。', color: '#27AE60' }
];

export class CardSystem {
    constructor(scene) {
        this.scene = scene;
        this.cards = [];
        this.cardGroup = new THREE.Group();
        this.selectedIndex = 10; // 从中间开始
        this.isSpread = false;
        this.drawnCard = null;
        this.cardWidth = 1.4;
        this.cardHeight = 2.4;
        this.cardDepth = 0.03;
        scene.add(this.cardGroup);
    }

    async createCards() {
        const backTexture = this.createCardBackTexture();
        for (let i = 0; i < MAJOR_ARCANA.length; i++) {
            const card = this.createSingleCard(i, backTexture);
            this.cards.push(card);
            this.cardGroup.add(card.mesh);
        }
        this.stackCards();
    }

    // 精美的卡背设计
    createCardBackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // 深邃的渐变背景
        const bgGradient = ctx.createRadialGradient(256, 384, 50, 256, 384, 400);
        bgGradient.addColorStop(0, '#4A148C');
        bgGradient.addColorStop(0.5, '#1A0033');
        bgGradient.addColorStop(1, '#0D001A');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, 512, 768);

        // 金色边框 - 双层
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 6;
        ctx.strokeRect(12, 12, 488, 744);
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.strokeRect(24, 24, 464, 720);

        // 中央神秘图案 - 复杂的几何图形
        ctx.save();
        ctx.translate(256, 384);

        // 外圈装饰
        for (let r = 0; r < 3; r++) {
            const radius = 140 - r * 35;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 - r * 0.2})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 星形图案 - 12角星
        ctx.beginPath();
        for (let i = 0; i < 24; i++) {
            const angle = (i * Math.PI) / 12;
            const radius = i % 2 === 0 ? 110 : 60;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
        ctx.fill();

        // 中心眼睛图案
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        const eyeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
        eyeGradient.addColorStop(0, '#FFD700');
        eyeGradient.addColorStop(0.5, '#B8860B');
        eyeGradient.addColorStop(1, '#4A148C');
        ctx.fillStyle = eyeGradient;
        ctx.fill();

        // 瞳孔
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#0D001A';
        ctx.fill();

        ctx.restore();

        // 四角装饰 - 精美的角花
        const corners = [[40, 40], [472, 40], [40, 728], [472, 728]];
        corners.forEach(([x, y], i) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((i * Math.PI) / 2);

            // 角花图案
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(20, 5, 25, 25);
            ctx.quadraticCurveTo(5, 20, 0, 0);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();
        });

        // 神秘符文装饰（上下）
        ctx.font = '24px serif';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('✧ ☽ ✦ ☀ ✧', 256, 60);
        ctx.fillText('✧ ☀ ✦ ☽ ✧', 256, 728);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        return texture;
    }

    // 精美的卡面设计
    createCardFrontTexture(cardData) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // 主题色背景渐变
        const baseColor = cardData.color || '#FFD700';
        const bgGradient = ctx.createLinearGradient(0, 0, 0, 768);
        bgGradient.addColorStop(0, '#F8F0E3');
        bgGradient.addColorStop(0.3, '#FFF8DC');
        bgGradient.addColorStop(0.7, '#F5DEB3');
        bgGradient.addColorStop(1, '#DEB887');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, 512, 768);

        // 卡牌边框 - 渐变金边
        const borderGradient = ctx.createLinearGradient(0, 0, 512, 768);
        borderGradient.addColorStop(0, '#FFD700');
        borderGradient.addColorStop(0.5, '#FFA500');
        borderGradient.addColorStop(1, '#FFD700');
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 8;
        ctx.strokeRect(8, 8, 496, 752);

        // 内边框
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, 472, 728);

        // 罗马数字编号
        const roman = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
        ctx.font = 'bold 42px "Cinzel", serif';
        ctx.fillStyle = '#2C1810';
        ctx.textAlign = 'center';
        ctx.fillText(roman[cardData.id], 256, 70);

        // 主图案区域背景
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(50, 100, 412, 420, 15);
        ctx.clip();

        // 主题色渐变背景
        const symbolGradient = ctx.createRadialGradient(256, 310, 50, 256, 310, 250);
        symbolGradient.addColorStop(0, baseColor);
        symbolGradient.addColorStop(0.7, this.adjustColor(baseColor, -30));
        symbolGradient.addColorStop(1, this.adjustColor(baseColor, -60));
        ctx.fillStyle = symbolGradient;
        ctx.fillRect(50, 100, 412, 420);

        // 装饰性光效
        const lightGradient = ctx.createRadialGradient(256, 250, 0, 256, 250, 180);
        lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = lightGradient;
        ctx.fillRect(50, 100, 412, 420);

        ctx.restore();

        // 绘制大型符号
        this.drawLargeSymbol(ctx, cardData.id, 256, 310);

        // 卡牌名称 - 中文
        ctx.font = 'bold 48px "Noto Serif SC", serif';
        ctx.fillStyle = '#2C1810';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillText(cardData.name, 256, 590);

        // 英文名称
        ctx.font = '24px "Cinzel", serif';
        ctx.fillStyle = '#5D4037';
        ctx.shadowBlur = 0;
        ctx.fillText(cardData.english, 256, 630);

        // 底部装饰线
        ctx.beginPath();
        ctx.moveTo(80, 660);
        ctx.lineTo(180, 660);
        ctx.moveTo(332, 660);
        ctx.lineTo(432, 660);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 装饰星号
        ctx.font = '20px serif';
        ctx.fillStyle = baseColor;
        ctx.fillText('✦', 256, 665);

        // 底部装饰符号
        ctx.font = '28px serif';
        ctx.fillText('☽ ✧ ☀', 256, 720);

        if (!cardData.imageUrl) {
            cardData.imageUrl = canvas.toDataURL('image/png');
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        return texture;
    }

    // 绘制大型符号
    drawLargeSymbol(ctx, id, cx, cy) {
        ctx.save();
        ctx.translate(cx, cy);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.font = '160px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const symbols = ['∞', '⚡', '☽', '♕', '♔', '✝', '❤', '⚔', '🦁', '🔮', '☸', '⚖', '🔱', '💀', '☯', '👿', '🗼', '⭐', '🌙', '☀', '📯', '🌍'];
        const symbol = symbols[id] || '✦';

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(symbol, 0, 0);

        ctx.restore();
    }

    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `rgb(${r}, ${g}, ${b})`;
    }

    createSingleCard(index, backTexture) {
        const cardData = MAJOR_ARCANA[index];
        const frontTexture = this.createCardFrontTexture(cardData);
        const geometry = new THREE.BoxGeometry(this.cardWidth, this.cardHeight, this.cardDepth);

        // 更好的材质
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xB8860B, metalness: 0.6, roughness: 0.3 }),
            new THREE.MeshStandardMaterial({ color: 0xB8860B, metalness: 0.6, roughness: 0.3 }),
            new THREE.MeshStandardMaterial({ color: 0xB8860B, metalness: 0.6, roughness: 0.3 }),
            new THREE.MeshStandardMaterial({ color: 0xB8860B, metalness: 0.6, roughness: 0.3 }),
            new THREE.MeshStandardMaterial({ map: frontTexture, metalness: 0.1, roughness: 0.5 }),
            new THREE.MeshStandardMaterial({ map: backTexture, metalness: 0.1, roughness: 0.5 })
        ];

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // 卡牌初始状态：竖立，背面朝向观众
        mesh.rotation.set(0, Math.PI, 0);

        return { mesh, data: cardData, index, isFlipped: false, originalPosition: new THREE.Vector3(), originalRotation: new THREE.Euler() };
    }

    stackCards() {
        this.isSpread = false;

        // 重置cardGroup位置到原点（中央）
        gsap.to(this.cardGroup.position, { x: 0, y: 0, z: 0, duration: 0.5, ease: 'power2.out' });

        this.cards.forEach((card, index) => {
            // 先杀死所有现有动画
            gsap.killTweensOf(card.mesh.position);
            gsap.killTweensOf(card.mesh.rotation);
            gsap.killTweensOf(card.mesh.scale);

            // 收起时：卡牌堆叠在中央，微微躺平显示卡堆效果
            gsap.to(card.mesh.position, { x: 0, y: 0.5, z: index * 0.008, duration: 0.5, ease: 'power2.out' });
            gsap.to(card.mesh.rotation, { x: -0.3, y: Math.PI, z: 0, duration: 0.5, ease: 'power2.out' });
            gsap.to(card.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
        });
    }

    // 新的展开方式 - 空中悬浮水平排列
    spreadCards() {
        this.isSpread = true;
        const totalCards = this.cards.length;
        const spacing = 1.6; // 增大卡牌间距，避免穿模
        const totalWidth = (totalCards - 1) * spacing;
        const startX = -totalWidth / 2;

        this.cards.forEach((card, index) => {
            // 先杀死所有现有动画
            gsap.killTweensOf(card.mesh.position);
            gsap.killTweensOf(card.mesh.rotation);
            gsap.killTweensOf(card.mesh.scale);

            const x = startX + index * spacing;
            const y = 1.5; // 所有卡牌同一高度
            const z = 0;   // 所有卡牌同一深度

            card.originalPosition.set(x, y, z);
            card.originalRotation.set(0, Math.PI, 0);

            // 动画位置和旋转到竖立状态
            gsap.to(card.mesh.position, {
                x,
                y,
                z,
                duration: 0.5,
                ease: 'power2.out'
            });

            gsap.to(card.mesh.rotation, {
                x: 0,
                y: Math.PI,
                z: 0,
                duration: 0.4,
                ease: 'power2.out'
            });

            gsap.to(card.mesh.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 0.3
            });
        });

        // 延迟一下再高亮
        setTimeout(() => this.highlightCard(this.selectedIndex), 600);
    }

    startFloatingAnimation() {
        this.cards.forEach((card, index) => {
            const floatTween = gsap.to(card.mesh.position, {
                y: card.originalPosition.y + 0.1,
                duration: 1.5 + Math.random() * 0.5,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
                delay: index * 0.1
            });
            card.floatTween = floatTween;
        });
    }

    stopFloatingAnimation() {
        this.cards.forEach(card => {
            if (card.floatTween) {
                card.floatTween.kill();
                card.floatTween = null;
            }
        });
    }

    selectCard(direction) {
        if (!this.isSpread) return;
        const previousIndex = this.selectedIndex;

        if (direction === 'left') {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        } else if (direction === 'right') {
            this.selectedIndex = Math.min(this.cards.length - 1, this.selectedIndex + 1);
        }

        if (previousIndex !== this.selectedIndex) {
            this.unhighlightCard(previousIndex);
            this.highlightCard(this.selectedIndex);

            // 移动摄像机视角跟随选中的卡牌
            this.focusOnSelectedCard();
        }
    }

    focusOnSelectedCard() {
        const card = this.cards[this.selectedIndex];
        if (!card) return;

        // 让所有卡牌向左或右偏移，使选中的卡牌在中央
        const targetOffset = -card.originalPosition.x;

        gsap.to(this.cardGroup.position, {
            x: targetOffset,
            duration: 0.4,
            ease: 'power2.out'
        });
    }

    highlightCard(index) {
        const card = this.cards[index];
        if (!card) return;

        // 杀死所有现有动画
        gsap.killTweensOf(card.mesh.position);
        gsap.killTweensOf(card.mesh.scale);
        gsap.killTweensOf(card.mesh.rotation);

        // 选中效果 - 前移并放大，确保位置和旋转正确
        gsap.to(card.mesh.position, {
            x: card.originalPosition.x,
            y: card.originalPosition.y,
            z: 1.5,
            duration: 0.2,
            ease: 'power2.out'
        });

        // 确保卡牌竖直
        gsap.to(card.mesh.rotation, {
            x: 0,
            y: Math.PI,
            z: 0,
            duration: 0.2,
            ease: 'power2.out'
        });

        gsap.to(card.mesh.scale, {
            x: 1.3,
            y: 1.3,
            z: 1.3,
            duration: 0.2,
            ease: 'power2.out'
        });
    }

    unhighlightCard(index) {
        const card = this.cards[index];
        if (!card) return;

        // 杀死所有现有动画
        gsap.killTweensOf(card.mesh.position);
        gsap.killTweensOf(card.mesh.scale);
        gsap.killTweensOf(card.mesh.rotation);

        // 恢复原位置 - 确保x, y, z都正确
        gsap.to(card.mesh.position, {
            x: card.originalPosition.x,
            y: card.originalPosition.y,
            z: 0,
            duration: 0.15,
            ease: 'power2.out'
        });

        // 确保卡牌竖直
        gsap.to(card.mesh.rotation, {
            x: 0,
            y: Math.PI,
            z: 0,
            duration: 0.15,
            ease: 'power2.out'
        });

        gsap.to(card.mesh.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.15,
            ease: 'power2.out'
        });
    }

    grabCard() {
        const card = this.cards[this.selectedIndex];
        if (!card) return;

        gsap.to(card.mesh.position, { z: 2.5, duration: 0.2, ease: 'power2.out' });
        gsap.to(card.mesh.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.2, ease: 'power2.out' });
    }

    releaseCard() {
        this.highlightCard(this.selectedIndex);
    }

    async drawCard() {
        const card = this.cards[this.selectedIndex];
        if (!card) return null;
        this.drawnCard = card;

        this.stopFloatingAnimation();

        // 其他卡牌消散
        this.cards.forEach((c, i) => {
            if (i !== this.selectedIndex) {
                gsap.to(c.mesh.position, { y: -5, z: -10, duration: 0.8, ease: 'power2.in', delay: Math.abs(i - this.selectedIndex) * 0.02 });
                gsap.to(c.mesh.rotation, { x: Math.random() - 0.5, y: Math.random() * Math.PI, duration: 0.8 });
            }
        });

        // 重置卡组位置
        gsap.to(this.cardGroup.position, { x: 0, duration: 0.5 });

        // 选中的卡飞到屏幕中央
        await gsap.to(card.mesh.position, { x: 0, y: 1.5, z: 4, duration: 1, ease: 'power3.out' });

        return card.data;
    }

    async flipCard() {
        if (!this.drawnCard) return;

        // 翻牌动画 - 从y=PI(背面)翻到y=0(正面)
        const tl = gsap.timeline();
        tl.to(this.drawnCard.mesh.rotation, { y: Math.PI / 2, duration: 0.4, ease: 'power2.in' })
            .to(this.drawnCard.mesh.scale, { x: 1.5, y: 1.5, duration: 0.2 }, '<')
            .to(this.drawnCard.mesh.rotation, { y: 0, duration: 0.4, ease: 'power2.out' })
            .to(this.drawnCard.mesh.scale, { x: 1.3, y: 1.3, duration: 0.3 }, '<0.2');

        await tl;
        this.drawnCard.isFlipped = true;
        return this.drawnCard.data;
    }

    reset() {
        this.stopFloatingAnimation();
        this.drawnCard = null;
        this.selectedIndex = Math.floor(this.cards.length / 2);
        gsap.to(this.cardGroup.position, { x: 0, y: 0, z: 0, duration: 0.3 });

        this.cards.forEach(card => {
            card.isFlipped = false;
            gsap.set(card.mesh.scale, { x: 1, y: 1, z: 1 });
        });
        this.stackCards();
    }

    getSelectedCard() { return this.cards[this.selectedIndex]?.data || null; }
    getIsSpread() { return this.isSpread; }
}

export { MAJOR_ARCANA };
