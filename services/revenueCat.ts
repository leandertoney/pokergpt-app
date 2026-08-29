import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { withTimeout } from '@/utils/withTimeout';

// RevenueCat API Keys from dashboard
const REVENUECAT_IOS_KEY = 'appl_UpYGVTernIJdqPdLcHXQNtQwHgU';
const REVENUECAT_ANDROID_KEY = 'goog_IpBnRcxRbnspeIxHHUIaWvWLjys';

// Product identifiers - must match what you create in App Store Connect / Google Play
export const PRODUCT_IDS = {
  WEEKLY: 'pokergpt_weekly',
  YEARLY: 'pokergpt_yearly',
  SPECIAL: 'poker_pro_yearly_special',
} as const;

// Entitlement identifier - must match what you created in RevenueCat
export const ENTITLEMENTS = {
  PREMIUM: 'PokerGPT Pro',
} as const;

// Package types for RevenueCat offerings
export type PlanType = 'weekly' | 'yearly' | 'special';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  activeEntitlements: string[];
  expirationDate: Date | null;
  willRenew: boolean;
  isInTrial: boolean;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}

class RevenueCatService {
  private initialized = false;

  /**
   * Initialize RevenueCat SDK - call this once on app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Enable debug logs in development
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      // Configure with the appropriate API key for the platform
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

      await Purchases.configure({ apiKey });
      this.initialized = true;

      // Attach what the device actually knows, so a future trial can be
      // explained without archaeology across three dashboards.
      //
      // NOTE: this is NOT the App Store acquisition source. Apple does not
      // expose "came from Search vs Browse" to the app at all -- that lives
      // only in App Store Connect's aggregate analytics and cannot be attached
      // to an individual customer. What follows is the context that IS
      // available on device.
      void this.attachContext();

      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  /**
   * Tag the RevenueCat customer with device-side context.
   *
   * Every attribution field on this project's customers is currently empty, so
   * a trial can only be tied back to a device by matching timestamps by hand.
   * These attributes make the customer record self-describing: which app
   * version they started on, which onboarding flow they saw, and the device id
   * that joins them to public.onboarding_events.
   *
   * Fire-and-forget. Attribution is never worth failing a purchase over.
   */
  private async attachContext(): Promise<void> {
    try {
      const [{ getDeviceId }, AsyncStorage] = await Promise.all([
        import('@/services/onboardingAnalytics'),
        import('@react-native-async-storage/async-storage').then((m) => m.default),
      ]);

      const deviceId = await getDeviceId();
      const flow = (await AsyncStorage.getItem('@onboarding_flow')) ?? '2';

      await Purchases.setAttributes({
        device_id: deviceId,
        app_version: Application.nativeApplicationVersion ?? 'unknown',
        platform: Platform.OS,
        onboarding_flow: flow,
      });
    } catch (e: any) {
      console.warn('[revenueCat] attach context failed:', e?.message);
    }
  }

  /**
   * Identify the user with a unique ID (optional but recommended)
   * Call this after user authentication
   */
  async identifyUser(userId: string): Promise<void> {
    if (!this.initialized) return;

    try {
      await Purchases.logIn(userId);
      console.log('RevenueCat user identified:', userId);
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Log out the current user (for anonymous mode)
   */
  async logOut(): Promise<void> {
    if (!this.initialized) return;

    try {
      await Purchases.logOut();
      console.log('RevenueCat user logged out');
    } catch (error) {
      console.error('Failed to log out user:', error);
    }
  }

  /**
   * Get available offerings (products configured in RevenueCat)
   */
  async getOfferings(): Promise<PurchasesOffering | null> {
    if (!this.initialized) return null;

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  /**
   * Copy and configuration attached to the current Offering in the RevenueCat
   * dashboard.
   *
   * This is what makes the paywall A/B testable without shipping a build.
   * RevenueCat Experiments can serve different Offerings to different users,
   * and each Offering carries its own metadata JSON — so headline, CTA label
   * and trial framing can all be varied remotely against a custom paywall.
   * Adopting RevenueCat's hosted Paywall UI is NOT required for this.
   *
   * Returns an empty object when RevenueCat is unavailable (Expo Go) or when
   * no metadata is set, so callers always fall back to their own defaults.
   */
  async getPaywallCopy(): Promise<Record<string, string>> {
    try {
      const offering = await this.getOfferings();
      const meta = (offering as any)?.metadata;
      if (!meta || typeof meta !== 'object') return {};
      // Flatten to strings; the dashboard allows nested JSON but the paywall
      // only ever reads scalar copy values.
      return Object.fromEntries(
        Object.entries(meta)
          .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
          .map(([k, v]) => [k, String(v)])
      );
    } catch {
      return {};
    }
  }

  /**
   * Get the package for a specific plan type
   */
  async getPackageForPlan(planType: PlanType): Promise<PurchasesPackage | null> {
    try {
      const offering = await this.getOfferings();
      if (!offering) return null;

      // RevenueCat uses $rc_weekly and $rc_annual as standard package identifiers
      if (planType === 'weekly') {
        return offering.weekly || null;
      } else if (planType === 'yearly') {
        return offering.annual || null;
      } else if (planType === 'special') {
        // For special offer, look for a custom package identifier
        // This should match the identifier you set in RevenueCat dashboard
        return offering.availablePackages.find(
          pkg => pkg.identifier === '$rc_special' || pkg.product.identifier === PRODUCT_IDS.SPECIAL
        ) || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get package for plan:', error);
      return null;
    }
  }

  /**
   * Get formatted price string for a plan
   */
  async getPriceForPlan(planType: PlanType): Promise<string | null> {
    const pkg = await this.getPackageForPlan(planType);
    return pkg?.product.priceString || null;
  }

  /**
   * Check if user has premium access
   */
  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    if (!this.initialized) {
      return {
        isSubscribed: false,
        activeEntitlements: [],
        expirationDate: null,
        willRenew: false,
        isInTrial: false,
      };
    }

    try {
      const customerInfo = await withTimeout(
        Purchases.getCustomerInfo(),
        3000,
        'RevenueCat getCustomerInfo'
      );

      const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
      const isSubscribed = !!premiumEntitlement;

      return {
        isSubscribed,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        expirationDate: premiumEntitlement?.expirationDate
          ? new Date(premiumEntitlement.expirationDate)
          : null,
        willRenew: premiumEntitlement?.willRenew ?? false,
        isInTrial: premiumEntitlement?.periodType === 'TRIAL',
      };
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return {
        isSubscribed: false,
        activeEntitlements: [],
        expirationDate: null,
        willRenew: false,
        isInTrial: false,
      };
    }
  }

  /**
   * Purchase a subscription package
   */
  async purchasePackage(planType: PlanType): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, error: 'Purchase service not available. Please try again.' };
    }

    try {
      const pkg = await this.getPackageForPlan(planType);

      if (!pkg) {
        return {
          success: false,
          error: 'Package not found. Please try again later.',
        };
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Check if the purchase granted the premium entitlement
      const isSubscribed = !!customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];

      if (isSubscribed) {
        return {
          success: true,
          customerInfo,
        };
      } else {
        return {
          success: false,
          error: 'Purchase completed but entitlement not granted. Please contact support.',
        };
      }
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error.userCancelled) {
        return {
          success: false,
          error: 'cancelled',
        };
      }

      console.error('Purchase failed:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed. Please try again.',
      };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, error: 'Purchase service not available. Please try again.' };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();

      const isSubscribed = !!customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];

      return {
        success: isSubscribed,
        customerInfo,
        error: isSubscribed ? undefined : 'No active subscriptions found to restore.',
      };
    } catch (error: any) {
      console.error('Restore failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore purchases. Please try again.',
      };
    }
  }

  /**
   * Add listener for customer info changes (subscription status updates)
   */
  addCustomerInfoUpdateListener(
    callback: (info: CustomerInfo) => void
  ): () => void {
    if (!this.initialized) return () => {};

    Purchases.addCustomerInfoUpdateListener(callback);
    // Note: In newer SDK versions, use Purchases.removeCustomerInfoUpdateListener if needed
    return () => {};
  }
}

// Export a singleton instance
export const revenueCat = new RevenueCatService();

// Export individual functions for convenience
export const initializeRevenueCat = () => revenueCat.initialize();
export const getOfferings = () => revenueCat.getOfferings();
export const getPaywallCopy = () => revenueCat.getPaywallCopy();
export const getPriceForPlan = (planType: PlanType) => revenueCat.getPriceForPlan(planType);
export const checkSubscriptionStatus = () => revenueCat.checkSubscriptionStatus();
export const purchasePackage = (planType: PlanType) => revenueCat.purchasePackage(planType);
export const restorePurchases = () => revenueCat.restorePurchases();
export const identifyUser = (userId: string) => revenueCat.identifyUser(userId);
