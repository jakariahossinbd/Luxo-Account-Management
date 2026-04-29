# DNS Record Templates (SPF / DKIM / DMARC)

## SPF
Name: @ (root)
Type: TXT
Value:
v=spf1 mx a:mail.<DOMAIN> ip4:<YOUR_SERVER_IP> -all

-- replace <DOMAIN> and <YOUR_SERVER_IP>

## DKIM
Name: selector._domainkey (replace `selector` with your chosen selector, e.g. `mail`)
Type: TXT
Value (example):
v=DKIM1; k=rsa; p=<PUBLIC_KEY_BASE64>

The helper `generate_dkim.sh` prints the TXT value to publish. Keep the private key on the mail host in `/etc/opendkim/keys/<domain>/<selector>.private`.

## DMARC
Name: _dmarc
Type: TXT
Value (recommended starter):
v=DMARC1; p=quarantine; rua=mailto:postmaster@<DOMAIN>; ruf=mailto:postmaster@<DOMAIN>; pct=100; sp=none; fo=1

Adjust `p=` to `reject` after you verify alignment.
