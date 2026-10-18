/**
 * 单产线模拟退火优化器
 *
 * 核心思想：
 * 1. 从贪心解开始
 * 2. 随机交换任务顺序
 * 3. 根据权重计算成本
 * 4. 以一定概率接受更差的解（避免局部最优）
 * 5. 逐渐降温，收敛到最优解
 */

const PRODUCTS = [
    {id: "T003", name: "高温标签", type: "label", series: "adhesive", temp: 130, energyFactor: 2.00, speed: 60, quantity: 1200, dueDate: "2024-07-03", priority: "rush", batches: 3},
    {id: "T006", name: "透明车身膜", type: "film", series: "wrap", temp: 75, energyFactor: 1.25, speed: 100, quantity: 900, dueDate: "2024-07-04", priority: "normal", batches: 2},
    {id: "T007", name: "彩色车身膜", type: "film", series: "wrap", temp: 80, energyFactor: 1.38, speed: 90, quantity: 800, dueDate: "2024-07-05", priority: "normal", batches: 2},
    {id: "T008", name: "车身广告膜", type: "film", series: "wrap", temp: 82, energyFactor: 1.31, speed: 85, quantity: 750, dueDate: "2024-07-06", priority: "normal", batches: 2},
    {id: "T009", name: "低温标签", type: "label", series: "adhesive", temp: 88, energyFactor: 0.88, speed: 100, quantity: 600, dueDate: "2024-07-04", priority: "normal", batches: 2},
    {id: "T014", name: "加急透明膜", type: "film", series: "wrap", temp: 75, energyFactor: 1.25, speed: 100, quantity: 700, dueDate: "2024-07-03", priority: "rush", batches: 2},
    {id: "T015", name: "加急广告膜", type: "film", series: "wrap", temp: 82, energyFactor: 1.31, speed: 85, quantity: 650, dueDate: "2024-07-05", priority: "rush", batches: 2}
];

const ELECTRICITY_PRICES = { peak: 0.50, flat: 0.35, valley: 0.20 };
const SETUP_TIMES = { sameProduct: 0, sameSeries: 0.5, crossSeries: 4.0 };
const SETUP_COST_RATE = 50;
const DELAY_PENALTY = { rush: 100, normal: 30 };

class SimulatedAnnealingScheduler {
    constructor() {
        this.products = PRODUCTS;
        this.planStartDate = new Date('2024-07-01T06:00:00');
        this.planEndDate = new Date('2024-07-07T06:00:00');
        this.weights = { energy: 0.35, delivery: 0.45, setup: 0.20 };

        // 模拟退火参数
        this.initialTemp = 1000;
        this.coolingRate = 0.995;
        this.iterations = 5000;
    }

    calculateSetupTime(prevProduct, currProduct) {
        if (!prevProduct) return 0;
        if (prevProduct.id === currProduct.id) return SETUP_TIMES.sameProduct;
        if (prevProduct.series === currProduct.series) return SETUP_TIMES.sameSeries;
        const tempDiff = Math.abs(prevProduct.temp - currProduct.temp);
        return tempDiff <= 15 ? SETUP_TIMES.sameSeries : SETUP_TIMES.crossSeries;
    }

    getShiftType(hour) {
        if ((hour >= 9 && hour < 12) || (hour >= 18 && hour < 21)) return 'peak';
        if ((hour >= 6 && hour < 9) || (hour >= 12 && hour < 18)) return 'flat';
        return 'valley';
    }

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

    calculateDelayPenalty(product, endTime) {
        const dueDate = new Date(product.dueDate + 'T23:59:59');
        const end = new Date(endTime);
        if (end <= dueDate) return 0;
        const delayHours = (end - dueDate) / (1000 * 60 * 60);
        const delayDays = Math.ceil(delayHours / 24);
        return delayDays * DELAY_PENALTY[product.priority] * product.batches;
    }

    calculateBatchDuration(product, batchQty) {
        const areaPerKg = 1.5;
        const totalArea = batchQty * areaPerKg;
        const durationMin = totalArea / (product.speed * 1.5) * 60;
        return Math.round(durationMin);
    }

    /**
     * 创建初始批次列表
     */
    createBatches() {
        const batches = [];
        for (const product of this.products) {
            const batchQty = Math.ceil(product.quantity / product.batches);
            for (let i = 0; i < product.batches; i++) {
                const qty = (i === product.batches - 1)
                    ? product.quantity - batchQty * i
                    : batchQty;
                batches.push({
                    product,
                    batchNumber: `${i + 1}/${product.batches}`,
                    quantity: qty,
                    durationMin: this.calculateBatchDuration(product, qty)
                });
            }
        }
        return batches;
    }

    /**
     * 计算某个排序的总成本
     */
    evaluateSolution(batches) {
        let currentTime = new Date(this.planStartDate);
        let lastProduct = null;
        let totalEnergyCost = 0;
        let totalSetupCost = 0;
        let totalDelayPenalty = 0;

        for (const batch of batches) {
            const setupTime = this.calculateSetupTime(lastProduct, batch.product);
            const startTime = new Date(currentTime.getTime() + setupTime * 60 * 60 * 1000);
            const endTime = new Date(startTime.getTime() + batch.durationMin * 60 * 1000);

            const energyCost = this.calculateEnergyCost(batch.product, startTime, batch.durationMin);
            const setupCost = setupTime * SETUP_COST_RATE;
            const delayPenalty = this.calculateDelayPenalty(batch.product, endTime);

            totalEnergyCost += energyCost;
            totalSetupCost += setupCost;
            totalDelayPenalty += delayPenalty;

            currentTime = endTime;
            lastProduct = batch.product;
        }

        // 根据权重计算综合成本
        const normalizedEnergy = totalEnergyCost / 1000;
        const normalizedDelay = totalDelayPenalty / 500;
        const normalizedSetup = totalSetupCost / 100;

        return this.weights.energy * normalizedEnergy +
               this.weights.delivery * normalizedDelay +
               this.weights.setup * normalizedSetup;
    }

    /**
     * 生成邻居解（随机交换两个批次）
     */
    generateNeighbor(batches) {
        const newBatches = [...batches];
        const i = Math.floor(Math.random() * batches.length);
        const j = Math.floor(Math.random() * batches.length);
        [newBatches[i], newBatches[j]] = [newBatches[j], newBatches[i]];
        return newBatches;
    }

    /**
     * 模拟退火主算法
     */
    optimize() {
        console.log('开始模拟退火优化...');

        // 1. 创建初始批次并按优先级+交期排序
        let currentBatches = this.createBatches();
        const priorityOrder = { rush: 0, normal: 1 };
        currentBatches.sort((a, b) => {
            if (priorityOrder[a.product.priority] !== priorityOrder[b.product.priority]) {
                return priorityOrder[a.product.priority] - priorityOrder[b.product.priority];
            }
            return new Date(a.product.dueDate) - new Date(b.product.dueDate);
        });

        let currentCost = this.evaluateSolution(currentBatches);
        let bestBatches = currentBatches;
        let bestCost = currentCost;

        let temperature = this.initialTemp;

        // 2. 模拟退火迭代
        for (let i = 0; i < this.iterations; i++) {
            // 生成邻居
            const neighborBatches = this.generateNeighbor(currentBatches);
            const neighborCost = this.evaluateSolution(neighborBatches);

            // 计算成本差
            const delta = neighborCost - currentCost;

            // 决定是否接受
            if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
                currentBatches = neighborBatches;
                currentCost = neighborCost;

                // 更新最优解
                if (currentCost < bestCost) {
                    bestBatches = currentBatches;
                    bestCost = currentCost;
                }
            }

            // 降温
            temperature *= this.coolingRate;
        }

        console.log(`优化完成，最优成本: ${bestCost.toFixed(2)}`);
        return this.buildResults(bestBatches);
    }

    /**
     * 构建结果对象
     */
    buildResults(batches) {
        const results = [];
        let currentTime = new Date(this.planStartDate);
        let lastProduct = null;

        for (const batch of batches) {
            const setupTime = this.calculateSetupTime(lastProduct, batch.product);
            const startTime = new Date(currentTime.getTime() + setupTime * 60 * 60 * 1000);
            const endTime = new Date(startTime.getTime() + batch.durationMin * 60 * 1000);

            const energyCost = this.calculateEnergyCost(batch.product, startTime, batch.durationMin);
            const setupCost = setupTime * SETUP_COST_RATE;
            const delayPenalty = this.calculateDelayPenalty(batch.product, endTime);
            const isDelayed = new Date(endTime) > new Date(batch.product.dueDate + 'T23:59:59');

            const startHour = new Date(startTime).getHours();
            const shiftType = this.getShiftType(startHour);
            const shiftName = shiftType === 'peak' ? '峰时段' :
                             shiftType === 'valley' ? '谷时段' : '平时段';

            const setupType = setupTime === 0 ? '同产品' :
                             setupTime <= 0.5 ? '同系列' : '跨系列';

            results.push({
                productId: batch.product.id,
                productName: batch.product.name,
                batchNumber: batch.batchNumber,
                quantity: batch.quantity,
                startTime: this.formatTime(startTime),
                endTime: this.formatTime(endTime),
                durationMin: batch.durationMin,
                shift: shiftName,
                shiftType,
                setupType,
                setupDuration: setupTime,
                energyCost,
                setupCost,
                delayPenalty,
                totalCost: energyCost + setupCost + delayPenalty,
                isDelayed,
                priority: batch.product.priority,
                dueDate: batch.product.dueDate
            });

            currentTime = endTime;
            lastProduct = batch.product;
        }

        results.forEach((r, i) => r.sequence = i + 1);
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

if (typeof window !== 'undefined') {
    window.SimulatedAnnealingScheduler = SimulatedAnnealingScheduler;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SimulatedAnnealingScheduler, PRODUCTS };
}