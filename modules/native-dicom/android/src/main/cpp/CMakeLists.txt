cmake_minimum_required(VERSION 3.10)
project(NativeDicom)

# NativeDicom CMake Configuration
# This file defines the build process for the NativeDicom library,
# ncluding path resolution for GDCM dependencies, source file inclusion,
# and linking of both static and system libraries.

# Path Configuration
# Define where our GDCM files are based on the target architecture (arm64-v8a or x86_64)
# These paths point to pre-compiled static libraries and headers.
set(GDCM_LIB_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../libs/${ANDROID_ABI})
set(GDCM_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../include/gdcm)

# Headers and Libraries from React Native
find_package(ReactAndroid REQUIRED CONFIG)

# Module Definition
# Build the shared library 'NativeDicom' which will be loaded by Android.
# Includes the JNI bridge and the core C++ DicomParser logic.
add_library(NativeDicom SHARED
            NativeDicomJNI.cpp
            NativeDicomJSI.cpp
            ../../../../cpp/DicomParser.cpp
            ../../../../cpp/GeometryUtils.cpp)

# Header Includes
# Ensure the compiler can find our custom headers and GDCM's headers.
target_include_directories(NativeDicom PRIVATE
                           ../../../../cpp
                           ${GDCM_INCLUDE_DIR}
                           # Point to ReactCommon so that <jsi/jsi.h> can be resolved
                           ../../../../../../node_modules/react-native/ReactCommon
                           ../../../../../../node_modules/react-native/ReactCommon/jsi)

# Dependency Linking (GDCM)
# Link the necessary GDCM static libraries only if they exist for the current architecture.
# GDCM is split into several modular libraries (MSFF, MEXD, DICT, etc.) and third-party codecs.
if(EXISTS ${GDCM_LIB_DIR}/libgdcmMSFF.a)
    target_link_libraries(NativeDicom
                        # Main GDCM libraries for DICOM File handling
                        ${GDCM_LIB_DIR}/libgdcmMSFF.a
                        ${GDCM_LIB_DIR}/libgdcmMEXD.a
                        ${GDCM_LIB_DIR}/libgdcmDICT.a
                        ${GDCM_LIB_DIR}/libgdcmIOD.a
                        ${GDCM_LIB_DIR}/libgdcmDSED.a
                        ${GDCM_LIB_DIR}/libgdcmCommon.a

                        # Codecs and Third-party libraries (JPEG, OpenJPEG, EXPAT, etc.)
                        ${GDCM_LIB_DIR}/libgdcmcharls.a
                        ${GDCM_LIB_DIR}/libgdcmopenjp2.a
                        ${GDCM_LIB_DIR}/libgdcmjpeg8.a
                        ${GDCM_LIB_DIR}/libgdcmjpeg12.a
                        ${GDCM_LIB_DIR}/libgdcmjpeg16.a
                        ${GDCM_LIB_DIR}/libgdcmexpat.a
                        ${GDCM_LIB_DIR}/libgdcmzlib.a
                        ${GDCM_LIB_DIR}/libgdcmuuid.a
                        ${GDCM_LIB_DIR}/libsocketxx.a)
else()
    # Provide a warning if GDCM libraries are missing for the specific ABI
    message(WARNING "GDCM libraries not found for ${ANDROID_ABI} at ${GDCM_LIB_DIR}. Building without GDCM support.")
endif()

# System Library Linking
# Link standard Android/System libraries required for compression, logging, and math.
target_link_libraries(NativeDicom
                      z       # Zlib for compression
                      log     # Android Logcat support
                      m       # Math library
                      atomic  # Atomic operations support
                      ReactAndroid::jsi) # Link against JSI symbols
