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

// Clean H2-based section navigation
document.addEventListener('DOMContentLoaded', function() {
    // Find all h2 elements that should serve as section headers
    const sections = Array.from(document.querySelectorAll('h2')).filter(h2 => {
        // Exclude game-related h2s and only include main content sections
        return !h2.closest('#game-section') && !h2.classList.contains('game-title');
    });
    
    if (sections.length === 0) return;

    // Create navigation dots
    const navDots = document.createElement('div');
    navDots.id = 'nav-dots';
    document.body.appendChild(navDots);

    let currentSection = 0;

    // Create navigation dots
    sections.forEach((section, idx) => {
        const dot = document.createElement('div');
        dot.className = 'nav-dot' + (idx === 0 ? ' active' : '');
        dot.setAttribute('data-index', idx);
        dot.setAttribute('title', section.textContent.trim());
        dot.addEventListener('click', () => scrollToSection(idx));
        navDots.appendChild(dot);
    });

    function scrollToSection(idx) {
        if (idx < 0 || idx >= sections.length) return;
        
        sections[idx].scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        updateActiveSection(idx);
    }

    function updateActiveSection(idx) {
        // Update navigation dots
        navDots.querySelectorAll('.nav-dot').forEach((dot, dotIdx) => {
            dot.classList.toggle('active', dotIdx === idx);
        });
        currentSection = idx;
    }

    // Track scroll position to update active section
    function updateActiveOnScroll() {
        let activeIdx = 0;
        const scrollY = window.scrollY + 100; // Small offset for better detection

        sections.forEach((section, idx) => {
            const rect = section.getBoundingClientRect();
            const sectionTop = window.scrollY + rect.top;
            
            if (scrollY >= sectionTop) {
                activeIdx = idx;
            }
        });

        if (activeIdx !== currentSection) {
            updateActiveSection(activeIdx);
        }
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            scrollToSection(currentSection + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            scrollToSection(currentSection - 1);
        }
    });

    // Scroll tracking - immediate response without throttling
    window.addEventListener('scroll', updateActiveOnScroll, { passive: true });

    // Initialize
    updateActiveOnScroll();
});

