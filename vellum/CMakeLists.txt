cmake_minimum_required(VERSION 3.16)
project(Vellum)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find packages
find_package(PkgConfig REQUIRED)
pkg_check_modules(CROW REQUIRED crow)
pkg_check_modules(LIBVIRT REQUIRED libvirt)

# Include directories
include_directories(include)
include_directories(${CROW_INCLUDE_DIRS})
include_directories(${LIBVIRT_INCLUDE_DIRS})

# Source files
set(SOURCES
    src/main.cpp
    src/VMInstance.cpp
    src/HypervisorManager.cpp
    src/KVMRunLoop.cpp
    src/WebSocketBridge.cpp
    src/APIServer.cpp
)

# Executable
add_executable(vellum ${SOURCES})

# Link libraries
target_link_libraries(vellum ${CROW_LIBRARIES} ${LIBVIRT_LIBRARIES} pthread)

# Compiler flags
target_compile_options(vellum PRIVATE -Wall -Wextra -O2)