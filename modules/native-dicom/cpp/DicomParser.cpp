#include "DicomParser.h"

// Temporarily commented out until GDCM is integrated
// #include <gdcmImageReader.h>
// #include <gdcmImage.h>
// #include <gdcmPhotometricInterpretation.h>
#include <iostream>
#include <stdexcept>

//Constructor & Destructor
DicomParser::DicomParser(const std::string& path)
    : file_path(path), isInitialized(false)
    // , reader(std::make_unique<gdcm::ImageReader>())
    {}

DicomParser:: ~DicomParser() {}

bool DicomParser::initialize() {
    if (file_path.empty()) {
        std::cerr << "Error: File path is empty" <<  std::endl;
        return false;
    }

    isInitialized = parseDataset();
    return isInitialized;
}

bool DicomParser::parseDataset() {
    // DUMMY DATA FOR TESTING BRIDGE
    meta_data.width = 512;
    meta_data.height = 512;
    meta_data.num_frames = 1;
    meta_data.bits_allocated = 16;
    meta_data.bits_stored = 12;
    meta_data.pixel_representation = 0;
    meta_data.photometricInterpretation = "MONOCHROME2";

    return true;
}

//Public Method Getters
DicomMetaData DicomParser::getMetaData() const {
    if (!isInitialized) return DicomMetaData();
    return meta_data;
}

bool DicomParser::getFramePixels(int32_t frame_index, std::vector <uint8_t> &out_pixel_buffer) {
    if (!isInitialized) {
        std::cerr << "Error: Parser not initialized" << std::endl;
        return false;
    }

    // Return a dummy gradient for testing
    size_t size = meta_data.width * meta_data.height * 2; // 16-bit
    out_pixel_buffer.resize(size);
    for (size_t i = 0; i < size; ++i) {
        out_pixel_buffer[i] = static_cast<uint8_t>(i % 256);
    }

    return true;
}
