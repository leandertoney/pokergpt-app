import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View, type ViewStyle, type TextStyle } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ 
        title: "Oops!",
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#D4AF37',
      }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to PokerGPT</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: '#000000',
  } as ViewStyle,
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: '#FFFFFF',
    marginBottom: 20,
  } as TextStyle,
  link: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#D4AF37',
    borderRadius: 8,
  } as ViewStyle,
  linkText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: "#000000",
  } as TextStyle,
});
