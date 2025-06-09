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

document.addEventListener('DOMContentLoaded', function() {
  const sections = Array.from(document.querySelectorAll('.scroll-page'));
  const navDots = document.getElementById('nav-dots');
  if (!navDots || sections.length === 0) return;

  let current = 0;
  let isTransitioning = false;
  let touchStartY = null;

  function showSection(idx) {
    if (isTransitioning || idx === current || idx < 0 || idx >= sections.length) return;
    isTransitioning = true;
    sections[current].classList.remove('fade-active');
    navDots.querySelectorAll('.nav-dot')[current].classList.remove('active');
    current = idx;
    sections[current].classList.add('fade-active');
    navDots.querySelectorAll('.nav-dot')[current].classList.add('active');
    setTimeout(() => { isTransitioning = false; }, 800);
  }

  // Initial state
  sections.forEach((s, i) => s.classList.toggle('fade-active', i === 0));
  navDots.innerHTML = '';
  sections.forEach((section, idx) => {
    const dot = document.createElement('div');
    dot.className = 'nav-dot' + (idx === 0 ? ' active' : '');
    dot.setAttribute('data-index', idx);
    dot.addEventListener('click', () => showSection(idx));
    navDots.appendChild(dot);
  });

  function nextSection() { showSection(current + 1); }
  function prevSection() { showSection(current - 1); }

  // Wheel event
  window.addEventListener('wheel', (e) => {
    if (isTransitioning) return;
    if (e.deltaY > 30) nextSection();
    else if (e.deltaY < -30) prevSection();
    e.preventDefault();
  }, { passive: false });

  // Keyboard event
  window.addEventListener('keydown', (e) => {
    if (isTransitioning) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') nextSection();
    if (e.key === 'ArrowUp' || e.key === 'PageUp') prevSection();
  });

  // Touch events for mobile
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) touchStartY = e.touches[0].clientY;
  });
  window.addEventListener('touchend', (e) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSection();
      else prevSection();
    }
    touchStartY = null;
  });

  // Prevent default scroll
  window.addEventListener('scroll', (e) => {
    window.scrollTo(0, 0);
    e.preventDefault();
  });
});

