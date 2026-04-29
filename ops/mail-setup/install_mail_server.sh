#!/usr/bin/env bash
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Run as root: sudo $0"
  exit 1
fi

DOMAIN=${1:-example.com}
MAILHOST=${2:-mail.$DOMAIN}

echo "Preparing install for domain: $DOMAIN (hostname: $MAILHOST)"

if command -v apt-get >/dev/null 2>&1; then
  PKG_MGR=apt
  echo "Using apt package manager"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y postfix dovecot-core dovecot-imapd opendkim opendkim-tools nginx php-fpm certbot python3-certbot-nginx
else
  echo "Unsupported package manager. Adapt the script for your OS." >&2
  exit 2
fi

mkdir -p /var/mail/vhosts/$DOMAIN
chown -R vmail:vmail /var/mail/vhosts || true

echo "Installing Postfix and Dovecot packages — you may be prompted for Postfix config if run interactively."

echo "Copy the sample configs from the project's ops/mail-setup folder to /etc/postfix and /etc/dovecot, then restart services."

echo
echo "Suggested manual steps:"
cat <<'STEPS'
1. Adapt ops/mail-setup/main.cf.sample -> /etc/postfix/main.cf (replace <DOMAIN> placeholders).
2. Adapt ops/mail-setup/dovecot.conf.sample -> /etc/dovecot/dovecot.conf.
3. Run ops/mail-setup/generate_dkim.sh selector $DOMAIN to create DKIM keys; place private key under /etc/opendkim/keys/$DOMAIN/
4. Configure /etc/opendkim.conf and keytable/signing table (see opendkim.conf.sample).
5. Restart and enable services:
   systemctl restart opendkim postfix dovecot nginx
   systemctl enable opendkim postfix dovecot nginx
6. Obtain TLS certs: certbot --nginx -d mail.$DOMAIN -d webmail.$DOMAIN
7. Configure SPF and DMARC DNS records using ops/mail-setup/dns-records.md as templates.
8. Install Roundcube or other webmail into /var/www/roundcube and configure Nginx vhost (see webmail.nginx.sample).
STEPS

echo "Install script finished (prepared). Review and run the manual steps on the target host." 
