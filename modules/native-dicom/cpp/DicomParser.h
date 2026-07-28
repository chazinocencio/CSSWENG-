#ifndef DICOM_PARSER_H
#define DICOM_PARSER_H

#include <string>
#include <vector>
#include <cstdint>
#include <memory>
#include <android/log.h>

#define TAG "DicomParser"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

namespace gdcm {
    class ImageReader;
}

/**
 * DicomMetaData: Non-Protected Health Information (PHI)
 * This structure holds essential geometry and pixel format data required
 * for 2D rendering and 3D Multi-Planar Reconstruction (MPR).
 */
struct DicomMetaData {
    int32_t width = 0;
    int32_t height = 0;
    int32_t num_frames = 1;
    int32_t bits_allocated = 0;
    int32_t bits_stored = 0;
    int32_t pixel_representation = 0; // 0=Unsigned, 1=Signed
    std::string photometricInterpretation = ""; // e.g., MONOCHROME2, RGB
    int32_t instanceNumber = 0; // (0020, 0013) Acquisition order

    // Rescale values for correct Hounsfield Unit (HU) calibration
    double rescaleIntercept = 0.0; // (0028, 1052)
    double rescaleSlope = 1.0;     // (0028, 1053)

    // Spatial metadata for anatomical alignment
    double imagePosition[3] = {0.0, 0.0, 0.0};    // (0020,0032) x, y, z
    double imageOrientation[6] = {1.0, 0.0, 0.0, 0.0, 1.0, 0.0}; // (0020,0037) direction cosines
    double pixel_spacing_x = 1.0;
    double pixel_spacing_y = 1.0;
    double pixel_spacing_z = 1.0; // Distance between slices (slice thickness + gap)
    std::string seriesInstanceUID = ""; // Used to group slices into a consistent volume

    // Windowing Defaults (0028, 1050) and (0028, 1051)
    double windowCenter = 50.0;
    double windowWidth = 400.0;

    //Tags for patient name and sex 
    std::string patientName = "No Patient Name"; // (0010, 0010)
    std::string patientSex = "N/A"; // (0010, 0040)
};

/**
 * DicomParser: Native Core Wrapper
 * Encapsulates the GDCM library to provide a clean interface for
 * extracting metadata and raw pixel buffers from DICOM files.
 */
class DicomParser {
private:
    std::string file_path;
    std::vector<std::string> file_paths;
    DicomMetaData meta_data;
    bool isInitialized = false;

    std::unique_ptr<gdcm::ImageReader> reader;

    /**
     * Internal method to parse the DICOM dataset using GDCM.
     * Extracts pixel format, dimensions, and spatial tags.
     *
     * @return boolean - true if read and parsed by GDCM
     */
    bool parseDataset();

public:
    // Constructors supporting single files or series of file paths
    DicomParser(const std::string& path);
    DicomParser(const std::vector<std::string>& paths);
    ~DicomParser();

    /**
     * Validates file paths and triggers the parser.
     * Must be called before any data extraction.
     *
     * @return boolean - true if the file was found and successfully parsed
     */
    bool initialize();

    /**
     * @return DicomMetaData - the populated metadata structure.
     */
    DicomMetaData getMetaData() const;

    /**
     * Extracts raw pixel bytes for a specific frame into a provided buffer.
     * Supports both single-frame and multi-frame datasets.
     *
     * @param frame_index - index of the frame to retrieve (0 to num_frames - 1)
     * @param out_pixel_buffer - output vector where raw bytes will be stored
     *
     * @return boolean - true if frame pixels were successfully extracted
     */
    bool getFramePixels(int32_t frame_index, std::vector<uint8_t>& out_pixel_buffer);
};

#endif
