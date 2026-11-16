# Lab VLAN

Port 5 on my switch is a separate lab network (VLAN 20). Anything plugged into it can only reach the Pi's honeypot. It can't reach my home network, the internet, or real services on the Pi like SSH.

## Switch (TP-Link TL-SG105E, web page on my home network)

Login password changed from the default.

VLAN > 802.1Q VLAN: Enable

| VLAN | Name | Port 1 router | Port 2 Pi | Port 3 PC | Port 4 | Port 5 lab |
|---|---|---|---|---|---|---|
| 1 | Default | Untagged | Untagged | Untagged | Untagged | Not member |
| 20 | lab | Not member | Tagged | Not member | Not member | Untagged |

VLAN > 802.1Q PVID Setting: port 5 = 20, everything else 1.

The Easy Smart switch only lets you edit VLAN 1 if you fill in the whole row (name `Default`, every port) before clicking Add/Modify.

## Pi

```
# VLAN 20 on top of eth0, its own address, never used as the way to the internet
sudo nmcli con add type vlan con-name lab ifname eth0.20 dev eth0 id 20 \
  ipv4.method manual ipv4.addresses 10.20.0.1/24 ipv4.never-default yes ipv6.method disabled

# the lab can only reach the honeypot
sudo ufw allow in on eth0.20 from 10.20.0.0/24 to any port 2222,3389,8081 proto tcp comment 'lab to honeypot'
```

UFW already denies everything else coming in, and denies routing, so the Pi never passes lab traffic on to my home network.

## Lab device

No DHCP on the lab, so give it a fixed address, for example on my Mac's USB adapter:

```
sudo networksetup -setmanual "AX88179B" 10.20.0.10 255.255.255.0
```

## Tests (16 Nov 2026, Mac on port 5 with Wi-Fi off)

| Test | Expected | Result |
|---|---|---|
| `ping 10.20.0.1` | replies | 3/3 replies, under 1 ms |
| `nc -vz 10.20.0.1 2222` (honeypot) | open | succeeded |
| `nc -vz 10.20.0.1 22` (real SSH) | blocked | timed out |
| `nmap -Pn 10.20.0.1` | only honeypot ports | 2222, 3389, 8081 open, 997 filtered |
| Pretend to be on my home network (`192.168.1.250`) and ping the router | no reply | no route to host |
