import { Canvas, Image as SkiaImage, SkImage } from '@shopify/react-native-skia';
import { RotateCcw } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;

interface ZoomableDicomCanvasProps {
	image: SkImage;
	imageWidth: number;
	imageHeight: number;
	containerWidth: number;
	onZoomChange?: (isZoomed: boolean) => void;
}

const clamp = (value: number, min: number, max: number) => {
	'use worklet';
	return Math.min(Math.max(value, min), max);
};

export default function ZoomableDicomCanvas({
	image,
	imageWidth,
	imageHeight,
	containerWidth,
	onZoomChange,
}: ZoomableDicomCanvasProps) {
	const displayWidth = containerWidth;
	const displayHeight = (imageHeight / imageWidth) * displayWidth;

	const scale = useSharedValue(1);
	const savedScale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const savedTranslateX = useSharedValue(0);
	const savedTranslateY = useSharedValue(0);

	const notifyZoomChange = (isZoomed: boolean) => {
		onZoomChange?.(isZoomed);
	};

	const resetView = () => {
		scale.value = withTiming(1);
		savedScale.value = 1;
		translateX.value = withTiming(0);
		translateY.value = withTiming(0);
		savedTranslateX.value = 0;
		savedTranslateY.value = 0;
		onZoomChange?.(false);
	};

	useEffect(() => {
		scale.value = 1;
		savedScale.value = 1;
		translateX.value = 0;
		translateY.value = 0;
		savedTranslateX.value = 0;
		savedTranslateY.value = 0;
		onZoomChange?.(false);
	}, [image]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value },
			{ scale: scale.value },
		],
	}));

	const pinch = Gesture.Pinch()
		.onStart(() => {
			savedScale.value = scale.value;
		})
		.onUpdate((e) => {
			const nextScale = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
			const worldX = (e.focalX - translateX.value) / scale.value;
			const worldY = (e.focalY - translateY.value) / scale.value;

			scale.value = nextScale;
			translateX.value = e.focalX - worldX * nextScale;
			translateY.value = e.focalY - worldY * nextScale;

			if (nextScale > MIN_SCALE) {
				runOnJS(notifyZoomChange)(true);
			}
		})
		.onEnd(() => {
			savedScale.value = scale.value;
			savedTranslateX.value = translateX.value;
			savedTranslateY.value = translateY.value;

			if (scale.value <= MIN_SCALE) {
				scale.value = withTiming(MIN_SCALE);
				translateX.value = withTiming(0);
				translateY.value = withTiming(0);
				savedScale.value = MIN_SCALE;
				savedTranslateX.value = 0;
				savedTranslateY.value = 0;
				runOnJS(notifyZoomChange)(false);
			}
		});

	const pan = Gesture.Pan()
		.minPointers(1)
		.maxPointers(1)
		.onStart(() => {
			savedTranslateX.value = translateX.value;
			savedTranslateY.value = translateY.value;
		})
		.onChange((e) => {
			if (scale.value <= MIN_SCALE) {
				return;
			}
			translateX.value = savedTranslateX.value + e.translationX;
			translateY.value = savedTranslateY.value + e.translationY;
		})
		.onEnd(() => {
			savedTranslateX.value = translateX.value;
			savedTranslateY.value = translateY.value;
		});

	const doubleTap = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd((e) => {
			if (scale.value > MIN_SCALE) {
				scale.value = withTiming(MIN_SCALE);
				translateX.value = withTiming(0);
				translateY.value = withTiming(0);
				savedScale.value = MIN_SCALE;
				savedTranslateX.value = 0;
				savedTranslateY.value = 0;
				runOnJS(notifyZoomChange)(false);
				return;
			}

			const nextScale = DOUBLE_TAP_SCALE;
			const worldX = (e.x - translateX.value) / scale.value;
			const worldY = (e.y - translateY.value) / scale.value;

			scale.value = withTiming(nextScale);
			translateX.value = withTiming(e.x - worldX * nextScale);
			translateY.value = withTiming(e.y - worldY * nextScale);
			savedScale.value = nextScale;
			savedTranslateX.value = e.x - worldX * nextScale;
			savedTranslateY.value = e.y - worldY * nextScale;
			runOnJS(notifyZoomChange)(true);
		});

	const composed = Gesture.Race(
		doubleTap,
		Gesture.Simultaneous(pinch, pan),
	);

	return (
		<View className="items-center">
			<GestureDetector gesture={composed}>
				<Animated.View
					collapsable={false}
					style={[
						{ width: displayWidth, height: displayHeight, overflow: 'hidden' },
						animatedStyle,
					]}
				>
					<Canvas style={{ width: displayWidth, height: displayHeight }}>
						<SkiaImage
							image={image}
							fit="contain"
							x={0}
							y={0}
							width={displayWidth}
							height={displayHeight}
						/>
					</Canvas>
				</Animated.View>
			</GestureDetector>

			<Pressable
				className="mt-3 flex-row items-center gap-x-2 rounded-lg bg-[#eb8817] px-4 py-2 active:opacity-70"
				onPress={resetView}
			>
				<RotateCcw color="white" size={18} />
				<Text className="font-semibold text-white">Reset View</Text>
			</Pressable>
		</View>
	);
}
