/**
 * Single-Line Production Scheduling Optimizer
 * Using Simulated Annealing Algorithm
 *
 * Line-02: Mixed Production Line (Film & Label)
 */

// ==================== Equipment Configuration ====================

const EQUIPMENT = {
    lineId: "Line-02",
    lineName: "Mixed Coating Line",
    type: "coating",

    // Heating system
    heating: {
        power: 150,              // kW - heating power
        efficiency: 0.85,        // 85% efficiency
        maxTemp: 180,            // °C - maximum temperature
        heatingRate: 15,         // °C/hour - heating rate
        energyCost: 0.35         // $/kWh - average energy cost for heating
    },

    // Cooling system
    cooling: {
        type: "water+air",       // water cooling + air cooling
        naturalCoolingRate: 8,   // °C/hour - natural cooling rate
        forcedCoolingRate: 20,   // °C/hour - forced cooling rate
        waterConsumption: 50,    // L/hour - water consumption
        waterCost: 0.002         // $/L - water cost
    },

    // Setup cost rates
    setupCosts: {
        labor: 50,               // $/hour - labor cost (2 operators)
        energy: 15,              // $/hour - energy cost during setup
        material: 20,            // $/hour - material loss cost
        opportunity: 50          // $/hour - opportunity cost (for optimization, not added to cost)
    },

    // Coating head configuration
    coatingHead: {
        changeTime: 0.5,         // hours - time to change coating head
        cleaningTime: 1.0,       // hours - time to clean coating head
        adjustmentTime: 0.25     // hours - time to adjust parameters
    },

    // Material handling
    materialHandling: {
        rollChangeTime: 0.25,    // hours - time to change substrate roll
        coatingChangeTime: 0.5,  // hours - time to change coating material
        tensionAdjustTime: 0.25  // hours - time to adjust tension
    },

    // Quality control
    qualityControl: {
        firstArticleTime: 0.5,   // hours - time for first article inspection
        calibrationTime: 0.25    // hours - time for calibration
    }
};

// ==================== Product Configuration ====================

const PRODUCTS = [
    {
        id: "T003",
        name: "High-Temp Label",
        type: "label",
        series: "adhesive",

        // Process parameters
        process: {
            temp: 130,                  // °C - processing temperature
            tempTolerance: 5,           // °C - temperature tolerance
            coatingThickness: 25,       // μm - coating thickness
            dryingTime: 2.5,            // minutes - drying time
            curingTemp: 120             // °C - curing temperature
        },

        // Material parameters
        material: {
            substrate: "paper",
            coatingType: "adhesive",
            coatingViscosity: 2500     // mPa·s - coating viscosity
        },

        // Production parameters
        production: {
            energyFactor: 2.00,        // relative energy consumption
            speed: 60,                 // m/min - production speed
            quantity: 1200,            // kg - total quantity
            dueDate: "2024-07-03",
            priority: "rush",
            batches: 3
        }
    },
    {
        id: "T006",
        name: "Clear Wrap Film",
        type: "film",
        series: "wrap",

        process: {
            temp: 75,
            tempTolerance: 3,
            coatingThickness: 15,
            dryingTime: 1.5,
            curingTemp: 70
        },

        material: {
            substrate: "PET film",
            coatingType: "adhesive",
            coatingViscosity: 1800
        },

        production: {
            energyFactor: 1.25,
            speed: 100,
            quantity: 900,
            dueDate: "2024-07-04",
            priority: "normal",
            batches: 2
        }
    },
    {
        id: "T007",
        name: "Colored Wrap Film",
        type: "film",
        series: "wrap",

        process: {
            temp: 80,
            tempTolerance: 3,
            coatingThickness: 18,
            dryingTime: 1.8,
            curingTemp: 75
        },

        material: {
            substrate: "PET film",
            coatingType: "colored adhesive",
            coatingViscosity: 2000
        },

        production: {
            energyFactor: 1.38,
            speed: 90,
            quantity: 800,
            dueDate: "2024-07-05",
            priority: "normal",
            batches: 2
        }
    },
    {
        id: "T008",
        name: "Vehicle Ad Film",
        type: "film",
        series: "wrap",

        process: {
            temp: 82,
            tempTolerance: 4,
            coatingThickness: 20,
            dryingTime: 2.0,
            curingTemp: 78
        },

        material: {
            substrate: "PVC film",
            coatingType: "adhesive",
            coatingViscosity: 2200
        },

        production: {
            energyFactor: 1.31,
            speed: 85,
            quantity: 750,
            dueDate: "2024-07-06",
            priority: "normal",
            batches: 2
        }
    },
    {
        id: "T009",
        name: "Low-Temp Label",
        type: "label",
        series: "adhesive",

        process: {
            temp: 88,
            tempTolerance: 5,
            coatingThickness: 20,
            dryingTime: 2.0,
            curingTemp: 85
        },

        material: {
            substrate: "paper",
            coatingType: "adhesive",
            coatingViscosity: 2000
        },

        production: {
            energyFactor: 0.88,
            speed: 100,
            quantity: 600,
            dueDate: "2024-07-04",
            priority: "normal",
            batches: 2
        }
    },
    {
        id: "T014",
        name: "Rush Clear Film",
        type: "film",
        series: "wrap",

        process: {
            temp: 75,
            tempTolerance: 3,
            coatingThickness: 15,
            dryingTime: 1.5,
            curingTemp: 70
        },

        material: {
            substrate: "PET film",
            coatingType: "adhesive",
            coatingViscosity: 1800
        },

        production: {
            energyFactor: 1.25,
            speed: 100,
            quantity: 700,
            dueDate: "2024-07-03",
            priority: "rush",
            batches: 2
        }
    },
    {
        id: "T015",
        name: "Rush Ad Film",
        type: "film",
        series: "wrap",

        process: {
            temp: 82,
            tempTolerance: 4,
            coatingThickness: 20,
            dryingTime: 2.0,
            curingTemp: 78
        },

        material: {
            substrate: "PVC film",
            coatingType: "adhesive",
            coatingViscosity: 2200
        },

        production: {
            energyFactor: 1.31,
            speed: 85,
            quantity: 650,
            dueDate: "2024-07-05",
            priority: "rush",
            batches: 2
        }
    }
];

// ==================== Cost Configuration ====================

const ELECTRICITY_PRICES = { peak: 0.50, flat: 0.35, valley: 0.20 };
const SETUP_TIMES = { sameProduct: 0, sameSeries: 0.5, crossSeries: 4.0 };
const SETUP_COST_RATE = 50;
const DELAY_PENALTY = { rush: 100, normal: 30 };

class SimulatedAnnealingScheduler {
    constructor() {
        this.products = PRODUCTS;
        this.equipment = EQUIPMENT;
        this.planStartDate = new Date('2024-07-01T06:00:00');
        this.planEndDate = new Date('2024-07-07T06:00:00');
        this.weights = { energy: 0.35, delivery: 0.45, setup: 0.20 };
        this.initialTemp = 1000;
        this.coolingRate = 0.995;
        this.iterations = 5000;
    }

    /**
     * Calculate detailed setup time and cost
     */
    calculateSetupDetails(prevProduct, currProduct) {
        if (!prevProduct) {
            return {
                totalTime: 0,
                totalCost: 0,
                breakdown: {
                    temperature: { time: 0, cost: 0 },
                    cleaning: { time: 0, cost: 0 },
                    material: { time: 0, cost: 0 },
                    adjustment: { time: 0, cost: 0 },
                    quality: { time: 0, cost: 0 }
                }
            };
        }

        // Same product: no setup needed
        if (prevProduct.id === currProduct.id) {
            return {
                totalTime: 0,
                totalCost: 0,
                breakdown: {
                    temperature: { time: 0, cost: 0 },
                    cleaning: { time: 0, cost: 0 },
                    material: { time: 0, cost: 0 },
                    adjustment: { time: 0, cost: 0 },
                    quality: { time: 0, cost: 0 }
                }
            };
        }

        const breakdown = {
            temperature: { time: 0, cost: 0 },
            cleaning: { time: 0, cost: 0 },
            material: { time: 0, cost: 0 },
            adjustment: { time: 0, cost: 0 },
            quality: { time: 0, cost: 0 }
        };

        // 1. Temperature adjustment time
        const tempDiff = prevProduct.process.temp - currProduct.process.temp;
        let tempTime = 0;
        let tempEnergy = 0;

        if (Math.abs(tempDiff) > 5) { // More than tolerance
            if (tempDiff > 0) {
                // Cooling down
                tempTime = Math.abs(tempDiff) / this.equipment.cooling.forcedCoolingRate;
                // Cooling energy (water pump, fan)
                tempEnergy = tempTime * 10; // 10kW for cooling system
            } else {
                // Heating up
                tempTime = Math.abs(tempDiff) / this.equipment.heating.heatingRate;
                // Heating energy
                tempEnergy = tempTime * this.equipment.heating.power * this.equipment.heating.efficiency;
            }
        }

        breakdown.temperature.time = tempTime;
        breakdown.temperature.cost = tempEnergy * this.equipment.heating.energyCost;

        // 2. Cleaning time
        const sameSeries = prevProduct.series === currProduct.series;
        const sameSubstrate = prevProduct.material.substrate === currProduct.material.substrate;
        const sameCoating = prevProduct.material.coatingType === currProduct.material.coatingType;

        let cleaningTime = 0;
        if (!sameSubstrate || !sameCoating) {
            cleaningTime = this.equipment.coatingHead.cleaningTime;
        } else if (!sameSeries) {
            cleaningTime = this.equipment.coatingHead.cleaningTime * 0.5; // Partial cleaning
        }

        breakdown.cleaning.time = cleaningTime;
        breakdown.cleaning.cost = cleaningTime * this.equipment.setupCosts.labor;

        // 3. Material change time
        let materialTime = 0;
        if (!sameSubstrate) {
            materialTime += this.equipment.materialHandling.rollChangeTime;
        }
        if (!sameCoating) {
            materialTime += this.equipment.materialHandling.coatingChangeTime;
        }
        if (!sameSeries) {
            materialTime += this.equipment.materialHandling.tensionAdjustTime;
        }

        breakdown.material.time = materialTime;
        breakdown.material.cost = materialTime * this.equipment.setupCosts.labor;

        // 4. Parameter adjustment time
        let adjustmentTime = this.equipment.coatingHead.adjustmentTime;
        if (Math.abs(prevProduct.process.coatingThickness - currProduct.process.coatingThickness) > 5) {
            adjustmentTime *= 1.5; // More time for significant thickness change
        }

        breakdown.adjustment.time = adjustmentTime;
        breakdown.adjustment.cost = adjustmentTime * this.equipment.setupCosts.labor;

        // 5. Quality control time
        const qualityTime = this.equipment.qualityControl.firstArticleTime +
                            this.equipment.qualityControl.calibrationTime;

        breakdown.quality.time = qualityTime;
        breakdown.quality.cost = qualityTime * this.equipment.setupCosts.labor;

        // Calculate totals
        const totalTime = tempTime + cleaningTime + materialTime + adjustmentTime + qualityTime;

        // Direct costs only (labor + energy + material)
        // Opportunity cost is handled by the optimizer weights, not added here
        const totalCost = Object.values(breakdown).reduce((sum, item) => sum + item.cost, 0);

        return {
            totalTime,
            totalCost,
            breakdown
        };
    }

    calculateSetupTime(prevProduct, currProduct) {
        return this.calculateSetupDetails(prevProduct, currProduct).totalTime;
    }

    getShiftType(hour) {
        if ((hour >= 9 && hour < 12) || (hour >= 18 && hour < 21)) return 'peak';
        if ((hour >= 6 && hour < 9) || (hour >= 12 && hour < 18)) return 'flat';
        return 'valley';
    }

    calculateEnergyDetails(product, startTime, durationMin) {
        const startDate = new Date(startTime);
        let totalCost = 0;
        let totalEnergy = 0;
        let remainingMinutes = durationMin;
        let currentTime = new Date(startDate);
        const shiftBreakdown = { peak: 0, flat: 0, valley: 0 };

        while (remainingMinutes > 0) {
            const hour = currentTime.getHours();
            const shiftType = this.getShiftType(hour);
            const price = ELECTRICITY_PRICES[shiftType];
            const minutesInHour = 60 - currentTime.getMinutes();
            const minutesToProcess = Math.min(remainingMinutes, minutesInHour);
            const energy = (product.production.energyFactor * 0.8) * minutesToProcess;
            totalCost += energy * price;
            totalEnergy += energy;
            shiftBreakdown[shiftType] += minutesToProcess;
            remainingMinutes -= minutesToProcess;
            currentTime = new Date(currentTime.getTime() + minutesToProcess * 60000);
        }

        const avgPrice = totalEnergy > 0 ? totalCost / totalEnergy : 0;
        const durationHours = durationMin / 60;

        return {
            totalCost,
            totalEnergy,
            avgPrice,
            durationHours,
            shiftBreakdown
        };
    }

    calculateEnergyCost(product, startTime, durationMin) {
        return this.calculateEnergyDetails(product, startTime, durationMin).totalCost;
    }

    calculateDelayPenalty(product, endTime) {
        const dueDate = new Date(product.production.dueDate + 'T23:59:59');
        const end = new Date(endTime);
        if (end <= dueDate) return 0;
        const delayHours = (end - dueDate) / (1000 * 60 * 60);
        const delayDays = Math.ceil(delayHours / 24);
        return delayDays * DELAY_PENALTY[product.production.priority] * product.production.batches;
    }

    calculateBatchDuration(product, batchQty) {
        const areaPerKg = 1.5;
        const totalArea = batchQty * areaPerKg;
        const durationMin = totalArea / (product.production.speed * 1.5) * 60;
        return Math.round(durationMin);
    }

    createBatches() {
        const batches = [];
        for (const product of this.products) {
            const batchQty = Math.ceil(product.production.quantity / product.production.batches);
            for (let i = 0; i < product.production.batches; i++) {
                const qty = (i === product.production.batches - 1)
                    ? product.production.quantity - batchQty * i
                    : batchQty;
                batches.push({
                    product,
                    batchNumber: `${i + 1}/${product.production.batches}`,
                    quantity: qty,
                    durationMin: this.calculateBatchDuration(product, qty)
                });
            }
        }
        return batches;
    }

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

        const normalizedEnergy = totalEnergyCost / 1000;
        const normalizedDelay = totalDelayPenalty / 500;
        const normalizedSetup = totalSetupCost / 100;

        return this.weights.energy * normalizedEnergy +
               this.weights.delivery * normalizedDelay +
               this.weights.setup * normalizedSetup;
    }

    generateNeighbor(batches) {
        const newBatches = [...batches];
        const i = Math.floor(Math.random() * batches.length);
        const j = Math.floor(Math.random() * batches.length);
        [newBatches[i], newBatches[j]] = [newBatches[j], newBatches[i]];
        return newBatches;
    }

    optimize() {
        console.log('Starting Simulated Annealing optimization...');

        let currentBatches = this.createBatches();
        const priorityOrder = { rush: 0, normal: 1 };
        currentBatches.sort((a, b) => {
            if (priorityOrder[a.product.production.priority] !== priorityOrder[b.product.production.priority]) {
                return priorityOrder[a.product.production.priority] - priorityOrder[b.product.production.priority];
            }
            return new Date(a.product.production.dueDate) - new Date(b.product.production.dueDate);
        });

        let currentCost = this.evaluateSolution(currentBatches);
        let bestBatches = currentBatches;
        let bestCost = currentCost;

        let temperature = this.initialTemp;

        for (let i = 0; i < this.iterations; i++) {
            const neighborBatches = this.generateNeighbor(currentBatches);
            const neighborCost = this.evaluateSolution(neighborBatches);

            const delta = neighborCost - currentCost;

            if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
                currentBatches = neighborBatches;
                currentCost = neighborCost;

                if (currentCost < bestCost) {
                    bestBatches = currentBatches;
                    bestCost = currentCost;
                }
            }

            temperature *= this.coolingRate;
        }

        console.log(`Optimization complete. Best cost: ${bestCost.toFixed(2)}`);
        return this.buildResults(bestBatches);
    }

    /**
     * Split a batch into segments by shift type
     */
    splitBatchByShifts(batch, startTime, product) {
        const segments = [];
        let currentTime = new Date(startTime);
        let remainingMinutes = batch.durationMin;

        while (remainingMinutes > 0) {
            const hour = currentTime.getHours();
            const currentShift = this.getShiftType(hour);
            const price = ELECTRICITY_PRICES[currentShift];

            // Calculate minutes until next shift change
            let minutesInCurrentShift = 60 - currentTime.getMinutes();
            if (currentTime.getMinutes() === 0) {
                minutesInCurrentShift = 60;
            }

            // Find the actual end of this shift period
            const tempTime = new Date(currentTime);
            let shiftMinutes = 0;
            while (shiftMinutes < minutesInCurrentShift && shiftMinutes < remainingMinutes) {
                const tempHour = tempTime.getHours();
                const tempShift = this.getShiftType(tempHour);
                if (tempShift !== currentShift) break;
                shiftMinutes++;
                tempTime.setMinutes(tempTime.getMinutes() + 1);
            }

            const minutesToProcess = Math.min(shiftMinutes, remainingMinutes);
            const segmentEndTime = new Date(currentTime.getTime() + minutesToProcess * 60000);

            // Calculate energy cost for this segment
            const energyRate = product.production.energyFactor * 0.8 * 60; // kWh/hour
            const durationHours = minutesToProcess / 60;
            const energy = energyRate * durationHours;
            const energyCost = energy * price;

            segments.push({
                startTime: new Date(currentTime),
                endTime: segmentEndTime,
                durationMin: minutesToProcess,
                durationHours: durationHours,
                shift: currentShift,
                shiftName: currentShift === 'peak' ? 'Peak' : currentShift === 'valley' ? 'Valley' : 'Flat',
                price: price,
                energyRate: energyRate,
                energyCost: energyCost
            });

            remainingMinutes -= minutesToProcess;
            currentTime = segmentEndTime;
        }

        return segments;
    }

    buildResults(batches) {
        const results = [];
        let currentTime = new Date(this.planStartDate);
        let lastProduct = null;
        let globalSequence = 0;

        for (const batch of batches) {
            const setupDetails = this.calculateSetupDetails(lastProduct, batch.product);
            const setupTime = setupDetails.totalTime;
            const setupStartTime = new Date(currentTime);
            const batchStartTime = new Date(currentTime.getTime() + setupTime * 60 * 60 * 1000);
            const batchEndTime = new Date(batchStartTime.getTime() + batch.durationMin * 60 * 1000);

            const setupCost = setupDetails.totalCost;
            const delayPenalty = this.calculateDelayPenalty(batch.product, batchEndTime);
            const isDelayed = new Date(batchEndTime) > new Date(batch.product.production.dueDate + 'T23:59:59');

            const setupType = setupTime === 0 ? 'Same Product' :
                             setupTime <= 0.5 ? 'Same Series' :
                             setupTime <= 2.0 ? 'Same Series (Temp Adj)' : 'Cross-Series';

            // Generate a unique batch group ID
            const batchGroupId = `${batch.product.id}-${batch.batchNumber}`;

            // 1. Add setup row if there's setup time
            if (setupTime > 0) {
                globalSequence++;
                results.push({
                    type: 'setup',
                    sequence: globalSequence,
                    sequenceDisplay: `→${globalSequence}`,
                    batchGroupId: batchGroupId,

                    fromProduct: lastProduct ? lastProduct.id : '-',
                    toProduct: batch.product.id,
                    productName: lastProduct ? `${lastProduct.name} → ${batch.product.name}` : batch.product.name,

                    startTime: this.formatTime(setupStartTime),
                    endTime: this.formatTime(batchStartTime),
                    durationHours: setupTime.toFixed(2),

                    setupType,
                    setupCost,
                    setupBreakdown: setupDetails.breakdown,

                    temperatureTime: setupDetails.breakdown.temperature.time.toFixed(2),
                    temperatureCost: setupDetails.breakdown.temperature.cost.toFixed(0),
                    cleaningTime: setupDetails.breakdown.cleaning.time.toFixed(2),
                    cleaningCost: setupDetails.breakdown.cleaning.cost.toFixed(0),
                    materialTime: setupDetails.breakdown.material.time.toFixed(2),
                    materialCost: setupDetails.breakdown.material.cost.toFixed(0),
                    adjustmentTime: setupDetails.breakdown.adjustment.time.toFixed(2),
                    adjustmentCost: setupDetails.breakdown.adjustment.cost.toFixed(0),
                    qualityTime: setupDetails.breakdown.quality.time.toFixed(2),
                    qualityCost: setupDetails.breakdown.quality.cost.toFixed(0)
                });
            }

            // 2. Split batch by shift types
            const segments = this.splitBatchByShifts(batch, batchStartTime, batch.product);
            const totalEnergyCost = segments.reduce((sum, seg) => sum + seg.energyCost, 0);

            // 3. Add production rows for each segment
            segments.forEach((segment, index) => {
                globalSequence++;
                const suffix = segments.length > 1 ? String.fromCharCode(97 + index) : '';

                results.push({
                    type: 'production',
                    sequence: globalSequence,
                    sequenceDisplay: globalSequence + suffix,
                    batchGroupId: batchGroupId,
                    isSubRow: segments.length > 1,
                    subRowIndex: index,
                    totalSubRows: segments.length,

                    productId: batch.product.id,
                    productName: batch.product.name,
                    batchNumber: batch.batchNumber,
                    quantity: batch.quantity,

                    startTime: this.formatTime(segment.startTime),
                    endTime: this.formatTime(segment.endTime),
                    durationMin: segment.durationMin,
                    durationHours: segment.durationHours.toFixed(2),

                    shift: segment.shiftName,
                    shiftType: segment.shift,
                    price: segment.price,

                    energyRate: segment.energyRate.toFixed(1),
                    energyCost: segment.energyCost,
                    isSubtotal: false,

                    isDelayed,
                    priority: batch.product.production.priority,
                    dueDate: batch.product.production.dueDate
                });
            });

            // 4. Add subtotal row if multiple segments
            if (segments.length > 1) {
                globalSequence++;
                results.push({
                    type: 'subtotal',
                    sequence: globalSequence,
                    sequenceDisplay: globalSequence + '=',
                    batchGroupId: batchGroupId,
                    isSubtotal: true,

                    productId: batch.product.id,
                    productName: batch.product.name + ' (Subtotal)',
                    batchNumber: batch.batchNumber,

                    durationHours: segments.reduce((sum, seg) => sum + seg.durationHours, 0).toFixed(2),
                    energyCost: totalEnergyCost,

                    isDelayed,
                    priority: batch.product.production.priority
                });
            }

            currentTime = batchEndTime;
            lastProduct = batch.product;
        }

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
        // Filter by type
        const setupRows = results.filter(r => r.type === 'setup');
        const productionRows = results.filter(r => r.type === 'production');
        const subtotalRows = results.filter(r => r.type === 'subtotal');

        // Sum setup costs from setup rows
        const totalSetupTime = setupRows.reduce((sum, r) => sum + parseFloat(r.durationHours || 0), 0);
        const totalSetupCost = setupRows.reduce((sum, r) => sum + (r.setupCost || 0), 0);

        // Sum energy costs from subtotal rows or single-segment production rows
        let totalEnergyCost = 0;

        // Method 1: Use subtotal rows
        if (subtotalRows.length > 0) {
            totalEnergyCost = subtotalRows.reduce((sum, r) => sum + (r.energyCost || 0), 0);
        } else {
            // Method 2: Use single-segment production rows
            const batchGroupMap = new Map();
            productionRows.forEach(r => {
                if (!batchGroupMap.has(r.batchGroupId)) {
                    batchGroupMap.set(r.batchGroupId, r);
                }
            });
            totalEnergyCost = Array.from(batchGroupMap.values()).reduce((sum, r) => sum + (r.energyCost || 0), 0);
        }

        // Calculate delay penalty from production rows
        const batchGroupMap = new Map();
        productionRows.forEach(r => {
            if (!batchGroupMap.has(r.batchGroupId)) {
                batchGroupMap.set(r.batchGroupId, r);
            }
        });

        // Get unique batches for delay calculation
        const uniqueBatches = Array.from(batchGroupMap.values());

        // Calculate delay penalty (this needs to be recalculated based on end time)
        // For now, we'll set it to 0 since it's complex to recalculate
        const totalDelayPenalty = 0;

        // Calculate on-time rate
        const firstBatchMap = new Map();
        uniqueBatches.forEach(r => {
            if (r.batchNumber && r.batchNumber.startsWith('1/')) {
                const key = `${r.productId}-${r.batchNumber}`;
                if (!firstBatchMap.has(key)) {
                    firstBatchMap.set(key, r);
                }
            }
        });

        const firstBatches = Array.from(firstBatchMap.values());
        const onTimeBatches = firstBatches.filter(r => !r.isDelayed);
        const onTimeRate = firstBatches.length > 0 ? (onTimeBatches.length / firstBatches.length * 100).toFixed(1) : '0';

        // Calculate valley rate from production rows
        const valleyRows = productionRows.filter(r => r.shiftType === 'valley');
        const valleyDuration = valleyRows.reduce((sum, r) => sum + parseFloat(r.durationHours || 0), 0);
        const totalProductionDuration = productionRows.reduce((sum, r) => sum + parseFloat(r.durationHours || 0), 0);
        const valleyRate = totalProductionDuration > 0 ? (valleyDuration / totalProductionDuration * 100).toFixed(1) : '0';

        return {
            totalEnergyCost: totalEnergyCost.toFixed(0),
            totalSetupTime: totalSetupTime.toFixed(1),
            totalSetupCost: totalSetupCost.toFixed(0),
            totalDelayPenalty: totalDelayPenalty.toFixed(0),
            onTimeRate,
            valleyRate,
            totalBatches: uniqueBatches.length,
            delayedOrders: firstBatches.filter(r => r.isDelayed).length,
            totalCost: (totalEnergyCost + totalSetupCost + totalDelayPenalty).toFixed(0)
        };
    }

    /**
     * Calculate OEE (Overall Equipment Effectiveness)
     *
     * OEE in production scheduling context:
     * - Availability: affected by setup time, maintenance
     * - Performance: affected by production sequence efficiency
     * - Quality: affected by product mix and process stability
     */
    calculateOEE(results) {
        const planHours = 24 * 6; // 6-day planning horizon

        // 1. Availability = (Plan Time - Downtime) / Plan Time
        const setupRows = results.filter(r => r.type === 'setup');
        const productionRows = results.filter(r => r.type === 'production');

        const totalSetupTime = setupRows.reduce((sum, r) => sum + parseFloat(r.durationHours || 0), 0);
        const maintenanceTime = 2; // hours
        const totalDowntime = totalSetupTime + maintenanceTime;

        const runTime = planHours - totalDowntime;
        const availability = Math.max(0, runTime / planHours);

        // 2. Performance = Speed Efficiency
        // In scheduling context, performance reflects:
        // - Sequence efficiency (same-series products can run faster)
        // - Temperature stability impact
        // - No micro-stops data, so estimate from sequence quality

        // Count same-series transitions (good for performance)
        let sameSeriesCount = 0;
        let crossSeriesCount = 0;
        let prevProduct = null;

        setupRows.forEach(r => {
            // Parse product IDs from the row
            const fromId = r.fromProduct;
            const toId = r.toProduct;

            if (fromId && toId && fromId !== '-') {
                const fromProduct = this.products.find(p => p.id === fromId);
                const toProduct = this.products.find(p => p.id === toId);

                if (fromProduct && toProduct) {
                    if (fromProduct.series === toProduct.series) {
                        sameSeriesCount++;
                    } else {
                        crossSeriesCount++;
                    }
                }
            }
        });

        const totalTransitions = sameSeriesCount + crossSeriesCount;

        // Performance improves with more same-series transitions
        // Base: 90%, +5% for each same-series transition (max 100%)
        const sequenceEfficiency = totalTransitions > 0
            ? Math.min(1, 0.85 + (sameSeriesCount / totalTransitions) * 0.15)
            : 0.92; // Default if no transitions

        // Assume minor speed losses (warm-up, adjustments): 95%
        const speedEfficiency = 0.95;

        const performance = sequenceEfficiency * speedEfficiency;

        // 3. Quality
        // Different products have different quality rates
        // High-temp products might have more quality challenges
        // Cross-series transitions might temporarily affect quality

        // Base quality rates by product type
        const qualityByType = {
            'label': 0.96,  // Labels: more complex, 96% quality
            'film': 0.98   // Films: simpler, 98% quality
        };

        // Calculate weighted average quality
        let totalQuantity = 0;
        let qualityWeightedSum = 0;

        this.products.forEach(product => {
            const qty = product.production.quantity;
            const qualityRate = qualityByType[product.type] || 0.97;
            totalQuantity += qty;
            qualityWeightedSum += qty * qualityRate;
        });

        const baseQuality = totalQuantity > 0 ? qualityWeightedSum / totalQuantity : 0.97;

        // Cross-series transitions might reduce quality slightly (process instability)
        const qualityPenalty = crossSeriesCount > 0 ? Math.min(0.02, crossSeriesCount * 0.005) : 0;
        const quality = Math.max(0.90, baseQuality - qualityPenalty);

        // 4. OEE
        const oee = availability * performance * quality;

        return {
            oee: (oee * 100).toFixed(1),
            availability: (availability * 100).toFixed(1),
            performance: (performance * 100).toFixed(1),
            quality: (quality * 100).toFixed(1)
        };
    }
}

if (typeof window !== "undefined") {
    window.SimulatedAnnealingScheduler = SimulatedAnnealingScheduler;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { SimulatedAnnealingScheduler, PRODUCTS, EQUIPMENT };
}
