import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import QuizReview from "./pages/QuizReview";
import ParentDashboard from "./pages/ParentDashboard";
import ChildDashboard from "./pages/ChildDashboard";
import QuizPlay from "./pages/QuizPlay";
import SubjectModules from "./pages/SubjectModules";

import QBAdminDashboard from "./pages/QBAdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { MyNotes } from "./pages/MyNotes";
import { NoteDetail } from "./pages/NoteDetail";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/parent"} component={ParentDashboard} />
      <Route path={"/qb-admin"} component={QBAdminDashboard} />
      <Route path={"/teacher"} component={TeacherDashboard} />
      <Route path={"/superadmin"} component={SuperAdminDashboard} />
      <Route path={"/quiz-review/:sessionId"} component={QuizReview} />

      <Route path={"/child"} component={ChildDashboard} />
      <Route path={"/child/notes"} component={MyNotes} />
      <Route path={"/child/notes/:id"} component={NoteDetail} />
      <Route path={"/subject/:subjectId"} component={SubjectModules} />
      <Route path={"/quiz/:moduleId"} component={QuizPlay} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
