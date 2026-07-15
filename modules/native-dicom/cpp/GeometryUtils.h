#ifndef GEOMETRY_UTILS_H
#define GEOMETRY_UTILS_H

#include <cstdint>
#include <vector>

class GeometryUtils {
public:
    
    struct Point2D {
        uint32_t x;
        uint32_t y;
    };

    // Not in the spec, but added for Line3D
    struct Point3D {
        double x;
        double y;
        double z;

        Point3D(double x, double y, double z);

        void setX(double newX) {x = newX;};
        void setY(double newY) {y = newY;};
        void setZ(double newZ) {z = newZ;};
    };

    struct Vector3D {
        double x;
        double y;
        double z;

        Vector3D(double x, double y, double z);

        void setX(double newX) {x = newX;};
        void setY(double newY) {y = newY;};
        void setZ(double newZ) {z = newZ;};

    };
    // Helper functions related to Vector operations
    static Vector3D cross(Vector3D A, Vector3D B);
    static double dot(Vector3D A, Vector3D B);

    struct Plane {
    private:
        std::vector<std::vector<Point3D>> constructPlane(
            Vector3D origin, 
            Vector3D row, 
            Vector3D column, 
            int rowIndex, 
            int colIndex
        );
        Vector3D computeNormalVector(Vector3D row, Vector3D column);

        
    public:
        std::vector<std::vector<Point3D>> matrix;
        Vector3D normalVector;
        Vector3D origin;

        Plane(Vector3D origin, Vector3D row, Vector3D column, int rowIndex, int colIndex);
    };
    
    struct Line3D {
        Point3D point;
        Vector3D direction;

        Line3D(Point3D point, Vector3D direction);
    };
    static Line3D planeIntersection(Plane A, Plane B);
    static Point3D cramerRule(
        Vector3D intersectionDirection, 
        double dotA, 
        double dotB, 
        Vector3D normalA, 
        Vector3D normalB
    );

};

#endif