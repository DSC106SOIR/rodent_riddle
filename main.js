import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { createCircadianVisualization } from './circadian.js';
import { compareTemperatureChart } from './tempLine.js';

// Execute circadian visualization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Render circadian visualization
    createCircadianVisualization();
    compareTemperatureChart(); 
    // Render other visualizations ...
});

