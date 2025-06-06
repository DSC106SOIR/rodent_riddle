import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Constants for activity ranking visualization
const ACTIVITY_RANK = {
    MARGIN: { top: 40, right: 60, bottom: 10, left: 80 },
    CHART_WIDTH: 600, // Reduced to make room for ranking plots
    CHART_HEIGHT: 200, // Height for each half (up/down)
    RANKING_WIDTH: 200, // Width for ranking plots
    RANKING_GAP: 20, // Gap between main plots and ranking plots
    PLOT_GAP: 40, // Gap between upper and lower plots
    BAR_PADDING: 0.1,
    CONTROL_HEIGHT: 80,
    AXIS_BUFFER: 10,
    MIN_ACTIVITY: 0,
    MAX_ACTIVITY_DEFAULT: 100,
    // New proportion plot constants
    PROPORTION_WIDTH: 120,
    PROPORTION_HEIGHT: 60,
    PROPORTION_MARGIN: 10
};

// Constants for cycle timing
const CYCLE = {
    MINUTES_PER_HALF_DAY: 720, // 12-hour cycle
    LIGHT_OFF_START: 1,
    LIGHT_ON_START: 721
};

export async function createActivityRankVisualization() {
    // Load the combined data
    const combinedData = await d3.json('./data/combined_minutes.json'); // Using hourly data for better performance
    
    // Get unique mice and calculate max time and activity
    const mice = [...new Set(combinedData.map(d => d.id))];
    const maxTime = d3.max(combinedData, d => d.time);
    const maxActivity = Math.max(ACTIVITY_RANK.MAX_ACTIVITY_DEFAULT, d3.max(combinedData, d => d.act));
    const totalDays = Math.ceil(maxTime / (CYCLE.MINUTES_PER_HALF_DAY * 2));

    // Pre-compute cumulative sums for efficiency
    let cumulativeSums = {};
    let isPrecomputed = false;
    let proportionData = {}; // Cache for proportion calculations
    
    // Optimized data structures for fast lookups
    let dataByTimeDay = new Map(); // Map: "time_day" -> {lightOff: [...], lightOn: [...]}
    let precomputedProportions = new Map(); // Map: "day_isLightOff" -> [...proportions]
    let precomputedAverages = new Map(); // Map: "day_isLightOff_time" -> [...averages]

    // Optimized data pre-processing function
    function preProcessAllData() {
        console.log('Pre-processing data for optimal performance...');
        
        // Clear existing data structures
        dataByTimeDay.clear();
        precomputedProportions.clear();
        precomputedAverages.clear();
        
        // Index data by time and day for O(1) lookups
        combinedData.forEach(d => {
            const day = Math.ceil(d.time / (CYCLE.MINUTES_PER_HALF_DAY * 2));
            const cycleTime = ((d.time - 1) % (CYCLE.MINUTES_PER_HALF_DAY * 2)) + 1;
            const isLightOn = cycleTime > CYCLE.MINUTES_PER_HALF_DAY;
            const adjustedTime = isLightOn ? cycleTime - CYCLE.MINUTES_PER_HALF_DAY : cycleTime;
            
            const key = `${adjustedTime}_${day}`;
            if (!dataByTimeDay.has(key)) {
                dataByTimeDay.set(key, { lightOff: [], lightOn: [] });
            }
            
            if (isLightOn) {
                dataByTimeDay.get(key).lightOn.push(d);
            } else {
                dataByTimeDay.get(key).lightOff.push(d);
            }
        });
        
        // Pre-compute proportions for all days
        for (let day = 1; day <= totalDays; day++) {
            preComputeProportions(day, true);  // Light-off
            preComputeProportions(day, false); // Light-on
        }
        
        console.log('Data pre-processing complete!');
    }
    
    // Pre-compute proportions for a specific day and light condition
    function preComputeProportions(selectedDay, isLightOff) {
        const cacheKey = `${selectedDay}_${isLightOff}`;
        
        if (precomputedProportions.has(cacheKey)) {
            return; // Already computed
        }
        
        const proportions = [];
        let cumulativeMaleActivity = 0;
        let cumulativeFemaleActivity = 0;
        
        for (let t = 1; t <= CYCLE.MINUTES_PER_HALF_DAY; t++) {
            const dataKey = `${t}_${selectedDay}`;
            const timeData = dataByTimeDay.get(dataKey);
            
            if (timeData) {
                const currentData = isLightOff ? timeData.lightOff : timeData.lightOn;
                
                // Sum activity by gender for this time point
                let maleSum = 0;
                let femaleSum = 0;
                
                currentData.forEach(d => {
                    if (d.sex === 'male') {
                        maleSum += d.act;
                    } else {
                        femaleSum += d.act;
                    }
                });
                
                // Add to cumulative totals
                cumulativeMaleActivity += maleSum;
                cumulativeFemaleActivity += femaleSum;
            }
            
            // Calculate proportion (avoid division by zero)
            const totalActivity = cumulativeMaleActivity + cumulativeFemaleActivity;
            const proportion = totalActivity > 0 ? cumulativeMaleActivity / totalActivity : 0.5;
            
            proportions.push({
                time: t,
                proportion: proportion,
                maleActivity: cumulativeMaleActivity,
                femaleActivity: cumulativeFemaleActivity,
                totalActivity: totalActivity
            });
        }
        
        precomputedProportions.set(cacheKey, proportions);
    }

    // Function to pre-compute cumulative sums once (using modulo for cyclical data)
    function preComputeCumulativeSums() {
        if (isPrecomputed) {
            return; // Already computed
        }

        try {
            cumulativeSums = {
                lightOff: {},
                lightOn: {}
            };
            
            // Group data by mouse ID and normalize time using modulo
            const dataByMouse = {};
            combinedData.forEach(d => {
                if (!dataByMouse[d.id]) {
                    dataByMouse[d.id] = {};
                }
                const normalizedTime = ((d.time - 1) % 1440) + 1; // Normalize to 1-1440 cycle
                dataByMouse[d.id][normalizedTime] = d.act;
            });
            
            mice.forEach(mouseId => {
                cumulativeSums.lightOff[mouseId] = [];
                cumulativeSums.lightOn[mouseId] = [];
                
                let lightOffSum = 0;
                let lightOnSum = 0;
                
                for (let t = 1; t <= CYCLE.MINUTES_PER_HALF_DAY; t++) {
                    // Light-off data (first half of day: 1-720)
                    const lightOffActivity = dataByMouse[mouseId] && dataByMouse[mouseId][t];
                    if (lightOffActivity && typeof lightOffActivity === 'number') {
                        lightOffSum += lightOffActivity;
                    }
                    cumulativeSums.lightOff[mouseId][t - 1] = lightOffSum;
                    
                    // Light-on data (second half of day: 721-1440)
                    const lightOnTime = t + CYCLE.MINUTES_PER_HALF_DAY;
                    const lightOnActivity = dataByMouse[mouseId] && dataByMouse[mouseId][lightOnTime];
                    if (lightOnActivity && typeof lightOnActivity === 'number') {
                        lightOnSum += lightOnActivity;
                    }
                    cumulativeSums.lightOn[mouseId][t - 1] = lightOnSum;
                }
            });
            
            isPrecomputed = true;
        } catch (error) {
            console.error('Error computing cumulative sums:', error);
            // Fallback to empty sums
            cumulativeSums = {
                lightOff: {},
                lightOn: {}
            };
        }
    }

    // Function to get running averages efficiently using pre-computed sums
    function getRunningAverages(cycleTime, isLightOff) {
        try {
            // At time 1, use current time data instead of running average
            if (cycleTime === 1) {
                const currentData = getDataForTime(cycleTime, parseInt(daySelect?.property('value') || 1));
                const timeData = isLightOff ? currentData.lightOffData : currentData.lightOnData;
                
                const averages = timeData.map(d => ({
                    id: d.id,
                    average: d.act, // Use current activity as "average" at time 1
                    sex: d.sex
                }));
                
                return averages.sort((a, b) => b.average - a.average);
            }
            
            if (!cumulativeSums || !cumulativeSums.lightOff || !cumulativeSums.lightOn) {
                return []; // Return empty array if sums not computed
            }
            
            const sumData = isLightOff ? cumulativeSums.lightOff : cumulativeSums.lightOn;
            const averages = [];
            
            mice.forEach(mouseId => {
                if (sumData[mouseId] && 
                    Array.isArray(sumData[mouseId]) && 
                    sumData[mouseId][cycleTime - 1] !== undefined &&
                    typeof sumData[mouseId][cycleTime - 1] === 'number') {
                    
                    const sum = sumData[mouseId][cycleTime - 1];
                    const average = sum / cycleTime;
                    
                    if (!isNaN(average) && isFinite(average)) {
                        const sexData = combinedData.find(d => d.id === mouseId);
                        averages.push({
                            id: mouseId,
                            average: average,
                            sex: sexData ? sexData.sex : 'unknown'
                        });
                    }
                }
            });
            
            return averages.sort((a, b) => b.average - a.average); // Sort in descending order
        } catch (error) {
            console.error('Error getting running averages:', error);
            return []; // Return empty array on error
        }
    }

    // Optimized function to get data for a specific time (O(1) lookup)
    function getDataForTime(cycleTime, selectedDay = 1) {
        const dataKey = `${cycleTime}_${selectedDay}`;
        const timeData = dataByTimeDay.get(dataKey);
        
        if (timeData) {
            return {
                lightOffData: timeData.lightOff,
                lightOnData: timeData.lightOn
            };
        }
        
        return { lightOffData: [], lightOnData: [] };
    }

    // Optimized function to get proportion data (direct lookup)
    function getProportionData(maxTime, selectedDay, isLightOff) {
        const cacheKey = `${selectedDay}_${isLightOff}`;
        const fullData = precomputedProportions.get(cacheKey);
        
        if (fullData) {
            return fullData.slice(0, maxTime); // Return up to maxTime
        }
        
        // Fallback: compute on demand if not pre-computed
        preComputeProportions(selectedDay, isLightOff);
        return precomputedProportions.get(cacheKey)?.slice(0, maxTime) || [];
    }

    // Helper function to get actual time for data lookup
    function getActualTime(cycleTime, selectedDay, isLightOn) {
        const dayOffset = (selectedDay - 1) * CYCLE.MINUTES_PER_HALF_DAY * 2;
        return dayOffset + cycleTime + (isLightOn ? CYCLE.MINUTES_PER_HALF_DAY : 0);
    }

    // Function to sort data by activity level
    function sortDataByActivity(data) {
        return data.sort((a, b) => b.act - a.act);
    }

    // Pre-process all data for optimal performance
    preProcessAllData();

    // Set up dimensions
    const margin = ACTIVITY_RANK.MARGIN;
    const chartWidth = ACTIVITY_RANK.CHART_WIDTH;
    const chartHeight = ACTIVITY_RANK.CHART_HEIGHT;
    const rankingWidth = ACTIVITY_RANK.RANKING_WIDTH;
    const rankingGap = ACTIVITY_RANK.RANKING_GAP;
    const totalWidth = chartWidth + rankingGap + rankingWidth;
    const totalHeight = chartHeight * 2 + margin.top + margin.bottom + ACTIVITY_RANK.PLOT_GAP;

    // Animation state
    let isPlaying = false;
    let animationId = null;
    let currentTime = 1;
    let wasPlayingBeforeHover = false; // Track if animation was playing before hover
    let hideTimeout = null; // Track hide timeout for tooltip debouncing

    // Create container
    const container = d3.select('#activity-rank-viz');
    
    // Create plots container for hover events
    const plotsContainer = container.append('div')
        .style('display', 'inline-block');
    
    // Create main SVG
    const svg = plotsContainer.append('svg')
        .attr('width', totalWidth + margin.left + margin.right)
        .attr('height', totalHeight);

    // Create plot groups with more separation
    const lightOffPlot = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    const lightOnPlot = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top + chartHeight + ACTIVITY_RANK.PLOT_GAP})`);

    // Create ranking plot groups
    const lightOffRanking = svg.append('g')
        .attr('transform', `translate(${margin.left + chartWidth + rankingGap}, ${margin.top})`);
    
    const lightOnRanking = svg.append('g')
        .attr('transform', `translate(${margin.left + chartWidth + rankingGap}, ${margin.top + chartHeight + ACTIVITY_RANK.PLOT_GAP})`);

    // Create proportion plot groups (top right of main plots)
    const lightOffProportion = svg.append('g')
        .attr('transform', `translate(${margin.left + chartWidth - ACTIVITY_RANK.PROPORTION_WIDTH - ACTIVITY_RANK.PROPORTION_MARGIN}, ${margin.top + ACTIVITY_RANK.PROPORTION_MARGIN})`);
    
    // For the lower plot, place at bottom right
    const lightOnProportion = svg.append('g')
        .attr('transform', `translate(${margin.left + chartWidth - ACTIVITY_RANK.PROPORTION_WIDTH - ACTIVITY_RANK.PROPORTION_MARGIN}, ${margin.top + chartHeight + ACTIVITY_RANK.PLOT_GAP + chartHeight - ACTIVITY_RANK.PROPORTION_HEIGHT - ACTIVITY_RANK.PROPORTION_MARGIN})`);

    // Add background rectangles
    lightOffPlot.append('rect')
        .attr('class', 'light-off-bg')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .attr('fill', 'var(--color-night)')
        .attr('opacity', 0.4);

    lightOnPlot.append('rect')
        .attr('class', 'light-on-bg')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .attr('fill', 'var(--color-day)')
        .attr('opacity', 0.4);

    // Add background rectangles for ranking plots
    lightOffRanking.append('rect')
        .attr('class', 'ranking-bg')
        .attr('width', rankingWidth)
        .attr('height', chartHeight)
        .attr('fill', 'var(--color-night)')
        .attr('opacity', 0.2);

    lightOnRanking.append('rect')
        .attr('class', 'ranking-bg')
        .attr('width', rankingWidth)
        .attr('height', chartHeight)
        .attr('fill', 'var(--color-day)')
        .attr('opacity', 0.2);

    // Add titles
    svg.append('text')
        .attr('class', 'plot-title')
        .attr('x', margin.left)
        .attr('y', margin.top - 20)
        .attr('text-anchor', 'start')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.9em')
        .text('Mouse activity at a single time point');

    // Add ranking plot titles
    svg.append('text')
        .attr('class', 'ranking-title')
        .attr('x', margin.left + chartWidth + rankingGap)
        .attr('y', margin.top - 20)
        .attr('text-anchor', 'start')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.9em')
        .text('Running Average Ranking');

    // Set up separate scales for each plot
    const xScaleUp = d3.scaleBand()
        .domain(mice)
        .range([0, chartWidth])
        .padding(ACTIVITY_RANK.BAR_PADDING);

    const xScaleDown = d3.scaleBand()
        .domain(mice)
        .range([0, chartWidth])
        .padding(ACTIVITY_RANK.BAR_PADDING);

    const yScaleUp = d3.scaleLinear()
        .domain([0, maxActivity])
        .range([chartHeight, 0]);

    const yScaleDown = d3.scaleLinear()
        .domain([0, maxActivity])
        .range([0, chartHeight]);

    // Set up scales for ranking plots (horizontal bars)
    const rankingYScaleOff = d3.scaleBand()
        .domain(mice)
        .range([0, chartHeight])
        .padding(0.1);

    const rankingYScaleOn = d3.scaleBand()
        .domain(mice)
        .range([0, chartHeight])
        .padding(0.1);

    const rankingXScaleOff = d3.scaleLinear()
        .domain([0, 100]) // Fixed max at 100
        .range([0, rankingWidth]); // Bars point to the right

    const rankingXScaleOn = d3.scaleLinear()
        .domain([0, 100]) // Fixed max at 100
        .range([0, rankingWidth]); // Bars point to the right

    // Set up scales for proportion plots
    const proportionXScale = d3.scaleLinear()
        .domain([1, CYCLE.MINUTES_PER_HALF_DAY])
        .range([0, ACTIVITY_RANK.PROPORTION_WIDTH]);

    const proportionYScale = d3.scaleLinear()
        .domain([0, 1]) // 0 to 100% proportion
        .range([ACTIVITY_RANK.PROPORTION_HEIGHT, 0]);

    // Area generators for proportion plots
    const areaGenerator = d3.area()
        .x(d => proportionXScale(d.time))
        .y0(proportionYScale(0))
        .y1(d => proportionYScale(d.proportion))
        .curve(d3.curveMonotoneX);

    const areaGeneratorInverted = d3.area()
        .x(d => proportionXScale(d.time))
        .y0(d => proportionYScale(d.proportion))
        .y1(proportionYScale(1))
        .curve(d3.curveMonotoneX);

    // Create separate axes for each plot
    const xAxisUp = d3.axisBottom(xScaleUp)
        .tickSize(0);
    
    const xAxisDown = d3.axisTop(xScaleDown)
        .tickSize(0);

    const yAxisUp = d3.axisLeft(yScaleUp)
        .tickSize(0)
        .tickFormat(d => d);

    const yAxisDown = d3.axisLeft(yScaleDown)
        .tickSize(0)
        .tickFormat(d => d);

    // Create axes for ranking plots
    const rankingXAxisOff = d3.axisTop(rankingXScaleOff)
        .tickSize(0)
        .tickFormat(d => d);

    const rankingXAxisOn = d3.axisTop(rankingXScaleOn)
        .tickSize(0)
        .tickFormat(d => d);

    const rankingYAxisOff = d3.axisLeft(rankingYScaleOff)
        .tickSize(0);

    const rankingYAxisOn = d3.axisLeft(rankingYScaleOn)
        .tickSize(0);

    // Add axes
    const xAxisUpGroup = lightOffPlot.append('g')
        .attr('class', 'x-axis-up')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxisUp);

    const xAxisDownGroup = lightOnPlot.append('g')
        .attr('class', 'x-axis-down')
        .call(xAxisDown)

    const yAxisUpGroup = lightOffPlot.append('g')
        .attr('class', 'y-axis-up')
        .call(yAxisUp);

    const yAxisDownGroup = lightOnPlot.append('g')
        .attr('class', 'y-axis-down')
        .call(yAxisDown);

    // Add ranking plot axes
    const rankingXAxisOffGroup = lightOffRanking.append('g')
        .attr('class', 'ranking-x-axis-off')
        .call(rankingXAxisOff);

    const rankingXAxisOnGroup = lightOnRanking.append('g')
        .attr('class', 'ranking-x-axis-on')
        .call(rankingXAxisOn);

    const rankingYAxisOffGroup = lightOffRanking.append('g')
        .attr('class', 'ranking-y-axis-off')
        .call(rankingYAxisOff);

    const rankingYAxisOnGroup = lightOnRanking.append('g')
        .attr('class', 'ranking-y-axis-on')
        .call(rankingYAxisOn);

    // Style axes
    svg.selectAll('.x-axis-up')
        .selectAll('text')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.8em')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    svg.selectAll('.x-axis-down')
        .selectAll('text')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.8em')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'start');

    svg.selectAll('.y-axis-up, .y-axis-down')
        .selectAll('text')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.8em');

    // Style ranking plot axes
    svg.selectAll('.ranking-x-axis-off, .ranking-x-axis-on')
        .selectAll('text')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.7em');

    svg.selectAll('.ranking-y-axis-off, .ranking-y-axis-on')
        .selectAll('text')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.7em');

    // Hide axis paths and lines
    svg.selectAll('.x-axis-up, .x-axis-down, .y-axis-up, .y-axis-down, .ranking-x-axis-off, .ranking-x-axis-on, .ranking-y-axis-off, .ranking-y-axis-on')
        .selectAll('path, line')
        .style('display', 'none');

    // Add axis labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(45, ${margin.top + chartHeight / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.8em')
        .text('Light-OFF Activity Level');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(45, ${margin.top + chartHeight + ACTIVITY_RANK.PLOT_GAP + chartHeight / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-accent)')
        .style('font-size', '0.8em')
        .text('Light-ON Activity Level');

    // Color scale for mice (alternating colors based on sex)
    const colorScale = d3.scaleOrdinal()
        .domain(['male', 'female'])
        .range(['var(--color-male)', 'var(--color-female)']);

    // Create controls
    const controlsContainer = container.append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('gap', '10px')
        .style('margin-top', '20px');

    // Time slider container
    const sliderContainer = controlsContainer.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '10px');

    sliderContainer.append('label')
        .text('Time in 12-hour cycle')
        .style('color', 'var(--color-accent)');

    const timeSlider = sliderContainer.append('input')
        .attr('type', 'range')
        .attr('min', 1)
        .attr('max', CYCLE.MINUTES_PER_HALF_DAY)
        .attr('value', 1)
        .attr('step', 1)
        .style('width', '400px');

    const timeDisplayContainer = sliderContainer.append('span')
        .style('min-width', '200px')
        .style('display', 'inline-block');

    const timeDisplayTime = timeDisplayContainer.append('span')
        .style('color', 'var(--color-accent)')
        .style('display', 'inline-block')
        .style('min-width', '10em')
        .style('text-align', 'left')
        .text('0h 0m (0 minutes)');

    // Buttons container
    const buttonContainer = controlsContainer.append('div')
        .style('display', 'flex')
        .style('gap', '10px');

    // Play/pause button
    const playButton = buttonContainer.append('button')
        .text('Play')
        .style('padding', '8px 16px')
        .style('background-color', 'var(--color-accent)')
        .style('color', 'var(--color-light)')
        .style('border', 'none')
        .style('border-radius', '4px')
        .style('cursor', 'pointer');

    // Day selector
    const dayJumpContainer = buttonContainer.append('div')
        .style('display', 'flex')
        .style('gap', '5px')
        .style('align-items', 'center');

    dayJumpContainer.append('label')
        .text('Change to')
        .style('color', 'var(--color-accent)');

    const daySelect = dayJumpContainer.append('select')
        .style('padding', '5px')
        .style('border-radius', '4px')
        .style('border', 'none')
        .style('background-color', 'var(--color-accent)')
        .style('color', 'var(--color-light)');

    // Populate day options
    for (let i = 1; i <= totalDays; i++) {
        const isEstrusDay = [2, 6, 10, 14].includes(i);
        daySelect.append('option')
            .attr('value', i)
            .text(`Day ${i}${isEstrusDay ? ' - estrus day' : ''}`);
    }

    // Reset button
    const resetButton = buttonContainer.append('button')
        .text('Reset')
        .style('padding', '8px 16px')
        .style('background-color', 'var(--color-accent)')
        .style('color', 'var(--color-light)')
        .style('border', 'none')
        .style('border-radius', '4px')
        .style('cursor', 'pointer');

    // Create 4 separate tooltips for each plot type
    const tooltipLightOffMain = d3.select('body')
        .append('div')
        .attr('class', 'tooltip-light-off-main')
        .style('position', 'absolute')
        .style('background', 'var(--color-night)')
        .style('color', 'var(--color-light)')
        .style('padding', '6px')
        .style('border-radius', '4px')
        .style('font-size', '10px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1001)
        .style('max-width', '150px')
        .style('line-height', '1.2')

    const tooltipLightOnMain = d3.select('body')
        .append('div')
        .attr('class', 'tooltip-light-on-main')
        .style('position', 'absolute')
        .style('background', 'var(--color-day)')
        .style('color', 'var(--color-accent)')
        .style('padding', '6px')
        .style('border-radius', '4px')
        .style('font-size', '10px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1002)
        .style('max-width', '150px')
        .style('line-height', '1.2')

    const tooltipLightOffRanking = d3.select('body')
        .append('div')
        .attr('class', 'tooltip-light-off-ranking')
        .style('position', 'absolute')
        .style('background', 'var(--color-night)')
        .style('color', 'var(--color-light)')
        .style('padding', '6px')
        .style('border-radius', '4px')
        .style('font-size', '10px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1003)
        .style('max-width', '150px')
        .style('line-height', '1.2')

    const tooltipLightOnRanking = d3.select('body')
        .append('div')
        .attr('class', 'tooltip-light-on-ranking')
        .style('position', 'absolute')
        .style('background', 'var(--color-day)')
        .style('color', 'var(--color-accent)')
        .style('padding', '6px')
        .style('border-radius', '4px')
        .style('font-size', '10px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1004)
        .style('max-width', '150px')
        .style('line-height', '1.2')

    // Tooltips for proportion plots
    const tooltipLightOffProportion = d3.select('body')
        .append('div')
        .attr('class', 'tooltip-light-off-proportion')
        .style('position', 'absolute')
        .style('background', 'var(--color-night)')
        .style('color', 'var(--color-light)')
        .style('padding', '6px')
        .style('border-radius', '4px')
        .style('font-size', '10px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1005)
        .style('max-width', '180px')
        .style('line-height', '1.2')

    const tooltipLightOnProportion = d3.select('body')
        .append('div')
        .attr('class', 'tooltip-light-on-proportion')
        .style('position', 'absolute')
        .style('background', 'var(--color-day)')
        .style('color', 'var(--color-accent)')
        .style('padding', '6px')
        .style('border-radius', '4px')
        .style('font-size', '10px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1006)
        .style('max-width', '180px')
        .style('line-height', '1.2')

    // Enhanced hover functions
    function highlightMouse(mouseId) {
        // Highlight all bars for this mouse
        svg.selectAll('.bar-up, .bar-down, .ranking-bar-off, .ranking-bar-on')
            .filter(d => d.id === mouseId)
            .attr('stroke-width', 0.8)
            .attr('stroke', 'var(--color-light)')
            .style('opacity', 1);
        
        // Dim other bars
        svg.selectAll('.bar-up, .bar-down, .ranking-bar-off, .ranking-bar-on')
            .filter(d => d.id !== mouseId)
            .style('opacity', 0.4);
    }

    function removeHighlight() {
        // Reset all bars
        svg.selectAll('.bar-up, .bar-down, .ranking-bar-off, .ranking-bar-on')
            .attr('stroke-width', 0.1)
            .style('opacity', 1);
    }

    function getBarPosition(mouseId, plotType) {
        try {
            const svgRect = svg.node().getBoundingClientRect();
            
            switch(plotType) {
                case 'lightOffMain': {
                    // Get current data and sort it
                    const { lightOffData } = getDataForTime(currentTime, parseInt(daySelect.property('value')));
                    const sortedLightOffData = sortDataByActivity([...lightOffData]);
                    const mouseIndex = sortedLightOffData.findIndex(d => d.id === mouseId);
                    const lightOffMouse = sortedLightOffData.find(d => d.id === mouseId);
                    
                    if (mouseIndex >= 0 && lightOffMouse) {
                        // Calculate position manually
                        const bandWidth = chartWidth / sortedLightOffData.length;
                        const barX = mouseIndex * bandWidth;
                        const barY = yScaleUp(lightOffMouse.act);
                        
                        const absoluteX = svgRect.left + window.scrollX + margin.left + barX + bandWidth/2;
                        const absoluteY = svgRect.top + window.scrollY + margin.top + barY - 10;
                        
                        return {
                            x: absoluteX,
                            y: absoluteY
                        };
                    }
                    break;
                }
                case 'lightOnMain': {
                    // Get current data and sort it
                    const { lightOnData } = getDataForTime(currentTime, parseInt(daySelect.property('value')));
                    const sortedLightOnData = sortDataByActivity([...lightOnData]);
                    const mouseIndex = sortedLightOnData.findIndex(d => d.id === mouseId);
                    const lightOnMouse = sortedLightOnData.find(d => d.id === mouseId);
                    
                    if (mouseIndex >= 0 && lightOnMouse) {
                        // Calculate position manually
                        const bandWidth = chartWidth / sortedLightOnData.length;
                        const barX = mouseIndex * bandWidth;
                        const barHeight = yScaleDown(lightOnMouse.act);
                        
                        const absoluteX = svgRect.left + window.scrollX + margin.left + barX + bandWidth/2;
                        const absoluteY = svgRect.top + window.scrollY + margin.top + chartHeight + ACTIVITY_RANK.PLOT_GAP + barHeight + 10;
                        
                        return {
                            x: absoluteX,
                            y: absoluteY
                        };
                    }
                    break;
                }
                case 'lightOffRanking': {
                    // Get current ranking data
                    const lightOffAvg = getRunningAverages(currentTime, true);
                    const mouseIndex = lightOffAvg.findIndex(d => d.id === mouseId);
                    const lightOffAvgMouse = lightOffAvg.find(d => d.id === mouseId);
                    
                    if (mouseIndex >= 0 && lightOffAvgMouse) {
                        // Calculate position manually
                        const bandHeight = chartHeight / lightOffAvg.length;
                        const barY = mouseIndex * bandHeight;
                        const barWidth = rankingXScaleOff(lightOffAvgMouse.average);
                        
                        const absoluteX = svgRect.left + window.scrollX + margin.left + chartWidth + rankingGap + barWidth + 10;
                        const absoluteY = svgRect.top + window.scrollY + margin.top + barY + bandHeight/2;
                        
                        return {
                            x: absoluteX,
                            y: absoluteY
                        };
                    }
                    break;
                }
                case 'lightOnRanking': {
                    // Get current ranking data
                    const lightOnAvg = getRunningAverages(currentTime, false);
                    const mouseIndex = lightOnAvg.findIndex(d => d.id === mouseId);
                    const lightOnAvgMouse = lightOnAvg.find(d => d.id === mouseId);
                    
                    if (mouseIndex >= 0 && lightOnAvgMouse) {
                        // Calculate position manually
                        const bandHeight = chartHeight / lightOnAvg.length;
                        const barY = mouseIndex * bandHeight;
                        const barWidth = rankingXScaleOn(lightOnAvgMouse.average);
                        
                        const absoluteX = svgRect.left + window.scrollX + margin.left + chartWidth + rankingGap + barWidth + 10;
                        const absoluteY = svgRect.top + window.scrollY + margin.top + chartHeight + ACTIVITY_RANK.PLOT_GAP + barY + bandHeight/2;
                        
                        return {
                            x: absoluteX,
                            y: absoluteY
                        };
                    }
                    break;
                }
            }
        } catch (error) {
            console.log('Error in getBarPosition:', error);
        }
        
        return null;
    }

    function showTooltipAtPosition(tooltip, content, position) {
        if (content && position) {
            // Set tooltip content and position
            tooltip
                .html(content)
                .style('position', 'absolute')
                .style('left', position.x + 'px')
                .style('top', position.y + 'px')
                .style('opacity', '0.9')
                .style('z-index', '10000')
                .style('pointer-events', 'none')
                .style('display', 'block')
                .style('visibility', 'visible');
        }
    }

    function showAllTooltips(event, mouseId, hoveredPlot) {
        // Clear any pending hide timeout
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        
        // Remove any existing test tooltips immediately
        d3.selectAll('.test-tooltip').remove();
        
        // Hide all original tooltips first
        tooltipLightOffMain.style('opacity', '0');
        tooltipLightOnMain.style('opacity', '0');
        tooltipLightOffRanking.style('opacity', '0');
        tooltipLightOnRanking.style('opacity', '0');
        tooltipLightOffProportion.style('opacity', '0');
        tooltipLightOnProportion.style('opacity', '0');
        
        // Get data for all plots
        const lightOffData = combinedData.find(d => d.time === getActualTime(currentTime, parseInt(daySelect.property('value')), false) && d.id === mouseId);
        const lightOnData = combinedData.find(d => d.time === getActualTime(currentTime, parseInt(daySelect.property('value')), true) && d.id === mouseId);
        const lightOffAvg = getRunningAverages(currentTime, true).find(d => d.id === mouseId);
        const lightOnAvg = getRunningAverages(currentTime, false).find(d => d.id === mouseId);
        
        const sexText = lightOffData?.sex === 'male' ? 'Male' : 'Female';
        
        // Content for each tooltip (restored to original format)
        const lightOffMainContent = lightOffData ? 
            `<div><strong>Light-OFF</strong></div><div>Mouse: ${mouseId} (${sexText})</div><div>Activity: ${Math.round(lightOffData.act)}</div>` : '';
            
        const lightOnMainContent = lightOnData ? 
            `<div><strong>Light-ON</strong></div><div>Mouse: ${mouseId} (${sexText})</div><div>Activity: ${Math.round(lightOnData.act)}</div>` : '';
            
        const lightOffRankingContent = lightOffAvg ? 
            `<div><strong>Light-OFF</strong></div><div>Mouse: ${mouseId} (${sexText})</div><div>Running Average: ${lightOffAvg.average.toFixed(1)}</div><div>Rank: ${getRunningAverages(currentTime, true).findIndex(d => d.id === mouseId) + 1}</div>` : '';
            
        const lightOnRankingContent = lightOnAvg ? 
            `<div><strong>Light-ON</strong></div><div>Mouse: ${mouseId} (${sexText})</div><div>Running Average: ${lightOnAvg.average.toFixed(1)}</div><div>Rank: ${getRunningAverages(currentTime, false).findIndex(d => d.id === mouseId) + 1}</div>` : '';

        // Show tooltip at cursor for the hovered plot
        let cursorTooltip, cursorContent;
        switch(hoveredPlot) {
            case 'lightOffMain':
                cursorTooltip = tooltipLightOffMain;
                cursorContent = lightOffMainContent;
                break;
            case 'lightOnMain':
                cursorTooltip = tooltipLightOnMain;
                cursorContent = lightOnMainContent;
                break;
            case 'lightOffRanking':
                cursorTooltip = tooltipLightOffRanking;
                cursorContent = lightOffRankingContent;
                break;
            case 'lightOnRanking':
                cursorTooltip = tooltipLightOnRanking;
                cursorContent = lightOnRankingContent;
                break;
        }
        
        // Show tooltip at cursor for the hovered plot
        if (cursorTooltip && cursorContent) {
            cursorTooltip
                .html(cursorContent)
                .style('position', 'absolute')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .style('opacity', '0.9')
                .style('z-index', '10001')
                .style('pointer-events', 'none')
                .style('display', 'block')
                .style('visibility', 'visible');
        }

        // Show other tooltips at their actual bar positions
        if (hoveredPlot !== 'lightOffMain' && lightOffMainContent) {
            const position = getBarPosition(mouseId, 'lightOffMain');
            showTooltipAtPosition(tooltipLightOffMain, lightOffMainContent, position);
        }
        if (hoveredPlot !== 'lightOnMain' && lightOnMainContent) {
            const position = getBarPosition(mouseId, 'lightOnMain');
            showTooltipAtPosition(tooltipLightOnMain, lightOnMainContent, position);
        }
        if (hoveredPlot !== 'lightOffRanking' && lightOffRankingContent) {
            const position = getBarPosition(mouseId, 'lightOffRanking');
            showTooltipAtPosition(tooltipLightOffRanking, lightOffRankingContent, position);
        }
        if (hoveredPlot !== 'lightOnRanking' && lightOnRankingContent) {
            const position = getBarPosition(mouseId, 'lightOnRanking');
            showTooltipAtPosition(tooltipLightOnRanking, lightOnRankingContent, position);
        }
    }

    function hideAllTooltips() {
        // Clear any existing hide timeout
        if (hideTimeout) {
            clearTimeout(hideTimeout);
        }
        
        // Set a delay before hiding to prevent flicker when moving between bars
        hideTimeout = setTimeout(() => {
            // Remove any test tooltips
            d3.selectAll('.test-tooltip').remove();
            d3.select('.cursor-test-tooltip').remove();
            
            // Hide original tooltips
            tooltipLightOffMain.transition().duration(300).style('opacity', 0);
            tooltipLightOnMain.transition().duration(300).style('opacity', 0);
            tooltipLightOffRanking.transition().duration(300).style('opacity', 0);
            tooltipLightOnRanking.transition().style('opacity', 0);
            tooltipLightOffProportion.transition().duration(300).style('opacity', 0);
            tooltipLightOnProportion.transition().duration(300).style('opacity', 0);
            
            hideTimeout = null;
        }, 100); // 100ms delay
    }

    // Function to update visualization
    function updateVisualization(cycleTime, selectedDay = 1) {
        currentTime = cycleTime;
        
        // Pre-compute cumulative sums for the selected day
        preComputeCumulativeSums();
        
        const { lightOffData, lightOnData } = getDataForTime(cycleTime, selectedDay);
        
        // Update time display
        const hours = Math.floor((cycleTime - 1) / 60);
        const minutes = (cycleTime - 1) % 60;
        const totalMinutes = cycleTime - 1;
        timeDisplayTime.text(`${hours}h ${minutes}m (${totalMinutes} minutes)`);
        timeSlider.property('value', cycleTime);

        // Sort data independently for each plot
        const sortedLightOffData = sortDataByActivity([...lightOffData]);
        const sortedLightOnData = sortDataByActivity([...lightOnData]);

        // Calculate running averages for ranking plots
        const lightOffRankingData = getRunningAverages(cycleTime, true);
        const lightOnRankingData = getRunningAverages(cycleTime, false);

        // Update x-scale domains independently
        const sortedMiceOff = sortedLightOffData.map(d => d.id);
        const sortedMiceOn = sortedLightOnData.map(d => d.id);
        
        // Update both x-scales independently
        if (sortedMiceOff.length > 0) {
            xScaleUp.domain(sortedMiceOff);
            xAxisUpGroup.call(xAxisUp);
        }
        
        if (sortedMiceOn.length > 0) {
            xScaleDown.domain(sortedMiceOn);
            xAxisDownGroup.call(xAxisDown);
        }

        // Update ranking y-scale domains
        if (lightOffRankingData.length > 0) {
            const rankingMiceOff = lightOffRankingData.map(d => d.id);
            rankingYScaleOff.domain(rankingMiceOff);
            rankingYAxisOffGroup.call(rankingYAxisOff);
        }
        
        if (lightOnRankingData.length > 0) {
            const rankingMiceOn = lightOnRankingData.map(d => d.id);
            rankingYScaleOn.domain(rankingMiceOn);
            rankingYAxisOnGroup.call(rankingYAxisOn);
        }
        
        // Re-style axis text immediately
        svg.selectAll('.x-axis-up')
            .selectAll('text')
            .style('fill', 'var(--color-accent)')
            .style('font-size', '0.8em')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        svg.selectAll('.x-axis-down')
            .selectAll('text')
            .style('fill', 'var(--color-accent)')
            .style('font-size', '0.8em')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'start');

        // Re-style ranking axis text
        svg.selectAll('.ranking-y-axis-off, .ranking-y-axis-on')
            .selectAll('text')
            .style('fill', 'var(--color-accent)')
            .style('font-size', '0.7em');

        // Update light-off bars (upward) - smooth transition
        const lightOffBars = lightOffPlot.selectAll('.bar-up')
            .data(sortedLightOffData, d => d.id);

        lightOffBars.enter()
            .append('rect')
            .attr('class', 'bar-up')
            .attr('x', d => xScaleUp(d.id))
            .attr('width', xScaleUp.bandwidth())
            .attr('y', chartHeight)
            .attr('height', 0)
            .attr('fill', d => colorScale(d.sex))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                highlightMouse(d.id);
                showAllTooltips(event, d.id, 'lightOffMain');
            })
            .on('mouseout', function() {
                removeHighlight();
                hideAllTooltips();
            })
            .merge(lightOffBars)
            .transition().duration(1)
            .attr('x', d => xScaleUp(d.id))
            .attr('y', d => yScaleUp(d.act))
            .attr('height', d => chartHeight - yScaleUp(d.act))
            .attr('fill', d => colorScale(d.sex));

        lightOffBars.exit().remove();

        // Update light-on bars (downward) - smooth transition
        const lightOnBars = lightOnPlot.selectAll('.bar-down')
            .data(sortedLightOnData, d => d.id);

        lightOnBars.enter()
            .append('rect')
            .attr('class', 'bar-down')
            .attr('x', d => xScaleDown(d.id))
            .attr('width', xScaleDown.bandwidth())
            .attr('y', 0)
            .attr('height', 0)
            .attr('fill', d => colorScale(d.sex))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                highlightMouse(d.id);
                showAllTooltips(event, d.id, 'lightOnMain');
            })
            .on('mouseout', function() {
                removeHighlight();
                hideAllTooltips();
            })
            .merge(lightOnBars)
            .transition().duration(1)
            .attr('x', d => xScaleDown(d.id))
            .attr('y', 0)
            .attr('height', d => yScaleDown(d.act))
            .attr('fill', d => colorScale(d.sex));

        lightOnBars.exit().remove();

        // Update light-off ranking bars (horizontal, pointing right) - smooth transition
        const lightOffRankingBars = lightOffRanking.selectAll('.ranking-bar-off')
            .data(lightOffRankingData, d => d.id);

        lightOffRankingBars.enter()
            .append('rect')
            .attr('class', 'ranking-bar-off')
            .attr('x', 0)
            .attr('y', d => rankingYScaleOff(d.id))
            .attr('width', 0)
            .attr('height', rankingYScaleOff.bandwidth())
            .attr('fill', d => colorScale(d.sex))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                highlightMouse(d.id);
                showAllTooltips(event, d.id, 'lightOffRanking');
            })
            .on('mouseout', function() {
                removeHighlight();
                hideAllTooltips();
            })
            .merge(lightOffRankingBars)
            .transition().duration(1)
            .attr('y', d => rankingYScaleOff(d.id))
            .attr('x', 0)
            .attr('width', d => rankingXScaleOff(d.average))
            .attr('fill', d => colorScale(d.sex));

        lightOffRankingBars.exit().remove();

        // Update light-on ranking bars (horizontal, pointing right) - smooth transition
        const lightOnRankingBars = lightOnRanking.selectAll('.ranking-bar-on')
            .data(lightOnRankingData, d => d.id);

        lightOnRankingBars.enter()
            .append('rect')
            .attr('class', 'ranking-bar-on')
            .attr('x', 0)
            .attr('y', d => rankingYScaleOn(d.id))
            .attr('width', 0)
            .attr('height', rankingYScaleOn.bandwidth())
            .attr('fill', d => colorScale(d.sex))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                highlightMouse(d.id);
                showAllTooltips(event, d.id, 'lightOnRanking');
            })
            .on('mouseout', function() {
                removeHighlight();
                hideAllTooltips();
            })
            .merge(lightOnRankingBars)
            .transition().duration(1)
            .attr('y', d => rankingYScaleOn(d.id))
            .attr('x', 0)
            .attr('width', d => rankingXScaleOn(d.average))
            .attr('fill', d => colorScale(d.sex));

        lightOnRankingBars.exit().remove();

        // Update top active mouse labels
        // Light-off main plot - top left corner
        const topLightOffMouse = sortedLightOffData.length > 0 ? sortedLightOffData[0] : null;
        const lightOffTopLabel = lightOffPlot.selectAll('.top-mouse-label')
            .data(topLightOffMouse ? [topLightOffMouse] : []);
        
        lightOffTopLabel.enter()
            .append('text')
            .attr('class', 'top-mouse-label')
            .attr('x', 10)
            .attr('y', 20)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .merge(lightOffTopLabel)
            .html(d => `<tspan style='fill:var(--color-accent)'>Top active mouse:</tspan> <tspan style='fill:${colorScale(d.sex)}'>${d.id}</tspan>`)
            .style('fill', null);
        
        lightOffTopLabel.exit().remove();

        // Light-on main plot - bottom left corner
        const topLightOnMouse = sortedLightOnData.length > 0 ? sortedLightOnData[0] : null;
        const lightOnTopLabel = lightOnPlot.selectAll('.top-mouse-label')
            .data(topLightOnMouse ? [topLightOnMouse] : []);
        
        lightOnTopLabel.enter()
            .append('text')
            .attr('class', 'top-mouse-label')
            .attr('x', 10)
            .attr('y', chartHeight - 10)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .merge(lightOnTopLabel)
            .html(d => `<tspan style='fill:var(--color-accent)'>Top active mouse:</tspan> <tspan style='fill:${colorScale(d.sex)}'>${d.id}</tspan>`)
            .style('fill', null);
        
        lightOnTopLabel.exit().remove();

        // Light-off ranking plot - bottom right corner
        // Clear any existing labels
        lightOffRanking.selectAll('.top-ranking-label, .top-ranking-title').remove();
        
        // Get top 3 mice
        const top3RankingOffMice = lightOffRankingData.slice(0, 3);
        
        if (top3RankingOffMice.length > 0) {
            // Add "Top of day" title
            lightOffRanking.append('text')
                .attr('class', 'top-ranking-title')
                .attr('x', rankingWidth - 10)
                .attr('y', chartHeight - 50)
                .attr('text-anchor', 'end')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .style('fill', 'var(--color-accent)')
                .text('Top of light-off:');
            
            // Add each top mouse on separate lines
            top3RankingOffMice.forEach((mouse, index) => {
                // Add rank number
                lightOffRanking.append('text')
                    .attr('class', 'top-ranking-label')
                    .attr('x', rankingWidth - 50)
                    .attr('y', chartHeight - 35 + (index * 12))
                    .attr('text-anchor', 'start')
                    .style('font-size', '10px')
                    .style('font-weight', 'bold')
                    .style('fill', 'var(--color-accent)')
                    .text(`${index + 1}.`);
                
                // Add mouse ID
                lightOffRanking.append('text')
                    .attr('class', 'top-ranking-label')
                    .attr('x', rankingWidth - 35)
                    .attr('y', chartHeight - 35 + (index * 12))
                    .attr('text-anchor', 'start')
                    .style('font-size', '10px')
                    .style('font-weight', 'bold')
                    .style('fill', colorScale(mouse.sex))
                    .text(`${mouse.id}`);
            });
        }

        // Light-on ranking plot - bottom right corner
        // Clear any existing labels
        lightOnRanking.selectAll('.top-ranking-label, .top-ranking-title').remove();
        
        // Get top 3 mice
        const top3RankingOnMice = lightOnRankingData.slice(0, 3);
        
        if (top3RankingOnMice.length > 0) {
            // Add "Top of day" title
            lightOnRanking.append('text')
                .attr('class', 'top-ranking-title')
                .attr('x', rankingWidth - 10)
                .attr('y', chartHeight - 50)
                .attr('text-anchor', 'end')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .style('fill', 'var(--color-accent)')
                .text('Top of light-on:');
            
            // Add each top mouse on separate lines
            top3RankingOnMice.forEach((mouse, index) => {
                // Add rank number
                lightOnRanking.append('text')
                    .attr('class', 'top-ranking-label')
                    .attr('x', rankingWidth - 50)
                    .attr('y', chartHeight - 35 + (index * 12))
                    .attr('text-anchor', 'start')
                    .style('font-size', '10px')
                    .style('font-weight', 'bold')
                    .style('fill', 'var(--color-accent)')
                    .text(`${index + 1}.`);
                
                // Add mouse ID
                lightOnRanking.append('text')
                    .attr('class', 'top-ranking-label')
                    .attr('x', rankingWidth - 35)
                    .attr('y', chartHeight - 35 + (index * 12))
                    .attr('text-anchor', 'start')
                    .style('font-size', '10px')
                    .style('font-weight', 'bold')
                    .style('fill', colorScale(mouse.sex))
                    .text(`${mouse.id}`);
            });
        }

        // Function to update proportion plots
        updateProportionPlots(cycleTime, selectedDay);
    }

    // Function to update proportion plots
    function updateProportionPlots(cycleTime, selectedDay) {
        // Show entire plot when at the beginning (time = 1), otherwise show up to current time
        const maxTime = cycleTime === 1 ? CYCLE.MINUTES_PER_HALF_DAY : cycleTime;
        
        // Get proportion data up to maxTime
        const lightOffProportions = getProportionData(maxTime, selectedDay, true);
        const lightOnProportions = getProportionData(maxTime, selectedDay, false);
        
        // Update light-off proportion plot
        if (lightOffProportions.length > 0) {
            // Male area (bottom)
            const lightOffMaleArea = lightOffProportion.selectAll('.male-area')
                .data([lightOffProportions]);
            
            lightOffMaleArea.enter()
                .append('path')
                .attr('class', 'male-area')
                .merge(lightOffMaleArea)
                .attr('d', areaGenerator)
                .attr('fill', 'var(--color-male)')
                .attr('opacity', 0.6);
            
            // Female area (top)
            const lightOffFemaleArea = lightOffProportion.selectAll('.female-area')
                .data([lightOffProportions]);
            
            lightOffFemaleArea.enter()
                .append('path')
                .attr('class', 'female-area')
                .merge(lightOffFemaleArea)
                .attr('d', areaGeneratorInverted)
                .attr('fill', 'var(--color-female)')
                .attr('opacity', 0.6);
            
            // Add vertical line indicator (initially hidden)
            const lightOffVerticalLine = lightOffProportion.selectAll('.vertical-indicator')
                .data([0]);
            
            lightOffVerticalLine.enter()
                .append('line')
                .attr('class', 'vertical-indicator')
                .attr('stroke', 'var(--color-accent)')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3')
                .attr('opacity', 0)
                .attr('y1', 0)
                .attr('y2', ACTIVITY_RANK.PROPORTION_HEIGHT)
                .merge(lightOffVerticalLine);
            
            // Add invisible overlay rectangle for hover detection
            const lightOffOverlay = lightOffProportion.selectAll('.proportion-overlay')
                .data([1]); // Use constant data to avoid rebinding issues
            
            lightOffOverlay.enter()
                .append('rect')
                .attr('class', 'proportion-overlay')
                .merge(lightOffOverlay)
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', ACTIVITY_RANK.PROPORTION_WIDTH)
                .attr('height', ACTIVITY_RANK.PROPORTION_HEIGHT)
                .attr('fill', 'transparent')
                .style('cursor', 'crosshair')
                .on('mousemove', function(event) {
                    const [mouseX] = d3.pointer(event, this);
                    const currentPropTime = Math.max(1, Math.min(maxTime, Math.round(proportionXScale.invert(mouseX))));
                    const currentPropData = lightOffProportions.find(d => d.time === currentPropTime) || lightOffProportions[lightOffProportions.length - 1];
                    
                    if (currentPropData) {
                        // Update vertical line position
                        lightOffProportion.select('.vertical-indicator')
                            .attr('x1', proportionXScale(currentPropTime))
                            .attr('x2', proportionXScale(currentPropTime))
                            .attr('opacity', 0.7);
                        
                        const malePercent = (currentPropData.proportion * 100).toFixed(1);
                        const femalePercent = ((1 - currentPropData.proportion) * 100).toFixed(1);
                        const totalMinutes = currentPropTime - 1;
                        const content = `<div><strong>Activity Proportions</strong></div><div>Time: ${Math.floor((currentPropTime - 1) / 60)}h ${(currentPropTime - 1) % 60}m (${totalMinutes} minutes)</div><div>Male Activity: ${malePercent}%</div><div>Female Activity: ${femalePercent}%</div>`;
                        
                        tooltipLightOffProportion
                            .html(content)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 10) + 'px')
                            .style('opacity', 0.9);
                    }
                })
                .on('mouseenter', function(event) {
                    // Show vertical line on initial hover
                    lightOffProportion.select('.vertical-indicator').attr('opacity', 0.7);
                })
                .on('mouseleave', function() {
                    // Hide vertical line and tooltip
                    lightOffProportion.select('.vertical-indicator').attr('opacity', 0);
                    tooltipLightOffProportion.style('opacity', 0);
                });
        }
        
        // Update light-on proportion plot
        if (lightOnProportions.length > 0) {
            // Male area (bottom)
            const lightOnMaleArea = lightOnProportion.selectAll('.male-area')
                .data([lightOnProportions]);
            
            lightOnMaleArea.enter()
                .append('path')
                .attr('class', 'male-area')
                .merge(lightOnMaleArea)
                .attr('d', areaGenerator)
                .attr('fill', 'var(--color-male)')
                .attr('opacity', 0.6);
            
            // Female area (top)
            const lightOnFemaleArea = lightOnProportion.selectAll('.female-area')
                .data([lightOnProportions]);
            
            lightOnFemaleArea.enter()
                .append('path')
                .attr('class', 'female-area')
                .merge(lightOnFemaleArea)
                .attr('d', areaGeneratorInverted)
                .attr('fill', 'var(--color-female)')
                .attr('opacity', 0.6);
            
            // Add vertical line indicator (initially hidden)
            const lightOnVerticalLine = lightOnProportion.selectAll('.vertical-indicator')
                .data([0]);
            
            lightOnVerticalLine.enter()
                .append('line')
                .attr('class', 'vertical-indicator')
                .attr('stroke', 'var(--color-accent)')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3')
                .attr('opacity', 0)
                .attr('y1', 0)
                .attr('y2', ACTIVITY_RANK.PROPORTION_HEIGHT)
                .merge(lightOnVerticalLine);
            
            // Add invisible overlay rectangle for hover detection
            const lightOnOverlay = lightOnProportion.selectAll('.proportion-overlay')
                .data([1]); // Use constant data to avoid rebinding issues
            
            lightOnOverlay.enter()
                .append('rect')
                .attr('class', 'proportion-overlay')
                .merge(lightOnOverlay)
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', ACTIVITY_RANK.PROPORTION_WIDTH)
                .attr('height', ACTIVITY_RANK.PROPORTION_HEIGHT)
                .attr('fill', 'transparent')
                .style('cursor', 'crosshair')
                .on('mousemove', function(event) {
                    const [mouseX] = d3.pointer(event, this);
                    const currentPropTime = Math.max(1, Math.min(maxTime, Math.round(proportionXScale.invert(mouseX))));
                    const currentPropData = lightOnProportions.find(d => d.time === currentPropTime) || lightOnProportions[lightOnProportions.length - 1];
                    
                    if (currentPropData) {
                        // Update vertical line position
                        lightOnProportion.select('.vertical-indicator')
                            .attr('x1', proportionXScale(currentPropTime))
                            .attr('x2', proportionXScale(currentPropTime))
                            .attr('opacity', 0.7);
                        
                        const malePercent = (currentPropData.proportion * 100).toFixed(1);
                        const femalePercent = ((1 - currentPropData.proportion) * 100).toFixed(1);
                        const totalMinutes = currentPropTime - 1;
                        const content = `<div><strong>Activity Proportions</strong></div><div>Time: ${Math.floor((currentPropTime - 1) / 60)}h ${(currentPropTime - 1) % 60}m (${totalMinutes} minutes)</div><div>Male Activity: ${malePercent}%</div><div>Female Activity: ${femalePercent}%</div>`;
                        
                        tooltipLightOnProportion
                            .html(content)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 10) + 'px')
                            .style('opacity', 0.9);
                    }
                })
                .on('mouseenter', function(event) {
                    // Show vertical line on initial hover
                    lightOnProportion.select('.vertical-indicator').attr('opacity', 0.7);
                })
                .on('mouseleave', function() {
                    // Hide vertical line and tooltip
                    lightOnProportion.select('.vertical-indicator').attr('opacity', 0);
                    tooltipLightOnProportion.style('opacity', 0);
                });
        }
    }

    // Animation function
    function animate() {
        if (!isPlaying) return;
        
        currentTime += 1; // Advance by 1 minute each frame (slower than before)
        if (currentTime > CYCLE.MINUTES_PER_HALF_DAY) {
            currentTime = 1; // Loop back to start
        }
        
        const selectedDay = parseInt(daySelect.property('value'));
        updateVisualization(currentTime, selectedDay);
        
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
        currentTime = 1;
        // Reset to Day 1
        daySelect.property('value', 1);
        // No need to clear caches - just update visualization
        updateVisualization(currentTime, 1);
    });

    timeSlider.on('input', function() {
        const time = +this.value;
        const selectedDay = parseInt(daySelect.property('value'));
        updateVisualization(time, selectedDay); // Update immediately regardless of playing state
    });

    daySelect.on('change', function() {
        try {
            const selectedDay = parseInt(this.value);
            
            // Validate selected day
            if (isNaN(selectedDay) || selectedDay < 1 || selectedDay > totalDays) {
                console.error('Invalid day selected:', this.value);
                return;
            }
            
            // Stop animation if playing
            if (isPlaying) {
                isPlaying = false;
                playButton.text('Play');
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            }
            
            // No need to clear caches - data is already pre-computed!
            // Just reset time and update visualization
            currentTime = 1;
            updateVisualization(currentTime, selectedDay);
        } catch (error) {
            console.error('Error changing day:', error);
            // Reset to safe state
            this.value = 1;
            currentTime = 1;
            updateVisualization(currentTime, 1);
        }
    });

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

    // Function to resume animation when leaving hover
    function resumeOnLeave() {
        if (wasPlayingBeforeHover) {
            isPlaying = true;
            wasPlayingBeforeHover = false;
            animate();
        }
        hideAllTooltips();
    }

    // Initialize visualization
    updateVisualization(currentTime, 1);

    // Add hover events to the plots container (not the entire viz container to avoid control conflicts)
    plotsContainer
        .on('mouseenter', pauseOnHover)
        .on('mouseleave', resumeOnLeave);
} 