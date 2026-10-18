/**
 * 单产线多目标排程优化器
 *
 * 聚焦 Line-02（混合线），紧张模式
 * 支持 film 和 label 类型产品
 */

// ==================== 数据定义 ====================

// Line-02 可生产的产品（紧张模式 - 7天内完成）
const PRODUCTS = [
    {id: "T003", name: "高温标签", type: "label", series: "adhesive", temp: 130, energyFactor: 2.00, speed: 60, quantity: 1200, dueDate: "2024-07-03", priority: "rush", batches: 3},
    {id: "T006", name: "透明车身膜", type: "film", series: "wrap", temp: 75, energyFactor: 1.25, speed: 100, quantity: 900, dueDate: "2024-07-04", priority: "normal", batches: 2},
    {id: "T007", name: "彩色车身膜", type: "film", series: "wrap", temp: 80, energyFactor: 1.38, speed: 90, quantity: 800, dueDate: "2024-07-05", priority: "normal", batches: 2},
    {id: "T008", name: "车身广告膜", type: "film", series: "wrap", temp: 82, energyFactor: 1.31, speed: 85, quantity: 750, dueDate: "2024-07-06", priority: "normal", batches: 2},
    {id: "T009", name: "低温标签", type: "label", series: "adhesive", temp: 88, energyFactor: 0.88, speed: 100, quantity: 600, dueDate: "2024-07-04", priority: "normal", batches: 2},
    {id: "T014", name: "加急透明膜", type: "film", series: "wrap", temp: 75, energyFactor: 1.25, speed: 100, quantity: 700, dueDate: "2024-07-03", priority: "rush", batches: 2},
    {id: "T015", name: "加急广告膜", type: "film", series: "wrap", temp: 82, energyFactor: 1.31, speed: 85, quantity: 650, dueDate: "2024-07-05", priority: "rush", batches: 2}
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
    rush: 100,    // $/batch/day
    normal: 30
};

// ==================== 核心类 ====================

class SingleLineScheduler {
    constructor() {
        this.products = PRODUCTS;
        this.planStartDate = new Date('2024-07-01T06:00:00');
        this.planEndDate = new Date('2024-07-07T06:00:00'); // 紧张模式：只有6天
        this.weights = { energy: 0.35, delivery: 0.45, setup: 0.20 };
    }

    /**
     * 计算换产时间 (小时)
     */
    calculateSetupTime(prevProduct, currProduct) {
        if (!prevProduct) return 0;
        if (prevProduct.id === currProduct.id) return SETUP_TIMES.sameProduct;
        if (prevProduct.series === currProduct.series) return SETUP_TIMES.sameSeries;

        // 温差判断
        const tempDiff = Math.abs(prevProduct.temp - currProduct.temp);
        return tempDiff <= 15 ? SETUP_TIMES.sameSeries : SETUP_TIMES.crossSeries;
    }

    /**
     * 获取时段类型
     */
    getShiftType(hour) {
        if ((hour >= 9 && hour < 12) || (hour >= 18 && hour < 21)) return 'peak';
        if ((hour >= 6 && hour < 9) || (hour >= 12 && hour < 18)) return 'flat';
        return 'valley';
    }

    /**
     * 计算批次的能耗成本
     */
    calculateEnergyCost(product, startTime, durationMin) {
        const startDate = new Date(startTime);
        let totalCost = 0;
        let remainingMinutes = durationMin;
        let currentTime = new Date(startDate);

        while (remainingMinutes > 0) {
            const hour = currentTime.getHours();
            const shiftType = this.getShiftType(hour);
            const price = ELECTRICITY_PRICES[shiftType];
            const minutesInHour = 60 - currentTime.getMinutes();
            const minutesToProcess = Math.min(remainingMinutes, minutesInHour);
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
        if (end <= dueDate) return 0;
        const delayHours = (end - dueDate) / (1000 * 60 * 60);
        const delayDays = Math.ceil(delayHours / 24);
        return delayDays * DELAY_PENALTY[product.priority] * product.batches;
    }

    /**
     * 计算批次生产时长 (分钟)
     */
    calculateBatchDuration(product, batchQty) {
        const areaPerKg = 1.5; // m²/kg
        const totalArea = batchQty * areaPerKg;
        const durationMin = totalArea / (product.speed * 1.5) * 60;
        return Math.round(durationMin);
    }

    /**
     * 计算综合成本得分
     */
    calculateScore(startTime, setupTime, durationMin, product) {
        const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);
        const energyCost = this.calculateEnergyCost(product, startTime, durationMin);
        const setupCost = setupTime * SETUP_COST_RATE;
        const delayPenalty = this.calculateDelayPenalty(product, endTime);

        // 归一化
        const normalizedEnergy = energyCost / 500;
        const normalizedDelay = delayPenalty / 300;
        const normalizedSetup = setupCost / 100;

        return this.weights.energy * normalizedEnergy +
               this.weights.delivery * normalizedDelay +
               this.weights.setup * normalizedSetup;
    }

    /**
     * 展开+排序任务
     */
    prepareTasks() {
        const tasks = [];
        const priorityOrder = { rush: 0, normal: 1 };

        for (const product of this.products) {
            const batchQty = Math.ceil(product.quantity / product.batches);
            for (let i = 0; i < product.batches; i++) {
                const qty = (i === product.batches - 1)
                    ? product.quantity - batchQty * i
                    : batchQty;
                tasks.push({
                    product,
                    batchNumber: `${i + 1}/${product.batches}`,
                    quantity: qty,
                    durationMin: this.calculateBatchDuration(product, qty),
                    priorityRank: priorityOrder[product.priority]
                });
            }
        }

        // 排序：优先级 > 交期
        return tasks.sort((a, b) => {
            if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
            return new Date(a.product.dueDate) - new Date(b.product.dueDate);
        });
    }

    /**
     * 主优化函数 - 贪心算法（带时隙选择）
     */
    optimize() {
        console.log('开始优化排程...');

        const tasks = this.prepareTasks();
        const results = [];
        let currentTime = new Date(this.planStartDate);
        let lastProduct = null;

        for (const task of tasks) {
            // 计算换产时间
            const setupTime = this.calculateSetupTime(lastProduct, task.product);

            // 尝试多个起始时隙（关键改进！）
            const candidates = [];
            const searchWindow = 24; // 搜索未来24小时的时隙

            for (let offset = 0; offset <= searchWindow; offset += 2) {
                const candidateStart = new Date(currentTime.getTime() + offset * 60 * 60 * 1000);
                const candidateStartTime = new Date(candidateStart.getTime() + setupTime * 60 * 60 * 1000);
                const candidateEndTime = new Date(candidateStartTime.getTime() + task.durationMin * 60 * 1000);

                if (candidateEndTime > this.planEndDate) continue;

                const score = this.calculateScore(
                    candidateStartTime,
                    offset === 0 ? setupTime : 0, // 如果延迟开始，换产时间可隐藏在等待中
                    task.durationMin,
                    task.product
                );

                candidates.push({
                    startTime: candidateStartTime,
                    endTime: candidateEndTime,
                    setupTime: offset === 0 ? setupTime : Math.max(0, setupTime - offset),
                    score
                });
            }

            // 选择得分最低的时隙（如果没有候选项，使用最早的）
            if (candidates.length === 0) {
                // 强制使用最早可用时间
                const fallbackStart = new Date(currentTime.getTime() + setupTime * 60 * 60 * 1000);
                const fallbackEnd = new Date(fallbackStart.getTime() + task.durationMin * 60 * 1000);
                candidates.push({
                    startTime: fallbackStart,
                    endTime: fallbackEnd,
                    setupTime,
                    score: Infinity
                });
            }

            candidates.sort((a, b) => a.score - b.score);
            const best = candidates[0];

            // 计算成本
            const energyCost = this.calculateEnergyCost(task.product, best.startTime, task.durationMin);
            const setupCost = best.setupTime * SETUP_COST_RATE;
            const delayPenalty = this.calculateDelayPenalty(task.product, best.endTime);
            const isDelayed = new Date(best.endTime) > new Date(task.product.dueDate + 'T23:59:59');

            const startHour = new Date(best.startTime).getHours();
            const shiftType = this.getShiftType(startHour);
            const shiftName = shiftType === 'peak' ? '峰时段' :
                             shiftType === 'valley' ? '谷时段' : '平时段';

            const setupType = best.setupTime === 0 ? '同产品' :
                             best.setupTime <= 0.5 ? '同系列' : '跨系列';

            results.push({
                productId: task.product.id,
                productName: task.product.name,
                batchNumber: task.batchNumber,
                quantity: task.quantity,
                startTime: this.formatTime(best.startTime),
                endTime: this.formatTime(best.endTime),
                durationMin: task.durationMin,
                shift: shiftName,
                shiftType,
                setupType,
                setupDuration: best.setupTime,
                energyCost,
                setupCost,
                delayPenalty,
                totalCost: energyCost + setupCost + delayPenalty,
                isDelayed,
                priority: task.product.priority,
                dueDate: task.product.dueDate
            });

            currentTime = new Date(best.endTime);
            lastProduct = task.product;
        }

        // 添加序号
        results.forEach((r, i) => r.sequence = i + 1);
        console.log(`优化完成，共 ${results.length} 批次`);
        return results;
    }

    formatTime(date) {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        return `${month}-${day} ${hour}:${minute}`;
    }

    /**
     * 计算KPI汇总
     */
    calculateKPIs(results) {
        const totalEnergyCost = results.reduce((sum, r) => sum + r.energyCost, 0);
        const totalSetupTime = results.reduce((sum, r) => sum + r.setupDuration, 0);
        const totalSetupCost = results.reduce((sum, r) => sum + r.setupCost, 0);
        const totalDelayPenalty = results.reduce((sum, r) => sum + r.delayPenalty, 0);

        const firstBatches = results.filter(r => r.batchNumber.startsWith('1/'));
        const onTimeBatches = firstBatches.filter(r => !r.isDelayed);
        const onTimeRate = firstBatches.length > 0 ? (onTimeBatches.length / firstBatches.length * 100).toFixed(1) : '0';

        const valleyBatches = results.filter(r => r.shiftType === 'valley');
        const valleyDuration = valleyBatches.reduce((sum, r) => sum + r.durationMin, 0);
        const totalDuration = results.reduce((sum, r) => sum + r.durationMin, 0);
        const valleyRate = totalDuration > 0 ? (valleyDuration / totalDuration * 100).toFixed(1) : '0';

        return {
            totalEnergyCost: totalEnergyCost.toFixed(0),
            totalSetupTime: totalSetupTime.toFixed(1),
            totalSetupCost: totalSetupCost.toFixed(0),
            totalDelayPenalty: totalDelayPenalty.toFixed(0),
            onTimeRate,
            valleyRate,
            totalBatches: results.length,
            delayedOrders: firstBatches.filter(r => r.isDelayed).length,
            totalCost: (totalEnergyCost + totalSetupCost + totalDelayPenalty).toFixed(0)
        };
    }
}

// ==================== 导出 ====================
if (typeof window !== 'undefined') {
    window.SingleLineScheduler = SingleLineScheduler;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SingleLineScheduler, PRODUCTS };
}