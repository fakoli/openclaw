---
name: home-assistant
description: "Control Home Assistant entities, services, automations, scenes, locks, climate, and sensors via the REST API."
homepage: https://developers.home-assistant.io/docs/api/rest/
metadata:
  {
    "openclaw":
      {
        "emoji": "🏠",
        "requires": { "bins": ["curl", "jq"], "env": ["HASS_URL", "HASS_TOKEN"] },
      },
  }
---

# Home Assistant

Use the Home Assistant REST API when the user asks to inspect or control smart
home devices through their Home Assistant instance.

## Setup

Required environment:

- `HASS_URL`: Home Assistant base URL, for example `http://homeassistant.local:8123`
- `HASS_TOKEN`: Home Assistant long-lived access token

Do not print, log, or summarize `HASS_TOKEN`.

Use this shell prefix in examples:

```bash
base="${HASS_URL%/}"
auth_header="Authorization: Bearer $HASS_TOKEN"
json_header="Content-Type: application/json"
```

## Health Check

```bash
curl --fail --silent --show-error --max-time 20 \
  -H "$auth_header" \
  -H "$json_header" \
  "$base/api/"
```

## List Entities

```bash
curl --fail --silent --show-error --max-time 20 \
  -H "$auth_header" \
  -H "$json_header" \
  "$base/api/states" \
  | jq -r '.[].entity_id'
```

## Read Entity State

```bash
entity_id="sensor.example"

curl --fail --silent --show-error --max-time 20 \
  -H "$auth_header" \
  -H "$json_header" \
  "$base/api/states/$entity_id" \
  | jq '{entity_id, state, attributes}'
```

## Call a Service

Home Assistant service calls use `/api/services/<domain>/<service>`.

```bash
domain="light"
service="toggle"
entity_id="light.living_room"

curl --fail --silent --show-error --max-time 20 \
  -X POST \
  -H "$auth_header" \
  -H "$json_header" \
  -d "{\"entity_id\":\"$entity_id\"}" \
  "$base/api/services/$domain/$service"
```

## Common Controls

Turn on a light:

```bash
entity_id="light.living_room"

curl --fail --silent --show-error --max-time 20 \
  -X POST \
  -H "$auth_header" \
  -H "$json_header" \
  -d "{\"entity_id\":\"$entity_id\"}" \
  "$base/api/services/light/turn_on"
```

Set climate temperature:

```bash
entity_id="climate.hallway"
temperature="70"

curl --fail --silent --show-error --max-time 20 \
  -X POST \
  -H "$auth_header" \
  -H "$json_header" \
  -d "{\"entity_id\":\"$entity_id\",\"temperature\":$temperature}" \
  "$base/api/services/climate/set_temperature"
```

Trigger an automation:

```bash
entity_id="automation.good_morning"

curl --fail --silent --show-error --max-time 20 \
  -X POST \
  -H "$auth_header" \
  -H "$json_header" \
  -d "{\"entity_id\":\"$entity_id\"}" \
  "$base/api/services/automation/trigger"
```

Activate a scene:

```bash
entity_id="scene.movie_time"

curl --fail --silent --show-error --max-time 20 \
  -X POST \
  -H "$auth_header" \
  -H "$json_header" \
  -d "{\"entity_id\":\"$entity_id\"}" \
  "$base/api/services/scene/turn_on"
```

Lock a door:

```bash
entity_id="lock.front_door"

curl --fail --silent --show-error --max-time 20 \
  -X POST \
  -H "$auth_header" \
  -H "$json_header" \
  -d "{\"entity_id\":\"$entity_id\"}" \
  "$base/api/services/lock/lock"
```

Unlock a door only after explicit user confirmation:

```bash
entity_id="lock.front_door"

curl --fail --silent --show-error --max-time 20 \
  -X POST \
  -H "$auth_header" \
  -H "$json_header" \
  -d "{\"entity_id\":\"$entity_id\"}" \
  "$base/api/services/lock/unlock"
```

## Safety

- Ask for confirmation before unlocking doors, opening covers, disabling alarms,
  changing security systems, or running destructive automations.
- If an entity id is ambiguous, list matching entities first and ask the user to
  choose.
- Prefer reading current state before changing climate, lock, cover, alarm, or
  appliance entities.
