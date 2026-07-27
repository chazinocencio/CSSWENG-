import { ChevronLeft, ChevronRight, Menu, Pause, Play, Plus, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlphaType, Canvas, ColorType, Skia, Image as SkiaImage, SkImage, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import { DicomMetaData, VolumeJSI, createVolumeJSI } from '../../modules/native-dicom';

interface DICOMViewerProps {
    Content: any;
    ZIPContent: any;
    TargetFile: string;
    onClose: () => void;
    initialSeries?: string;
}

interface SkiaInfo {
    width: number;
    height: number;
    colorType: ColorType;
    alphaType: AlphaType;
}

export default function DICOMViewer({ Content, ZIPContent, TargetFile, onClose, initialSeries }: DICOMViewerProps) {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // UI States
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [scoutOpen, setScoutOpen] = useState(false);

    // Rendering States
    const [image, setImage] = useState<SkImage | null>(null);
    const [imageInfo, setImageInfo] = useState<SkiaInfo | null>(null);
    const [seriesName, setSeriesName] = useState<string | null>(null);
    const [seriesIndex, setSeriesIndex] = useState<number>(0);
    const [maxSeriesIndex, setMaxSeriesIndex] = useState<number>(0);
    const [frameIndex, setFrameIndex] = useState<number>(0);
    const [seriesPlaybackEnabled, setSeriesPlaybackEnabled] = useState<boolean>(false);

    const currentVolumeRef = useRef<{ uri: string; instance: VolumeJSI; mode: 'AXIAL' | 'SAGITTAL' | 'CORONAL' } | null>(null);

    const getSkiaImage = (metadata: DicomMetaData, frame_pixels: Uint8Array) => {
       try {
          let buffer = frame_pixels;
          if (metadata.bitsAllocated === 16) {
             const pixel_count = metadata.width * metadata.height;
             const canvas = new Uint8Array(pixel_count);
             const temp = new Int32Array(pixel_count);
             let min = Infinity;
             let max = -Infinity;
             for (let i = 0; i < pixel_count; i++) {
                let val = (frame_pixels[i * 2 + 1] << 8) | frame_pixels[i * 2];
                if (metadata.pixelRepresentation === 1 && (val & 0x8000)) val -= 65536;
                temp[i] = val;
                if (val > max) max = val;
                if (val < min) min = val;
             }

             const range = max - min || 1;
             for (let i = 0; i < pixel_count; i++) {
                canvas[i] = Math.floor(((temp[i] - min) / range) * 255);
             }
             buffer = canvas;
          }
          const skia_data = Skia.Data.fromBytes(buffer);
          const skia_info: SkiaInfo = { width: metadata.width, height: metadata.height, colorType: ColorType.Gray_8, alphaType: AlphaType.Opaque };
          return { info: { ...skia_info }, image: Skia.Image.MakeImage(skia_info, skia_data, metadata.width) };
       } catch (error: any) {
          return null;
       }
    };

    const dicomSkiaImage = useMemo(() => {
       if (!Content || !Content.frameData) return null;
       return getSkiaImage(Content, Content.frameData)?.image ?? null;
    }, [Content]);

    const LoadSeries = (series: string, dicom_index: number = 0, frame_index: number = 0, playback: boolean = false) => {
       if (!ZIPContent) return;
       try {
          const tree: Record<string, string[]> = ZIPContent.folders;
          const uri = `${ZIPContent.cache}${series !== '/' ? series + '/' : ''}`;
          let instance;
          if (currentVolumeRef.current && currentVolumeRef.current.uri === uri) {
             instance = currentVolumeRef.current.instance;
          } else {
             const paths = tree[series].map(name => `${uri}${name}`.replace(/^file:\/\//, ''));
             instance = createVolumeJSI(paths);
             if (!instance) throw new Error(`Unable to initiate MPR`);
             currentVolumeRef.current = { uri, instance, mode: 'AXIAL' };
          }
          const vmd = instance.getMetadata();
          const mode = currentVolumeRef.current.mode;
          let max_index = vmd.sliceCount;
          if (mode === 'CORONAL') max_index = vmd.height;
          if (mode === 'SAGITTAL') max_index = vmd.width;

          const index = Math.min(Math.max(0, dicom_index), max_index - 1);
          const orthoslice = instance.getOrthoSlice(mode, index);

          if (!orthoslice) return;
          const md: any = { width: orthoslice.width, height: orthoslice.height, bitsAllocated: vmd.bitsAllocated, pixelRepresentation: vmd.pixelRepresentation };
          const img = getSkiaImage(md, orthoslice.pixelData);

          setImageInfo(img?.info ?? null);
          setImage(img?.image ?? null);
          setSeriesName(series);
          setSeriesIndex(index + 1);
          setMaxSeriesIndex(max_index);
          setFrameIndex(1);
          setSeriesPlaybackEnabled(playback);
       } catch (error: any) {
          console.error(`Failed to load series: `, error.message);
       }
    };

    useEffect(() => {
       if (!ZIPContent && Content) {
          setImageInfo({ width: Content.width, height: Content.height, colorType: ColorType.Gray_8, alphaType: AlphaType.Opaque });
          setImage(dicomSkiaImage);
       } else if (ZIPContent) {
          const startingSeries = initialSeries || Object.keys(ZIPContent.folders)[0];
          LoadSeries(startingSeries, 0);
       }
    }, [Content, ZIPContent, initialSeries]);

    useEffect(() => {
       if (seriesName && seriesPlaybackEnabled) {
          const interval = setInterval(() => LoadSeries(
             seriesName, seriesIndex === maxSeriesIndex ? 0 : seriesIndex, frameIndex - 1, true
          ), 100);
          return () => clearInterval(interval);
       }
    }, [seriesPlaybackEnabled, image]);

    const RenderSkia = () => {
       const targetImage = image;
       const targetInfo = imageInfo;
       if (targetImage && targetInfo && targetInfo.width > 0) {
          const w = width; // Take full width now that sidebar is overlay
          const h = (targetInfo.height / targetInfo.width) * w;
          return (
             <Canvas style={{ width: w, height: h }}>
                <SkiaImage
                   image={targetImage}
                   fit="contain"
                   x={0} y={0}
                   width={w} height={h}
                />
             </Canvas>
          );
       }
       return <Text className="text-gray-500 mt-10">No image data to render.</Text>;
    };

    return (
       <View className="flex-1 bg-black relative">
          {/* SIDEBAR OVERLAY */}
          {sidebarOpen && (
             <View
                style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
                className="absolute left-0 top-0 bottom-0 w-[220px] bg-black/90 p-4 z-50 shadow-2xl"
             >
                <Text className="text-white font-bold text-lg mb-4">Settings</Text>

                {/* Series Selection */}
                {ZIPContent && (
                   <View className="mb-4">
                      <Text className="text-gray-400 mb-2 text-sm uppercase font-bold">Series</Text>
                      <ScrollView className="max-h-[200px] bg-gray-800/50 rounded-lg p-1">
                         {Object.keys(ZIPContent.folders).map((folder) => (
                            <TouchableOpacity
                               key={folder}
                               onPress={() => LoadSeries(folder, 0)}
                               className={`p-2 rounded-md mb-1 ${seriesName === folder ? 'bg-blue-600' : 'bg-transparent'}`}
                            >
                               <Text className="text-white text-xs font-semibold" numberOfLines={1}>{folder}</Text>
                            </TouchableOpacity>
                         ))}
                      </ScrollView>
                   </View>
                )}

                {currentVolumeRef.current && (
                   <View className="mb-4">
                      <Text className="text-gray-400 mb-2 text-sm">MPR Mode</Text>
                      {['AXIAL', 'CORONAL', 'SAGITTAL'].map((m: any) => (
                         <TouchableOpacity key={m} onPress={() => {
                            currentVolumeRef.current!.mode = m;
                            LoadSeries(seriesName!, seriesIndex - 1, frameIndex - 1, false);
                         }} className={`p-2 rounded-md mb-2 ${currentVolumeRef.current!.mode === m ? 'bg-orange-500' : 'bg-gray-800'}`}>
                            <Text className="text-white font-bold text-center">{m}</Text>
                         </TouchableOpacity>
                      ))}
                   </View>
                )}
                <TouchableOpacity className="bg-gray-800 p-2 rounded-md mb-2">
                   <Text className="text-white text-center text-xs">Zoom / Pan</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-gray-800 p-2 rounded-md mb-2">
                   <Text className="text-white text-center text-xs">Invert Colors</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} className="mt-auto bg-red-600 p-3 rounded-lg">
                   <Text className="text-white font-bold text-center">Close Viewer</Text>
                </TouchableOpacity>
             </View>
          )}

          {/* MAIN VIEWING AREA */}
          <View className="flex-1 justify-center items-center relative">
             {/* Top Left Sidebar Toggle */}
             <TouchableOpacity
                onPress={() => setSidebarOpen(!sidebarOpen)}
                style={{ top: insets.top + 10, left: sidebarOpen ? 170 : 16 }}
                className="absolute z-[60] bg-gray-800 p-2 rounded-full"
             >
                {sidebarOpen ? <X color="white" size={20} /> : <Menu color="white" />}
             </TouchableOpacity>

             {/* Top Right Scout Toggle */}
             <TouchableOpacity
                onPress={() => setScoutOpen(!scoutOpen)}
                style={{ top: insets.top + 10 }}
                className="absolute right-4 z-20 bg-gray-800 p-2 rounded-full"
             >
                {scoutOpen ? <X color="white" /> : <Plus color="white" />}
             </TouchableOpacity>

             {/* Scout Image Overlay */}
             {scoutOpen && (
                <View
                    style={{ top: insets.top + 60 }}
                    className="absolute right-4 w-32 h-32 bg-gray-900 border-2 border-orange-500 rounded-lg justify-center items-center z-20 shadow-lg"
                >
                   <Text className="text-gray-500 text-xs">Scout Image</Text>
                </View>
             )}

             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
                {RenderSkia()}
             </ScrollView>

             {/* Playback Controls */}
             {ZIPContent && seriesName && (
                <View className="absolute bottom-10 flex-row p-2 bg-gray-800/80 rounded-2xl items-center">
                   <Pressable className={`justify-center m-2 p-3 rounded-full ${seriesPlaybackEnabled ? 'bg-blue-500' : 'bg-orange-500'}`}
                      onPress={() => setSeriesPlaybackEnabled(!seriesPlaybackEnabled)}>
                      {seriesPlaybackEnabled ? <Pause color="white" size={24} /> : <Play color="white" size={24} />}
                   </Pressable>
                   <View className="flex-row gap-x-2 items-center px-4">
                      <Pressable className="p-1 active:bg-gray-600 rounded-full" onPress={() => LoadSeries(seriesName, seriesIndex === 1 ? maxSeriesIndex - 1 : seriesIndex - 2)}>
                         <ChevronLeft color="white" size={24} />
                      </Pressable>
                      <Text className="text-lg font-bold text-white">{seriesIndex} / {maxSeriesIndex}</Text>
                      <Pressable className="p-1 active:bg-gray-600 rounded-full" onPress={() => LoadSeries(seriesName, seriesIndex === maxSeriesIndex ? 0 : seriesIndex)}>
                         <ChevronRight color="white" size={24} />
                      </Pressable>
                   </View>
                </View>
             )}
          </View>
       </View>
    );
}