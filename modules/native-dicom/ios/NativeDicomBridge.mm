#import "NativeDicomBridge.h"
#include "DicomParser.h"
#include <map>
#include <string>
#include <memory>

static std::map<std::string, std::unique_ptr<DicomParser>> g_parsers;
static int g_next_id = 1;

@implementation NativeDicomBridge

- (NSString *)createParser:(NSString *)path {
    std::string pathStr = [path UTF8String];
    auto parser = std::make_unique<DicomParser>(pathStr);
    if (!parser->initialize()) {
        return nil;
    }

    std::string idStr = std::to_string(g_next_id++);
    g_parsers[idStr] = std::move(parser);
    return [NSString stringWithUTF8String:idStr.c_str()];
}

- (NSDictionary *)getMetaData:(NSString *)instanceId {
    std::string idStr = [instanceId UTF8String];
    auto it = g_parsers.find(idStr);
    if (it == g_parsers.end()) return nil;

    DicomMetaData meta = it->second->getMetaData();
    return @{
        @"width": @(meta.width),
        @"height": @(meta.height),
        @"numFrames": @(meta.num_frames),
        @"bitsAllocated": @(meta.bits_allocated),
        @"bitsStored": @(meta.bits_stored),
        @"pixelRepresentation": @(meta.pixel_representation),
        @"photometricInterpretation": [NSString stringWithUTF8String:meta.photometricInterpretation.c_str()]
    };
}

- (NSData *)getFramePixels:(NSString *)instanceId frameIndex:(int)frameIndex {
    std::string idStr = [instanceId UTF8String];
    auto it = g_parsers.find(idStr);
    if (it == g_parsers.end()) return nil;

    std::vector<uint8_t> pixels;
    if (!it->second->getFramePixels(frameIndex, pixels)) return nil;

    return [NSData dataWithBytes:pixels.data() length:pixels.size()];
}

- (void)releaseParser:(NSString *)instanceId {
    std::string idStr = [instanceId UTF8String];
    g_parsers.erase(idStr);
}

@end
