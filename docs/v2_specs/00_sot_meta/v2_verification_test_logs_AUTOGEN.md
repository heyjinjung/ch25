## Golden Pub/Sub verification - 2026-01-24T00:01:53.769356Z


**Payload**:

```
{"user_id": 123, "result": "LOSE"}
```

**Publish output**:

```
ERR wrong number of arguments for 'publish' command
```

**Backend logs (filtered snippet)**:

```
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
```

**DB query results (intervention log / roi log)**:

```
-- v2_golden_intervention_log --
DB query failed or table missing: mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 1146 (42S02) at line 1: Table 'xmas_event.v2_golden_intervention_log' doesn't exist

-- v2_retention_roi_log --
(no output)
```

---

## Golden Pub/Sub verification - 2026-01-24T00:16:04.247366Z


**Payload**:

```
{"user_id": 123, "result": "LOSE"}
```

**Publish output**:

```
1
```

**Backend logs (filtered snippet)**:

```
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
```

**DB query results (intervention log / roi log)**:

```
-- v2_golden_intervention_log --
(no output)

-- v2_retention_roi_log --
(no output)
```

---

## Golden Pub/Sub verification - 2026-01-24T00:20:20.894509Z


**Payload**:

```
{"user_id": 123, "result": "LOSE"}
```

**Publish output**:

```
1
```

**Backend logs (filtered snippet)**:

```
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
xmas-backend  | Failed to publish internal game result: Invalid input of type: 'dict'. Convert to a bytes, string, int or float first.
```

**DB query results (intervention log / roi log)**:

```
-- v2_golden_intervention_log --
(no output)

-- v2_retention_roi_log --
(no output)
```

---

