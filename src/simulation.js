import Stats from 'stats.js';
import { Pane } from 'tweakpane';
import { Component } from './component.js';


export class Simulation {
    constructor(canvas, componentSpecs, scale) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('The parameter must be an HTMLCanvasElement');
        }
        if (!Array.isArray(componentSpecs) || componentSpecs.length === 0) {
            throw new Error('At least one component specification must be provided');
        }

        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.scale = scale;

        const gridWidth = Math.floor(this.width / this.scale);
        const gridHeight = Math.floor(this.height / this.scale);

        this.components = componentSpecs.map(spec =>
            new Component(spec.name, spec.color, spec.reactivity, spec.viscosity, gridWidth, gridHeight)
        );

        this.isMouseDown = false;

        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

        this.initTweakpane();
        this.initStats();

        this.lastUpdate = Date.now();
        this.animate();
    }

    initTweakpane() {

        this.pane = new Pane();
        this.settings = {
            depositAmount: 255,
            updateInterval: 10,
            maxTotalComponent: 1000000,
            maxCellCapacity: 255
        };

        this.pane = new Pane();

        this.pane.addBinding(this.settings, 'depositAmount', { min: 1, max: 255, step: 1 });
        this.pane.addBinding(this.settings, 'updateInterval', { min: 10, max: 100, step: 1 });
        this.pane.addBinding(this.settings, 'maxTotalComponent', { min: 100000, max: 10000000, step: 100000 });
        this.pane.addBinding(this.settings, 'maxCellCapacity', {
            min: 1,
            max: 1000,
            step: 1,
            label: 'Max Cell Capacity'
        });

        this.componentSettings = this.components.map(component => ({
            name: component.name,
            viscosity: component.viscosity,
            reactivity: component.reactivity,
            totalAmount: 0
        }));

        this.componentSettings.forEach((settings, index) => {
            const folder = this.pane.addFolder({ title: settings.name });
            folder.addBinding(settings, 'viscosity', { min: 0, max: 1, step: 0.01 })
                .on('change', (ev) => {
                    this.components[index].viscosity = ev.value;
                });
            folder.addBinding(settings, 'reactivity', { min: 0, max: 1, step: 0.01 })
                .on('change', (ev) => {
                    this.components[index].reactivity = ev.value;
                });
            folder.addBinding(settings, 'totalAmount', {
                label: 'Total Amount',
                readonly: true
            });
        });
    }

    initStats() {
        this.stats = new Stats();
        this.stats.showPanel(0);
        document.body.appendChild(this.stats.dom);
    }

    handleMouseDown(event) {
        this.isMouseDown = true;
        this.addComponentAtMouse(event);
    }

    handleMouseUp() {
        this.isMouseDown = false;
    }

    handleMouseMove(event) {
        if (this.isMouseDown) {
            this.addComponentAtMouse(event);
        }
    }

    addComponentAtMouse(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) * (this.width / rect.width) / this.scale);
        const y = Math.floor((event.clientY - rect.top) * (this.height / rect.height) / this.scale);

        if (this.isValidCell(x, y)) {
            const componentIndex = event.ctrlKey ? 1 : 0;
            const component = this.components[componentIndex];
            const currentValue = component.getCell(x, y);
            const otherComponentValue = this.components[1 - componentIndex].getCell(x, y);
            const newValue = Math.min(
                this.settings.maxCellCapacity - otherComponentValue,
                currentValue + this.settings.depositAmount
            );
            component.setCell(x, y, newValue);
        }
    }

    isValidCell(x, y) {
        return x >= 0 && x < this.width / this.scale && y >= 0 && y < this.height / this.scale;
    }

    spreadComponents() {
        const tempBuffers = this.components.map(component =>
            component.createBuffer(component.width, component.height)
        );

        this.components.forEach((component, index) => {
            const tempBuffer = tempBuffers[index];

            for (let y = 0; y < component.height; y++) {
                for (let x = 0; x < component.width; x++) {
                    let value = component.getCell(x, y);
                    if (value > 0) {
                        const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                        const validNeighbors = neighbors.filter(([nx, ny]) => this.isValidCell(nx, ny));
                        const neighborCount = validNeighbors.length;

                        const spreadAmountTotal = Math.floor(value * component.viscosity);
                        const spreadAmountPerNeighbor = Math.floor(spreadAmountTotal / neighborCount);

                        validNeighbors.forEach(([nx, ny]) => {
                            const otherComponentValue = this.components
                                .filter((_, i) => i !== index)
                                .reduce((sum, c) => sum + c.getCell(nx, ny), 0);
                            const availableCapacity = this.settings.maxCellCapacity - otherComponentValue;
                            const actualSpreadAmount = Math.min(
                                availableCapacity - tempBuffer[ny][nx],
                                spreadAmountPerNeighbor
                            );
                            tempBuffer[ny][nx] += actualSpreadAmount;
                            value -= actualSpreadAmount;
                        });
                    }
                    tempBuffer[y][x] += value;
                }
            }
        });

        this.components.forEach((component, index) => {
            component.buffer = tempBuffers[index];
        });

        this.handleComponentInteractions();
    }

    handleComponentInteractions() {
        const [compA, compB] = this.components;

        for (let y = 0; y < compA.height; y++) {
            for (let x = 0; x < compA.width; x++) {
                let amountA = compA.getCell(x, y);
                let amountB = compB.getCell(x, y);

                while (amountA >= 2 && amountB >= 1 && (amountB + 3) <= this.settings.maxCellCapacity) {
                    amountA -= 2;
                    amountB -= 1;
                    amountB += 3;
                }

                compA.setCell(x, y, amountA);
                compB.setCell(x, y, Math.min(amountB, this.settings.maxCellCapacity));
            }
        }
    }

    hexToHsl(hex) {
        // Convertir hex en RGB
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatique
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h, s, l];
    }

    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatique
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    drawGrid() {
        const imageData = this.context.createImageData(this.width, this.height);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const index = (y * this.width + x) * 4;
                const cellX = Math.floor(x / this.scale);
                const cellY = Math.floor(y / this.scale);

                let totalConcentration = 0;
                let colors = [];

                this.components.forEach((component, idx) => {
                    const value = component.getCell(cellX, cellY);
                    totalConcentration += value;

                    const [h, s, l] = this.hexToHsl(component.color);
                    const saturation = value / this.settings.maxCellCapacity;

                    colors.push({
                        rgb: this.hslToRgb(h, saturation, l),
                        concentration: value
                    });
                });

                if (totalConcentration > 0) {
                    let r = 0, g = 0, b = 0;
                    colors.forEach(color => {
                        const ratio = color.concentration / totalConcentration;
                        r += color.rgb[0] * ratio;
                        g += color.rgb[1] * ratio;
                        b += color.rgb[2] * ratio;
                    });

                    imageData.data[index] = Math.min(255, Math.round(r));
                    imageData.data[index + 1] = Math.min(255, Math.round(g));
                    imageData.data[index + 2] = Math.min(255, Math.round(b));
                    imageData.data[index + 3] = 255;
                } else {
                    imageData.data[index] = 255;
                    imageData.data[index + 1] = 255;
                    imageData.data[index + 2] = 255;
                    imageData.data[index + 3] = 255;
                }
            }
        }

        this.context.putImageData(imageData, 0, 0);
    }

    calculateTotalComponent(component) {
        return component.buffer.reduce((total, row) =>
            total + row.reduce((rowTotal, value) => rowTotal + value, 0), 0);
    }

    animate() {
        this.stats.begin();

        const now = Date.now();
        if (now - this.lastUpdate >= this.settings.updateInterval) {
            this.spreadComponents();
            this.drawGrid();

            this.components.forEach((component, index) => {
                this.componentSettings[index].totalAmount = this.calculateTotalComponent(component);
            });

            this.pane.refresh();

            this.lastUpdate = now;
        }

        this.stats.end();

        requestAnimationFrame(this.animate.bind(this));
    }
}

// Usage:
// const canvas = document.getElementById('world');
// const componentA = new Component('A', '#FF0000', 0.5, 0.2);
// const componentB = new Component('B', '#0000FF', 0.3, 0.4);
// const simulation = new Simulation(canvas, [componentA, componentB], 5);