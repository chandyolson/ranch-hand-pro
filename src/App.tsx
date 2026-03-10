// TODO: Wire Supabase auth in final phase
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/ToastContext";
import AppLayout from "@/components/AppLayout";
import DashboardScreen from "@/screens/DashboardScreen";
import AnimalsScreen from "@/screens/AnimalsScreen";
import AnimalDetailScreen from "@/screens/AnimalDetailScreen";
import AddAnimalScreen from "@/screens/AddAnimalScreen";
import CowWorkScreen from "@/screens/CowWorkScreen";
import CowWorkNewProjectScreen from "@/screens/CowWorkNewProjectScreen";
import CowWorkProjectDetailScreen from "@/screens/CowWorkProjectDetailScreen";
import CalvingScreen from "@/screens/CalvingScreen";
import CalvingNewScreen from "@/screens/CalvingNewScreen";
import RedBookScreen from "@/screens/RedBookScreen";
import RedBookNewScreen from "@/screens/RedBookNewScreen";
import ReferenceScreen from "@/screens/ReferenceScreen";
import ReferenceGroupsScreen from "@/screens/ReferenceGroupsScreen";
import ReferenceLocationsScreen from "@/screens/ReferenceLocationsScreen";
import ReferenceQuickNotesScreen from "@/screens/ReferenceQuickNotesScreen";
import ReferencePregStagesScreen from "@/screens/ReferencePregStagesScreen";
import ReferenceTreatmentsScreen from "@/screens/ReferenceTreatmentsScreen";
import ReferenceTeamScreen from "@/screens/ReferenceTeamScreen";
import ReferenceSettingsScreen from "@/screens/ReferenceSettingsScreen";
import PlaceholderScreen from "@/components/PlaceholderScreen";

const App = () => (
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardScreen />} />
          <Route path="animals" element={<AnimalsScreen />} />
          <Route path="animals/new" element={<PlaceholderScreen title="Add Animal" />} />
          <Route path="animals/:id" element={<AnimalDetailScreen />} />
          <Route path="cow-work" element={<CowWorkScreen />} />
          <Route path="cow-work/new" element={<CowWorkNewProjectScreen />} />
          <Route path="cow-work/:id" element={<CowWorkProjectDetailScreen />} />
          <Route path="cow-work/:id/close-out" element={<PlaceholderScreen title="Close Out" />} />
          <Route path="calving" element={<CalvingScreen />} />
          <Route path="calving/new" element={<CalvingNewScreen />} />
          <Route path="calving/:id" element={<PlaceholderScreen title="Calving Record" />} />
          <Route path="red-book" element={<RedBookScreen />} />
          <Route path="red-book/new" element={<RedBookNewScreen />} />
          <Route path="red-book/:id" element={<PlaceholderScreen title="Note Detail" />} />
          <Route path="reference" element={<ReferenceScreen />} />
          <Route path="reference/groups" element={<ReferenceGroupsScreen />} />
          <Route path="reference/locations" element={<ReferenceLocationsScreen />} />
          <Route path="reference/quick-notes" element={<ReferenceQuickNotesScreen />} />
          <Route path="reference/preg-stages" element={<ReferencePregStagesScreen />} />
          <Route path="reference/treatments" element={<ReferenceTreatmentsScreen />} />
          <Route path="reference/team" element={<ReferenceTeamScreen />} />
          <Route path="reference/settings" element={<ReferenceSettingsScreen />} />
          <Route path="reference/breeds" element={<PlaceholderScreen title="Breeds" />} />
          <Route path="reference/templates" element={<PlaceholderScreen title="Work Templates" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);

export default App;
