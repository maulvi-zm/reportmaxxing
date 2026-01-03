#!/bin/bash
# Keycloak setup script - creates reportmaxxing realm with users and client

set -e

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin"
REALM="reportmaxxing"
CLIENT_ID="mobile-app"

echo "Waiting for Keycloak to be ready..."
until curl -sf "${KEYCLOAK_URL}/realms/master" > /dev/null 2>&1; do
    echo "Keycloak not ready yet, waiting..."
    sleep 5
done
echo "Keycloak is ready!"

# Get admin token
echo "Getting admin token..."
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${ADMIN_USER}" \
    -d "password=${ADMIN_PASS}" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

if [ -z "$ADMIN_TOKEN" ]; then
    echo "Failed to get admin token"
    exit 1
fi
echo "Admin token obtained"

# Check if realm exists
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" "${KEYCLOAK_URL}/admin/realms/${REALM}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")

if [ "$REALM_EXISTS" == "200" ]; then
    echo "Realm ${REALM} already exists, skipping creation"
else
    # Create realm
    echo "Creating realm ${REALM}..."
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"realm\": \"${REALM}\",
            \"enabled\": true,
            \"registrationAllowed\": false,
            \"loginWithEmailAllowed\": true,
            \"duplicateEmailsAllowed\": false,
            \"resetPasswordAllowed\": false,
            \"editUsernameAllowed\": false,
            \"bruteForceProtected\": false,
            \"sslRequired\": \"none\",
            \"accessTokenLifespan\": 900,
            \"accessTokenLifespanForImplicitFlow\": 900,
            \"ssoSessionMaxLifespan\": 2592000
        }"
    echo "Realm created"
fi

# Check if client exists and get its internal ID
CLIENT_INFO=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}/clients?clientId=${CLIENT_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
CLIENT_DB_ID=$(echo "$CLIENT_INFO" | python3 -c "import sys, json; clients=json.load(sys.stdin); print(clients[0]['id'] if clients else '')")

if [ -n "$CLIENT_DB_ID" ]; then
    echo "Client ${CLIENT_ID} exists (ID: $CLIENT_DB_ID), updating configuration..."
    # Update existing client
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${CLIENT_DB_ID}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"clientId\": \"${CLIENT_ID}\",
            \"enabled\": true,
            \"publicClient\": true,
            \"standardFlowEnabled\": true,
            \"implicitFlowEnabled\": false,
            \"directAccessGrantsEnabled\": false,
            \"redirectUris\": [
                \"exp://localhost:8082/--/*\",
                \"exp://127.0.0.1:8082/--/*\",
                \"reportmaxxing://*\",
                \"http://localhost:8081/*\",
                \"http://localhost:8082/*\"
            ],
            \"webOrigins\": [\"*\"],
            \"protocol\": \"openid-connect\"
        }"
    echo "Client updated"
else
    # Create new client
    echo "Creating client ${CLIENT_ID}..."
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"clientId\": \"${CLIENT_ID}\",
            \"enabled\": true,
            \"publicClient\": true,
            \"standardFlowEnabled\": true,
            \"implicitFlowEnabled\": false,
            \"directAccessGrantsEnabled\": false,
            \"redirectUris\": [
                \"exp://localhost:8082/--/*\",
                \"exp://127.0.0.1:8082/--/*\",
                \"reportmaxxing://*\",
                \"http://localhost:8081/*\",
                \"http://localhost:8082/*\"
            ],
            \"webOrigins\": [\"*\"],
            \"protocol\": \"openid-connect\"
        }"
    echo "Client created"
fi

# Create realm roles if they don't exist
echo "Creating realm roles..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/roles" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name": "CITIZEN", "description": "Can submit and view own reports"}' 2>/dev/null || true

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/roles" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name": "DEPARTMENT_STAFF", "description": "Can update report status and view all reports"}' 2>/dev/null || true
echo "Roles created"

# Get role IDs
CITIZEN_ROLE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}/roles/CITIZEN" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
CITIZEN_ROLE_ID=$(echo "$CITIZEN_ROLE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")

STAFF_ROLE=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}/roles/DEPARTMENT_STAFF" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
STAFF_ROLE_ID=$(echo "$STAFF_ROLE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")

echo "Role IDs: CITIZEN=$CITIZEN_ROLE_ID, DEPARTMENT_STAFF=$STAFF_ROLE_ID"

# Create citizen user
echo "Creating citizen user..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "citizen@test.com",
        "enabled": true,
        "emailVerified": true,
        "firstName": "Test",
        "lastName": "Citizen",
        "email": "citizen@test.com"
    }' 2>/dev/null || true

# Get citizen user ID
sleep 1
CITIZEN_USER_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=citizen@test.com" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else '')")

if [ -n "$CITIZEN_USER_ID" ]; then
    echo "Citizen user ID: $CITIZEN_USER_ID"
    
    # Set password
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${CITIZEN_USER_ID}/reset-password" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"type": "password", "value": "citizen123", "temporary": false}'
    
    # Assign role
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${CITIZEN_USER_ID}/role-mappings/realm" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "[{\"id\": \"${CITIZEN_ROLE_ID}\", \"name\": \"CITIZEN\"}]"
    echo "Citizen user configured"
else
    echo "Citizen user already exists or failed to create"
fi

# Create staff user
echo "Creating staff user..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "staff@test.com",
        "enabled": true,
        "emailVerified": true,
        "firstName": "Department",
        "lastName": "Staff",
        "email": "staff@test.com"
    }' 2>/dev/null || true

# Get staff user ID
sleep 1
STAFF_USER_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=staff@test.com" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else '')")

if [ -n "$STAFF_USER_ID" ]; then
    echo "Staff user ID: $STAFF_USER_ID"
    
    # Set password
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${STAFF_USER_ID}/reset-password" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"type": "password", "value": "staff123", "temporary": false}'
    
    # Assign role
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${STAFF_USER_ID}/role-mappings/realm" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "[{\"id\": \"${STAFF_ROLE_ID}\", \"name\": \"DEPARTMENT_STAFF\"}]"
    echo "Staff user configured"
else
    echo "Staff user already exists or failed to create"
fi

echo ""
echo "=========================================="
echo "Keycloak setup complete!"
echo "=========================================="
echo ""
echo "Realm: ${REALM}"
echo "Client: ${CLIENT_ID}"
echo ""
echo "Test Users:"
echo "  Citizen: citizen@test.com / citizen123"
echo "  Staff:   staff@test.com / staff123"
echo ""
echo "Keycloak Admin Console: ${KEYCLOAK_URL}/admin"
echo "  Username: ${ADMIN_USER}"
echo "  Password: ${ADMIN_PASS}"
echo ""
