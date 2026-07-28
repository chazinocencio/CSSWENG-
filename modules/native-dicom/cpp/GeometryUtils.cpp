#include "GeometryUtils.h"
#include "VolumeBuffer.h"
#include <algorithm>
#include <cstring>

/**
 * intersectPlanes: Core Scout View Logic
 * Calculates the 3D line where two non-parallel planes meet.
 * Formula: Line Direction = Normal1 cross Normal2
 */
bool GeometryUtils::intersectPlanes(const Plane& p1, const Plane& p2, Line3D& outLine) {
    Vector3D dir = p1.normal.cross(p2.normal);
    double det = dir.dot(dir);
    if (det < 1e-9) return false; // Planes are parallel

    outLine.direction = dir.normalize();

    // Find a point on the intersection line by solving the system of plane equations
    double d1 = -p1.normal.dot(p1.origin);
    double d2 = -p2.normal.dot(p2.origin);
    Vector3D term1 = p1.normal * d2;
    Vector3D term2 = p2.normal * d1;
    outLine.point = (term1 - term2).cross(dir) * (1.0 / det);

    return true;
}

/**
 * sampleOrthoView: Multi-Planar Reconstruction (MPR) Engine
 * Re-samples a stack of Axial slices from a different anatomical angle (Coronal/Sagittal).
 *
 * Features:
 * 1. Anisotropy Correction: Uses physical spacing (mm) instead of pixel counts.
 * 2. Z-Axis Linear Interpolation: Mathematically blends pixels between slices for smoothness.
 * 3. Flip Mapping: Ensures medical orientation (Head-at-top).
 */
bool GeometryUtils::sampleOrthoView(
    const VolumeBuffer& volume,
    ViewType targetView,
    int sliceIndex,
    double windowWidth,
    double windowCenter,
    std::vector<uint8_t>& outBuffer,
    int& outW,
    int& outH
) {
    const DicomMetaData& meta = volume.getMetadata();
    int W = meta.width, H = meta.height, S = (int)volume.getSliceCount();
    if (S == 0 || W == 0 || H == 0) return false;

    // Physical spacing in mm
    double spaceX = meta.pixel_spacing_x > 0 ? meta.pixel_spacing_x : 1.0;
    double spaceY = meta.pixel_spacing_y > 0 ? meta.pixel_spacing_y : 1.0;
    double spaceZ = meta.pixel_spacing_z > 0 ? meta.pixel_spacing_z : 1.0;

    double intercept = meta.rescaleIntercept;
    double slope = meta.rescaleSlope;

    // Windowing Mapping Prep
    double low = windowCenter - windowWidth / 2.0;
    double high = windowCenter + windowWidth / 2.0;
    double range = high - low;
    if (range < 1.0) range = 1.0;

    auto mapPixel = [&](int16_t raw) -> uint8_t {
        double hu = ((double)raw * slope) + intercept;

        double val = (hu - low) / range * 255.0;

        if (val < 0) return 0;
        if (val > 255) return 255;
        return (uint8_t)val;
    };

    // AXIAL: Natural order, direct copy with mapping
    if (targetView == ViewType::AXIAL) {
        if (sliceIndex < 0 || sliceIndex >= S) return false;
        const uint8_t* sliceData = volume.getSlice(sliceIndex);
        if (!sliceData) return false;
        outW = W; outH = H;
        outBuffer.resize(W * H);

        const int16_t* raw16 = reinterpret_cast<const int16_t*>(sliceData);
        for (int i = 0; i < W * H; ++i) {
            outBuffer[i] = mapPixel(raw16[i]);
        }
        return true;
    }

    // Total physical depth of the patient stack
    double physicalDepth = S * spaceZ;

    // CORONAL: Looking front-to-back
    if (targetView == ViewType::CORONAL) {
        outW = W;
        // Physical correction: Scale height based on depth vs vertical pixel size
        outH = static_cast<int>(std::round(physicalDepth / spaceY));
        if (sliceIndex < 0 || sliceIndex >= H) return false;

        outBuffer.resize(outW * outH);

        for (int y = 0; y < outH; ++y) {
            // Standard mapping: top of screen (y=0) maps to first slice (Head)
            double mappedZ = (double)y * (physicalDepth / outH) / spaceZ;
            int z0 = std::clamp(static_cast<int>(std::floor(mappedZ)), 0, S - 1);
            int z1 = std::clamp(z0 + 1, 0, S - 1);
            double zWeight = mappedZ - std::floor(mappedZ);

            const int16_t *s0 = reinterpret_cast<const int16_t*>(volume.getSlice(z0));
            const int16_t *s1 = reinterpret_cast<const int16_t*>(volume.getSlice(z1));

            for (int x = 0; x < W; ++x) {
                double raw = s0[sliceIndex * W + x] * (1.0 - zWeight) + s1[sliceIndex * W + x] * zWeight;
                outBuffer[y * W + x] = mapPixel((int16_t)raw);
            }
        }
        return true;
    }
    // SAGITTAL: Looking side-to-side
    else if (targetView == ViewType::SAGITTAL) {
        outW = H; // Cross-section of width is axial height
        outH = static_cast<int>(std::round(physicalDepth / spaceX));
        if (sliceIndex < 0 || sliceIndex >= W) return false;

        outBuffer.resize(outW * outH);

        for (int y = 0; y < outH; ++y) {
            // Direct mapping: top of screen (y=0) is top of volume
            double mappedZ = (double)y * (physicalDepth / outH) / spaceZ;
            int z0 = std::clamp(static_cast<int>(std::floor(mappedZ)), 0, S - 1);
            int z1 = std::clamp(z0 + 1, 0, S - 1);
            double zWeight = mappedZ - std::floor(mappedZ);

            const int16_t *s0 = reinterpret_cast<const int16_t*>(volume.getSlice(z0));
            const int16_t *s1 = reinterpret_cast<const int16_t*>(volume.getSlice(z1));

            for (int ax_y = 0; ax_y < H; ++ax_y) {
                // Sample vertical column across the Axial stack
                double raw = s0[ax_y * W + sliceIndex] * (1.0 - zWeight) + s1[ax_y * W + sliceIndex] * zWeight;
                outBuffer[y * outW + ax_y] = mapPixel((int16_t)raw);
            }
        }
        return true;
    }
    return false;
}

Plane GeometryUtils::getPlaneForView(const VolumeBuffer& volume, ViewType view, int index) {
    const DicomMetaData& meta = volume.getMetadata();
    Vector3D origin(meta.imagePosition[0], meta.imagePosition[1], meta.imagePosition[2]);
    Vector3D r(meta.imageOrientation[0], meta.imageOrientation[1], meta.imageOrientation[2]);
    Vector3D c(meta.imageOrientation[3], meta.imageOrientation[4], meta.imageOrientation[5]);
    Vector3D n = r.cross(c).normalize();

    double spaceX = meta.pixel_spacing_x;
    double spaceY = meta.pixel_spacing_y;
    double spaceZ = meta.pixel_spacing_z;

    if (view == ViewType::AXIAL) {
        // Plane moves along normal (Z).
        return Plane(origin - n * (index * spaceZ), r, c);
    } else if (view == ViewType::CORONAL) {
        // Plane moves along Column vector (Y)
        return Plane(origin - c * (index * spaceY), r, n);
    } else if (view == ViewType::SAGITTAL) {
        // Plane moves along Row vector (X)
        return Plane(origin - r * (index * spaceX), c, n);
    }
    return Plane(origin, r, c);
}

bool GeometryUtils::getScoutLine(
        const VolumeBuffer& volume,
        ViewType scoutView,
        int scoutIndex,
        ViewType targetView,
        int targetIndex,
        Point2D& p1, Point2D& p2
) {
    Plane refPlane = getPlaneForView(volume, scoutView, scoutIndex);
    Plane tgtPlane = getPlaneForView(volume, targetView, targetIndex);

    Line3D intersection;
    if (!intersectPlanes(refPlane, tgtPlane, intersection)) return false;

    const DicomMetaData& meta = volume.getMetadata();
    double sX = 1.0, sY = 1.0;

    // Determine pixel spacing for the scout view projection
    if (scoutView == ViewType::AXIAL) { sX = meta.pixel_spacing_x; sY = meta.pixel_spacing_y; }
    else if (scoutView == ViewType::CORONAL) { sX = meta.pixel_spacing_x; sY = meta.pixel_spacing_z; }
    else if (scoutView == ViewType::SAGITTAL) { sX = meta.pixel_spacing_y; sY = meta.pixel_spacing_z; }

    auto project = [&](const Vector3D& p) {
        Vector3D d = p - refPlane.origin;
        double x = d.dot(refPlane.rowVector) / sX;

        // Get the raw physical distance in mm
        double y_physical = d.dot(refPlane.colVector);

        double physicalDepth = volume.getSliceCount() * meta.pixel_spacing_z;
        double y_pixel = 0.0;

        // Correctly map the physical distance to the MPR generated pixel height
        if (scoutView == ViewType::CORONAL) {
            int outH = static_cast<int>(std::round(physicalDepth / meta.pixel_spacing_y));
            y_pixel = (y_physical / physicalDepth) * outH;
        }
        else if (scoutView == ViewType::SAGITTAL) {
            int outH = static_cast<int>(std::round(physicalDepth / meta.pixel_spacing_x));
            y_pixel = (y_physical / physicalDepth) * outH;
        }
        else {
            y_pixel = y_physical / sY;
        }

        // Target planes move along -n direction (DOWN), so y_physical is negative.
        // Inverting it gives us a positive Y pixel coordinate moving down the screen.
        return Point2D{ x, -y_pixel };
    };

    // Calculate two points on the line within reasonable bounds
    p1 = project(intersection.point - intersection.direction * 1000.0);
    p2 = project(intersection.point + intersection.direction * 1000.0);

    return true;
}
