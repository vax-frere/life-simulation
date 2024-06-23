export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.matrix = Array.from({ length: height }, () => Array(width).fill(0));
    }

    getCell(x, y) {
        return this.matrix[y][x];
    }

    setCell(x, y, value) {
        this.matrix[y][x] = value;
    }
}
