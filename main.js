import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { createCircadianVisualization } from './circadian.js';
import { createActivityRankVisualization } from './activity_rank.js';
import { compareTemperatureChart } from './tempLine.js';
import { createHourlyTemps } from './hourly_temps.js';
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

// Create the hourly average temperatures plot
document.addEventListener('DOMContentLoaded', () => {
    createHourlyTemps();
});

// navigation for page
document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('.scroll-page');
  const navDots = document.getElementById('nav-dots');
  if (!navDots || sections.length === 0) return;

  // Create dots
  navDots.innerHTML = '';
  sections.forEach((section, idx) => {
    const dot = document.createElement('div');
    dot.className = 'nav-dot';
    dot.setAttribute('data-index', idx);
    dot.addEventListener('click', () => {
      section.scrollIntoView({ behavior: 'smooth' });
    });
    navDots.appendChild(dot);
  });

  function updateActiveDot() {
    let activeIdx = 0;
    const scrollY = window.scrollY;
    const buffer = window.innerHeight / 3;
    sections.forEach((section, idx) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= buffer && rect.bottom > buffer) {
        activeIdx = idx;
      }
    });
    navDots.querySelectorAll('.nav-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIdx);
    });
  }

  window.addEventListener('scroll', updateActiveDot);
  window.addEventListener('resize', updateActiveDot);
  updateActiveDot();
});

