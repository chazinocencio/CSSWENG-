cmake_minimum_required(VERSION 3.10)
project(NativeDicom)

# Add shared sources from the cpp directory
add_library(NativeDicom SHARED
            NativeDicomJNI.cpp
            ../../../../cpp/DicomParser.cpp)

# Include directories
target_include_directories(NativeDicom PRIVATE
                           ../../../../cpp)

# Link log library for debugging
find_library(log-lib log)
target_link_libraries(NativeDicom ${log-lib})
