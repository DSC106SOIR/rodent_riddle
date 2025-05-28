import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Constants for visualization configuration
const VISUALIZATION = {
    MARGIN: { top: 20, right: 20, bottom: 60, left: 60 },
    TOTAL_WIDTH: 1000,
    PLOT_HEIGHT: 300,
    CONTROL_HEIGHT: 80,
    PLOT_GAP: 10,
    POSITION_BUFFER: 2,
    POINT_RADIUS: 6,
    POINT_STROKE_WIDTH: 0.1,
    ANIMATION_FRAME_DURATION: 100,
    TIME_INCREMENT: 5,
    ACTIVITY_MOVEMENT_SCALE: 50,
    VELOCITY_DAMPING: 0.8,
    MIN_VELOCITY: 0.3,
    DOMAIN_BUFFER_PERCENTAGE: 0.05,
    BACKGROUND_OPACITY: 0.45,
    MIN_MOUSE_DISTANCE_FROM_EDGE: 5,
    POINT_OPACITY: 0.9,
    POINT_HOVER_OPACITY: 1.0
};

// Constants for temperature and activity ranges
const TEMPERATURE = {
    MIN: 35,
    MAX: 39
};

const ACTIVITY = {
    MIN: 0,
    MAX: 100
};

// Constants for day/night cycle
const CYCLE = {
    MINUTES_PER_DAY: 1440,
    MINUTES_PER_HALF_DAY: 720
};

// This file implements circadian rhythm visualization

export async function createCircadianVisualization() {
    // Load the combined minute-level data for detailed animation
    const combinedData = await d3.json('./data/combined_minutes.json');

    // Get unique mice and time range
    const mice = [...new Set(combinedData.map(d => d.id))];
    const timeExtent = d3.extent(combinedData, d => d.time);
    const maxTime = timeExtent[1];

    // Set up dimensions
    const margin = VISUALIZATION.MARGIN;
    const container = d3.select('#circadian-viz');
    const totalWidth = Math.min(container.node().getBoundingClientRect().width - margin.left - margin.right, VISUALIZATION.TOTAL_WIDTH);
    const plotHeight = VISUALIZATION.PLOT_HEIGHT;
    const tempActPlotSize = plotHeight; // Square plot
    const mainPlotWidth = totalWidth - tempActPlotSize - VISUALIZATION.PLOT_GAP; // Remaining width minus gap
    const controlHeight = VISUALIZATION.CONTROL_HEIGHT;

    // Create plots container
    const plotsContainer = container.append('div')
        .style('display', 'flex')
        .style('gap', `${VISUALIZATION.PLOT_GAP}px`)
        .style('align-items', 'flex-start');

    // Create main movement plot SVG
    const mainSvg = plotsContainer.append('svg')
        .attr('width', mainPlotWidth + margin.left + margin.right)
        .attr('height', plotHeight + margin.top + margin.bottom);

    const mainPlot = mainSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add background for main plot
    const mainBackground = mainPlot.append('rect')
        .attr('width', mainPlotWidth)
        .attr('height', plotHeight)
        .attr('fill', 'var(--color-night)')
        .attr('opacity', 0.3);

    // Add title for main plot
    mainSvg.append('text')
        .attr('class', 'plot-title')
        .attr('x', margin.left)  // Align with left margin
        .attr('y', 14)
        .attr('text-anchor', 'start')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.9em')
        .text('Mouse activity level (movement) & Temperature (color)');

    // Add light status text
    const lightStatus = mainSvg.append('g')
        .attr('transform', `translate(${mainPlotWidth + 52}, 14)`);  // Remove margin.left to align with plot edge

    // Add background rectangle for light status
    const lightStatusBg = lightStatus.append('rect')
        .attr('class', 'light-status-bg')
        .attr('y', -14)
        .attr('height', 16)
        .attr('fill', 'var(--color-night)')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('opacity', VISUALIZATION.BACKGROUND_OPACITY);

    const lightStatusText = lightStatus.append('text')
        .attr('y', -1)
        .attr('class', 'light-status')
        .attr('text-anchor', 'end');

    // Add temperature colorbar
    const colorbarWidth = mainPlotWidth * 0.95;  // % of plot width
    const colorbarHeight = 12;
    const colorbarX = margin.left + (mainPlotWidth - colorbarWidth) / 2;  // Center horizontally
    const colorbarY = plotHeight + margin.top + 25;

    // Set up color scale for temperature
    const tempColorScale = d3.scaleSequential(d3.interpolateRdYlBu)
        .domain([TEMPERATURE.MAX, TEMPERATURE.MIN]); // Reverse for cool to warm

    // Create gradient definition
    const defs = mainSvg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'temp-gradient')
        .attr('x1', '0%')
        .attr('x2', '100%')
        .attr('y1', '0%')
        .attr('y2', '0%');

    // Add color stops to gradient
    const numStops = 20;
    for (let i = 0; i <= numStops; i++) {
        const percent = (i / numStops) * 100;
        const temp = TEMPERATURE.MIN + (i / numStops) * (TEMPERATURE.MAX - TEMPERATURE.MIN);
        gradient.append('stop')
            .attr('offset', `${percent}%`)
            .attr('stop-color', tempColorScale(temp));
    }

    // Add colorbar rectangle
    mainSvg.append('rect')
        .attr('x', colorbarX)
        .attr('y', colorbarY)
        .attr('width', colorbarWidth)
        .attr('height', colorbarHeight)
        .style('fill', 'url(#temp-gradient)')

    // Add temperature labels
    mainSvg.append('text')
        .attr('x', colorbarX)
        .attr('y', colorbarY + colorbarHeight + 12)
        .attr('text-anchor', 'start')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.8em')
        .text(`${TEMPERATURE.MIN}°C`);

    mainSvg.append('text')
        .attr('x', colorbarX + colorbarWidth)
        .attr('y', colorbarY + colorbarHeight + 12)
        .attr('text-anchor', 'end')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.8em')
        .text(`${TEMPERATURE.MAX}°C`);

    mainSvg.append('text')
        .attr('x', colorbarX + colorbarWidth / 2)
        .attr('y', colorbarY + colorbarHeight + 12)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.8em')
        .text('Temperature');

    // Add axes labels for main plot
    mainSvg.append('text')
        .attr('class', 'axis-label')
        .attr('x', margin.left)  // Align with left margin
        .attr('y', plotHeight + margin.top + 40)
        .attr('text-anchor', 'start')  // Left align

    mainSvg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(15, ${margin.top + plotHeight / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')  // Keep middle for vertical text

    // Create temperature-activity plot SVG
    const tempActSvg = plotsContainer.append('svg')
        .attr('width', tempActPlotSize + margin.left + margin.right)
        .attr('height', tempActPlotSize + margin.top + margin.bottom);

    const tempActPlot = tempActSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add background for temp-act plot
    const tempActBackground = tempActPlot.append('rect')
        .attr('width', tempActPlotSize)
        .attr('height', tempActPlotSize)
        .attr('fill', 'var(--color-night)')
        .attr('opacity', 0.3);

    // Add title for temp-act plot
    tempActSvg.append('text')
        .attr('x', (tempActPlotSize + margin.left + margin.right) / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('fill', 'var(--color-accent)')

    // Set up scales for temperature-activity plot with reasonable domains
    const tempExtent = d3.extent(combinedData, d => d.temp);
    const actExtent = d3.extent(combinedData, d => d.act);

    // Use reasonable fixed domains with buffers for visual spacing
    const tempRange = TEMPERATURE.MAX - TEMPERATURE.MIN;
    const tempBuffer = tempRange * VISUALIZATION.DOMAIN_BUFFER_PERCENTAGE;
    const tempDomain = [TEMPERATURE.MIN - tempBuffer, TEMPERATURE.MAX + tempBuffer];
    
    const actRange = ACTIVITY.MAX - ACTIVITY.MIN;
    const actBuffer = actRange * VISUALIZATION.DOMAIN_BUFFER_PERCENTAGE;
    const actDomain = [ACTIVITY.MIN - actBuffer, ACTIVITY.MAX + actBuffer];

    const tempScale = d3.scaleLinear()
        .domain(tempDomain)
        .range([0, tempActPlotSize]);

    const actScale = d3.scaleLinear()
        .domain(actDomain)
        .range([tempActPlotSize, 0]);

    // Add buffers to main plot positioning (keep points away from edges)
    const positionBuffer = VISUALIZATION.POSITION_BUFFER;
    const effectivePlotWidth = mainPlotWidth - 2 * positionBuffer;
    const effectivePlotHeight = plotHeight - 2 * positionBuffer;

    // Add axes for temperature-activity plot
    const tempAxis = d3.axisBottom(tempScale);
    const actAxis = d3.axisLeft(actScale);

    tempActPlot.append('g')
        .attr('class', 'temp-axis')
        .attr('transform', `translate(0,${tempActPlotSize})`)
        .call(tempAxis);

    tempActPlot.append('g')
        .attr('class', 'act-axis')
        .call(actAxis);

    // Add axes labels for temp-act plot
    tempActSvg.append('text')
        .attr('x', margin.left + tempActPlotSize / 2)
        .attr('y', tempActPlotSize + margin.top + 40)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.9em')
        .text('Temperature (°C)');

    tempActSvg.append('text')
        .attr('transform', `translate(25, ${margin.top + tempActPlotSize / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.9em')
        .text('Activity Level');

    // Initialize random positions for each mouse
    const mousePositions = {};
    mice.forEach(mouseId => {
        mousePositions[mouseId] = {
            x: positionBuffer + Math.random() * effectivePlotWidth,
            y: positionBuffer + Math.random() * effectivePlotHeight,
            vx: 0,
            vy: 0
        };
    });

    // Create controls
    const controlsContainer = container.append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('gap', '5px')

    // Time slider
    const sliderContainer = controlsContainer.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '5px')

    sliderContainer.append('label')
        .text('Time')
        .style('color', 'var(--color-accent)');

    const timeSlider = sliderContainer.append('input')
        .attr('type', 'range')
        .attr('min', timeExtent[0])
        .attr('max', timeExtent[1])
        .attr('value', timeExtent[0])
        .attr('step', 1)
        .style('width', '400px');

    // Function to format time display parts
    function getTimeDisplayParts(time) {
        const cycleLength = CYCLE.MINUTES_PER_DAY;
        const cycleNumber = Math.floor(time / cycleLength) + 1;
        const isDay = getDayNightOpacity(time) > 0.5;
        const period = isDay ? 'day' : 'night';
        const minuteText = time === 1 ? 'minute' : 'minutes';
        return {
            timeNumber: time,
            staticText: ` ${minuteText}, ${period} ${cycleNumber}`
        };
    }

    const timeDisplayContainer = sliderContainer.append('span')
        .style('min-width', '200px')
        .style('display', 'inline-block');

    const timeNumber = timeDisplayContainer.append('span')
        .style('color', 'var(--color-accent)')
        .style('display', 'inline-block')
        .style('min-width', '3em') 
        .style('text-align', 'right')
        .style('margin-right', '0.1em');

    const timeStaticText = timeDisplayContainer.append('span')
        .style('color', 'var(--color-accent)');

    // Initialize display
    const initialParts = getTimeDisplayParts(timeExtent[0]);
    timeNumber.text(initialParts.timeNumber);
    timeStaticText.text(initialParts.staticText);

    // Play/pause controls
    const buttonContainer = controlsContainer.append('div')
        .style('display', 'flex')
        .style('gap', '10px');

    const playButton = buttonContainer.append('button')
        .text('Play')
        .style('padding', '8px 16px')
        .style('background-color', 'var(--color-secondary)')
        .style('color', 'white')
        .style('border', 'none')
        .style('border-radius', '4px')
        .style('cursor', 'pointer');

    const resetButton = buttonContainer.append('button')
        .text('Reset')
        .style('padding', '8px 16px')
        .style('background-color', 'var(--color-accent)')
        .style('color', 'white')
        .style('border', 'none')
        .style('border-radius', '4px')
        .style('cursor', 'pointer');

    // Animation state
    let isPlaying = false;
    let animationId = null;
    let currentTime = timeExtent[0];
    let wasPlayingBeforeHover = false; // Track if animation was playing before hover

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .style('position', 'absolute')
        .style('background', 'var(--color-accent)')
        .style('color', 'var(--color-light)')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1000);

    // Function to pause animation on hover
    function pauseOnHover() {
        if (isPlaying) {
            wasPlayingBeforeHover = true;
            isPlaying = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }
    }

    const sliderContainer = controlsContainer.append('div')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('gap', '5px');

    // Day Jump Dropdown
const dayJumpContainer = controlsContainer.append('div')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('gap', '5px');

dayJumpContainer.append('label')
    .text('Jump to Day:')
    .style('color', 'var(--color-accent)');

const totalDays = Math.ceil(maxTime / CYCLE.MINUTES_PER_DAY);
const daySelect = dayJumpContainer.append('select')
    .style('padding', '5px')
    .style('border-radius', '4px')
    .style('border', '1px solid var(--color-accent)')
    .style('background-color', 'white')
    .style('color', 'var(--color-accent)');

// Populate options
for (let i = 1; i <= totalDays; i++) {
    daySelect.append('option')
        .attr('value', (i - 1) * CYCLE.MINUTES_PER_DAY)
        .text(`Day ${i}`);
}

// Event listener to update time
daySelect.on('change', function () {
    const selectedTime = +this.value;
    updateVisualization(selectedTime);
    isPlaying = false;
    playButton.text('Play');
    if (animationId) cancelAnimationFrame(animationId);
});

    // Function to resume animation when leaving hover
    function resumeOnLeave() {
        if (wasPlayingBeforeHover) {
            isPlaying = true;
            wasPlayingBeforeHover = false;
            animate();
        }
        tooltip.style('opacity', 0);
    }

    // Function to show tooltip and highlight corresponding points
    function showTooltip(event, d) {
        tooltip.transition()
            .duration(200)
            .style('opacity', 0.75);
        
        tooltip.html(`
            <div><strong>Mouse ID:</strong> ${d.id}</div>
            <div><strong>Sex:</strong> ${d.sex === 'male' ? 'Male' : 'Female'}</div>
            <div><strong>Temperature:</strong> ${d.temp.toFixed(1)}°C</div>
            <div><strong>Activity level:</strong> ${Math.round(d.act)}</div>
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');

        // Highlight corresponding points in both plots
        mainPlot.selectAll('.mouse-point')
            .filter(point => point.id === d.id)
            .attr('r', VISUALIZATION.POINT_RADIUS * 2);

        tempActPlot.selectAll('.temp-act-point')
            .filter(point => point.id === d.id)
            .attr('r', VISUALIZATION.POINT_RADIUS * 2);
    }

    // Function to hide tooltip and reset point sizes
    function hideTooltip() {
        tooltip.transition()
            .duration(500)
            .style('opacity', 0);

        // Reset all point sizes in both plots
        mainPlot.selectAll('.mouse-point')
            .attr('r', VISUALIZATION.POINT_RADIUS);

        tempActPlot.selectAll('.temp-act-point')
            .attr('r', VISUALIZATION.POINT_RADIUS);
    }

    // Function to calculate day/night background opacity using sine wave
    function getDayNightOpacity(time) {
        const phase = (time % CYCLE.MINUTES_PER_DAY) / CYCLE.MINUTES_PER_DAY * 2 * Math.PI;
        // Start at night (time 0), so offset by PI to start in night phase
        const opacity = (Math.sin(phase - Math.PI) + 1) / 2;
        return opacity; // 0 = night, 1 = day
    }

    // Function to update visualization
    function updateVisualization(time) {
        currentTime = time;
        const parts = getTimeDisplayParts(Math.round(time));
        timeNumber.text(parts.timeNumber);
        timeStaticText.text(parts.staticText);
        timeSlider.property('value', time);

        // Get current day/night state
        const dayOpacity = getDayNightOpacity(time);
        const isDay = dayOpacity > 0.5;
        
        // Update light status
        lightStatusText.text(`Light ${isDay ? 'ON' : 'OFF'}`);
        const textWidth = lightStatusText.node().getComputedTextLength();
        lightStatusBg
            .attr('width', textWidth + 16)
            .attr('x', -textWidth - 8)
            .attr('fill', isDay ? 'var(--color-day)' : 'var(--color-night)')
            .attr('opacity', Math.max(dayOpacity, 1 - dayOpacity) * VISUALIZATION.BACKGROUND_OPACITY);

        // Update day/night background
        const nightOpacity = 1 - dayOpacity;
        
        mainBackground
            .attr('fill', isDay ? 'var(--color-day)' : 'var(--color-night)')
            .attr('opacity', Math.max(dayOpacity, nightOpacity) * VISUALIZATION.BACKGROUND_OPACITY);

        tempActBackground
            .attr('fill', isDay ? 'var(--color-day)' : 'var(--color-night)')
            .attr('opacity', Math.max(dayOpacity, nightOpacity) * VISUALIZATION.BACKGROUND_OPACITY);

        // Get data for current time
        const currentData = combinedData.filter(d => d.time === Math.round(time));
        
        if (currentData.length === 0) return;

        // Update mouse positions based on activity level
        currentData.forEach(d => {
            const pos = mousePositions[d.id];
            if (pos) {
                // Update velocity based on activity level (normalized)
                const activityFactor = d.act / ACTIVITY.MAX * VISUALIZATION.ACTIVITY_MOVEMENT_SCALE;
                const deltaVx = (Math.random() - 0.5) * activityFactor;
                const deltaVy = (Math.random() - 0.5) * activityFactor;
                
                // Apply velocity changes with minimum threshold
                pos.vx += deltaVx;
                pos.vy += deltaVy;
                
                // Apply damping
                pos.vx *= VISUALIZATION.VELOCITY_DAMPING;
                pos.vy *= VISUALIZATION.VELOCITY_DAMPING;
                
                // Apply minimum velocity threshold
                if (Math.abs(pos.vx) < VISUALIZATION.MIN_VELOCITY) {
                    pos.vx = 0;
                }
                if (Math.abs(pos.vy) < VISUALIZATION.MIN_VELOCITY) {
                    pos.vy = 0;
                }
                
                // Update position
                pos.x += pos.vx;
                pos.y += pos.vy;
                
                // Keep within bounds
                pos.x = Math.max(positionBuffer + VISUALIZATION.MIN_MOUSE_DISTANCE_FROM_EDGE, 
                               Math.min(mainPlotWidth - positionBuffer - VISUALIZATION.MIN_MOUSE_DISTANCE_FROM_EDGE, pos.x));
                pos.y = Math.max(positionBuffer + VISUALIZATION.MIN_MOUSE_DISTANCE_FROM_EDGE, 
                               Math.min(plotHeight - positionBuffer - VISUALIZATION.MIN_MOUSE_DISTANCE_FROM_EDGE, pos.y));
            }
        });

        // Update main plot points
        const mainPoints = mainPlot.selectAll('.mouse-point')
            .data(currentData, d => d.id);

        mainPoints.enter()
            .append('circle')
            .attr('class', 'mouse-point')
            .attr('r', VISUALIZATION.POINT_RADIUS)
            .attr('stroke', 'white')
            .attr('stroke-width', VISUALIZATION.POINT_STROKE_WIDTH)
            .style('opacity', VISUALIZATION.POINT_OPACITY)
            .on('mouseover', function(event, d) {
                showTooltip(event, d);
                d3.select(this).style('opacity', VISUALIZATION.POINT_HOVER_OPACITY);
            })
            .on('mouseout', function() {
                hideTooltip();
                d3.select(this).style('opacity', VISUALIZATION.POINT_OPACITY);
            })
            .merge(mainPoints)
            .transition()
            .duration(VISUALIZATION.ANIMATION_FRAME_DURATION)
            .attr('cx', d => mousePositions[d.id].x)
            .attr('cy', d => mousePositions[d.id].y)
            .attr('fill', d => tempColorScale(d.temp));

        mainPoints.exit().remove();

        // Update temperature-activity plot points
        const tempActPoints = tempActPlot.selectAll('.temp-act-point')
            .data(currentData, d => d.id);

        tempActPoints.enter()
            .append('circle')
            .attr('class', 'temp-act-point')
            .attr('r', VISUALIZATION.POINT_RADIUS)
            .attr('stroke', 'white')
            .attr('stroke-width', VISUALIZATION.POINT_STROKE_WIDTH)
            .style('opacity', VISUALIZATION.POINT_OPACITY)
            .on('mouseover', function(event, d) {
                showTooltip(event, d);
                d3.select(this).style('opacity', VISUALIZATION.POINT_HOVER_OPACITY);
            })
            .on('mouseout', function() {
                hideTooltip();
                d3.select(this).style('opacity', VISUALIZATION.POINT_OPACITY);
            })
            .merge(tempActPoints)
            .transition()
            .duration(VISUALIZATION.ANIMATION_FRAME_DURATION)
            .attr('cx', d => tempScale(d.temp))
            .attr('cy', d => actScale(d.act))
            .attr('fill', d => tempColorScale(d.temp));

        tempActPoints.exit().remove();
    }

    // Animation function
    function animate() {
        if (!isPlaying) return;
        
        currentTime += VISUALIZATION.TIME_INCREMENT; // Advance by configured minutes each frame
        if (currentTime > timeExtent[1]) {
            currentTime = timeExtent[0]; // Loop back to start
        }
        
        updateVisualization(currentTime);
        animationId = requestAnimationFrame(animate);
    }

    // Event handlers
    playButton.on('click', () => {
        isPlaying = !isPlaying;
        playButton.text(isPlaying ? 'Pause' : 'Play');
        
        if (isPlaying) {
            animate();
        } else if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });

    resetButton.on('click', () => {
        isPlaying = false;
        playButton.text('Play');
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        currentTime = timeExtent[0];
        updateVisualization(currentTime);
        
        // Reset mouse positions
        mice.forEach(mouseId => {
            mousePositions[mouseId] = {
                x: positionBuffer + Math.random() * effectivePlotWidth,
                y: positionBuffer + Math.random() * effectivePlotHeight,
                vx: 0,
                vy: 0
            };
        });
    });

    timeSlider.on('input', function() {
        const time = +this.value;
        if (!isPlaying) {
            updateVisualization(time);
        }
    });

    // Initialize visualization
    updateVisualization(currentTime);

    // Add hover events to the plots container (not the entire viz container to avoid control conflicts)
    plotsContainer
        .on('mouseenter', pauseOnHover)
        .on('mouseleave', resumeOnLeave);
}
