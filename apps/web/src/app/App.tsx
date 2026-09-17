import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "./layout";
import { AppProviders } from "./providers";
import { AppRouter } from "./router";

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppLayout>
          <AppRouter />
        </AppLayout>
      </BrowserRouter>
    </AppProviders>
  );
}
