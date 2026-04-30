#include <iostream>
#include "HypervisorManager.h"
#include "APIServer.h"

int main(int argc, char* argv[]) {
    std::cout << "Starting Vellum..." << std::endl;

    // Initialize hypervisor manager
    auto& hm = HypervisorManager::getInstance();

    // Start API server
    APIServer server;
    server.run();

    return 0;
}