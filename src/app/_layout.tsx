import { Tabs } from 'expo-router';
import { Eye, House } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Tabs>
				<Tabs.Screen
					name="index"
					options={{
						tabBarLabel: 'Home',
						tabBarIcon: ({ size, color }) =>
							<House size={size} color={color} />,
					}}
				/>
				<Tabs.Screen
					name="DICOMViewer"
					options={{
						tabBarLabel: 'Viewer',
						tabBarIcon: ({ size, color }) =>
							<Eye size={size} color={color} />,
					}}
				/>
			</Tabs>
		</GestureHandlerRootView>
	);
}
