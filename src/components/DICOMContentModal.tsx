import { useRef, useState } from 'react';
import { Modal, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

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
					</View>

					<ScrollView className="flex-1" ref={page_ref} horizontal pagingEnabled
						showsHorizontalScrollIndicator={false} onScroll={EstimateIndex} scrollEventThrottle={4}>
						
						<View style={{width}} className="px-6 pt-4">
							<ScrollView showsVerticalScrollIndicator={false}>
								{Object.entries(Content).map(([k, v]) => (
									<View key={k} className="mb-3">
										<Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{k}</Text>
										<Text className="text-lg text-gray-800">{String(v)}</Text>
									</View>
								))}
							</ScrollView>
						</View>
						
						<View style={{width}} className="px-6 pt-4 flex-1 justify-center items-center">
							<Text className="text-2xl font-bold text-black">Images</Text>
							<Text className="text-black mt-2 text-center">DICOM images to be shown here.</Text>
						</View>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}
