#include "DicomParser.h"

#include <gdcmImageReader.h>
#include <gdcmImage.h>
#include <gdcmPhotometricInterpretation.h>
#include <iostream>
#include <stdexcept>

/**
 * DicomParser Implementation
 *
 * This class provides a high-level wrapper around the GDCM library to
 * simplify the extraction of metadata and pixel data from DICOM files.
 */

//Constructor & Destructor
DicomParser::DicomParser(const std::string& path)
    //Initialize variables inside DicomParser class
    : file_path(path), isInitialized(false), reader(std::make_unique<gdcm::ImageReader>()) {}

DicomParser:: ~DicomParser() {}

/**
 * Initialize DICOM file
 * This function validates the file path and attempts to parse
 * the DICOM dataset using GDCM.
 *
 * @return boolean - true if the file was found and successfully parsed
 */
bool DicomParser::initialize() {
    //Validation of file path
    if (file_path.empty()) {
        LOGE("Error: Cannot initialize DicomParser with empty file path");
        return false;
    }

    //Hard coded metadata for bridge test (DISABLED)
    /*
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
    */

    // Parse the dataset
    isInitialized = parseDataset();
    return isInitialized;
}


/**
 * Parsing of Dataset
 * This function uses GDCM to read the file structure and extract
 * essential image properties for the metadata structure.
 *
 * @return boolean - true if read and parsed by GDCM
 */
bool DicomParser::parseDataset() {
    //Let GDCM know what file to read
    reader->SetFileName(file_path.c_str());

    // Attempt to read the DICOM file header and metadata
    if (!reader->Read()) {
        LOGE("Error: GDCM failed to read file: %s", file_path.c_str());
        return false;
    }

    // Extract the image object from the reader
    const gdcm::Image &image = reader->GetImage();

    // Store basic image dimensions
    meta_data.width = image.GetColumns();
    meta_data.height = image.GetRows();

    // Handle 3D datasets (multi-frame) vs standard 2D images
    meta_data.num_frames = image.GetNumberOfDimensions() > 2 ? image.GetDimension(2) : 1;

    // Extract pixel format details (bit depth and representation)
    const gdcm::PixelFormat &pixel_format = image.GetPixelFormat();
    meta_data.bits_allocated = pixel_format.GetBitsAllocated();
    meta_data.bits_stored = pixel_format.GetBitsStored();
    meta_data.pixel_representation = pixel_format.GetPixelRepresentation();

    // Interpretation indicates how pixels should be rendered (e.g., MONOCHROME2, RGB)
    meta_data.photometricInterpretation = image.GetPhotometricInterpretation().GetString();

    // Basic integrity check
    if (meta_data.width <= 0 || meta_data.height <= 0 || meta_data.num_frames <= 0) {
        LOGE("Error: Parsed DICOM has invalid dimensions");
        return false;
    }
    return true;
}

//Public Method Getters
/**
 * Metadata Getter
 * Returns the metadata structure populated during initialization.
 *
 * @return DicomMetaData - structure containing image dimensions and pixel format
 */
DicomMetaData DicomParser::getMetaData() const {
    if (!isInitialized) return DicomMetaData();
    return meta_data;
}


/**
 * Frame Pixels Getter
 * Extracts the raw pixel bytes for a specific frame from the DICOM file.
 *
 * @param frame_index - index of the frame to retrieve (0 to num_frames - 1)
 * @param out_pixel_buffer - output vector where raw bytes will be stored
 *
 * @return boolean - true if frame pixels were successfully extracted
 */
// bool DicomParser::getFramePixels(int32_t frame_index, std::vector <uint8_t> &out_pixel_buffer) {
//     //Initialization check
//     if (!isInitialized) {
//         LOGE("Error: Parser not initialized");
//         return false;
//     }

//     //Image frame range checking
//     if (frame_index < 0 || frame_index >= meta_data.num_frames) {
//         LOGE("Error: Frame index %d is out of bounds (0 to %d)", frame_index, meta_data.num_frames - 1);
//         return false;
//     }

//     /*
//     //Hardcoded meta data (DISABLED)
//     if (file_path == "sample.dcm") {
//         // Return a dummy black frame
//         size_t byte_per_pixel = (meta_data.bits_allocated <= 8) ? 1 : (meta_data.bits_allocated <= 16) ? 2 : 4;
//         size_t single_frame_size_bytes = (size_t)meta_data.width * (size_t)meta_data.height * byte_per_pixel;
//         out_pixel_buffer.assign(single_frame_size_bytes, 0);
//         return true;
//     }
//     */

//     const gdcm::Image &image = reader->GetImage();

//     // Buffer allocation logic
//     // Determine bytes per pixel based on bits allocated (e.g., 16-bit DICOM = 2 bytes per pixel)
//     size_t byte_per_pixel = (meta_data.bits_allocated <= 8) ? 1 : (meta_data.bits_allocated <= 16) ? 2 : 4;
//     size_t single_frame_size_bytes = (size_t)meta_data.width * (size_t)meta_data.height * byte_per_pixel;

//     out_pixel_buffer.resize(single_frame_size_bytes);

//     // Pixel data extraction
//     if (meta_data.num_frames == 1) {
//         // Single frame: read directly into buffer
//         image.GetBuffer(reinterpret_cast<char*>(out_pixel_buffer.data()));
//     } else {
//         // Multi-frame: calculate byte offset and extract specific frame
//         size_t frame_off_set = single_frame_size_bytes * (size_t)frame_index;

//         // Retrieve the full pixel buffer from GDCM
//         std::vector<char> fullBuffer(image.GetBufferLength());
//         image.GetBuffer(fullBuffer.data());

//         // Copy the specific frame segment into our output buffer
//         std::copy(
//                 fullBuffer.begin() + frame_off_set,
//                 fullBuffer.begin() + frame_off_set + single_frame_size_bytes,
//                 out_pixel_buffer.begin()
//         );
//     }

//     return true;
// }

// Instead of manually allocating the bytes that is prone to error depending on the computation, this function used GDCM's native methods to determine the exact size required per frame
bool DicomParser::getFramePixels(int32_t frame_index, std::vector <uint8_t> &out_pixel_buffer) {
    if (!isInitialized) return false;
    if (frame_index < 0 || frame_index >= meta_data.num_frames) return false;

    const gdcm::Image &image = reader->GetImage();

    // The safest way to get the exact bytes required for ONE frame
    // is to divide the total buffer length by the number of frames.
    unsigned long total_buffer_length = image.GetBufferLength();
    size_t single_frame_size_bytes = total_buffer_length / meta_data.num_frames;

    out_pixel_buffer.resize(single_frame_size_bytes);

    if (meta_data.num_frames == 1) {
        // Single frame: Safe to read directly now that the size perfectly matches GDCM's expectations
        image.GetBuffer(reinterpret_cast<char*>(out_pixel_buffer.data()));
    } else {
        // Multi-frame
        size_t frame_off_set = single_frame_size_bytes * (size_t)frame_index;

        std::vector<char> fullBuffer(total_buffer_length);
        image.GetBuffer(fullBuffer.data());

        std::copy(
                fullBuffer.begin() + frame_off_set,
                fullBuffer.begin() + frame_off_set + single_frame_size_bytes,
                out_pixel_buffer.begin()
        );
    }
    return true;
}