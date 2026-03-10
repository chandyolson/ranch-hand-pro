// TODO: Wire Supabase auth in final phase
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/ToastContext";
import AppLayout from "@/components/AppLayout";
import DashboardScreen from "@/screens/DashboardScreen";
import AnimalDetailScreen from "@/screens/AnimalDetailScreen";
import CowWorkScreen from "@/screens/CowWorkScreen";
import CowWorkNewProjectScreen from "@/screens/CowWorkNewProjectScreen";
import CowWorkProjectDetailScreen from "@/screens/CowWorkProjectDetailScreen";
import CalvingScreen from "@/screens/CalvingScreen";
import CalvingNewScreen from "@/screens/CalvingNewScreen";
import RedBookScreen from "@/screens/RedBookScreen";
import RedBookNewScreen from "@/screens/RedBookNewScreen";
import PlaceholderScreen from "@/components/PlaceholderScreen";

const App = () => (
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardScreen />} />
          <Route path="animals" element={<PlaceholderScreen title="Animals" />} />
          <Route path="animals/new" element={<PlaceholderScreen title="Add Animal" />} />
          <Route path="animals/:id" element={<AnimalDetailScreen />} />
          <Route path="cow-work" element={<CowWorkScreen />} />
          <Route path="cow-work/new" element={<CowWorkNewProjectScreen />} />
          <Route path="cow-work/:id" element={<CowWorkProjectDetailScreen />} />
          <Route path="cow-work/:id/close-out" element={<PlaceholderScreen title="Close Out" />} />
          <Route path="calving" element={<CalvingScreen />} />
          <Route path="calving/new" element={<CalvingNewScreen />} />
          <Route path="red-book" element={<RedBookScreen />} />
          <Route path="red-book/new" element={<RedBookNewScreen />} />
          <Route path="red-book/:id" element={<PlaceholderScreen title="Note Detail" />} />
          <Route path="reference" element={<PlaceholderScreen title="Reference" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);

export default App;
