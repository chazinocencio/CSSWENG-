#ifndef VOLUME_BUFFER_H
#define VOLUME_BUFFER_H

#include <vector>
#include <cstdint>
#include "DicomParser.h"

/**
 * VolumeBuffer manages a stack of DICOM frames in memory
 * to enable Multi-Planar Reconstruction (MPR).
 */
class VolumeBuffer {
public:
    VolumeBuffer() = default;
    ~VolumeBuffer() { volumeData.clear(); }

    void addFrame(std::vector<uint8_t>&& framePixels) {
        volumeData.push_back(std::move(framePixels));
    }

    void setMetadata(const DicomMetaData& meta) { metadata = meta; }
    const DicomMetaData& getMetadata() const { return metadata; }
    size_t getSliceCount() const { return volumeData.size(); }

    const uint8_t* getSlice(size_t index) const {
        if (index >= volumeData.size()) return nullptr;
        return volumeData[index].data();
    }

private:
    std::vector<std::vector<uint8_t>> volumeData;
    DicomMetaData metadata;
};

#endif
