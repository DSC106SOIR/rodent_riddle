import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

export function compareTemperatureChart() {
  Promise.all([
    d3.json('./data/estrus_combined.json'),
    d3.json('./data/1daybefore_estrus_combined.json'),
    d3.json('./data/1dayafter_estrus_combined.json'),
    d3.json('./data/2dayafter_estrus_combined.json')
  ]).then(([estrusData, beforeData, after1Data, after2Data]) => {
    const containerWidth = parseInt(d3.select('#other-viz').style('width')) || 1000;
    const width = Math.max(containerWidth, 600);
    const margin = { top: 20, right: 40, bottom: 80, left: 50 };
    const height = 500; 


    const svg = d3.select('#other-viz').append('svg')
      .attr('width', width)
      .attr('height', height);

    svg.append("text")
      .attr("x", width / 2).attr("y", 15)
      .attr("text-anchor", "middle")
      .style("font-size", "20px").style("font-weight", "bold")
      .text("Female Mouse Temperature Comparison in a Day");

    const allData = estrusData.concat(beforeData, after1Data, after2Data);

    const xFull = d3.scaleLinear()
      .domain(d3.extent(allData, d => d.time))
      .range([margin.left, width - margin.right]);

    let x = xFull.copy();  // dynamic x axis

    const y = d3.scaleLinear()
      .domain(d3.extent(allData, d => d.temperature)).nice()
      .range([height - margin.bottom, margin.top]);

    const line = d3.line()
      .x(d => x(d.time)).y(d => y(d.temperature));

    svg.append("defs")
      .append("linearGradient")
      .attr("id", "background-gradient")
      .attr("x1", "0%").attr("x2", "100%")
      .attr("y1", "0%").attr("y2", "0%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#506680" },
        { offset: "100%", color: "#F4C05E" }
      ])
      .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    svg.append("rect")
      .attr("x", margin.left).attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "url(#background-gradient)")
      .attr("opacity", 0.5);

    
    const xAxisG = svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .attr('class', 'x-axis')
    .call(d3.axisBottom(x));

    
    svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - margin.bottom + 40)  
    .attr('text-anchor', 'middle')
    .attr('fill', 'black')
    .style('font-size', '14px')
    .text('Time(minutes)');


      
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .append('text')
      .attr('x', -height / 2).attr('y', -40)
      .attr('transform', 'rotate(-90)')
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text('Temperature (°C)');

    const datasets = [
      { data: estrusData, color: 'red', label: 'Estrus Day' },
      { data: beforeData, color: 'steelblue', label: '1 Day Before Estrus Day' },
      { data: after1Data, color: 'green', label: '1 Day After Estrus Day' },
      { data: after2Data, color: 'purple', label: '2 Days After Estrus Day' }
    ];

    const paths = datasets.map(d =>
      svg.append('path')
        .datum(d.data)
        .attr('fill', 'none')
        .attr('stroke', d.color)
        .attr('stroke-width', 2)
        .attr('d', line)
    );


    const legendX = width - margin.right - 180;
    datasets.forEach((d, i) => {
      const yPos = margin.top + 10 + i * 20;
      svg.append("circle").attr("cx", legendX).attr("cy", yPos).attr("r", 6).style("fill", d.color);
      svg.append("text").attr("x", legendX + 10).attr("y", yPos + 4)
        .text(d.label).style("font-size", "12px").style("dominant-baseline", "middle");
    });

    const tooltip = d3.select("#other-viz")
    .append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "4px 6px")
    .style("border-radius", "4px")
    .style("font-size", "11px")
    .style("white-space", "nowrap")
    .style("max-width", "180px")
    .style("box-shadow", "2px 2px 4px rgba(0,0,0,0.1)")
    .style("display", "none")
    .style("pointer-events", "none");


    const hoverLine = svg.append("line")
      .attr("stroke", "gray").attr("stroke-width", 1)
      .attr("y1", margin.top).attr("y2", height - margin.bottom)
      .style("opacity", 0);

    const bisectTime = d3.bisector(d => d.time).left;

    let zoomTimeout = null;

    svg.append("rect")
      .attr("fill", "transparent")
      .attr("x", margin.left).attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const time = x.invert(mouseX);


        const activities = {};
        datasets.forEach(d => {
          const i = bisectTime(d.data, time);
          const d0 = d.data[i - 1], d1 = d.data[i];
          if (!d0 || !d1) return;
          const value = Math.abs(time - d0.time) < Math.abs(time - d1.time) ? d0 : d1;
          activities[d.label] = value.act;
        });

        hoverLine
          .attr("x1", x(time)).attr("x2", x(time))
          .style("opacity", 1);

        tooltip.html(`
          <strong>Time:</strong> ${Math.round(time)}<br/>
          ${Object.entries(activities).map(([k, v]) =>
            `<span style="color:${datasets.find(d => d.label === k).color}">●</span> ${k}: ${v?.toFixed(1)}`).join("<br/>")}
        `)
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 20}px`)
          .style("display", "block");


        const range = 30; // ±30mins
        const tMin = Math.max(xFull.domain()[0], time - range);
        const tMax = Math.min(xFull.domain()[1], time + range);
        x.domain([tMin, tMax]);

        xAxisG.transition().duration(200).call(d3.axisBottom(x));
        paths.forEach((p, i) =>
          p.transition().duration(200).attr('d', d3.line()
            .x(d => x(d.time)).y(d => y(d.temperature))
          )
        );

        if (zoomTimeout) clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
          x.domain(xFull.domain());
          xAxisG.transition().duration(500).call(d3.axisBottom(x));
          paths.forEach((p, i) =>
            p.transition().duration(500).attr('d', d3.line()
              .x(d => x(d.time)).y(d => y(d.temperature))
            )
          );
        }, 2000);
      })
      .on("mouseout", () => {
        hoverLine.style("opacity", 0);
        tooltip.style("display", "none");
      
        if (zoomTimeout) clearTimeout(zoomTimeout);
      
        // instant reset
        x.domain(xFull.domain());
        xAxisG.transition().duration(300).call(d3.axisBottom(x));
        paths.forEach((p, i) =>
          p.transition().duration(300)
           .attr('d', d3.line()
             .x(d => x(d.time))
             .y(d => y(d.temperature))
           )
        );
      });
      
  });
}

