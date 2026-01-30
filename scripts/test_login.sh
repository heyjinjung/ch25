#!/bin/bash
# Test login
curl -s -X POST https://cc-jm.com/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"cc_id":"admin","password":"temp123"}' | python3 -m json.tool || echo "Raw response above"
