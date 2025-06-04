import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const DATA_PATHS = {
  day: './data/combined_days.json',
  halfday: './data/combined_halfdays.json',
  hour: './data/combined_hours.json',
  minute: './data/combined_minutes.json',
};

let fullData = [];
let currentMouse = [];
let tempColor;
let globalMinTemp = 35;
let globalMaxTemp = 39;
let currentGranularity = 'hour';
const MAX_MICE = 8;
const MAX_TIMEPOINTS = 20;
let currentStep = 1; 

function computeGlobalTempRange(data) {
  globalMinTemp = d3.min(data, d => d.temp);
  globalMaxTemp = d3.max(data, d => d.temp);
}

function drawLegend() {
  d3.select('#legend-container').html('');
  const legendWidth = 120, legendHeight = 220, legendPad = 28;
  const legendSvg = d3.select('#legend-container')
    .append('svg')
    .attr('width', legendWidth)
    .attr('height', legendHeight + 2 * legendPad);
  const defs = legendSvg.append('defs');
  const gradientId = 'temp-gradient-game';
  defs.select(`#${gradientId}`).remove();
  const linearGradient = defs.append('linearGradient').attr('id', gradientId);

  linearGradient
    .attr('x1', '0%').attr('y1', '100%')
    .attr('x2', '0%').attr('y2', '0%')
    .selectAll('stop').remove();

  linearGradient.selectAll('stop')
    .data([
      { offset: '0%',   color: tempColor(globalMinTemp) },
      { offset: '100%', color: tempColor(globalMaxTemp) }
    ])
    .enter().append('stop')
    .attr('offset',     d => d.offset)
    .attr('stop-color', d => d.color);

  legendSvg.append('rect')
    .attr('x', 0)
    .attr('y', legendPad)
    .attr('width', 24)
    .attr('height', legendHeight)
    .style('fill', `url(#${gradientId})`)
    .attr('stroke', '#aaa')
    .attr('stroke-width', 1.5)
    .attr('rx', 8);

  // Legend scale and axis (vertical)
  const minT = Math.floor(globalMinTemp);
  const maxT = Math.ceil(globalMaxTemp);
  const legendScale = d3.scaleLinear()
    .domain([minT, maxT])
    .range([legendHeight + legendPad, legendPad]);
  const legendAxis = d3.axisRight(legendScale)
    .ticks(6)
    .tickFormat(d => `${d}°C`);
  legendSvg.append('g')
    .attr('transform', `translate(24,0)`)
    .call(legendAxis)
    .selectAll('text')
    .attr('fill', '#fff')
    .attr('font-size', '12px');

  // Add 'Hotter' label above and 'Colder' label below
  legendSvg.append('text')
    .attr('x', 36)
    .attr('y', 18)
    .attr('text-anchor', 'start')
    .attr('fill', tempColor(globalMaxTemp))
    .attr('font-size', '15px')
    .attr('font-weight', '600')
    .attr('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.5)')
    .text('Hotter');
  legendSvg.append('text')
    .attr('x', 36)
    .attr('y', legendHeight + legendPad + 18)
    .attr('text-anchor', 'start')
    .attr('fill', tempColor(globalMinTemp))
    .attr('font-size', '15px')
    .attr('font-weight', '600')
    .attr('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.5)')
    .text('Colder');
}

function getXAxisConfig(granularity) {
  switch (granularity) {
    case 'day':
      return { label: 'Day', ticks: 14, format: d => `Day ${d}` };
    case 'halfday':
      return { label: 'Halfday', ticks: 28, format: d => `${d}` };
    case 'hour':
      return {
        label: 'Hour',
        ticks: [0, 50, 100, 150, 200, 250, 300, 336],
        format: d => `${d}`,
        domain: [0, 336]
      };
    case 'minute':
      return {
        label: 'Minute',
        ticks: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000],
        format: d => `${d}`,
        domain: [0, 20000]
      };
    default:
      return { label: 'Time', ticks: 10, format: d => `${d}` };
  }
}

// Utility: filter a single mouse array by time window & sample to MAX_TIMEPOINTS
function filterAndSampleMouseData(mouseData) {
  if (!mouseData || !mouseData.length) return mouseData;
  let arr = mouseData;
  // Apply time-range filter consistent with granularity
  if (currentGranularity === 'day') {
    arr = arr.filter(d => d.time >= 1 && d.time <= 14);
  } else if (currentGranularity === 'halfday') {
    arr = arr.filter(d => d.time >= 0 && d.time <= 12);
  } else if (currentGranularity === 'hour') {
    arr = arr.filter(d => d.time >= 0 && d.time <= 336);
  } else if (currentGranularity === 'minute') {
    arr = arr.filter(d => d.time >= 0 && d.time <= 20000);
  }
  // Down-sample if still too large
  if (arr.length > MAX_TIMEPOINTS) {
    arr = d3.shuffle([...arr]).slice(0, MAX_TIMEPOINTS);
  }
  return arr;
}

function drawChart1(data) {
  d3.select('#graph1').html('');
  d3.select('#graph2').style('display', 'none');
  d3.select('#graph1').style('display', 'block').style('opacity', 1);
  d3.select('#legend-container').style('display', 'block'); // Show legend in main chart
  // Remove any old tooltips
  d3.selectAll('.tooltip').remove();

  const svg = d3.select('#graph1')
    .append('svg')
    .attr('width', 700)
    .attr('height', 350)
    .style('background', 'transparent');

  const { label: xLabel, ticks: xTicks, format: xFormat, domain: xDomain } = getXAxisConfig(currentGranularity);
  let minTime = d3.min(data, d => d.time);
  let maxTime = d3.max(data, d => d.time);
  if (xDomain) {
    minTime = xDomain[0];
    maxTime = xDomain[1];
  }
  const minTemp = d3.min(data, d => d.temp);
  const maxTemp = d3.max(data, d => d.temp);

  tempColor = d3.scaleSequential()
    .domain([globalMinTemp, globalMaxTemp])
    .interpolator(d3.interpolateCool);

  drawLegend();

  const x = d3.scaleLinear()
    .domain([minTime, maxTime])
    .range([60, 650]);
  const y = d3.scaleLinear()
    .domain([minTemp, maxTemp])
    .range([300, 40]);

  const zoom = d3.zoom()
    .scaleExtent([1, 5])
    .translateExtent([[0, 0], [700, 350]])
    .on('zoom', zoomed);

  const xAxis = svg.append('g')
    .attr('transform', 'translate(0,300)')
    .call(
      xTicks instanceof Array
        ? d3.axisBottom(x).tickValues(xTicks).tickFormat(xFormat)
        : d3.axisBottom(x).ticks(xTicks).tickFormat(xFormat)
    );
  const yAxis = svg.append('g')
    .attr('transform', 'translate(60,0)')
    .call(d3.axisLeft(y));

  // X and Y axis labels
  svg.append('text')
    .attr('x', 350)
    .attr('y', 340)
    .attr('text-anchor', 'middle')
    .attr('font-size', '13px')
    .attr('fill', '#7ed6df')
    .text(xLabel);
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -180)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', '13px')
    .attr('fill', '#7ed6df')
    .text('Temperature (°C)');

  // Tooltip: ensure only one exists
  let tooltip = d3.select('body').select('.tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('transition', 'opacity 0.25s');
  }
  let hideTooltipTimeout;
  let rafId;

  function jitter(amount) {
    return (Math.random() - 0.5) * amount;
  }

  svg.selectAll('image')
    .data(data)
    .enter()
    .append('image')
    .attr('x', d => x(d.time) - 10 + jitter(12))
    .attr('y', d => y(d.temp) - 10 + jitter(12))
    .attr('width', 20)
    .attr('height', 20)
    .attr('href', './image/mouse.png')
    .attr('opacity', d => currentMouse && d.id === currentMouse[0].id ? 1 : 0.5)
    .attr('filter', d => currentMouse && d.id === currentMouse[0].id ? 'drop-shadow(0 0 8px #f6e58d)' : 'drop-shadow(0 0 2px #222)')
    .attr('style', d => `filter: drop-shadow(0 0 6px ${tempColor(d.temp)});`)
    .on('mouseover', (event, d) => {
      clearTimeout(hideTooltipTimeout);
      tooltip.interrupt().transition().duration(200).style('opacity', 0.95);
      tooltip.html(`Time: ${d.time}<br>Temp: ${d.temp.toFixed(1)}°C`);
    })
    .on('mousemove', (event) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 28) + 'px');
      });
    })
    .on('mouseout', () => {
      hideTooltipTimeout = setTimeout(() => {
        tooltip.interrupt().transition().duration(200).style('opacity', 0);
      }, 120);
    });

  svg.call(zoom);

  function zoomed(event) {
    const t = event.transform;
    svg.selectAll('image')
      .attr('x', d => t.applyX(x(d.time)) - 10 + jitter(12))
      .attr('y', d => t.applyY(y(d.temp)) - 10 + jitter(12))
      .attr('width', 20 * t.k)
      .attr('height', 20 * t.k);
    svg.selectAll('circle')
      .attr('cx', d => t.applyX(x(d.time)) + jitter(12))
      .attr('cy', d => t.applyY(y(d.temp)) + jitter(12))
      .attr('r', 10 * t.k);
    xAxis.call(d3.axisBottom(x).scale(t.rescaleX(x)));
    yAxis.call(d3.axisLeft(y).scale(t.rescaleY(y)));
  }
}

function drawChart2(data) {
  d3.select('#graph2').html('');
  d3.select('#graph1').style('display', 'none');
  d3.select('#graph2').style('display', 'block').style('opacity', 1);
  d3.select('#legend-container').style('display', 'block'); // Show legend in main chart
  // Remove any old tooltips
  d3.selectAll('.tooltip').remove();

  const svg = d3.select('#graph2')
    .append('svg')
    .attr('width', 700)
    .attr('height', 350)
    .style('background', 'transparent');

  const { label: xLabel, ticks: xTicks, format: xFormat, domain: xDomain } = getXAxisConfig(currentGranularity);
  let minTime = d3.min(data, d => d.time);
  let maxTime = d3.max(data, d => d.time);
  if (xDomain) {
    minTime = xDomain[0];
    maxTime = xDomain[1];
  }
  const yField = data[0].act !== undefined ? 'act' : 'activity';
  const yMin = 0;
  const yMax = 40;
  const y = d3.scaleLinear()
    .domain([yMin, yMax])
    .range([300, 40]);
  const minTemp = d3.min(data, d => d.temp);
  const maxTemp = d3.max(data, d => d.temp);

  tempColor = d3.scaleSequential()
    .domain([globalMinTemp, globalMaxTemp])
    .interpolator(d3.interpolateCool);

  drawLegend();

  const x = d3.scaleLinear()
    .domain([minTime, maxTime])
    .range([60, 650]);

  const zoom = d3.zoom()
    .scaleExtent([1, 5])
    .translateExtent([[0, 0], [700, 350]])
    .on('zoom', zoomed);

  const xAxis = svg.append('g')
    .attr('transform', 'translate(0,300)')
    .call(
      xTicks instanceof Array
        ? d3.axisBottom(x).tickValues(xTicks).tickFormat(xFormat)
        : d3.axisBottom(x).ticks(xTicks).tickFormat(xFormat)
    );
  const yAxis = svg.append('g')
    .attr('transform', 'translate(60,0)')
    .call(d3.axisLeft(y));

  // X and Y axis labels
  svg.append('text')
    .attr('x', 350)
    .attr('y', 340)
    .attr('text-anchor', 'middle')
    .attr('font-size', '13px')
    .attr('fill', '#7ed6df')
    .text(xLabel);
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -180)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', '13px')
    .attr('fill', '#7ed6df')
    .text('Activity');

  // Tooltip: ensure only one exists
  let tooltip = d3.select('body').select('.tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('transition', 'opacity 0.25s');
  }
  let hideTooltipTimeout;
  let rafId;

  function jitter(amount) {
    return (Math.random() - 0.5) * amount;
  }

  data = filterAndSampleMouseData(data);

  svg.selectAll('image')
    .data(data)
    .enter()
    .append('image')
    .attr('x', d => x(d.time) - 10 + jitter(12))
    .attr('y', d => y(d[yField]) - 10 + jitter(12))
    .attr('width', 20)
    .attr('height', 20)
    .attr('href', './image/mouse.png')
    .attr('opacity', d => currentMouse && d.id === currentMouse[0].id ? 1 : 0.5)
    .attr('filter', d => currentMouse && d.id === currentMouse[0].id ? 'drop-shadow(0 0 8px #f6e58d)' : 'drop-shadow(0 0 2px #222)')
    .attr('style', d => `filter: drop-shadow(0 0 6px ${tempColor(d.temp)});`)
    .on('mouseover', (event, d) => {
      clearTimeout(hideTooltipTimeout);
      tooltip.interrupt().transition().duration(200).style('opacity', 0.95);
      tooltip.html(`Time: ${d.time}<br>Activity: ${d[yField]}<br>Temp: ${d.temp.toFixed(1)}°C`);
    })
    .on('mousemove', (event) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 28) + 'px');
      });
    })
    .on('mouseout', () => {
      hideTooltipTimeout = setTimeout(() => {
        tooltip.interrupt().transition().duration(200).style('opacity', 0);
      }, 120);
    });

  svg.call(zoom);

  // Immediately ensure estrus guessing UI is visible on chart load
  d3.select('#estrus-guess').style('display', 'block');
  d3.select('#sex-guess').style('display', 'none');
  currentStep = 2;

  function zoomed(event) {
    const t = event.transform;
    svg.selectAll('image')
      .attr('x', d => t.applyX(x(d.time)) - 10 + jitter(12))
      .attr('y', d => t.applyY(y(d[yField])) - 10 + jitter(12))
      .attr('width', 20 * t.k)
      .attr('height', 20 * t.k);
    svg.selectAll('circle')
      .attr('cx', d => t.applyX(x(d.time)) + jitter(12))
      .attr('cy', d => t.applyY(y(d[yField])) + jitter(12))
      .attr('r', 10 * t.k);
    xAxis.call(d3.axisBottom(x).scale(t.rescaleX(x)));
    yAxis.call(d3.axisLeft(y).scale(t.rescaleY(y)));

    // Ensure correct UI after initial render of drawChart2
    d3.select('#estrus-guess').style('display', 'block');
    d3.select('#sex-guess').style('display', 'none');
    currentStep = 2;
  }
}

// Helper to infer sex from mouse id
function getSexFromId(id) {
  if (id.startsWith('f')) return 'female';
  if (id.startsWith('m')) return 'male';
  return 'unknown';
}

function loadNextMouse() {
  const grouped = d3.group(fullData, d => d.id);
  const mice = Array.from(grouped.keys());
  const chosen = mice[Math.floor(Math.random() * mice.length)];
  currentMouse = filterAndSampleMouseData(grouped.get(chosen));
  currentStep = 1;
  d3.select('#final-explanation').style('display', 'none');
  d3.select('#legend').style('display', 'block');
  d3.select('#sex-result').text('');
  d3.select('#result').text('');
  d3.select('#estrus-guess').style('display', 'none');
  drawChart1(fullData);
  d3.select('#granularity-select').style('display', 'inline-block'); // Always show dropdown in main game
}

function getCurrentMouseSex() {
  return getSexFromId(currentMouse[0].id);
}

function getCurrentMouseEstrus() {
  return currentMouse.some(d => d.estrus === true);
}

// Button Handlers

document.getElementById('guess-male').addEventListener('click', () => {
  checkSexGuess('male');
});
document.getElementById('guess-female').addEventListener('click', () => {
  checkSexGuess('female');
});

document.getElementById('estrus-yes').addEventListener('click', () => {
  checkEstrusGuess(true);
});
document.getElementById('estrus-no').addEventListener('click', () => {
  checkEstrusGuess(false);
});

document.getElementById('granularity-select').addEventListener('change', (e) => {
  currentGranularity = e.target.value;
  // If on estrus guessing step, reload data for the same mouse and show estrus graph (for any sex)
  if (typeof currentStep !== 'undefined' && currentStep === 2 && currentMouse && currentMouse[0]) {
    d3.select('#graph2').transition().duration(400).style('opacity', 0).on('end', () => {
      d3.select('#graph2').style('display', 'none');
      d3.select('#graph1').style('opacity', 0).style('display', 'none');
      // Only reload data for the current mouse and show estrus graph, do not reset to sex guessing
      loadDataAndStart(currentMouse[0].id);
      currentStep = 2; // Ensure we stay in estrus step
      setTimeout(() => {
        d3.select('#graph2').transition().duration(400).style('opacity', 1);
        d3.select('#estrus-guess').style('display', 'block'); // Ensure estrus guess stays visible
        d3.select('#sex-guess').style('display', 'none');
      }, 400);
    });
    d3.select('#granularity-select').style('display', 'inline-block'); // Keep dropdown visible in estrus step
    return; // Prevent any further logic from running
  }
  // Fade out both graphs, then reload data and fade in
  d3.select('#graph1').transition().duration(400).style('opacity', 0).on('end', () => {
    d3.select('#graph1').style('display', 'none');
    d3.select('#graph2').style('opacity', 0).style('display', 'none');
    loadDataAndStart();
    setTimeout(() => {
      d3.select('#graph1').transition().duration(400).style('opacity', 1);
    }, 400);
  });
  d3.select('#granularity-select').style('display', 'inline-block'); // Show dropdown in main game
});

function checkSexGuess(guess) {
  const correctSex = getCurrentMouseSex();
  const sexResult = document.getElementById('sex-result');
  if (guess === correctSex) {
    sexResult.textContent = '✅ You\'ve glimpsed the hidden truth!';
    setTimeout(() => {
      d3.select('#graph1').transition().duration(600).style('opacity', 0).on('end', () => {
        d3.select('#graph1').style('display', 'none');
        d3.select('#sex-guess').style('display', 'none'); // Hide sex guess buttons
        if (correctSex === 'male') {
          d3.select('#legend-container').style('display', 'none');
          d3.select('#estrus-guess').style('display', 'none');
          let summary = 'It was a male.';
          document.getElementById('final-result').textContent = summary;
          d3.select('#final-explanation').style('display', 'block').transition().duration(600).style('opacity', 1);
          document.getElementById('granularity-select').style.display = 'none';
          if (document.getElementById('granularity-select').parentElement)
            document.getElementById('granularity-select').parentElement.style.display = 'none';
          showFinalInsight();

        } else {
          d3.select('#graph2').style('opacity', 0).style('display', 'block');
          d3.select('#estrus-guess').style('display', 'block');
          document.getElementById('result').textContent = '';
          d3.select('#granularity-select').style('display', 'inline-block'); 
          drawChart2(currentMouse);
          setTimeout(() => {
            d3.select('#graph2').transition().duration(600).style('opacity', 1);
          }, 50);
        }
      });
    }, 1000);
  } else {
    sexResult.textContent = '❌ Try again -- the inner life of a mouse is subtle!';
  }
}

function checkEstrusGuess(guess) {
  const correct = getCurrentMouseEstrus();
  const result = document.getElementById('result');
  if (guess === correct) {
    result.textContent = '✅ You\'ve glimpsed the hidden truth!';
    setTimeout(() => {
      d3.select('#graph2').transition().duration(600).style('opacity', 0).on('end', () => {
        d3.select('#graph2').style('display', 'none');
        d3.select('#legend-container').style('display', 'none');
        const sex = getCurrentMouseSex();
        const estrus = getCurrentMouseEstrus();
        let summary = '';
        if (sex === 'female' && estrus) summary = 'It was a female in estrus.';
        else summary = 'It was a female not in estrus.';
        document.getElementById('final-result').textContent = summary;
        d3.select('#final-explanation').style('display', 'block').transition().duration(600).style('opacity', 1);
        document.getElementById('granularity-select').style.display = 'none';
        if (document.getElementById('granularity-select').parentElement)
          document.getElementById('granularity-select').parentElement.style.display = 'none';
        d3.select('#estrus-guess').style('display', 'none');
        showFinalInsight();
      });
    }, 1200);
  } else {
    result.textContent = '❌ Try again -- the inner life of a mouse is subtle!';
  }
}

function loadDataAndStart(mouseIdToShow = null) {
  let path = DATA_PATHS[currentGranularity];
  d3.json(path).then(data => {
    // Group by mouse
    const grouped = d3.group(data, d => d.id);
    const mice = Array.from(grouped.keys());
    // Step 1: Guarantee mouseIdToShow is included
    let guaranteedMice = [];
    if (mouseIdToShow && grouped.has(mouseIdToShow)) {
      guaranteedMice.push(mouseIdToShow);
    }
    // Sample up to MAX_MICE mice, balanced
    const maleMice = mice.filter(id => getSexFromId(id) === 'male');
    const femaleMice = mice.filter(id => getSexFromId(id) === 'female');
    // Remove guaranteed mice from the pool
    const allOtherMice = mice.filter(id => !guaranteedMice.includes(id));
    // Shuffle and sample from remaining
    let sampledMice = [...guaranteedMice];
    sampledMice = sampledMice.concat(
      d3.shuffle(allOtherMice).slice(0, MAX_MICE - sampledMice.length)
    );
    // For each mouse, filter by time range and sample up to MAX_TIMEPOINTS
    fullData = [];
    sampledMice.forEach(mouseId => {
      let mouseData = grouped.get(mouseId);
      if (currentGranularity === 'day') {
        mouseData = mouseData.filter(d => d.time >= 1 && d.time <= 14);
      } else if (currentGranularity === 'halfday') {
        mouseData = mouseData.filter(d => d.time >= 0 && d.time <= 12);
      } else if (currentGranularity === 'hour') {
        mouseData = mouseData.filter(d => d.time >= 0 && d.time <= 336);
      } else if (currentGranularity === 'minute') {
        mouseData = mouseData.filter(d => d.time >= 0 && d.time <= 20000);
      }
      // For all granularities, sample up to MAX_TIMEPOINTS
      mouseData = mouseData.length > MAX_TIMEPOINTS ? d3.shuffle(mouseData).slice(0, MAX_TIMEPOINTS) : mouseData;
      fullData = fullData.concat(mouseData);
    });
    computeGlobalTempRange(fullData);
    if (mouseIdToShow && grouped.has(mouseIdToShow)) {
      // If a specific mouse is requested (for estrus step), show her data
      currentMouse = grouped.get(mouseIdToShow);
      currentMouse = filterAndSampleMouseData(currentMouse);
      drawChart2(currentMouse);
      d3.select('#estrus-guess').style('display', 'block');
      d3.select('#sex-guess').style('display', 'none');
      d3.select('#final-explanation').style('display', 'none');
      d3.select('#result').text('');
      currentStep = 2; // Set state to estrus guessing
    } else {
      loadNextMouse();
    }
  });
}

// Initial load
d3.select('#granularity-select').property('value', currentGranularity);
loadDataAndStart();

// Show/hide overlay and start game
function showGame() {
  const overlay = document.getElementById('start-overlay');
  const container = document.querySelector('.container');
  overlay.classList.add('fade-out');
  setTimeout(() => {
    overlay.style.display = 'none';
    container.style.display = 'block';
    container.classList.add('fade-in');
    d3.select('#granularity-select').style('display', 'inline-block'); // Show dropdown on new game
  }, 700);
}
document.getElementById('start-btn').addEventListener('click', showGame);

// --- Final Insight Visualization: Circular Wave Plot ---
function showFinalInsight() {
  // Remove any previous plot
  d3.select('#final-insight').remove();
  d3.select('#granularity-select').style('display', 'none'); // Always hide dropdown in final insight/results
  d3.select('#legend-container').style('display', 'none'); // Hide legend in final results
  d3.select('#final-explanation').style('display', 'block').style('opacity', 1); // Ensure final explanation is visible
  // Prepare data: one point per mouse, average temp and activity
  // Only use mice present in the current sampled data
  const grouped = d3.group(fullData, d => d.id);
  const mice = Array.from(grouped.keys());
  const mouseStats = mice.map(id => {
    const arr = grouped.get(id) || [];
    return {
      id,
      sex: getSexFromId(id),
      avgTemp: arr.length ? d3.mean(arr, d => d.temp) : null,
      avgAct: arr.length ? d3.mean(arr, d => d.act !== undefined ? d.act : d.activity) : null
    };
  }).filter(d => d.avgTemp !== null);
  // Sort mice by avgTemp (colder to hotter)
  mouseStats.sort((a, b) => a.avgTemp - b.avgTemp);
  // SVG setup
  const w = 540, h = 540, r0 = 150, r1 = 210;
  const svg = d3.select('#final-explanation')
    .append('svg')
    .attr('id', 'final-insight')
    .attr('width', w)
    .attr('height', h)
    .style('display', 'block')
    .style('margin', '120px auto 0 auto') // push down for more spacing
    .style('opacity', 0);
  // Color by position (inside = blue, outside = pink)
  const minTemp = d3.min(mouseStats, d => d.avgTemp);
  const maxTemp = d3.max(mouseStats, d => d.avgTemp);
  const midTemp = (minTemp + maxTemp) / 2;
  const colorByRadius = temp => temp < midTemp ? '#00a8ff' : '#f368e0';
  // Radius by avgTemp (colder = inner, hotter = outer)
  const radius = d3.scaleLinear()
    .domain([minTemp, maxTemp])
    .range([r0, r1]);
  // Assign each mouse a unique angle, evenly spaced
  const angle = d3.scaleLinear()
    .domain([0, mouseStats.length])
    .range([0, 2 * Math.PI]);
  // Draw the outer and inner circles for visual reference (draw these before the mice so mice are on top)
  const pointsGroup = svg.append('g')
    .attr('transform', `translate(${w/2},${h/2 + 40})`); // shift graph down
  pointsGroup.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', r0)
    .attr('stroke', '#344a60')
    .attr('stroke-width', 2)
    .attr('fill', 'none')
    .attr('opacity', 0.5);
  pointsGroup.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', r1)
    .attr('stroke', '#344a60')
    .attr('stroke-width', 2)
    .attr('fill', 'none')
    .attr('opacity', 0.5);

  pointsGroup.selectAll('pos-circle')
    .data(mouseStats)
    .enter()
    .append('circle')
    .attr('cx', (d, i) => Math.cos(angle(i) - Math.PI/2) * radius(d.avgTemp))
    .attr('cy', (d, i) => Math.sin(angle(i) - Math.PI/2) * radius(d.avgTemp))
    .attr('r', 18)
    .attr('fill', d => colorByRadius(d.avgTemp))
    .attr('opacity', 0.18);
  // Draw mice scattered around the circle, radius by avgTemp
  pointsGroup.selectAll('image')
    .data(mouseStats)
    .enter()
    .append('image')
    .attr('x', (d, i) => Math.cos(angle(i) - Math.PI/2) * radius(d.avgTemp) - 13)
    .attr('y', (d, i) => Math.sin(angle(i) - Math.PI/2) * radius(d.avgTemp) - 13)
    .attr('width', 26)
    .attr('height', 26)
    .attr('href', './image/mouse.png')
    .attr('opacity', 0.95)
    .attr('style', d => `filter: drop-shadow(0 0 6px ${colorByRadius(d.avgTemp)});`)
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1).attr('width', 32).attr('height', 32);
      d3.select('#final-insight-tooltip')
        .style('opacity', 1)
        .html(`<b>Mouse ${d.id}</b><br>Sex: ${d.sex}<br>Avg Temp: ${d.avgTemp.toFixed(2)}°C`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.95).attr('width', 26).attr('height', 26);
      d3.select('#final-insight-tooltip').transition().duration(200).style('opacity', 0);
    });

  svg.append('circle').attr('cx', 40).attr('cy', h-30).attr('r', 10).attr('fill', '#00a8ff');
  svg.append('text').attr('x', 60).attr('y', h-26).attr('fill', '#7ed6df').attr('font-size', 16).text('Inside (Cooler)');
  svg.append('circle').attr('cx', 180).attr('cy', h-30).attr('r', 10).attr('fill', '#f368e0');
  svg.append('text').attr('x', 200).attr('y', h-26).attr('fill', '#f368e0').attr('font-size', 16).text('Outside (Hotter)');
  // Fade in
  svg.transition().duration(900).style('opacity', 1);
  // Tooltip div
  if (!document.getElementById('final-insight-tooltip')) {
    d3.select('body').append('div')
      .attr('id', 'final-insight-tooltip')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('transition', 'opacity 0.25s');
  }
  svg.append('text')
    .attr('x', w/2)
    .attr('y', 24)
    .attr('text-anchor', 'middle')
    .attr('fill', '#7ed6df')
    .attr('font-size', '22px')
    .text('Mouse Temperatures in a Circular Wave');
  svg.append('text')
    .attr('x', w/2)
    .attr('y', 44)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .attr('font-size', '15px')
    .call(function(text){
      text.append('tspan').attr('x', w/2).attr('dy', 0).text('Each mouse shows average temperature (radius),');
      text.append('tspan').attr('x', w/2).attr('dy', 18).text('and is scattered around the circle.');
    });
}
