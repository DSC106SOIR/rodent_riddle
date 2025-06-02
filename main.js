import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { createCircadianVisualization } from './circadian.js';
import { createActivityRankVisualization } from './activity_rank.js';
import { compareTemperatureChart } from './tempLine.js';
import { drawActivityPieChart } from './activity-piechart.js'; 


// Execute visualizations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Render circadian visualization
    createCircadianVisualization();

    // Render activity ranking visualization
    createActivityRankVisualization();
    
    // Render activity visualization for all mice
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                drawActivityPieChart(); 
            }
        });
    }, {
        threshold: 1.0  
    });

    const activitySection = document.getElementById("activity_overall"); 
    if (activitySection) {
        observer.observe(activitySection); 
    }
    // Render temperature visualization for estrus/other days
    compareTemperatureChart(); 

    // Render other visualizations ...
});

