# Deploy SwitchPoint on a Nebius VM

The app only calls APIs (Nebius Token Factory, NVIDIA build.nvidia.com, Tavily), so it needs **no GPU**.
A small CPU VM is enough and costs very little.

## 1. Create the VM (web console, ~5 min)
1. console.nebius.com → **Compute → Virtual machines → Create resource**.
2. Pick **Without GPU** with these settings:
   - Platform: **Non-GPU AMD EPYC Genoa (`cpu-d3`)**
   - Preset: **`4vcpu-16gb`** (`2vcpu-8gb` also works)
   - Region: **eu-north1** (Finland) or **eu-west1** (Paris)
3. **Boot disk:** Ubuntu 24.04 (the image *without* GPU drivers), 30–50 GiB.
4. **Network:** default subnet. Set **Public IP address = Auto (dynamic)**.
5. **Access:** add your SSH public key (`cat ~/.ssh/id_ed25519.pub`). Set the username to e.g. `switchpoint`; avoid `root` and `admin`.
6. **Create VM.** Then copy its public IP.

CLI alternative, after `nebius` CLI login (check the image family name in the console):
```bash
nebius compute instance create --name switchpoint \
  --resources-platform cpu-d3 --resources-preset 4vcpu-16gb \
  --boot-disk-managed-disk-source-image-family-image-family ubuntu24.04-driverless \
  --boot-disk-managed-disk-size-gibibytes 40 \
  --network-interfaces "[{\"subnet_id\": \"$SUBNET_ID\", \"public_ip_address\": {}}]"
```

## 2. Deploy (one command, from your laptop)
```bash
cd Track_records/poc
chmod +x deploy/*.sh
./deploy/deploy.sh switchpoint@<PUBLIC_IP>
```
This does four things:
- copies the code, dataset, data guide and `.env` to the VM;
- installs Python dependencies;
- starts the app as a systemd service;
- puts Caddy in front with automatic HTTPS at **https://<ip-with-dashes>.sslip.io**. That link goes in the submission.

If the page doesn't load:
- **Security group:** check that it allows inbound TCP **80** and **443**. Caddy needs both for the certificate.
- **Logs:** `ssh switchpoint@<IP> journalctl -u switchpoint -f`.

To redeploy after a code change, run the same `deploy.sh` command again.

## 3. When would a GPU VM make sense?
Only to **self-host** the NVIDIA models, e.g. Nemotron or Nemotron Parse as a NIM container on a `1gpu-16vcpu-200gb` H100/L40S preset. It's a strong *pitch* point ("runs fully on-prem for critical infrastructure"), but it isn't needed today. The serverless APIs are faster to set up and cheaper.
