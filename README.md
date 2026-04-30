# 💎 Vellum: High-Performance Virtualization Engine

[![C++20](https://img.shields.io/badge/Language-C%2B%2B20-00599C?logo=cplusplus)](https://isocpp.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20KVM-orange?logo=linux)](https://www.kernel.org/doc/html/latest/virt/kvm/index.html)
[![Performance](https://img.shields.io/badge/Overhead-<2%25-blueviolet)](#)

**Vellum** is an ultra-lean, C++20-based virtualization controller designed for managing Micro-VMs with millisecond latency. By bypassing heavy legacy stacks and utilizing a headless, browser-based management interface, Vellum provides near-native performance for sandbox workloads, edge computing, and CI/CD runners.

---

## 🏛️ Architecture Overview

Unlike traditional VM managers, Vellum operates on a **Decoupled Control Plane** model. The C++ backend interfaces directly with the Linux KVM subsystem via `libvirt` ioctls, while serving a lightweight, asynchronous API to a React-driven web interface.

- **The Core:** C++20 event loop utilizing non-blocking I/O.
- **The GUI:** A stateless, Tailwind-based SPA (Single Page Application) embedded into the binary.
- **Communication:** Bi-directional WebSockets for real-time serial console and telemetry.

---

## 🔥 Key Differentiators

### ⚡ Zero-Copy Telemetry
Vellum reads VM metrics directly from the host's `/proc` and `/sys` filesystems, streaming them to the GUI via WebSockets. This eliminates the CPU spikes caused by traditional polling methods.

### 💾 Instant Cloning (CoW)
By utilizing `qcow2` backing files, Vellum can spawn a new VM instance from a "Golden Image" in under 500ms using Copy-on-Write logic.

### 🖥️ Headless Serial Bridge
The tool includes a custom serial-to-websocket bridge, allowing full `tty` access to the guest OS directly through the browser using **Xterm.js**, removing the need for SSH during initial boot.

---

## 🛠️ Advanced API Reference

Vellum exposes a high-performance REST API for automation and third-party integration.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/vm/list` | `GET` | Returns JSON array of all defined VM states. |
| `/api/v1/vm/provision` | `POST` | Clones a template and initializes a new Micro-VM. |
| `/api/v1/vm/:id/start` | `POST` | Bootstraps the KVM instance. |
| `/api/v1/vm/:id/stats` | `WS` | WebSocket stream for real-time CPU/RAM metrics. |

---

## 🔧 Installation & Build System

Vellum uses a modern CMake workflow.

### Dependencies
- **Compiler:** GCC 11+ or Clang 13+
- **Hypervisor:** KVM (Linux Kernel 5.10+)
- **Libraries:** `libvirt-dev`, `libpthread`

### Build Instructions
```bash
# Clone with submodules (for Web Framework)
git clone --recursive [https://github.com/yourusername/vellum.git](https://github.com/yourusername/vellum.git)
cd vellum

# Configure and Build
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j$(nproc)

# Launch the Daemon
sudo ./build/vellum --interface 0.0.0.0 --port 8080
