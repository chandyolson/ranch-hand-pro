import React, { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useOperation, OperationProvider } from "@/contexts/OperationContext";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import { ToastProvider } from "@/components/ToastContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";
import AppLayout from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Auth pages — small, needed immediately on cold load
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import OnboardingPage from "@/pages/OnboardingPage";
import OperationPickerPage from "@/pages/OperationPickerPage";

// Lazy-loaded screens — only downloaded when the route is first visited
const DashboardScreen             = lazy(() => import("@/screens/DashboardScreen"));
const AnimalsDashboardScreen      = lazy(() => import("@/screens/AnimalsDashboardScreen"));
const AnimalDetailScreen          = lazy(() => import("@/screens/AnimalDetailScreen"));
const AddAnimalScreen             = lazy(() => import("@/screens/AddAnimalScreen"));
const BullsDashboardScreen        = lazy(() => import("@/screens/BullsDashboardScreen"));
const CowWorkScreen               = lazy(() => import("@/screens/CowWorkScreen"));
const CowWorkNewProjectScreen     = lazy(() => import("@/screens/CowWorkNewProjectScreen"));
const CowWorkProjectDetailScreen  = lazy(() => import("@/screens/CowWorkProjectDetailScreen"));
const CowWorkCloseOutScreen       = lazy(() => import("@/screens/CowWorkCloseOutScreen"));
const ProtocolHubScreen           = lazy(() => import("@/screens/ProtocolHubScreen"));
const CustomerProtocolScreen      = lazy(() => import("@/screens/CustomerProtocolScreen"));
const ProtocolTemplateBuilderScreen = lazy(() => import("@/screens/ProtocolTemplateBuilderScreen"));
const ProtocolTemplateDetailScreen  = lazy(() => import("@/screens/ProtocolTemplateDetailScreen"));
const CalvingDashboardScreen      = lazy(() => import("@/screens/CalvingDashboardScreen"));
const CalvingNewScreen            = lazy(() => import("@/screens/CalvingNewScreen"));
const CalvingRecordScreen         = lazy(() => import("@/screens/CalvingRecordScreen"));
const RedBookScreen               = lazy(() => import("@/screens/RedBookScreen"));
const RedBookNewScreen            = lazy(() => import("@/screens/RedBookNewScreen"));
const RedBookDetailScreen         = lazy(() => import("@/screens/RedBookDetailScreen"));
const ReferenceScreen             = lazy(() => import("@/screens/ReferenceScreen"));
const ReferenceGroupsScreen       = lazy(() => import("@/screens/ReferenceGroupsScreen"));
const ReferenceGroupDetailScreen  = lazy(() => import("@/screens/ReferenceGroupDetailScreen"));
const ReferenceLocationsScreen    = lazy(() => import("@/screens/ReferenceLocationsScreen"));
const ReferenceLocationDetailScreen = lazy(() => import("@/screens/ReferenceLocationDetailScreen"));
const ReferenceQuickNotesScreen   = lazy(() => import("@/screens/ReferenceQuickNotesScreen"));
const ReferencePregStagesScreen   = lazy(() => import("@/screens/ReferencePregStagesScreen"));
const ReferenceTreatmentsScreen   = lazy(() => import("@/screens/ReferenceTreatmentsScreen"));
const ReferenceProductDetailScreen = lazy(() => import("@/screens/ReferenceProductDetailScreen"));
const ReferenceTeamScreen         = lazy(() => import("@/screens/ReferenceTeamScreen"));
const ReferenceSettingsScreen     = lazy(() => import("@/screens/ReferenceSettingsScreen"));
const ReferenceBreedsScreen       = lazy(() => import("@/screens/ReferenceBreedsScreen"));
const WorkTemplateListScreen      = lazy(() => import("@/screens/WorkTemplateListScreen"));
const WorkTemplateEditScreen      = lazy(() => import("@/screens/WorkTemplateEditScreen"));
const CustomerListScreen          = lazy(() => import("@/screens/CustomerListScreen"));
const CustomerDetailScreen        = lazy(() => import("@/screens/CustomerDetailScreen"));
const CowCleanerScreen            = lazy(() => import("@/screens/CowCleanerScreen"));
const AIReportsScreen             = lazy(() => import("@/screens/AIReportsScreen"));
const DataQualityScreen           = lazy(() => import("@/screens/DataQualityScreen"));
const ImportDataScreen            = lazy(() => import("@/screens/ImportDataScreen"));
const RegistrationAssistantScreen = lazy(() => import("@/screens/RegistrationAssistantScreen"));
const SaleDaysList                = lazy(() => import("@/pages/sale-barn/SaleDaysList"));
const SaleDayDetail               = lazy(() => import("@/pages/sale-barn/SaleDayDetail"));
const WorkOrderForm               = lazy(() => import("@/pages/sale-barn/WorkOrderForm"));
const ChutesideEntry              = lazy(() => import("@/pages/sale-barn/ChutesideEntry"));
const CustomerDirectory           = lazy(() => import("@/pages/sale-barn/CustomerDirectory"));
const BuyerDirectory              = lazy(() => import("@/pages/sale-barn/BuyerDirectory"));
const PriceSchedule               = lazy(() => import("@/pages/sale-barn/PriceSchedule"));
const DesignationKeyConfig        = lazy(() => import("@/pages/sale-barn/DesignationKeyConfig"));
const ConsignmentsPage            = lazy(() => import("@/pages/sale-barn/ConsignmentsPage"));
const ReportsPage                 = lazy(() => import("@/pages/sale-barn/ReportsPage"));
const WorkedAnimalsPage           = lazy(() => import("@/pages/sale-barn/WorkedAnimalsPage"));
const DayBillingPage              = lazy(() => import("@/pages/sale-barn/DayBillingPage"));
const WorkOrderAnimalsReport      = lazy(() => import("@/pages/sale-barn/WorkOrderAnimalsReport"));
const WorkOrderCviReport          = lazy(() => import("@/pages/sale-barn/WorkOrderCviReport"));
const ReviewClosePage             = lazy(() => import("@/pages/sale-barn/ReviewClosePage"));
const AssignAnimals               = lazy(() => import("@/pages/sale-barn/AssignAnimals"));

const SaleBarnGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { operationType } = useOperation();
  const { showToast } = useToast();
  const blocked = !!operationType && operationType !== 'vet_practice';

  React.useEffect(() => {
    if (blocked) {
      showToast("error", "Sale Barn is only available for veterinary practice accounts.");
    }
  }, [blocked]);

  if (!operationType) return null;
  if (blocked) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <AuthProvider>
    <OperationProvider>
      <ToastProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }} />}>
          <Routes>
            {/* Public auth routes */}
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/operation-picker" element={<OperationPickerPage />} />

            {/* Protected routes */}
            <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
              <Route index element={<DashboardScreen />} />
              <Route path="animals" element={<AnimalsDashboardScreen />} />
              <Route path="animals/new" element={<AddAnimalScreen />} />
              <Route path="animals/:id" element={<AnimalDetailScreen />} />
              <Route path="bulls" element={<BullsDashboardScreen />} />
              <Route path="cow-work" element={<CowWorkScreen />} />
              <Route path="cow-work/new" element={<CowWorkNewProjectScreen />} />
              <Route path="cow-work/:id" element={<CowWorkProjectDetailScreen />} />
              <Route path="cow-work/:id/close-out" element={<CowWorkCloseOutScreen />} />
              <Route path="protocols" element={<ProtocolHubScreen />} />
              <Route path="protocols/customer/:operationId" element={<CustomerProtocolScreen />} />
              <Route path="protocols/templates/new" element={<ProtocolTemplateBuilderScreen />} />
              <Route path="protocols/templates/:id" element={<ProtocolTemplateDetailScreen />} />
              <Route path="calving" element={<CalvingDashboardScreen />} />
              <Route path="calving/new" element={<CalvingNewScreen />} />
              <Route path="calving/:id" element={<CalvingRecordScreen />} />
              <Route path="red-book" element={<RedBookScreen />} />
              <Route path="red-book/new" element={<RedBookNewScreen />} />
              <Route path="red-book/:id" element={<RedBookDetailScreen />} />
              <Route path="reference" element={<ReferenceScreen />} />
              <Route path="reference/groups" element={<ReferenceGroupsScreen />} />
              <Route path="reference/groups/:id" element={<ReferenceGroupDetailScreen />} />
              <Route path="reference/locations" element={<ReferenceLocationsScreen />} />
              <Route path="reference/locations/:id" element={<ReferenceLocationDetailScreen />} />
              <Route path="reference/quick-notes" element={<ReferenceQuickNotesScreen />} />
              <Route path="reference/preg-stages" element={<ReferencePregStagesScreen />} />
              <Route path="reference/treatments" element={<ReferenceTreatmentsScreen />} />
              <Route path="reference/treatments/:id" element={<ReferenceProductDetailScreen />} />
              <Route path="reference/team" element={<ReferenceTeamScreen />} />
              <Route path="reference/settings" element={<ReferenceSettingsScreen />} />
              <Route path="reference/breeds" element={<ReferenceBreedsScreen />} />
              <Route path="reference/templates" element={<WorkTemplateListScreen />} />
              <Route path="reference/templates/new" element={<WorkTemplateEditScreen />} />
              <Route path="reference/templates/edit" element={<WorkTemplateEditScreen />} />
              <Route path="customers" element={<CustomerListScreen />} />
              <Route path="customers/:id" element={<CustomerDetailScreen />} />
              <Route path="cow-cleaner" element={<CowCleanerScreen />} />
              <Route path="ai-reports" element={<AIReportsScreen />} />
              <Route path="data-quality" element={<DataQualityScreen />} />
              <Route path="import" element={<ImportDataScreen />} />
              <Route path="registration" element={<RegistrationAssistantScreen />} />
              <Route path="sale-barn" element={<SaleBarnGuard><SaleDaysList /></SaleBarnGuard>} />
              <Route path="sale-barn/customers" element={<SaleBarnGuard><CustomerDirectory /></SaleBarnGuard>} />
              <Route path="sale-barn/buyers" element={<SaleBarnGuard><BuyerDirectory /></SaleBarnGuard>} />
              <Route path="sale-barn/settings/prices" element={<SaleBarnGuard><PriceSchedule /></SaleBarnGuard>} />
              <Route path="sale-barn/settings/designations" element={<SaleBarnGuard><DesignationKeyConfig /></SaleBarnGuard>} />
              <Route path="sale-barn/:id" element={<SaleBarnGuard><SaleDayDetail /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/consignments" element={<SaleBarnGuard><ConsignmentsPage /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/billing" element={<SaleBarnGuard><DayBillingPage /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/reports" element={<SaleBarnGuard><ReportsPage /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/animals" element={<SaleBarnGuard><WorkedAnimalsPage /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/work-order/new" element={<SaleBarnGuard><WorkOrderForm /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/work-order/:woId" element={<SaleBarnGuard><WorkOrderForm /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/work-order/:woId/chute" element={<SaleBarnGuard><ChutesideEntry /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/work-order/:woId/animals" element={<SaleBarnGuard><WorkOrderAnimalsReport /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/work-order/:woId/cvi" element={<SaleBarnGuard><WorkOrderCviReport /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/work-order/:woId/review" element={<SaleBarnGuard><ReviewClosePage /></SaleBarnGuard>} />
              <Route path="sale-barn/:id/work-order/:woId/assign" element={<SaleBarnGuard><AssignAnimals /></SaleBarnGuard>} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/sign-in" replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </ToastProvider>
    </OperationProvider>
  </AuthProvider>
);

export default App;
