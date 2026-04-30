#include "APIServer.h"
#include "HypervisorManager.h"
#include <iostream>

APIServer::APIServer() {
    setupRoutes();
}

APIServer::~APIServer() {
    // Cleanup
}

void APIServer::setupRoutes() {
    CROW_ROUTE(app_, "/api/vm/create").methods("POST"_method)([this]() {
        auto json = crow::json::load(app_.get_request_body());
        if (!json) return crow::response(400, "Invalid JSON");

        std::string id = json["id"].s();
        std::string kernelPath = json["kernelPath"].s();
        std::string initrdPath = json.has("initrdPath") ? json["initrdPath"].s() : "";
        size_t memoryMB = json.has("memoryMB") ? (size_t)json["memoryMB"].i() : 256;
        int vcpus = json.has("vcpus") ? (int)json["vcpus"].i() : 1;

        auto vm = HypervisorManager::getInstance().createVM(id, kernelPath, initrdPath, memoryMB, vcpus);
        if (vm) {
            // Set console callback for real-time streaming
            HypervisorManager::getInstance().setVMConsoleCallback(id, [this, id](const std::string& data) {
                this->broadcastConsoleOutput(id, data);
            });
            // Set telemetry callback
            HypervisorManager::getInstance().setVMTelemetryCallback(id, [this, id](const VMInstance::Metrics& metrics) {
                this->broadcastTelemetry(id, metrics);
            });
            return crow::response(200, "{\"success\":true,\"message\":\"VM created\"}");
        } else {
            return crow::response(500, "{\"success\":false,\"message\":\"Failed to create VM\"}");
        }
    });

    CROW_ROUTE(app_, "/api/vm/<string>/start").methods("POST"_method)([this](const std::string& id) {
        auto vm = HypervisorManager::getInstance().getVM(id);
        if (!vm) return crow::response(404, "{\"success\":false,\"message\":\"VM not found\"}");

        if (vm->start()) {
            return crow::response(200, "{\"success\":true,\"message\":\"VM started\"}");
        } else {
            return crow::response(500, "{\"success\":false,\"message\":\"Failed to start VM\"}");
        }
    });

    CROW_ROUTE(app_, "/api/vm/<string>/stop").methods("POST"_method)([this](const std::string& id) {
        auto vm = HypervisorManager::getInstance().getVM(id);
        if (!vm) return crow::response(404, "{\"success\":false,\"message\":\"VM not found\"}");

        if (vm->stop()) {
            return crow::response(200, "{\"success\":true,\"message\":\"VM stopped\"}");
        } else {
            return crow::response(500, "{\"success\":false,\"message\":\"Failed to stop VM\"}");
        }
    });

    CROW_ROUTE(app_, "/api/vm/<string>/metrics")([this](const std::string& id) {
        auto vm = HypervisorManager::getInstance().getVM(id);
        if (!vm) return crow::response(404, "{\"success\":false,\"message\":\"VM not found\"}");

        auto metrics = vm->getMetrics();
        crow::json::wvalue json;
        json["cpuUsage"] = metrics.cpuUsage;
        json["memoryUsage"] = metrics.memoryUsage;
        json["diskUsage"] = metrics.diskUsage;
        return crow::response(json);
    });

    CROW_ROUTE(app_, "/api/vm/list")([this]() {
        auto vms = HypervisorManager::getInstance().listVMs();
        crow::json::wvalue json = crow::json::wvalue::list();
        for (size_t i = 0; i < vms.size(); ++i) {
            auto vm = HypervisorManager::getInstance().getVM(vms[i]);
            if (vm) {
                crow::json::wvalue vm_json;
                vm_json["id"] = vm->getId();
                vm_json["state"] = vm->getState() == VMInstance::State::Running ? "Running" :
                                   vm->getState() == VMInstance::State::Stopped ? "Stopped" : "Other";
                json[i] = std::move(vm_json);
            }
        }
        return crow::response(json);
    });

    // WebSocket for console
    CROW_WEBSOCKET_ROUTE(app_, "/ws/console/<string>")
    .onopen([this](crow::websocket::connection& conn, const std::string& vm_id) {
        std::lock_guard<std::mutex> lock(connections_mutex_);
        console_connections_[vm_id].insert(&conn);
        std::cout << "Console WebSocket opened for VM: " << vm_id << std::endl;
    })
    .onmessage([this](crow::websocket::connection& conn, const std::string& data, bool is_binary) {
        auto json = crow::json::load(data);
        if (json && json["type"] == "input") {
            std::string vm_id;
            {
                std::lock_guard<std::mutex> lock(connections_mutex_);
                for (const auto& pair : console_connections_) {
                    if (pair.second.count(&conn)) {
                        vm_id = pair.first;
                        break;
                    }
                }
            }
            if (!vm_id.empty()) {
                auto vm = HypervisorManager::getInstance().getVM(vm_id);
                if (vm) {
                    vm->sendConsoleInput(json["data"].s());
                }
            }
        }
    })
    .onclose([this](crow::websocket::connection& conn, const std::string& reason) {
        std::lock_guard<std::mutex> lock(connections_mutex_);
        for (auto& pair : console_connections_) {
            pair.second.erase(&conn);
        }
        std::cout << "Console WebSocket closed" << std::endl;
    });

    // Serve static files (React app)
    CROW_ROUTE(app_, "/")([]() {
        return crow::response(crow::mustache::load("index.html").render());
    });

    // WebSocket for telemetry
    CROW_WEBSOCKET_ROUTE(app_, "/ws/telemetry")
    .onopen([this](crow::websocket::connection& conn) {
        std::lock_guard<std::mutex> lock(connections_mutex_);
        telemetry_connections_.insert(&conn);
        std::cout << "Telemetry WebSocket opened" << std::endl;
    })
    .onclose([this](crow::websocket::connection& conn, const std::string& reason) {
        std::lock_guard<std::mutex> lock(connections_mutex_);
        telemetry_connections_.erase(&conn);
        std::cout << "Telemetry WebSocket closed" << std::endl;
    });
}

void APIServer::broadcastTelemetry(const std::string& vm_id, const VMInstance::Metrics& metrics) {
    std::lock_guard<std::mutex> lock(connections_mutex_);
    crow::json::wvalue msg;
    msg["type"] = "metrics";
    msg["vmId"] = vm_id;
    msg["cpuUsage"] = metrics.cpuUsage;
    msg["memoryUsage"] = metrics.memoryUsage;
    msg["diskUsage"] = metrics.diskUsage;
    std::string msg_str = crow::json::dump(msg);
    for (auto conn : telemetry_connections_) {
        conn->send_text(msg_str);
    }
}

void APIServer::run() {
    app_.port(8080).multithreaded().run();
}