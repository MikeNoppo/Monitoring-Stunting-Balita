# Growth Endpoints: Chart & Stats

These endpoints provide chart-ready series (including WHO HFA curves) and quick stats for a child’s growth records.

Base path: `/growth`

Authentication: Bearer JWT required

Access control:

- ORANG_TUA: Can access only their own child’s data
- PEGAWAI / DOKTER / ADMIN: Can access any child’s data

---

## GET /growth/:childId/growth-chart

Returns chart-ready data:

- `records`: chronological measurements for the child
- `whoCurves`: WHO Height-for-Age curves for z ∈ {-3,-2,-1,0,1,2,3}

Path params:

- `childId` (number)

Headers:

- `Authorization: Bearer <token>`

Response 200 body:

```json
{
  "message": "Chart data generated",
  "data": {
    "records": [
      {
        "date": "2025-08-01T00:00:00.000Z",
        "height": 82.5,
        "weight": 11.2,
        "ageInMonthsAtRecord": 18,
        "heightZScore": -1.23
      }
      // ...ordered by date asc
    ],
    "whoCurves": [
      {
        "z": -2,
        "points": [
          { "ageInMonths": 0, "value": 46.1 },
          { "ageInMonths": 1, "value": 50.9 }
          // ...up to 60 months as available
        ]
      }
      // ...z = -3,-2,-1,0,1,2,3
    ]
  }
}
```

Notes:

- `records[*].ageInMonthsAtRecord` aligns with WHO `points[*].ageInMonths`, so FE can plot child points against WHO curves using ageInMonths as X.
- WHO curves are computed from LMS parameters persisted in `WhoStandard` (HEIGHT_FOR_AGE) using inverse LMS.

Errors:

- 401 Unauthorized (missing/invalid token)
- 403 Forbidden (no access to this child)
- 404 Not Found (child not found)

---

## GET /growth/:childId/growth-stats

Returns quick aggregate statistics over the child’s growth records.

Path params:

- `childId` (number)

Headers:

- `Authorization: Bearer <token>`

Response 200 body:

```json
{
  "message": "Stats calculated",
  "data": {
    "_count": { "_all": 12 },
    "_avg": { "height": 82.1, "weight": 11.0, "heightZScore": -0.95 },
    "_min": {
      "date": "2024-09-01T00:00:00.000Z",
      "height": 68.2,
      "weight": 8.5,
      "heightZScore": -1.84
    },
    "_max": {
      "date": "2025-08-01T00:00:00.000Z",
      "height": 85.0,
      "weight": 12.0,
      "heightZScore": -0.12
    }
  }
}
```

Errors:

- 401 Unauthorized (missing/invalid token)
- 403 Forbidden (no access to this child)

---

## Field reference

records[*]

- `date`: ISO datetime of measurement
- `height`: child height (cm)
- `weight`: child weight (kg)
- `ageInMonthsAtRecord`: age in months at measurement time
- `heightZScore`: computed HFA z-score (may be null if LMS not found)

whoCurves[*]

- `z`: z-score level (-3..3)
- `points[*].ageInMonths`: integer month (0..N)
- `points[*].value`: WHO height at that z level

---

## Usage tips for FE

- X-axis: use `ageInMonths` to align child points and WHO curves.
- Plot WHO curves as lines; plot child height as line/scatter overlay.
- Optionally show horizontal bands or labels for z-score categories.

---

## Future extensions

- Add Weight-for-Age WHO curves and endpoints.
- Date range filters: `?from=YYYY-MM-DD&to=YYYY-MM-DD` for both endpoints.
- Pagination for records if needed.
