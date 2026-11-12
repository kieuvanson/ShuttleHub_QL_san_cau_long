// Inter font (self-hosted)
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ĐẦU TIÊN — khai thứ tự cascade layer cho toàn app
import './styles/layers.css';
import './styles/tokens.css';
import './styles/reset-legacy.css';
import '@astryxdesign/core/reset.css';        // @layer reset
import '@astryxdesign/core/astryx.css';       // @layer astryx-base
import './themes/caulongdee/caulongdee.css';   // @layer astryx-theme (sinh máy)

import { Theme } from '@astryxdesign/core/theme';
import { caulongdeeTheme } from './themes/caulongdee/caulongdee';

import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { CourtDiscovery } from './pages/CourtDiscovery';
import { AuthPage } from './pages/AuthPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { FacebookCompletePage } from './pages/FacebookCompletePage';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={caulongdeeTheme} mode="light">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/tim-san" element={<CourtDiscovery />} />
              <Route path="/dang-nhap" element={<AuthPage />} />
              <Route path="/dang-ky" element={<AuthPage />} />
              {/* OAuth: backend redirect về kèm ticket (không có JWT trong URL) */}
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route path="/oauth/facebook" element={<FacebookCompletePage />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </Theme>
  </StrictMode>
);
