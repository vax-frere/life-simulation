import { createNoise2D } from 'simplex-noise';

class Environment {
    constructor(canvas) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('The parameter must be an HTMLCanvasElement');
        }
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.width = 200;
        this.height = 200;
        this.canvas.width = this.width * 2; // Double the width to display both grids side by side
        this.canvas.height = this.height;
        this.time = 0;
        this.isMouseDown = false; // To track if the mouse is pressed

        this.fuelGrid = this.generateFuelGrid();
        this.heatGrid = this.generateHeatGrid();
        this.drawGrid();

        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

        this.animate();
    }

    generateFuelGrid() {
        const noise2D = new createNoise2D();
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                // Coarse noise
                const coarseNoise = (noise2D(x * 0.01, y * 0.01) + 1) / 2;

                // Fine noise
                const fineNoise = (noise2D(x * 0.1, y * 0.1) + 1) / 2;

                // Combine coarse and fine noise
                const value = (coarseNoise + fineNoise * 0.2) / 1.5; // Adjust weights as needed

                row.push(value);
            }
            grid.push(row);
        }
        return grid;
    }

    generateHeatGrid() {
        const grid = [];
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        const squareSize = 1; // size of the central square

        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                if (x >= centerX - squareSize / 2 && x <= centerX + squareSize / 2 &&
                    y >= centerY - squareSize / 2 && y <= centerY + squareSize / 2) {
                    row.push(.1); // heat value in the central square
                } else {
                    row.push(0); // default heat value
                }
            }
            grid.push(row);
        }
        return grid;
    }
    drawGrid() {
        const heatImageData = this.context.createImageData(this.width, this.height);
        const fuelImageData = this.context.createImageData(this.width, this.height);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const heatValue = this.heatGrid[y][x] * 255;
                const fuelValue = this.fuelGrid[y][x] * 255;

                const heatIndex = (y * this.width + x) * 4;
                const fuelIndex = (y * this.width + x) * 4;

                // Set heat map color to red
                heatImageData.data[heatIndex] = heatValue; // Red
                heatImageData.data[heatIndex + 1] = 0; // Green
                heatImageData.data[heatIndex + 2] = 0; // Blue
                heatImageData.data[heatIndex + 3] = 255; // Alpha

                // Set fuel map color to green
                fuelImageData.data[fuelIndex] = 0; // Red
                fuelImageData.data[fuelIndex + 1] = fuelValue; // Green
                fuelImageData.data[fuelIndex + 2] = 0; // Blue
                fuelImageData.data[fuelIndex + 3] = 255; // Alpha
            }
        }

        this.context.putImageData(heatImageData, 0, 0); // Draw heat grid on the left
        this.context.putImageData(fuelImageData, this.width, 0); // Draw fuel grid on the right
    }
    diffuse() {
        const newHeatGrid = this.heatGrid.map(row => row.slice());
        const newFuelGrid = this.fuelGrid.map(row => row.slice());

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.heatGrid[y][x] > 0) { // Only propagate if there's heat
                    const heatValue = this.heatGrid[y][x];

                    const neighbors = [
                        [x - 1, y],
                        [x + 1, y],
                        [x, y - 1],
                        [x, y + 1]
                    ];

                    let hasFuel = false;

                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && ny >= 0 && nx < this.width && ny < this.height) {
                            if (this.fuelGrid[ny][nx] > 0) { // Check if there is fuel to burn
                                hasFuel = true;
                                const fuelAmount = this.fuelGrid[ny][nx];
                                const heatIncrease = heatValue * 0.02 * fuelAmount; // Adjust heat increase by fuel amount
                                newHeatGrid[ny][nx] = Math.min(1, newHeatGrid[ny][nx] + heatIncrease); // Spread a smaller portion of the heat
                                newFuelGrid[ny][nx] = Math.max(0, newFuelGrid[ny][nx] - heatIncrease); // Reduce fuel proportionally
                            }
                        }
                    }

                    if (!hasFuel) {
                        newHeatGrid[y][x] = Math.max(0, newHeatGrid[y][x] - 0.01); // Decrease heat over time if no fuel
                    } else {
                        newHeatGrid[y][x] = Math.max(0, newHeatGrid[y][x] - 0.0001); // Always decrease heat slightly even if there is fuel
                    }
                }
            }
        }

        this.heatGrid = newHeatGrid;
        this.fuelGrid = newFuelGrid;
    }
    handleMouseDown(event) {
        this.isMouseDown = true;
        this.addHeat(event);
    }

    handleMouseUp() {
        this.isMouseDown = false;
    }

    handleMouseMove(event) {
        if (this.isMouseDown) {
            this.addHeat(event);
        }
    }

    addHeat(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) * (this.width / rect.width));
        const y = Math.floor((event.clientY - rect.top) * (this.height / rect.height));
        this.heatGrid[y][x] = 1; // Set the heat value to maximum (1)
    }

    animate() {
        this.time += 1;
        this.diffuse();
        this.drawGrid();
        requestAnimationFrame(this.animate.bind(this));
    }
}

// Example usage:
const canvas = document.getElementById('world');
if (canvas) {
    const environment = new Environment(canvas);
} else {
    console.error('Canvas element not found');
}
