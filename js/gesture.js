/**
 * gesture.js - 手势识别模块 (v6 - 优化增强版)
 * 改进手指状态检测、手势判定逻辑和稳定性
 */

export class GestureRecognizer {
    constructor(debugMode = false) {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.isInitialized = false;

        this.currentGesture = 'none';
        this.previousGesture = 'none';
        this.handPosition = { x: 0.5, y: 0.5 };

        // 回调函数
        this.onGestureChange = null;
        this.onThumbsUp = null;      // 竖食指回调 (替代捏合)
        this.onOkGesture = null;
        this.onPositionUpdate = null;
        this.onEdgeScroll = null;

        this.lastGestureTime = 0;
        this.gestureDelay = 400; // 增加延迟防止误触发

        // 边缘滚动
        this.edgeScrollTimer = null;
        this.edgeScrollDirection = null;
        this.edgeScrollInterval = 200;
        this.edgeThreshold = 0.18;

        // 稳定识别
        this.gestureHistory = [];
        this.gestureHistorySize = 6;
        this.gestureStableMin = 4;

        // 调试模式
        this.debugMode = debugMode;
        this.debugInfo = {
            rawGesture: 'none',
            stableGesture: 'none',
            fingerStates: null,
            confidence: 0
        };
    }

    async init() {
        this.videoElement = document.getElementById('camera-feed');
        this.canvasElement = document.getElementById('camera-canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');

        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.onResults(results));

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
        this.updateStatus(true, '手势识别已启动');
        this.isInitialized = true;
    }

    onResults(results) {
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this.drawHand(landmarks);
            this.analyzeGesture(landmarks);
        }

        this.canvasCtx.restore();
    }

    drawHand(landmarks) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];

        this.canvasCtx.strokeStyle = '#D4AF37';
        this.canvasCtx.lineWidth = 2;

        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(startPoint.x * this.canvasElement.width, startPoint.y * this.canvasElement.height);
            this.canvasCtx.lineTo(endPoint.x * this.canvasElement.width, endPoint.y * this.canvasElement.height);
            this.canvasCtx.stroke();
        });

        landmarks.forEach((point, index) => {
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(
                point.x * this.canvasElement.width,
                point.y * this.canvasElement.height,
                index === 4 ? 10 : 4, // 大拇指指尖高亮更大
                0, 2 * Math.PI
            );
            this.canvasCtx.fillStyle = index === 4 ? '#00FF00' : '#D4AF37';
            this.canvasCtx.fill();
        });
    }

    analyzeGesture(landmarks) {
        const now = Date.now();

        // 更新手位置 (用手掌中心)
        const palmCenter = landmarks[9];
        this.handPosition = { x: palmCenter.x, y: palmCenter.y };

        const rawGesture = this.classifyGesture(landmarks);
        const stableGesture = this.pushAndGetStableGesture(rawGesture);
        const newGesture = stableGesture || rawGesture;

        // 调试信息记录
        if (this.debugMode) {
            this.debugInfo.rawGesture = rawGesture;
            this.debugInfo.stableGesture = stableGesture || rawGesture;
            const palmScale = this.getPalmScale(landmarks);
            this.debugInfo.fingerStates = this.getFingerStates(landmarks, palmScale);

            // 计算置信度
            const counts = {};
            for (const g of this.gestureHistory) {
                counts[g] = (counts[g] || 0) + 1;
            }
            this.debugInfo.confidence = (counts[rawGesture] || 0) / this.gestureHistory.length;
        }

        if (newGesture === 'closed') {
            this.stopEdgeScroll();
        } else if (newGesture === 'thumbsup') {
            this.stopEdgeScroll();
            if (this.currentGesture !== 'thumbsup' && this.onThumbsUp && now - this.lastGestureTime > this.gestureDelay) {
                this.onThumbsUp();
                this.lastGestureTime = now;
            }
        } else if (newGesture === 'ok') {
            this.stopEdgeScroll();
            if (this.currentGesture !== 'ok' && this.onOkGesture && now - this.lastGestureTime > this.gestureDelay) {
                this.onOkGesture();
                this.lastGestureTime = now;
            }
        } else if (newGesture === 'open') {
            // 用手的位置选择卡牌
            const normalizedX = 1 - this.handPosition.x; // 镜像翻转

            if (normalizedX < this.edgeThreshold) {
                this.startEdgeScroll('left');
            } else if (normalizedX > 1 - this.edgeThreshold) {
                this.startEdgeScroll('right');
            } else {
                this.stopEdgeScroll();
                if (this.onPositionUpdate) {
                    this.onPositionUpdate(normalizedX);
                }
            }
        } else {
            this.stopEdgeScroll();
        }

        // 手势变化
        if (newGesture !== this.currentGesture) {
            this.previousGesture = this.currentGesture;
            this.currentGesture = newGesture;
            if (this.onGestureChange && now - this.lastGestureTime > this.gestureDelay) {
                this.onGestureChange(newGesture, this.previousGesture);
                this.lastGestureTime = now;
            }
        }
    }

    classifyGesture(landmarks) {
        const palmScale = this.getPalmScale(landmarks);
        const states = this.getFingerStates(landmarks, palmScale);
        const isOpen = this.isHandOpenGesture(states);
        const isClosed = this.isHandClosedGesture(states);

        if (this.isOkGesture(states, landmarks, palmScale)) return 'ok';
        if (this.isIndexUpGesture(states, landmarks, palmScale)) return 'thumbsup';
        if (isOpen && !isClosed) return 'open';
        if (isClosed && !isOpen) return 'closed';
        if (isOpen && isClosed) {
            return states.openScore >= states.closedScore ? 'open' : 'closed';
        }
        return 'none';
    }

    pushAndGetStableGesture(gesture) {
        this.gestureHistory.push(gesture);
        if (this.gestureHistory.length > this.gestureHistorySize) {
            this.gestureHistory.shift();
        }

        const counts = {};
        for (const g of this.gestureHistory) {
            counts[g] = (counts[g] || 0) + 1;
        }

        let topGesture = null;
        let topCount = 0;
        for (const [g, c] of Object.entries(counts)) {
            if (c > topCount) {
                topCount = c;
                topGesture = g;
            }
        }

        return topCount >= this.gestureStableMin ? topGesture : null;
    }

    getFingerStates(landmarks, palmScale) {
        const wrist = landmarks[0];
        const fingers = {
            index: { mcp: 5, pip: 6, dip: 7, tip: 8 },
            middle: { mcp: 9, pip: 10, dip: 11, tip: 12 },
            ring: { mcp: 13, pip: 14, dip: 15, tip: 16 },
            pinky: { mcp: 17, pip: 18, dip: 19, tip: 20 }
        };

        const states = {};
        let extendedCount = 0;
        let curledCount = 0;
        let foldedCount = 0;
        const openRatios = [];
        const extensionScores = [];

        // 优化：使用更精确的手指伸展/卷曲检测
        for (const [name, f] of Object.entries(fingers)) {
            const mcp = landmarks[f.mcp];
            const pip = landmarks[f.pip];
            const dip = landmarks[f.dip];
            const tip = landmarks[f.tip];

            // 3D角度更准确
            const pipAngle = this.angle(mcp, pip, dip);
            const dipAngle = this.angle(pip, dip, tip);
            const avgAngle = (pipAngle + dipAngle) / 2;

            // 距离测量：指尖到手腕 vs 指关节到手腕
            const tipDist = this.distance3(tip, wrist);
            const mcpDist = this.distance3(mcp, wrist);
            const pipDist = this.distance3(pip, wrist);
            const extensionGap = tipDist - mcpDist;

            // 指尖到掌心的距离
            const tipPalmDist = this.distance3(tip, landmarks[9]);
            const mcpPalmDist = this.distance3(mcp, landmarks[9]);

            // 垂直方向伸展检测
            const yExtension = wrist.y - tip.y;
            const yExtensionNorm = yExtension / palmScale;

            // 综合伸展分数 (0-1)
            let extScore = 0;
            if (avgAngle > 155) extScore += 0.4;
            else if (avgAngle > 140) extScore += 0.2;
            else if (avgAngle < 110) extScore -= 0.3;

            if (extensionGap > palmScale * 0.08) extScore += 0.3;
            else if (extensionGap < palmScale * 0.02) extScore -= 0.2;

            if (yExtensionNorm > 0.15) extScore += 0.3;
            else if (yExtensionNorm < 0.05) extScore -= 0.2;

            extensionScores.push(extScore);

            const extended = extScore >= 0.5;
            const curled = extScore <= -0.2;

            states[name] = {
                extended,
                curled,
                extensionScore: extScore,
                tipPalmRatio: tipPalmDist / Math.max(mcpPalmDist, 1e-6)
            };

            if (extended) extendedCount++;
            if (curled) curledCount++;
            if (tipPalmDist < mcpPalmDist + palmScale * 0.01) foldedCount++;
            openRatios.push(states[name].tipPalmRatio);
        }

        // 优化拇指检测
        const thumbMcp = landmarks[2];
        const thumbIp = landmarks[3];
        const thumbTip = landmarks[4];
        const thumbAngle = this.angle(thumbMcp, thumbIp, thumbTip);
        const thumbTipDist = this.distance3(thumbTip, wrist);
        const thumbMcpDist = this.distance3(thumbMcp, wrist);
        const thumbGap = thumbTipDist - thumbMcpDist;

        // 拇指向外伸展的判断更精确
        const thumbExtScore = ((thumbAngle > 150) ? 0.5 : (thumbAngle < 120 ? -0.3 : 0)) +
                             ((thumbGap > palmScale * 0.05) ? 0.5 : (thumbGap < palmScale * 0.015 ? -0.3 : 0));

        const thumbExtended = thumbExtScore >= 0.5;
        const thumbCurled = thumbExtScore <= -0.3;

        states.thumb = { extended: thumbExtended, curled: thumbCurled, extensionScore: thumbExtScore };
        states.extendedCount = extendedCount;
        states.curledCount = curledCount;
        states.foldedCount = foldedCount;
        states.openRatioAvg = openRatios.reduce((sum, v) => sum + v, 0) / Math.max(openRatios.length, 1);
        states.openRatioMin = Math.min(...openRatios);
        states.openRatioMax = Math.max(...openRatios);
        states.extensionScores = extensionScores;
        states.avgExtensionScore = extensionScores.reduce((sum, v) => sum + v, 0) / Math.max(extensionScores.length, 1);

        // 改进分数计算
        states.openScore = extendedCount + (thumbExtended ? 0.6 : 0) + states.avgExtensionScore * 0.5;
        states.closedScore = curledCount + (thumbCurled ? 0.6 : 0) - states.avgExtensionScore * 0.3;

        return states;
    }

    isHandOpenGesture(states) {
        // 张开手势：至少3-4根手指伸展
        const openByCount = states.extendedCount >= 3;

        // 核心手指（食指、中指）都伸展
        const coreExtended = states.index.extended && states.middle.extended;

        // 伸展分数较高
        const highExtensionScore = states.avgExtensionScore > 0.2;

        // 比率较高（手指远离手掌）
        const highRatio = states.openRatioAvg > 1.15;

        // 卷曲的手指不超过2个
        const fewCurled = states.curledCount <= 2;

        // 综合判定 - 使用计分制
        let score = 0;
        if (states.extendedCount >= 4) score += 2;
        else if (states.extendedCount >= 3) score += 1;

        if (coreExtended) score += 1;
        if (highExtensionScore) score += 1;
        if (highRatio) score += 1;
        if (fewCurled) score += 1;

        return score >= 4;
    }

    isHandClosedGesture(states) {
        // 握拳手势：主要判断依据
        // 1. 没有手指明确伸展（或最多1个）
        const fewExtended = states.extendedCount <= 1;

        // 2. 至少3根手指卷曲或折叠
        const curledOrFolded = states.curledCount >= 2 || states.foldedCount >= 3;

        // 3. 手指都接近手掌（比率低）
        const closedByRatio = states.openRatioAvg < 1.08;

        // 4. 伸展分数低（表示手指没有伸展）
        const lowExtensionScore = states.avgExtensionScore < 0.1;

        // 5. 核心手指（食指、中指）至少有一个不伸展
        const coreNotExtended = !states.index.extended || !states.middle.extended;

        // 放宽条件：满足多个条件中的大部分即可
        const satisfiedConditions =
            (fewExtended ? 1 : 0) +
            (curledOrFolded ? 1 : 0) +
            (closedByRatio ? 1 : 0) +
            (lowExtensionScore ? 1 : 0) +
            (coreNotExtended ? 1 : 0);

        return satisfiedConditions >= 3;
    }

    isIndexUpGesture(states, landmarks, palmScale) {
        // 基本条件：食指必须伸展，其他手指必须卷曲
        if (!states.index.extended || states.index.extensionScore < 0.6) return false;
        if (states.middle.extended || states.ring.extended || states.pinky.extended) return false;

        // 至少2个其他手指明确卷曲
        if (states.curledCount < 2) return false;

        const wrist = landmarks[0];
        const indexTip = landmarks[8];
        const indexMcp = landmarks[5];
        const indexPip = landmarks[6];
        const thumbTip = landmarks[4];
        const middleTip = landmarks[12];

        // 1. 垂直度检测：食指应该明显向上
        const indexUpVector = this.normalize(this.vector(indexTip, indexMcp), { x: 0, y: -1, z: 0 });
        const verticalScore = -indexUpVector.y; // 负号因为y坐标向下为正

        // 2. 食指明显高于其他手指
        const indexMuchHigher = indexTip.y < middleTip.y - palmScale * 0.08;
        const indexAboveThumb = !states.thumb.extended || indexTip.y < thumbTip.y - palmScale * 0.03;

        // 3. 食指直线度检测：PIP关节应该接近直线
        const indexStraightness = this.angle(landmarks[5], landmarks[6], landmarks[7]);
        const indexIsStraight = indexStraightness > 160;

        // 4. 食指相对于手腕和MCP的高度
        const indexAboveMcp = indexTip.y < indexMcp.y - palmScale * 0.06;
        const indexAboveWrist = indexTip.y < wrist.y - palmScale * 0.10;

        // 5. 检查食指是否真正伸展（距离）
        const indexLen = this.distance3(indexTip, indexMcp);
        const expectedIndexLen = palmScale * 0.45;
        const indexLongEnough = indexLen > expectedIndexLen * 0.7;

        // 综合判定
        const verticalCheck = verticalScore > 0.65;
        const heightCheck = indexMuchHigher && indexAboveThumb && indexAboveMcp && indexAboveWrist;
        const structureCheck = indexIsStraight && indexLongEnough;

        return verticalCheck && heightCheck && structureCheck;
    }

    isOkGesture(states, landmarks, palmScale) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const indexMcp = landmarks[5];
        const thumbMcp = landmarks[2];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        // 1. 检测拇指和食指的捏合距离（放宽范围）
        const pinchDist = this.distance3(thumbTip, indexTip);
        const pinchRatio = pinchDist / palmScale;

        // OK手势的捏合距离范围更宽松
        const pinchOk = pinchRatio > 0.02 && pinchRatio < 0.20;

        // 2. 拇指和食指相对接近（放宽条件）
        const thumbIndexHorizontalDist = Math.abs(thumbTip.x - indexTip.x);
        const thumbIndexVerticalDist = Math.abs(thumbTip.y - indexTip.y);
        const thumbIndexClose = thumbIndexHorizontalDist < palmScale * 0.15 &&
                               thumbIndexVerticalDist < palmScale * 0.15;

        // 3. 确保不是完全握拳（拇指和食指有一定伸展）
        const indexLen = this.distance3(indexTip, indexMcp);
        const thumbLen = this.distance3(thumbTip, thumbMcp);
        const indexTipDist = this.distance3(indexTip, wrist);
        const indexMcpDist = this.distance3(indexMcp, wrist);
        const notFist = indexLen > palmScale * 0.03 && indexTipDist > indexMcpDist;

        // 4. 其他手指状态 - 放宽条件
        const otherCount = (states.middle.extended ? 1 : 0) +
                          (states.ring.extended ? 1 : 0) +
                          (states.pinky.extended ? 1 : 0);

        // 至少1个其他手指伸展，或者不完全卷曲
        const othersOk = otherCount >= 1 || states.curledCount <= 3;

        // 5. 检查其他手指是否明显高于捏合点（避免误判握拳）
        const maxOtherTipY = Math.min(middleTip.y, ringTip.y, pinkyTip.y);
        const pinchY = (thumbTip.y + indexTip.y) / 2;
        const othersHigherOrLevel = maxOtherTipY <= pinchY + palmScale * 0.05;

        // 综合判定 - 使用计分制，降低门槛
        let score = 0;
        if (pinchOk) score += 2; // 捏合是最重要的
        if (thumbIndexClose) score += 1;
        if (notFist) score += 1;
        if (othersOk) score += 1;
        if (othersHigherOrLevel) score += 1;

        // 只需要4分以上就算OK手势
        return score >= 4;
    }

    getPalmScale(landmarks) {
        const palmWidth = this.distance2(landmarks[5], landmarks[17]);
        const palmHeight = this.distance2(landmarks[0], landmarks[9]);
        return Math.max(0.08, (palmWidth + palmHeight) / 2);
    }

    getPalmDirection(landmarks) {
        const wrist = landmarks[0];
        let dir = this.vector(landmarks[9], wrist);
        if (this.magnitude(dir) < 1e-6) {
            dir = this.vector(landmarks[12], wrist);
        }
        return this.normalize(dir, { x: 0, y: -1, z: 0 });
    }

    vector(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
    }

    magnitude(v) {
        return Math.hypot(v.x, v.y, v.z);
    }

    normalize(v, fallback) {
        const mag = this.magnitude(v);
        if (mag < 1e-6) return { ...fallback };
        return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
    }

    dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    projectedDistance(point, origin, dir) {
        const v = this.vector(point, origin);
        return this.dot(v, dir);
    }

    distance3(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
    }

    distance2(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    angle2D(a, b, c) {
        const v1 = { x: a.x - b.x, y: a.y - b.y };
        const v2 = { x: c.x - b.x, y: c.y - b.y };
        const mag1 = Math.hypot(v1.x, v1.y);
        const mag2 = Math.hypot(v2.x, v2.y);
        if (mag1 < 1e-6 || mag2 < 1e-6) return 180;
        const cos = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
        const clamped = Math.max(-1, Math.min(1, cos));
        return Math.acos(clamped) * (180 / Math.PI);
    }

    angle(a, b, c) {
        const v1 = this.vector(a, b);
        const v2 = this.vector(c, b);
        const mag1 = this.magnitude(v1);
        const mag2 = this.magnitude(v2);
        if (mag1 < 1e-6 || mag2 < 1e-6) return 180;
        const cos = this.dot(v1, v2) / (mag1 * mag2);
        const clamped = Math.max(-1, Math.min(1, cos));
        return Math.acos(clamped) * (180 / Math.PI);
    }

    startEdgeScroll(direction) {
        if (this.edgeScrollDirection === direction && this.edgeScrollTimer) {
            return;
        }

        this.stopEdgeScroll();
        this.edgeScrollDirection = direction;

        if (this.onEdgeScroll) {
            this.onEdgeScroll(direction);
        }

        this.edgeScrollTimer = setInterval(() => {
            if (this.onEdgeScroll) {
                this.onEdgeScroll(direction);
            }
        }, this.edgeScrollInterval);
    }

    stopEdgeScroll() {
        if (this.edgeScrollTimer) {
            clearInterval(this.edgeScrollTimer);
            this.edgeScrollTimer = null;
        }
        this.edgeScrollDirection = null;
    }

    updateStatus(active, text) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('status-text');
        if (statusDot) statusDot.classList.toggle('active', active);
        if (statusText && text) statusText.textContent = text;
    }

    getCurrentGesture() { return this.currentGesture; }
    getHandPosition() { return this.handPosition; }

    // 获取调试信息
    getDebugInfo() {
        if (!this.debugMode) {
            console.warn('Debug mode is not enabled. Enable it with constructor parameter: new GestureRecognizer(true)');
        }
        return {
            ...this.debugInfo,
            currentGesture: this.currentGesture,
            previousGesture: this.previousGesture,
            history: [...this.gestureHistory]
        };
    }

    // 设置调试模式
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    dispose() {
        this.stopEdgeScroll();
        if (this.camera) this.camera.stop();
    }
}
