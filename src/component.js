export class Component {
    constructor(name, color, reactivity, viscosity, width, height) {
        this.name = name;
        this.color = color;
        this.reactivity = reactivity;
        this.viscosity = viscosity;
        this.width = width;
        this.height = height;
        this.buffer = this.createBuffer(width, height);
    }

    createBuffer(width, height) {
        return Array.from({ length: height }, () => new Array(width).fill(0));
    }

    getCell(x, y) {
        return this.buffer[y][x];
    }

    setCell(x, y, value) {
        this.buffer[y][x] = value;
    }

    clear() {
        this.buffer = this.createBuffer(this.width, this.height);
    }
}