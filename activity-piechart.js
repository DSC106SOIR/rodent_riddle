import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

export function drawActivityPieChart() {
  d3.select("#activity_overall").selectAll("*").remove();
  Promise.all([
    d3.json('./data/female_night_day_combined.json'),
    d3.json('./data/male_night_day_combined.json')
  ]).then(([femaleData, maleData]) => {
    const container = d3.select("#activity_overall");
    container.selectAll("*").remove();

    const smallSize = 220;
    const largeSize = 340;

    const colorScale = d3.scaleOrdinal()
      .domain(["night", "day"])
      .range(["#506680", "#F4C05E"]);

    function prepareData(data) {
      const rolled = d3.rollups(data, v => d3.sum(v, d => d.mean), d => d.group);
      const total = d3.sum(rolled, ([, v]) => v);
      return rolled.map(([group, value]) => ({
        group,
        value,
        percent: (value / total * 100).toFixed(1)
      }));
    }

    const femaleSummary = prepareData(femaleData);
    const maleSummary = prepareData(maleData);
    const totalSummary = prepareData([...femaleData, ...maleData]);

    const pie = d3.pie().value(d => d.value);
    const arcLarge = d3.arc().innerRadius(0).outerRadius(largeSize / 2 - 20);
    const arcSmall = d3.arc().innerRadius(0).outerRadius(smallSize / 2 - 10);

    const layout = container.append("div")
      .style("display", "grid")
      .style("grid-template-columns", "auto auto")
      .style("gap", "30px 80px")
      .style("justify-content", "start")
      .style("align-items", "start");

    function drawChart(parent, data, title, size, arcFn) {
      const svg = parent.append("svg")
        .attr("width", size)
        .attr("height", size + 40);

      const group = svg.append("g")
        .attr("transform", `translate(${size / 2}, ${size / 2})`);

      const arcs = pie(data);
      group.selectAll("path")
      .data(arcs)
      .enter()
      .append("path")
      .attr("fill", d => colorScale(d.data.group))
      .transition()
      .duration(1000)
      .attrTween("d", function(d) {
        const i = d3.interpolate(
          { startAngle: 0, endAngle: 0 },  
          d                              
        );
        return function(t) {
          return arcFn(i(t));
        };
      });

    
      group.selectAll("text")
        .data(arcs)
        .enter()
        .append("text")
        .attr("transform", d => `translate(${arcFn.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("fill", "#000")
        .style("font-size", "14px")
        .text(d => `${d.data.group}: ${d.data.percent}%`);

      svg.append("text")
        .attr("x", size / 2)
        .attr("y", size + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(title);
    }

    drawChart(layout.append("div"), totalSummary, "All Mice", largeSize, arcLarge);

    const femaleContainer = layout.append("div");
    drawChart(femaleContainer, femaleSummary, "Female Mice", smallSize, arcSmall);
    drawChart(femaleContainer, maleSummary, "Male Mice", smallSize, arcSmall);
  });
}


