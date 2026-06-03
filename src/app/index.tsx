import { StyleSheet, Text, View } from "react-native";

export default function Page() {
	return (
		<View className="flex-1 items-center">
			<View className="flex-1 justify-center">
				<Text className="text-3xl font-bold">Hello World!</Text>
				<Text className="text-xl font-light">This is the first page of your app.</Text>
			</View>
		</View>
	);
}
