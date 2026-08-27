export interface SubscriptionStatus {
  trialEndsAt: Date;
  isTrialExpired: boolean;
}

export const subscriptionService = {
  getStatus(user: { trialEndsAt: Date }): SubscriptionStatus {
    return {
      trialEndsAt: user.trialEndsAt,
      isTrialExpired: user.trialEndsAt.getTime() < Date.now(),
    };
  },
};
