#include "VMInstance.h"
#include <algorithm>
#include <iostream>
#include <cstring>
#include <poll.h>
#include <fstream>
#include <sstream>
#include <thread>

// This is a snippet showing the KVM_RUN ioctl loop in a non-blocking thread
// In VMInstance::vcpuRunLoop(int vcpu_id)

void VMInstance::vcpuRunLoop(int vcpu_id) {
    int vcpu_fd = vcpu_fds_[vcpu_id];
    int mmap_size = ioctl(kvm_fd_, KVM_GET_VCPU_MMAP_SIZE, 0);
    if (mmap_size <= 0) {
        std::cerr << "Failed to get KVM vcpu mmap size" << std::endl;
        return;
    }

    struct kvm_run* run = static_cast<struct kvm_run*>(mmap(nullptr, mmap_size, PROT_READ | PROT_WRITE,
                                                            MAP_SHARED, vcpu_fd, 0));
    if (run == MAP_FAILED) {
        std::cerr << "Failed to mmap KVM run structure" << std::endl;
        return;
    }

    // Set up polling for non-blocking operation
    struct pollfd pfd = {vcpu_fd, POLLIN | POLLOUT | POLLERR, 0};

    while (running_.load()) {
        // Check if VM is paused
        if (paused_.load()) {
            std::unique_lock<std::mutex> lock(pause_mutex_);
            while (paused_.load() && running_.load()) {
                pause_cv_.wait(lock);
            }
        }

        // Non-blocking poll to check if KVM_RUN can proceed
        int ret = poll(&pfd, 1, 100);  // 100ms timeout for responsiveness

        if (ret < 0) {
            std::cerr << "Poll error: " << strerror(errno) << std::endl;
            break;
        }

        if (ret == 0) {
            // Timeout, can perform other tasks like updating metrics
            updateMetrics();
            continue;
        }

        // Execute KVM_RUN ioctl
        ret = ioctl(vcpu_fd, KVM_RUN, 0);
        if (ret < 0) {
            if (errno == EINTR) continue;  // Interrupted, retry
            std::cerr << "KVM_RUN failed: " << strerror(errno) << std::endl;
            break;
        }

        // Handle VM exit reasons
        switch (run->exit_reason) {
            case KVM_EXIT_IO:
                // Handle I/O operations (e.g., serial console)
                handleIO(run);
                break;
            case KVM_EXIT_MMIO:
                // Handle MMIO operations
                handleMMIO(run);
                break;
            case KVM_EXIT_HLT:
                // VM halted, perhaps wait or handle
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
                break;
            case KVM_EXIT_INTR:
                // Interrupted, continue
                break;
            case KVM_EXIT_SHUTDOWN:
                // VM shutdown
                running_ = false;
                break;
            default:
                std::cerr << "Unhandled exit reason: " << run->exit_reason << std::endl;
                running_ = false;
                break;
        }

        // Update metrics periodically
        static int counter = 0;
        if (++counter % 100 == 0) {  // Every ~100 runs
            updateMetrics();
        }
    }

    munmap(run, mmap_size);
}

// Helper methods (placeholders)
void VMInstance::handleIO(struct kvm_run* run) {
    // Handle serial console I/O
    if (run->io.port == 0x3f8) {  // COM1 port
        auto data_ptr = reinterpret_cast<char*>(run) + run->io.data_offset;
        if (run->io.direction == KVM_EXIT_IO_OUT) {
            // Output to console
            std::string output(data_ptr, run->io.size);
            std::lock_guard<std::mutex> lock(console_mutex_);
            console_buffer_.append(output);
            console_cv_.notify_one();
            if (console_callback_) {
                console_callback_(output);
            }
        } else {
            // Input from console
            std::lock_guard<std::mutex> lock(input_mutex_);
            size_t len = std::min<size_t>(run->io.size, input_queue_.size());
            if (len > 0) {
                memcpy(data_ptr, input_queue_.data(), len);
                input_queue_.erase(0, len);
            }
        }
    }
}

void VMInstance::handleMMIO(struct kvm_run* run) {
    // Handle VirtIO MMIO operations
    // Implementation depends on VirtIO devices set up
    std::cout << "MMIO access at " << std::hex << run->mmio.phys_addr << std::endl;
}

void VMInstance::updateMetrics() {
    // Read from /proc or hypervisor for metrics
    // Placeholder: simulate reading metrics
    last_metrics_.cpuUsage = 15.5;  // Example
    last_metrics_.memoryUsage = memoryMB_ * 1024 / 2;  // Half usage
    last_metrics_.diskUsage = 1024;  // 1MB

    if (telemetry_callback_) {
        telemetry_callback_(last_metrics_);
    }
}