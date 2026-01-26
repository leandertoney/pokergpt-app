import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { withTimeout } from '@/utils/withTimeout';

// RevenueCat API Keys from dashboard
const REVENUECAT_IOS_KEY = 'appl_UpYGVTernIJdqPdLcHXQNtQwHgU';
const REVENUECAT_ANDROID_KEY = 'goog_REPLACE_WITH_ANDROID_KEY'; // Add Android key when you set up Google Play

// Product identifiers - must match what you create in App Store Connect / Google Play
export const PRODUCT_IDS = {
  WEEKLY: 'pokergpt_weekly',
  YEARLY: 'pokergpt_yearly',
} as const;

// Entitlement identifier - must match what you created in RevenueCat
export const ENTITLEMENTS = {
  PREMIUM: 'PokerGPT Pro',
} as const;

// Package types for RevenueCat offerings
export type PlanType = 'weekly' | 'yearly';

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

      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  /**
   * Identify the user with a unique ID (optional but recommended)
   * Call this after user authentication
   */
  async identifyUser(userId: string): Promise<void> {
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
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
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
      } else {
        return offering.annual || null;
      }
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
    try {
      const customerInfo = await withTimeout(
        Purchases.getCustomerInfo(),
        5000,
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
export const getPriceForPlan = (planType: PlanType) => revenueCat.getPriceForPlan(planType);
export const checkSubscriptionStatus = () => revenueCat.checkSubscriptionStatus();
export const purchasePackage = (planType: PlanType) => revenueCat.purchasePackage(planType);
export const restorePurchases = () => revenueCat.restorePurchases();
export const identifyUser = (userId: string) => revenueCat.identifyUser(userId);
