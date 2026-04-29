#!/usr/bin/env bash
# Simple DKIM key generator and DNS TXT output
set -euo pipefail
if [ -z "${1-}" ]; then
  echo "Usage: $0 selector domain"
  exit 2
fi
selector=$1
domain=${2:-example.com}
outdir="/tmp/dkim-${selector}-${domain}"
mkdir -p "$outdir"
openssl genrsa -out "$outdir/${selector}.private" 2048
openssl rsa -in "$outdir/${selector}.private" -pubout -out "$outdir/${selector}.pub"
pubkey=$(sed -n '2,999p' "$outdir/${selector}.pub" | tr -d '\n' | sed 's/-----END PUBLIC KEY-----//;s/-----BEGIN PUBLIC KEY-----//')
echo "Private key: $outdir/${selector}.private"
echo
echo "DNS TXT record (name): ${selector}._domainkey.${domain}"
echo
echo "DNS TXT value (v=DKIM1; k=rsa; p=...):"
echo "v=DKIM1; k=rsa; p=${pubkey}"
echo
echo "You should copy the private key to your DKIM agent (opendkim) and publish the TXT value above in DNS."
