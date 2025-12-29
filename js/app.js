/**
 * app.js - 主程序入口 (优化版)
 * 改进：使用手部位置直接映射卡牌选择，更灵敏
 */

import { SceneManager } from './scene.js';
import { CardSystem } from './cards.js';
import { GestureRecognizer } from './gesture.js';
import { AnimationController } from './animations.js';

class TarotApp {
    constructor() {
        this.sceneManager = null;
        this.cardSystem = null;
        this.gestureRecognizer = null;
        this.animationController = null;

        this.state = 'IDLE';
        this.isProcessing = false;
        this.revealedCardData = null;
    }

    async init() {
        try {
            this.sceneManager = new SceneManager();
            this.sceneManager.init();

            this.animationController = new AnimationController(this.sceneManager.getScene());

            this.cardSystem = new CardSystem(this.sceneManager.getScene());
            await this.cardSystem.createCards();

            this.gestureRecognizer = new GestureRecognizer();
            await this.gestureRecognizer.init();

            this.setupGestureCallbacks();
            this.setupUIEvents();

            this.animationController.hideLoading();
            this.animationController.showStateIndicator('🎴', '准备就绪 - 张开手掌开始');

            console.log('Tarot App initialized!');
        } catch (error) {
            console.error('Init failed:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }

    setupGestureCallbacks() {
        this.gestureRecognizer.onGestureChange = (gesture, prev) => {
            if (this.isProcessing) return;
            this.animationController.updateGestureHint(gesture);

            switch (gesture) {
                case 'open':
                    this.handleOpenGesture();
                    break;
                case 'closed':
                    this.handleCloseGesture();
                    break;
                case 'thumbsup':
                    // 竖大拇指选牌 - 通过回调处理
                    break;
            }
        };

        // 位置更新回调 - 用手的位置选择卡牌
        this.gestureRecognizer.onPositionUpdate = (normalizedX) => {
            if (this.isProcessing) return;
            if (this.state === 'SPREAD' || this.state === 'SELECTING') {
                this.handlePositionUpdate(normalizedX);
            }
        };

        // 竖大拇指回调 - 选择当前卡牌并抽牌
        this.gestureRecognizer.onThumbsUp = () => {
            if (this.isProcessing) return;
            this.handleThumbsUp();
        };

        this.gestureRecognizer.onOkGesture = () => {
            if (this.isProcessing) return;
            this.handleOkGesture();
        };

        // 边缘滚动回调
        this.gestureRecognizer.onEdgeScroll = (direction) => {
            if (this.isProcessing) return;
            if (this.state === 'SPREAD' || this.state === 'SELECTING') {
                this.handleEdgeScroll(direction);
            }
        };
    }

    setupUIEvents() {
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.resetForNewReading());
        }

        const closeBtn = document.getElementById('close-info');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.resetForNewReading());
        }

        // 键盘控制 (调试用)
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') {
                // 展开卡牌
                this.cardSystem.spreadCards();
                this.state = 'SPREAD';
            } else if (e.key === '2') {
                // 收起卡牌
                this.cardSystem.stackCards();
                this.state = 'IDLE';
            } else if (e.key === 'ArrowLeft') {
                // 向左选择
                if (this.cardSystem.selectedIndex > 0) {
                    this.cardSystem.unhighlightCard(this.cardSystem.selectedIndex);
                    this.cardSystem.selectedIndex--;
                    this.cardSystem.highlightCard(this.cardSystem.selectedIndex);
                    this.cardSystem.focusOnSelectedCard();
                }
            } else if (e.key === 'ArrowRight') {
                // 向右选择
                if (this.cardSystem.selectedIndex < this.cardSystem.cards.length - 1) {
                    this.cardSystem.unhighlightCard(this.cardSystem.selectedIndex);
                    this.cardSystem.selectedIndex++;
                    this.cardSystem.highlightCard(this.cardSystem.selectedIndex);
                    this.cardSystem.focusOnSelectedCard();
                }
            }
        });
    }

    handleOpenGesture() {
        if (this.state === 'IDLE' || this.state === 'SPREAD') {
            if (!this.cardSystem.getIsSpread()) {
                this.state = 'SPREAD';
                this.cardSystem.spreadCards();
                this.animationController.showStateIndicator('🖐️', '移动手掌选择卡牌');
            }
        }
    }

    handleCloseGesture() {
        if (this.state === 'SPREAD' || this.state === 'SELECTING') {
            this.state = 'IDLE';
            this.cardSystem.stackCards();
            this.animationController.showStateIndicator('✊', '牌已收起');
        }
    }

    // 新的位置更新处理 - 手的位置直接映射到卡牌
    handlePositionUpdate(normalizedX) {
        if (!this.cardSystem.getIsSpread()) return;

        this.state = 'SELECTING';
        const totalCards = this.cardSystem.cards.length;

        // 将手的位置(0-1)映射到卡牌索引(0-21)
        const targetIndex = Math.floor(normalizedX * totalCards);
        const clampedIndex = Math.max(0, Math.min(totalCards - 1, targetIndex));

        if (clampedIndex !== this.cardSystem.selectedIndex) {
            this.cardSystem.unhighlightCard(this.cardSystem.selectedIndex);
            this.cardSystem.selectedIndex = clampedIndex;
            this.cardSystem.highlightCard(clampedIndex);
            this.cardSystem.focusOnSelectedCard();
        }
    }

    // 边缘滚动处理 - 每次调用向左或右移动一张卡
    handleEdgeScroll(direction) {
        if (!this.cardSystem.getIsSpread()) return;

        this.state = 'SELECTING';
        const totalCards = this.cardSystem.cards.length;
        const currentIndex = this.cardSystem.selectedIndex;
        let newIndex = currentIndex;

        if (direction === 'left' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (direction === 'right' && currentIndex < totalCards - 1) {
            newIndex = currentIndex + 1;
        }

        if (newIndex !== currentIndex) {
            this.cardSystem.unhighlightCard(currentIndex);
            this.cardSystem.selectedIndex = newIndex;
            this.cardSystem.highlightCard(newIndex);
            this.cardSystem.focusOnSelectedCard();
        }
    }

    // 竖大拇指 - 直接抽取当前选中的卡牌
    async handleThumbsUp() {
        if (this.state === 'SPREAD' || this.state === 'SELECTING') {
            this.isProcessing = true;
            this.state = 'DRAWING';
            this.animationController.showStateIndicator('👍', '抽取卡牌...');

            const cardData = await this.cardSystem.drawCard();

            if (cardData) {
                const card = this.cardSystem.cards[this.cardSystem.selectedIndex];
                if (card) {
                    this.animationController.createDrawParticles(card.mesh.position.clone());
                }

                await new Promise(r => setTimeout(r, 800));

                this.animationController.showStateIndicator('✨', '翻开命运...');

                await this.cardSystem.flipCard();

                this.revealedCardData = cardData;
                this.state = 'REVEALED';

                await new Promise(r => setTimeout(r, 500));
                this.animationController.showStateIndicator('👌', '做OK手势查看解读');
            }

            this.isProcessing = false;
        }
    }

    handleOkGesture() {
        if (this.state === 'REVEALED' && this.revealedCardData) {
            this.state = 'SHOWING_INFO';
            this.animationController.showCardInfo(this.revealedCardData);
            this.animationController.showStateIndicator('📖', '命运揭示');
        }
    }

    resetForNewReading() {
        this.animationController.hideCardInfo();
        this.state = 'IDLE';
        this.revealedCardData = null;
        this.cardSystem.reset();
        this.animationController.showStateIndicator('🎴', '准备新一轮占卜');
    }

    showError(message) {
        const loading = document.getElementById('loading-overlay');
        const loader = loading.querySelector('.loader');
        if (loader) {
            loader.innerHTML = `<p style="color:#ff6666;">${message}</p>`;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const app = new TarotApp();
    window.tarotApp = app; // 暴露给window方便调试
    app.init();
});
