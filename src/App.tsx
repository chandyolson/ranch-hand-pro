// TODO: Wire Supabase auth in final phase
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/ToastContext";
import AppLayout from "@/components/AppLayout";
import DashboardScreen from "@/screens/DashboardScreen";
import AnimalDetailScreen from "@/screens/AnimalDetailScreen";
import CowWorkScreen from "@/screens/CowWorkScreen";
import CowWorkNewProjectScreen from "@/screens/CowWorkNewProjectScreen";
import CowWorkProjectDetailScreen from "@/screens/CowWorkProjectDetailScreen";
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
          <Route path="calving" element={<PlaceholderScreen title="Calving" />} />
          <Route path="red-book" element={<PlaceholderScreen title="Red Book" />} />
          <Route path="reference" element={<PlaceholderScreen title="Reference" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);

export default App;
