# Pharmacy Finder — Frontend Component Architecture & Directory Map

**Stack:** Next.js (latest, App Router) / React 19, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zod  
**Frontend Team:** Karl (Co-Team Lead / Frontend Lead & Design) & Duke (Frontend Developer)

---

## 1. Team Ownership & Responsibilities

| Frontend Engineer | Component Scope / Features Owned |
| :--- | :--- |
| **Karl** | • Design system, wireframes, UI/UX, theme & base layout<br>• Auth pages & components (`LoginForm`, `RegisterForm`, `GoogleAuthButton`, etc.)<br>• Map and pharmacy directory (`PharmacyMap`, `PharmacyMarker`, `PharmacyFilters`)<br>• Drug search & live availability view (`DrugSearchBar`, `PriceComparisonTable`)<br>• AI symptom chatbot UI (`ChatWidget`, `ChatMessageList`, `RedFlagAlert`, `AllergyWarning`)<br>• Ordering & checkout flow (`CartDrawer`, `DeliveryAddressForm`, `PaystackCheckoutButton`) |
| **Duke** | • Landing and about pages (`HeroSection`, `HowItWorksSection`, `TestimonialsSection`)<br>• Pharmacy and drug presentation cards (`PharmacyCard`, `DrugCard`)<br>• Reviews & ratings UI (`ReviewList`, `ReviewCard`, `RatingStars`)<br>• Dark mode toggle & navigation/footer (`Navbar`, `Footer`, `ThemeToggle`)<br>• Pharmacy management dashboard (`InventoryTable`, `AddDrugModal`, `BulkCsvUploadModal`, etc.)<br>• Order tracking & live status page (`OrderTracker`, `OrderStatusTimeline`, `LiveStatusBadge`) |

---

## 2. Directory & Component Inventory

```
client/src/
├── components/
│   ├── layout/               # Shared structural layout components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── SafetyBanner.tsx
│   │
│   ├── ui/                   # Design system & shadcn/ui primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Dialog.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── Tabs.tsx
│   │   ├── Toast.tsx
│   │   ├── Select.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Switch.tsx
│   │   ├── Table.tsx
│   │   ├── Sheet.tsx
│   │   ├── Avatar.tsx
│   │   └── Alert.tsx
│   │
│   ├── auth/                 # Authentication & profile components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── GoogleAuthButton.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── RoleSelector.tsx
│   │   └── SavedAddressBook.tsx
│   │
│   ├── landing/              # Marketing, hero & informative sections
│   │   ├── HeroSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── FeaturesGrid.tsx
│   │   ├── StatsSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── MedicalDisclaimerModal.tsx
│   │
│   ├── pharmacy/             # Pharmacy directory, mapping & details
│   │   ├── PharmacyMap.tsx
│   │   ├── PharmacyMarker.tsx
│   │   ├── PharmacyCard.tsx
│   │   ├── PharmacyList.tsx
│   │   ├── PharmacyFilters.tsx
│   │   ├── PharmacyDetail.tsx
│   │   ├── VerifiedBadge.tsx
│   │   └── OpeningHoursBadge.tsx
│   │
│   ├── drugs/                # Drug catalog, search & stock verification
│   │   ├── DrugSearchBar.tsx
│   │   ├── DrugCard.tsx
│   │   ├── DrugList.tsx
│   │   ├── DrugDetail.tsx
│   │   ├── StockStatusBadge.tsx
│   │   ├── GenericAlternativesModal.tsx
│   │   ├── PriceComparisonTable.tsx
│   │   ├── StockAlertModal.tsx
│   │   ├── PrescriptionUpload.tsx
│   │   └── PhotoSearchModal.tsx
│   │
│   ├── chat/                 # AI Symptom Assistant & medical safety
│   │   ├── ChatWidget.tsx
│   │   ├── ChatMessageList.tsx
│   │   ├── ChatMessageItem.tsx
│   │   ├── ChatInput.tsx
│   │   ├── VoiceInputButton.tsx
│   │   ├── SymptomFollowUpQuestions.tsx
│   │   ├── SuggestedDrugCard.tsx
│   │   ├── RedFlagEmergencyAlert.tsx
│   │   ├── AllergyInteractionWarning.tsx
│   │   ├── FindNearbyActionCard.tsx
│   │   └── ChatHistoryDrawer.tsx
│   │
│   ├── checkout/             # Cart, delivery & Paystack payment integration
│   │   ├── CartDrawer.tsx
│   │   ├── CartItem.tsx
│   │   ├── OrderSummary.tsx
│   │   ├── FulfillmentSelector.tsx
│   │   ├── DeliveryAddressForm.tsx
│   │   ├── ReservationTimer.tsx
│   │   ├── PaymentMethodSelector.tsx
│   │   └── PaystackCheckoutButton.tsx
│   │
│   ├── orders/               # Order status, live tracker & updates
│   │   ├── OrderTracker.tsx
│   │   ├── OrderStatusTimeline.tsx
│   │   ├── OrderDetailsCard.tsx
│   │   ├── OrderHistoryList.tsx
│   │   ├── PharmacyContactCard.tsx
│   │   └── LiveStatusBadge.tsx
│   │
│   ├── dashboard/            # Pharmacy staff management portal
│   │   ├── DashboardLayout.tsx
│   │   ├── InventoryTable.tsx
│   │   ├── AddDrugModal.tsx
│   │   ├── EditDrugModal.tsx
│   │   ├── BulkCsvUploadModal.tsx
│   │   ├── StockToggleSwitch.tsx
│   │   ├── PriceEditor.tsx
│   │   ├── IncomingOrdersList.tsx
│   │   ├── OrderActionButtons.tsx
│   │   ├── PharmacyAnalyticsChart.tsx
│   │   └── LowStockAlertList.tsx
│   │
│   ├── admin/                # Platform admin & verification portal
│   │   ├── AdminLayout.tsx
│   │   ├── PharmacyApprovalsTable.tsx
│   │   ├── LicenseVerificationModal.tsx
│   │   ├── DrugCatalogTable.tsx
│   │   └── PlatformReports.tsx
│   │
│   ├── reviews/              # Customer reviews & pharmacy ratings
│   │   ├── ReviewList.tsx
│   │   ├── ReviewCard.tsx
│   │   ├── RatingStars.tsx
│   │   └── AddReviewModal.tsx
│   │
│   └── notifications/        # User and staff notifications
│       ├── NotificationBell.tsx
│       ├── NotificationDropdown.tsx
│       └── NotificationItem.tsx
│
└── pages/                    # Route / View entry points
    ├── HomePage.tsx
    ├── AboutPage.tsx
    ├── LoginPage.tsx
    ├── RegisterPage.tsx
    ├── PharmacyDirectoryPage.tsx
    ├── DrugSearchPage.tsx
    ├── SymptomChatPage.tsx
    ├── CheckoutPage.tsx
    ├── OrderTrackingPage.tsx
    ├── PharmacyDashboardPage.tsx
    └── AdminDashboardPage.tsx
```

---

## 3. Component Details & Interactions

### 3.1 AI Symptom Chatbot Flow (Safety-First)
1. **ChatWidget / SymptomChatPage**: Main chat container. Displays continuous medical disclaimer.
2. **ChatInput / VoiceInputButton**: Allows text or voice transcription.
3. **ChatMessageItem**: Handles markdown rendering of bot messages.
4. **RedFlagEmergencyAlert**: Triggered immediately when red-flag keywords (e.g. chest pain, breathing difficulty, severe bleeding) are detected. Bypasses drug suggestions and displays emergency hotlines and nearest hospital locator.
5. **AllergyInteractionWarning**: Cross-references user profile's allergies & current medications against suggested drugs.
6. **SuggestedDrugCard & FindNearbyActionCard**: Displays suggested OTC options with a 1-tap "Find Nearby" trigger to route to nearest stocked pharmacy.

### 3.2 Pharmacy & Drug Search Flow
1. **DrugSearchBar / PhotoSearchModal**: Query drug by text or package photo.
2. **PharmacyMap / PharmacyMarker**: Map rendering (Leaflet OpenStreetMap) with radius filter.
3. **PharmacyCard / StockStatusBadge**: Displays stock state, distance, price, and "last-updated" badge (stale data clearly marked as unverified).
4. **GenericAlternativesModal & PriceComparisonTable**: Shows active ingredient equivalents sorted by nearest, cheapest, or fastest.
5. **StockAlertModal**: "Notify me when back in stock" subscription trigger.

### 3.3 Checkout, Cart & Fulfillment
1. **CartDrawer / CartItem**: Displays items grouped by pharmacy.
2. **FulfillmentSelector**: Toggle between Pickup and Delivery.
3. **ReservationTimer**: 30-minute hold countdown for walking pickup.
4. **PaystackCheckoutButton**: Paystack inline modal trigger (card, mobile money) alongside pay-on-pickup.

### 3.4 Pharmacy Staff Dashboard
1. **InventoryTable & StockToggleSwitch**: Real-time stock toggle and price editing.
2. **BulkCsvUploadModal**: Rapid inventory onboarding via CSV.
3. **IncomingOrdersList & OrderActionButtons**: Sound/visual alert for incoming orders with accept/reject/ready controls.
4. **PharmacyAnalyticsChart**: Heatmaps and most-searched unmet drug demands.
