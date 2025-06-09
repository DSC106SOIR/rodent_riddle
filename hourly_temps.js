import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Constants for your visualization
const HOURLY_TEMPS_CONFIG = {
    MARGIN: { top: 20, right: 20, bottom: 60, left: 60 },
    WIDTH: 800,
    HEIGHT: 400,
    // Add your specific constants
};

export async function createHourlyTemps() {
    // Load data
    const data = await d3.json('./data/hourly_averages.json');
    
    // Select container
    const container = d3.select('#hourly-temps');
    
    // Your D3.js visualization code here
    
    // Example structure:
    const svg = container.append('svg')
        .attr('width', HOURLY_TEMPS_CONFIG.WIDTH + 20)
        .attr('height', HOURLY_TEMPS_CONFIG.HEIGHT + 70)
    

    const x = d3.range(24);

    const f_averages = data.female_hourly_temperatures;
    const m_averages = data.male_hourly_temperatures;

    const m_25 = data.male_25th_perc;
    const m_75 = data.male_75th_perc;
    const f_25 = data.female_25th_perc;
    const f_75 = data.female_75th_perc;

    const allY = [...f_averages, ...m_averages];
    const yMax = d3.max(allY) + .5;

    const xScale = d3.scaleLinear().domain([0, 23]).range([HOURLY_TEMPS_CONFIG.MARGIN.left, HOURLY_TEMPS_CONFIG.WIDTH]);
    const yScale = d3.scaleLinear().domain([35.8, yMax]).range([HOURLY_TEMPS_CONFIG.HEIGHT, HOURLY_TEMPS_CONFIG.MARGIN.top]);

    const line = d3.line()
      .x((d, i) => xScale(x[i]))
      .y(d => yScale(d));

    const m_areaData = m_25.map((val, i) => ({
        hour: i,
        lower: val,
        upper: m_75[i]
    }));

    const f_areaData = f_25.map((val, i) => ({
        hour: i,
        lower: val,
        upper: f_75[i]
    }));

    
    const m_area = d3.area()
        .x(d => xScale(d.hour))
        .y0(d => Math.min(yScale(d.lower), HOURLY_TEMPS_CONFIG.HEIGHT))
        .y1(d => yScale(d.upper));

    const f_area = d3.area()
        .x(d => xScale(d.hour))
        .y0(d => yScale(d.lower))
        .y1(d => Math.max(yScale(d.upper), 30));

    // Background gradient for day/night cycle (smooth transition)
    svg.append("defs")
      .append("linearGradient")
      .attr("id", "hourly-background-gradient")
      .attr("x1", "0%").attr("x2", "100%")
      .attr("y1", "0%").attr("y2", "0%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#506680" },   // Night color
        { offset: "30%", color: "#506680" },  // Night color (middle of night)
        { offset: "100%", color: "#F4C05E" } // Day color
      ])
      .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    svg.append("rect")
      .attr("x", HOURLY_TEMPS_CONFIG.MARGIN.left)
      .attr("y", HOURLY_TEMPS_CONFIG.MARGIN.top)
      .attr("width", HOURLY_TEMPS_CONFIG.WIDTH - HOURLY_TEMPS_CONFIG.MARGIN.left)
      .attr("height", HOURLY_TEMPS_CONFIG.HEIGHT - HOURLY_TEMPS_CONFIG.MARGIN.top)
      .attr("fill", "url(#hourly-background-gradient)")
      .attr("opacity", 0.4);

    svg.append("path")
      .datum(m_areaData)
      .attr("id", "m_area")
      .attr("fill", "#4C72B0")
      .attr("opacity", 0)
      .attr("d", m_area);

    svg.append("path")
      .datum(f_areaData)
      .attr("id", "f_area")
      .attr("fill", "#E86A92")
      .attr("opacity", 0)
      .attr("d", f_area);


    svg.append("path")
      .datum(f_averages)
      .attr("class", "line")
      .attr("id", "f_line")
      .attr("d", line)
      .attr("stroke", "#E86A92")
      .attr("fill", "none")
      .attr('stroke-width', '2px')

    svg.append("path")
      .datum(m_averages)
      .attr("class", "line")
      .attr("id", "m_line")
      .attr("d", line)
      .attr("stroke", "#4C72B0")
      .attr('stroke-width', '2px')
      .attr("fill", "none");

    svg.append("path")
      .datum(m_averages)
      .attr("class", "line")
      .attr("id", "m_hit")
      .attr("d", line)
      .attr("stroke", "#8FBFE0")
      .attr('stroke-width', '30px')
      .attr("fill", "none")
      .attr("opacity", 0);

    svg.append("path")
      .datum(f_averages)
      .attr("class", "line")
      .attr("id", "f_hit")
      .attr("d", line)
      .attr("stroke", "#8FBFE0")
      .attr('stroke-width', '30px')
      .attr("fill", "none")
      .attr("opacity", 0);

    svg.append("text")
      .attr("x", xScale(4))
      .attr("y", yScale(m_25[4]) + 10)
      .attr("id", "m_area")
      .text("25th percentile")
      .style("font-size", "0.8em")
      .attr("opacity", 0)
      .style("fill", "var(--color-accent)");

    svg.append("text")
      .attr("x", xScale(4))
      .attr("y", yScale(m_75[4]) - 10)
      .attr("id", "m_area")
      .text("75th percentile")
      .style("font-size", "0.8em")
      .attr("opacity", 0)
      .style("fill", "var(--color-accent)");


    // mousing over reveals and hides the area
    d3.select("#m_hit").on("mouseover", function(event) {
      d3.selectAll('#m_area').attr("opacity", 0.4)
    }).on("mouseout", function(event ) {
      d3.selectAll('#m_area').attr("opacity", 0)
    })
    
    d3.select("#f_hit").on("mouseover", function(event) {
      d3.select('#f_area').attr("opacity", 0.4)
    }).on("mouseout", function(event ) {
      d3.select('#f_area').attr("opacity", 0)
    })

    const avgFemale = d3.mean(f_averages);
    const avgMale = d3.mean(m_averages);

    svg.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(23))
      .attr("y1", yScale(avgFemale))
      .attr("y2", yScale(avgFemale))
      .attr("stroke", "#E86A92")
      .attr("stroke-dasharray", "5,5");

    svg.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(23))
      .attr("y1", yScale(avgMale))
      .attr("y2", yScale(avgMale))
      .attr("stroke", "#4C72B0")
      .attr("stroke-dasharray", "5,5");

    const yTicks = d3.range(35.8, yMax + 0.001, 0.2);

    svg.append("g")
      .attr("transform", `translate(${HOURLY_TEMPS_CONFIG.MARGIN.left},0)`)
      .call(d3.axisLeft(yScale).tickValues(yTicks).tickFormat(d => `${d.toFixed(1)}°`))
      .selectAll("text")
      .style("font-size", "0.8em")
      .style("fill", "var(--color-accent)");

    svg.append("g")
      .attr("transform", `translate(0, ${HOURLY_TEMPS_CONFIG.HEIGHT})`)
      .call(d3.axisBottom(xScale)
        .tickValues(d3.range(0, 24, 2))
        .tickFormat(d => `${d}:00`))
      .selectAll("text")
      .style("font-size", "0.8em")
      .style("fill", "var(--color-accent)");

    svg.append("text")
      .attr("x", HOURLY_TEMPS_CONFIG.MARGIN.left)
      .attr("y", HOURLY_TEMPS_CONFIG.MARGIN.top - 5)
      .attr("text-anchor", "start")
      .style("font-size", "0.9em")
      .style("fill", "var(--color-accent)")
      .text("Female Mice Are Warmer Than Male Mice");

    svg.append("text")
      .attr("x", HOURLY_TEMPS_CONFIG.WIDTH / 2 + 40)
      .attr("y", HOURLY_TEMPS_CONFIG.HEIGHT + 40)
      .attr("text-anchor", "middle")
      .attr("class", "axis-label")
      .style("font-size", "0.8em")
      .style("fill", "var(--color-accent)")
      .text("Hour");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -HOURLY_TEMPS_CONFIG.HEIGHT / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("class", "axis-label")
      .style("font-size", "0.8em")
      .style("fill", "var(--color-accent)")
      .text("Average Mouse Body Temperature");

    const legend = svg.append("g")
      .attr("transform", `translate(${HOURLY_TEMPS_CONFIG.WIDTH - 250}, ${HOURLY_TEMPS_CONFIG.MARGIN.top + 30})`)
      .attr("class", "legend");

    const legendItems = [
      { label: "Hourly Average Female Temp", color: "#E86A92" },
      { label: "Avg Nighttime Female Temp", color: "#E86A92", dashed: true },
      { label: "Hourly Average Male Temp", color: "#4C72B0" },
      { label: "Avg Nighttime Male Temp", color: "#4C72B0", dashed: true },
      { label: "Nighttime", color: "var(--color-night)"}

    ];

    legendItems.forEach((item, i) => {
      const y = i * 20;
      legend.append("line")
        .attr("x1", 0).attr("x2", 20)
        .attr("y1", y).attr("y2", y)
        .attr("stroke", item.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", item.dashed ? "5,5" : "none");

      legend.append("text")
        .attr("x", 25).attr("y", y + 4)
        .style("font-size", "0.8em")
        .style("fill", "var(--color-accent)")
        .text(item.label);
    });
}