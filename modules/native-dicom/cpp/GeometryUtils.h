#ifndef GEOMETRY_UTILS_H
#define GEOMETRY_UTILS_H

#include <vector>
#include <cmath>
#include <string>

class VolumeBuffer; // Forward declaration

struct Vector3D {
    double x, y, z;
    Vector3D(double x = 0, double y = 0, double z = 0) : x(x), y(y), z(z) {}
    Vector3D operator+(const Vector3D& o) const { return {x + o.x, y + o.y, z + o.z}; }
    Vector3D operator-(const Vector3D& o) const { return {x - o.x, y - o.y, z - o.z}; }
    Vector3D operator*(double s) const { return {x * s, y * s, z * s}; }
    double dot(const Vector3D& o) const { return x * o.x + y * o.y + z * o.z; }
    Vector3D cross(const Vector3D& o) const { return {y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x}; }
    double magnitude() const { return std::sqrt(x * x + y * y + z * z); }
    Vector3D normalize() const { double m = magnitude(); return m > 0 ? (*this) * (1.0 / m) : *this; }
};

struct Point2D {
    double x, y;
};

struct Line3D {
    Vector3D point;
    Vector3D direction;
};

struct Plane {
    Vector3D origin;
    Vector3D rowVector;
    Vector3D colVector;
    Vector3D normal;
    Plane(Vector3D o, Vector3D r, Vector3D c) : origin(o), rowVector(r.normalize()), colVector(c.normalize()) {
        normal = rowVector.cross(colVector).normalize();
    }
};

class GeometryUtils {
public:
    static bool intersectPlanes(const Plane& p1, const Plane& p2, Line3D& outLine);
    enum class ViewType { AXIAL, CORONAL, SAGITTAL, UNKNOWN };

    /**
     * High-performance interpolation sampling for MPR views.
     */
    static bool sampleOrthoView(
        const VolumeBuffer& volume,
        ViewType targetView,
        int sliceIndex,
        std::vector<uint8_t>& outBuffer,
        int& outW,
        int& outH
    );
};

#endif
