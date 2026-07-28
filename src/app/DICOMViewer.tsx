import { ChevronLeft, ChevronRight, Menu, Pause, Play, Plus, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlphaType, Canvas, ColorType, Line, Skia, Image as SkiaImage, SkImage } from '@shopify/react-native-skia';
import { createVolumeJSI, DicomMetaData, VolumeJSI } from '../../modules/native-dicom';
import ZoomableDicomCanvas from '../components/ZoomableDicomCanvas';

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
    const [isLoadingSeries, setIsLoadingSeries] = useState<boolean>(false);

    // Contrast Limits & State
    const MIN_WW = 1;
    const MAX_WW = 3000;
    const MIN_WL = -1500;
    const MAX_WL = 1500;

    const [windowWidth, setWindowWidth] = useState(400);
    const [windowCenter, setWindowCenter] = useState(50);
    const [trackWidth, setTrackWidth] = useState(100);

    // Patient Name and sex
    const [patientName, setPatientName] = useState("");
    const [patientSex, setPatientSex] = useState("");

    // Scout Rendering States
    const [scoutImage, setScoutImage] = useState<SkImage | null>(null);
    const [scoutLine, setScoutLine] = useState<{ p1: { x: number, y: number }, p2: { x: number, y: number } } | null>(null);

    const currentVolumeRef = useRef<{ uri: string; instance: VolumeJSI; mode: 'AXIAL' | 'SAGITTAL' | 'CORONAL' } | null>(null);

    const getSkiaImage = (metadata: any, frame_pixels: Uint8Array) => {
       try {
          let buffer = frame_pixels;
          const pixelCount = metadata.width * metadata.height;

          // If the buffer size is exactly width * height, it's already 8-bit from C++
          // If it's width * height * 2, it's raw 16-bit data that needs mapping
          if (frame_pixels.length === pixelCount * 2) {
             const canvas = new Uint8Array(pixelCount);
             const temp = new Int32Array(pixelCount);
             let min = Infinity; let max = -Infinity;

             const intercept = metadata.rescaleIntercept ?? metadata.rescale_intercept ?? 0;
             const slope = metadata.rescaleSlope ?? metadata.rescale_slope ?? 1;

             for (let i = 0; i < pixelCount; i++) {
                let val = (frame_pixels[i * 2 + 1] << 8) | frame_pixels[i * 2];
                if (metadata.pixelRepresentation === 1 && (val & 0x8000)) val -= 65536;

                val = (val * slope) + intercept;

                temp[i] = val;
                if (val > max) max = val; if (val < min) min = val;
             }

             const low = windowCenter - windowWidth / 2;
             const high = windowCenter + windowWidth / 2;

             for (let i = 0; i < pixelCount; i++) {
                const pixel = temp[i];
                const val = Math.max(0, Math.min(255, ((pixel - low) / (high - low)) * 255));
                canvas[i] = Math.floor(val);
             }
             buffer = canvas;
          }

          const skia_data = Skia.Data.fromBytes(buffer);
          const skia_info: SkiaInfo = {
             width: metadata.width,
             height: metadata.height,
             colorType: ColorType.Gray_8,
             alphaType: AlphaType.Opaque
          };
          return {
             info: { ...skia_info },
             image: Skia.Image.MakeImage(skia_info, skia_data, metadata.width)
          };
       } catch (error: any) {
          return null;
       }
    };

    const dicomSkiaImage = useMemo(() => {
       if (!Content || !Content.frameData) return null;
       return getSkiaImage(Content, Content.frameData)?.image ?? null;
    }, [Content]);

    const LoadSeries = (series: string, dicom_index: number = 0, frame_index: number = 0, playback: boolean = false) => {
       if (!ZIPContent || isLoadingSeries) return;
       try {
          const tree: Record<string, string[]> = ZIPContent.folders;
          const uri = `${ZIPContent.cache}${series !== '/' ? series + '/' : ''}`;

          let instance;
          if (currentVolumeRef.current && currentVolumeRef.current.uri === uri) {
             instance = currentVolumeRef.current.instance;
          } else {
             setIsLoadingSeries(true);
             const paths = tree[series].map(name => `${uri}${name}`.replace(/^file:\/\//, ''));
             instance = createVolumeJSI(paths);
             if (!instance) {
                setIsLoadingSeries(false);
                throw new Error(`Unable to initiate MPR for series: ${series}`);
             }
             currentVolumeRef.current = { uri, instance, mode: 'AXIAL' };
             setIsLoadingSeries(false);
          }

          const vmd = instance.getMetadata();
          const mode = currentVolumeRef.current.mode;
          let max_index = vmd.sliceCount;
          if (mode === 'CORONAL') max_index = vmd.height;
          if (mode === 'SAGITTAL') max_index = vmd.width;

          const index = Math.min(Math.max(0, dicom_index), max_index - 1);
          const orthoslice = instance.getOrthoSlice(mode, index, windowWidth, windowCenter);

          if (!orthoslice) return;
          const md: any = {
             width: orthoslice.width,
             height: orthoslice.height,
             bitsAllocated: vmd.bitsAllocated,
             pixelRepresentation: vmd.pixelRepresentation,
             rescaleIntercept: vmd.rescaleIntercept,
             rescaleSlope: vmd.rescaleSlope
          };
          const img = getSkiaImage(md, orthoslice.pixelData);

          setPatientName(vmd.patientName);
          setPatientSex(vmd.patientSex);
          setImageInfo(img?.info ?? null);
          setImage(img?.image ?? null);
          setSeriesName(series);
          setSeriesIndex(index + 1);
          setMaxSeriesIndex(max_index);
          setFrameIndex(1);
          setSeriesPlaybackEnabled(playback);

          if (vmd.windowWidth && vmd.windowCenter && currentVolumeRef.current?.uri !== uri) {
             setWindowWidth(vmd.windowWidth);
             setWindowCenter(vmd.windowCenter);
          }

          if (instance.getScoutLine) {
             const scoutMode: 'AXIAL' | 'CORONAL' | 'SAGITTAL' = mode === 'SAGITTAL' ? 'AXIAL' : 'SAGITTAL';
             let scoutMaxIndex = vmd.sliceCount;
             if (scoutMode === 'SAGITTAL') scoutMaxIndex = vmd.width;
             const scoutIdx = Math.floor(scoutMaxIndex / 2);

             const scoutResult = instance.getOrthoSlice(scoutMode, scoutIdx, windowWidth, windowCenter);
             if (scoutResult) {
                const sImg = getSkiaImage({
                   width: scoutResult.width,
                   height: scoutResult.height,
                   bitsAllocated: vmd.bitsAllocated,
                   pixelRepresentation: vmd.pixelRepresentation,
                   rescaleIntercept: vmd.rescaleIntercept,
                   rescaleSlope: vmd.rescaleSlope
                } as any, scoutResult.pixelData);
                setScoutImage(sImg?.image ?? null);

                const line = instance.getScoutLine(scoutMode, scoutIdx, mode, index);
                setScoutLine(line);
             }
          }
       } catch (error: any) {
          console.error(`Failed to load series: `, error.message);
       }
    };

    const handleWWScrub = (evt: any) => {
        const x = Math.max(0, Math.min(trackWidth, evt.nativeEvent.locationX));
        const percentage = x / trackWidth;
        setWindowWidth(MIN_WW + percentage * (MAX_WW - MIN_WW));
    };

    const handleWLScrub = (evt: any) => {
        const x = Math.max(0, Math.min(trackWidth, evt.nativeEvent.locationX));
        const percentage = x / trackWidth;
        setWindowCenter(MIN_WL + percentage * (MAX_WL - MIN_WL));
    };

    const handleScoutTouch = (evt: any) => {
        if (!scoutImage || !currentVolumeRef.current || !seriesName || maxSeriesIndex <= 1) return;
        const touchY = evt.nativeEvent.locationY;
        const scoutWidth = 140;
        const scoutUIHeight = scoutWidth / (scoutImage.width() / scoutImage.height());
        const relativeY = Math.max(0, Math.min(1, touchY / scoutUIHeight));
        const newIndex = Math.floor(relativeY * (maxSeriesIndex - 1));

        if (newIndex !== seriesIndex - 1) {
            LoadSeries(seriesName, newIndex, 0, false);
        }
    };

    useEffect(() => {
       if (!ZIPContent && Content) {
          setImageInfo({ width: Content.width, height: Content.height, colorType: ColorType.Gray_8, alphaType: AlphaType.Opaque });
          setImage(dicomSkiaImage);

          setPatientName(Content.patientName);
          setPatientSex(Content.patientSex);
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

    useEffect(() => {
       if (seriesName) LoadSeries(seriesName, seriesIndex - 1, frameIndex - 1, false);
    }, [windowWidth, windowCenter]);

    const RenderSkia = () => {
       const targetImage = image;
       const targetInfo = imageInfo;
       if (targetImage && targetInfo && targetInfo.width > 0) {
          return (
             <ZoomableDicomCanvas
                image={targetImage}
                imageWidth={targetInfo.width}
                imageHeight={targetInfo.height}
                containerWidth={width}
             />
          );
       }
       return <Text className="text-gray-500 mt-10">No image data to render.</Text>;
    };

    const scoutWidth = 140;
    const scoutUIHeight = scoutImage ? scoutWidth / (scoutImage.width() / scoutImage.height()) : 140;

    return (
       <View className="flex-1 bg-black relative">
          {/* SIDEBAR OVERLAY */}
          {sidebarOpen && (
             <View
                style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
                className="absolute left-0 top-0 bottom-0 w-[240px] bg-black/90 p-4 z-50 shadow-2xl"
             >
                <Text className="text-white font-bold text-lg mb-4">Settings</Text>

                <View className="mb-6">
                   <Text className="text-gray-400 mb-2 text-xs uppercase font-bold">Contrast & Brightness</Text>

                   <View className="mb-4">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-white text-[10px]">WIDTH: {Math.round(windowWidth)}</Text>
                      </View>
                      <View className="flex-row items-center">
                         <TouchableOpacity onPress={() => setWindowWidth(prev => Math.max(MIN_WW, prev - 50))} className="bg-gray-700 p-2 rounded-l-md px-3 border-r border-gray-600"><Text className="text-white font-bold">-</Text></TouchableOpacity>

                         <View
                            className="flex-1 bg-gray-800 h-9 justify-center px-2"
                            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width - 16)}
                            onStartShouldSetResponder={() => true}
                            onResponderGrant={handleWWScrub}
                            onResponderMove={handleWWScrub}
                         >
                            <View className="bg-gray-600 h-1 rounded-full relative" pointerEvents="none">
                                <View
                                    style={{ left: `${Math.min(100, Math.max(0, ((windowWidth - MIN_WW) / (MAX_WW - MIN_WW)) * 100))}%` }}
                                    className="absolute -top-1.5 w-4 h-4 -ml-2 bg-blue-500 rounded-full border-2 border-white"
                                />
                            </View>
                         </View>

                         <TouchableOpacity onPress={() => setWindowWidth(prev => Math.min(MAX_WW, prev + 50))} className="bg-gray-700 p-2 rounded-r-md px-3 border-l border-gray-600"><Text className="text-white font-bold">+</Text></TouchableOpacity>
                      </View>
                   </View>

                   <View className="mb-4">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-white text-[10px]">LEVEL: {Math.round(windowCenter)}</Text>
                      </View>
                      <View className="flex-row items-center">
                         <TouchableOpacity onPress={() => setWindowCenter(prev => Math.max(MIN_WL, prev - 20))} className="bg-gray-700 p-2 rounded-l-md px-3 border-r border-gray-600"><Text className="text-white font-bold">-</Text></TouchableOpacity>

                         <View
                            className="flex-1 bg-gray-800 h-9 justify-center px-2"
                            onStartShouldSetResponder={() => true}
                            onResponderGrant={handleWLScrub}
                            onResponderMove={handleWLScrub}
                         >
                            <View className="bg-gray-600 h-1 rounded-full relative" pointerEvents="none">
                                <View
                                    style={{ left: `${Math.min(100, Math.max(0, ((windowCenter - MIN_WL) / (MAX_WL - MIN_WL)) * 100))}%` }}
                                    className="absolute -top-1.5 w-4 h-4 -ml-2 bg-orange-500 rounded-full border-2 border-white"
                                />
                            </View>
                         </View>

                         <TouchableOpacity onPress={() => setWindowCenter(prev => Math.min(MAX_WL, prev + 20))} className="bg-gray-700 p-2 rounded-r-md px-3 border-l border-gray-600"><Text className="text-white font-bold">+</Text></TouchableOpacity>
                      </View>
                   </View>

                   <View className="flex-row flex-wrap gap-2">
                      <TouchableOpacity onPress={() => { setWindowWidth(400); setWindowCenter(50); }} className="bg-blue-600/30 px-2 py-1 rounded-md border border-blue-500/50">
                         <Text className="text-blue-400 text-[10px] font-bold">ORGANS</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setWindowWidth(1500); setWindowCenter(450); }} className="bg-orange-600/30 px-2 py-1 rounded-md border border-orange-500/50">
                         <Text className="text-orange-400 text-[10px] font-bold">BONE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setWindowWidth(1500); setWindowCenter(-600); }} className="bg-green-600/30 px-2 py-1 rounded-md border border-green-500/50">
                         <Text className="text-green-400 text-[10px] font-bold">LUNGS</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setWindowWidth(80); setWindowCenter(40); }} className="bg-purple-600/30 px-2 py-1 rounded-md border border-purple-500/50">
                         <Text className="text-purple-400 text-[10px] font-bold">BRAIN</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setWindowWidth(600); setWindowCenter(300); }} className="bg-red-600/30 px-2 py-1 rounded-md border border-red-500/50">
                         <Text className="text-red-400 text-[10px] font-bold">ANGIO</Text>
                      </TouchableOpacity>
                   </View>
                </View>

                {ZIPContent && (
                   <View className="mb-4 flex-1">
                      <Text className="text-gray-400 mb-2 text-sm uppercase font-bold">Series</Text>
                      <ScrollView className="bg-gray-800/50 rounded-lg p-1">
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

                <TouchableOpacity onPress={onClose} className="mt-auto bg-red-600 p-3 rounded-lg">
                   <Text className="text-white font-bold text-center">Close Viewer</Text>
                </TouchableOpacity>
             </View>
          )}

          {/* MAIN VIEWING AREA */}
          <View className="flex-1 justify-center items-center relative">
             {patientName && patientSex && (
                  <View
                     pointerEvents="none"
                     style={{ top: insets.top + 12 }}
                     className="absolute z-30 bg-black/60 px-4 py-1.5 rounded-full border border-gray-800/80 items-center"
                  >
                     <Text className="text-white text-md font-semibold tracking-wide">
                        {patientName} <Text className="text-gray-400">({patientSex})</Text>
                     </Text>
                  </View>
               )}

             <TouchableOpacity
                onPress={() => setSidebarOpen(!sidebarOpen)}
                style={{ top: insets.top + 10, left: sidebarOpen ? 190 : 16 }}
                className="absolute z-[60] bg-gray-800 p-2 rounded-full"
             >
                {sidebarOpen ? <X color="white" size={20} /> : <Menu color="white" />}
             </TouchableOpacity>

             <TouchableOpacity
                onPress={() => setScoutOpen(!scoutOpen)}
                style={{ top: insets.top + 10 }}
                className="absolute right-4 z-20 bg-gray-800 p-2 rounded-full"
             >
                {scoutOpen ? <X color="white" /> : <Plus color="white" />}
             </TouchableOpacity>

             {scoutOpen && scoutImage && (
                <View
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={handleScoutTouch}
                    onResponderMove={handleScoutTouch}
                    style={{
                        top: insets.top + 60,
                        width: scoutWidth,
                        height: scoutUIHeight,
                        aspectRatio: scoutImage.width() / scoutImage.height()
                    }}
                    className="absolute right-4 bg-black border-2 border-orange-500 rounded-lg overflow-hidden z-20 shadow-lg"
                >
                   <Canvas pointerEvents="none" style={{ width: '100%', height: '100%' }}>
                      <SkiaImage image={scoutImage} fit="fill" x={0} y={0} width={scoutWidth} height={scoutUIHeight} />
                      {scoutLine && (
                        <Line
                            p1={{
                                x: (scoutLine.p1.x / scoutImage.width()) * scoutWidth,
                                y: (scoutLine.p1.y / scoutImage.height()) * scoutUIHeight
                            }}
                            p2={{
                                x: (scoutLine.p2.x / scoutImage.width()) * scoutWidth,
                                y: (scoutLine.p2.y / scoutImage.height()) * scoutUIHeight
                            }}
                            color="orange" strokeWidth={2}
                        />
                      )}
                   </Canvas>
                </View>
             )}

             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
                {RenderSkia()}
             </ScrollView>

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