#!/bin/bash
# Generate self-signed SSL certificates for N-Guard Manager
# This script is called at container startup if certificates don't exist

CERT_DIR="${CERT_DIR:-/app/certs}"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"
DAYS_VALID="${CERT_DAYS:-365}"
HOSTNAME="${CERT_HOSTNAME:-nguardvpn.local}"

# Create cert directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "SSL certificates already exist at $CERT_DIR"

    # Check if certificate is expired or expiring soon (within 30 days)
    if openssl x509 -checkend 2592000 -noout -in "$CERT_FILE" 2>/dev/null; then
        echo "Certificate is still valid"
        exit 0
    else
        echo "Certificate is expired or expiring soon, regenerating..."
    fi
fi

echo "Generating self-signed SSL certificate..."

# Generate private key and certificate
openssl req -x509 \
    -nodes \
    -days "$DAYS_VALID" \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=US/ST=State/L=City/O=N-Guard/CN=$HOSTNAME" \
    -addext "subjectAltName=DNS:$HOSTNAME,DNS:localhost,IP:127.0.0.1,IP:10.13.13.5"

if [ $? -eq 0 ]; then
    echo "SSL certificate generated successfully:"
    echo "  Certificate: $CERT_FILE"
    echo "  Private Key: $KEY_FILE"
    echo "  Valid for: $DAYS_VALID days"
    echo "  Hostname: $HOSTNAME"

    # Set appropriate permissions
    chmod 644 "$CERT_FILE"
    chmod 600 "$KEY_FILE"
else
    echo "ERROR: Failed to generate SSL certificate"
    exit 1
fi
