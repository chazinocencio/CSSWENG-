#import <Foundation/Foundation.h>

@interface NativeDicomBridge : NSObject
- (NSString *)createParser:(NSString *)path;
- (NSDictionary *)getMetaData:(NSString *)instanceId;
- (NSData *)getFramePixels:(NSString *)instanceId frameIndex:(int)frameIndex;
- (void)releaseParser:(NSString *)instanceId;
@end
