#ifndef VELLUM_VMINSTANCE_H
#define VELLUM_VMINSTANCE_H

#include <string>
#include <vector>
#include <memory>
#include <thread>
#include <atomic>
#include <functional>
#include <mutex>
#include <condition_variable>
#include <linux/kvm.h>  // KVM headers
#include <fcntl.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>

// Forward declarations
class HypervisorManager;

class VMInstance {
public:
    enum class State { Stopped, Starting, Running, Paused, Error };

    VMInstance(const std::string& id, const std::string& kernelPath, const std::string& initrdPath = "",
               size_t memoryMB = 256, int vcpus = 1);
    ~VMInstance();

    // Monitoring
    struct Metrics {
        double cpuUsage;  // Percentage
        size_t memoryUsage;  // KB
        size_t diskUsage;  // KB
    };
    Metrics getMetrics() const;

    void setConsoleCallback(std::function<void(const std::string&)> callback) {
        console_callback_ = callback;
    }

    void setTelemetryCallback(std::function<void(const VMInstance::Metrics&)> callback) {
        telemetry_callback_ = callback;
    }

    // Lifecycle management
    bool start();
    bool stop();
    bool pause();
    bool resume();

    // Resource management
    bool setCPULimit(double percentage);
    bool setMemoryLimit(size_t mb);

    // Console access
    std::string readConsoleOutput();
    bool sendConsoleInput(const std::string& input);

    // Snapshot/CoW
    bool createSnapshot(const std::string& snapshotName);
    bool restoreSnapshot(const std::string& snapshotName);

    // Getters
    std::string getId() const { return id_; }
    State getState() const { return state_; }
    size_t getMemoryMB() const { return memoryMB_; }
    int getVCPUs() const { return vcpus_; }

private:
    std::string id_;
    std::string kernelPath_;
    std::string initrdPath_;
    size_t memoryMB_;
    int vcpus_;
    State state_;

    // KVM handles
    int kvm_fd_;
    int vm_fd_;
    std::vector<int> vcpu_fds_;
    void* guest_memory_;
    size_t guest_memory_size_;

    // Threads
    std::vector<std::thread> vcpu_threads_;
    std::atomic<bool> running_;

    // Console
    int console_fd_;  // Serial console file descriptor
    std::string console_buffer_;
    std::mutex console_mutex_;
    std::condition_variable console_cv_;
    std::string input_queue_;
    std::mutex input_mutex_;
    std::function<void(const std::string&)> console_callback_;
    std::function<void(const VMInstance::Metrics&)> telemetry_callback_;

    // Metrics
    mutable Metrics last_metrics_;

    // Private methods
    bool initializeKVM();
    bool loadKernel();
    bool setupVirtio();
    bool setupVCPUs();
    void vcpuRunLoop(int vcpu_id);
    void handleIO(struct kvm_run* run);
    void handleMMIO(struct kvm_run* run);
    void updateMetrics();

    friend class HypervisorManager;
};

#endif // VELLUM_VMINSTANCE_H