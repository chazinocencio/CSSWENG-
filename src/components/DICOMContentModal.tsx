import { useMemo, useRef, useState } from 'react';
import { Modal, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

//skia stuff
import { Canvas, Image as SkiaImage, Skia, ColorType, AlphaType } from '@shopify/react-native-skia';

interface DICOMContentModalProps {
	Visibility: boolean;
	Content: any;
	TargetFile: string;
	ModalClosed: () => void;
}

export default function DICOMContentModal({ Visibility, Content, TargetFile, ModalClosed }:　DICOMContentModalProps) {
	const { width } = useWindowDimensions();
	const [pageIndex, setPageIndex] = useState<number>(0);
	const page_ref = useRef<ScrollView>(null);

	//Convert raw Uint8Array bytes to a Skia Image
	const dicomSkiaImage = useMemo(() => {
		if (!Content || !Content.frameData) return null;

		try {
			let pixelBuffer = Content.frameData;

			// If the DICOM is 16-bit (2 bytes per pixel), downsample it to 8-bit for Skia Gray_8
			if (Content.bitsAllocated === 16) {
				const totalPixels = Content.width * Content.height;
				const normArray = new Uint8Array(totalPixels);
				
				let minVal = 65535;
				let maxVal = 0;

				// Pass 1: Combine bytes (Little Endian) to discover the pixel value range
				for (let i = 0; i < totalPixels; i++) {
					const low = pixelBuffer[i * 2];
					const high = pixelBuffer[i * 2 + 1];
					const val = (high << 8) | low;
					if (val > maxVal) maxVal = val;
					if (val < minVal) minVal = val;
				}

				const range = maxVal - minVal || 1;

				// Pass 2: Scale the high-depth channel down to standard 0-255 scale
				for (let i = 0; i < totalPixels; i++) {
					const low = pixelBuffer[i * 2];
					const high = pixelBuffer[i * 2 + 1];
					const val = (high << 8) | low;
					normArray[i] = Math.floor(((val - minVal) / range) * 255);
				}

				pixelBuffer = normArray;
			}

			const data = Skia.Data.fromBytes(pixelBuffer);
			
			const imageInfo = {
				width: Content.width,
				height: Content.height,
				colorType: ColorType.Gray_8, // Map to normalized 8-bit grayscale channel
				alphaType: AlphaType.Opaque,
			};

			// For Gray_8, rowBytes must equal width exactly (1 byte per pixel)
			return Skia.Image.MakeImage(imageInfo, data, Content.width);
		} catch (e) {
			console.error("Failed to create Skia Image from raw bytes:", e);
			return null;
		}
	}, [Content]);
	const renderDicomImage = () => {
		if (dicomSkiaImage) {
			// Calculate responsive target dimensions while preserving the true aspect ratio
			const displayWidth = width - 48; // Gives clean margins on both sides of the screen
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

	if (!Content)
		return null;
	const EstimateIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		setPageIndex(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width));
	};
	const SwitchTab = (index: number) => {
		page_ref.current?.scrollTo({ x: index * width, animated: false });
		setPageIndex(index);
	};
	const CloseButtonPressed = () => {
		SwitchTab(0);
		ModalClosed();
	};
	return (
		<Modal animationType="slide" transparent={true} visible={Visibility} onRequestClose={ModalClosed}>
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
							<Text className={`text-lg font-bold ${pageIndex === 0 ? 'text-[#eb8817]' : 'text-gray-400'}`}>Metadata</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => SwitchTab(1)}
							className={`flex-1 pb-3 items-center ${pageIndex === 1 ? 'border-b-2 border-[#eb8817]' : ''}`}>
							<Text className={`text-lg font-bold ${pageIndex === 1 ? 'text-[#eb8817]' : 'text-gray-400'}`}>Images</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => SwitchTab(2)} className={`flex-1 pb-3 items-center ${pageIndex === 2 ? 'border-b-2 border-[#eb8817]' : ''}`}>
							<Text className={`text-lg font-bold ${pageIndex === 2 ? 'text-[#eb8817]' : 'text-gray-400'}`}>2D Image Render</Text>
						</TouchableOpacity>
					</View>

					<ScrollView className="flex-1" ref={page_ref} horizontal pagingEnabled
						showsHorizontalScrollIndicator={false} onScroll={EstimateIndex} scrollEventThrottle={4}>
						
						<View style={{width}} className="px-6 pt-4">
							<ScrollView showsVerticalScrollIndicator={false}>
								{Object.entries(Content).map(([k, v]) => {
									// 1. ADD THIS LINE: Skip rendering the raw pixel array as text!
									if (k === 'frameData') return null;

									// 2. Render the normal metadata
									return (
										<View key={k} className="mb-3">
											<Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{k}</Text>
											<Text className="text-lg text-gray-800">{String(v)}</Text>
										</View>
									);
								})}
							</ScrollView>
						</View>
						
						<View style={{width}} className="px-6 pt-4 flex-1 justify-center items-center">
							<Text className="text-2xl font-bold text-black">Images</Text>
							<Text className="text-black mt-2 text-center">DICOM images to be shown here.</Text>
						</View>

						<View style={{width}} className="px-6 pt-4 flex-1 justify-top items-center">
							<Text className="text-2xl font-bold text-black">Rendering Test</Text>
							{renderDicomImage()}
						</View>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}
