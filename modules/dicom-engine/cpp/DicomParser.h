#ifndef DICOM_PARSER_H
#define DICOM_PARSER_H

#include <string>
#include <vector>
#include <cstdint>
#include <memory>

namespace gdcm {
    class ImageReader;
}

//Non-Protected Health Information Metadata necessary for Image Rendering
struct DicomMetaData {
    int32_t width = 0;
    int32_t height = 0;
    int32_t num_frames = 1;
    int32_t bits_allocated = 0;
    int32_t bits_stored = 0;
    int32_t pixel_representation = 0;
    std::string photometricInterpretation = "";
};

class DicomParser {
private:
    std::string file_path;
    DicomMetaData meta_data;
    bool isInitialized = false;

    std::unique_ptr<gdcm::ImageReader> reader;

    bool parseDataset();

public:
    DicomParser(const std::string& path);
    ~DicomParser();

    bool initialize();
    DicomMetaData getMetaData() const;
    bool getFramePixels(int32_t frame_index, std::vector<uint8_t>& out_pixel_buffer);
};

#endif