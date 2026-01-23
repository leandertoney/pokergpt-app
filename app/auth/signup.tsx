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
import { Mail, Lock, Eye, EyeOff, CheckCircle, Circle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/colors';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password requirements
  const passwordRequirements = [
    { key: 'length', label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { key: 'uppercase', label: 'One uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { key: 'lowercase', label: 'One lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { key: 'number', label: 'One number', test: (pwd: string) => /[0-9]/.test(pwd) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const validatePassword = (pwd: string) => {
    if (!allRequirementsMet) {
      return 'Please meet all password requirements';
    }
    return null;
  };

  const handleSignup = async () => {
    // Validate inputs first (before setting loading state)
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await signUp(email.trim(), password);

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      // Handle any unexpected errors
      setError('An error occurred. Please try again.');
      console.error('Signup error:', err);
    } finally {
      // Always reset loading state
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[colors.background.secondary, colors.background.primary, '#0D0202']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        >
          <View style={[styles.successContainer, { paddingTop: insets.top }]}>
            <CheckCircle size={64} color={colors.utility.success} />
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successText}>
              We've sent a confirmation link to {email}. Please check your inbox and click the link to verify your account.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join PokerGPT today</Text>
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
                  autoComplete="new-password"
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Lock size={20} color={colors.text.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.text.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
              </View>

              {/* Password Requirements Checklist */}
              <View style={styles.requirementsContainer}>
                {passwordRequirements.map((req) => {
                  const isMet = req.test(password);
                  return (
                    <View key={req.key} style={styles.requirementRow}>
                      {isMet ? (
                        <CheckCircle size={16} color={colors.utility.success} />
                      ) : (
                        <Circle size={16} color={colors.text.muted} />
                      )}
                      <Text style={[
                        styles.requirementText,
                        isMet && styles.requirementMet,
                      ]}>
                        {req.label}
                      </Text>
                    </View>
                  );
                })}
                {/* Passwords match indicator */}
                <View style={styles.requirementRow}>
                  {passwordsMatch ? (
                    <CheckCircle size={16} color={colors.utility.success} />
                  ) : (
                    <Circle size={16} color={colors.text.muted} />
                  )}
                  <Text style={[
                    styles.requirementText,
                    passwordsMatch && styles.requirementMet,
                  ]}>
                    Passwords match
                  </Text>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.button, (isLoading || authLoading) && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={isLoading || authLoading}
              >
                {isLoading || authLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Sign In</Text>
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
  requirementsContainer: {
    marginBottom: 20,
    marginTop: -4,
  } as ViewStyle,
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  } as ViewStyle,
  requirementText: {
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
  requirementMet: {
    color: colors.utility.success,
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  } as ViewStyle,
  successTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  } as TextStyle,
  successText: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  } as TextStyle,
});
