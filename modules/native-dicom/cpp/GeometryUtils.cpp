#include "GeometryUtils.h"

#include <cmath>

// Constructor for Plane
GeometryUtils::Plane::Plane(Vector3D origin, Vector3D row, Vector3D column, int rowIndex, int colIndex)
    : matrix(constructPlane(origin, row, column, rowIndex, colIndex)), 
      normalVector(computeNormalVector(row, column)),
      origin(origin) {}

// Constructor for Point3D
GeometryUtils::Point3D::Point3D(double x, double y, double z)
    : x(x), y(y), z(z) {}

// Constructor for Vector3D
GeometryUtils::Vector3D::Vector3D(double x, double y, double z)
    : x(x), y(y), z(z) {}

// Constructor for Line3D
GeometryUtils::Line3D::Line3D(Point3D point, Vector3D direction)
    : point(point), direction(direction) {}
    
/** 
 * Cross Product
 * Computes for the cross product of two vectors. Used for normal vector computation
 * 
 * @param A The first vector used
 * @param B The second vector used
 * 
 * @return Vector3D - the cross product of the two vectors
 */
GeometryUtils::Vector3D
GeometryUtils::cross(Vector3D A, Vector3D B) {    
    double x = A.y * B.z - A.z * B.y;
    double y = A.z * B.x - A.x * B.z;
    double z = A.x * B.y - A.y * B.x;

    return Vector3D (x,y,z);
}

/**
 * Dot Product
 * Computes for the dot product of two vectors.
 * 
 * @param A The first vector used
 * @param B The second vector used
 * 
 * @return double - the dot product of the two vectors
 */
double GeometryUtils::dot(Vector3D A, Vector3D B) {
    return (A.x * B.x) + 
           (A.y * B.y) + 
           (A.z * B.z);
}


/**
 * Helper function for plane's constructor method
 * 
 * @param origin The origin vector used to compute the plane.
 * @param row The row vector used to compute the plane.
 * @param col The column vector used to compute the plane.
 * @param rowIndex The row index retrieved from the Dicom metadata, used for slicing.
 * @param colIndex The column index retrieved from the Dicom metadata, used for slicing.
 * 
 * @return - 2d vector of Point3D - to be stored in Plane struct
 */
std::vector<std::vector<GeometryUtils::Point3D>>
GeometryUtils::Plane::constructPlane(
    Vector3D origin, 
    Vector3D row, 
    Vector3D column, 
    int rowIndex, 
    int colIndex
) {
    std::vector<std::vector<Point3D>> plane;

    for (int i = 0; i < rowIndex; i++) {
        plane.push_back({}); // add a new row

        for (int j = 0; j < colIndex; j++) { 
            double x = origin.x + i*row.x + j*column.x;
            double y = origin.y + i*row.y + j*column.y;
            double z = origin.z + i*row.z + j*column.z;

            plane[i].push_back(Point3D (x,y,z)); // add a new point to the row
        }
    }

    return plane;
}


/** 
 * Computes the normal vector of the Plane.
 * Automatically performed in the constructor.
 * 
 * @param row The row vector used to compute the plane.
 * @param col The column vector used to compute the plane.
 * 
 * @return Vector3D - the computed normal vector
 */
GeometryUtils::Vector3D
GeometryUtils::Plane::computeNormalVector(Vector3D row, Vector3D col) {
    return cross(row, col);
}


/**
 * Plane Intersection
 * Finds the 3D line intersection of two planes.
 * NOTE: does not check if planes are parallel yet
 * 
 * @param A The first plane 
 * @param B The second plane 
 * 
 * @return Line3D - the line intersection of the two plane
 */
GeometryUtils::Line3D
GeometryUtils::planeIntersection(Plane A, Plane B) {
    // Get direction vector
    Vector3D direction = cross(A.normalVector, B.normalVector);

    // (NOT IMPLEMENTED) Check if planes are parallel

    // Find a common point on both plains
    // Using point = dot(normalVector, origin)
    double planeAConstant = dot(A.normalVector, A.origin);
    double planeBConstant = dot(B.normalVector, B.origin);

    // Use Cramer's Rule to 
    Point3D point = cramerRule(
        direction, 
        planeAConstant, planeBConstant, 
        A.normalVector, B.normalVector
    );

    return Line3D (point, direction);
}

/**
 * Cramer's Rule
 * Helper function for planeIntersection().
 * Based on the dot product (dotA, dotB) of the 
 * planes computed by a point (origin), and normal vector.
 * Solves a 2x2 matrix to find a point on the computed intersection line.
 * 
 * 
 * @param intersectionDirection The direction vector of the intersection line. Computed using cross(normalA, normalB)
 * @param dotA The location of plane A along its normal direction. Calculated using dot(normal, origin)
 * @param dotB The location of plane B along its normal direction. Calculated using dot(normal, origin)
 * @param normalA The normal vector of plane A
 * @param normalB The normal vector of plane B
 * 
 * @return Point3D - the point coordinates of the intersection line
 */
GeometryUtils::Point3D
GeometryUtils::cramerRule(
    Vector3D intersectionDirection, 
    double dotA, 
    double dotB, 
    Vector3D normalA, 
    Vector3D normalB
) {
    // Choose which coordinate axis to set to 0 (for solving intersection point coords)
    double absX = intersectionDirection.x;
    double absY = intersectionDirection.y;
    double absZ = intersectionDirection.z;

    double x, y, z;

    if (absZ >= absX && absZ >= absY) {
        // Set Z to 0, solve for X and Y using Cramer's Rule
        double matrixDet = normalA.x * normalB.y - 
                           normalA.y * normalB.x;
        
        x = (dotA * normalB.y - 
             dotB * normalA.y) / matrixDet;

        y = (dotB * normalA.x - 
             dotA * normalB.x) / matrixDet;
        z = (0);
    }

    else if (absY >= absX && absY >= absZ) {
        // Set Y to 0, solve for X and Z using Cramer's Rule
        double matrixDet = normalA.x * normalB.z - 
                           normalA.z * normalB.x;

        x = (dotA * normalB.z - 
             dotB * normalA.z) / matrixDet;
        y = 0;

        z = (dotB * normalA.x - 
             dotA * normalB.x) / matrixDet;
    }
    else if (absX >= absY && absX >= absZ) {
        // Set Z to 0, solve for X and Z using Cramer's Rule
        double matrixDet = normalA.y * normalB.z - 
                           normalA.z * normalB.y;

        x = 0;

        y = (dotA * normalB.z - 
             dotB * normalA.z) / matrixDet;

        z = (dotB * normalA.y - 
             dotA * normalB.y) / matrixDet;
    }

    return Point3D (x,y,z);
}

