#!/bin/bash -euxo pipefail

# Start cloudflare tunnel

cloudflared tunnel --metrics localhost:$METRICS_PORT --url localhost:$PORT & sleep 15
TUNNEL_RESPONSE=$(curl http://localhost:$METRICS_PORT/quicktunnel)
URL=$(echo $TUNNEL_RESPONSE | grep -o '"hostname":"[^"]*' | grep -o '[^"]*$')
echo "::add-mask::$URL"
echo "$ENV_NAME=$URL" >> $GITHUB_ENV
