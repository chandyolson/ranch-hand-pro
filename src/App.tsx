// TODO: Wire Supabase auth in final phase
import React from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useOperation } from "@/contexts/OperationContext";
import { useChuteSideToast as useToast } from "@/components/ToastContext";
import { ToastProvider } from "@/components/ToastContext";
import CowWorkCloseOutScreen from "@/screens/CowWorkCloseOutScreen";
import AppLayout from "@/components/AppLayout";
import DashboardScreen from "@/screens/DashboardScreen";
import AnimalsDashboardScreen from "@/screens/AnimalsDashboardScreen";
import AnimalDetailScreen from "@/screens/AnimalDetailScreen";
import AddAnimalScreen from "@/screens/AddAnimalScreen";
import BullsDashboardScreen from "@/screens/BullsDashboardScreen";
import CowWorkScreen from "@/screens/CowWorkScreen";
import CowWorkNewProjectScreen from "@/screens/CowWorkNewProjectScreen";
import CowWorkProjectDetailScreen from "@/screens/CowWorkProjectDetailScreen";
import ProtocolHubScreen from "@/screens/ProtocolHubScreen";
import CustomerProtocolScreen from "@/screens/CustomerProtocolScreen";
import CalvingDashboardScreen from "@/screens/CalvingDashboardScreen";
import CalvingNewScreen from "@/screens/CalvingNewScreen";
import CalvingRecordScreen from "@/screens/CalvingRecordScreen";
import RedBookScreen from "@/screens/RedBookScreen";
import RedBookNewScreen from "@/screens/RedBookNewScreen";
import RedBookDetailScreen from "@/screens/RedBookDetailScreen";
import ReferenceScreen from "@/screens/ReferenceScreen";
import ReferenceGroupsScreen from "@/screens/ReferenceGroupsScreen";
import ReferenceGroupDetailScreen from "@/screens/ReferenceGroupDetailScreen";
import ReferenceLocationsScreen from "@/screens/ReferenceLocationsScreen";
import ReferenceLocationDetailScreen from "@/screens/ReferenceLocationDetailScreen";
import ReferenceQuickNotesScreen from "@/screens/ReferenceQuickNotesScreen";
import ReferencePregStagesScreen from "@/screens/ReferencePregStagesScreen";
import ReferenceTreatmentsScreen from "@/screens/ReferenceTreatmentsScreen";
import ReferenceProductDetailScreen from "@/screens/ReferenceProductDetailScreen";
import ReferenceTeamScreen from "@/screens/ReferenceTeamScreen";
import ReferenceSettingsScreen from "@/screens/ReferenceSettingsScreen";
import ProtocolTemplateBuilderScreen from "@/screens/ProtocolTemplateBuilderScreen";
import ProtocolTemplateDetailScreen from "@/screens/ProtocolTemplateDetailScreen";
import ReferenceBreedsScreen from "@/screens/ReferenceBreedsScreen";
import WorkTemplateListScreen from "@/screens/WorkTemplateListScreen";
import WorkTemplateEditScreen from "@/screens/WorkTemplateEditScreen";
import CowCleanerScreen from "@/screens/CowCleanerScreen";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import SaleDaysList from "@/pages/sale-barn/SaleDaysList";
import SaleDayDetail from "@/pages/sale-barn/SaleDayDetail";
import WorkOrderForm from "@/pages/sale-barn/WorkOrderForm";
import ChutesideEntry from "@/pages/sale-barn/ChutesideEntry";
import CustomerDirectory from "@/pages/sale-barn/CustomerDirectory";
import BuyerDirectory from "@/pages/sale-barn/BuyerDirectory";
import PriceSchedule from "@/pages/sale-barn/PriceSchedule";
import DesignationKeyConfig from "@/pages/sale-barn/DesignationKeyConfig";
import ConsignmentsPage from "@/pages/sale-barn/ConsignmentsPage";
import ReportsPage from "@/pages/sale-barn/ReportsPage";
import WorkedAnimalsPage from "@/pages/sale-barn/WorkedAnimalsPage";
import DayBillingPage from "@/pages/sale-barn/DayBillingPage";
import WorkOrderAnimalsReport from "@/pages/sale-barn/WorkOrderAnimalsReport";
import WorkOrderCviReport from "@/pages/sale-barn/WorkOrderCviReport";
import ReviewClosePage from "@/pages/sale-barn/ReviewClosePage";
import AssignAnimals from "@/pages/sale-barn/AssignAnimals";
import NotFound from "@/pages/NotFound";
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
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
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
          <Route path="cow-cleaner" element={<CowCleanerScreen />} />
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);

export default App;
