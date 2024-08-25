import { Grid } from './grid.js';
import { Component } from './component.js';
import { Simulation } from './simulation.js';
// implémenter Tweakpane en remplacement de dat.gui

const canvas = document.getElementById('world');
if (canvas) {
    const scale = 1; // Échelle de la grille (chaque cellule de la grille est de 5x5 pixels)
    canvas.width = 100; // Vous pouvez définir la largeur du canevas ici
    canvas.height = 100; // Vous pouvez définir la hauteur du canevas ici

    // Initialiser le composant avec des propriétés spécifiques (name, color, reactivity, viscosity, width, height)
    const componentA = new Component('A', '#000000', 0.5, 0.5);
    const componentB = new Component('B', '#FFAA00', 0.5, 0.5);

    // Initialiser la réaction chimique avec la grille du composant uniquement
    const simulation = new Simulation(canvas, [componentA, componentB], scale);
} else {
    console.error('Canvas element not found');
}
