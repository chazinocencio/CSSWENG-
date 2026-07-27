import { Tabs } from 'expo-router';
import { Eye, House } from 'lucide-react-native';
import '../global.css';

export default function RootLayout() {
	return (
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
	);
}
