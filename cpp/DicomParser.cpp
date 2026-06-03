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

//Deletes GDCM readers once DicomParser is destroyed
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
    //Let GDCM know what file to read
    reader->SetFileName(file_path.c_str());

    //Return false if readers fails to read the file
    if (!reader->Read()) {
        std::cerr << "Error: GDCM failed to read file." << std::endl;
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
        std::cerr << "Error: Corrupted structural metadata" << std::endl;
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
    if (!isInitialized) {
        std::cerr << "Error: Parser not initialized" << std::endl;
        return false;
    }

    if (frame_index < 0 || frame_index >= meta_data.num_frames) {
        std::cerr << "Error: Frame index out of bounds" << std::endl;
        return false;
    }

    const gdcm::Image &image - reader->GetImage();

    size_t byte_per_pixel = (meta_data.bits_allocated <= 8) ? 1 : (meta_data.bits_allocated <= 16) ? 2 : 4;
    size_t single_frame_size_bytes = meta_data.width * meta_data.height * byte_per_pixel;

    out_pixel_buffer.resize(single_frame_size_bytes);

    if (meta_data.num_frames == 1) {
        image.GetBuffer(reinterpret_cast<char*>(out_pixel_buffer.data()));
    } else {
        //Calculation where the frame is located in the memory
        size_t frame_off_set = single_frame_size_bytes * frame_index;

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