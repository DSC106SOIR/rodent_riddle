# JSON Data Format Reference

This document describes the structure of the JSON files used in our D3 visualizations, including temperature and activity datasets at multiple granularities (minute, hour, 12-hour, and day).

## JSON Format

Each file is a flat array of data points, where each point represents one reading for a mouse at a specific time.

### Common Fields (All Files)

| Field      | Type     | Description                                   |
|------------|----------|-----------------------------------------------|
| `id`       | string   | Mouse identifier (e.g., `"m1"`, `"f3"`)       |
| `sex`      | string   | Either `"male"` or `"female"`                 |
| `time`     | number   | Time point index (unit depends on granularity)|
| `value`    | number   | Measurement (temperature or activity)         |
| `estrus`   | boolean  | `true` if the time is during estrus phase     |
| `night`    | boolean  | `true` if the time is during light-off phase  |

### File Structure

- `temp_*.json`: Represents body temperature data
- `act_*.json`: Represents activity levels (normalized 0–100)
- The `time` field is:
  - Minutes in `*_minutes.json`
  - Hours in `*_hours.json`
  - 12-hour blocks in `*_halfdays.json`
  - Days in `*_days.json`

## Example

```json
[
  {
    "id": "f1",
    "sex": "female",
    "time": 1,
    "value": 36.8,
    "estrus": true,
    "night": true
  },
  {
    "id": "m1",
    "sex": "male",
    "time": 1,
    "value": 72.5,
    "estrus": false,
    "night": true
  }
]
