import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/auth/AuthProvider";
import SignInPage from "./features/auth/SignInPage";
import SignUpPage from "./features/auth/SignUpPage";
import RequireRole from "./routes/RequireRole";
import Dashboard from "./features/dashboard/Dashboard";
import CoachAthletesPage from "./features/athletes/CoachAthletesPage";
import AthleteDetailPage from "./features/athletes/AthleteDetailPage";
import MyCoachesPage from "./features/athletes/MyCoachesPage";
import ClaimInvitePage from "./features/athletes/ClaimInvitePage";
import VideoPage from "./features/video/VideoPage";
import BiomechLibraryPage from "./features/biomech/BiomechLibraryPage";
import CoachProgramsPage from "./features/programs/CoachProgramsPage";
import ProgramBuilderPage from "./features/programs/ProgramBuilderPage";
import AthleteProgramsPage from "./features/programs/AthleteProgramsPage";
import AthleteProgramPage from "./features/programs/AthleteProgramPage";
import SchedulePage from "./features/schedule/SchedulePage";
import DrillsPage from "./features/drills/DrillsPage";
import PlansPage from "./features/sessions/PlansPage";
import PlanBuilderPage from "./features/sessions/PlanBuilderPage";
import { AthletePlansPage, AthletePlanPage } from "./features/sessions/AthletePlansPage";
import WorkbookPage from "./features/workbooks/WorkbookPage";
import BillingPage from "./features/billing/BillingPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            {/* Claim handles its own auth states (invitee may not have an account yet) */}
            <Route path="/claim/:token" element={<ClaimInvitePage />} />
            <Route path="/check-email" element={
              <main className="auth-layout"><div className="card">
                <h1 className="brand">Check your email</h1>
                <p className="muted">We sent a confirmation link. Open it to activate your account.</p>
              </div></main>
            } />
            <Route element={<RequireRole allow={["coach"]} />}>
              <Route path="/coach" element={<CoachAthletesPage />} />
              <Route path="/coach/athletes/:athleteId" element={<AthleteDetailPage />} />
              <Route path="/coach/athletes/:athleteId/workbook" element={<WorkbookPage />} />
              <Route path="/coach/programs" element={<CoachProgramsPage />} />
              <Route path="/coach/programs/:programId" element={<ProgramBuilderPage />} />
              <Route path="/coach/drills" element={<DrillsPage />} />
              <Route path="/coach/plans" element={<PlansPage />} />
              <Route path="/coach/plans/:planId" element={<PlanBuilderPage />} />
            </Route>
            <Route element={<RequireRole allow={["athlete"]} />}>
              <Route path="/athlete" element={<MyCoachesPage />} />
              <Route path="/athlete/programs" element={<AthleteProgramsPage />} />
              <Route path="/athlete/programs/:programId" element={<AthleteProgramPage />} />
              <Route path="/athlete/sessions" element={<AthletePlansPage />} />
              <Route path="/athlete/sessions/:planId" element={<AthletePlanPage />} />
            </Route>
            <Route element={<RequireRole allow={["coach", "athlete"]} />}>
              <Route path="/videos/:videoId" element={<VideoPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/biomech" element={<BiomechLibraryPage />} />
            </Route>
            <Route element={<RequireRole allow={["parent"]} />}>
              <Route path="/parent" element={<Dashboard title="Parent dashboard" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
