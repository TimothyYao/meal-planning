# Success Metrics

This document outlines the key performance indicators (KPIs) and success metrics for the Macro Planning App.

## User Engagement

### Daily Active Users (DAU)
- **Metric**: Number of unique users who open the app on a given day
- **Target**: 60% of monthly active users
- **Measurement**: Track app opens and active sessions

### Weekly Active Users (WAU)
- **Metric**: Number of unique users who use the app in a week
- **Target**: 80% of monthly active users
- **Measurement**: Track user activity over 7-day rolling window

### Monthly Active Users (MAU)
- **Metric**: Number of unique users who use the app in a month
- **Target**: Growth rate of 20% month-over-month (early stage)
- **Measurement**: Track unique user logins per month

### Meals Logged Per User Per Week
- **Metric**: Average number of meals logged by active users per week
- **Target**: 14+ meals per week (2 meals per day average)
- **Measurement**: Count meal creation events per user

### Average Session Duration
- **Metric**: Average time users spend in the app per session
- **Target**: 5+ minutes per session
- **Measurement**: Track session start/end times

### Session Frequency
- **Metric**: Average number of sessions per user per week
- **Target**: 7+ sessions per week (daily usage)
- **Measurement**: Count distinct sessions per user

## Goal Achievement

### Users Meeting Macro Targets Consistently
- **Metric**: Percentage of users who meet their daily macro targets 5+ days per week
- **Target**: 40% of active users
- **Measurement**: Calculate daily target achievement rate per user

### Users Achieving Weight Goals
- **Metric**: Percentage of users who reach their weight loss/gain/maintenance goals
- **Target**: 30% of users with weight goals
- **Measurement**: Track weight progress over time, compare to goals

### User Retention Rate
- **Day 1 Retention**: Percentage of new users who return on day 2
  - **Target**: 50%
  
- **Day 7 Retention**: Percentage of new users still active after 7 days
  - **Target**: 30%
  
- **Day 30 Retention**: Percentage of new users still active after 30 days
  - **Target**: 15%

- **Churn Rate**: Percentage of users who stop using the app
  - **Target**: < 5% monthly churn for active users

## Feature Adoption

### Meal Planning Feature Usage
- **Metric**: Percentage of users who create meal plans
- **Target**: 50% of active users
- **Measurement**: Track meal plan creation events

### Barcode Scanning Usage
- **Metric**: Percentage of users who scan barcodes to log foods
- **Target**: 60% of mobile users
- **Measurement**: Track barcode scan events

### Recipe Creation Usage
- **Metric**: Percentage of users who create custom recipes
- **Target**: 30% of active users
- **Measurement**: Track recipe creation events

### Meal Plan Sharing
- **Metric**: Percentage of users who share meal plans
- **Target**: 20% of users with meal plans
- **Measurement**: Track share events

### Weekly Meal Planning
- **Metric**: Percentage of users who plan meals for the week ahead
- **Target**: 40% of active users
- **Measurement**: Track meal plan creation with future dates

## User Satisfaction

### App Store Ratings
- **Metric**: Average rating on App Store and Google Play
- **Target**: 4.5+ stars (out of 5)
- **Measurement**: Monitor app store reviews

### Net Promoter Score (NPS)
- **Metric**: Likelihood users would recommend the app (0-10 scale)
- **Target**: NPS of 50+
- **Calculation**: % Promoters (9-10) - % Detractors (0-6)
- **Measurement**: In-app survey

### User Feedback Scores
- **Metric**: Average rating from in-app feedback surveys
- **Target**: 4.0+ (out of 5)
- **Measurement**: Periodic in-app surveys

### Support Ticket Volume
- **Metric**: Number of support tickets per 1000 active users
- **Target**: < 10 tickets per 1000 users
- **Measurement**: Track support ticket creation

### Feature Request Satisfaction
- **Metric**: Percentage of feature requests that are implemented
- **Target**: 20% of top-voted requests implemented quarterly
- **Measurement**: Track feature requests and implementation

## Technical Performance

### App Crash Rate
- **Metric**: Percentage of sessions that end in a crash
- **Target**: < 0.1%
- **Measurement**: Error tracking (Sentry, etc.)

### API Response Time
- **Metric**: Average API response time (p95)
- **Target**: < 500ms
- **Measurement**: Monitor API performance

### App Load Time
- **Metric**: Time to interactive (TTI)
- **Target**: < 3 seconds
- **Measurement**: Performance monitoring

### Offline Sync Success Rate
- **Metric**: Percentage of offline changes successfully synced
- **Target**: 99%+
- **Measurement**: Track sync success/failure events

## Business Metrics (Future)

### Conversion Rate (Free to Paid)
- **Metric**: Percentage of free users who upgrade to premium
- **Target**: 5-10% (when premium features are added)
- **Measurement**: Track subscription events

### Monthly Recurring Revenue (MRR)
- **Metric**: Total monthly subscription revenue
- **Target**: Growth rate of 15% month-over-month
- **Measurement**: Track subscription payments

### Customer Lifetime Value (LTV)
- **Metric**: Average revenue per user over their lifetime
- **Target**: 3x Customer Acquisition Cost (CAC)
- **Calculation**: Average subscription duration × monthly price

### Customer Acquisition Cost (CAC)
- **Metric**: Cost to acquire a new user
- **Target**: < 1/3 of LTV
- **Calculation**: Marketing spend / new users acquired

## Measurement Tools

### Analytics Platforms
- **User Analytics**: Mixpanel, Amplitude, or Google Analytics
- **Error Tracking**: Sentry or Bugsnag
- **Performance**: New Relic or Datadog
- **A/B Testing**: Optimizely or LaunchDarkly

### Data Collection
- **Event Tracking**: Track key user actions (meal logged, meal plan created, etc.)
- **User Properties**: Track user attributes (goal, activity level, etc.)
- **Funnels**: Analyze user journeys (onboarding, meal logging flow, etc.)
- **Cohorts**: Group users by signup date, behavior, etc.

## Reporting Schedule

- **Daily**: User engagement metrics (DAU, sessions, meals logged)
- **Weekly**: Feature adoption, retention cohorts
- **Monthly**: Comprehensive report with all metrics, trends, and insights
- **Quarterly**: Business review with strategic recommendations
