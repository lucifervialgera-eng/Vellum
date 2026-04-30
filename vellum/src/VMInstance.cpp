#include "VMInstance.h"
#include <cstring>
#include <iostream>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>

VMInstance::VMInstance(const std::string& id, const std::string& kernelPath, const std::string& initrdPath,
                       size_t memoryMB, int vcpus)
    : id_(id), kernelPath_(kernelPath), initrdPath_(initrdPath), memoryMB_(memoryMB), vcpus_(vcpus),
      state_(State::Stopped), running_(false), guest_memory_(nullptr), guest_memory_size_(memoryMB * 1024 * 1024),
      console_fd_(-1) {
    // Initialize KVM handles to -1
    kvm_fd_ = -1;
    vm_fd_ = -1;
    vcpu_fds_.resize(vcpus_, -1);
}

VMInstance::~VMInstance() {
    stop();
    if (guest_memory_) munmap(guest_memory_, guest_memory_size_);
    if (vm_fd_ >= 0) close(vm_fd_);
    if (kvm_fd_ >= 0) close(kvm_fd_);
    if (console_fd_ >= 0) close(console_fd_);
    for (int fd : vcpu_fds_) {
        if (fd >= 0) close(fd);
    }
}

bool VMInstance::initializeKVM() {
    kvm_fd_ = open("/dev/kvm", O_RDWR);
    if (kvm_fd_ < 0) {
        std::cerr << "Failed to open /dev/kvm" << std::endl;
        return false;
    }

    vm_fd_ = ioctl(kvm_fd_, KVM_CREATE_VM, 0);
    if (vm_fd_ < 0) {
        std::cerr << "Failed to create VM" << std::endl;
        return false;
    }

    // Allocate guest memory
    guest_memory_ = mmap(nullptr, guest_memory_size_, PROT_READ | PROT_WRITE,
                        MAP_PRIVATE | MAP_ANONYMOUS | MAP_NORESERVE, -1, 0);
    if (guest_memory_ == MAP_FAILED) {
        std::cerr << "Failed to allocate guest memory" << std::endl;
        return false;
    }

    // Set user memory region
    struct kvm_userspace_memory_region region = {
        .slot = 0,
        .flags = 0,
        .guest_phys_addr = 0,
        .memory_size = guest_memory_size_,
        .userspace_addr = (uint64_t)guest_memory_,
    };
    if (ioctl(vm_fd_, KVM_SET_USER_MEMORY_REGION, &region) < 0) {
        std::cerr << "Failed to set user memory region" << std::endl;
        return false;
    }

    // Create VCPUs
    for (int i = 0; i < vcpus_; ++i) {
        vcpu_fds_[i] = ioctl(vm_fd_, KVM_CREATE_VCPU, i);
        if (vcpu_fds_[i] < 0) {
            std::cerr << "Failed to create VCPU " << i << std::endl;
            return false;
        }
    }

    return true;
}

bool VMInstance::loadKernel() {
    const uint64_t KERNEL_LOAD_ADDR = 0x100000;  // Standard Linux kernel load address
    const uint64_t INITRD_LOAD_ADDR = 0x800000;  // Common initrd load address

    // Load kernel image into guest memory
    int kernel_fd = open(kernelPath_.c_str(), O_RDONLY);
    if (kernel_fd < 0) {
        std::cerr << "Failed to open kernel file: " << strerror(errno) << std::endl;
        return false;
    }

    struct stat st;
    if (fstat(kernel_fd, &st) < 0) {
        std::cerr << "Failed to stat kernel file: " << strerror(errno) << std::endl;
        close(kernel_fd);
        return false;
    }

    size_t kernel_size = st.st_size;
    if (kernel_size > guest_memory_size_ - KERNEL_LOAD_ADDR) {
        std::cerr << "Kernel too large for memory" << std::endl;
        close(kernel_fd);
        return false;
    }

    if (read(kernel_fd, static_cast<char*>(guest_memory_) + KERNEL_LOAD_ADDR, kernel_size) != kernel_size) {
        std::cerr << "Failed to read kernel: " << strerror(errno) << std::endl;
        close(kernel_fd);
        return false;
    }

    close(kernel_fd);

    // Load initrd if provided
    if (!initrdPath_.empty()) {
        int initrd_fd = open(initrdPath_.c_str(), O_RDONLY);
        if (initrd_fd >= 0) {
            if (fstat(initrd_fd, &st) < 0) {
                std::cerr << "Failed to stat initrd file: " << strerror(errno) << std::endl;
                close(initrd_fd);
                return false;
            }

            size_t initrd_size = st.st_size;
            if (initrd_size > guest_memory_size_ - INITRD_LOAD_ADDR) {
                std::cerr << "Initrd too large for memory" << std::endl;
                close(initrd_fd);
                return false;
            }

            if (read(initrd_fd, static_cast<char*>(guest_memory_) + INITRD_LOAD_ADDR, initrd_size) != initrd_size) {
                std::cerr << "Failed to read initrd: " << strerror(errno) << std::endl;
                close(initrd_fd);
                return false;
            }

            close(initrd_fd);
            std::cout << "Loaded initrd of size " << initrd_size << " bytes" << std::endl;
        } else {
            std::cerr << "Failed to open initrd file: " << strerror(errno) << std::endl;
            // Not fatal, continue without initrd
        }
    }

    std::cout << "Loaded kernel of size " << kernel_size << " bytes at address 0x" << std::hex << KERNEL_LOAD_ADDR << std::endl;
    return true;
}

bool VMInstance::setupVCPUs() {
    const uint64_t KERNEL_ENTRY = 0x100000;  // Kernel entry point

    for (int i = 0; i < vcpus_; ++i) {
        // Set up VCPU registers
        struct kvm_sregs sregs;
        if (ioctl(vcpu_fds_[i], KVM_GET_SREGS, &sregs) < 0) {
            std::cerr << "Failed to get VCPU sregs: " << strerror(errno) << std::endl;
            return false;
        }

        // Set up segment registers for long mode (64-bit)
        sregs.cs.base = 0;
        sregs.cs.limit = 0xFFFFFFFF;
        sregs.cs.g = 1;  // 4KB granularity
        sregs.cs.db = 1;  // 32-bit default size
        sregs.cs.l = 1;   // 64-bit code segment
        sregs.cs.type = 11; // Code, execute/read, accessed
        sregs.cs.s = 1;   // Code/data segment
        sregs.cs.dpl = 0; // Ring 0
        sregs.cs.p = 1;   // Present

        sregs.ds = sregs.es = sregs.fs = sregs.gs = sregs.ss = sregs.cs;

        // Set up page tables (identity mapping for simplicity)
        // In a real implementation, you'd set up proper page tables
        sregs.cr3 = 0;  // No paging for now (simplified)

        if (ioctl(vcpu_fds_[i], KVM_SET_SREGS, &sregs) < 0) {
            std::cerr << "Failed to set VCPU sregs: " << strerror(errno) << std::endl;
            return false;
        }

        // Set up general purpose registers
        struct kvm_regs regs = {};
        regs.rip = KERNEL_ENTRY;
        regs.rflags = 0x2;  // Reserved bit set

        if (ioctl(vcpu_fds_[i], KVM_SET_REGS, &regs) < 0) {
            std::cerr << "Failed to set VCPU regs: " << strerror(errno) << std::endl;
            return false;
        }
    }

    return true;
}

bool VMInstance::start() {
    if (state_ != State::Stopped) return false;

    state_ = State::Starting;

    if (!initializeKVM() || !loadKernel() || !setupVCPUs() || !setupVirtio()) {
        state_ = State::Error;
        return false;
    }

    running_ = true;

    // Start VCPU threads
    for (int i = 0; i < vcpus_; ++i) {
        vcpu_threads_.emplace_back(&VMInstance::vcpuRunLoop, this, i);
    }

    state_ = State::Running;
    return true;
}

bool VMInstance::stop() {
    if (state_ == State::Stopped) return true;

    running_ = false;

    // Wait for threads to finish
    for (auto& thread : vcpu_threads_) {
        if (thread.joinable()) thread.join();
    }
    vcpu_threads_.clear();

    state_ = State::Stopped;
    return true;
}

bool VMInstance::pause() {
    // Implementation for pausing VM
    if (state_ == State::Running) {
        state_ = State::Paused;
        return true;
    }
    return false;
}

bool VMInstance::resume() {
    // Implementation for resuming VM
    if (state_ == State::Paused) {
        state_ = State::Running;
        return true;
    }
    return false;
}

VMInstance::Metrics VMInstance::getMetrics() const {
    return last_metrics_;
}

std::string VMInstance::readConsoleOutput() {
    std::lock_guard<std::mutex> lock(console_mutex_);
    std::string data = std::move(console_buffer_);
    console_buffer_.clear();
    return data;
}

bool VMInstance::sendConsoleInput(const std::string& input) {
    // Queue input for VM
    std::lock_guard<std::mutex> lock(input_mutex_);
    input_queue_.append(input);
    return true;
}

bool VMInstance::setCPULimit(double percentage) {
    // Set CPU limit using cgroups
    // Implementation needed
    return true;
}

bool VMInstance::setMemoryLimit(size_t mb) {
    // Set memory limit using cgroups
    // Implementation needed
    return true;
}

bool VMInstance::createSnapshot(const std::string& snapshotName) {
    // Create qcow2 overlay for CoW
    // Implementation needed
    return true;
}

bool VMInstance::restoreSnapshot(const std::string& snapshotName) {
    // Restore from snapshot
    // Implementation needed
    return true;
}