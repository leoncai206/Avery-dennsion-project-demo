/**
 * 多目标生产排程优化器
 *
 * 优化目标：
 * 1. 能耗成本最小化 (权重35%)
 * 2. 准时交付最大化 (权重45%)
 * 3. 换产时间最小化 (权重20%)
 */

// ==================== 数据定义 ====================

const PRODUCTS = [
    {id: "T001", name: "标准条码标签", type: "label", series: "coated-paper", temp: 98, energyFactor: 1.00, speed: 120, quantity: 800, dueDate: "2024-07-03", priority: "normal", batches: 2},
    {id: "T002", name: "服装吊牌", type: "label", series: "coated-paper", temp: 98, energyFactor: 1.00, speed: 120, quantity: 950, dueDate: "2024-07-05", priority: "normal", batches: 2},
    {id: "T003", name: "高温标签", type: "label", series: "adhesive", temp: 130, energyFactor: 2.00, speed: 60, quantity: 720, dueDate: "2024-07-08", priority: "normal", batches: 2},
    {id: "T004", name: "物流标签", type: "label", series: "coated-paper", temp: 103, energyFactor: 1.13, speed: 110, quantity: 1100, dueDate: "2024-07-06", priority: "normal", batches: 3},
    {id: "T005", name: "价签标签", type: "label", series: "coated-paper", temp: 98, energyFactor: 1.00, speed: 120, quantity: 850, dueDate: "2024-07-07", priority: "normal", batches: 2},
    {id: "T006", name: "透明车身膜", type: "film", series: "wrap", temp: 75, energyFactor: 1.25, speed: 100, quantity: 580, dueDate: "2024-07-10", priority: "normal", batches: 2},
    {id: "T007", name: "彩色车身膜", type: "film", series: "wrap", temp: 80, energyFactor: 1.38, speed: 90, quantity: 620, dueDate: "2024-07-10", priority: "normal", batches: 2},
    {id: "T008", name: "车身广告膜", type: "film", series: "wrap", temp: 82, energyFactor: 1.31, speed: 85, quantity: 600, dueDate: "2024-07-12", priority: "normal", batches: 2},
    {id: "T009", name: "低温标签", type: "label", series: "adhesive", temp: 88, energyFactor: 0.88, speed: 100, quantity: 700, dueDate: "2024-07-09", priority: "normal", batches: 2},
    {id: "T010", name: "POS标签", type: "label", series: "standard", temp: 100, energyFactor: 1.06, speed: 115, quantity: 900, dueDate: "2024-07-08", priority: "normal", batches: 2},
    {id: "T011", name: "加急条码标签", type: "label", series: "coated-paper", temp: 98, energyFactor: 1.00, speed: 120, quantity: 800, dueDate: "2024-07-03", priority: "rush", batches: 2},
    {id: "T012", name: "加急服装吊牌", type: "label", series: "coated-paper", temp: 98, energyFactor: 1.00, speed: 120, quantity: 950, dueDate: "2024-07-05", priority: "rush", batches: 2},
    {id: "T013", name: "加急物流标签", type: "label", series: "coated-paper", temp: 103, energyFactor: 1.13, speed: 110, quantity: 1100, dueDate: "2024-07-06", priority: "rush", batches: 3},
    {id: "T014", name: "加急透明膜", type: "film", series: "wrap", temp: 75, energyFactor: 1.25, speed: 100, quantity: 580, dueDate: "2024-07-10", priority: "rush", batches: 2},
    {id: "T015", name: "加急广告膜", type: "film", series: "wrap", temp: 82, energyFactor: 1.31, speed: 85, quantity: 600, dueDate: "2024-07-10", priority: "rush", batches: 2},
    {id: "T016", name: "RFID智能标签", type: "rfid", series: "rfid", temp: 93, energyFactor: 1.63, speed: 50, quantity: 500, dueDate: "2024-07-02", priority: "emergency", batches: 1}
];

const LINES = [
    {id: "Line-01", name: "1#标签涂布线", types: ["label"], maxSpeed: 150},
    {id: "Line-02", name: "2#薄膜涂布线", types: ["film", "label"], maxSpeed: 130},
    {id: "Line-03", name: "3#特种产品线", types: ["rfid", "special"], maxSpeed: 80}
];

// 电价配置 (每小时)
const ELECTRICITY_PRICES = {
    peak: 0.50,    // 09:00-12:00, 18:00-21:00
    flat: 0.35,    // 06:00-09:00, 12:00-18:00
    valley: 0.20   // 21:00-06:00
};

// 换产时间配置 (小时)
const SETUP_TIMES = {
    sameProduct: 0,
    sameSeries: 0.5,
    crossSeries: 4.0
};

// 换产成本 ($/h)
const SETUP_COST_RATE = 50;

// 延迟惩罚系数
const DELAY_PENALTY = {
    emergency: 100,  // $/batch/day
    rush: 50,
    normal: 20
};

// 优化权重（可动态调整）
let WEIGHTS = {
    energy: 0.35,
    delivery: 0.45,
    setup: 0.20
};

// ==================== 核心类 ====================

class ProductionScheduler {
    constructor() {
        this.products = PRODUCTS;
        this.lines = LINES;
        this.planStartDate = new Date('2024-07-01T06:00:00');
        this.planEndDate = new Date('2024-07-15T06:00:00');
        this.weights = WEIGHTS; // 使用实例权重
    }

    // 设置权重
    setWeights(weights) {
        this.weights = weights;
    }

    /**
     * 计算换产时间 (小时)
     */
    calculateSetupTime(prevProduct, currProduct) {
        if (!prevProduct) return 0;

        // 同产品
        if (prevProduct.id === currProduct.id) {
            return SETUP_TIMES.sameProduct;
        }

        // 同系列
        if (prevProduct.series === currProduct.series) {
            return SETUP_TIMES.sameSeries;
        }

        // 跨系列 - 检查温度差异
        const tempDiff = Math.abs(prevProduct.temp - currProduct.temp);
        if (tempDiff <= 15) {
            return SETUP_TIMES.sameSeries; // 温度相近，视为同系列
        }

        return SETUP_TIMES.crossSeries;
    }

    /**
     * 获取时段类型
     */
    getShiftType(hour) {
        if ((hour >= 9 && hour < 12) || (hour >= 18 && hour < 21)) {
            return 'peak';
        } else if ((hour >= 6 && hour < 9) || (hour >= 12 && hour < 18)) {
            return 'flat';
        } else {
            return 'valley';
        }
    }

    /**
     * 计算批次的能耗成本
     */
    calculateEnergyCost(product, startTime, durationMin) {
        const startDate = new Date(startTime);
        let totalCost = 0;
        let remainingMinutes = durationMin;

        // 每小时能耗 (kWh/min * 60)
        const energyPerHour = product.energyFactor * 0.8 * 60; // 基准0.8 kWh/min

        let currentTime = new Date(startDate);

        while (remainingMinutes > 0) {
            const hour = currentTime.getHours();
            const shiftType = this.getShiftType(hour);
            const price = ELECTRICITY_PRICES[shiftType];

            // 当前小时剩余分钟
            const minutesInHour = 60 - currentTime.getMinutes();
            const minutesToProcess = Math.min(remainingMinutes, minutesInHour);

            // 能耗成本
            const energy = (product.energyFactor * 0.8) * minutesToProcess;
            totalCost += energy * price;

            remainingMinutes -= minutesToProcess;
            currentTime = new Date(currentTime.getTime() + minutesToProcess * 60000);
        }

        return totalCost;
    }

    /**
     * 计算延迟惩罚
     */
    calculateDelayPenalty(product, endTime) {
        const dueDate = new Date(product.dueDate + 'T23:59:59');
        const end = new Date(endTime);

        if (end <= dueDate) {
            return 0;
        }

        const delayHours = (end - dueDate) / (1000 * 60 * 60);
        const delayDays = Math.ceil(delayHours / 24);

        return delayDays * DELAY_PENALTY[product.priority] * product.batches;
    }

    /**
     * 计算综合成本得分
     */
    calculateScore(slot, product) {
        const energyCost = this.calculateEnergyCost(product, slot.startTime, slot.durationMin);
        const setupCost = slot.setupTime * SETUP_COST_RATE;
        const delayPenalty = this.calculateDelayPenalty(product, slot.endTime);

        // 归一化后加权（使用实例权重）
        const normalizedEnergy = energyCost / 1000; // 假设最大$1000
        const normalizedDelay = delayPenalty / 500; // 假设最大$500
        const normalizedSetup = setupCost / 200; // 假设最大$200

        return this.weights.energy * normalizedEnergy +
               this.weights.delivery * normalizedDelay +
               this.weights.setup * normalizedSetup;
    }

    /**
     * 获取产品可用的产线
     */
    getAvailableLines(product) {
        return this.lines.filter(line => line.types.includes(product.type));
    }

    /**
     * 计算批次生产时长 (分钟)
     */
    calculateBatchDuration(product, batchQty) {
        // 假设幅宽1.5m，每批次重量对应面积
        const areaPerKg = 1.5; // m²/kg (简化假设)
        const totalArea = batchQty * areaPerKg; // m²
        const durationMin = totalArea / (product.speed * 1.5) * 60; // 分钟

        return Math.round(durationMin);
    }

    /**
     * 主优化函数 - 贪心算法
     */
    optimize() {
        console.log('开始优化排程...');

        // 1. 展开产品为批次任务
        const tasks = this.expandProductsToTasks();

        // 2. 按优先级和交期排序
        const sortedTasks = this.sortTasks(tasks);

        // 3. 初始化产线状态
        const lineStates = {};
        this.lines.forEach(line => {
            lineStates[line.id] = {
                currentTime: new Date(this.planStartDate),
                lastProduct: null,
                schedule: []
            };
        });

        // 4. 贪心分配
        const results = [];

        for (const task of sortedTasks) {
            const bestSlot = this.findBestSlot(task, lineStates);

            if (bestSlot) {
                // 分配任务
                const result = this.assignTask(task, bestSlot, lineStates[bestSlot.lineId]);
                results.push(result);

                // 更新产线状态
                lineStates[bestSlot.lineId].currentTime = new Date(result.endTime);
                lineStates[bestSlot.lineId].lastProduct = task.product;
                lineStates[bestSlot.lineId].schedule.push(result);
            }
        }

        // 5. 按开始时间排序结果
        results.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        // 6. 添加序号
        results.forEach((r, i) => r.sequence = i + 1);

        console.log(`优化完成，共分配 ${results.length} 个批次`);

        return results;
    }

    /**
     * 展开产品为批次任务
     */
    expandProductsToTasks() {
        const tasks = [];

        for (const product of this.products) {
            const batchQty = Math.ceil(product.quantity / product.batches);

            for (let i = 0; i < product.batches; i++) {
                const qty = (i === product.batches - 1)
                    ? product.quantity - batchQty * i
                    : batchQty;

                tasks.push({
                    product: product,
                    batchNumber: `${i + 1}/${product.batches}`,
                    quantity: qty,
                    durationMin: this.calculateBatchDuration(product, qty)
                });
            }
        }

        return tasks;
    }

    /**
     * 任务排序 - 优先级 + 交期
     */
    sortTasks(tasks) {
        const priorityOrder = { emergency: 0, rush: 1, normal: 2 };

        return tasks.sort((a, b) => {
            // 先按优先级
            const pa = priorityOrder[a.product.priority];
            const pb = priorityOrder[b.product.priority];
            if (pa !== pb) return pa - pb;

            // 再按交期
            return new Date(a.product.dueDate) - new Date(b.product.dueDate);
        });
    }

    /**
     * 查找最佳时隙
     */
    findBestSlot(task, lineStates) {
        let bestSlot = null;
        let bestScore = Infinity;

        const availableLines = this.getAvailableLines(task.product);

        for (const line of availableLines) {
            const state = lineStates[line.id];

            // 计算换产时间
            const setupTime = this.calculateSetupTime(state.lastProduct, task.product);

            // 计算开始时间
            const startTime = new Date(state.currentTime.getTime() + setupTime * 60 * 60 * 1000);

            // 计算结束时间
            const endTime = new Date(startTime.getTime() + task.durationMin * 60 * 1000);

            // 检查是否超过计划周期
            if (endTime > this.planEndDate) {
                continue;
            }

            // 计算得分
            const slot = {
                lineId: line.id,
                startTime: startTime,
                endTime: endTime,
                setupTime: setupTime,
                durationMin: task.durationMin
            };

            const score = this.calculateScore(slot, task.product);

            if (score < bestScore) {
                bestScore = score;
                bestSlot = slot;
            }
        }

        return bestSlot;
    }

    /**
     * 分配任务并生成结果
     */
    assignTask(task, slot, lineState) {
        const product = task.product;

        // 计算能耗成本
        const energyCost = this.calculateEnergyCost(product, slot.startTime, slot.durationMin);

        // 计算换产成本
        const setupCost = slot.setupTime * SETUP_COST_RATE;

        // 计算延迟惩罚
        const delayPenalty = this.calculateDelayPenalty(product, slot.endTime);

        // 判断是否延迟
        const dueDate = new Date(product.dueDate + 'T23:59:59');
        const isDelayed = new Date(slot.endTime) > dueDate;

        // 获取主要班次类型
        const startHour = new Date(slot.startTime).getHours();
        const shiftType = this.getShiftType(startHour);
        const shiftName = shiftType === 'peak' ? '峰时段' :
                         shiftType === 'valley' ? '谷时段' : '平时段';

        return {
            batchId: `${product.id}-${task.batchNumber.replace('/', '-')}`,
            productId: product.id,
            productName: product.name,
            productSeries: product.series,
            batchNumber: task.batchNumber,
            quantity: task.quantity,
            lineId: slot.lineId,
            startTime: this.formatTime(slot.startTime),
            endTime: this.formatTime(slot.endTime),
            durationMin: slot.durationMin,
            shift: shiftName,
            shiftType: shiftType,
            setupType: this.getSetupType(slot.setupTime),
            setupDuration: slot.setupTime,
            energyCost: energyCost,
            setupCost: setupCost,
            delayPenalty: delayPenalty,
            totalCost: energyCost + setupCost + delayPenalty,
            isDelayed: isDelayed,
            priority: product.priority,
            dueDate: product.dueDate
        };
    }

    /**
     * 格式化时间
     */
    formatTime(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }

    /**
     * 获取换产类型名称
     */
    getSetupType(hours) {
        if (hours === 0) return '同产品';
        if (hours <= 0.5) return '同系列';
        return '跨系列';
    }

    /**
     * 计算KPI汇总
     */
    calculateKPIs(results) {
        const totalEnergyCost = results.reduce((sum, r) => sum + r.energyCost, 0);
        const totalSetupTime = results.reduce((sum, r) => sum + r.setupDuration, 0);
        const totalSetupCost = results.reduce((sum, r) => sum + r.setupCost, 0);
        const totalDelayPenalty = results.reduce((sum, r) => sum + r.delayPenalty, 0);

        // 准时交付率 (首批次)
        const firstBatches = results.filter(r => r.batchNumber.startsWith('1/'));
        const onTimeBatches = firstBatches.filter(r => !r.isDelayed);
        const onTimeRate = (onTimeBatches.length / firstBatches.length * 100).toFixed(1);

        // 谷时段生产比例
        const valleyBatches = results.filter(r => r.shiftType === 'valley');
        const valleyDuration = valleyBatches.reduce((sum, r) => sum + r.durationMin, 0);
        const totalDuration = results.reduce((sum, r) => sum + r.durationMin, 0);
        const valleyRate = (valleyDuration / totalDuration * 100).toFixed(1);

        // 延迟订单数
        const delayedOrders = firstBatches.filter(r => r.isDelayed).length;

        return {
            totalEnergyCost: totalEnergyCost.toFixed(0),
            totalSetupTime: totalSetupTime.toFixed(1),
            totalSetupCost: totalSetupCost.toFixed(0),
            totalDelayPenalty: totalDelayPenalty.toFixed(0),
            onTimeRate: onTimeRate,
            valleyRate: valleyRate,
            totalBatches: results.length,
            delayedOrders: delayedOrders,
            totalCost: (totalEnergyCost + totalSetupCost + totalDelayPenalty).toFixed(0)
        };
    }
}

// ==================== 导出 ====================

// 如果在浏览器环境
if (typeof window !== 'undefined') {
    window.ProductionScheduler = ProductionScheduler;
}

// 如果在Node环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProductionScheduler, PRODUCTS, LINES, WEIGHTS };
}