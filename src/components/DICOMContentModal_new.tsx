import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DICOMContentModalProps {
	Visibility: boolean;
	Content: any;
	ZIPContent: any;
	TargetFile: string;
	ModalClosed: () => void;
	ModalShown: () => void;
	onSeriesSelected?: (series: string) => void;
	selectedSeries?: string;
}

export default function DICOMContentModal({
	Visibility, Content, ZIPContent, TargetFile, ModalClosed, ModalShown, onSeriesSelected, selectedSeries
}: DICOMContentModalProps) {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set<string>());

	const ToggleFolder = (title: string) => {
		setExpandedFolders(prev => {
			const next = new Set(prev);
			if (prev.has(title)) next.delete(title); else next.add(title);
			return next;
		});
	};

	const MetadataOrZIPContents = useMemo(() => {
		if (!Content && !ZIPContent) return null;
		else if (!ZIPContent) {
			return (
				<ScrollView showsVerticalScrollIndicator={false}>
					{Object.entries(Content).map(([k, v]) => {
						if (k === 'frameData') return null;
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
						<View className={`flex-row gap-x-2 items-center rounded-lg p-1 ${selectedSeries === title ? 'bg-blue-100' : ''}`}>
							<Pressable className="p-2 active:bg-yellow-500" onPress={() => ToggleFolder(title)}>
								{!expandedFolders.has(title) ? <ChevronRight color="#354c70" size={16} /> : <ChevronDown color="#354c70" size={16} />}
							</Pressable>
							<Folder color="#354c70" size={16} />
							<TouchableOpacity onPress={() => onSeriesSelected?.(title)} className="flex-1">
								<Text className={`text-lg font-semibold underline ${selectedSeries === title ? 'text-blue-600' : 'text-[#f77707]'}`}>
									{title}
								</Text>
							</TouchableOpacity>
						</View>
					)}
					renderItem={({ item, index }) => (
						<View className="ml-4 border-l-2 border-black pl-2">
							<View className="flex-row gap-x-2 items-center pl-1 py-2">
								<File color="#64748b" size={16} />
								<Text className="font-medium text-[#1000ff]">{item}</Text>
							</View>
						</View>
					)}
					ListFooterComponent={<View className="h-8" />}
				/>
			);
		}
	}, [Content, ZIPContent, expandedFolders]);

	return (
		<Modal animationType="slide" transparent={true} visible={Visibility} onRequestClose={ModalClosed} onShow={ModalShown}>
			<View className="flex-1 justify-end bg-black/50">
				<View
					style={{ height: '85%', paddingBottom: insets.bottom }}
					className="bg-white rounded-t-3xl shadow-xl overflow-hidden"
				>
					{/* Header */}
					<View className="flex-row justify-between items-start pt-6 pb-4 px-6 border-b border-gray-100 bg-gray-50/50">
						<View className="flex-1 mr-4">
							<Text className="text-lg font-bold text-gray-800 leading-6" numberOfLines={2}>
								{TargetFile.substring(TargetFile.lastIndexOf('/') + 1)}
							</Text>
							<Text className="text-xs text-gray-400 mt-1 uppercase tracking-tight">Current Selection</Text>
						</View>

						<TouchableOpacity
							onPress={ModalClosed}
							activeOpacity={0.7}
							className="bg-[#eb8817] px-5 py-2.5 rounded-xl shadow-sm"
						>
							<Text className="text-white font-bold text-sm">Proceed to Viewer</Text>
						</TouchableOpacity>
					</View>

					{/* Content */}
					<View className="px-6 pt-5 flex-1">
						<View className="flex-row items-center mb-4">
							<View className="w-1 h-6 bg-orange-400 rounded-full mr-3" />
							<Text className="text-xl font-bold text-gray-700">Successfully Read Files</Text>
						</View>

						<View className="flex-1 bg-gray-50/30 rounded-2xl overflow-hidden">
							{MetadataOrZIPContents}
						</View>
					</View>
				</View>
			</View>
		</Modal>
	);
}
