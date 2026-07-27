import { ChevronDown, ChevronLeft, ChevronRight, File, Folder, Pause, Play } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Modal, NativeScrollEvent, NativeSyntheticEvent,
	Pressable,
	ScrollView, SectionList,
	Text, TouchableOpacity, useWindowDimensions, View
} from 'react-native';

/* skia stuff */
import { AlphaType, Canvas, ColorType, Skia, Image as SkiaImage, SkImage } from '@shopify/react-native-skia';
import { createVolumeJSI, DicomMetaData, DicomParserJSI, VolumeJSI } from '../../modules/native-dicom';

interface DICOMContentModalProps {
	Visibility: boolean;
	Content: any;
	ZIPContent: any;
	TargetFile: string;
	ModalClosed: () => void;
	ModalShown: () => void;
};

interface SkiaInfo {
	width: number;
	height: number;
	colorType: ColorType;
	alphaType: AlphaType;
};

export default function DICOMContentModal({
	Visibility, Content, ZIPContent, TargetFile,
	ModalClosed, ModalShown
}:　DICOMContentModalProps) {
	const { width } = useWindowDimensions();
	const [pageIndex, setPageIndex] = useState<number>(0);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set<string>());
	const [image, setImage] = useState<SkImage | null>(null);
	const [imageInfo, setImageInfo] = useState<SkiaInfo | null>(null);
	const [seriesName, setSeriesName] = useState<string | null>(null);
	const [seriesIndex, setSeriesIndex] = useState<number>(0);
	const [maxSeriesIndex, setMaxSeriesIndex] = useState<number>(0);
	const [frameIndex, setFrameIndex] = useState<number>(0);
	const [maxFrameIndex, setMaxFrameIndex] = useState<number>(0);
	const [seriesPlaybackEnabled, setSeriesPlaybackEnabled] = useState<boolean>(false);
	const page_ref = useRef<ScrollView>(null);
	// (deprecated, now using currentVolumeRef)
	// ito yun para di na paulit ulit yung parser instance at irereference na lng	
	const currentParserRef = useRef<{ uri: string; instance: DicomParserJSI } | null>(null);
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
					//const low = frame_pixels[i * 2];
					//const high = frame_pixels[i * 2 + 1];
					//let val = (high << 8) | low;
					let val = (frame_pixels[i * 2 + 1] << 8) | frame_pixels[i * 2]; 
					if (metadata.pixelRepresentation === 1 && (val & 0x8000))
						val -= 65536;
					temp[i] = val;
					if (val > max) max = val;
					if (val < min) min = val;
				}
				const range = max - min || 1;
				for (let i = 0; i < pixel_count; i++)
					canvas[i] = Math.floor(((temp[i] - min) / range) * 255);
				buffer = canvas;
			}
			const skia_data = Skia.Data.fromBytes(buffer);
			const skia_info: SkiaInfo = {
				width: metadata.width,
				height: metadata.height,
				colorType: ColorType.Gray_8,
				alphaType: AlphaType.Opaque,
			};
			return {
				info: { ...skia_info },
				image: Skia.Image.MakeImage(skia_info, skia_data, metadata.width),
			};
		} catch (error: any) {
			console.error('Error rendering through Skia: ', error.message);
			return null;
		}
	};
	/* Convert raw Uint8Array bytes to a Skia Image */
	const dicomSkiaImage = useMemo(() => {
		if (!Content || !Content.frameData) return null;
		return getSkiaImage(Content, Content.frameData)?.image ?? null;
	}, [Content]);
	const renderDicomImage = () => {
		if (dicomSkiaImage) {
			/* Calculate responsive target dimensions while preserving the true aspect ratio */
			const displayWidth = width - 48; /* Gives clean margins on both sides of the screen */
			const displayHeight = (Content.height / Content.width) * displayWidth;

			return (
				<Canvas style={{ width: displayWidth, height: displayHeight }}>
					<SkiaImage
						image={dicomSkiaImage}
						fit="contain"
						x={0}
						y={0}
						width={displayWidth}
						height={displayHeight}
					/>
				</Canvas>
			);
		} else {
			return <Text className="text-gray-500 mt-10">Failed to render raw pixels.</Text>;
		}
	};
	const ToggleFolder = (title: string) => {
		setExpandedFolders(prev => {
			const next = new Set(prev);
			if (prev.has(title)) next.delete(title); else next.add(title);
			return next;
		});
	};
	const MetadataOrZIPContents = useMemo(() => {
		if (!Content && !ZIPContent)
			return null;
		else if (!ZIPContent) {
			return (
				<ScrollView showsVerticalScrollIndicator={false}>
					{Object.entries(Content).map(([k, v]) => {
						/* skip render of frame data para di iload as string */
						if (k === 'frameData') return null;

						/* render metadata */
						return (
							<View key={k} className="mb-3">
								<Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{k}</Text>
								<Text className="text-lg text-gray-800">{String(v)}</Text>
							</View>
						);
					})}
				</ScrollView>	
			);
		} else {
			const sections = Object.entries(ZIPContent.folders).map(
				([folder, contents]) => ({
					title: folder,
					data: expandedFolders.has(folder) ? contents as string[] : []
				})
			);
			return (
				<SectionList
					showsVerticalScrollIndicator={false}
					sections={sections}
					keyExtractor={(item, index) => item + index}
					initialNumToRender={30}
					renderSectionHeader={({ section: { title } }) => (
						<View className="flex-row gap-x-2 items-center">
							<Pressable className="p-2 active:bg-yellow-500" onPress={() => ToggleFolder(title)}>
								{!expandedFolders.has(title)
									? <ChevronRight color="#354c70" size={16} />
									: <ChevronDown color="#354c70" size={16} />}
							</Pressable>
							<Folder color="#354c70" size={16} />
							<Text className="text-lg font-semibold text-[#f77707] underline active:text-blue-400 active:bg-gray-100
								active:opacity-60" onPress={() => LoadSeries(title, 0)}>{title}</Text>
						</View>
					)}
					renderItem={({ item, index, section }) => (
						<View className="ml-4 border-l-2 border-black pl-2">
							<View className="flex-row gap-x-2 items-center pl-1 py-2">
								<File color="#64748b" size={16} />
								<Text className="font-medium text-[#1000ff] underline active:text-blue-400 active:bg-gray-100
									active:opacity-60" onPress={() => LoadSeries(section.title, index)}>{item}</Text>
							</View>
						</View>
					)}
					ListFooterComponent={<View className="h-8" />}
				/>
			);
		}
	}, [Content, ZIPContent, expandedFolders]);
	const EstimateIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		setPageIndex(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width));
	};
	const SwitchTab = (index: number) => {
		page_ref.current?.scrollTo({ x: index * width, animated: false });
		setPageIndex(index);
	};
	const CloseButtonPressed = () => {
		SwitchTab(0);
		setExpandedFolders(new Set<string>());
		setImage(null);
		setImageInfo(null);
		setSeriesPlaybackEnabled(false);
		currentParserRef.current = null; // Clear reference to allow Garbage collection or (GC)
		currentVolumeRef.current = null;
		ModalClosed();
	};
	const LoadSeries = (series: string, dicom_index: number = 0, frame_index: number = 0, playback: boolean = false) => {
		/*
		function getDICOMInstance(uri: string) {
			try {
				const clean_uri = uri.replace(/^file:\/\//, '');
				const parser = createParserJSI(clean_uri);
				if (!parser)
					throw new Error(`Failed to parse DICOM from ${uri}.`);
				return parser;
			} catch (error: any) {
				console.error(Error(error).stack);
			}
		}
		*/
		function getDICOMVolume(tree: Record<string, string[]>, uri: string) {
			try {
				const paths = tree[series].map(name =>
					`${uri}${name}`.replace(/^file:\/\//, ''));
				const volume = createVolumeJSI(paths);
				if (!volume)
					throw new Error(`Unable to obtain MPR volume from ${uri}.`);
				return volume;
			} catch (error: any) {
				console.error(Error(error).stack);
			}
		}
		try {
			const tree: Record<string, string[]> = ZIPContent.folders;
			const uri = `${ZIPContent.cache}${series !== '/' ? series + '/' : ''}`;
			let instance;
			if (currentVolumeRef.current && currentVolumeRef.current.uri === uri) {
				instance = currentVolumeRef.current.instance;
			} else {
				instance = getDICOMVolume(tree, uri);
				if (!instance) throw new Error(`Unable to initiate MPR for ${uri}.`);
				currentVolumeRef.current = { uri, instance, mode: 'AXIAL' };
			}
			const vmd = instance.getMetadata();
			const mode = currentVolumeRef.current.mode;
			let max_index = vmd.sliceCount;			
			if (mode === 'CORONAL')
				max_index = vmd.height;
			if (mode === 'SAGITTAL')
				max_index = vmd.width;
			const index = Math.min(Math.max(0, dicom_index), max_index - 1);			
			const orthoslice = instance.getOrthoSlice(mode, index);
			if (!orthoslice)
				throw new Error(`Unable to obtain orthoslice for ${uri}.`);
			const md: any = {
				width: orthoslice.width,
				height: orthoslice.height,
				bitsAllocated: vmd.bitsAllocated,
				pixelRepresentation: vmd.pixelRepresentation,
			};
			const image = getSkiaImage(md, orthoslice.pixelData);
			setImageInfo(image?.info ?? null);
			setImage(image?.image ?? null);
			setSeriesName(series);
			setSeriesIndex(index + 1);
			setMaxSeriesIndex(max_index);
			// Basically frameIndex and maxFrameIndex are now useless,
			// but I won't remove it yet for potential future implementations
			// -laguerts
			setFrameIndex(1);
			setMaxFrameIndex(1);
			setSeriesPlaybackEnabled(playback);
			SwitchTab(1);
			/*
			//
			// Deprecated. Code block replaced with VolumeJSI.
			//
			// Check if we already have a parser opened for this specific file
			if (currentParserRef.current && currentParserRef.current.uri === uri) {
				instance = currentParserRef.current.instance;
			} else {
				// Only create a new parser if the file actually changed
				instance = getDICOMInstance(uri);
				if (!instance) throw new Error(`Unable to initiate DICOM parser for ${uri}.`);
				currentParserRef.current = { uri, instance };
			}
			const metadata = instance.getMetaData();
			const frame_pixels = instance.getFramePixels(frame_index >= metadata.numFrames
				? metadata.numFrames - 1
				: frame_index
			);
			//console.log(metadata);
			//console.log(frame_pixels);
			if (!frame_pixels)
				throw new Error(`Unable to obtain frames from parser for ${uri}.`);
			const image = getSkiaImage(metadata, frame_pixels);
			setImageInfo(image?.info ?? null);
			setImage(image?.image ?? null);
			setSeriesName(series);
			setSeriesIndex(dicom_index + 1);
			setMaxSeriesIndex(tree[series].length);
			setFrameIndex(frame_index + 1);
			setMaxFrameIndex(metadata.numFrames);
			setSeriesPlaybackEnabled(playback);
			SwitchTab(1);
			*/
		} catch (error: any) {
			console.error(`Failed to load series: `, error.message);
			console.error(Error(error).stack ?? '');
			return null;
		}
	};
	useEffect(() => {
		if (seriesName && seriesPlaybackEnabled) {
			const interval = setInterval(() => LoadSeries(
				seriesName,
				seriesIndex === maxSeriesIndex ? 0 : seriesIndex,
				frameIndex - 1,
				true
			), 100);
			return () => clearInterval(interval);
		}
	}, [seriesPlaybackEnabled, image]);
	const RenderSkia = () => {
		if (image && imageInfo) {
			/* Calculate responsive target dimensions while preserving the true aspect ratio */
			const w = width - 48; /* Gives clean margins on both sides of the screen */
			const h = (imageInfo.height / imageInfo.width) * w;
			return (
				<Canvas style={{ width: w, height: h }}>
					<SkiaImage
						image={image}
						fit="contain"
						x={0}
						y={0}
						width={w}
						height={h}
					/>
				</Canvas>
			);
		} else {
			return <Text className="text-black mt-2 text-center">DICOM images to be shown here.</Text>;
		}
	};
	const ChangeMPRMode = (m: any) => {
		if (currentVolumeRef.current && seriesName) {
			currentVolumeRef.current.mode = m;
			LoadSeries(seriesName, seriesIndex - 1, frameIndex - 1, false);
		}
	};
	const MPRChoices = () => {
		if (currentVolumeRef.current && currentVolumeRef.current.instance) {
			const mode = currentVolumeRef.current.mode;
			return (
				<View className="flex-row gap-x-2 mb-4 bg-gray-100 p-1 rounded-lg">
					{['AXIAL', 'CORONAL', 'SAGITTAL'].map((m: any) => (
						<TouchableOpacity key={m} onPress={() => ChangeMPRMode(m)}
							className={`px-4 py-1 rounded-md ${mode === m ? 'bg-orange-300' : 'bg-transparent'}`}>
							<Text className={`text-sm font-bold ${mode === m ? 'text-white' : 'text-gray-600'}`}>{m}</Text>
						</TouchableOpacity>
					))}
				</View>
			);
		}
		return null;
	};
	const ImageControls = () => seriesName && currentVolumeRef.current && currentVolumeRef.current.instance ? (
		<View className="flex-row m-4 p-2 bg-gray-200 rounded-2xl items-center">
			<Pressable className={`justify-center m-2 p-3 rounded-full active:bg-yellow-500 ${ seriesPlaybackEnabled ? 'bg-blue-500' : 'bg-orange-400' }`}
				onPress={() => setSeriesPlaybackEnabled(!seriesPlaybackEnabled)}>
				{!seriesPlaybackEnabled ?
					<Play color="white" fill="white" size={24} /> :
					<Pause color="white" fill="white" size={24} />
				}
			</Pressable>
			<View className="flex-col items-center">
				<Text className="font-bold text-orange-500">{currentVolumeRef.current.mode} PLANE</Text>
				<View className="flex-row gap-x-2 items-center">
					<Pressable className="p-1 rounded-3xl active:bg-yellow-500" onPress={() => LoadSeries(
						seriesName,
						seriesIndex === 1 ? maxSeriesIndex - 1 : seriesIndex - 2,
						frameIndex - 1
					)}>
						<ChevronLeft color="black" size={24} />
					</Pressable>
					<View className="flex-row gap-x-2 items-center">
						<Text className="text-xl font-bold text-black">{seriesIndex}</Text>
						<Text className="text-lg font-bold text-gray-400">OF</Text>
						<Text className="text-xl font-bold text-black">{maxSeriesIndex}</Text>
					</View>
					<Pressable className="p-1 rounded-3xl active:bg-yellow-500" onPress={() => LoadSeries(
						seriesName,
						seriesIndex === maxSeriesIndex ? 0 : seriesIndex,
						frameIndex - 1
					)}>
						<ChevronRight color="black" size={24} />
					</Pressable>
					{/* no more navigation for frame */}
				</View>
			</View>
		</View>
	) : null;
	const ImagesTab = () => !seriesName || !image || !imageInfo ? (
		<View style={{width}} className="px-6 pt-4 flex-1 justify-center items-center">
			<Text className="text-2xl font-bold text-black">Images</Text>
			<Text className="text-black mt-2 text-center">DICOM images to be shown here.</Text>
		</View>
	) : (
		<ScrollView showsVerticalScrollIndicator={false} className="mb-[5%]">
			<View style={{width}} className="flex-1 items-center justify-center p-4">
				<Text className="p-3 text-2xl font-bold text-black">Images</Text>
				{MPRChoices()}
				{RenderSkia()}
				{ImageControls()}
			</View>
		</ScrollView>
	);
	return (
		<Modal animationType="slide" transparent={true} visible={Visibility} onRequestClose={ModalClosed} onShow={ModalShown}>
			<View className="flex-1 justify-end bg-black/50">
				<View className="bg-white h-[95%] rounded-t-3xl pt-6 shadow-xl">

					<View className="flex-row justify-between items-center mb-4 pb-4 px-6">
						<Text className="w-[75%] text-xl font-bold text-gray-800">{TargetFile.substring(TargetFile.lastIndexOf('/') + 1)}</Text>
						<TouchableOpacity onPress={CloseButtonPressed} className="bg-red-500 px-4 py-2 rounded-lg">
							<Text className="text-white font-bold">Close</Text>
						</TouchableOpacity>
					</View>

					<View className="flex-row border-b border-gray-200">
						<TouchableOpacity onPress={() => SwitchTab(0)}
							className={`flex-1 pb-3 items-center ${pageIndex === 0 ? 'border-b-2 border-[#eb8817]' : ''}`}>
							<Text className={`text-lg font-bold ${pageIndex === 0 ? 'text-[#eb8817]' : 'text-gray-400'}`}>
								{ !ZIPContent ? 'Metadata' : 'ZIP Contents' }
							</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => SwitchTab(1)}
							className={`flex-1 pb-3 items-center ${pageIndex === 1 ? 'border-b-2 border-[#eb8817]' : ''}`}>
							{ ZIPContent
								? <Text className={`text-lg font-bold ${pageIndex === 1 ? 'text-[#eb8817]' : 'text-gray-400'}`}>Images</Text>
								: <Text className={`text-lg font-bold ${pageIndex === 1 ? 'text-[#eb8817]' : 'text-gray-400'}`}>2D Image Render</Text> 
							}
						</TouchableOpacity>
					</View>

					<ScrollView className="flex-1" ref={page_ref} horizontal pagingEnabled
						showsHorizontalScrollIndicator={false} onScroll={EstimateIndex} scrollEventThrottle={4}>
						
						<View style={{width}} className="px-6 pt-4">
							{MetadataOrZIPContents}
						</View>
						
						{ !ZIPContent ?
							<View style={{width}} className="px-6 pt-4 flex-1 justify-top items-center">
								<Text className="text-2xl font-bold text-black">Rendering Test</Text>
								{renderDicomImage()}
							</View>
						: ImagesTab() }
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}
