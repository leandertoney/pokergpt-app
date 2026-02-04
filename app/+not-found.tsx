import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View, type ViewStyle, type TextStyle } from "react-native";
import { colors } from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{
        title: "Oops!",
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.accent.primary,
      }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>

        <Link href="/" asChild>
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Go to PokerPro AI</Text>
          </View>
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
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text.primary,
    marginBottom: 20,
  } as TextStyle,
  linkContainer: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: colors.accent.primary,
    borderRadius: 8,
  } as ViewStyle,
  linkText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
});
