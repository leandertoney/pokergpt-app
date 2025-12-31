import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Stack, useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email.trim(), password);

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
    } else {
      // Navigation will happen automatically via auth state change
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <LinearGradient
        colors={[colors.background.secondary, colors.background.primary, '#0D0202']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Mail size={20} color={colors.text.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.text.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Lock size={20} color={colors.text.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.text.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.text.muted} />
                  ) : (
                    <Eye size={20} color={colors.text.muted} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <Link href="/auth/forgot-password" asChild>
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </Link>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.button, (isLoading || authLoading) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || authLoading}
              >
                {isLoading || authLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/auth/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Continue as Guest */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.guestText}>Continue as Guest</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  keyboardView: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  } as ViewStyle,
  header: {
    marginBottom: 40,
    alignItems: 'center',
  } as ViewStyle,
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    fontSize: 16,
    color: colors.text.muted,
  } as TextStyle,
  form: {
    marginBottom: 32,
  } as ViewStyle,
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  } as ViewStyle,
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text.primary,
  } as TextStyle,
  eyeButton: {
    padding: 8,
  } as ViewStyle,
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  } as ViewStyle,
  forgotPasswordText: {
    fontSize: 14,
    color: colors.accent.primary,
  } as TextStyle,
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  } as ViewStyle,
  errorText: {
    color: colors.utility.error,
    fontSize: 14,
    textAlign: 'center',
  } as TextStyle,
  button: {
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  } as ViewStyle,
  buttonDisabled: {
    opacity: 0.7,
  } as ViewStyle,
  buttonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  footerText: {
    fontSize: 16,
    color: colors.text.muted,
  } as TextStyle,
  footerLink: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.accent.primary,
  } as TextStyle,
  guestButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
  } as ViewStyle,
  guestText: {
    fontSize: 15,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  } as TextStyle,
});
