cmake_minimum_required(VERSION 3.10)
project(NativeDicom)

#Define where our GDCM files are based on the architecture (arm64-v8a or x86_64)
set(GDCM_LIB_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../libs/${ANDROID_ABI})
set(GDCM_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../include/gdcm)

#Build module
add_library(NativeDicom SHARED
            NativeDicomJNI.cpp
            ../../../../cpp/DicomParser.cpp)

#Include Headers
target_include_directories(NativeDicom PRIVATE
                           ../../../../cpp
                           ${GDCM_INCLUDE_DIR})

#Link GDCM Libraries (Only if they exist for this architecture)
if(EXISTS ${GDCM_LIB_DIR}/libgdcmMSFF.a)
    target_link_libraries(NativeDicom
                        # Main GDCM libraries
                        ${GDCM_LIB_DIR}/libgdcmMSFF.a
                        ${GDCM_LIB_DIR}/libgdcmMEXD.a
                        ${GDCM_LIB_DIR}/libgdcmDICT.a
                        ${GDCM_LIB_DIR}/libgdcmIOD.a
                        ${GDCM_LIB_DIR}/libgdcmDSED.a
                        ${GDCM_LIB_DIR}/libgdcmCommon.a

                        # Codecs and Third-party
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
    message(WARNING "GDCM libraries not found for ${ANDROID_ABI} at ${GDCM_LIB_DIR}. Building without GDCM support.")
endif()

#Link System libraries
target_link_libraries(NativeDicom
                      z
                      log
                      m
                      atomic)
