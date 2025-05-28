# Rodent Riddle - Interactive Data Visualization Project

This project creates an interactive storytelling experience about mouse circadian rhythms through data visualization. Users can explore patterns in mouse behavior and discover insights through guided questions.

## Project Structure

```
rodent_riddle/
├── index.html         # Main HTML page with visualization containers
├── style.css          # Global styles and visualization styling
├── main.js            # Entry point that imports and initializes all visualizations
├── circadian.js       # Circadian rhythm visualization implementation
├── data/              # JSON data files
│   ├── README.md      # Data format documentation
│   └── *.json         # Mouse behavior datasets
└── README.md          # This file
```

## Design Philosophy

Each visualization follows a **discovery-based learning approach**:

1. **Instructions** - Clear explanation of what the visualization shows
2. **Interactive Features** - List of available interactions and controls
3. **Visualization** - The actual D3.js interactive visualization
4. **Exploration Question** - Thought-provoking question to guide discovery

This structure encourages users to:
- Understand the data and controls
- Interact with the visualization
- Form hypotheses and discover patterns
- Reflect on their findings

## Adding a New Visualization

### 1. HTML Structure

Add your visualization section to `index.html` following this template:

```html
<!-- Your Visualization Name -->
<h2>Your Visualization Title</h2>
<p class="viz-instructions">
    Brief description of what this visualization shows and how to interpret it.
</p>
<ul class="viz-features">
    <li><strong>Feature 1:</strong> Description of first interactive feature</li>
    <li><strong>Feature 2:</strong> Description of second feature</li>
    <li><strong>Interactive Features:</strong>
        <ul>
            <li>List specific interactions available</li>
            <li>Hover behaviors, controls, etc.</li>
        </ul>
    </li>
</ul>
<div id="your-viz-id">
    <!-- Visualization will be dynamically added here (your-file.js) -->    
</div>
<p class="viz-questions">
    <strong>Question to consider:</strong> A thought-provoking, open-ended question that encourages exploration and discovery.
</p>
```

### 2. Create Visualization JavaScript File

Create a new file `your-visualization.js` with this structure:

```javascript
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Constants for your visualization
const YOUR_VIZ_CONFIG = {
    MARGIN: { top: 20, right: 20, bottom: 60, left: 60 },
    WIDTH: 800,
    HEIGHT: 400,
    // Add your specific constants
};

export async function createYourVisualization() {
    // Load data
    const data = await d3.json('./data/your-data-file.json');
    
    // Select container
    const container = d3.select('#your-viz-id');
    
    // Your D3.js visualization code here
    // Follow D3 best practices:
    // - Use semantic variable names
    // - Add tooltips and interactions
    // - Include responsive design
    // - Add proper error handling
    
    // Example structure:
    const svg = container.append('svg')
        .attr('width', YOUR_VIZ_CONFIG.WIDTH)
        .attr('height', YOUR_VIZ_CONFIG.HEIGHT);
    
    // Add your visualization elements...
}
```

### 3. Register in main.js

Add your visualization to `main.js`:

```javascript
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { createCircadianVisualization } from './circadian.js';
import { createYourVisualization } from './your-visualization.js';  // Add this line

document.addEventListener('DOMContentLoaded', () => {
    createCircadianVisualization();
    createYourVisualization();  // Add this line
});
```

## Styling Guidelines

### CSS Classes Available

- `.viz-instructions` - Styled paragraphs for visualization descriptions
- `.viz-features` - Styled lists for feature descriptions  
- `.viz-questions` - Styled paragraphs for exploration questions
- `strong` elements automatically use `--color-secondary`

### Color Variables

Use these CSS custom properties for consistent theming:

```css
--color-background: #B8CFCE;  /* Page background */
--color-secondary: #7F8CAA;   /* Interactive elements, highlights */
--color-accent: #333446;      /* Text, borders */
--color-light: #EAEFEF;       /* Light backgrounds, contrast */
--color-female: #E86A92;      /* Female mouse data */
--color-male: #4C72B0;        /* Male mouse data */
--color-day: #F4C05E;         /* Day/light periods */
--color-night: #506680;       /* Night/dark periods */
```

### Adding Visualization-Specific Styles

Add styles under the appropriate section in `style.css`:

```css
/* === Your Visualization === */
#your-viz-id {
    /* Container styles */
}

#your-viz-id .your-specific-class {
    /* Component styles */
}
```

## Data Guidelines

- Use the combined data files (`combined_*.json`) for better performance
- Refer to `data/README.md` for data structure documentation
- Include error handling for missing or malformed data
- Consider data granularity needs (minutes vs hours vs days)

## Best Practices

### Interactivity
- Add hover effects, brushing, and tooltips for data exploration
- Implement pause-on-hover for animations
- Provide intuitive controls (play/pause, reset, sliders)
- Use consistent interaction patterns

### Accessibility
- Ensure sufficient color contrast
- Add meaningful tooltips with detailed information
- Use semantic HTML structure

### Performance
- Use D3's enter/update/exit pattern for smooth transitions
- Implement efficient data filtering and updates (optimize pageload time, especially for the minute data which has 20,160 datapoints for each mouse)

### Questions Design
- Ask **open-ended questions** that encourage exploration
- Focus on **patterns and relationships** in the data
- Avoid yes/no questions
- Connect to the **biological or scientific context**
- Guide users to use **specific visualization features**
- Optionally, we can add a "show our answer" button below each question to show our suggested answer.

## Example Question Types

Good questions encourage discovery:
- "How do the patterns change over time?"
- "What relationships can you observe between X and Y?"
- "When do you notice the most variation in the data?"

Avoid simple factual questions:
- "Do mice sleep at night?" (yes/no)
- "What is the highest temperature?" (single answer)

## Development Workflow

1. Plan your visualization and the story it will tell
2. Add the HTML structure with placeholder content
3. Create the JavaScript file with your D3.js implementation
4. Register the function in `main.js`
5. Add any needed CSS styles
6. Craft a thoughtful exploration question
7. Test interactivity and responsiveness
8. Document any new data requirements
