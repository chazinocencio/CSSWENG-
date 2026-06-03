cmake_minimum_required(VERSION 3.10.2)

project("dicom_native_lib")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(.)

add_library(
        dicom_native_lib
        SHARED
        DicomParser.cpp
        native-lib.cpp
)

find_library(log-lib log)

target_link_libraries(
        dicom_native_lib
        ${log-lib}
)