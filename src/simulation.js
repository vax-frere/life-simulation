import Stats from 'stats.js';
import * as dat from 'dat.gui';
import { Grid } from './grid.js';

export class Simulation {
    constructor(canvas, component, scale) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('The parameter must be an HTMLCanvasElement');
        }
        if (!component || !component.grid) {
            throw new Error('The component must have a grid property');
        }

        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.time = 0;
        this.scale = scale; // Échelle pour ajuster la taille de la grille

        // Initialiser la grille
        this.component = component;
        this.depositedGrid = new Grid(this.component.grid.width, this.component.grid.height); // Grille pour suivre les composants déposés

        // État de la souris
        this.isMouseDown = false;

        // Ajouter des écouteurs d'événements pour la souris
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // Initialiser dat.gui
        this.gui = new dat.GUI();
        this.settings = {
            depositAmount: 255, // Valeur initiale de dépôt du composant (sur une échelle de 0 à 255)
            updateInterval: 10, // Intervalle de mise à jour en ms (approx. 60 FPS)
            viscosity: this.component.viscosity, // Viscosité initiale du composant
            totalComponent: '0' // Quantité totale initiale de composant
        };
        this.gui.add(this.settings, 'depositAmount', 1, 255).name('Deposit Amount');
        this.gui.add(this.settings, 'updateInterval', 10, 100).name('Update Interval (ms)');
        this.gui.add(this.settings, 'viscosity', 0, 1, 0.01).name('Viscosity').onChange((value) => {
            this.component.viscosity = value;
        });
        this.gui.add(this.settings, 'totalComponent').name('Total Component').listen();

        // Initialiser stats.js
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild(this.stats.dom);

        // Démarrer l'animation
        this.lastUpdate = Date.now();
        this.animate();
    }

    // Gérer l'événement mousedown
    handleMouseDown(event) {
        this.isMouseDown = true;
        this.addComponentAtMouse(event);
    }

    // Gérer l'événement mouseup
    handleMouseUp() {
        this.isMouseDown = false;
    }

    // Gérer l'événement mousemove
    handleMouseMove(event) {
        if (this.isMouseDown) {
            this.addComponentAtMouse(event);
        }
    }

    // Ajouter du composant aux coordonnées de la souris
    addComponentAtMouse(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) * (this.width / rect.width) / this.scale);
        const y = Math.floor((event.clientY - rect.top) * (this.height / rect.height) / this.scale);
        const currentValue = this.component.grid.getCell(x, y);
        const newValue = Math.min(255, currentValue + this.settings.depositAmount); // Utiliser la quantité spécifiée dans dat.gui (0-255)
        this.component.grid.setCell(x, y, newValue);
        this.depositedGrid.setCell(x, y, 1); // Marquer la cellule comme contenant un composant déposé
    }

    // Propager le composant aux cellules voisines en fonction de la viscosité
    spreadComponent() {
        const width = this.component.grid.width;
        const height = this.component.grid.height;
        const newMatrix = this.component.grid.matrix.map((row, y) => {
            return row.map((value, x) => {
                if (value > 0) {
                    const neighbors = [
                        [x - 1, y],
                        [x + 1, y],
                        [x, y - 1],
                        [x, y + 1]
                    ];

                    // Compter les voisins valides
                    const validNeighbors = neighbors.filter(([nx, ny]) => nx >= 0 && nx < width && ny >= 0 && ny < height);
                    const neighborCount = validNeighbors.length;

                    // Calculer la quantité à diffuser par voisin
                    const totalSpreadAmount = value * this.component.viscosity * 0.1;
                    const spreadAmountPerNeighbor = totalSpreadAmount / neighborCount;

                    // Distribuer la quantité diffusée et ajuster la cellule source
                    validNeighbors.forEach(([nx, ny]) => {
                        const currentNeighborValue = this.component.grid.getCell(nx, ny);
                        this.component.grid.setCell(nx, ny, Math.min(255, currentNeighborValue + spreadAmountPerNeighbor));
                    });

                    value -= totalSpreadAmount;
                }
                return value;
            });
        });

        this.component.grid.matrix = newMatrix;
    }

    // Convertir une couleur hexadécimale en composantes RGB
    hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
    }

    // Dessiner la grille du composant sur le canevas
    drawGrid() {
        const imageData = this.context.createImageData(this.width, this.height);

        // Dessiner la grille du composant
        const componentColor = this.hexToRgb(this.component.color);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const value = this.component.grid.getCell(Math.floor(x / this.scale), Math.floor(y / this.scale));
                const index = (y * this.width + x) * 4;
                imageData.data[index] = Math.floor(componentColor.r * (value / 255));
                imageData.data[index + 1] = Math.floor(componentColor.g * (value / 255));
                imageData.data[index + 2] = Math.floor(componentColor.b * (value / 255)); // Couleur du composant
                imageData.data[index + 3] = 255; // Opacité maximale
            }
        }

        this.context.putImageData(imageData, 0, 0);
    }

    // Calculer la quantité totale de composant sur la grille
    calculateTotalComponent() {
        let total = 0;
        this.component.grid.matrix.forEach(row => {
            row.forEach(value => {
                total += value;
            });
        });
        return Math.floor(total);
    }

    // Animer la diffusion
    animate() {
        this.stats.begin();

        const now = Date.now();
        if (now - this.lastUpdate >= this.settings.updateInterval) {
            this.spreadComponent();
            this.drawGrid();

            // Calculer et afficher la quantité totale de composant
            const totalComponent = this.calculateTotalComponent();
            this.settings.totalComponent = totalComponent.toString();

            this.lastUpdate = now;
        }

        this.stats.end();

        requestAnimationFrame(this.animate.bind(this));
    }
}
