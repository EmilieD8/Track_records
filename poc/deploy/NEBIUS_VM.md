# Deploy SupplyGuard on a Nebius VM

The app only calls APIs (Nebius Token Factory, NVIDIA build.nvidia.com, Tavily), so it needs **no GPU**. A small CPU VM is
enough.

## 1. Create the VM

In console.nebius.com, go to **Compute → Virtual machines → Create**:

- **Platform:** Non-GPU AMD EPYC Genoa (`cpu-d3`), preset `4vcpu-16gb`
- **Boot disk:** Ubuntu 24.04, 30–64 GiB
- **Network:** public IP set to Auto
- **Access:** a username (e.g. `ubuntu`) plus your SSH public key (`cat ~/.ssh/id_ed25519.pub`)
- **Security group:** allow inbound TCP **22**, **80** and **443**. Caddy needs 80 and 443 for the HTTPS certificate.

## 2. Deploy (from your laptop, repo root)

```bash
make deploy VM=<user>@<public-ip>
```

The script does this:

1. Copies the repo and `poc/.env` to `~/supplyguard` on the VM with rsync. It skips `.git`, `.venv` and `node_modules`.
2. Installs Docker and runs `docker compose up -d --build`. That starts the API container and the nginx + React build
   container. The web container listens on `127.0.0.1:8090` only.
3. Installs Caddy as the HTTPS entry point at **https://\<ip-with-dashes\>.sslip.io**, behind a demo password.

The demo login is `demo` / `supplyguard2026`. To change it, run
`AUTH_USER=x AUTH_PASS=y make deploy VM=...`.

To redeploy after a change, run the same command again. On startup, the API indexes `poc/sample_docs` (including
`demo_docs/`).

## 3. Troubleshooting

- **The page doesn't load:** check that the security group allows 80 and 443.
- **Logs:** `ssh <user>@<ip> 'cd supplyguard && sudo docker compose logs -f'`
- **SSH `Permission denied (publickey)`:** the username, or the key on the VM, doesn't match.

## When would a GPU VM make sense?

Only to **self-host** the NVIDIA models, for example Nemotron or Nemotron Parse as a NIM container on an H100 or L40S preset.
It's a strong on-premises story for critical infrastructure, but the serverless APIs are faster to set up and cheaper.
