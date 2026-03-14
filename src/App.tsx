// TODO: Wire Supabase auth in final phase
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/ToastContext";
import CowWorkCloseOutScreen from "@/screens/CowWorkCloseOutScreen";
import AppLayout from "@/components/AppLayout";
import DashboardScreen from "@/screens/DashboardScreen";
import AnimalsScreen from "@/screens/AnimalsScreen";
import AnimalDetailScreen from "@/screens/AnimalDetailScreen";
import AddAnimalScreen from "@/screens/AddAnimalScreen";
import CowWorkScreen from "@/screens/CowWorkScreen";
import CowWorkNewProjectScreen from "@/screens/CowWorkNewProjectScreen";
import CowWorkProjectDetailScreen from "@/screens/CowWorkProjectDetailScreen";
import ProtocolHubScreen from "@/screens/ProtocolHubScreen";
import CustomerProtocolScreen from "@/screens/CustomerProtocolScreen";
import CalvingScreen from "@/screens/CalvingScreen";
import CalvingNewScreen from "@/screens/CalvingNewScreen";
import CalvingRecordScreen from "@/screens/CalvingRecordScreen";
import RedBookScreen from "@/screens/RedBookScreen";
import RedBookNewScreen from "@/screens/RedBookNewScreen";
import RedBookDetailScreen from "@/screens/RedBookDetailScreen";
import ReferenceScreen from "@/screens/ReferenceScreen";
import ReferenceGroupsScreen from "@/screens/ReferenceGroupsScreen";
import ReferenceGroupDetailScreen from "@/screens/ReferenceGroupDetailScreen";
import ReferenceLocationsScreen from "@/screens/ReferenceLocationsScreen";
import ReferenceQuickNotesScreen from "@/screens/ReferenceQuickNotesScreen";
import ReferencePregStagesScreen from "@/screens/ReferencePregStagesScreen";
import ReferenceTreatmentsScreen from "@/screens/ReferenceTreatmentsScreen";
import ReferenceTeamScreen from "@/screens/ReferenceTeamScreen";
import ReferenceSettingsScreen from "@/screens/ReferenceSettingsScreen";
import ProtocolTemplateBuilderScreen from "@/screens/ProtocolTemplateBuilderScreen";
import ProtocolTemplateDetailScreen from "@/screens/ProtocolTemplateDetailScreen";
import ReferenceBreedsScreen from "@/screens/ReferenceBreedsScreen";
import WorkTemplateListScreen from "@/screens/WorkTemplateListScreen";
import WorkTemplateEditScreen from "@/screens/WorkTemplateEditScreen";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import NotFound from "@/pages/NotFound";

const App = () => (
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardScreen />} />
          <Route path="animals" element={<AnimalsScreen />} />
          <Route path="animals/new" element={<AddAnimalScreen />} />
          <Route path="animals/:id" element={<AnimalDetailScreen />} />
          <Route path="cow-work" element={<CowWorkScreen />} />
          <Route path="cow-work/new" element={<CowWorkNewProjectScreen />} />
          <Route path="cow-work/:id" element={<CowWorkProjectDetailScreen />} />
          <Route path="cow-work/:id/close-out" element={<CowWorkCloseOutScreen />} />
          <Route path="protocols" element={<ProtocolHubScreen />} />
          <Route path="protocols/customer/:operationId" element={<CustomerProtocolScreen />} />
          <Route path="protocols/templates/new" element={<ProtocolTemplateBuilderScreen />} />
          <Route path="protocols/templates/:id" element={<ProtocolTemplateDetailScreen />} />
          <Route path="calving" element={<CalvingScreen />} />
          <Route path="calving/new" element={<CalvingNewScreen />} />
          <Route path="calving/:id" element={<CalvingRecordScreen />} />
          <Route path="red-book" element={<RedBookScreen />} />
          <Route path="red-book/new" element={<RedBookNewScreen />} />
          <Route path="red-book/:id" element={<RedBookDetailScreen />} />
          <Route path="reference" element={<ReferenceScreen />} />
          <Route path="reference/groups" element={<ReferenceGroupsScreen />} />
          <Route path="reference/groups/:id" element={<ReferenceGroupDetailScreen />} />
          <Route path="reference/locations" element={<ReferenceLocationsScreen />} />
          <Route path="reference/quick-notes" element={<ReferenceQuickNotesScreen />} />
          <Route path="reference/preg-stages" element={<ReferencePregStagesScreen />} />
          <Route path="reference/treatments" element={<ReferenceTreatmentsScreen />} />
          <Route path="reference/team" element={<ReferenceTeamScreen />} />
          <Route path="reference/settings" element={<ReferenceSettingsScreen />} />
          <Route path="reference/breeds" element={<ReferenceBreedsScreen />} />
          <Route path="reference/templates" element={<WorkTemplateListScreen />} />
          <Route path="reference/templates/new" element={<WorkTemplateEditScreen />} />
          <Route path="reference/templates/edit" element={<WorkTemplateEditScreen />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);

export default App;
