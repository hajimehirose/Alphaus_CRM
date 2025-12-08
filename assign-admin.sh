#!/bin/bash
# Script to assign Admin role to hajime.hirose@alphaus.cloud
# Make sure your dev server is running and then run this script

echo "Assigning Admin role to hajime.hirose@alphaus.cloud..."

curl -X POST http://localhost:3000/api/admin/assign-role \
  -H "Content-Type: application/json" \
  -d '{"email": "hajime.hirose@alphaus.cloud", "role": "Admin"}'

echo ""
echo "Done! Check the response above."
