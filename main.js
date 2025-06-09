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

// Make viz-features collapsible dropdowns with flex layout
document.addEventListener('DOMContentLoaded', function() {
    // Initialize collapsible viz-features with side-by-side layout
    const vizFeatures = document.querySelectorAll('.viz-features');
    
    vizFeatures.forEach((features, index) => {
        // Find the preceding viz-instructions element
        const instructions = features.previousElementSibling;
        if (!instructions || !instructions.classList.contains('viz-instructions')) {
            return; // Skip if no instructions found
        }
        
        // Create flex container
        const flexContainer = document.createElement('div');
        flexContainer.className = 'viz-flex-container';
        
        // Create wrapper for instructions
        const instructionsWrapper = document.createElement('div');
        instructionsWrapper.className = 'viz-instructions-wrapper';
        
        // Create wrapper for features
        const featuresWrapper = document.createElement('div');
        featuresWrapper.className = 'viz-features-wrapper';
        
        // Create toggle button/header
        const toggle = document.createElement('div');
        toggle.className = 'viz-features-toggle';
        toggle.innerHTML = `
            <span class="toggle-text">Show how to interact with this visualization</span>
        `;
        
        // Initially hide the features list
        features.style.display = 'none';
        features.classList.add('collapsed');
        
        // Insert flex container before the instructions
        instructions.parentNode.insertBefore(flexContainer, instructions);
        
        // Move instructions into its wrapper
        instructionsWrapper.appendChild(instructions);
        
        // Move features into its wrapper
        featuresWrapper.appendChild(toggle);
        featuresWrapper.appendChild(features);
        
        // Add wrappers to flex container
        flexContainer.appendChild(instructionsWrapper);
        flexContainer.appendChild(featuresWrapper);
        
        // Add click handler
        toggle.addEventListener('click', function() {
            const isCollapsed = features.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand: First trigger width change, then show content
                toggle.querySelector('.toggle-text').textContent = 'Hide interaction guide';
                toggle.classList.add('expanded');
                flexContainer.classList.add('features-expanded');
                
                // After width transition, show content
                setTimeout(() => {
                    features.style.display = 'block';
                    features.classList.remove('collapsed');
                }, 300); // Half of the width transition duration
            } else {
                // Collapse: First hide content, then change width
                features.style.display = 'none';
                features.classList.add('collapsed');
                
                // After content hides, trigger width transition
                setTimeout(() => {
                    toggle.querySelector('.toggle-text').textContent = 'Show how to interact with this visualization';
                    toggle.classList.remove('expanded');
                    flexContainer.classList.remove('features-expanded');
                }, 50); // Small delay for content to hide
            }
        });
    });
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

