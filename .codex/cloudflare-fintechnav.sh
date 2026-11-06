#!/bin/bash
# Reuse the managed Infisical authentication wrapper with this project's token.
# The generated script contains no credential values; MCP stdin stays untouched.
set -euo pipefail
exec /bin/bash <(/usr/bin/python3 - <<'PYCODE'
from pathlib import Path
import sys
source = Path('/Users/bradjensen/.hpw-mcp-cloudflare.sh').read_text()
old = '$(get CLOUDFLARE_MCP)'
new = '$(get CLOUDFLARE_MCP_FINTECHNAV_WRITE)'
if source.count(old) != 1:
    sys.exit('Managed Cloudflare wrapper changed; refusing to use the wrong token.')
sys.stdout.write(source.replace(old, new))
PYCODE
)
