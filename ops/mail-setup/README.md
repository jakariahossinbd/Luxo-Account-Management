# Mail Setup — Postfix + Dovecot + Roundcube (scaffold)

This folder contains scaffolding to implement the self-hosted email plan from the previous session.

Next actions (high level):
- Run preflight on target droplet (SSH access required).
- Apply and adapt `main.cf` and `dovecot.conf` to the droplet's domain and paths.
- Generate DKIM keys with `generate_dkim.sh` and publish DNS records.
- Install Roundcube and configure Nginx/PHP for webmail (optional `webmail.conf` sample included).

What I created here:
- `main.cf.sample` — Postfix baseline configuration.
- `dovecot.conf.sample` — Dovecot baseline configuration.
- `generate_dkim.sh` — helper to create DKIM keys and DNS TXT output.
- `webmail.nginx.sample` — Nginx vhost sample for Roundcube.

Before I run any remote commands I need SSH access to the droplet or explicit permission to prepare deployable scripts. Tell me which host and user to target, or say "prepare only" to continue creating more artifacts locally.

Checklist reference (from plan):
1. Preflight and access
2. Install Postfix + Dovecot
3. Configure virtual users/domains
4. Install Roundcube + Nginx
5. Generate DKIM and DNS
6. Configure SPF/DMARC
7. Install TLS
8. Create mailboxes/aliases
9. Verify send/receive
10. Handover docs
