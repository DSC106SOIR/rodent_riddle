# JSON Data Format Reference

This document describes the structure of the JSON files used in our D3 visualizations, including combined temperature and activity datasets at multiple granularities (minute, hour, 12-hour, and day).

## JSON Format

Each file is a flat array of data points, where each point represents combined temperature and activity readings for a mouse at a specific time.

### Combined Data Fields (Recommended)

Use the `combined_*.json` files for optimal performance:

| Field      | Type     | Description                                   |
|------------|----------|-----------------------------------------------|
| `id`       | string   | Mouse identifier (e.g., `"m1"`, `"f3"`)       |
| `sex`      | string   | Either `"male"` or `"female"`                 |
| `time`     | number   | Time point index (unit depends on granularity)|
| `temp`     | number   | Body temperature measurement (°C)             |
| `act`      | number   | Activity level (normalized 0–100)            |
| `estrus`   | boolean  | `true` if the time is during estrus phase     |
| `night`    | boolean  | `true` if the time is during light-off phase  |

### Legacy Format (Separate Files)

The original separate files are still available but deprecated:
- `temp_*.json`: Contains `value` field with temperature data
- `act_*.json`: Contains `value` field with activity data

### File Structure

**Combined files (recommended):**
- `combined_minutes.json`: Combined data at minute-level granularity
- `combined_hours.json`: Combined data at hour-level granularity  
- `combined_halfdays.json`: Combined data at 12-hour granularity
- `combined_days.json`: Combined data at day-level granularity

**Legacy files (deprecated):**
- `temp_*.json`: Temperature data only
- `act_*.json`: Activity data only

The `time` field represents:
  - Minutes in `*_minutes.json`
  - Hours in `*_hours.json`
  - 12-hour blocks in `*_halfdays.json`
  - Days in `*_days.json`

## Performance Benefits

The combined files offer significant advantages:
- **Faster loading**: Single HTTP request instead of two
- **Reduced file size**: ~63% smaller than separate files
- **No client-side merging**: Data is pre-joined and ready to use
- **Better caching**: Single file per granularity

## Example

```json
[
  {
    "id": "f1",
    "sex": "female",
    "time": 1,
    "temp": 36.8,
    "act": 72.5,
    "estrus": true,
    "night": true
  },
  {
    "id": "m1",
    "sex": "male",
    "time": 1,
    "temp": 36.9,
    "act": 68.2,
    "estrus": false,
    "night": true
  }
]
```

## Migration Guide

To use the new combined format, replace:

```javascript
// Old approach (slower)
const [tempData, actData] = await Promise.all([
    d3.json('./data/temp_minutes.json'),
    d3.json('./data/act_minutes.json')
]);
const combinedData = tempData.map(tempPoint => {
    const actPoint = actData.find(a => a.id === tempPoint.id && a.time === tempPoint.time);
    return {
        ...tempPoint,
        temperature: tempPoint.value,
        activity: actPoint ? actPoint.value : 0
    };
});
```

With:

```javascript
// New approach (faster)
const combinedData = await d3.json('./data/combined_minutes.json');
// Data is ready to use with .temp and .act fields