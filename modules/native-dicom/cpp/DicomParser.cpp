#include "DicomParser.h"
#include <gdcmImageReader.h>
#include <gdcmImage.h>
#include <gdcmPhotometricInterpretation.h>
#include <gdcmAttribute.h>
#include <iostream>
#include <stdexcept>
#include <algorithm>
#include <cctype>

DicomParser::DicomParser(const std::string& path)
    : file_path(path), isInitialized(false), reader(std::make_unique<gdcm::ImageReader>()) {
    file_paths.push_back(path);
}

DicomParser::DicomParser(const std::vector<std::string>& paths)
    : isInitialized(false), reader(std::make_unique<gdcm::ImageReader>()) {
    if (!paths.empty()) {
        file_path = paths[0]; // Primary file for metadata
        file_paths = paths;
    }
}

DicomParser::~DicomParser() {}

bool DicomParser::initialize() {
    if (file_path.empty()) return false;
    isInitialized = parseDataset();
    return isInitialized;
}

bool DicomParser::parseDataset() {
    // Tell GDCM which file to parse
    reader->SetFileName(file_path.c_str());
    if (!reader->Read()) {
        LOGE("GDCM Error: Unable to read %s", file_path.c_str());
        return false;
    }

    const gdcm::Image &image = reader->GetImage();
    meta_data.width = image.GetColumns();
    meta_data.height = image.GetRows();
    meta_data.num_frames = image.GetNumberOfDimensions() > 2 ? image.GetDimension(2) : 1;

    // Pixel Format (Critical for 16-bit to 8-bit scaling on frontend)
    const gdcm::PixelFormat &pixel_format = image.GetPixelFormat();
    meta_data.bits_allocated = pixel_format.GetBitsAllocated();
    meta_data.bits_stored = pixel_format.GetBitsStored();
    meta_data.pixel_representation = pixel_format.GetPixelRepresentation();
    meta_data.photometricInterpretation = image.GetPhotometricInterpretation().GetString();

    const gdcm::DataSet &ds = reader->GetFile().GetDataSet();

    // Series UID Validation (Prevents mixed series reconstruction)
    gdcm::Tag seriesTag(0x0020, 0x000e);
    if (ds.FindDataElement(seriesTag)) {
        const gdcm::DataElement &de = ds.GetDataElement(seriesTag);
        if (!de.IsEmpty() && de.GetByteValue()) {
            std::string uid(de.GetByteValue()->GetPointer(), de.GetByteValue()->GetLength());
            // Trim potential trailing nulls or whitespace
            uid.erase(std::find_if(uid.rbegin(), uid.rend(), [](unsigned char ch) {
                return !std::isspace(ch) && ch != '\0';
            }).base(), uid.end());
            meta_data.seriesInstanceUID = uid;
        }
    }

    // extract the patient name using the designated tag (0010, 0010)
    // removes whhitespaces after the extracted string if it is an odd number of string
    // so checks backwards
    gdcm::Tag nameTag(0x0010, 0x0010);
    if (ds.FindDataElement(nameTag)) {
        const gdcm::DataElement &de = ds.GetDataElement(nameTag);
        if (!de.IsEmpty() && de.GetByteValue()) {
            std::string name(de.GetByteValue()->GetPointer(), de.GetByteValue()->GetLength());
            std::replace(name.begin(), name.end(), '^', ' ');
            name.erase(std::find_if(name.rbegin(), name.rend(), [](unsigned char ch) {
                return !std::isspace(ch) && ch != '\0';
            }).base(), name.end());

            if (!name.empty()) {
                meta_data.patientName = name;
            }
        }
    }
    // extracts the sex of the patient
    // same logic
    gdcm::Tag sexTag(0x0010, 0x0040);
    if (ds.FindDataElement(sexTag)) {
        const gdcm::DataElement &de = ds.GetDataElement(sexTag);
        if (!de.IsEmpty() && de.GetByteValue()) {
            std::string sex(de.GetByteValue()->GetPointer(), de.GetByteValue()->GetLength());
            sex.erase(std::find_if(sex.rbegin(), sex.rend(), [](unsigned char ch) {
                return !std::isspace(ch) && ch != '\0';
            }).base(), sex.end());
            
            if (!sex.empty()) {
                meta_data.patientSex = sex;
            }
        }
    }

    // Instance Number (0020, 0013) - Critical for matching web viewer order
    gdcm::Tag instanceTag(0x0020, 0x0013);
    if (ds.FindDataElement(instanceTag)) {
        const gdcm::DataElement &de = ds.GetDataElement(instanceTag);
        if (!de.IsEmpty() && de.GetByteValue()) {
            gdcm::Attribute<0x0020, 0x0013> at;
            at.SetFromDataElement(de);
            meta_data.instanceNumber = at.GetValue();
        }
    }

    // Rescale Slope/Intercept (0028, 1052/1053) - Vital for correct brightness
    gdcm::Tag interceptTag(0x0028, 0x1052);
    if (ds.FindDataElement(interceptTag)) {
        const gdcm::DataElement &de = ds.GetDataElement(interceptTag);
        if (!de.IsEmpty() && de.GetByteValue()) {
            gdcm::Attribute<0x0028, 0x1052> at;
            at.SetFromDataElement(de);
            meta_data.rescaleIntercept = at.GetValue();
        }
    }

    gdcm::Tag slopeTag(0x0028, 0x1053);
    if (ds.FindDataElement(slopeTag)) {
        const gdcm::DataElement &de = ds.GetDataElement(slopeTag);
        if (!de.IsEmpty() && de.GetByteValue()) {
            gdcm::Attribute<0x0028, 0x1053> at;
            at.SetFromDataElement(de);
            meta_data.rescaleSlope = at.GetValue();
        }
    }

    // Default Windowing (0028, 1050) and (0028, 1051)
    gdcm::Tag windowCenterTag(0x0028, 0x1050);
    if (ds.FindDataElement(windowCenterTag)) {
        const gdcm::DataElement &de = ds.GetDataElement(windowCenterTag);
        if (!de.IsEmpty() && de.GetByteValue()) {
            gdcm::Attribute<0x0028, 0x1050> at;
            at.SetFromDataElement(de);
            meta_data.windowCenter = at.GetValue();
        }
    }

    gdcm::Tag windowWidthTag(0x0028, 0x1051);
    if (ds.FindDataElement(windowWidthTag)) {
        const gdcm::DataElement &de = ds.GetDataElement(windowWidthTag);
        if (!de.IsEmpty() && de.GetByteValue()) {
            gdcm::Attribute<0x0028, 0x1051> at;
            at.SetFromDataElement(de);
            meta_data.windowWidth = at.GetValue();
        }
    }

    // Physical Spacing (Used for 3D sorting and Anisotropy Correction)
    const double* origin = image.GetOrigin();
    if (origin) {
        for (int i = 0; i < 3; ++i) meta_data.imagePosition[i] = origin[i];
    }

    const double* cosines = image.GetDirectionCosines();
    if (cosines) {
        for (int i = 0; i < 6; ++i) meta_data.imageOrientation[i] = cosines[i];
    }

    const double* spacing = image.GetSpacing();
    if (spacing) {
        meta_data.pixel_spacing_x = spacing[0];
        meta_data.pixel_spacing_y = spacing[1];
        // For 2D images, spacing[2] might be undefined; fallback to 1.0
        meta_data.pixel_spacing_z = (image.GetNumberOfDimensions() >= 3) ? spacing[2] : 1.0;
    }

    return (meta_data.width > 0 && meta_data.height > 0);
}

DicomMetaData DicomParser::getMetaData() const {
    if (!isInitialized) return DicomMetaData();
    return meta_data;
}

bool DicomParser::getFramePixels(int32_t frame_index, std::vector<uint8_t>& out_pixel_buffer) {
    if (!isInitialized || frame_index < 0 || frame_index >= meta_data.num_frames) return false;

    const gdcm::Image &image = reader->GetImage();
    unsigned long total_buffer_length = image.GetBufferLength();
    size_t single_frame_size_bytes = total_buffer_length / meta_data.num_frames;

    out_pixel_buffer.resize(single_frame_size_bytes);

    // If it's a standard single-frame file, read directly
    if (meta_data.num_frames == 1) {
        image.GetBuffer(reinterpret_cast<char*>(out_pixel_buffer.data()));
    } else {
        // For multi-frame, extract the specific segment
        std::vector<char> fullBuffer(total_buffer_length);
        image.GetBuffer(fullBuffer.data());
        std::copy(fullBuffer.begin() + (single_frame_size_bytes * frame_index),
                  fullBuffer.begin() + (single_frame_size_bytes * (frame_index + 1)),
                  out_pixel_buffer.begin());
    }
    return true;
}
