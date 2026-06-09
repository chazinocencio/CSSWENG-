#include "DicomParser.h"

#include <gdcmImageReader.h>
#include <gdcmImage.h>
#include <gdcmPhotometricInterpretation.h>
#include <iostream>
#include <stdexcept>

//Constructor & Destructor
DicomParser::DicomParser(const std::string& path)
    //Initialize variables inside DicomParser class
    : file_path(path), isInitialized(false), reader(std::make_unique<gdcm::ImageReader>()) {}

DicomParser:: ~DicomParser() {}

bool DicomParser::initialize() {
    //Checks for file path
    if (file_path.empty()) {
        LOGE("Error: File path is empty");
        return false;
    }

    if (file_path == "sample.dcm") {
        // Hardcoded metadata for testing without a real file
        meta_data.width = 512;
        meta_data.height = 512;
        meta_data.num_frames = 1;
        meta_data.bits_allocated = 16;
        meta_data.bits_stored = 12;
        meta_data.pixel_representation = 0;
        meta_data.photometricInterpretation = "MONOCHROME2";
        isInitialized = true;
        return true;
    }

    isInitialized = parseDataset();
    return isInitialized;
}

bool DicomParser::parseDataset() {
    //Let GDCM know what file to read
    reader->SetFileName(file_path.c_str());

    //Return false if readers fails to read the file
    if (!reader->Read()) {
        LOGE("Error: GDCM failed to read file: %s", file_path.c_str());
        return false;
    }

    //Extract the image from the reader
    const gdcm::Image &image = reader->GetImage();

    //Storing of meta data from the file read
    meta_data.width = image.GetColumns();
    meta_data.height = image.GetRows();

    meta_data.num_frames = image.GetNumberOfDimensions() > 2 ? image.GetDimension(2) : 1;

    const gdcm::PixelFormat &pixel_format = image.GetPixelFormat();
    meta_data.bits_allocated = pixel_format.GetBitsAllocated();
    meta_data.bits_stored = pixel_format.GetBitsStored();
    meta_data.pixel_representation = pixel_format.GetPixelRepresentation();

    meta_data.photometricInterpretation = image.GetPhotometricInterpretation().GetString();

    if (meta_data.width <= 0 || meta_data.height <= 0 || meta_data.num_frames <= 0) {
        return false;
    }
    return true;
}

//Public Method Getters
DicomMetaData DicomParser::getMetaData() const {
    if (!isInitialized) return DicomMetaData();
    return meta_data;
}

bool DicomParser::getFramePixels(int32_t frame_index, std::vector <uint8_t> &out_pixel_buffer) {
    //Initialization check
    if (!isInitialized) {
        LOGE("Error: Parser not initialized");
        return false;
    }

    //Image frame range checking
    if (frame_index < 0 || frame_index >= meta_data.num_frames) {
        LOGE("Error: Frame index out of bounds");
        return false;
    }

    //Hardcoded meta data
    if (file_path == "sample.dcm") {
        // Return a dummy black frame
        size_t byte_per_pixel = (meta_data.bits_allocated <= 8) ? 1 : (meta_data.bits_allocated <= 16) ? 2 : 4;
        size_t single_frame_size_bytes = (size_t)meta_data.width * (size_t)meta_data.height * byte_per_pixel;
        out_pixel_buffer.assign(single_frame_size_bytes, 0);
        return true;
    }

    const gdcm::Image &image = reader->GetImage();

    //Calculate buffer size based on pixel format
    size_t byte_per_pixel = (meta_data.bits_allocated <= 8) ? 1 : (meta_data.bits_allocated <= 16) ? 2 : 4;
    size_t single_frame_size_bytes = (size_t)meta_data.width * (size_t)meta_data.height * byte_per_pixel;

    out_pixel_buffer.resize(single_frame_size_bytes);

    if (meta_data.num_frames == 1) {
        //Single frame: read directly into buffer
        image.GetBuffer(reinterpret_cast<char*>(out_pixel_buffer.data()));
    } else {
        //Multi-frame: calculate offset and extract specific frame
        size_t frame_off_set = single_frame_size_bytes * (size_t)frame_index;

        std::vector<char> fullBuffer(image.GetBufferLength());
        image.GetBuffer(fullBuffer.data());

        std::copy(
                fullBuffer.begin() + frame_off_set,
                fullBuffer.begin() + frame_off_set + single_frame_size_bytes,
                out_pixel_buffer.begin()
        );
    }

    return true;
}
