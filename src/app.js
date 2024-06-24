import { Grid } from './grid.js';
import { Component } from './component.js';
import { Simulation } from './simulation.js';
// implémenter Tweakpane en remplacement de dat.gui

const canvas = document.getElementById('world');
if (canvas) {
    const scale = 1; // Échelle de la grille (chaque cellule de la grille est de 5x5 pixels)
    canvas.width = 500; // Vous pouvez définir la largeur du canevas ici
    canvas.height = 500; // Vous pouvez définir la hauteur du canevas ici

    // Initialiser la grille pour le composant
    const componentGrid = new Grid(canvas.width / scale, canvas.height / scale);

    // Initialiser le composant avec des propriétés spécifiques
    const component = new Component('A', '#0000FF', 1.0, 0.2, componentGrid); // Couleur bleue spécifiée en hexadécimal, réactivité 1.0, viscosité 0.5

    // Initialiser la réaction chimique avec la grille du composant uniquement
    const simulation = new Simulation(canvas, component, scale);
} else {
    console.error('Canvas element not found');
}
