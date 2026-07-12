import { Tabs } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Tabs>
				<Tabs.Screen
					name="index"
					options={{
						title: 'DICOM Viewer',
						tabBarLabel: 'Home',
					}}
				/>
			</Tabs>
		</GestureHandlerRootView>
	);
}
